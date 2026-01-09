// server/routes/quests.js - Enhanced Quests API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router({ mergeParams: true });

// All quest routes require authentication
router.use(authenticateToken);

// Helper function to get full quest with all relationships
function getQuestWithRelations(questId, campaignId) {
  const quest = db
    .prepare("SELECT * FROM quests WHERE id = ? AND campaign_id = ?")
    .get(questId, campaignId);

  if (!quest) return null;

  // Get quest links
  const links = db
    .prepare("SELECT * FROM quest_links WHERE quest_id = ?")
    .all(questId);

  // Get quest objectives
  const objectives = db
    .prepare("SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY order_index, id")
    .all(questId);

  // Get quest milestones
  const milestones = db
    .prepare("SELECT * FROM quest_milestones WHERE quest_id = ? ORDER BY session_number, created_at")
    .all(questId);

  // Get quest sessions
  const questSessions = db
    .prepare(`
      SELECT qs.*, s.session_number, s.title as session_title, s.date_played
      FROM quest_sessions qs
      JOIN sessions s ON qs.session_id = s.id
      WHERE qs.quest_id = ?
      ORDER BY s.session_number
    `)
    .all(questId);

  return {
    ...quest,
    links,
    objectives,
    milestones,
    sessions: questSessions
  };
}

// GET /api/campaigns/:campaignId/quests
router.get("/:campaignId/quests", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search, status, quest_type, urgency } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    let query = "SELECT * FROM quests WHERE campaign_id = ?";
    const params = [campaignId];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (quest_type) {
      query += " AND quest_type = ?";
      params.push(quest_type);
    }

    if (urgency) {
      query += " AND urgency_level = ?";
      params.push(urgency);
    }

    if (search) {
      query += " AND (title LIKE ? OR short_summary LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY created_at DESC";

    const quests = db.prepare(query).all(...params);

    res.json(quests);
  } catch (error) {
    console.error("Error fetching quests:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch quests", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/quests/:id
router.get("/:campaignId/quests/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const quest = getQuestWithRelations(id, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    res.json(quest);
  } catch (error) {
    console.error("Error fetching quest:", error);
    res.status(500).json({ error: "Failed to fetch quest" });
  }
});

