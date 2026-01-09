// server/routes/tags.js - Tags API
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All tag routes require authentication
router.use(authenticateToken);

// GET /api/campaigns/:campaignId/tags
// Get all tags for a campaign
router.get("/:campaignId/tags", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId } = req.params;

    const tags = db.prepare(`
      SELECT t.*, 
             COUNT(et.tag_id) as usage_count
      FROM tags t
      LEFT JOIN entity_tags et ON t.id = et.tag_id
      WHERE t.campaign_id = ?
      GROUP BY t.id
      ORDER BY t.name ASC
    `).all(campaignId);

    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// POST /api/campaigns/:campaignId/tags
// Create a new tag
router.post("/:campaignId/tags", requireCampaignDM, (req, res) => {
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
    const existing = db.prepare(`
      SELECT id FROM tags 
      WHERE campaign_id = ? AND LOWER(name) = LOWER(?)
    `).get(campaignId, name.trim());

    if (existing) {
      return res.status(400).json({ error: "A tag with this name already exists" });
    }

    const result = db.prepare(`
      INSERT INTO tags (campaign_id, name, color, is_premade)
      VALUES (?, ?, ?, ?)
    `).run(campaignId, name.trim(), color || null, is_premade ? 1 : 0);

    const tag = db.prepare("SELECT * FROM tags WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (error) {
    console.error("Error creating tag:", error);
    if (error.message.includes("UNIQUE constraint")) {
      res.status(400).json({ error: "A tag with this name already exists" });
    } else {
      res.status(500).json({ error: "Failed to create tag" });
    }
  }
});

// PUT /api/campaigns/:campaignId/tags/:tagId
// Update a tag
router.put("/:campaignId/tags/:tagId", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, tagId } = req.params;
    const { name, color } = req.body;

    // Verify tag exists and belongs to campaign
    const tag = db.prepare(`
      SELECT * FROM tags 
      WHERE id = ? AND campaign_id = ?
    `).get(tagId, campaignId);

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
      const existing = db.prepare(`
        SELECT id FROM tags 
        WHERE campaign_id = ? AND LOWER(name) = LOWER(?) AND id != ?
      `).get(campaignId, name.trim(), tagId);

      if (existing) {
        return res.status(400).json({ error: "A tag with this name already exists" });
      }
    }

    const { is_premade } = req.body;
    
    db.prepare(`
      UPDATE tags 
      SET name = COALESCE(?, name), 
          color = COALESCE(?, color),
          is_premade = COALESCE(?, is_premade)
      WHERE id = ? AND campaign_id = ?
    `).run(
      name?.trim() || null, 
      color || null, 
      is_premade !== undefined ? (is_premade ? 1 : 0) : null,
      tagId, 
      campaignId
    );

    const updated = db.prepare("SELECT * FROM tags WHERE id = ?").get(tagId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating tag:", error);
    if (error.message.includes("UNIQUE constraint")) {
      res.status(400).json({ error: "A tag with this name already exists" });
    } else {
      res.status(500).json({ error: "Failed to update tag" });
    }
  }
});

// DELETE /api/campaigns/:campaignId/tags/:tagId
// Delete a tag (also removes all entity associations)
router.delete("/:campaignId/tags/:tagId", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, tagId } = req.params;

    // Verify tag exists and belongs to campaign
    const tag = db.prepare(`
      SELECT * FROM tags 
      WHERE id = ? AND campaign_id = ?
    `).get(tagId, campaignId);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    // Delete all entity associations (CASCADE will handle this, but explicit for clarity)
    db.prepare("DELETE FROM entity_tags WHERE tag_id = ?").run(tagId);
    
    // Delete the tag
    db.prepare("DELETE FROM tags WHERE id = ? AND campaign_id = ?").run(tagId, campaignId);

    res.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

// GET /api/campaigns/:campaignId/entities/:entityType/:entityId/tags
// Get tags for a specific entity
router.get("/:campaignId/entities/:entityType/:entityId/tags", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, entityType, entityId } = req.params;

    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = ? AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(entityType, entityId, campaignId);

    res.json(tags);
  } catch (error) {
    console.error("Error fetching entity tags:", error);
    res.status(500).json({ error: "Failed to fetch entity tags" });
  }
});

