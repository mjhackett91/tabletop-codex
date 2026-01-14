// server/routes/quests.js - Enhanced Quests API
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All quest routes require authentication
router.use(authenticateToken);

// Helper function to get full quest with all relationships
async function getQuestWithRelations(questId, campaignId, userRole = null) {
  const quest = await get(`
    SELECT q.*, 
           creator.username as created_by_username, creator.email as created_by_email,
           updater.username as last_updated_by_username, updater.email as last_updated_by_email
    FROM quests q
    LEFT JOIN users creator ON q.created_by_user_id = creator.id
    LEFT JOIN users updater ON q.last_updated_by_user_id = updater.id
    WHERE q.id = $1 AND q.campaign_id = $2
  `, [questId, campaignId]);

  if (!quest) return null;

  // Get quest links - filter by visibility based on user role
  let linksQueryText = "SELECT * FROM quest_links WHERE quest_id = $1";
  const linksParams = [questId];
  
  if (userRole === "player") {
    // Players only see player-visible links
    linksQueryText += " AND visibility = 'player-visible'";
  } else if (userRole === "dm") {
    // DMs see all links except hidden
    linksQueryText += " AND visibility != 'hidden'";
  }
  // If no role, return empty links array (shouldn't happen, but safe fallback)
  
  const links = await all(linksQueryText, linksParams);

  // Get quest objectives
  const objectives = await all(
    "SELECT * FROM quest_objectives WHERE quest_id = $1 ORDER BY order_index, id",
    [questId]
  );

  // Get quest milestones
  const milestones = await all(
    "SELECT * FROM quest_milestones WHERE quest_id = $1 ORDER BY session_number, created_at",
    [questId]
  );

  // Get quest sessions
  const questSessions = await all(`
    SELECT qs.*, s.session_number, s.title as session_title, s.date_played
    FROM quest_sessions qs
    JOIN sessions s ON qs.session_id = s.id
    WHERE qs.quest_id = $1
    ORDER BY s.session_number
  `, [questId]);

  // Get tags for this quest
  const tags = await all(`
    SELECT t.*
    FROM tags t
    INNER JOIN entity_tags et ON t.id = et.tag_id
    WHERE et.entity_type = 'quest' AND et.entity_id = $1 AND t.campaign_id = $2
    ORDER BY t.name ASC
  `, [questId, campaignId]);

  return {
    ...quest,
    links,
    objectives,
    milestones,
    sessions: questSessions,
    tags
  };
}

// GET /api/campaigns/:campaignId/quests
router.get("/:campaignId/quests", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search, status, quest_type, urgency } = req.query;
    const userRole = req.userCampaignRole;

    console.log(`[Quests GET] Campaign: ${campaignId}, UserRole: ${userRole}, UserId: ${req.user?.id}`);

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    if (!userRole) {
      console.error(`[Quests GET] userRole is undefined for user ${req.user?.id} in campaign ${campaignId}`);
      return res.status(403).json({ error: "Access denied - no role assigned" });
    }

    let queryText = `
      SELECT q.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM quests q
      LEFT JOIN users creator ON q.created_by_user_id = creator.id
      LEFT JOIN users updater ON q.last_updated_by_user_id = updater.id
      WHERE q.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      queryText += " AND q.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND q.visibility != 'hidden'";
    } else {
      console.error(`[Quests GET] Invalid userRole: ${userRole}`);
      return res.status(403).json({ error: "Access denied" });
    }

    if (status) {
      queryText += ` AND q.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (quest_type) {
      queryText += ` AND q.quest_type = $${paramIndex}`;
      params.push(quest_type);
      paramIndex++;
    }

    if (urgency) {
      queryText += ` AND q.urgency_level = $${paramIndex}`;
      params.push(urgency);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (q.title ILIKE $${paramIndex} OR q.short_summary ILIKE $${paramIndex + 1} OR q.description ILIKE $${paramIndex + 2})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 3;
    }

    queryText += " ORDER BY q.created_at DESC";

    const quests = await all(queryText, params);

    // Get tags for each quest
    const questsWithTags = await Promise.all(quests.map(async (quest) => {
      try {
        // Get tags for this quest
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'quest' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [quest.id, campaignId]);

        return {
          ...quest,
          tags
        };
      } catch (err) {
        console.error("Error processing quest:", quest.id, err);
        return {
          ...quest,
          tags: []
        };
      }
    }));

    res.json(questsWithTags);
  } catch (error) {
    console.error("Error fetching quests:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch quests", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/quests/:id
router.get("/:campaignId/quests/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    const quest = await getQuestWithRelations(id, campaignId, userRole);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    // Filter by visibility
    if (userRole === "player" && quest.visibility !== "player-visible") {
      return res.status(403).json({ error: "Access denied" });
    } else if (userRole === "dm" && quest.visibility === "hidden") {
      return res.status(403).json({ error: "Access denied" });
    } else if (!userRole) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(quest);
  } catch (error) {
    console.error("Error fetching quest:", error);
    res.status(500).json({ error: "Failed to fetch quest" });
  }
});

