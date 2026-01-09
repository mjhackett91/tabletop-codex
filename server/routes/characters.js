// server/routes/characters.js - Characters API (Player Characters, NPCs, Antagonists)
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All character routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/characters
router.get("/:campaignId/characters", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type, search } = req.query;
    const userRole = req.userCampaignRole;

    const userId = req.user.id;
    let queryText = `
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM characters c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players see player-visible OR their own assigned characters
    // DMs see all except hidden
    if (userRole === "player") {
      queryText += ` AND (c.visibility = 'player-visible' OR (c.type = 'player' AND c.player_user_id = $${paramIndex}))`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === "dm") {
      queryText += " AND c.visibility != 'hidden'";
    } else {
      // Fallback: no access
      return res.status(403).json({ error: "Access denied" });
    }

    if (type) {
      queryText += ` AND c.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (c.name LIKE $${paramIndex} OR c.description LIKE $${paramIndex + 1})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    queryText += " ORDER BY c.type, c.name";

    const characters = await all(queryText, params);

    // Get tags for each character
    const charactersWithTags = await Promise.all(characters.map(async (char) => {
      try {
        const charId = typeof char.id === 'number' ? char.id : parseInt(char.id, 10);
        
        // Get tags for this character
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'character' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [charId, parseInt(campaignId, 10)]);

        return {
          ...char,
          character_sheet: char.character_sheet ? JSON.parse(char.character_sheet) : null,
          tags
        };
      } catch (err) {
        console.error("Error processing character tags:", char.id, err);
        return {
          ...char,
          character_sheet: char.character_sheet ? JSON.parse(char.character_sheet) : null,
          tags: []
        };
      }
    }));

    res.json(charactersWithTags);
  } catch (error) {
    console.error("Error fetching characters:", error);
    res.status(500).json({ error: "Failed to fetch characters" });
  }
});

// GET /api/campaigns/:campaignId/characters/:id
router.get("/:campaignId/characters/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    const userId = req.user.id;
    let queryText = `
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM characters c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = $1 AND c.campaign_id = $2
    `;
    const params = [id, campaignId];
    let paramIndex = 3;

    // Filter by visibility: players see player-visible OR their own assigned characters
    // DMs see all except hidden
    if (userRole === "player") {
      queryText += ` AND (c.visibility = 'player-visible' OR (c.type = 'player' AND c.player_user_id = $${paramIndex}))`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === "dm") {
      queryText += " AND c.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const character = await get(queryText, params);

    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Get tags for this character
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'character' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [character.id, campaignId]);

    res.json({
      ...character,
      character_sheet: character.character_sheet ? JSON.parse(character.character_sheet) : null,
      tags
    });
  } catch (error) {
    console.error("Error fetching character:", error);
    res.status(500).json({ error: "Failed to fetch character" });
  }
});

// POST /api/campaigns/:campaignId/characters
// DMs can create any character, players can create their own player characters
router.post("/:campaignId/characters", requireCampaignAccess, async (req, res) => {
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

    const result = await query(`
      INSERT INTO characters (campaign_id, type, name, description, character_sheet, alignment, visibility, player_user_id, created_by_user_id, last_updated_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
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
    ]);

    const characterId = result.rows[0].id;

    const newCharacter = await get(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM characters c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = $1
    `, [characterId]);

    // Get tags for this character
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'character' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [characterId, campaignId]);

    res.status(201).json({
      ...newCharacter,
      character_sheet: newCharacter.character_sheet ? JSON.parse(newCharacter.character_sheet) : null,
      tags
    });
  } catch (error) {
    console.error("Error creating character:", error);
    res.status(500).json({ error: "Failed to create character" });
  }
});

// PUT /api/campaigns/:campaignId/characters/:id
// DMs can edit any character, players can only edit their own assigned player characters
router.put("/:campaignId/characters/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { type, name, description, character_sheet, alignment, visibility, player_user_id } = req.body;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Check if character exists and get current data
    const existing = await get("SELECT * FROM characters WHERE id = $1 AND campaign_id = $2", [id, campaignId]);
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
        const result = await query(`
          UPDATE characters 
          SET description = $1, character_sheet = $2, visibility = $3, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $4
          WHERE id = $5 AND campaign_id = $6 AND type = 'player' AND player_user_id = $7
        `, [
          description?.trim() || null,
          sheetJson,
          finalVisibility,
          userId, // last_updated_by_user_id
          id,
          campaignId,
          userId
        ]);

        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Character not found or access denied" });
        }
      } else if (isOwnNPC) {
        // Players editing NPCs/antagonists they created can update everything except type and player_user_id
        if (!name || !name.trim()) {
          return res.status(400).json({ error: "Character name is required" });
        }
        const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;
        const result = await query(`
          UPDATE characters 
          SET name = $1, description = $2, character_sheet = $3, alignment = $4, visibility = $5, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $6
          WHERE id = $7 AND campaign_id = $8 AND (type = 'npc' OR type = 'antagonist') AND created_by_user_id = $9
        `, [
          name.trim(),
          description?.trim() || null,
          sheetJson,
          alignment || null,
          visibility || existing.visibility || "player-visible",
          userId, // last_updated_by_user_id
          id,
          campaignId,
          userId
        ]);

        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Character not found or access denied" });
        }
      }
    } else {
      // DM can edit everything
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Character name is required" });
      }

      const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;

      const result = await query(`
        UPDATE characters 
        SET type = $1, name = $2, description = $3, character_sheet = $4, alignment = $5, visibility = $6, player_user_id = $7, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $8
        WHERE id = $9 AND campaign_id = $10
      `, [
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
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Character not found" });
      }
    }

    const updated = await get(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM characters c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = $1
    `, [id]);

    // Get tags for this character
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'character' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [id, campaignId]);

    res.json({
      ...updated,
      character_sheet: updated.character_sheet ? JSON.parse(updated.character_sheet) : null,
      tags
    });
  } catch (error) {
    console.error("Error updating character:", error);
    res.status(500).json({ error: "Failed to update character" });
  }
});

// DELETE /api/campaigns/:campaignId/characters/:id
// DMs can delete any character, players can delete NPCs/antagonists they created
router.delete("/:campaignId/characters/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userId = req.user.id;
    const userRole = req.userCampaignRole;

    // Check if character exists
    const character = await get("SELECT * FROM characters WHERE id = $1 AND campaign_id = $2", [id, campaignId]);
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

    const result = await query("DELETE FROM characters WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Character not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting character:", error);
    res.status(500).json({ error: "Failed to delete character" });
  }
});

export default router;