// POST /api/campaigns/:campaignId/quests
router.post("/:campaignId/quests", requireCampaignOwnership, (req, res) => {
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
      introduced_in_session,
      links,
      objectives,
      milestones
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Quest title is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO quests (
          campaign_id, title, quest_type, status, short_summary, description,
          quest_giver, initial_hook, rewards, consequences, urgency_level,
          estimated_sessions, difficulty, visibility_controls, introduced_in_session
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
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
        introduced_in_session || null
      );

    const questId = result.lastInsertRowid;

    // Add links if provided
    if (links && Array.isArray(links)) {
      for (const link of links) {
        db.prepare(
          `INSERT INTO quest_links (quest_id, entity_type, entity_id, role, visibility)
           VALUES (?, ?, ?, ?, ?)`
        ).run(
          questId,
          link.entity_type,
          link.entity_id,
          link.role || null,
          link.visibility || "dm-only"
        );
      }
    }

    // Add objectives if provided
    if (objectives && Array.isArray(objectives)) {
      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.title && obj.title.trim()) { // Only insert if title is provided
          db.prepare(
            `INSERT INTO quest_objectives (
              quest_id, objective_type, title, description, status,
              linked_entity_type, linked_entity_id, notes, order_index
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            questId,
            obj.objective_type || "primary",
            obj.title.trim(),
            obj.description || null,
            obj.status || "incomplete",
            obj.linked_entity_type || null,
            obj.linked_entity_id || null,
            obj.notes || null,
            i
          );
        }
      }
    }

    // Add milestones if provided
    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (milestone.title && milestone.title.trim()) { // Only insert if title is provided
          db.prepare(
            `INSERT INTO quest_milestones (quest_id, title, description, session_number)
             VALUES (?, ?, ?, ?)`
          ).run(
            questId,
            milestone.title.trim(),
            milestone.description || null,
            milestone.session_number || null
          );
        }
      }
    }

    const newQuest = getQuestWithRelations(questId, campaignId);
    res.status(201).json(newQuest);
  } catch (error) {
    console.error("Error creating quest:", error);
    res.status(500).json({ error: "Failed to create quest", details: error.message });
  }
});

// PUT /api/campaigns/:campaignId/quests/:id
router.put("/:campaignId/quests/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;
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
    const existing = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!existing) {
      return res.status(404).json({ error: "Quest not found" });
    }

    db.prepare(
      `UPDATE quests 
       SET title = ?, quest_type = ?, status = ?, short_summary = ?, description = ?,
           quest_giver = ?, initial_hook = ?, rewards = ?, consequences = ?,
           urgency_level = ?, estimated_sessions = ?, difficulty = ?,
           visibility_controls = ?, introduced_in_session = ?, completed_in_session = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND campaign_id = ?`
    ).run(
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
      introduced_in_session || null,
      completed_in_session || null,
      id,
      campaignId
    );

    // Update links: delete all existing and re-insert
    db.prepare("DELETE FROM quest_links WHERE quest_id = ?").run(id);
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (link.entity_id) { // Only insert if entity is selected
          db.prepare(
            `INSERT INTO quest_links (quest_id, entity_type, entity_id, role, visibility)
             VALUES (?, ?, ?, ?, ?)`
          ).run(
            id,
            link.entity_type,
            link.entity_id,
            link.role || null,
            link.visibility || "dm-only"
          );
        }
      }
    }

    // Update objectives: delete all existing and re-insert
    db.prepare("DELETE FROM quest_objectives WHERE quest_id = ?").run(id);
    if (objectives && Array.isArray(objectives)) {
      for (let i = 0; i < objectives.length; i++) {
        const obj = objectives[i];
        if (obj.title && obj.title.trim()) { // Only insert if title is provided
          db.prepare(
            `INSERT INTO quest_objectives (
              quest_id, objective_type, title, description, status,
              linked_entity_type, linked_entity_id, notes, order_index
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            id,
            obj.objective_type || "primary",
            obj.title.trim(),
            obj.description || null,
            obj.status || "incomplete",
            obj.linked_entity_type || null,
            obj.linked_entity_id || null,
            obj.notes || null,
            i
          );
        }
      }
    }

    // Update milestones: delete all existing and re-insert
    db.prepare("DELETE FROM quest_milestones WHERE quest_id = ?").run(id);
    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (milestone.title && milestone.title.trim()) { // Only insert if title is provided
          db.prepare(
            `INSERT INTO quest_milestones (quest_id, title, description, session_number)
             VALUES (?, ?, ?, ?)`
          ).run(
            id,
            milestone.title.trim(),
            milestone.description || null,
            milestone.session_number || null
          );
        }
      }
    }

    const updatedQuest = getQuestWithRelations(id, campaignId);
    res.json(updatedQuest);
  } catch (error) {
    console.error("Error updating quest:", error);
    res.status(500).json({ error: "Failed to update quest", details: error.message });
  }
});

