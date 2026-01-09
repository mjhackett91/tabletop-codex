// server/routes/locations.js - Locations API
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignAccess, requireCampaignDM } from "../middleware/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All location routes require authentication
router.use(authenticateToken);

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`[Locations Router] ${req.method} ${req.path}`);
  console.log(`[Locations Router] Params:`, req.params);
  console.log(`[Locations Router] User:`, req.user?.id);
  next();
});

// GET /api/campaigns/:campaignId/locations
router.get("/:campaignId/locations", requireCampaignAccess, async (req, res) => {
  try {
    console.log("Locations route hit - params:", req.params);
    console.log("Locations route hit - query:", req.query);
    const { campaignId } = req.params;
    const { search, parent_id } = req.query;
    const userRole = req.userCampaignRole;

    if (!campaignId) {
      console.error("No campaignId in params");
      return res.status(400).json({ error: "Campaign ID is required" });
    }
    
    console.log("Fetching locations for campaign:", campaignId);

    let queryText = `
      SELECT l.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM locations l
      LEFT JOIN users creator ON l.created_by_user_id = creator.id
      LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
      WHERE l.campaign_id = $1
    `;
    const params = [campaignId];
    let paramIndex = 2;

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      queryText += " AND l.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND l.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === "null") {
        queryText += " AND l.parent_location_id IS NULL";
      } else {
        queryText += ` AND l.parent_location_id = $${paramIndex}`;
        params.push(parseInt(parent_id));
        paramIndex++;
      }
    }

    if (search) {
      queryText += ` AND (l.name LIKE $${paramIndex} OR l.description LIKE $${paramIndex + 1})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    queryText += " ORDER BY l.name";

    console.log("Executing query:", queryText);
    console.log("With params:", params);
    
    const locations = await all(queryText, params);
    console.log("Locations found:", locations.length);

    // Get parent location name and tags for each location
    const locationsWithParents = await Promise.all(locations.map(async (location) => {
      try {
        let parent_location_name = null;
        if (location.parent_location_id) {
          const parent = await get("SELECT name FROM locations WHERE id = $1", [location.parent_location_id]);
          parent_location_name = parent?.name || null;
        }

        // Get tags for this location
        const tags = await all(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'location' AND et.entity_id = $1 AND t.campaign_id = $2
          ORDER BY t.name ASC
        `, [location.id, campaignId]);

        return {
          ...location,
          parent_location_name,
          tags
        };
      } catch (err) {
        console.error("Error processing location:", location.id, err);
        return {
          ...location,
          parent_location_name: null,
          tags: []
        };
      }
    }));

    console.log("Returning locations:", locationsWithParents.length);
    res.json(locationsWithParents);
  } catch (error) {
    console.error("Error fetching locations:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch locations", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/locations/:id
router.get("/:campaignId/locations/:id", requireCampaignAccess, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let queryText = `
      SELECT l.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM locations l
      LEFT JOIN users creator ON l.created_by_user_id = creator.id
      LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
      WHERE l.id = $1 AND l.campaign_id = $2
    `;
    const params = [id, campaignId];
    let paramIndex = 3;

    // Filter by visibility
    if (userRole === "player") {
      queryText += " AND l.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      queryText += " AND l.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const location = await get(queryText, params);

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Get parent location if it exists
    let parent_location_name = null;
    if (location.parent_location_id) {
      const parent = await get("SELECT name FROM locations WHERE id = $1", [location.parent_location_id]);
      parent_location_name = parent?.name || null;
    }

    // Get tags for this location
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'location' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [location.id, campaignId]);

    res.json({
      ...location,
      parent_location_name,
      tags
    });
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).json({ error: "Failed to fetch location" });
  }
});

