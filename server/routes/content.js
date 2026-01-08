// server/routes/content.js - Category-based content API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

// All content routes require authentication
router.use(authenticateToken);

// Helper to check ownership before route handlers
const checkOwnership = (req, res, next) => {
  const campaignId = req.params.campaignId;
  const userId = req.user?.id;
  
  if (!campaignId || !userId) {
    return res.status(400).json({ error: "Invalid request" });
  }
  
  const campaign = db.prepare("SELECT id FROM campaigns WHERE id = ? AND user_id = ?").get(campaignId, userId);
  if (!campaign) {
    return res.status(403).json({ error: "Campaign not found or access denied" });
  }
  
  next();
};

// GET /api/campaigns/:campaignId/content/:category
router.get("/:campaignId/content/:category", checkOwnership, (req, res) => {
  try {
    const { campaignId, category } = req.params;
    
    const items = db
      .prepare(`
        SELECT id, title, content_data, created_at, updated_at 
        FROM content_items 
        WHERE campaign_id = ? AND category = ?
        ORDER BY updated_at DESC
      `)
      .all(campaignId, category);

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
router.post("/:campaignId/content/:category", checkOwnership, (req, res) => {
  try {
    const { campaignId, category } = req.params;
    const { title, content_data } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const contentJson = content_data ? JSON.stringify(content_data) : null;

    const stmt = db.prepare(`
      INSERT INTO content_items (campaign_id, category, title, content_data)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(campaignId, category, title.trim(), contentJson);

    const newItem = db.prepare("SELECT * FROM content_items WHERE id = ?").get(result.lastInsertRowid);
    
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
router.put("/:campaignId/content/:category/:id", checkOwnership, (req, res) => {
  try {
    const { campaignId, category, id } = req.params;
    const { title, content_data } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const contentJson = content_data ? JSON.stringify(content_data) : null;

    const stmt = db.prepare(`
      UPDATE content_items 
      SET title = ?, content_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND campaign_id = ? AND category = ?
    `);
    const result = stmt.run(title.trim(), contentJson, id, campaignId, category);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    const updated = db.prepare("SELECT * FROM content_items WHERE id = ?").get(id);
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
router.delete("/:campaignId/content/:category/:id", checkOwnership, (req, res) => {
  try {
    const { campaignId, category, id } = req.params;

    const stmt = db.prepare(`
      DELETE FROM content_items 
      WHERE id = ? AND campaign_id = ? AND category = ?
    `);
    const result = stmt.run(id, campaignId, category);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting content:", error);
    res.status(500).json({ error: "Failed to delete content" });
  }
});

export default router;
