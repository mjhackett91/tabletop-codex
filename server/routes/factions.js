// server/routes/factions.js - Factions API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router({ mergeParams: true });

// All faction routes require authentication
router.use(authenticateToken);

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`[Factions Router] ${req.method} ${req.path}`);
  console.log(`[Factions Router] Params:`, req.params);
  console.log(`[Factions Router] User:`, req.user?.id);
  next();
});

// GET /api/campaigns/:campaignId/factions
router.get("/:campaignId/factions", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    let query = "SELECT * FROM factions WHERE campaign_id = ?";
    const params = [campaignId];

    if (search) {
      query += " AND (name LIKE ? OR description LIKE ? OR goals LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY name";

    const factions = db.prepare(query).all(...params);

    res.json(factions);
  } catch (error) {
    console.error("Error fetching factions:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch factions", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/factions/:id
router.get("/:campaignId/factions/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const faction = db
      .prepare("SELECT * FROM factions WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!faction) {
      return res.status(404).json({ error: "Faction not found" });
    }

    res.json(faction);
  } catch (error) {
    console.error("Error fetching faction:", error);
    res.status(500).json({ error: "Failed to fetch faction" });
  }
});

// POST /api/campaigns/:campaignId/factions
router.post("/:campaignId/factions", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, alignment, goals } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Faction name is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO factions (campaign_id, name, description, alignment, goals)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        campaignId,
        name.trim(),
        description || null,
        alignment || null,
        goals || null
      );

    const newFaction = db
      .prepare("SELECT * FROM factions WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newFaction);
  } catch (error) {
    console.error("Error creating faction:", error);
    res.status(500).json({ error: "Failed to create faction" });
  }
});

// PUT /api/campaigns/:campaignId/factions/:id
router.put("/:campaignId/factions/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { name, description, alignment, goals } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Faction name is required" });
    }

    // Check if faction exists and belongs to campaign
    const existing = db
      .prepare("SELECT id FROM factions WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!existing) {
      return res.status(404).json({ error: "Faction not found" });
    }

    db.prepare(
      `UPDATE factions 
       SET name = ?, description = ?, alignment = ?, goals = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND campaign_id = ?`
    ).run(
      name.trim(),
      description || null,
      alignment || null,
      goals || null,
      id,
      campaignId
    );

    const updatedFaction = db
      .prepare("SELECT * FROM factions WHERE id = ?")
      .get(id);

    res.json(updatedFaction);
  } catch (error) {
    console.error("Error updating faction:", error);
    res.status(500).json({ error: "Failed to update faction" });
  }
});

// DELETE /api/campaigns/:campaignId/factions/:id
router.delete("/:campaignId/factions/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if faction exists and belongs to campaign
    const faction = db
      .prepare("SELECT id FROM factions WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!faction) {
      return res.status(404).json({ error: "Faction not found" });
    }

    db.prepare("DELETE FROM factions WHERE id = ? AND campaign_id = ?").run(id, campaignId);

    res.json({ message: "Faction deleted successfully" });
  } catch (error) {
    console.error("Error deleting faction:", error);
    res.status(500).json({ error: "Failed to delete faction" });
  }
});

export default router;
