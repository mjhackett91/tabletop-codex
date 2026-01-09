// server/routes/worldInfo.js - World Info API
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All world info routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/world-info
router.get("/:campaignId/world-info", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search, category } = req.query;
    const userRole = req.userCampaignRole;

    console.log(`[WorldInfo GET] Campaign: ${campaignId}, UserRole: ${userRole}, UserId: ${req.user?.id}`);

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    if (!userRole) {
      console.error(`[WorldInfo GET] userRole is undefined for user ${req.user?.id} in campaign ${campaignId}`);
      return res.status(403).json({ error: "Access denied - no role assigned" });
    }

    let queryText = `
      SELECT w.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM world_info w
      LEFT JOIN users creator ON w.created_by_user_id = creator.id
      LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
      WHERE w.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      queryText += " AND w.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND w.visibility != 'hidden'";
    } else {
      console.error(`[WorldInfo GET] Invalid userRole: ${userRole}`);
      return res.status(403).json({ error: "Access denied" });
    }

    if (category) {
      queryText += ` AND w.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (w.title LIKE $${paramIndex} OR w.content LIKE $${paramIndex + 1})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    queryText += " ORDER BY w.category, w.title";

    console.log(`[WorldInfo GET] Executing query: ${queryText} with params:`, params);
    const worldInfo = await all(queryText, params);
    console.log(`[WorldInfo GET] Found ${worldInfo.length} world info entries`);

    // Get tags for each world info entry
    const worldInfoWithTags = await Promise.all(worldInfo.map(async (info) => {
      try {
        // Get tags for this world info entry
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'world_info' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [info.id, campaignId]);

        return {
          ...info,
          tags
        };
      } catch (err) {
        console.error("Error processing world info:", info.id, err);
        return {
          ...info,
          tags: []
        };
      }
    }));

    res.json(worldInfoWithTags);
  } catch (error) {
    console.error("Error fetching world info:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch world info", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/world-info/:id
router.get("/:campaignId/world-info/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let queryText = `
      SELECT w.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM world_info w
      LEFT JOIN users creator ON w.created_by_user_id = creator.id
      LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
      WHERE w.id = $1 AND w.campaign_id = $2
    `;
    const params = [id, campaignId];
    let paramIndex = 3;

    // Filter by visibility
    if (userRole === "player") {
      queryText += " AND w.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND w.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const worldInfo = await get(queryText, params);

    if (!worldInfo) {
      return res.status(404).json({ error: "World info not found" });
    }

    // Get tags for this world info entry
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'world_info' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [worldInfo.id, campaignId]);

    res.json({
      ...worldInfo,
      tags
    });
  } catch (error) {
    console.error("Error fetching world info:", error);
    res.status(500).json({ error: "Failed to fetch world info" });
  }
});

// POST /api/campaigns/:campaignId/world-info
router.post("/:campaignId/world-info", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { title, content, category, visibility } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await query(
      `INSERT INTO world_info (campaign_id, title, content, category, visibility, created_by_user_id, last_updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        campaignId,
        title.trim(),
        content || null,
        category || null,
        visibility || "dm-only",
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      ]
    );

    const worldInfoId = result.rows[0].id;

    const newWorldInfo = await get(`
      SELECT w.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM world_info w
      LEFT JOIN users creator ON w.created_by_user_id = creator.id
      LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
      WHERE w.id = $1
    `, [worldInfoId]);

    // Get tags for this world info entry
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'world_info' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [worldInfoId, campaignId]);

    res.status(201).json({
      ...newWorldInfo,
      tags
    });
  } catch (error) {
    console.error("Error creating world info:", error);
    res.status(500).json({ error: "Failed to create world info" });
  }
});

// PUT /api/campaigns/:campaignId/world-info/:id
router.put("/:campaignId/world-info/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { title, content, category, visibility } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check if world info exists and belongs to campaign
    const existing = await get("SELECT id FROM world_info WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (!existing) {
      return res.status(404).json({ error: "World info not found" });
    }

    const userId = req.user.id;

    await query(
      `UPDATE world_info 
       SET title = $1, content = $2, category = $3, visibility = $4, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $5
       WHERE id = $6 AND campaign_id = $7`,
      [
        title.trim(),
        content || null,
        category || null,
        visibility || "dm-only",
        userId, // last_updated_by_user_id
        id,
        campaignId
      ]
    );

    const updatedWorldInfo = await get(`
      SELECT w.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM world_info w
      LEFT JOIN users creator ON w.created_by_user_id = creator.id
      LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
      WHERE w.id = $1
    `, [id]);

    // Get tags for this world info entry
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'world_info' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [id, campaignId]);

    res.json({
      ...updatedWorldInfo,
      tags
    });
  } catch (error) {
    console.error("Error updating world info:", error);
    res.status(500).json({ error: "Failed to update world info" });
  }
});

// DELETE /api/campaigns/:campaignId/world-info/:id
router.delete("/:campaignId/world-info/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if world info exists and belongs to campaign
    const worldInfo = await get("SELECT id FROM world_info WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (!worldInfo) {
      return res.status(404).json({ error: "World info not found" });
    }

    const result = await query("DELETE FROM world_info WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "World info not found" });
    }

    res.json({ message: "World info deleted successfully" });
  } catch (error) {
    console.error("Error deleting world info:", error);
    res.status(500).json({ error: "Failed to delete world info" });
  }
});

export default router;
