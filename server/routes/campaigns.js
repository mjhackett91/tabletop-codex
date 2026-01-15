// server/routes/campaigns.js - User-scoped campaigns CRUD
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { verifyCampaignOwnership } from "../utils/campaignOwnership.js";
import { hasCampaignAccess, getUserCampaignRole } from "../utils/participantAccess.js";

const router = express.Router();

// All campaign routes require authentication
router.use(authenticateToken);

// Debug middleware to log all requests
router.use((req, res, next) => {
  if (req.path.includes('activity')) {
    console.log("[Campaigns Router] Request:", req.method, req.path, "Full URL:", req.originalUrl);
  }
  next();
});

/** GET /api/campaigns - List user's campaigns (owned and participated) */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get campaigns where user is owner OR participant
    const campaigns = await all(`
      SELECT DISTINCT
        c.*,
        CASE 
          WHEN c.user_id = $1 THEN 'dm'
          ELSE cp.role
        END as user_role,
        CASE 
          WHEN c.user_id = $1 THEN true
          ELSE false
        END as is_owner
      FROM campaigns c
      LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id AND cp.user_id = $1
      WHERE c.user_id = $1 OR cp.user_id = $1
      ORDER BY is_owner DESC, c.created_at DESC
    `, [userId]);
    
    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

