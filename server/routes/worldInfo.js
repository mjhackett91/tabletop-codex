// server/routes/worldInfo.js - World Info API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router({ mergeParams: true });

// All world info routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/world-info
router.get("/:campaignId/world-info", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search, category } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    let query = "SELECT * FROM world_info WHERE campaign_id = ?";
    const params = [campaignId];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (search) {
      query += " AND (title LIKE ? OR content LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY category, title";

    const worldInfo = db.prepare(query).all(...params);

    res.json(worldInfo);
  } catch (error) {
    console.error("Error fetching world info:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch world info", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/world-info/:id
router.get("/:campaignId/world-info/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const worldInfo = db
      .prepare("SELECT * FROM world_info WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!worldInfo) {
      return res.status(404).json({ error: "World info not found" });
    }

    res.json(worldInfo);
  } catch (error) {
    console.error("Error fetching world info:", error);
    res.status(500).json({ error: "Failed to fetch world info" });
  }
});

// POST /api/campaigns/:campaignId/world-info
router.post("/:campaignId/world-info", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { title, content, category } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO world_info (campaign_id, title, content, category)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        campaignId,
        title.trim(),
        content || null,
        category || null
      );

    const newWorldInfo = db
      .prepare("SELECT * FROM world_info WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newWorldInfo);
  } catch (error) {
    console.error("Error creating world info:", error);
    res.status(500).json({ error: "Failed to create world info" });
  }
});

// PUT /api/campaigns/:campaignId/world-info/:id
router.put("/:campaignId/world-info/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { title, content, category } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check if world info exists and belongs to campaign
    const existing = db
      .prepare("SELECT id FROM world_info WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!existing) {
      return res.status(404).json({ error: "World info not found" });
    }

    db.prepare(
      `UPDATE world_info 
       SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND campaign_id = ?`
    ).run(
      title.trim(),
      content || null,
      category || null,
      id,
      campaignId
    );

    const updatedWorldInfo = db
      .prepare("SELECT * FROM world_info WHERE id = ?")
      .get(id);

    res.json(updatedWorldInfo);
  } catch (error) {
    console.error("Error updating world info:", error);
    res.status(500).json({ error: "Failed to update world info" });
  }
});

// DELETE /api/campaigns/:campaignId/world-info/:id
router.delete("/:campaignId/world-info/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if world info exists and belongs to campaign
    const worldInfo = db
      .prepare("SELECT id FROM world_info WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!worldInfo) {
      return res.status(404).json({ error: "World info not found" });
    }

    db.prepare("DELETE FROM world_info WHERE id = ? AND campaign_id = ?").run(id, campaignId);

    res.json({ message: "World info deleted successfully" });
  } catch (error) {
    console.error("Error deleting world info:", error);
    res.status(500).json({ error: "Failed to delete world info" });
  }
});

export default router;