// POST /api/campaigns/:campaignId/quests
router.post("/:campaignId/quests", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      title,
      quest_type,
      status,
      short_summary,
      description,
      quest_giver,
      initial_hook,
      rewards,
      consequences,
      urgency_level,
      estimated_sessions,
      difficulty,
      visibility_controls,
      visibility,
      introduced_in_session,
      links,
      objectives,
      milestones
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Quest title is required" });
    }

    const userId = req.user.id;

    const result = await query(
      `INSERT INTO quests (
        campaign_id, title, quest_type, status, short_summary, description,
        quest_giver, initial_hook, rewards, consequences, urgency_level,
        estimated_sessions, difficulty, visibility_controls, visibility, introduced_in_session,
        created_by_user_id, last_updated_by_user_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id`,
      [
        campaignId,
        title.trim(),
        quest_type || null,
        status || "active",
        short_summary || null,
        description || null,
        quest_giver || null,
        initial_hook || null,
        rewards || null,
        consequences || null,
        urgency_level || null,
        estimated_sessions || null,
        difficulty || null,
        visibility_controls || null,
        visibility || "dm-only",
        introduced_in_session || null,
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      ]
    );

    const questId = result.rows[0].id;

    // Add links if provided
    if (links && Array.isArray(links)) {
      for (const link of links) {
        await query(
          `INSERT INTO quest_links (quest_id, entity_type, entity_id, role, visibility)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            questId,
            link.entity_type,
            link.entity_id,
            link.role || null,
            link.visibility || "dm-only"
          ]
        );
      }
    }

    // Add objectives if provided
    if (objectives && Array.isArray(objectives)) {
      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.title && obj.title.trim()) { // Only insert if title is provided
          await query(
            `INSERT INTO quest_objectives (
              quest_id, objective_type, title, description, status,
              linked_entity_type, linked_entity_id, notes, order_index
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              questId,
              obj.objective_type || "primary",
              obj.title.trim(),
              obj.description || null,
              obj.status || "incomplete",
              obj.linked_entity_type || null,
              obj.linked_entity_id || null,
              obj.notes || null,
              i
            ]
          );
        }
      }
    }

    // Add milestones if provided
    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (milestone.title && milestone.title.trim()) { // Only insert if title is provided
          await query(
            `INSERT INTO quest_milestones (quest_id, title, description, session_number)
             VALUES ($1, $2, $3, $4)`,
            [
              questId,
              milestone.title.trim(),
              milestone.description || null,
              milestone.session_number || null
            ]
          );
        }
      }
    }

    // After creating, fetch with DM role (since only DMs can create)
    const newQuest = await getQuestWithRelations(questId, campaignId, "dm");
    res.status(201).json(newQuest);
  } catch (error) {
    console.error("Error creating quest:", error);
    res.status(500).json({ error: "Failed to create quest", details: error.message });
  }
});

