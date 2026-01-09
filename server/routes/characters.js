// server/routes/characters.js - Characters API (Player Characters, NPCs, Antagonists)
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All character routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/characters
router.get("/:campaignId/characters", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type, search } = req.query;
    const userRole = req.userCampaignRole;

    const userId = req.user.id;
    let query = `
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM characters c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.campaign_id = ?
    `;
    const params = [campaignId];

    // Filter by visibility: players see player-visible OR their own assigned characters
    // DMs see all except hidden
    if (userRole === "player") {
      query += " AND (c.visibility = 'player-visible' OR (c.type = 'player' AND c.player_user_id = ?))";
      params.push(userId);
    } else if (userRole === "dm") {
      query += " AND c.visibility != 'hidden'";
    } else {
      // Fallback: no access
      return res.status(403).json({ error: "Access denied" });
    }

    if (type) {
      query += " AND c.type = ?";
      params.push(type);
    }

    if (search) {
      query += " AND (c.name LIKE ? OR c.description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY c.type, c.name";

    const characters = db.prepare(query).all(...params);

    res.json(characters.map(char => ({
      ...char,
      character_sheet: char.character_sheet ? JSON.parse(char.character_sheet) : null
    })));
  } catch (error) {
    console.error("Error fetching characters:", error);
    res.status(500).json({ error: "Failed to fetch characters" });
  }
});

// GET /api/campaigns/:campaignId/characters/:id
router.get("/:campaignId/characters/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    const userId = req.user.id;
    let query = `
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM characters c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = ? AND c.campaign_id = ?
    `;
    const params = [id, campaignId];

    // Filter by visibility: players see player-visible OR their own assigned characters
    // DMs see all except hidden
    if (userRole === "player") {
      query += " AND (c.visibility = 'player-visible' OR (c.type = 'player' AND c.player_user_id = ?))";
      params.push(userId);
    } else if (userRole === "dm") {
      query += " AND c.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const character = db.prepare(query).get(...params);

    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    res.json({
      ...character,
      character_sheet: character.character_sheet ? JSON.parse(character.character_sheet) : null
    });
  } catch (error) {
    console.error("Error fetching character:", error);
    res.status(500).json({ error: "Failed to fetch character" });
  }
});

// POST /api/campaigns/:campaignId/characters
// DMs can create any character, players can create their own player characters
router.post("/:campaignId/characters", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type, name, description, character_sheet, alignment, visibility, player_user_id } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    if (!type || !["player", "npc", "antagonist"].includes(type)) {
      return res.status(400).json({ error: "Valid type required (player, npc, antagonist)" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Character name is required" });
    }

    // Players can create NPCs/antagonists with default visibility "player-visible"
    // Players can only create player characters assigned to themselves
    // DMs can assign player characters to any user or leave unassigned
    let finalPlayerUserId = null;
    let defaultVisibility = "dm-only";
    
    if (type === "player") {
      if (userRole === "player") {
        // Players creating their own character - assign to themselves
        finalPlayerUserId = userId;
        defaultVisibility = "player-visible"; // Player characters visible to all
      } else if (userRole === "dm") {
        // DMs can assign to any user or leave unassigned
        finalPlayerUserId = player_user_id || null;
      }
    } else if (type === "npc" || type === "antagonist") {
      // NPCs/Antagonists created by players default to "player-visible"
      // NPCs/Antagonists created by DMs default to "dm-only"
      defaultVisibility = userRole === "player" ? "player-visible" : "dm-only";
    }

    const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;

    const stmt = db.prepare(`
      INSERT INTO characters (campaign_id, type, name, description, character_sheet, alignment, visibility, player_user_id, created_by_user_id, last_updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      campaignId,
      type,
      name.trim(),
      description?.trim() || null,
      sheetJson,
      alignment || null,
      visibility || defaultVisibility,
      finalPlayerUserId,
      userId, // created_by_user_id
      userId  // last_updated_by_user_id
    );

    const newCharacter = db
      .prepare(`
        SELECT c.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM characters c
        LEFT JOIN users creator ON c.created_by_user_id = creator.id
        LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
        WHERE c.id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json({
      ...newCharacter,
      character_sheet: newCharacter.character_sheet ? JSON.parse(newCharacter.character_sheet) : null
    });
  } catch (error) {
    console.error("Error creating character:", error);
    res.status(500).json({ error: "Failed to create character" });
  }
});

