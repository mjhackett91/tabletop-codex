// server/routes/tags.js - Tags API
import express from "express";
import { get, all, query, transaction } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All tag routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/tags
// Get all tags for a campaign
router.get("/:campaignId/tags", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const tags = await all(`
      SELECT t.*, 
             COUNT(et.tag_id) as usage_count
      FROM tags t
      LEFT JOIN entity_tags et ON t.id = et.tag_id
      WHERE t.campaign_id = $1
      GROUP BY t.id
      ORDER BY t.name ASC
    `, [campaignId]);

    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// POST /api/campaigns/:campaignId/tags
// Create a new tag
router.post("/:campaignId/tags", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, color, is_premade } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tag name is required" });
    }

    // Validate color format (hex color)
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: "Invalid color format. Use hex format (e.g., #FF5733)" });
    }

    // Check if tag with same name already exists
    const existing = await get(`
      SELECT id FROM tags 
      WHERE campaign_id = $1 AND LOWER(name) = LOWER($2)
    `, [campaignId, name.trim()]);

    if (existing) {
      return res.status(400).json({ error: "A tag with this name already exists" });
    }

    const result = await query(`
      INSERT INTO tags (campaign_id, name, color, is_premade)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [campaignId, name.trim(), color || null, is_premade ? 1 : 0]);

    const tagId = result.rows[0].id;
    const tag = await get("SELECT * FROM tags WHERE id = $1", [tagId]);
    res.status(201).json(tag);
  } catch (error) {
    console.error("Error creating tag:", error);
    if (error.code === "23505" || error.message.includes("UNIQUE constraint")) {
      res.status(400).json({ error: "A tag with this name already exists" });
    } else {
      res.status(500).json({ error: "Failed to create tag" });
    }
  }
});

// PUT /api/campaigns/:campaignId/tags/:tagId
// Update a tag
router.put("/:campaignId/tags/:tagId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, tagId } = req.params;
    const { name, color } = req.body;

    // Verify tag exists and belongs to campaign
    const tag = await get(`
      SELECT * FROM tags 
      WHERE id = $1 AND campaign_id = $2
    `, [tagId, campaignId]);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    if (name && !name.trim()) {
      return res.status(400).json({ error: "Tag name cannot be empty" });
    }

    // Validate color format
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: "Invalid color format. Use hex format (e.g., #FF5733)" });
    }

    // Check if new name conflicts with existing tag
    if (name && name.trim().toLowerCase() !== tag.name.toLowerCase()) {
      const existing = await get(`
        SELECT id FROM tags 
        WHERE campaign_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
      `, [campaignId, name.trim(), tagId]);

      if (existing) {
        return res.status(400).json({ error: "A tag with this name already exists" });
      }
    }

    const { is_premade } = req.body;
    
    // PostgreSQL COALESCE with conditional updates
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name.trim());
      paramIndex++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }
    if (is_premade !== undefined) {
      updates.push(`is_premade = $${paramIndex}`);
      params.push(is_premade ? 1 : 0);
      paramIndex++;
    }

    if (updates.length > 0) {
      params.push(tagId, campaignId);
      await query(`
        UPDATE tags 
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex} AND campaign_id = $${paramIndex + 1}
      `, params);
    }

    const updated = await get("SELECT * FROM tags WHERE id = $1", [tagId]);
    res.json(updated);
  } catch (error) {
    console.error("Error updating tag:", error);
    if (error.code === "23505" || error.message.includes("UNIQUE constraint")) {
      res.status(400).json({ error: "A tag with this name already exists" });
    } else {
      res.status(500).json({ error: "Failed to update tag" });
    }
  }
});

// DELETE /api/campaigns/:campaignId/tags/:tagId
// Delete a tag (also removes all entity associations)
router.delete("/:campaignId/tags/:tagId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, tagId } = req.params;

    // Verify tag exists and belongs to campaign
    const tag = await get(`
      SELECT * FROM tags 
      WHERE id = $1 AND campaign_id = $2
    `, [tagId, campaignId]);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    // Delete all entity associations (CASCADE will handle this, but explicit for clarity)
    await query("DELETE FROM entity_tags WHERE tag_id = $1", [tagId]);
    
    // Delete the tag
    const result = await query("DELETE FROM tags WHERE id = $1 AND campaign_id = $2", [tagId, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

// GET /api/campaigns/:campaignId/entities/:entityType/:entityId/tags
// Get tags for a specific entity
router.get("/:campaignId/entities/:entityType/:entityId/tags", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, entityType, entityId } = req.params;

    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = $1 AND et.entity_id = $2 AND t.campaign_id = $3
      ORDER BY t.name ASC
    `, [entityType, parseInt(entityId, 10), campaignId]);

    res.json(tags);
  } catch (error) {
    console.error("Error fetching entity tags:", error);
    res.status(500).json({ error: "Failed to fetch entity tags" });
  }
});

