// server/routes/sessions.js - Sessions API
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All session routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/sessions
router.get("/:campaignId/sessions", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search } = req.query;
    const userRole = req.userCampaignRole;

    console.log(`[Sessions GET] Campaign: ${campaignId}, UserRole: ${userRole}, UserId: ${req.user?.id}`);

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    if (!userRole) {
      console.error(`[Sessions GET] userRole is undefined for user ${req.user?.id} in campaign ${campaignId}`);
      return res.status(403).json({ error: "Access denied - no role assigned" });
    }

    let queryText = `
      SELECT s.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM sessions s
      LEFT JOIN users creator ON s.created_by_user_id = creator.id
      LEFT JOIN users updater ON s.last_updated_by_user_id = updater.id
      WHERE s.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      queryText += " AND s.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND s.visibility != 'hidden'";
    } else {
      console.error(`[Sessions GET] Invalid userRole: ${userRole}`);
      return res.status(403).json({ error: "Access denied" });
    }

    if (search) {
      queryText += ` AND (s.title ILIKE $${paramIndex} OR s.summary ILIKE $${paramIndex + 1})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    queryText += " ORDER BY s.date_played DESC, s.session_number DESC, s.created_at DESC";

    console.log(`[Sessions GET] Executing query: ${queryText} with params:`, params);
    const sessions = await all(queryText, params);
    console.log(`[Sessions GET] Found ${sessions.length} sessions`);

    // Get tags for each session
    const sessionsWithTags = await Promise.all(sessions.map(async (session) => {
      try {
        // Get tags for this session
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'session' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [session.id, campaignId]);

        return {
          ...session,
          tags
        };
      } catch (err) {
        console.error("Error processing session:", session.id, err);
        return {
          ...session,
          tags: []
        };
      }
    }));

    res.json(sessionsWithTags);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch sessions", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/sessions/:id