// POST /api/campaigns/:campaignId/locations
router.post("/:campaignId/locations", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, location_type, parent_location_id, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Location name is required" });
    }

    // Validate parent_location_id if provided
    if (parent_location_id) {
      const parentExists = await get(
        "SELECT id FROM locations WHERE id = $1 AND campaign_id = $2",
        [parent_location_id, campaignId]
      );
      
      if (!parentExists) {
        return res.status(400).json({ error: "Invalid parent location" });
      }
    }

    const result = await query(
      `INSERT INTO locations (campaign_id, name, description, location_type, parent_location_id, visibility, created_by_user_id, last_updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        campaignId,
        name.trim(),
        description || null,
        location_type || null,
        parent_location_id || null,
        visibility || "dm-only",
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      ]
    );

    const locationId = result.rows[0].id;

    const newLocation = await get(`
      SELECT l.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM locations l
      LEFT JOIN users creator ON l.created_by_user_id = creator.id
      LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
      WHERE l.id = $1
    `, [locationId]);

    // Get parent location name if it exists
    let parent_location_name = null;
    if (newLocation.parent_location_id) {
      const parent = await get("SELECT name FROM locations WHERE id = $1", [newLocation.parent_location_id]);
      parent_location_name = parent?.name || null;
    }

    // Get tags for this location
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'location' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [locationId, campaignId]);

    res.status(201).json({
      ...newLocation,
      parent_location_name,
      tags
    });
  } catch (error) {
    console.error("Error creating location:", error);
    res.status(500).json({ error: "Failed to create location" });
  }
});

// PUT /api/campaigns/:campaignId/locations/:id
router.put("/:campaignId/locations/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { name, description, location_type, parent_location_id, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Location name is required" });
    }

    // Check if location exists and belongs to campaign
    const existing = await get("SELECT id FROM locations WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (!existing) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Validate parent_location_id if provided (and not creating a cycle)
    if (parent_location_id) {
      const parentExists = await get(
        "SELECT id FROM locations WHERE id = $1 AND campaign_id = $2",
        [parent_location_id, campaignId]
      );
      
      if (!parentExists) {
        return res.status(400).json({ error: "Invalid parent location" });
      }

      // Prevent self-reference
      if (parseInt(parent_location_id) === parseInt(id)) {
        return res.status(400).json({ error: "Location cannot be its own parent" });
      }

      // Prevent cycles (simplified check - location can't be ancestor of itself)
      // TODO: Add more robust cycle detection if needed
    }

    await query(
      `UPDATE locations 
       SET name = $1, description = $2, location_type = $3, parent_location_id = $4, visibility = $5, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = $6
       WHERE id = $7 AND campaign_id = $8`,
      [
        name.trim(),
        description || null,
        location_type || null,
        parent_location_id || null,
        visibility || "dm-only",
        userId, // last_updated_by_user_id
        id,
        campaignId
      ]
    );

    const updatedLocation = await get(`
      SELECT l.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM locations l
      LEFT JOIN users creator ON l.created_by_user_id = creator.id
      LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
      WHERE l.id = $1
    `, [id]);

    // Get parent location name if it exists
    let parent_location_name = null;
    if (updatedLocation.parent_location_id) {
      const parent = await get("SELECT name FROM locations WHERE id = $1", [updatedLocation.parent_location_id]);
      parent_location_name = parent?.name || null;
    }

    // Get tags for this location
    const tags = await all(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'location' AND et.entity_id = $1 AND t.campaign_id = $2
      ORDER BY t.name ASC
    `, [id, campaignId]);

    res.json({
      ...updatedLocation,
      parent_location_name,
      tags
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// DELETE /api/campaigns/:campaignId/locations/:id
router.delete("/:campaignId/locations/:id", requireCampaignDM, async (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if location exists and belongs to campaign
    const location = await get("SELECT id FROM locations WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Check if location has children (prevent orphaned locations)
    const children = await all("SELECT id FROM locations WHERE parent_location_id = $1", [id]);

    if (children.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete location with child locations. Please remove or reassign child locations first." 
      });
    }

    const result = await query("DELETE FROM locations WHERE id = $1 AND campaign_id = $2", [id, campaignId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Failed to delete location" });
  }
});

export default router;
