// server/db.js - Shared database connection
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, "../data/codex.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  console.log("Creating database directory:", dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log("Database path:", dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("busy_timeout = 5000");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('player', 'npc', 'antagonist')),
    name TEXT NOT NULL,
    description TEXT,
    character_sheet TEXT,
    alignment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location_type TEXT,
    parent_location_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS factions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    alignment TEXT,
    goals TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS world_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    quest_type TEXT CHECK(quest_type IN ('main', 'side', 'faction', 'personal', 'one-shot')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'failed', 'on-hold', 'abandoned')),
    short_summary TEXT,
    description TEXT,
    quest_giver TEXT,
    initial_hook TEXT,
    rewards TEXT,
    consequences TEXT,
    urgency_level TEXT CHECK(urgency_level IN ('low', 'medium', 'high', 'time-sensitive')),
    estimated_sessions INTEGER,
    difficulty TEXT,
    visibility_controls TEXT,
    introduced_in_session INTEGER,
    completed_in_session INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quest_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    role TEXT,
    visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quest_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id INTEGER NOT NULL,
    objective_type TEXT NOT NULL CHECK(objective_type IN ('primary', 'optional', 'hidden')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'incomplete' CHECK(status IN ('incomplete', 'complete', 'failed')),
    linked_entity_type TEXT,
    linked_entity_id INTEGER,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quest_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    session_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quest_sessions (
    quest_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (quest_id, session_id),
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    UNIQUE(campaign_id, name)
  );

  CREATE TABLE IF NOT EXISTS entity_tags (
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (entity_type, entity_id, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    session_number INTEGER,
    title TEXT,
    date_played DATE,
    summary TEXT,
    notes_characters TEXT,
    notes_npcs TEXT,
    notes_antagonists TEXT,
    notes_locations TEXT,
    notes_factions TEXT,
    notes_world_info TEXT,
    notes_quests TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    quick_note TEXT,
    detailed_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
  CREATE INDEX IF NOT EXISTS idx_content_campaign ON content_items(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_content_category ON content_items(category);
  CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_characters_type ON characters(type);
  CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_factions_campaign ON factions(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_world_info_campaign ON world_info(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_quests_campaign ON quests(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_quest_links_quest ON quest_links(quest_id);
  CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives(quest_id);
  CREATE INDEX IF NOT EXISTS idx_quest_milestones_quest ON quest_milestones(quest_id);
  CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_tags_campaign ON tags(campaign_id);
`);

// Migrate quests table to add new columns if they don't exist
try {
  const questsColumns = db.prepare("PRAGMA table_info(quests)").all();
  const columnNames = questsColumns.map(col => col.name);
  
  const newColumns = [
    { name: "quest_type", sql: "ALTER TABLE quests ADD COLUMN quest_type TEXT CHECK(quest_type IN ('main', 'side', 'faction', 'personal', 'one-shot'))" },
    { name: "short_summary", sql: "ALTER TABLE quests ADD COLUMN short_summary TEXT" },
    { name: "quest_giver", sql: "ALTER TABLE quests ADD COLUMN quest_giver TEXT" },
    { name: "initial_hook", sql: "ALTER TABLE quests ADD COLUMN initial_hook TEXT" },
    { name: "rewards", sql: "ALTER TABLE quests ADD COLUMN rewards TEXT" },
    { name: "consequences", sql: "ALTER TABLE quests ADD COLUMN consequences TEXT" },
    { name: "urgency_level", sql: "ALTER TABLE quests ADD COLUMN urgency_level TEXT CHECK(urgency_level IN ('low', 'medium', 'high', 'time-sensitive'))" },
    { name: "estimated_sessions", sql: "ALTER TABLE quests ADD COLUMN estimated_sessions INTEGER" },
    { name: "difficulty", sql: "ALTER TABLE quests ADD COLUMN difficulty TEXT" },
    { name: "visibility_controls", sql: "ALTER TABLE quests ADD COLUMN visibility_controls TEXT" },
    { name: "introduced_in_session", sql: "ALTER TABLE quests ADD COLUMN introduced_in_session INTEGER" },
    { name: "completed_in_session", sql: "ALTER TABLE quests ADD COLUMN completed_in_session INTEGER" },
  ];

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      try {
        db.exec(col.sql);
        console.log(`Added column ${col.name} to quests table`);
      } catch (err) {
        // Column might already exist or there's another issue
        console.log(`Skipping column ${col.name}: ${err.message}`);
      }
    }
  }
} catch (err) {
  console.log("Migration check failed (table might not exist yet):", err.message);
}

// Migrate sessions table to add new columns if they don't exist
try {
  const sessionsColumns = db.prepare("PRAGMA table_info(sessions)").all();
  const sessionColumnNames = sessionsColumns.map(col => col.name);
  
  const newSessionColumns = [
    { name: "summary", sql: "ALTER TABLE sessions ADD COLUMN summary TEXT" },
    { name: "notes_characters", sql: "ALTER TABLE sessions ADD COLUMN notes_characters TEXT" },
    { name: "notes_npcs", sql: "ALTER TABLE sessions ADD COLUMN notes_npcs TEXT" },
    { name: "notes_antagonists", sql: "ALTER TABLE sessions ADD COLUMN notes_antagonists TEXT" },
    { name: "notes_locations", sql: "ALTER TABLE sessions ADD COLUMN notes_locations TEXT" },
    { name: "notes_factions", sql: "ALTER TABLE sessions ADD COLUMN notes_factions TEXT" },
    { name: "notes_world_info", sql: "ALTER TABLE sessions ADD COLUMN notes_world_info TEXT" },
    { name: "notes_quests", sql: "ALTER TABLE sessions ADD COLUMN notes_quests TEXT" },
  ];

  for (const col of newSessionColumns) {
    if (!sessionColumnNames.includes(col.name)) {
      try {
        db.exec(col.sql);
        console.log(`Added column ${col.name} to sessions table`);
      } catch (err) {
        // Column might already exist or there's another issue
        console.log(`Skipping column ${col.name}: ${err.message}`);
      }
    }
  }
} catch (err) {
  console.log("Sessions migration check failed (table might not exist yet):", err.message);
}

export default db;
