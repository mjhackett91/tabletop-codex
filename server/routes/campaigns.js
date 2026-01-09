// server/routes/campaigns.js - User-scoped campaigns CRUD
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { verifyCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router();

// All campaign routes require authentication
router.use(authenticateToken);

/** GET /api/campaigns - List user's campaigns (owned and participated) */
router.get("/", (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get campaigns where user is owner OR participant
    const campaigns = db
      .prepare(`
        SELECT DISTINCT
          c.*,
          CASE 
            WHEN c.user_id = ? THEN 'dm'
            ELSE cp.role
          END as user_role,
          CASE 
            WHEN c.user_id = ? THEN 1
            ELSE 0
          END as is_owner
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id AND cp.user_id = ?
        WHERE c.user_id = ? OR cp.user_id = ?
        ORDER BY is_owner DESC, c.created_at DESC
      `)
      .all(userId, userId, userId, userId, userId);
    
    // Convert SQLite boolean (0/1) to actual boolean
    const campaignsWithBooleans = campaigns.map(c => ({
      ...c,
      is_owner: c.is_owner === 1 || c.is_owner === true
    }));
    
    res.json(campaignsWithBooleans);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

/** POST /api/campaigns - Create new campaign */
router.post("/", (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    const stmt = db.prepare(
      "INSERT INTO campaigns (user_id, name, description) VALUES (?, ?, ?)"
    );
    const result = stmt.run(userId, name.trim(), description?.trim() || null);
    const campaignId = result.lastInsertRowid;

    // Create pre-made tags for the new campaign
    const premadeTags = [
      { name: "Important", color: "#FF5733", is_premade: true },
      { name: "NPC", color: "#33FF57", is_premade: true },
      { name: "Location", color: "#3357FF", is_premade: true },
      { name: "Quest", color: "#FF33F5", is_premade: true },
      { name: "Lore", color: "#D4AF37", is_premade: true }, // Changed from bright yellow to gold for readability
      { name: "Session", color: "#FF8C33", is_premade: true },
      { name: "Player", color: "#33FFF5", is_premade: true },
      { name: "Villain", color: "#8C33FF", is_premade: true },
    ];

    const tagStmt = db.prepare(
      "INSERT INTO tags (campaign_id, name, color, is_premade) VALUES (?, ?, ?, ?)"
    );

    for (const tag of premadeTags) {
      try {
        tagStmt.run(campaignId, tag.name, tag.color, tag.is_premade ? 1 : 0);
      } catch (err) {
        // Tag might already exist, skip
        console.log(`Skipping premade tag ${tag.name}: ${err.message}`);
      }
    }

    const newCampaign = db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(campaignId);
    res.status(201).json(newCampaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

/** PUT /api/campaigns/:id - Update campaign */
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    // Verify ownership
    if (!verifyCampaignOwnership(id, userId)) {
      return res.status(403).json({ error: "Campaign not found or access denied" });
    }

    const stmt = db.prepare(
      "UPDATE campaigns SET name = ?, description = ? WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(name.trim(), description?.trim() || null, id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updatedCampaign = db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(id);
    res.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

/** DELETE /api/campaigns/:id - Delete campaign */
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    if (!verifyCampaignOwnership(id, userId)) {
      return res.status(403).json({ error: "Campaign not found or access denied" });
    }

    const stmt = db.prepare("DELETE FROM campaigns WHERE id = ? AND user_id = ?");
    const result = stmt.run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

export default router;