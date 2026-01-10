import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router({ mergeParams: true });

// All image routes require authentication
router.use(authenticateToken);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { campaignId, entityType, entityId } = req.params;
    const uploadPath = path.join(__dirname, "../../uploads/campaigns", campaignId, entityType, entityId.toString());
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer with 10MB limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// POST /api/campaigns/:campaignId/images/:entityType/:entityId
// Upload an image for a specific entity
router.post("/:campaignId/images/:entityType/:entityId", requireCampaignDM, upload.single('image'), async (req, res) => {
  try {
    const { campaignId, entityType, entityId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate entity type
    const validEntityTypes = ['character', 'location', 'faction', 'world_info', 'quest', 'session', 'creature'];
    if (!validEntityTypes.includes(entityType)) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Invalid entity type" });
    }

    // Store image metadata in database
    const uploadsBase = path.join(__dirname, "../../uploads");
    const relativePath = path.relative(uploadsBase, req.file.path);
    
    console.log(`[Images] Upload successful:`, {
      originalPath: req.file.path,
      uploadsBase,
      relativePath,
      fileName: req.file.originalname,
      size: req.file.size
    });
    
    const result = await query(`
      INSERT INTO images (campaign_id, entity_type, entity_id, file_path, file_name, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      campaignId,
      entityType,
      entityId,
      relativePath,
      req.file.originalname,
      req.file.size,
      req.file.mimetype
    ]);

    const imageId = result.rows[0].id;
    const image = await get("SELECT * FROM images WHERE id = $1", [imageId]);
    console.log(`[Images] Image saved to database:`, image);

    res.status(201).json(image);
  } catch (error) {
    console.error("Error uploading image:", error);
    // Clean up uploaded file if database insert failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }
    // Don't expose internal error details to clients
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// GET /api/campaigns/:campaignId/images/:imageId/file
// Serve image file - MUST come before /:entityType/:entityId route to avoid conflicts
router.get("/:campaignId/images/:imageId/file", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, imageId } = req.params;

    const image = await get(`
      SELECT * FROM images 
      WHERE id = $1 AND campaign_id = $2
    `, [imageId, campaignId]);

    if (!image) {
      console.error(`[Images] Image not found: id=${imageId}, campaignId=${campaignId}`);
      return res.status(404).json({ error: "Image not found" });
    }

    const filePath = path.join(__dirname, "../../uploads", image.file_path);
    const resolvedPath = path.resolve(filePath);
    
    // Security: Prevent path traversal attacks
    const uploadsDir = path.resolve(path.join(__dirname, "../../uploads"));
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.error(`[Images] Path traversal attempt detected: ${resolvedPath}`);
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!fs.existsSync(resolvedPath)) {
      console.error(`[Images] File not found at path: ${resolvedPath}`);
      return res.status(404).json({ error: "Image file not found" });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', image.mime_type || 'image/jpeg');
    res.setHeader('Content-Length', fs.statSync(resolvedPath).size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Use sendFile with options
    res.sendFile(resolvedPath, (err) => {
      if (err) {
        console.error(`[Images] Error sending file:`, err);
        res.status(500).json({ error: "Failed to serve image" });
      }
    });
  } catch (error) {
    console.error("Error serving image:", error);
    // Don't expose internal error details to clients
    res.status(500).json({ error: "Failed to serve image" });
  }
});

// GET /api/campaigns/:campaignId/images/:entityType/:entityId
// Get all images for a specific entity
router.get("/:campaignId/images/:entityType/:entityId", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, entityType, entityId } = req.params;

    const images = await all(`
      SELECT * FROM images 
      WHERE campaign_id = $1 AND entity_type = $2 AND entity_id = $3
      ORDER BY uploaded_at DESC
    `, [campaignId, entityType, entityId]);

    res.json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// DELETE /api/campaigns/:campaignId/images/:imageId
// Delete an image
router.delete("/:campaignId/images/:imageId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, imageId } = req.params;

    // Get image record
    const image = await get(`
      SELECT * FROM images 
      WHERE id = $1 AND campaign_id = $2
    `, [imageId, campaignId]);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, "../../uploads", image.file_path);
    const resolvedPath = path.resolve(filePath);
    
    // Security: Prevent path traversal attacks
    const uploadsDir = path.resolve(path.join(__dirname, "../../uploads"));
    if (resolvedPath.startsWith(uploadsDir)) {
      try {
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
      } catch (fileError) {
        console.error("Error deleting file:", fileError);
        // Continue with database deletion even if file deletion fails
      }
    } else {
      console.error(`[Images] Path traversal attempt detected: ${resolvedPath}`);
    }

    // Delete from database
    const result = await query("DELETE FROM images WHERE id = $1", [imageId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