// PUT /api/campaigns/:campaignId/characters/:id
// DMs can edit any character, players can only edit their own assigned player characters
router.put("/:campaignId/characters/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { type, name, description, character_sheet, alignment, visibility, player_user_id } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Check if character exists and get current data
    const existing = db.prepare("SELECT * FROM characters WHERE id = ? AND campaign_id = ?").get(id, campaignId);
    if (!existing) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Permission check: players can edit their own player characters OR NPCs/antagonists they created
    if (userRole === "player") {
      const isOwnPlayerCharacter = existing.type === "player" && existing.player_user_id === userId;
      const isOwnNPC = (existing.type === "npc" || existing.type === "antagonist") && existing.created_by_user_id === userId;
      
      if (!isOwnPlayerCharacter && !isOwnNPC) {
        return res.status(403).json({ error: "You can only edit your own characters or NPCs/antagonists you created" });
      }
      
      if (isOwnPlayerCharacter) {
        // Players editing their own player character can update description, character_sheet, and visibility
        const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;
        const finalVisibility = visibility || existing.visibility || "dm-only";
        const stmt = db.prepare(`
          UPDATE characters 
          SET description = ?, character_sheet = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = ?
          WHERE id = ? AND campaign_id = ? AND type = 'player' AND player_user_id = ?
        `);
        const result = stmt.run(
          description?.trim() || null,
          sheetJson,
          finalVisibility,
          userId, // last_updated_by_user_id
          id,
          campaignId,
          userId
        );

        if (result.changes === 0) {
          return res.status(404).json({ error: "Character not found or access denied" });
        }
      } else if (isOwnNPC) {
        // Players editing NPCs/antagonists they created can update everything except type and player_user_id
        if (!name || !name.trim()) {
          return res.status(400).json({ error: "Character name is required" });
        }
        const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;
        const stmt = db.prepare(`
          UPDATE characters 
          SET name = ?, description = ?, character_sheet = ?, alignment = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = ?
          WHERE id = ? AND campaign_id = ? AND (type = 'npc' OR type = 'antagonist') AND created_by_user_id = ?
        `);
        const result = stmt.run(
          name.trim(),
          description?.trim() || null,
          sheetJson,
          alignment || null,
          visibility || existing.visibility || "player-visible",
          userId, // last_updated_by_user_id
          id,
          campaignId,
          userId
        );

        if (result.changes === 0) {
          return res.status(404).json({ error: "Character not found or access denied" });
        }
      }
    } else {
      // DM can edit everything
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Character name is required" });
      }

      const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;

      const stmt = db.prepare(`
        UPDATE characters 
        SET type = ?, name = ?, description = ?, character_sheet = ?, alignment = ?, visibility = ?, player_user_id = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = ?
        WHERE id = ? AND campaign_id = ?
      `);
      const result = stmt.run(
        type || existing.type,
        name.trim(),
        description?.trim() || null,
        sheetJson,
        alignment || null,
        visibility || existing.visibility || "dm-only",
        player_user_id !== undefined ? player_user_id : existing.player_user_id,
        userId, // last_updated_by_user_id
        id,
        campaignId
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: "Character not found" });
      }
    }

    const updated = db
      .prepare(`
        SELECT c.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM characters c
        LEFT JOIN users creator ON c.created_by_user_id = creator.id
        LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
        WHERE c.id = ?
      `)
      .get(id);

    res.json({
      ...updated,
      character_sheet: updated.character_sheet ? JSON.parse(updated.character_sheet) : null
    });
  } catch (error) {
    console.error("Error updating character:", error);
    res.status(500).json({ error: "Failed to update character" });
  }
});

// DELETE /api/campaigns/:campaignId/characters/:id
// DMs can delete any character, players can delete NPCs/antagonists they created
router.delete("/:campaignId/characters/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Check if character exists
    const character = db.prepare("SELECT * FROM characters WHERE id = ? AND campaign_id = ?").get(id, campaignId);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Permission check: players can only delete NPCs/antagonists they created
    if (userRole === "player") {
      const isOwnNPC = (character.type === "npc" || character.type === "antagonist") && character.created_by_user_id === userId;
      if (!isOwnNPC) {
        return res.status(403).json({ error: "You can only delete NPCs/antagonists you created" });
      }
    }

    const stmt = db.prepare("DELETE FROM characters WHERE id = ? AND campaign_id = ?");
    const result = stmt.run(id, campaignId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Character not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting character:", error);
    res.status(500).json({ error: "Failed to delete character" });
  }
});

export default router;
