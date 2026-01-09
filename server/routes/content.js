// server/routes/content.js - Category-based content API
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

// All content routes require authentication
router.use(authenticateToken);

// Helper to check ownership before route handlers
const checkOwnership = async (req, res, next) => {
  const campaignId = req.params.campaignId;
  const userId = req.user?.id;
  
  if (!campaignId || !userId) {
    return res.status(400).json({ error: "Invalid request" });
  }
  
  const campaign = await get("SELECT id FROM campaigns WHERE id = $1 AND user_id = $2", [campaignId, userId]);
  if (!campaign) {
    return res.status(403).json({ error: "Campaign not found or access denied" });
  }
  
  next();
};

// GET /api/campaigns/:campaignId/content/:category
router.get("/:campaignId/content/:category", checkOwnership, async (req, res) => {
  try {
    const { campaignId, category } = req.params;
    
    const items = await all(`
      SELECT id, title, content_data, created_at, updated_at 
      FROM content_items 
      WHERE campaign_id = $1 AND category = $2
      ORDER BY updated_at DESC
    `, [campaignId, category]);

    res.json(items.map(item => ({
      ...item,
      content_data: item.content_data ? JSON.parse(item.content_data) : null
    })));
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// POST /api/campaigns/:campaignId/content/:category
router.post("/:campaignId/content/:category", checkOwnership, async (req, res) => {
  try {
    const { campaignId, category } = req.params;
    const { title, content_data } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const contentJson = content_data ? JSON.stringify(content_data) : null;

    const result = await query(`
      INSERT INTO content_items (campaign_id, category, title, content_data)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [campaignId, category, title.trim(), contentJson]);

    const itemId = result.rows[0].id;
    const newItem = await get("SELECT * FROM content_items WHERE id = $1", [itemId]);
    
    res.status(201).json({
      ...newItem,
      content_data: newItem.content_data ? JSON.parse(newItem.content_data) : null
    });
  } catch (error) {
    console.error("Error creating content:", error);
    res.status(500).json({ error: "Failed to create content" });
  }
});

// PUT /api/campaigns/:campaignId/content/:category/:id
router.put("/:campaignId/content/:category/:id", checkOwnership, async (req, res) => {
  try {
    const { campaignId, category, id } = req.params;
    const { title, content_data } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const contentJson = content_data ? JSON.stringify(content_data) : null;

    const result = await query(`
      UPDATE content_items 
      SET title = $1, content_data = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND campaign_id = $4 AND category = $5
    `, [title.trim(), contentJson, id, campaignId, category]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    const updated = await get("SELECT * FROM content_items WHERE id = $1", [id]);
    res.json({
      ...updated,
      content_data: updated.content_data ? JSON.parse(updated.content_data) : null
    });
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).json({ error: "Failed to update content" });
  }
});

// DELETE /api/campaigns/:campaignId/content/:category/:id
router.delete("/:campaignId/content/:category/:id", checkOwnership, async (req, res) => {
  try {
    const { campaignId, category, id } = req.params;

    const result = await query(`
      DELETE FROM content_items 
      WHERE id = $1 AND campaign_id = $2 AND category = $3
    `, [id, campaignId, category]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting content:", error);
    res.status(500).json({ error: "Failed to delete content" });
  }
});

export default router;
