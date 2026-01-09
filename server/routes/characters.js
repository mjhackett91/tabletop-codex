// server/routes/characters.js - Characters API (Player Characters, NPCs, Antagonists)
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router({ mergeParams: true });

// All character routes require authentication
router.use(authenticateToken);

// Middleware helper to check campaign ownership
const checkOwnership = (req, res, next) => {
  const campaignId = req.params.campaignId;
  const userId = req.user?.id;
  
  if (!campaignId || !userId) {
    return res.status(400).json({ error: "Invalid request" });
  }
  
  const campaign = db.prepare("SELECT id FROM campaigns WHERE id = ? AND user_id = ?").get(campaignId, userId);
  if (!campaign) {
    return res.status(403).json({ error: "Campaign not found or access denied" });
  }
  
  next();
};

// GET /api/campaigns/:campaignId/characters
router.get("/:campaignId/characters", checkOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type, search } = req.query;

    let query = "SELECT * FROM characters WHERE campaign_id = ?";
    const params = [campaignId];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY type, name";

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
router.get("/:campaignId/characters/:id", checkOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const character = db
      .prepare("SELECT * FROM characters WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

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
router.post("/:campaignId/characters", checkOwnership, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type, name, description, character_sheet, alignment } = req.body;

    if (!type || !["player", "npc", "antagonist"].includes(type)) {
      return res.status(400).json({ error: "Valid type required (player, npc, antagonist)" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Character name is required" });
    }

    const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;

    const stmt = db.prepare(`
      INSERT INTO characters (campaign_id, type, name, description, character_sheet, alignment)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      campaignId,
      type,
      name.trim(),
      description?.trim() || null,
      sheetJson,
      alignment || null
    );

    const newCharacter = db
      .prepare("SELECT * FROM characters WHERE id = ?")
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
router.put("/:campaignId/characters/:id", checkOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { type, name, description, character_sheet, alignment } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Character name is required" });
    }

    const sheetJson = character_sheet ? JSON.stringify(character_sheet) : null;

    const stmt = db.prepare(`
      UPDATE characters 
      SET type = ?, name = ?, description = ?, character_sheet = ?, alignment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND campaign_id = ?
    `);
    const result = stmt.run(
      type || "npc",
      name.trim(),
      description?.trim() || null,
      sheetJson,
      alignment || null,
      id,
      campaignId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Character not found" });
    }

    const updated = db
      .prepare("SELECT * FROM characters WHERE id = ?")
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
router.delete("/:campaignId/characters/:id", checkOwnership, (req, res) => {
  try {
    const { campaignId, id } = req.params;

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
