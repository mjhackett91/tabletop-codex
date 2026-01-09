// server/routes/creatures.js - Creatures API (D&D 5e-style statblocks)
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";
import { filterVisibleEntities, sanitizeEntityForRole } from "../utils/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All creature routes require authentication
router.use(authenticateToken);

// Helper to parse JSON fields safely
const parseJSONField = (value, defaultValue = null) => {
  if (!value) return defaultValue;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return defaultValue;
  }
};

// Helper to stringify JSON fields
const stringifyJSONField = (value) => {
  if (!value) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
};

// GET /api/campaigns/:campaignId/creatures
router.get("/:campaignId/creatures", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search, creatureType, challengeRating, visibility } = req.query;
    const userRole = req.userCampaignRole;

    let query = `
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.campaign_id = ?
    `;
    const params = [campaignId];

    // Filter by visibility: players see player-visible, DMs see all except hidden
    if (userRole === "player") {
      query += " AND c.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND c.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (search) {
      query += " AND (c.name LIKE ? OR c.short_description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (creatureType) {
      query += " AND c.creature_type = ?";
      params.push(creatureType);
    }

    if (challengeRating) {
      query += " AND c.challenge_rating = ?";
      params.push(challengeRating);
    }

    if (visibility && userRole === "dm") {
      query += " AND c.visibility = ?";
      params.push(visibility);
    }

    query += " ORDER BY c.name ASC";

    const creatures = db.prepare(query).all(...params);

    // Parse JSON fields and filter/sanitize for role, and get tags
    const processedCreatures = creatures.map(creature => {
      try {
        // Get tags for this creature from entity_tags
        const tags = db.prepare(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'creature' AND et.entity_id = ? AND t.campaign_id = ?
          ORDER BY t.name ASC
        `).all(creature.id, campaignId);

        const processed = {
          ...creature,
          tags, // Use tags from entity_tags instead of JSON field
          armorClass: parseJSONField(creature.armor_class),
          hitPoints: parseJSONField(creature.hit_points),
          speeds: parseJSONField(creature.speeds, {}),
          senses: parseJSONField(creature.senses, {}),
          abilities: parseJSONField(creature.abilities, {}),
          savingThrows: parseJSONField(creature.saving_throws, []),
          skills: parseJSONField(creature.skills, []),
          traits: parseJSONField(creature.traits, []),
          actions: parseJSONField(creature.actions, []),
          legendaryActionsMeta: parseJSONField(creature.legendary_actions_meta),
          lairActions: parseJSONField(creature.lair_actions, []),
          spellcasting: parseJSONField(creature.spellcasting),
          linkedEntities: parseJSONField(creature.linked_entities, { npcs: [], factions: [], locations: [], quests: [], sessions: [] })
        };
        return sanitizeEntityForRole(processed, userRole);
      } catch (err) {
        console.error("Error processing creature:", creature.id, err);
        const processed = {
          ...creature,
          tags: [],
          armorClass: parseJSONField(creature.armor_class),
          hitPoints: parseJSONField(creature.hit_points),
          speeds: parseJSONField(creature.speeds, {}),
          senses: parseJSONField(creature.senses, {}),
          abilities: parseJSONField(creature.abilities, {}),
          savingThrows: parseJSONField(creature.saving_throws, []),
          skills: parseJSONField(creature.skills, []),
          traits: parseJSONField(creature.traits, []),
          actions: parseJSONField(creature.actions, []),
          legendaryActionsMeta: parseJSONField(creature.legendary_actions_meta),
          lairActions: parseJSONField(creature.lair_actions, []),
          spellcasting: parseJSONField(creature.spellcasting),
          linkedEntities: parseJSONField(creature.linked_entities, { npcs: [], factions: [], locations: [], quests: [], sessions: [] })
        };
        return sanitizeEntityForRole(processed, userRole);
      }
    });

    res.json(processedCreatures);
  } catch (error) {
    console.error("Error fetching creatures:", error);
    res.status(500).json({ error: "Failed to fetch creatures" });
  }
});

// GET /api/campaigns/:campaignId/creatures/:id
router.get("/:campaignId/creatures/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    const creature = db.prepare(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = ? AND c.campaign_id = ?
    `).get(id, campaignId);

    if (!creature) {
      return res.status(404).json({ error: "Creature not found" });
    }

    // Check visibility
    if (userRole === "player" && creature.visibility !== "player-visible") {
      return res.status(403).json({ error: "Access denied" });
    }
    if (userRole === "dm" && creature.visibility === "hidden") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get tags for this creature from entity_tags
    const creatureTags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'creature' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(creature.id, campaignId);

    // Parse JSON fields
    const processed = {
      ...creature,
      tags: creatureTags, // Use tags from entity_tags instead of JSON field
      armorClass: parseJSONField(creature.armor_class),
      hitPoints: parseJSONField(creature.hit_points),
      speeds: parseJSONField(creature.speeds, {}),
      senses: parseJSONField(creature.senses, {}),
      abilities: parseJSONField(creature.abilities, {}),
      savingThrows: parseJSONField(creature.saving_throws, []),
      skills: parseJSONField(creature.skills, []),
      traits: parseJSONField(creature.traits, []),
      actions: parseJSONField(creature.actions, []),
      legendaryActionsMeta: parseJSONField(creature.legendary_actions_meta),
      lairActions: parseJSONField(creature.lair_actions, []),
      spellcasting: parseJSONField(creature.spellcasting),
      linkedEntities: parseJSONField(creature.linked_entities, { npcs: [], factions: [], locations: [], quests: [], sessions: [] })
    };

    res.json(sanitizeEntityForRole(processed, userRole));
  } catch (error) {
    console.error("Error fetching creature:", error);
    res.status(500).json({ error: "Failed to fetch creature" });
  }
});

