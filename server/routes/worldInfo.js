// server/routes/worldInfo.js - World Info API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All world info routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/world-info
router.get("/:campaignId/world-info", requireCampaignAccess, (req, res) => {
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

    let query = `
      SELECT w.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM world_info w
      LEFT JOIN users creator ON w.created_by_user_id = creator.id
      LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
      WHERE w.campaign_id = ?
    `;
    const params = [campaignId];

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      query += " AND w.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND w.visibility != 'hidden'";
    } else {
      console.error(`[WorldInfo GET] Invalid userRole: ${userRole}`);
      return res.status(403).json({ error: "Access denied" });
    }

    if (category) {
      query += " AND w.category = ?";
      params.push(category);
    }

    if (search) {
      query += " AND (w.title LIKE ? OR w.content LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY w.category, w.title";

    console.log(`[WorldInfo GET] Executing query: ${query} with params:`, params);
    const worldInfo = db.prepare(query).all(...params);
    console.log(`[WorldInfo GET] Found ${worldInfo.length} world info entries`);

    // Get tags for each world info entry
    const worldInfoWithTags = worldInfo.map(info => {
      try {
        // Get tags for this world info entry
        const tags = db.prepare(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'world_info' AND et.entity_id = ? AND t.campaign_id = ?
          ORDER BY t.name ASC
        `).all(info.id, campaignId);

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
    });

    res.json(worldInfoWithTags);
  } catch (error) {
    console.error("Error fetching world info:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch world info", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/world-info/:id
router.get("/:campaignId/world-info/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let query = `
      SELECT w.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM world_info w
      LEFT JOIN users creator ON w.created_by_user_id = creator.id
      LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
      WHERE w.id = ? AND w.campaign_id = ?
    `;
    const params = [id, campaignId];

    // Filter by visibility
    if (userRole === "player") {
      query += " AND w.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND w.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const worldInfo = db.prepare(query).get(...params);

    if (!worldInfo) {
      return res.status(404).json({ error: "World info not found" });
    }

    // Get tags for this world info entry
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'world_info' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(worldInfo.id, campaignId);

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
router.post("/:campaignId/world-info", requireCampaignDM, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { title, content, category, visibility } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO world_info (campaign_id, title, content, category, visibility, created_by_user_id, last_updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        campaignId,
        title.trim(),
        content || null,
        category || null,
        visibility || "dm-only",
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      );

    const newWorldInfo = db
      .prepare(`
        SELECT w.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM world_info w
        LEFT JOIN users creator ON w.created_by_user_id = creator.id
        LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
        WHERE w.id = ?
      `)
      .get(result.lastInsertRowid);

    // Get tags for this world info entry
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'world_info' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(newWorldInfo.id, campaignId);

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
router.put("/:campaignId/world-info/:id", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { title, content, category, visibility } = req.body;

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

    const userId = req.user.id;

    db.prepare(
      `UPDATE world_info 
       SET title = ?, content = ?, category = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = ?
       WHERE id = ? AND campaign_id = ?`
    ).run(
      title.trim(),
      content || null,
      category || null,
      visibility || "dm-only",
      userId, // last_updated_by_user_id
      id,
      campaignId
    );

    const updatedWorldInfo = db
      .prepare(`
        SELECT w.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM world_info w
        LEFT JOIN users creator ON w.created_by_user_id = creator.id
        LEFT JOIN users updater ON w.last_updated_by_user_id = updater.id
        WHERE w.id = ?
      `)
      .get(id);

    // Get tags for this world info entry
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'world_info' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(id, campaignId);

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
router.delete("/:campaignId/world-info/:id", requireCampaignDM, (req, res) => {
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
