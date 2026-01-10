// server/db-pg.js - PostgreSQL database connection
// This is a temporary file during migration - will replace db.js once complete
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER || "ttc_user"}:${process.env.POSTGRES_PASSWORD || "ttc_password"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || "ttc"}`,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

// Helper function to execute queries (similar to db.prepare().get())
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log("Executed query", { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error("Query error", { text, error: error.message });
    throw error;
  }
};

// Helper to get single row (like db.prepare().get())
export const get = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Helper to get all rows (like db.prepare().all())
export const all = async (text, params) => {
  const result = await query(text, params);
  return result.rows;
};

// Helper to execute (like db.exec())
export const exec = async (text) => {
  return await query(text);
};

// Helper for transactions
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Initialize schema
export const initializeSchema = async () => {
  try {
    // Convert SQLite schema to PostgreSQL
    // Note: PostgreSQL uses SERIAL instead of AUTOINCREMENT, TIMESTAMP instead of DATETIME
    // PostgreSQL requires each CREATE TABLE to be executed separately
    
    // Define all table creation statements
    const createTables = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS content_items (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('player', 'npc', 'antagonist')),
        name TEXT NOT NULL,
        description TEXT,
        character_sheet TEXT,
        alignment TEXT,
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        player_user_id INTEGER,
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        location_type TEXT,
        parent_location_id INTEGER,
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS factions (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        alignment TEXT,
        goals TEXT,
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS world_info (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS quests (
        id SERIAL PRIMARY KEY,
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
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        introduced_in_session INTEGER,
        completed_in_session INTEGER,
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS quest_links (
        id SERIAL PRIMARY KEY,
        quest_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        role TEXT,
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS quest_objectives (
        id SERIAL PRIMARY KEY,
        quest_id INTEGER NOT NULL,
        objective_type TEXT NOT NULL CHECK(objective_type IN ('primary', 'optional', 'hidden')),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'incomplete' CHECK(status IN ('incomplete', 'complete', 'failed')),
        linked_entity_type TEXT,
        linked_entity_id INTEGER,
        notes TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS quest_milestones (
        id SERIAL PRIMARY KEY,
        quest_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        session_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
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
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS quest_sessions (
        quest_id INTEGER NOT NULL,
        session_id INTEGER NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (quest_id, session_id),
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        is_premade INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE(campaign_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS entity_tags (
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (entity_type, entity_id, tag_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS player_session_notes (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        note_content TEXT NOT NULL,
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS session_notes (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        quick_note TEXT,
        detailed_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS campaign_participants (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('dm', 'player')),
        invited_by INTEGER,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(campaign_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS creatures (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        source_type TEXT DEFAULT 'homebrew' CHECK(source_type IN ('homebrew', 'user-imported', 'other')),
        visibility TEXT DEFAULT 'dm-only' CHECK(visibility IN ('dm-only', 'player-visible', 'hidden')),
        tags TEXT,
        size TEXT CHECK(size IN ('Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan')),
        creature_type TEXT,
        subtype TEXT,
        alignment TEXT,
        challenge_rating TEXT,
        proficiency_bonus INTEGER,
        armor_class TEXT,
        hit_points TEXT,
        hit_dice TEXT,
        damage_vulnerabilities TEXT,
        damage_resistances TEXT,
        damage_immunities TEXT,
        condition_immunities TEXT,
        speeds TEXT,
        senses TEXT,
        languages TEXT,
        abilities TEXT,
        saving_throws TEXT,
        skills TEXT,
        traits TEXT,
        actions TEXT,
        legendary_actions_meta TEXT,
        lair_actions TEXT,
        spellcasting TEXT,
        short_description TEXT,
        appearance_rich_text TEXT,
        lore_rich_text TEXT,
        tactics_rich_text TEXT,
        dm_notes_rich_text TEXT,
        linked_entities TEXT,
        created_by_user_id INTEGER,
        last_updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`
    ];

    // Execute each CREATE TABLE statement separately
    for (const sql of createTables) {
      try {
        await query(sql);
      } catch (error) {
        // Ignore "already exists" errors, but log others
        if (!error.message.includes('already exists')) {
          console.error(`Error creating table: ${error.message}`);
        }
      }
    }

    // Create indexes (each separately)
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_content_campaign ON content_items(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_content_category ON content_items(category)',
      'CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_characters_type ON characters(type)',
      'CREATE INDEX IF NOT EXISTS idx_characters_player_user ON characters(player_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_factions_campaign ON factions(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_world_info_campaign ON world_info(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_quests_campaign ON quests(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_quest_links_quest ON quest_links(quest_id)',
      'CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives(quest_id)',
      'CREATE INDEX IF NOT EXISTS idx_quest_milestones_quest ON quest_milestones(quest_id)',
      'CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_tags_campaign ON tags(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_player_session_notes_session ON player_session_notes(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_player_session_notes_user ON player_session_notes(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_campaign_participants_campaign ON campaign_participants(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_campaign_participants_user ON campaign_participants(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_creatures_campaign ON creatures(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_creatures_type ON creatures(creature_type)',
      'CREATE INDEX IF NOT EXISTS idx_creatures_created_by ON creatures(created_by_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_creatures_updated_by ON creatures(last_updated_by_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)'
    ];

    for (const sql of createIndexes) {
      try {
        await query(sql);
      } catch (error) {
        console.error(`Error creating index: ${error.message}`);
      }
    }

    // Create trigger function for auto-adding campaign owner as DM participant
    await query(`
      CREATE OR REPLACE FUNCTION add_campaign_owner_as_participant()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO campaign_participants (campaign_id, user_id, role)
        VALUES (NEW.id, NEW.user_id, 'dm')
        ON CONFLICT (campaign_id, user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_add_campaign_owner_as_participant ON campaigns;
      CREATE TRIGGER trigger_add_campaign_owner_as_participant
      AFTER INSERT ON campaigns
      FOR EACH ROW
      EXECUTE FUNCTION add_campaign_owner_as_participant();
    `);

    console.log("PostgreSQL schema initialized successfully");
  } catch (error) {
    console.error("Error initializing PostgreSQL schema:", error);
    throw error;
  }
};