// POST /api/campaigns/:campaignId/creatures
router.post("/:campaignId/creatures", requireCampaignDM, (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;
    const {
      name,
      sourceType = "homebrew",
      visibility = "dm-only",
      tags = [],
      size,
      creatureType,
      subtype,
      alignment,
      challengeRating,
      proficiencyBonus,
      armorClass,
      hitPoints,
      hitDice,
      damageVulnerabilities,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      speeds = {},
      senses = {},
      languages,
      abilities = {},
      savingThrows = [],
      skills = [],
      traits = [],
      actions = [],
      legendaryActionsMeta,
      lairActions = [],
      spellcasting,
      shortDescription,
      appearanceRichText,
      loreRichText,
      tacticsRichText,
      dmNotesRichText,
      linkedEntities = { npcs: [], factions: [], locations: [], quests: [], sessions: [] }
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!size) {
      return res.status(400).json({ error: "Size is required" });
    }
    if (!creatureType) {
      return res.status(400).json({ error: "Creature type is required" });
    }
    if (!armorClass || armorClass.value === null || armorClass.value === undefined) {
      return res.status(400).json({ error: "Armor Class value is required" });
    }
    if (!hitPoints || hitPoints.average === null || hitPoints.average === undefined) {
      return res.status(400).json({ error: "Hit Points average is required" });
    }
    if (!abilities || !abilities.str || !abilities.dex || !abilities.con || !abilities.int || !abilities.wis || !abilities.cha) {
      return res.status(400).json({ error: "All ability scores (str, dex, con, int, wis, cha) are required" });
    }

    const result = db.prepare(`
      INSERT INTO creatures (
        campaign_id, name, source_type, visibility, tags,
        size, creature_type, subtype, alignment, challenge_rating, proficiency_bonus,
        armor_class, hit_points, hit_dice,
        damage_vulnerabilities, damage_resistances, damage_immunities, condition_immunities,
        speeds, senses, languages,
        abilities, saving_throws, skills,
        traits, actions, legendary_actions_meta, lair_actions,
        spellcasting,
        short_description, appearance_rich_text, lore_rich_text, tactics_rich_text, dm_notes_rich_text,
        linked_entities,
        created_by_user_id, last_updated_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaignId,
      name.trim(),
      sourceType,
      visibility,
      stringifyJSONField(tags),
      size,
      creatureType,
      subtype || null,
      alignment || null,
      challengeRating || null,
      proficiencyBonus || null,
      stringifyJSONField(armorClass),
      stringifyJSONField(hitPoints),
      hitDice || null,
      damageVulnerabilities || null,
      damageResistances || null,
      damageImmunities || null,
      conditionImmunities || null,
      stringifyJSONField(speeds),
      stringifyJSONField(senses),
      languages || null,
      stringifyJSONField(abilities),
      stringifyJSONField(savingThrows),
      stringifyJSONField(skills),
      stringifyJSONField(traits),
      stringifyJSONField(actions),
      stringifyJSONField(legendaryActionsMeta),
      stringifyJSONField(lairActions),
      stringifyJSONField(spellcasting),
      shortDescription || null,
      appearanceRichText || null,
      loreRichText || null,
      tacticsRichText || null,
      dmNotesRichText || null,
      stringifyJSONField(linkedEntities),
      userId,
      userId
    );

    const newCreature = db.prepare(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    // Get tags for this creature from entity_tags
    const creatureTags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'creature' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(newCreature.id, campaignId);

    // Parse JSON fields
    const processed = {
      ...newCreature,
      tags: creatureTags, // Use tags from entity_tags instead of JSON field
      armorClass: parseJSONField(newCreature.armor_class),
      hitPoints: parseJSONField(newCreature.hit_points),
      speeds: parseJSONField(newCreature.speeds, {}),
      senses: parseJSONField(newCreature.senses, {}),
      abilities: parseJSONField(newCreature.abilities, {}),
      savingThrows: parseJSONField(newCreature.saving_throws, []),
      skills: parseJSONField(newCreature.skills, []),
      traits: parseJSONField(newCreature.traits, []),
      actions: parseJSONField(newCreature.actions, []),
      legendaryActionsMeta: parseJSONField(newCreature.legendary_actions_meta),
      lairActions: parseJSONField(newCreature.lair_actions, []),
      spellcasting: parseJSONField(newCreature.spellcasting),
      linkedEntities: parseJSONField(newCreature.linked_entities, { npcs: [], factions: [], locations: [], quests: [], sessions: [] })
    };

    res.status(201).json(processed);
  } catch (error) {
    console.error("Error creating creature:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ error: "Failed to create creature", details: error.message });
  }
});

// PUT /api/campaigns/:campaignId/creatures/:id
router.put("/:campaignId/creatures/:id", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userId = req.user.id;
    const {
      name,
      sourceType,
      visibility,
      tags,
      size,
      creatureType,
      subtype,
      alignment,
      challengeRating,
      proficiencyBonus,
      armorClass,
      hitPoints,
      hitDice,
      damageVulnerabilities,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      speeds,
      senses,
      languages,
      abilities,
      savingThrows,
      skills,
      traits,
      actions,
      legendaryActionsMeta,
      lairActions,
      spellcasting,
      shortDescription,
      appearanceRichText,
      loreRichText,
      tacticsRichText,
      dmNotesRichText,
      linkedEntities
    } = req.body;

    // Check if creature exists
    const existing = db.prepare("SELECT id FROM creatures WHERE id = ? AND campaign_id = ?").get(id, campaignId);
    if (!existing) {
      return res.status(404).json({ error: "Creature not found" });
    }

    // Validation
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (armorClass !== undefined && (!armorClass || armorClass.value === null || armorClass.value === undefined)) {
      return res.status(400).json({ error: "Armor Class value is required" });
    }
    if (hitPoints !== undefined && (!hitPoints || hitPoints.average === null || hitPoints.average === undefined)) {
      return res.status(400).json({ error: "Hit Points average is required" });
    }
    if (abilities !== undefined && (!abilities || !abilities.str || !abilities.dex || !abilities.con || !abilities.int || !abilities.wis || !abilities.cha)) {
      return res.status(400).json({ error: "All ability scores (str, dex, con, int, wis, cha) are required" });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push("name = ?"); params.push(name.trim()); }
    if (sourceType !== undefined) { updates.push("source_type = ?"); params.push(sourceType); }
    if (visibility !== undefined) { updates.push("visibility = ?"); params.push(visibility); }
    if (tags !== undefined) { updates.push("tags = ?"); params.push(stringifyJSONField(tags)); }
    if (size !== undefined) { updates.push("size = ?"); params.push(size); }
    if (creatureType !== undefined) { updates.push("creature_type = ?"); params.push(creatureType); }
    if (subtype !== undefined) { updates.push("subtype = ?"); params.push(subtype || null); }
    if (alignment !== undefined) { updates.push("alignment = ?"); params.push(alignment || null); }
    if (challengeRating !== undefined) { updates.push("challenge_rating = ?"); params.push(challengeRating || null); }
    if (proficiencyBonus !== undefined) { updates.push("proficiency_bonus = ?"); params.push(proficiencyBonus || null); }
    if (armorClass !== undefined) { updates.push("armor_class = ?"); params.push(stringifyJSONField(armorClass)); }
    if (hitPoints !== undefined) { updates.push("hit_points = ?"); params.push(stringifyJSONField(hitPoints)); }
    if (hitDice !== undefined) { updates.push("hit_dice = ?"); params.push(hitDice || null); }
    if (damageVulnerabilities !== undefined) { updates.push("damage_vulnerabilities = ?"); params.push(damageVulnerabilities || null); }
    if (damageResistances !== undefined) { updates.push("damage_resistances = ?"); params.push(damageResistances || null); }
    if (damageImmunities !== undefined) { updates.push("damage_immunities = ?"); params.push(damageImmunities || null); }
    if (conditionImmunities !== undefined) { updates.push("condition_immunities = ?"); params.push(conditionImmunities || null); }
    if (speeds !== undefined) { updates.push("speeds = ?"); params.push(stringifyJSONField(speeds)); }
    if (senses !== undefined) { updates.push("senses = ?"); params.push(stringifyJSONField(senses)); }
    if (languages !== undefined) { updates.push("languages = ?"); params.push(languages || null); }
    if (abilities !== undefined) { updates.push("abilities = ?"); params.push(stringifyJSONField(abilities)); }
    if (savingThrows !== undefined) { updates.push("saving_throws = ?"); params.push(stringifyJSONField(savingThrows)); }
    if (skills !== undefined) { updates.push("skills = ?"); params.push(stringifyJSONField(skills)); }
    if (traits !== undefined) { updates.push("traits = ?"); params.push(stringifyJSONField(traits)); }
    if (actions !== undefined) { updates.push("actions = ?"); params.push(stringifyJSONField(actions)); }
    if (legendaryActionsMeta !== undefined) { updates.push("legendary_actions_meta = ?"); params.push(stringifyJSONField(legendaryActionsMeta)); }
    if (lairActions !== undefined) { updates.push("lair_actions = ?"); params.push(stringifyJSONField(lairActions)); }
    if (spellcasting !== undefined) { updates.push("spellcasting = ?"); params.push(stringifyJSONField(spellcasting)); }
    if (shortDescription !== undefined) { updates.push("short_description = ?"); params.push(shortDescription || null); }
    if (appearanceRichText !== undefined) { updates.push("appearance_rich_text = ?"); params.push(appearanceRichText || null); }
    if (loreRichText !== undefined) { updates.push("lore_rich_text = ?"); params.push(loreRichText || null); }
    if (tacticsRichText !== undefined) { updates.push("tactics_rich_text = ?"); params.push(tacticsRichText || null); }
    if (dmNotesRichText !== undefined) { updates.push("dm_notes_rich_text = ?"); params.push(dmNotesRichText || null); }
    if (linkedEntities !== undefined) { updates.push("linked_entities = ?"); params.push(stringifyJSONField(linkedEntities)); }

    updates.push("last_updated_by_user_id = ?");
    params.push(userId);
    updates.push("updated_at = CURRENT_TIMESTAMP");

    params.push(id, campaignId);

    db.prepare(`
      UPDATE creatures 
      SET ${updates.join(", ")}
      WHERE id = ? AND campaign_id = ?
    `).run(...params);

    const updatedCreature = db.prepare(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = ?
    `).get(id);

    // Get tags for this creature from entity_tags
    const creatureTags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'creature' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(id, campaignId);

    // Parse JSON fields
    const processed = {
      ...updatedCreature,
      tags: creatureTags, // Use tags from entity_tags instead of JSON field
      armorClass: parseJSONField(updatedCreature.armor_class),
      hitPoints: parseJSONField(updatedCreature.hit_points),
      speeds: parseJSONField(updatedCreature.speeds, {}),
      senses: parseJSONField(updatedCreature.senses, {}),
      abilities: parseJSONField(updatedCreature.abilities, {}),
      savingThrows: parseJSONField(updatedCreature.saving_throws, []),
      skills: parseJSONField(updatedCreature.skills, []),
      traits: parseJSONField(updatedCreature.traits, []),
      actions: parseJSONField(updatedCreature.actions, []),
      legendaryActionsMeta: parseJSONField(updatedCreature.legendary_actions_meta),
      lairActions: parseJSONField(updatedCreature.lair_actions, []),
      spellcasting: parseJSONField(updatedCreature.spellcasting),
      linkedEntities: parseJSONField(updatedCreature.linked_entities, { npcs: [], factions: [], locations: [], quests: [], sessions: [] })
    };

    res.json(processed);
  } catch (error) {
    console.error("Error updating creature:", error);
    res.status(500).json({ error: "Failed to update creature" });
  }
});

// DELETE /api/campaigns/:campaignId/creatures/:id
router.delete("/:campaignId/creatures/:id", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const creature = db.prepare("SELECT id FROM creatures WHERE id = ? AND campaign_id = ?").get(id, campaignId);
    if (!creature) {
      return res.status(404).json({ error: "Creature not found" });
    }

    db.prepare("DELETE FROM creatures WHERE id = ? AND campaign_id = ?").run(id, campaignId);

    res.json({ message: "Creature deleted successfully" });
  } catch (error) {
    console.error("Error deleting creature:", error);
    res.status(500).json({ error: "Failed to delete creature" });
  }
});

export default router;