// PUT /api/campaigns/:campaignId/quests/:id
router.put("/:campaignId/quests/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole; // Will be "dm" from requireCampaignDM
    const {
      title,
      quest_type,
      status,
      short_summary,
      description,
      quest_giver,
      initial_hook,
      rewards,
      consequences,
      urgency_level,
      estimated_sessions,
      difficulty,
      visibility_controls,
      visibility,
      introduced_in_session,
      completed_in_session,
      links,
      objectives,
      milestones
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Quest title is required" });
    }

    // Check if quest exists and belongs to campaign
    const existing = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [id, campaignId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const userId = req.user.id;

    await query(
      `UPDATE quests 
       SET title = $1, quest_type = $2, status = $3, short_summary = $4, description = $5,
           quest_giver = $6, initial_hook = $7, rewards = $8, consequences = $9,
           urgency_level = $10, estimated_sessions = $11, difficulty = $12,
           visibility_controls = $13, visibility = $14, introduced_in_session = $15, completed_in_session = $16,
           updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $17
       WHERE id = $18 AND campaign_id = $19`,
      [
        title.trim(),
        quest_type || null,
        status || "active",
        short_summary || null,
        description || null,
        quest_giver || null,
        initial_hook || null,
        rewards || null,
        consequences || null,
        urgency_level || null,
        estimated_sessions || null,
        difficulty || null,
        visibility_controls || null,
        visibility || "dm-only",
        introduced_in_session || null,
        completed_in_session || null,
        userId, // last_updated_by_user_id
        id,
        campaignId
      ]
    );

    // Update links: delete all existing and re-insert
    await query("DELETE FROM quest_links WHERE quest_id = $1", [id]);
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (link.entity_id) { // Only insert if entity is selected
          await query(
            `INSERT INTO quest_links (quest_id, entity_type, entity_id, role, visibility)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              id,
              link.entity_type,
              link.entity_id,
              link.role || null,
              link.visibility || "dm-only"
            ]
          );
        }
      }
    }

    // Update objectives: delete all existing and re-insert
    await query("DELETE FROM quest_objectives WHERE quest_id = $1", [id]);
    if (objectives && Array.isArray(objectives)) {
      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.title && obj.title.trim()) { // Only insert if title is provided
          await query(
            `INSERT INTO quest_objectives (
              quest_id, objective_type, title, description, status,
              linked_entity_type, linked_entity_id, notes, order_index
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              obj.objective_type || "primary",
              obj.title.trim(),
              obj.description || null,
              obj.status || "incomplete",
              obj.linked_entity_type || null,
              obj.linked_entity_id || null,
              obj.notes || null,
              i
            ]
          );
        }
      }
    }

    // Update milestones: delete all existing and re-insert
    await query("DELETE FROM quest_milestones WHERE quest_id = $1", [id]);
    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (milestone.title && milestone.title.trim()) { // Only insert if title is provided
          await query(
            `INSERT INTO quest_milestones (quest_id, title, description, session_number)
             VALUES ($1, $2, $3, $4)`,
            [
              id,
              milestone.title.trim(),
              milestone.description || null,
              milestone.session_number || null
            ]
          );
        }
      }
    }

    // After updating, fetch with DM role (since only DMs can update)
    const updatedQuest = await getQuestWithRelations(id, campaignId, "dm");
    res.json(updatedQuest);
  } catch (error) {
    console.error("Error updating quest:", error);
    res.status(500).json({ error: "Failed to update quest", details: error.message });
  }
});