// POST /api/campaigns/:campaignId/entities/:entityType/:entityId/tags
// Add tags to an entity
router.post("/:campaignId/entities/:entityType/:entityId/tags", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, entityType, entityId } = req.params;
    const { tagIds } = req.body; // Array of tag IDs

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: "tagIds must be an array" });
    }

    // Verify all tags belong to this campaign
    if (tagIds.length > 0) {
      const placeholders = tagIds.map((_, i) => `$${i + 2}`).join(",");
      const tags = await all(`
        SELECT id FROM tags 
        WHERE id IN (${placeholders}) AND campaign_id = $1
      `, [campaignId, ...tagIds]);

      if (tags.length !== tagIds.length) {
        return res.status(400).json({ error: "One or more tags not found or don't belong to this campaign" });
      }
    }

    // Ensure entityId is an integer for consistency
    const entityIdInt = parseInt(entityId, 10);
    if (isNaN(entityIdInt)) {
      return res.status(400).json({ error: "Invalid entity ID" });
    }

    console.log(`[Tags] Setting tags for ${entityType} ${entityIdInt} (original: ${entityId}, type: ${typeof entityId}):`, tagIds);

    // Use transaction for atomicity
    await transaction(async (client) => {
      // Remove existing tags for this entity
      const deleteResult = await client.query(`
        DELETE FROM entity_tags 
        WHERE entity_type = $1 AND entity_id = $2
      `, [entityType, entityIdInt]);
      console.log(`[Tags] Deleted ${deleteResult.rowCount} existing tags`);

      // Add new tags
      for (const tagId of tagIds) {
        await client.query(`
          INSERT INTO entity_tags (entity_type, entity_id, tag_id)
          VALUES ($1, $2, $3)
        `, [entityType, entityIdInt, tagId]);
        console.log(`[Tags] Inserted tag ${tagId} for ${entityType} ${entityIdInt}`);
      }
    });

    // Return updated tags
    const updatedTags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = $1 AND et.entity_id = $2 AND t.campaign_id = $3
      ORDER BY t.name ASC
    `, [entityType, entityIdInt, parseInt(campaignId, 10)]);
    
    console.log(`[Tags] Tags saved successfully for ${entityType} ${entityIdInt}:`, updatedTags.map(t => t.name));

    res.json(updatedTags);
  } catch (error) {
    console.error("Error updating entity tags:", error);
    res.status(500).json({ error: "Failed to update entity tags" });
  }
});

// DELETE /api/campaigns/:campaignId/entities/:entityType/:entityId/tags/:tagId
// Remove a specific tag from an entity
router.delete("/:campaignId/entities/:entityType/:entityId/tags/:tagId", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, entityType, entityId, tagId } = req.params;

    // Verify tag belongs to campaign
    const tag = await get(`
      SELECT * FROM tags 
      WHERE id = $1 AND campaign_id = $2
    `, [tagId, campaignId]);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const result = await query(`
      DELETE FROM entity_tags 
      WHERE entity_type = $1 AND entity_id = $2 AND tag_id = $3
    `, [entityType, parseInt(entityId, 10), tagId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tag association not found" });
    }

    res.json({ message: "Tag removed from entity" });
  } catch (error) {
    console.error("Error removing tag from entity:", error);
    res.status(500).json({ error: "Failed to remove tag from entity" });
  }
});

export default router;
