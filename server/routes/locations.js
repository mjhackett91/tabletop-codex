// server/routes/locations.js - Locations API
import express from "express";
import db from "../db.js";
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
router.get("/:campaignId/locations", requireCampaignAccess, (req, res) => {
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

    let query = `
      SELECT l.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM locations l
      LEFT JOIN users creator ON l.created_by_user_id = creator.id
      LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
      WHERE l.campaign_id = ?
    `;
    const params = [campaignId];

    // Filter by visibility: players only see player-visible, DMs see all except hidden
    if (userRole === "player") {
      query += " AND l.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND l.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === "null") {
        query += " AND l.parent_location_id IS NULL";
      } else {
        query += " AND l.parent_location_id = ?";
        params.push(parseInt(parent_id));
      }
    }

    if (search) {
      query += " AND (l.name LIKE ? OR l.description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY l.name";

    console.log("Executing query:", query);
    console.log("With params:", params);
    
    const locations = db.prepare(query).all(...params);
    console.log("Locations found:", locations.length);

    // Get parent location name and tags for each location
    const locationsWithParents = locations.map(location => {
      try {
        let parent_location_name = null;
        if (location.parent_location_id) {
          const parent = db
            .prepare("SELECT name FROM locations WHERE id = ?")
            .get(location.parent_location_id);
          parent_location_name = parent?.name || null;
        }

        // Get tags for this location
        const tags = db.prepare(`
          SELECT t.*
          FROM tags t
          INNER JOIN entity_tags et ON t.id = et.tag_id
          WHERE et.entity_type = 'location' AND et.entity_id = ? AND t.campaign_id = ?
          ORDER BY t.name ASC
        `).all(location.id, campaignId);

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
    });

    console.log("Returning locations:", locationsWithParents.length);
    res.json(locationsWithParents);
  } catch (error) {
    console.error("Error fetching locations:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch locations", details: error.message });
  }
});

// GET /api/campaigns/:campaignId/locations/:id
router.get("/:campaignId/locations/:id", requireCampaignAccess, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const userRole = req.userCampaignRole;

    let query = `
      SELECT l.*, 
             creator.username as created_by_username, creator.email as created_by_email,
             updater.username as last_updated_by_username, updater.email as last_updated_by_email
      FROM locations l
      LEFT JOIN users creator ON l.created_by_user_id = creator.id
      LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
      WHERE l.id = ? AND l.campaign_id = ?
    `;
    const params = [id, campaignId];

    // Filter by visibility
    if (userRole === "player") {
      query += " AND l.visibility = 'player-visible'";
    } else if (userRole === "dm") {
      query += " AND l.visibility != 'hidden'";
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const location = db.prepare(query).get(...params);

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Get parent location if it exists
    let parent_location_name = null;
    if (location.parent_location_id) {
      const parent = db
        .prepare("SELECT name FROM locations WHERE id = ?")
        .get(location.parent_location_id);
      parent_location_name = parent?.name || null;
    }

    // Get tags for this location
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'location' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(location.id, campaignId);

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
router.post("/:campaignId/locations", requireCampaignDM, (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, location_type, parent_location_id, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Location name is required" });
    }

    // Validate parent_location_id if provided
    if (parent_location_id) {
      const parentExists = db
        .prepare("SELECT id FROM locations WHERE id = ? AND campaign_id = ?")
        .get(parent_location_id, campaignId);
      
      if (!parentExists) {
        return res.status(400).json({ error: "Invalid parent location" });
      }
    }

    const result = db
      .prepare(
        `INSERT INTO locations (campaign_id, name, description, location_type, parent_location_id, visibility, created_by_user_id, last_updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        campaignId,
        name.trim(),
        description || null,
        location_type || null,
        parent_location_id || null,
        visibility || "dm-only",
        userId, // created_by_user_id
        userId  // last_updated_by_user_id
      );

    const newLocation = db
      .prepare(`
        SELECT l.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM locations l
        LEFT JOIN users creator ON l.created_by_user_id = creator.id
        LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
        WHERE l.id = ?
      `)
      .get(result.lastInsertRowid);

    // Get parent location name if it exists
    let parent_location_name = null;
    if (newLocation.parent_location_id) {
      const parent = db
        .prepare("SELECT name FROM locations WHERE id = ?")
        .get(newLocation.parent_location_id);
      parent_location_name = parent?.name || null;
    }

    // Get tags for this location
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'location' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(newLocation.id, campaignId);

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
router.put("/:campaignId/locations/:id", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, id } = req.params;
    const { name, description, location_type, parent_location_id, visibility } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Location name is required" });
    }

    // Check if location exists and belongs to campaign
    const existing = db
      .prepare("SELECT id FROM locations WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!existing) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Validate parent_location_id if provided (and not creating a cycle)
    if (parent_location_id) {
      const parentExists = db
        .prepare("SELECT id FROM locations WHERE id = ? AND campaign_id = ?")
        .get(parent_location_id, campaignId);
      
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

    db.prepare(
      `UPDATE locations 
       SET name = ?, description = ?, location_type = ?, parent_location_id = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_user_id = ?
       WHERE id = ? AND campaign_id = ?`
    ).run(
      name.trim(),
      description || null,
      location_type || null,
      parent_location_id || null,
      visibility || "dm-only",
      userId, // last_updated_by_user_id
      id,
      campaignId
    );

    const updatedLocation = db
      .prepare(`
        SELECT l.*, 
               creator.username as created_by_username, creator.email as created_by_email,
               updater.username as last_updated_by_username, updater.email as last_updated_by_email
        FROM locations l
        LEFT JOIN users creator ON l.created_by_user_id = creator.id
        LEFT JOIN users updater ON l.last_updated_by_user_id = updater.id
        WHERE l.id = ?
      `)
      .get(id);

    // Get parent location name if it exists
    let parent_location_name = null;
    if (updatedLocation.parent_location_id) {
      const parent = db
        .prepare("SELECT name FROM locations WHERE id = ?")
        .get(updatedLocation.parent_location_id);
      parent_location_name = parent?.name || null;
    }

    // Get tags for this location
    const tags = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'location' AND et.entity_id = ? AND t.campaign_id = ?
      ORDER BY t.name ASC
    `).all(id, campaignId);

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
router.delete("/:campaignId/locations/:id", requireCampaignDM, (req, res) => {
  try {
    const { campaignId, id } = req.params;

    // Check if location exists and belongs to campaign
    const location = db
      .prepare("SELECT id FROM locations WHERE id = ? AND campaign_id = ?")
      .get(id, campaignId);

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Check if location has children (prevent orphaned locations)
    const children = db
      .prepare("SELECT id FROM locations WHERE parent_location_id = ?")
      .all(id);

    if (children.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete location with child locations. Please remove or reassign child locations first." 
      });
    }

    db.prepare("DELETE FROM locations WHERE id = ? AND campaign_id = ?").run(id, campaignId);

    res.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Failed to delete location" });
  }
});

export default router;
