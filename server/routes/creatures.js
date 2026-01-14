// server/routes/creatures.js - Creatures API (D&D 5e-style statblocks)
import express from "express";
import { get, all, query } from "../db-pg.js";
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
router.get("/:campaignId/creatures", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { search, creatureType, challengeRating, visibility } = req.query;
    const userRole = req.userCampaignRole;

    let queryText = `
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players see player-visible, DMs see all except hidden
    if (userRole === "player") {
      queryText += " AND c.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND c.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (search) {
      queryText += ` AND (c.name ILIKE $${paramIndex} OR c.short_description ILIKE $${paramIndex + 1})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    if (creatureType) {
      queryText += ` AND c.creature_type = $${paramIndex}`;
      params.push(creatureType);
      paramIndex++;
    }

    if (challengeRating) {
      queryText += ` AND c.challenge_rating = $${paramIndex}`;
      params.push(challengeRating);
      paramIndex++;
    }

    if (visibility && userRole === "dm") {
      queryText += ` AND c.visibility = $${paramIndex}`;
      params.push(visibility);
      paramIndex++;
    }

    queryText += " ORDER BY c.name ASC";

    const creatures = await all(queryText, params);

    // Parse JSON fields and filter/sanitize for role, and get tags
    const processedCreatures = await Promise.all(creatures.map(async (creature) => {
      try {
        // Get tags for this creature from entity_tags
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'creature' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [creature.id, campaignId]);

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
    }));

    res.json(processedCreatures);
  } catch (error) {
    console.error("Error fetching creatures:", error);
    res.status(500).json({ error: "Failed to fetch creatures" });
  }
});