router.get("/:campaignId/sessions/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let queryText = `
      SELECT s.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM sessions s
      LEFT JOIN users creator ON s.created_by_user_id = creator.id
      LEFT JOIN users updater ON s.last_updated_by_user_id = updater.id
      WHERE s.id = $1 AND s.campaign_id = $2
    `;
    const params = [id, campaignId];

    // Filter by visibility
    if (userRole === "player") {
      queryText += " AND s.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND s.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const session = await get(queryText, params);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get session notes for this session
    const sessionNotes = await all("SELECT * FROM session_notes WHERE session_id = $1", [id]);

    // Get player session notes (filtered by visibility)
    let playerNotesQueryText = `
      SELECT psn.*, u.username, u.email 
      FROM player_session_notes psn 
      JOIN users u ON psn.user_id = u.id 
      WHERE psn.session_id = $1
    `;
    const playerNotesParams = [id];
    
    if (userRole === "player") {
      playerNotesQueryText += " AND psn.visibility = 'player-visible'";
    }
    
    playerNotesQueryText += " ORDER BY psn.created_at ASC";
    
    const playerNotes = await all(playerNotesQueryText, playerNotesParams);

    // Get tags for this session
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'session' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [session.id, campaignId]);

    res.json({ 
      ...session, 
      session_notes: sessionNotes,
      player_notes: playerNotes,
      tags
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// POST /api/campaigns/:campaignId/sessions
// Allow both DMs and players to create sessions
router.post("/:campaignId/sessions", requireCampaignAccess, async (req, res) => {
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
      notes_quests,
      visibility
    } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Auto-increment session number if not provided
    let finalSessionNumber = session_number;
    if (!finalSessionNumber) {
      const lastSession = await get(
        "SELECT session_number FROM sessions WHERE campaign_id = $1 ORDER BY session_number DESC LIMIT 1",
        [campaignId]
      );
      finalSessionNumber = lastSession ? (lastSession.session_number || 0) + 1 : 1;
    }

    // Default visibility: player-visible for players, dm-only for DMs
    const defaultVisibility = userRole === "player" ? "player-visible" : "dm-only";

    const result = await query(
      `INSERT INTO sessions (
        campaign_id, session_number, title, date_played, summary,
        notes_characters, notes_npcs, notes_antagonists, notes_locations,
        notes_factions, notes_world_info, notes_quests, visibility,
        created_by_user_id, last_updated_by_user_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
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
        notes_quests || null,
        visibility || defaultVisibility,
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      ]
    );

    const sessionId = result.rows[0].id;
    const newSession = await get("SELECT * FROM sessions WHERE id = $1", [sessionId]);

    // Get tags for this session
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'session' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [sessionId, campaignId]);

    res.status(201).json({
      ...newSession,
      tags
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// PUT /api/campaigns/:campaignId/sessions/:id
// Allow both DMs and players to edit sessions (players can only edit their own)
router.put("/:campaignId/sessions/:id", requireCampaignAccess, async (req, res) => {
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
      notes_quests,
      visibility
    } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Check if session exists and belongs to campaign
    const existing = await get(
      "SELECT id, created_by_user_id, visibility FROM sessions WHERE id = $1 AND campaign_id = $2",
      [id, campaignId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Players can only edit sessions they created
    if (userRole === "player" && existing.created_by_user_id !== userId) {
      return res.status(403).json({ error: "You can only edit sessions you created" });
    }

    await query(
      `UPDATE sessions 
       SET session_number = $1, title = $2, date_played = $3, summary = $4,
           notes_characters = $5, notes_npcs = $6, notes_antagonists = $7,
           notes_locations = $8, notes_factions = $9, notes_world_info = $10,
           notes_quests = $11, visibility = $12, updated_at = CURRENT_TIMESTAMP,
           last_updated_by_user_id = $13
       WHERE id = $14 AND campaign_id = $15`,
      [
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
        visibility !== undefined ? visibility : existing.visibility || "dm-only",
        userId, // last_updated_by_user_id
        id,
        campaignId
      ]
    );

    const updatedSession = await get("SELECT * FROM sessions WHERE id = $1", [id]);

    // Get tags for this session
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'session' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [id, campaignId]);

    res.json({
      ...updatedSession,
      tags
    });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

// DELETE /api/campaigns/:campaignId/sessions/:id
// DMs can delete any session, players can only delete their own
router.delete("/:campaignId/sessions/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Check if session exists and belongs to campaign
    const session = await get(
      "SELECT id, created_by_user_id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [id, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Players can only delete sessions they created
    if (userRole === "player" && session.created_by_user_id !== userId) {
      return res.status(403).json({ error: "You can only delete sessions you created" });
    }

    // Delete session notes first (CASCADE should handle this, but being explicit)
    await query("DELETE FROM session_notes WHERE session_id = $1", [id]);
    await query("DELETE FROM player_session_notes WHERE session_id = $1", [id]);
    
    // Delete session
    const result = await query("DELETE FROM sessions WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// POST /api/campaigns/:campaignId/sessions/:id/notes
router.post("/:campaignId/sessions/:id/notes", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id: sessionId } = req.params;
    const { entity_type, entity_id, quick_note, detailed_note } = req.body;

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [sessionId, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: "Entity type and ID are required" });
    }

    const result = await query(
      `INSERT INTO session_notes (session_id, entity_type, entity_id, quick_note, detailed_note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        sessionId,
        entity_type,
        entity_id,
        quick_note || null,
        detailed_note || null
      ]
    );

    const noteId = result.rows[0].id;
    const newNote = await get("SELECT * FROM session_notes WHERE id = $1", [noteId]);

    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error creating session note:", error);
    res.status(500).json({ error: "Failed to create session note" });
  }
});

// POST /api/campaigns/:campaignId/sessions/:id/post-notes
// Post session notes to their respective entities (DMs and session creators can post notes)
router.post("/:campaignId/sessions/:id/post-notes", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id: sessionId } = req.params;
    const { entity_type, entity_id, note_content } = req.body;

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id, created_by_user_id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [sessionId, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Players can only post notes to sessions they created, DMs can post to any session
    const userId = req.user.id;
    const userRole = req.userCampaignRole;
    if (userRole === "player" && session.created_by_user_id !== userId) {
      return res.status(403).json({ error: "You can only post notes to sessions you created" });
    }

    if (!entity_type || !entity_id || !note_content) {
      return res.status(400).json({ error: "Entity type, ID, and note content are required" });
    }

    // Get session number for the reference
    const sessionData = await get("SELECT session_number FROM sessions WHERE id = $1", [sessionId]);
    
    const sessionRef = sessionData ? `[From Session ${sessionData.session_number}]` : '[From Session]';
    const separator = '\n\n';
    const appendedNote = `${separator}${note_content}${separator}${sessionRef}`;

    // Update the appropriate entity based on type
    let updateQueryText = "";
    let params = [];

    switch (entity_type) {
      case "character":
        updateQueryText = "UPDATE characters SET description = COALESCE(description, '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND campaign_id = $3";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "location":
        updateQueryText = "UPDATE locations SET description = COALESCE(description, '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND campaign_id = $3";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "faction":
        updateQueryText = "UPDATE factions SET description = COALESCE(description, '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND campaign_id = $3";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "world_info":
        updateQueryText = "UPDATE world_info SET content = COALESCE(content, '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND campaign_id = $3";
        params = [appendedNote, entity_id, campaignId];
        break;
      case "quest":
        updateQueryText = "UPDATE quests SET description = COALESCE(description, '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND campaign_id = $3";
        params = [appendedNote, entity_id, campaignId];
        break;
      default:
        return res.status(400).json({ error: "Invalid entity type" });
    }

    console.log("Posting note to entity:", { entity_type, entity_id, sessionId, campaignId, updateQueryText, params });
    const result = await query(updateQueryText, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Entity not found" });
    }

    res.json({ message: "Note posted to entity successfully" });
  } catch (error) {
    console.error("Error posting note to entity:", error);
    res.status(500).json({ error: "Failed to post note to entity" });
  }
});

// GET /api/campaigns/:campaignId/sessions/:id/player-notes
// Get player session notes for a session (filtered by visibility)
router.get("/:campaignId/sessions/:id/player-notes", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id: sessionId } = req.params;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [sessionId, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    let queryText = "SELECT psn.*, u.username, u.email FROM player_session_notes psn JOIN users u ON psn.user_id = u.id WHERE psn.session_id = $1";
    const params = [sessionId];

    // Filter by visibility: players only see player-visible notes, DMs see all
    if (userRole === "player") {
      queryText += " AND psn.visibility = 'player-visible'";
    }

    queryText += " ORDER BY psn.created_at ASC";

    const notes = await all(queryText, params);

    res.json(notes);
  } catch (error) {
    console.error("Error fetching player session notes:", error);
    res.status(500).json({ error: "Failed to fetch player session notes" });
  }
});

// POST /api/campaigns/:campaignId/sessions/:id/player-notes
// Players can add session notes (always visible to DM, optionally to other players)
router.post("/:campaignId/sessions/:id/player-notes", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id: sessionId } = req.params;
    const { note_content, visibility } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [sessionId, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!note_content || !note_content.trim()) {
      return res.status(400).json({ error: "Note content is required" });
    }

    // Players can only set visibility to 'dm-only' or 'player-visible'
    // DMs can also add player notes (useful for consistency)
    const finalVisibility = visibility === "player-visible" ? "player-visible" : "dm-only";

    const result = await query(
      `INSERT INTO player_session_notes (session_id, user_id, note_content, visibility)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [sessionId, userId, note_content.trim(), finalVisibility]
    );

    const noteId = result.rows[0].id;
    const newNote = await get(`
      SELECT psn.*, u.username, u.email 
      FROM player_session_notes psn 
      JOIN users u ON psn.user_id = u.id 
      WHERE psn.id = $1
    `, [noteId]);

    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error creating player session note:", error);
    res.status(500).json({ error: "Failed to create player session note" });
  }
});

// PUT /api/campaigns/:campaignId/sessions/:id/player-notes/:noteId
// Players can update their own session notes
router.put("/:campaignId/sessions/:id/player-notes/:noteId", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id: sessionId, noteId } = req.params;
    const { note_content, visibility } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [sessionId, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get existing note
    const existing = await get(
      "SELECT * FROM player_session_notes WHERE id = $1 AND session_id = $2",
      [noteId, sessionId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Players can only edit their own notes, DMs can edit any note
    if (userRole === "player" && existing.user_id !== userId) {
      return res.status(403).json({ error: "You can only edit your own notes" });
    }

    if (!note_content || !note_content.trim()) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const finalVisibility = visibility === "player-visible" ? "player-visible" : "dm-only";

    await query(
      `UPDATE player_session_notes 
       SET note_content = $1, visibility = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND session_id = $4`,
      [note_content.trim(), finalVisibility, noteId, sessionId]
    );

    const updated = await get(`
      SELECT psn.*, u.username, u.email 
      FROM player_session_notes psn 
      JOIN users u ON psn.user_id = u.id 
      WHERE psn.id = $1
    `, [noteId]);

    res.json(updated);
  } catch (error) {
    console.error("Error updating player session note:", error);
    res.status(500).json({ error: "Failed to update player session note" });
  }
});

// DELETE /api/campaigns/:campaignId/sessions/:id/player-notes/:noteId
// Players can delete their own session notes, DMs can delete any
router.delete("/:campaignId/sessions/:id/player-notes/:noteId", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id: sessionId, noteId } = req.params;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Verify session belongs to campaign
    const session = await get(
      "SELECT id FROM sessions WHERE id = $1 AND campaign_id = $2",
      [sessionId, campaignId]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get existing note
    const existing = await get(
      "SELECT * FROM player_session_notes WHERE id = $1 AND session_id = $2",
      [noteId, sessionId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Players can only delete their own notes, DMs can delete any
    if (userRole === "player" && existing.user_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own notes" });
    }

    const result = await query(
      "DELETE FROM player_session_notes WHERE id = $1 AND session_id = $2",
      [noteId, sessionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting player session note:", error);
    res.status(500).json({ error: "Failed to delete player session note" });
  }
});

export default router;