// DELETE /api/campaigns/:campaignId/quests/:id
router.delete("/:campaignId/quests/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if quest exists and belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    // Delete related data (CASCADE should handle this, but being explicit)
    db.prepare("DELETE FROM quest_links WHERE quest_id = ?").run(id);
    db.prepare("DELETE FROM quest_objectives WHERE quest_id = ?").run(id);
    db.prepare("DELETE FROM quest_milestones WHERE quest_id = ?").run(id);
    db.prepare("DELETE FROM quest_sessions WHERE quest_id = ?").run(id);
    db.prepare("DELETE FROM quests WHERE id = ? AND campaign_id = ?").run(id, campaignId);

    res.json({ message: "Quest deleted successfully" });
  } catch (error) {
    console.error("Error deleting quest:", error);
    res.status(500).json({ error: "Failed to delete quest" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/links
router.post("/:campaignId/quests/:id/links", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { entity_type, entity_id, role, visibility } = req.body;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const result = db
      .prepare(
        `INSERT INTO quest_links (quest_id, entity_type, entity_id, role, visibility)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        questId,
        entity_type,
        entity_id,
        role || null,
        visibility || "dm-only"
      );

    const newLink = db
      .prepare("SELECT * FROM quest_links WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newLink);
  } catch (error) {
    console.error("Error creating quest link:", error);
    res.status(500).json({ error: "Failed to create quest link" });
  }
});

// DELETE /api/campaigns/:campaignId/quests/:id/links/:linkId
router.delete("/:campaignId/quests/:id/links/:linkId", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId, linkId } = req.params;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    db.prepare("DELETE FROM quest_links WHERE id = ? AND quest_id = ?").run(linkId, questId);

    res.json({ message: "Quest link deleted successfully" });
  } catch (error) {
    console.error("Error deleting quest link:", error);
    res.status(500).json({ error: "Failed to delete quest link" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/objectives
router.post("/:campaignId/quests/:id/objectives", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { objective_type, title, description, status, linked_entity_type, linked_entity_id, notes, order_index } = req.body;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Objective title is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO quest_objectives (
          quest_id, objective_type, title, description, status,
          linked_entity_type, linked_entity_id, notes, order_index
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        questId,
        objective_type || "primary",
        title.trim(),
        description || null,
        status || "incomplete",
        linked_entity_type || null,
        linked_entity_id || null,
        notes || null,
        order_index || 0
      );

    const newObjective = db
      .prepare("SELECT * FROM quest_objectives WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newObjective);
  } catch (error) {
    console.error("Error creating quest objective:", error);
    res.status(500).json({ error: "Failed to create quest objective" });
  }
});

// PUT /api/campaigns/:campaignId/quests/:id/objectives/:objectiveId
router.put("/:campaignId/quests/:id/objectives/:objectiveId", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId, objectiveId } = req.params;
    const { objective_type, title, description, status, linked_entity_type, linked_entity_id, notes, order_index } = req.body;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Objective title is required" });
    }

    db.prepare(
      `UPDATE quest_objectives 
       SET objective_type = ?, title = ?, description = ?, status = ?,
           linked_entity_type = ?, linked_entity_id = ?, notes = ?, order_index = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND quest_id = ?`
    ).run(
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
    );

    const updatedObjective = db
      .prepare("SELECT * FROM quest_objectives WHERE id = ?")
      .get(objectiveId);

    res.json(updatedObjective);
  } catch (error) {
    console.error("Error updating quest objective:", error);
    res.status(500).json({ error: "Failed to update quest objective" });
  }
});

// DELETE /api/campaigns/:campaignId/quests/:id/objectives/:objectiveId
router.delete("/:campaignId/quests/:id/objectives/:objectiveId", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId, objectiveId } = req.params;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    db.prepare("DELETE FROM quest_objectives WHERE id = ? AND quest_id = ?").run(objectiveId, questId);

    res.json({ message: "Quest objective deleted successfully" });
  } catch (error) {
    console.error("Error deleting quest objective:", error);
    res.status(500).json({ error: "Failed to delete quest objective" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/milestones
router.post("/:campaignId/quests/:id/milestones", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { title, description, session_number } = req.body;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Milestone title is required" });
    }

    const result = db
      .prepare(
        `INSERT INTO quest_milestones (quest_id, title, description, session_number)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        questId,
        title.trim(),
        description || null,
        session_number || null
      );

    const newMilestone = db
      .prepare("SELECT * FROM quest_milestones WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newMilestone);
  } catch (error) {
    console.error("Error creating quest milestone:", error);
    res.status(500).json({ error: "Failed to create quest milestone" });
  }
});

// POST /api/campaigns/:campaignId/quests/:id/sessions
router.post("/:campaignId/quests/:id/sessions", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: questId } = req.params;
    const { session_id, notes } = req.body;

    // Verify quest belongs to campaign
    const quest = db
      .prepare("SELECT id FROM quests WHERE id = ? AND campaign_id = ?")
      .get(questId, campaignId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    // Verify session belongs to campaign
    const session = db
      .prepare("SELECT id FROM sessions WHERE id = ? AND campaign_id = ?")
      .get(session_id, campaignId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Insert or update quest-session relationship
    db.prepare(
      `INSERT OR REPLACE INTO quest_sessions (quest_id, session_id, notes)
       VALUES (?, ?, ?)`
    ).run(questId, session_id, notes || null);

    const questSession = db
      .prepare(`
        SELECT qs.*, s.session_number, s.title as session_title, s.date_played
        FROM quest_sessions qs
        JOIN sessions s ON qs.session_id = s.id
        WHERE qs.quest_id = ? AND qs.session_id = ?
      `)
      .get(questId, session_id);

    res.status(201).json(questSession);
  } catch (error) {
    console.error("Error linking quest to session:", error);
    res.status(500).json({ error: "Failed to link quest to session" });
  }
});

export default router;