// Seed pre-made tags for existing campaigns
export const seedPremadeTags = async () => {
  try {
    const premadeTags = [
      { name: "Important", color: "#FF5733", is_premade: true },
      { name: "NPC", color: "#33FF57", is_premade: true },
      { name: "Location", color: "#3357FF", is_premade: true },
      { name: "Quest", color: "#FF33F5", is_premade: true },
      { name: "Lore", color: "#D4AF37", is_premade: true },
      { name: "Session", color: "#FF8C33", is_premade: true },
      { name: "Player", color: "#33FFF5", is_premade: true },
      { name: "Villain", color: "#8C33FF", is_premade: true },
    ];

    const campaigns = await all("SELECT id FROM campaigns");
    let seededCount = 0;

    for (const campaign of campaigns) {
      for (const tag of premadeTags) {
        try {
          await query(
            "INSERT INTO tags (campaign_id, name, color, is_premade) VALUES ($1, $2, $3, $4) ON CONFLICT (campaign_id, name) DO NOTHING",
            [campaign.id, tag.name, tag.color, tag.is_premade ? 1 : 0]
          );
          seededCount++;
        } catch (err) {
          // Tag might already exist, skip
        }
      }
    }

    if (seededCount > 0) {
      console.log(`Seeded ${seededCount} pre-made tags for existing campaigns`);
    }
  } catch (error) {
    console.error("Error seeding pre-made tags:", error);
  }
};

// Initialize on import
initializeSchema()
  .then(() => seedPremadeTags())
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });

// Export pool for direct access if needed
export { pool };
export default { query, get, all, exec, transaction, pool };