// GET /api/campaigns/:campaignId/creatures/:id
router.get("/:campaignId/creatures/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    const creature = await get(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = $1 AND c.campaign_id = $2
    `, [id, campaignId]);

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
    const creatureTags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'creature' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [creature.id, campaignId]);

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
router.post("/:campaignId/creatures", requireCampaignDM, async (req, res) => {
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

    const result = await query(`
      INSERT INTO creatures (
        campaign_id, name, source_type, visibility,
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
      RETURNING id
    `, [
      campaignId,
      name.trim(),
      sourceType,
      visibility,
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
    ]);

    const creatureId = result.rows[0].id;

    const newCreature = await get(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = $1
    `, [creatureId]);

    // Get tags for this creature from entity_tags
    const creatureTags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'creature' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [creatureId, campaignId]);

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
router.put("/:campaignId/creatures/:id", requireCampaignDM, async (req, res) => {
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
    const existing = await get("SELECT id FROM creatures WHERE id = $1 AND campaign_id = $2", [id, campaignId]);
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
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex}`); params.push(name.trim()); paramIndex++; }
    if (sourceType !== undefined) { updates.push(`source_type = $${paramIndex}`); params.push(sourceType); paramIndex++; }
    if (visibility !== undefined) { updates.push(`visibility = $${paramIndex}`); params.push(visibility); paramIndex++; }
    if (tags !== undefined) { updates.push(`tags = $${paramIndex}`); params.push(stringifyJSONField(tags)); paramIndex++; }
    if (size !== undefined) { updates.push(`size = $${paramIndex}`); params.push(size); paramIndex++; }
    if (creatureType !== undefined) { updates.push(`creature_type = $${paramIndex}`); params.push(creatureType); paramIndex++; }
    if (subtype !== undefined) { updates.push(`subtype = $${paramIndex}`); params.push(subtype || null); paramIndex++; }
    if (alignment !== undefined) { updates.push(`alignment = $${paramIndex}`); params.push(alignment || null); paramIndex++; }
    if (challengeRating !== undefined) { updates.push(`challenge_rating = $${paramIndex}`); params.push(challengeRating || null); paramIndex++; }
    if (proficiencyBonus !== undefined) { updates.push(`proficiency_bonus = $${paramIndex}`); params.push(proficiencyBonus || null); paramIndex++; }
    if (armorClass !== undefined) { updates.push(`armor_class = $${paramIndex}`); params.push(stringifyJSONField(armorClass)); paramIndex++; }
    if (hitPoints !== undefined) { updates.push(`hit_points = $${paramIndex}`); params.push(stringifyJSONField(hitPoints)); paramIndex++; }
    if (hitDice !== undefined) { updates.push(`hit_dice = $${paramIndex}`); params.push(hitDice || null); paramIndex++; }
    if (damageVulnerabilities !== undefined) { updates.push(`damage_vulnerabilities = $${paramIndex}`); params.push(damageVulnerabilities || null); paramIndex++; }
    if (damageResistances !== undefined) { updates.push(`damage_resistances = $${paramIndex}`); params.push(damageResistances || null); paramIndex++; }
    if (damageImmunities !== undefined) { updates.push(`damage_immunities = $${paramIndex}`); params.push(damageImmunities || null); paramIndex++; }
    if (conditionImmunities !== undefined) { updates.push(`condition_immunities = $${paramIndex}`); params.push(conditionImmunities || null); paramIndex++; }
    if (speeds !== undefined) { updates.push(`speeds = $${paramIndex}`); params.push(stringifyJSONField(speeds)); paramIndex++; }
    if (senses !== undefined) { updates.push(`senses = $${paramIndex}`); params.push(stringifyJSONField(senses)); paramIndex++; }
    if (languages !== undefined) { updates.push(`languages = $${paramIndex}`); params.push(languages || null); paramIndex++; }
    if (abilities !== undefined) { updates.push(`abilities = $${paramIndex}`); params.push(stringifyJSONField(abilities)); paramIndex++; }
    if (savingThrows !== undefined) { updates.push(`saving_throws = $${paramIndex}`); params.push(stringifyJSONField(savingThrows)); paramIndex++; }
    if (skills !== undefined) { updates.push(`skills = $${paramIndex}`); params.push(stringifyJSONField(skills)); paramIndex++; }
    if (traits !== undefined) { updates.push(`traits = $${paramIndex}`); params.push(stringifyJSONField(traits)); paramIndex++; }
    if (actions !== undefined) { updates.push(`actions = $${paramIndex}`); params.push(stringifyJSONField(actions)); paramIndex++; }
    if (legendaryActionsMeta !== undefined) { updates.push(`legendary_actions_meta = $${paramIndex}`); params.push(stringifyJSONField(legendaryActionsMeta)); paramIndex++; }
    if (lairActions !== undefined) { updates.push(`lair_actions = $${paramIndex}`); params.push(stringifyJSONField(lairActions)); paramIndex++; }
    if (spellcasting !== undefined) { updates.push(`spellcasting = $${paramIndex}`); params.push(stringifyJSONField(spellcasting)); paramIndex++; }
    if (shortDescription !== undefined) { updates.push(`short_description = $${paramIndex}`); params.push(shortDescription || null); paramIndex++; }
    if (appearanceRichText !== undefined) { updates.push(`appearance_rich_text = $${paramIndex}`); params.push(appearanceRichText || null); paramIndex++; }
    if (loreRichText !== undefined) { updates.push(`lore_rich_text = $${paramIndex}`); params.push(loreRichText || null); paramIndex++; }
    if (tacticsRichText !== undefined) { updates.push(`tactics_rich_text = $${paramIndex}`); params.push(tacticsRichText || null); paramIndex++; }
    if (dmNotesRichText !== undefined) { updates.push(`dm_notes_rich_text = $${paramIndex}`); params.push(dmNotesRichText || null); paramIndex++; }
    if (linkedEntities !== undefined) { updates.push(`linked_entities = $${paramIndex}`); params.push(stringifyJSONField(linkedEntities)); paramIndex++; }

    updates.push(`last_updated_by_user_id = $${paramIndex}`);
    params.push(userId);
    paramIndex++;
    updates.push("updated_at = CURRENT_TIMESTAMP");

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id, campaignId);
    const finalParamIndex = paramIndex;

    await query(`
      UPDATE creatures 
      SET ${updates.join(", ")}
      WHERE id = $${finalParamIndex} AND campaign_id = $${finalParamIndex + 1}
    `, params);

    const updatedCreature = await get(`
      SELECT c.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM creatures c
      LEFT JOIN users creator ON c.created_by_user_id = creator.id
      LEFT JOIN users updater ON c.last_updated_by_user_id = updater.id
      WHERE c.id = $1
    `, [id]);

    // Get tags for this creature from entity_tags
    const creatureTags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'creature' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [id, campaignId]);

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
router.delete("/:campaignId/creatures/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;

    const creature = await get("SELECT id FROM creatures WHERE id = $1 AND campaign_id = $2", [id, campaignId]);
    if (!creature) {
      return res.status(404).json({ error: "Creature not found" });
    }

    const result = await query("DELETE FROM creatures WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Creature not found" });
    }

    res.json({ message: "Creature deleted successfully" });
  } catch (error) {
    console.error("Error deleting creature:", error);
    res.status(500).json({ error: "Failed to delete creature" });
  }
});

export default router;