// DELETE /api/campaigns/:campaignId/quests/:id
router.delete("/:campaignId/quests/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if quest exists and belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [id, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    // Delete related data (CASCADE should handle this, but being explicit)
    await query("DELETE FROM quest_links WHERE quest_id = $1", [id]);
    await query("DELETE FROM quest_objectives WHERE quest_id = $1", [id]);
    await query("DELETE FROM quest_milestones WHERE quest_id = $1", [id]);
    await query("DELETE FROM quest_sessions WHERE quest_id = $1", [id]);
    const result = await query("DELETE FROM quests WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Quest not found" });
    }

    res.json({ message: "Quest deleted successfully" });
  } catch (error) {
    console.error("Error deleting quest:", error);
    res.status(500).json({ error: "Failed to delete quest" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/links
router.post("/:campaignId/quests/:id/links", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { entity_type, entity_id, role, visibility } = req.body;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const result = await query(
      `INSERT INTO quest_links (quest_id, entity_type, entity_id, role, visibility)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        questId,
        entity_type,
        entity_id,
        role || null,
        visibility || "dm-only"
      ]
    );

    const linkId = result.rows[0].id;
    const newLink = await get("SELECT * FROM quest_links WHERE id = $1", [linkId]);

    res.status(201).json(newLink);
  } catch (error) {
    console.error("Error creating quest link:", error);
    res.status(500).json({ error: "Failed to create quest link" });
  }
});

// DELETE /api/campaigns/:campaignId/quests/:id/links/:linkId
router.delete("/:campaignId/quests/:id/links/:linkId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId, linkId } = req.params;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const result = await query(
      "DELETE FROM quest_links WHERE id = $1 AND quest_id = $2",
      [linkId, questId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Quest link not found" });
    }

    res.json({ message: "Quest link deleted successfully" });
  } catch (error) {
    console.error("Error deleting quest link:", error);
    res.status(500).json({ error: "Failed to delete quest link" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/objectives
router.post("/:campaignId/quests/:id/objectives", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { objective_type, title, description, status, linked_entity_type, linked_entity_id, notes, order_index } = req.body;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Objective title is required" });
    }

    const result = await query(
      `INSERT INTO quest_objectives (
        quest_id, objective_type, title, description, status,
        linked_entity_type, linked_entity_id, notes, order_index
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        questId,
        objective_type || "primary",
        title.trim(),
        description || null,
        status || "incomplete",
        linked_entity_type || null,
        linked_entity_id || null,
        notes || null,
        order_index || 0
      ]
    );

    const objectiveId = result.rows[0].id;
    const newObjective = await get("SELECT * FROM quest_objectives WHERE id = $1", [objectiveId]);

    res.status(201).json(newObjective);
  } catch (error) {
    console.error("Error creating quest objective:", error);
    res.status(500).json({ error: "Failed to create quest objective" });
  }
});

// PUT /api/campaigns/:campaignId/quests/:id/objectives/:objectiveId
router.put("/:campaignId/quests/:id/objectives/:objectiveId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId, objectiveId } = req.params;
    const { objective_type, title, description, status, linked_entity_type, linked_entity_id, notes, order_index } = req.body;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Objective title is required" });
    }

    await query(
      `UPDATE quest_objectives 
       SET objective_type = $1, title = $2, description = $3, status = $4,
           linked_entity_type = $5, linked_entity_id = $6, notes = $7, order_index = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND quest_id = $10`,
      [
        objective_type || "primary",
        title.trim(),
        description || null,
        status || "incomplete",
        linked_entity_type || null,
        linked_entity_id || null,
        notes || null,
        order_index || 0,
        objectiveId,
        questId
      ]
    );

    const updatedObjective = await get("SELECT * FROM quest_objectives WHERE id = $1", [objectiveId]);

    res.json(updatedObjective);
  } catch (error) {
    console.error("Error updating quest objective:", error);
    res.status(500).json({ error: "Failed to update quest objective" });
  }
});

// DELETE /api/campaigns/:campaignId/quests/:id/objectives/:objectiveId
router.delete("/:campaignId/quests/:id/objectives/:objectiveId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId, objectiveId } = req.params;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const result = await query(
      "DELETE FROM quest_objectives WHERE id = $1 AND quest_id = $2",
      [objectiveId, questId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Quest objective not found" });
    }

    res.json({ message: "Quest objective deleted successfully" });
  } catch (error) {
    console.error("Error deleting quest objective:", error);
    res.status(500).json({ error: "Failed to delete quest objective" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/milestones
router.post("/:campaignId/quests/:id/milestones", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { title, description, session_number } = req.body;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Milestone title is required" });
    }

    const result = await query(
      `INSERT INTO quest_milestones (quest_id, title, description, session_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        questId,
        title.trim(),
        description || null,
        session_number || null
      ]
    );

    const milestoneId = result.rows[0].id;
    const newMilestone = await get("SELECT * FROM quest_milestones WHERE id = $1", [milestoneId]);

    res.status(201).json(newMilestone);
  } catch (error) {
    console.error("Error creating quest milestone:", error);
    res.status(500).json({ error: "Failed to create quest milestone" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/sessions
router.post("/:campaignId/quests/:id/sessions", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { session_id, notes } = req.body;

    // Verify quest belongs to campaign
    const quest = await get(
      "SELECT id FROM quests WHERE id = $1 AND campaign_id = $2",
      [questId, campaignId]
    );

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [session_id, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Insert or update quest-session relationship (PostgreSQL uses ON CONFLICT)
    await query(
      `INSERT INTO quest_sessions (quest_id, session_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (quest_id, session_id)
       DO UPDATE SET notes = $3`,
      [questId, session_id, notes || null]
    );

    const questSession = await get(`
      SELECT qs.*, s.session_number, s.title as session_title, s.date_played
      FROM quest_sessions qs
      JOIN sessions s ON qs.session_id = s.id
      WHERE qs.quest_id = $1 AND qs.session_id = $2
    `, [questId, session_id]);

    res.status(201).json(questSession);
  } catch (error) {
    console.error("Error linking quest to session:", error);
    res.status(500).json({ error: "Failed to link quest to session" });
  }
});

export default router;
