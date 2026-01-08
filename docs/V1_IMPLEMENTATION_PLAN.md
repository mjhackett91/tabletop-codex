# Table Top Codex V1 Implementation Plan

## Overview
DM-focused campaign management with rich content, character sheets, wiki-style linking, and session notes.

---

## Database Schema Design

### Core Tables

#### 1. `characters` (Player Characters, NPCs, Big Bads)
```sql
CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('player', 'npc', 'big_bad')),
  name TEXT NOT NULL,
  description TEXT,  -- Rich text description
  character_sheet JSON,  -- Flexible JSON for D&D stats
  alignment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Character sheet JSON structure:
{
  "stats": {
    "strength": 16,
    "dexterity": 14,
    "constitution": 15,
    "intelligence": 12,
    "wisdom": 13,
    "charisma": 10
  },
  "hp": { "current": 45, "max": 45 },
  "ac": 18,
  "level": 5,
  "class": "Fighter",
  "race": "Human",
  "background": "Soldier",
  "skills": [...],
  "equipment": [...],
  "spells": [...],
  "proficiencies": [...]
}
```

#### 2. `locations`
```sql
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,  -- Rich text with wiki links
  location_type TEXT,  -- City, Dungeon, Tavern, etc.
  parent_location_id INTEGER,  -- For hierarchies (city > district > building)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
);
```

#### 3. `factions`
```sql
CREATE TABLE factions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,  -- Rich text with wiki links
  alignment TEXT,
  goals TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

#### 4. `world_info` (General lore/notes)
```sql
CREATE TABLE world_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,  -- Rich text with wiki links
  category TEXT,  -- History, Magic, Religion, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

#### 5. `images`
```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,  -- 'character', 'location', 'faction', 'world_info'
  entity_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

#### 6. `tags`
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT,  -- Hex color for UI
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, name)
);
```

#### 7. `entity_tags` (Many-to-many)
```sql
CREATE TABLE entity_tags (
  entity_type TEXT NOT NULL,  -- 'character', 'location', etc.
  entity_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (entity_type, entity_id, tag_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### 8. `sessions`
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  session_number INTEGER,
  title TEXT,
  date_played DATE,
  notes TEXT,  -- Quick session notes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

#### 9. `session_notes` (Links session notes to entities)
```sql
CREATE TABLE session_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  quick_note TEXT,  -- Quick jotted note
  detailed_note TEXT,  -- Expanded detail after session
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

---

## Wiki-Style Linking System

### Format: `[[EntityType:EntityName]]` or `[[EntityType:ID]]`

Example in rich text:
- "The party met [[Character:NPC:John the Blacksmith]] who is a member of [[Faction:Merchants Guild]]"
- "They traveled to [[Location:The Black Forest]] near [[Location:Ravenholm]]"

### Implementation:
1. Parse rich text content for `[[Type:Name]]` patterns
2. Create clickable links that navigate to entity detail pages
3. Backend API endpoint: `/api/campaigns/:id/wiki/resolve` to find entities by name

---

## Session Notes Workflow

### Step 1: Create Session
- Quick session entry with date/title

### Step 2: Quick Note-Taking (During Session)
- Select categories: Characters, NPCs, Locations, Factions, World Info
- For each category, quick text input
- Save as "Session Quick Notes"

### Step 3: Post-Session Processing
- Review session notes
- For each entity mentioned:
  - Auto-create or link to existing entity
  - Expand quick notes into detailed notes
  - Option to add images, update character sheets, etc.

---

## API Endpoints Structure

### Characters
- `GET /api/campaigns/:id/characters` - List all characters
- `POST /api/campaigns/:id/characters` - Create character
- `GET /api/campaigns/:id/characters/:charId` - Get character
- `PUT /api/campaigns/:id/characters/:charId` - Update character
- `DELETE /api/campaigns/:id/characters/:charId` - Delete character

### Locations (same pattern)
### Factions (same pattern)
### World Info (same pattern)

### Images
- `POST /api/campaigns/:id/images` - Upload image
- `GET /api/campaigns/:id/images/:entityType/:entityId` - Get images for entity
- `DELETE /api/campaigns/:id/images/:imageId` - Delete image

### Tags
- `GET /api/campaigns/:id/tags` - List tags
- `POST /api/campaigns/:id/tags` - Create tag
- `PUT /api/campaigns/:id/entities/:type/:id/tags` - Update entity tags

### Wiki Resolution
- `POST /api/campaigns/:id/wiki/resolve` - Resolve wiki links to entities

### Sessions
- `GET /api/campaigns/:id/sessions` - List sessions
- `POST /api/campaigns/:id/sessions` - Create session
- `POST /api/campaigns/:id/sessions/:sessionId/notes` - Add session notes
- `POST /api/campaigns/:id/sessions/:sessionId/process` - Process session notes into entities

---

## Frontend Page Structure

### Main Campaign View
- Dashboard with overview cards
- Quick access to all content types
- Recent activity feed

### Content Type Pages (Characters, Locations, Factions, World Info)
- List view with filters (tags, search)
- Grid/card view option
- Create button
- Individual detail/edit pages with:
  - Rich text editor (React-Quill)
  - Character sheet editor (for characters)
  - Image gallery
  - Tags editor
  - Related entities (wiki links)

### Session Notes Page
- Session list
- Create new session
- Quick note-taking interface
- Post-session processing workflow

---

## Implementation Priority

### Phase 1: Characters & NPCs
1. Database schema for characters
2. Character CRUD API
3. Character list page
4. Character detail/edit page with sheet editor
5. Type selector (Player/NPC/Big Bad)

### Phase 2: Locations
1. Locations schema & API
2. Location pages (similar to characters)
3. Hierarchy support (parent locations)

### Phase 3: Factions
1. Factions schema & API
2. Faction pages
3. Link characters to factions

### Phase 4: World Info
1. World info schema & API
2. World info pages with categories

### Phase 5: Wiki Linking
1. Rich text editor integration
2. Wiki link parser
3. Clickable link rendering
4. Entity resolution API

### Phase 6: Tags System
1. Tags schema & API
2. Tag management UI
3. Tag filtering on list pages

### Phase 7: Session Notes
1. Sessions schema & API
2. Session quick note interface
3. Post-session processing workflow

### Phase 8: Images
1. Image upload API
2. Image storage (local filesystem for V1)
3. Image gallery component
4. Image upload UI

---

## Technical Decisions

### Character Sheet: Flexible JSON
- Store as JSON in database
- Frontend form builder for D&D fields
- Easy to extend later for other systems

### Image Storage (V1)
- Local filesystem: `uploads/campaigns/:campaignId/:entityType/:entityId/`
- In production, can migrate to S3/cloud storage

### Rich Text Editor
- React-Quill for formatting
- Custom wiki link button/parser

### UI/UX Principles
- Low friction: One-click access to create content
- Keyboard shortcuts where possible
- Autosave drafts
- Mobile-responsive
- Fast navigation between related content

---

## Implementation Decisions

1. **Character Sheet Flexibility**: Option A - Start with predefined D&D fields (structured approach, easier to use, can extend later)
2. **Wiki Links**: Start with exact match, add fuzzy matching later if needed
3. **Image Limits**: Reasonable limits but user-friendly (not overly restrictive)
4. **Search**: YES - Full-text search across all content types in V1
5. **Session Notes**: Current order is good - build after categories are fleshed out

---

## Additional Features for Future Versions

- Fuzzy wiki link matching
- Export campaign data (JSON/PDF)
- More flexible character sheet system (if needed)
