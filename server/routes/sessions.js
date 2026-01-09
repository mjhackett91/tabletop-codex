// server/routes/sessions.js - Sessions API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router({ mergeParams: true });

// All session routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/sessions
router.get("/:campaignId/sessions", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    let query = "SELECT * FROM sessions WHERE campaign_id = ?";
    const params = [campaignId];

    if (search) {
      query += " AND (title LIKE ? OR notes LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY date_played DESC, session_number DESC, created_at DESC";

    const sessions = db.prepare(query).all(...params);

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch sessions", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/sessions/:id
router.get("/:campaignId/sessions/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const session = db
      .prepare("SELECT * FROM sessions WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get session notes for this session
    const sessionNotes = db
      .prepare("SELECT * FROM session_notes WHERE session_id = ?")
      .all(id);

    res.json({ ...session, session_notes: sessionNotes });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// POST /api/campaigns/:campaignId/sessions
router.post("/:campaignId/sessions", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { 
      session_number, 
      title, 
      date_played, 
      summary,
      notes_characters,
      notes_npcs,
      notes_antagonists,
      notes_locations,
      notes_factions,
      notes_world_info,
      notes_quests
    } = req.body;

    // Auto-increment session number if not provided
    let finalSessionNumber = session_number;
    if (!finalSessionNumber) {
      const lastSession = db
        .prepare("SELECT session_number FROM sessions WHERE campaign_id = ? ORDER BY session_number DESC LIMIT 1")
        .get(campaignId);
      finalSessionNumber = lastSession ? (lastSession.session_number || 0) + 1 : 1;
    }

    const result = db
      .prepare(
        `INSERT INTO sessions (
          campaign_id, session_number, title, date_played, summary,
          notes_characters, notes_npcs, notes_antagonists, notes_locations,
          notes_factions, notes_world_info, notes_quests
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        campaignId,
        finalSessionNumber,
        title || null,
        date_played || null,
        summary || null,
        notes_characters || null,
        notes_npcs || null,
        notes_antagonists || null,
        notes_locations || null,
        notes_factions || null,
        notes_world_info || null,
        notes_quests || null
      );

    const newSession = db
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// PUT /api/campaigns/:campaignId/sessions/:id
router.put("/:campaignId/sessions/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { 
      session_number, 
      title, 
      date_played, 
      summary,
      notes_characters,
      notes_npcs,
      notes_antagonists,
      notes_locations,
      notes_factions,
      notes_world_info,
      notes_quests
    } = req.body;

    // Check if session exists and belongs to campaign
    const existing = db
      .prepare("SELECT id FROM sessions WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!existing) {
      return res.status(404).json({ error: "Session not found" });
    }

    db.prepare(
      `UPDATE sessions 
       SET session_number = ?, title = ?, date_played = ?, summary = ?,
           notes_characters = ?, notes_npcs = ?, notes_antagonists = ?,
           notes_locations = ?, notes_factions = ?, notes_world_info = ?,
           notes_quests = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND campaign_id = ?`
    ).run(
      session_number || null,
      title || null,
      date_played || null,
      summary || null,
      notes_characters || null,
      notes_npcs || null,
      notes_antagonists || null,
      notes_locations || null,
      notes_factions || null,
      notes_world_info || null,
      notes_quests || null,
      id,
      campaignId
    );

    const updatedSession = db
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(id);

    res.json(updatedSession);
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

// DELETE /api/campaigns/:campaignId/sessions/:id
router.delete("/:campaignId/sessions/:id", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if session exists and belongs to campaign
    const session = db
      .prepare("SELECT id FROM sessions WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Delete session notes first (CASCADE should handle this, but being explicit)
    db.prepare("DELETE FROM session_notes WHERE session_id = ?").run(id);
    
    // Delete session
    db.prepare("DELETE FROM sessions WHERE id = ? AND campaign_id = ?").run(id, campaignId);

    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// POST /api/campaigns/:campaignId/sessions/:id/notes
router.post("/:campaignId/sessions/:id/notes", requireCampaignOwnership, (req, res) => {
  try {
    const { campaignId, id: sessionId } = req.params;
    const { entity_type, entity_id, quick_note, detailed_note } = req.body;

    // Verify session belongs to campaign
    const session = db
      .prepare("SELECT id FROM sessions WHERE id = ? AND campaign_id = ?")
      .get(sessionId, campaignId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: "Entity type and ID are required" });
    }

    const result = db
      .prepare(
        `INSERT INTO session_notes (session_id, entity_type, entity_id, quick_note, detailed_note)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        sessionId,
        entity_type,
        entity_id,
        quick_note || null,
        detailed_note || null
      );

    const newNote = db
      .prepare("SELECT * FROM session_notes WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error creating session note:", error);
    res.status(500).json({ error: "Failed to create session note" });
  }
});

// POST /api/campaigns/:campaignId/sessions/:id/post-notes
// Post session notes to their respective entities
router.post("/:campaignId/sessions/:id/post-notes", requireCampaignOwnership, async (req, res) => {
  try {
    const { campaignId, id: sessionId } = req.params;
    const { entity_type, entity_id, note_content } = req.body;

    // Verify session belongs to campaign
    const session = db
      .prepare("SELECT id FROM sessions WHERE id = ? AND campaign_id = ?")
      .get(sessionId, campaignId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!entity_type || !entity_id || !note_content) {
      return res.status(400).json({ error: "Entity type, ID, and note content are required" });
    }

    // Get session number for the reference
    const sessionData = db
      .prepare("SELECT session_number FROM sessions WHERE id = ?")
      .get(sessionId);
    
    const sessionRef = sessionData ? `[From Session ${sessionData.session_number}]` : '[From Session]';
    const separator = '\n\n';
    const appendedNote = `${separator}${note_content}${separator}${sessionRef}`;

    // Update the appropriate entity based on type
    let updateQuery = "";
    let params = [];

    switch (entity_type) {
      case "character":
        updateQuery = "UPDATE characters SET description = COALESCE(description, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "location":
        updateQuery = "UPDATE locations SET description = COALESCE(description, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "faction":
        updateQuery = "UPDATE factions SET description = COALESCE(description, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "world_info":
        updateQuery = "UPDATE world_info SET content = COALESCE(content, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "quest":
        updateQuery = "UPDATE quests SET description = COALESCE(description, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?";
        params = [appendedNote, entity_id, campaignId];
        break;
      default:
        return res.status(400).json({ error: "Invalid entity type" });
    }

    console.log("Posting note to entity:", { entity_type, entity_id, sessionId, campaignId, updateQuery, params });
    const result = db.prepare(updateQuery).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Entity not found" });
    }

    res.json({ message: "Note posted to entity successfully" });
  } catch (error) {
    console.error("Error posting note to entity:", error);
    res.status(500).json({ error: "Failed to post note to entity" });
  }
});

export default router;
