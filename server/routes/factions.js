// server/routes/factions.js - Factions API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

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
router.get("/:campaignId/factions", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search } = req.query;
    const userRole = req.userCampaignRole;

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    let query = `
      SELECT f.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM factions f
      LEFT JOIN users creator ON f.created_by_user_id = creator.id
      LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
      WHERE f.campaign_id = ?
    `;
    const params = [campaignId];

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      query += " AND f.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND f.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (search) {
      query += " AND (f.name LIKE ? OR f.description LIKE ? OR f.goals LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY f.name";

    const factions = db.prepare(query).all(...params);

    // Get tags for each faction
    const factionsWithTags = factions.map(faction => {
      try {
        // Get tags for this faction
        const tags = db.prepare(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'faction' AND et.entity_id = ? AND t.campaign_id = ?
          ORDER BY t.name ASC
        `).all(faction.id, campaignId);

        return {
          ...faction,
          tags
        };
      } catch (err) {
        console.error("Error processing faction:", faction.id, err);
        return {
          ...faction,
          tags: []
        };
      }
    });

    res.json(factionsWithTags);
  } catch (error) {
    console.error("Error fetching factions:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch factions", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/factions/:id
router.get("/:campaignId/factions/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let query = `
      SELECT f.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM factions f
      LEFT JOIN users creator ON f.created_by_user_id = creator.id
      LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
      WHERE f.id = ? AND f.campaign_id = ?
    `;
    const params = [id, campaignId];

    // Filter by visibility
    if (userRole === "player") {
      query += " AND f.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND f.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const faction = db.prepare(query).get(...params);

    if (!faction) {
      return res.status(404).json({ error: "Faction not found" });
    }

    // Get tags for this faction
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'faction' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(faction.id, campaignId);

    res.json({
      ...faction,
      tags
    });
  } catch (error) {
    console.error("Error fetching faction:", error);
    res.status(500).json({ error: "Failed to fetch faction" });
  }
});

// POST /api/campaigns/:campaignId/factions
router.post("/:campaignId/factions", requireCampaignDM, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, alignment, goals, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Faction name is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO factions (campaign_id, name, description, alignment, goals, visibility, created_by_user_id, last_updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        campaignId,
        name.trim(),
        description || null,
        alignment || null,
        goals || null,
        visibility || "dm-only",
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      );

    const newFaction = db
      .prepare(`
        SELECT f.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM factions f
        LEFT JOIN users creator ON f.created_by_user_id = creator.id
        LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
        WHERE f.id = ?
      `)
      .get(result.lastInsertRowid);

    // Get tags for this faction
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'faction' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(newFaction.id, campaignId);

    res.status(201).json({
      ...newFaction,
      tags
    });
  } catch (error) {
    console.error("Error creating faction:", error);
    res.status(500).json({ error: "Failed to create faction" });
  }
});

// PUT /api/campaigns/:campaignId/factions/:id
router.put("/:campaignId/factions/:id", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { name, description, alignment, goals, visibility } = req.body;

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

    const userId = req.user.id;

    db.prepare(
      `UPDATE factions 
       SET name = ?, description = ?, alignment = ?, goals = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = ?
       WHERE id = ? AND campaign_id = ?`
    ).run(
      name.trim(),
      description || null,
      alignment || null,
      goals || null,
      visibility || "dm-only",
      userId, // last_updated_by_user_id
      id,
      campaignId
    );

    const updatedFaction = db
      .prepare(`
        SELECT f.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM factions f
        LEFT JOIN users creator ON f.created_by_user_id = creator.id
        LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
        WHERE f.id = ?
      `)
      .get(id);

    // Get tags for this faction
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'faction' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(id, campaignId);

    res.json({
      ...updatedFaction,
      tags
    });
  } catch (error) {
    console.error("Error updating faction:", error);
    res.status(500).json({ error: "Failed to update faction" });
  }
});

// DELETE /api/campaigns/:campaignId/factions/:id
router.delete("/:campaignId/factions/:id", requireCampaignDM, (req, res) => {
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
