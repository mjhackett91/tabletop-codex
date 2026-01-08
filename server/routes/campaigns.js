// server/routes/campaigns.js - User-scoped campaigns CRUD
import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { verifyCampaignOwnership } from "../utils/campaignOwnership.js";

const router = express.Router();

// All campaign routes require authentication
router.use(authenticateToken);

/** GET /api/campaigns - List user's campaigns */
router.get("/", (req, res) => {
  try {
    const userId = req.user.id;
    const campaigns = db
      .prepare("SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId);
    res.json(campaigns);
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

    const newCampaign = db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(result.lastInsertRowid);
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