// POST /api/campaigns/:campaignId/entities/:entityType/:entityId/tags
// Add tags to an entity
router.post("/:campaignId/entities/:entityType/:entityId/tags", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, entityType, entityId } = req.params;
    const { tagIds } = req.body; // Array of tag IDs

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: "tagIds must be an array" });
    }

    // Verify all tags belong to this campaign
    const placeholders = tagIds.map(() => "?").join(",");
    const tags = db.prepare(`
      SELECT id FROM tags 
      WHERE id IN (${placeholders}) AND campaign_id = ?
    `).all(...tagIds, campaignId);

    if (tags.length !== tagIds.length) {
      return res.status(400).json({ error: "One or more tags not found or don't belong to this campaign" });
    }

    // Ensure entityId is an integer for consistency
    const entityIdInt = parseInt(entityId, 10);
    if (isNaN(entityIdInt)) {
      return res.status(400).json({ error: "Invalid entity ID" });
    }

    console.log(`[Tags] Setting tags for ${entityType} ${entityIdInt} (original: ${entityId}, type: ${typeof entityId}):`, tagIds);

    // Remove existing tags for this entity
    const deleteResult = db.prepare(`
      DELETE FROM entity_tags 
      WHERE entity_type = ? AND entity_id = ?
    `).run(entityType, entityIdInt);
    console.log(`[Tags] Deleted ${deleteResult.changes} existing tags`);

    // Add new tags
    const insert = db.prepare(`
      INSERT INTO entity_tags (entity_type, entity_id, tag_id)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((tags) => {
      for (const tagId of tagIds) {
        insert.run(entityType, entityIdInt, tagId);
        console.log(`[Tags] Inserted tag ${tagId} for ${entityType} ${entityIdInt}`);
      }
    });

    insertMany(tagIds);

    // Verify what was inserted - check with both integer and direct value
    const verifyTagsInt = db.prepare(`
      SELECT * FROM entity_tags 
      WHERE entity_type = ? AND entity_id = ?
    `).all(entityType, entityIdInt);
    console.log(`[Tags] Verification (int) - entity_tags for ${entityType} ${entityIdInt} (type: ${typeof entityIdInt}):`, verifyTagsInt);
    
    // Also check with the original entityId to see if there's a type mismatch
    const verifyTagsOriginal = db.prepare(`
      SELECT * FROM entity_tags 
      WHERE entity_type = ? AND entity_id = ?
    `).all(entityType, entityId);
    console.log(`[Tags] Verification (original) - entity_tags for ${entityType} ${entityId} (type: ${typeof entityId}):`, verifyTagsOriginal);

    // Return updated tags - try both integer and original
    let updatedTags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = ? AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(entityType, entityIdInt, parseInt(campaignId, 10));
    
    if (updatedTags.length === 0) {
      // Try with original entityId
      updatedTags = db.prepare(`
        SELECT t.*
        FROM tags t
        INNER JOIN entity_tags et ON t.id = et.tag_id
        WHERE et.entity_type = ? AND et.entity_id = ? AND t.campaign_id = ?
        ORDER BY t.name ASC
      `).all(entityType, entityId, parseInt(campaignId, 10));
      console.log(`[Tags] Retried with original entityId ${entityId}, found ${updatedTags.length} tags`);
    }
    
    console.log(`[Tags] Tags saved successfully for ${entityType} ${entityIdInt}:`, updatedTags.map(t => t.name));

    res.json(updatedTags);
  } catch (error) {
    console.error("Error updating entity tags:", error);
    res.status(500).json({ error: "Failed to update entity tags" });
  }
});

// DELETE /api/campaigns/:campaignId/entities/:entityType/:entityId/tags/:tagId
// Remove a specific tag from an entity
router.delete("/:campaignId/entities/:entityType/:entityId/tags/:tagId", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, entityType, entityId, tagId } = req.params;

    // Verify tag belongs to campaign
    const tag = db.prepare(`
      SELECT * FROM tags 
      WHERE id = ? AND campaign_id = ?
    `).get(tagId, campaignId);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    db.prepare(`
      DELETE FROM entity_tags 
      WHERE entity_type = ? AND entity_id = ? AND tag_id = ?
    `).run(entityType, entityId, tagId);

    res.json({ message: "Tag removed from entity" });
  } catch (error) {
    console.error("Error removing tag from entity:", error);
    res.status(500).json({ error: "Failed to remove tag from entity" });
  }
});

export default router;
