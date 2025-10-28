import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, "../db/ttc.db");
const db = new Database(dbPath);

// Create campaigns table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// GET /api/campaigns - List all campaigns
router.get("/", (req, res) => {
  try {
    const campaigns = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all();
    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// POST /api/campaigns - Create new campaign
router.post("/", (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    const stmt = db.prepare("INSERT INTO campaigns (name, description) VALUES (?, ?)");
    const result = stmt.run(name.trim(), description?.trim() || null);
    
    const newCampaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(newCampaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    const stmt = db.prepare("UPDATE campaigns SET name = ?, description = ? WHERE id = ?");
    const result = stmt.run(name.trim(), description?.trim() || null, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updatedCampaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id);
    res.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare("DELETE FROM campaigns WHERE id = ?");
    const result = stmt.run(id);
    
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
