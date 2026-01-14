// server/routes/factions.js - Factions API
import express from "express";
import { get, all, query } from "../db-pg.js";
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
router.get("/:campaignId/factions", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search } = req.query;
    const userRole = req.userCampaignRole;

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    let queryText = `
      SELECT f.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM factions f
      LEFT JOIN users creator ON f.created_by_user_id = creator.id
      LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
      WHERE f.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      queryText += " AND f.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND f.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (search) {
      queryText += ` AND (f.name ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex + 1} OR f.goals ILIKE $${paramIndex + 2})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 3;
    }

    queryText += " ORDER BY f.name";

    const factions = await all(queryText, params);

    // Get tags for each faction
    const factionsWithTags = await Promise.all(factions.map(async (faction) => {
      try {
        // Get tags for this faction
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'faction' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [faction.id, campaignId]);

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
    }));

    res.json(factionsWithTags);
  } catch (error) {
    console.error("Error fetching factions:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch factions", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/factions/:id
router.get("/:campaignId/factions/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let queryText = `
      SELECT f.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM factions f
      LEFT JOIN users creator ON f.created_by_user_id = creator.id
      LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
      WHERE f.id = $1 AND f.campaign_id = $2
    `;
    const params = [id, campaignId];
    let paramIndex = 3;

    // Filter by visibility
    if (userRole === "player") {
      queryText += " AND f.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND f.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const faction = await get(queryText, params);

    if (!faction) {
      return res.status(404).json({ error: "Faction not found" });
    }

    // Get tags for this faction
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'faction' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [faction.id, campaignId]);

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
router.post("/:campaignId/factions", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, alignment, goals, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Faction name is required" });
    }

    const result = await query(
      `INSERT INTO factions (campaign_id, name, description, alignment, goals, visibility, created_by_user_id, last_updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        campaignId,
        name.trim(),
        description || null,
        alignment || null,
        goals || null,
        visibility || "dm-only",
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      ]
    );

    const factionId = result.rows[0].id;

    const newFaction = await get(`
      SELECT f.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM factions f
      LEFT JOIN users creator ON f.created_by_user_id = creator.id
      LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
      WHERE f.id = $1
    `, [factionId]);

    // Get tags for this faction
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'faction' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [factionId, campaignId]);

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
router.put("/:campaignId/factions/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { name, description, alignment, goals, visibility } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Faction name is required" });
    }

    // Check if faction exists and belongs to campaign
    const existing = await get("SELECT id FROM factions WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (!existing) {
      return res.status(404).json({ error: "Faction not found" });
    }

    const userId = req.user.id;

    await query(
      `UPDATE factions 
       SET name = $1, description = $2, alignment = $3, goals = $4, visibility = $5, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $6
       WHERE id = $7 AND campaign_id = $8`,
      [
        name.trim(),
        description || null,
        alignment || null,
        goals || null,
        visibility || "dm-only",
        userId, // last_updated_by_user_id
        id,
        campaignId
      ]
    );

    const updatedFaction = await get(`
      SELECT f.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM factions f
      LEFT JOIN users creator ON f.created_by_user_id = creator.id
      LEFT JOIN users updater ON f.last_updated_by_user_id = updater.id
      WHERE f.id = $1
    `, [id]);

    // Get tags for this faction
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'faction' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [id, campaignId]);

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
router.delete("/:campaignId/factions/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if faction exists and belongs to campaign
    const faction = await get("SELECT id FROM factions WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (!faction) {
      return res.status(404).json({ error: "Faction not found" });
    }

    const result = await query("DELETE FROM factions WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Faction not found" });
    }

    res.json({ message: "Faction deleted successfully" });
  } catch (error) {
    console.error("Error deleting faction:", error);
    res.status(500).json({ error: "Failed to delete faction" });
  }
});

export default router;