/** POST /api/campaigns - Create new campaign */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    const result = await query(
      "INSERT INTO campaigns (user_id, name, description) VALUES ($1, $2, $3) RETURNING id",
      [userId, name.trim(), description?.trim() || null]
    );
    const campaignId = result.rows[0].id;

    // Create pre-made tags for the new campaign
    const premadeTags = [
      { name: "Important", color: "#FF5733", is_premade: true },
      { name: "NPC", color: "#33FF57", is_premade: true },
      { name: "Location", color: "#3357FF", is_premade: true },
      { name: "Quest", color: "#FF33F5", is_premade: true },
      { name: "Lore", color: "#D4AF37", is_premade: true }, // Changed from bright yellow to gold for readability
      { name: "Session", color: "#FF8C33", is_premade: true },
      { name: "Player", color: "#33FFF5", is_premade: true },
      { name: "Villain", color: "#8C33FF", is_premade: true },
    ];

    for (const tag of premadeTags) {
      try {
        await query(
          "INSERT INTO tags (campaign_id, name, color, is_premade) VALUES ($1, $2, $3, $4) ON CONFLICT (campaign_id, name) DO NOTHING",
          [campaignId, tag.name, tag.color, tag.is_premade ? 1 : 0]
        );
      } catch (err) {
        // Tag might already exist, skip
        console.log(`Skipping premade tag ${tag.name}: ${err.message}`);
      }
    }

    const newCampaign = await get("SELECT * FROM campaigns WHERE id = $1", [campaignId]);
    res.status(201).json(newCampaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

/** PUT /api/campaigns/:id - Update campaign */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    // Verify ownership
    if (!(await verifyCampaignOwnership(id, userId))) {
      return res.status(403).json({ error: "Campaign not found or access denied" });
    }

    const result = await query(
      "UPDATE campaigns SET name = $1, description = $2 WHERE id = $3 AND user_id = $4",
      [name.trim(), description?.trim() || null, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updatedCampaign = await get("SELECT * FROM campaigns WHERE id = $1", [id]);
    res.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

/** DELETE /api/campaigns/:id - Delete campaign */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    if (!(await verifyCampaignOwnership(id, userId))) {
      return res.status(403).json({ error: "Campaign not found or access denied" });
    }

    const result = await query("DELETE FROM campaigns WHERE id = $1 AND user_id = $2", [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

/** GET /api/campaigns/:id/activity - Get recent activity feed */
router.get("/:id/activity", async (req, res) => {
  console.log("========== ACTIVITY ROUTE HIT ==========");
  console.log("[Activity Route] Hit - Campaign ID:", req.params.id, "User ID:", req.user?.id);
  console.log("[Activity Route] Full URL:", req.originalUrl);
  console.log("[Activity Route] Method:", req.method);
  console.log("=========================================");
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user has access to this campaign
    const campaignIdInt = parseInt(id, 10);
    if (isNaN(campaignIdInt)) {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }

    const hasAccess = await hasCampaignAccess(campaignIdInt, userId, req);
    if (!hasAccess) {
      return res.status(403).json({ error: "You are not a participant in this campaign" });
    }

    const userRole = await getUserCampaignRole(campaignIdInt, userId, req);

    // Build visibility filters based on user role
    const visibilityFilter = userRole === "player" 
      ? "AND visibility = 'player-visible'" 
      : "AND visibility != 'hidden'";

    // Build character visibility filter (special case for players)
    const characterVisibilityFilter = userRole === "player"
      ? "AND (visibility = 'player-visible' OR (type = 'player' AND player_user_id = $2))"
      : visibilityFilter;

    // Union query to get recent activity from all entity types
    // We use GREATEST(created_at, COALESCE(updated_at, created_at)) to handle NULLs
    // and determine if it was a create or update based on which is newer
    // Build query using string concatenation to avoid template literal issues
    let activityQuery = "SELECT " +
        "'character' as entity_type, " +
        "id as entity_id, " +
        "name as entity_name, " +
        "type as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM characters c " +
      "LEFT JOIN users u ON COALESCE(c.last_updated_by_user_id, c.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + characterVisibilityFilter;
    
    activityQuery += " UNION ALL SELECT " +
        "'session' as entity_type, " +
        "id as entity_id, " +
        "COALESCE(NULLIF(title, ''), 'Session ' || COALESCE(session_number::text, '')) as entity_name, " +
        "NULL as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM sessions s " +
      "LEFT JOIN users u ON COALESCE(s.last_updated_by_user_id, s.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + visibilityFilter;
    
    activityQuery += " UNION ALL SELECT " +
        "'quest' as entity_type, " +
        "id as entity_id, " +
        "title as entity_name, " +
        "quest_type as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM quests q " +
      "LEFT JOIN users u ON COALESCE(q.last_updated_by_user_id, q.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + visibilityFilter;
    
    activityQuery += " UNION ALL SELECT " +
        "'location' as entity_type, " +
        "id as entity_id, " +
        "name as entity_name, " +
        "location_type as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM locations l " +
      "LEFT JOIN users u ON COALESCE(l.last_updated_by_user_id, l.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + visibilityFilter;
    
    activityQuery += " UNION ALL SELECT " +
        "'faction' as entity_type, " +
        "id as entity_id, " +
        "name as entity_name, " +
        "NULL as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM factions f " +
      "LEFT JOIN users u ON COALESCE(f.last_updated_by_user_id, f.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + visibilityFilter;
    
    activityQuery += " UNION ALL SELECT " +
        "'world_info' as entity_type, " +
        "id as entity_id, " +
        "title as entity_name, " +
        "category as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM world_info w " +
      "LEFT JOIN users u ON COALESCE(w.last_updated_by_user_id, w.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + visibilityFilter;
    
    activityQuery += " UNION ALL SELECT " +
        "'creature' as entity_type, " +
        "id as entity_id, " +
        "name as entity_name, " +
        "creature_type as entity_subtype, " +
        "GREATEST(created_at, COALESCE(updated_at, created_at)) as activity_time, " +
        "CASE " +
        "  WHEN updated_at IS NOT NULL AND updated_at > created_at THEN 'updated' " +
        "  ELSE 'created' " +
        "END as action_type, " +
        "COALESCE(last_updated_by_user_id, created_by_user_id) as user_id, " +
        "u.username as username " +
      "FROM creatures cr " +
      "LEFT JOIN users u ON COALESCE(cr.last_updated_by_user_id, cr.created_by_user_id) = u.id " +
      "WHERE campaign_id = $1 " + visibilityFilter;
    
    activityQuery += " ORDER BY activity_time DESC LIMIT 10";

    const params = userRole === "player" ? [id, userId] : [id];
    
    // Log full query for debugging
    console.log("[Activity Query Full]:", activityQuery);
    console.log("[Activity Params]:", params);
    console.log("[Activity Query Length]:", activityQuery.length);
    
    try {
      const activities = await all(activityQuery, params);
      console.log("[Activity Result]:", activities.length, "items");
      res.json(activities);
    } catch (queryError) {
      console.error("========== ACTIVITY QUERY ERROR ==========");
      console.error("[Activity Query Error]:", queryError);
      console.error("[Activity Query Error Message]:", queryError.message);
      console.error("[Activity Query Error Code]:", queryError.code);
      console.error("[Activity Query Error Detail]:", queryError.detail);
      console.error("[Activity Query Error Hint]:", queryError.hint);
      console.error("[Activity Query Error Position]:", queryError.position);
      console.error("==========================================");
      throw queryError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error fetching campaign activity:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch campaign activity", details: error.message });
  }
});

/** GET /api/campaigns/:id/statistics - Get campaign statistics */
router.get("/:id/statistics", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user has access to this campaign
    const campaignIdInt = parseInt(id, 10);
    if (isNaN(campaignIdInt)) {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }

    const hasAccess = await hasCampaignAccess(campaignIdInt, userId, req);
    if (!hasAccess) {
      return res.status(403).json({ error: "You are not a participant in this campaign" });
    }

    const userRole = await getUserCampaignRole(campaignIdInt, userId, req);

    // Count characters (respecting visibility)
    let charactersQuery = `
      SELECT COUNT(*) as count
      FROM characters c
      WHERE c.campaign_id = $1
    `;
    const charactersParams = [id];
    let paramIndex = 2;

    if (userRole === "player") {
      charactersQuery += ` AND (c.visibility = 'player-visible' OR (c.type = 'player' AND c.player_user_id = $${paramIndex}))`;
      charactersParams.push(userId);
      paramIndex++;
    } else if (userRole === "dm") {
      charactersQuery += " AND c.visibility != 'hidden'";
    }

    // Count sessions (respecting visibility)
    let sessionsQuery = `
      SELECT COUNT(*) as count
      FROM sessions s
      WHERE s.campaign_id = $1
    `;
    const sessionsParams = [id];

    if (userRole === "player") {
      sessionsQuery += " AND s.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      sessionsQuery += " AND s.visibility != 'hidden'";
    }

    // Count quests (respecting visibility)
    let questsQuery = `
      SELECT COUNT(*) as count
      FROM quests q
      WHERE q.campaign_id = $1
    `;
    const questsParams = [id];

    if (userRole === "player") {
      questsQuery += " AND q.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      questsQuery += " AND q.visibility != 'hidden'";
    }

    const [charactersResult, sessionsResult, questsResult] = await Promise.all([
      all(charactersQuery, charactersParams),
      all(sessionsQuery, sessionsParams),
      all(questsQuery, questsParams),
    ]);

    res.json({
      characters: parseInt(charactersResult[0]?.count || 0, 10),
      sessions: parseInt(sessionsResult[0]?.count || 0, 10),
      quests: parseInt(questsResult[0]?.count || 0, 10),
    });
  } catch (error) {
    console.error("Error fetching campaign statistics:", error);
    res.status(500).json({ error: "Failed to fetch campaign statistics" });
  }
});

export default router;