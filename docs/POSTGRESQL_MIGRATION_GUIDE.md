# PostgreSQL Migration Guide

## Why Migrate from SQLite to PostgreSQL?

**Current State (SQLite):**
- ✅ Works great for single-user or very light multi-user (1-2 concurrent users)
- ❌ Write locks: Only ONE write operation at a time
- ❌ Concurrent writes queue up and can be slow with multiple users
- ❌ Limited operational tooling compared to PostgreSQL

**With PostgreSQL:**
- ✅ True concurrent write support (your <10 users use case)
- ✅ Better performance for multiple simultaneous operations
- ✅ Better backup/restore tooling (pg_dump, pg_restore)
- ✅ Can scale to multiple backend instances if needed later
- ✅ Better monitoring and operational tools

**Recommendation:** For your use case (<10 concurrent users), SQLite will likely work fine for now, but PostgreSQL is the better long-term choice. Migration complexity is **moderate** - mainly changing the database driver and connection logic.

---

## Migration Steps Overview

### 1. **Database Driver Change**
- **Current:** `better-sqlite3` (synchronous, in-process)
- **New:** `pg` (Node.js PostgreSQL client) OR `node-postgres` with connection pooling

### 2. **Connection Management**
- SQLite: File-based, single connection
- PostgreSQL: Connection pool (recommend 5-10 connections for your use case)

### 3. **Query Changes (Minimal)**
- Most SQL queries work the same
- Date/time functions may differ slightly
- Auto-increment IDs: SQLite uses `INTEGER PRIMARY KEY AUTOINCREMENT`, PostgreSQL uses `SERIAL` or `BIGSERIAL`

### 4. **Schema Migration**
- Convert SQLite schema to PostgreSQL
- Update data types (e.g., `TEXT` → `TEXT` or `VARCHAR`, `INTEGER` → `INTEGER` or `BIGINT`)
- Update foreign key syntax if needed
- Add indexes (same logic, but PostgreSQL has more index types)

---

## Implementation Plan

### Phase 1: Setup PostgreSQL (30 min)
```bash
# Using Docker (easiest)
docker run --name ttc-postgres \
  -e POSTGRES_DB=ttc \
  -e POSTGRES_USER=ttc_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v ttc-postgres-data:/var/lib/postgresql/data \
  -d postgres:16

# Or use existing PostgreSQL server
```

### Phase 2: Update Dependencies (5 min)
```bash
cd server
npm uninstall better-sqlite3
npm install pg
npm install --save-dev @types/pg  # If using TypeScript
```

### Phase 3: Update `server/db.js` (2-3 hours)
**Key Changes:**
- Replace `Database` class from `better-sqlite3` with `Pool` from `pg`
- Change synchronous queries to async/await
- Update transaction handling (SQLite `BEGIN TRANSACTION` → PostgreSQL `BEGIN` / `COMMIT`)
- Connection string: `postgresql://user:password@localhost:5432/ttc`

**Example Conversion:**
```javascript
// OLD (SQLite)
import Database from 'better-sqlite3';
const db = new Database(process.env.DB_PATH);
const result = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);

// NEW (PostgreSQL)
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
```

### Phase 4: Schema Migration Script (2-3 hours)
1. Export existing SQLite data to SQL/JSON
2. Convert schema to PostgreSQL-compatible SQL
3. Import data into PostgreSQL
4. Verify data integrity

**Tools:**
- `sqlite3` command-line tool to export
- Manual schema conversion script
- Or use `pgloader` tool (can migrate SQLite → PostgreSQL automatically)

### Phase 5: Update All Route Files (3-4 hours)
- Change `.get()`, `.all()`, `.run()` calls to `pool.query()`
- Convert parameterized queries from `?` to `$1, $2, ...`
- Add `async/await` where needed
- Update error handling

### Phase 6: Testing (2-3 hours)
- Test all CRUD operations
- Test concurrent writes (simulate multiple users)
- Performance testing
- Data integrity checks

**Total Estimated Time:** 10-15 hours

---

## PostgreSQL Connection String

Add to `server/.env`:
```
DATABASE_URL=postgresql://ttc_user:your_secure_password@localhost:5432/ttc
# Or with connection details:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ttc
POSTGRES_USER=ttc_user
POSTGRES_PASSWORD=your_secure_password
```

---

## Recommended Connection Pool Settings

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,           // Maximum connections in pool
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Wait max 2s for connection
});
```

---

## Schema Conversion Notes

### Auto-increment IDs
```sql
-- SQLite
id INTEGER PRIMARY KEY AUTOINCREMENT

-- PostgreSQL
id SERIAL PRIMARY KEY
-- or for larger IDs:
id BIGSERIAL PRIMARY KEY
```

### Foreign Keys
Both work similarly, but PostgreSQL syntax:
```sql
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
```

### Indexes
Same syntax, but PostgreSQL supports more types:
```sql
CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_quests_campaign ON quests(campaign_id);
```

---

## Migration Tools

### Option 1: Manual Migration Script
1. Export SQLite schema: `sqlite3 codex.db .schema > schema.sql`
2. Export data: `sqlite3 codex.db .dump > data.sql`
3. Convert manually or with search/replace
4. Import to PostgreSQL: `psql -d ttc -f converted_schema.sql`

### Option 2: pgloader (Automatic)
```bash
# Install pgloader
brew install pgloader  # macOS
# or
apt-get install pgloader  # Linux

# Migrate
pgloader sqlite:///path/to/codex.db postgresql://user:pass@localhost/ttc
```

### Option 3: Custom Node.js Script
Write a script that:
1. Reads from SQLite
2. Transforms data types if needed
3. Inserts into PostgreSQL with proper types

---

## Docker Compose Update

Update `docker-compose.yml`:
```yaml
services:
  backend:
    # ... existing config ...
    environment:
      DATABASE_URL: postgresql://ttc_user:ttc_password@postgres:5432/ttc
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ttc
      POSTGRES_USER: ttc_user
      POSTGRES_PASSWORD: ttc_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres-data:
```

---

## When to Migrate?

**Migrate now if:**
- You're already seeing write lock issues with 2+ users
- You want to future-proof for growth
- You want better operational tooling

**Can wait if:**
- Currently single-user or very light usage
- Want to focus on features first
- SQLite is working fine for your use case

**Recommendation:** Since you mentioned wanting multiple users (<10), I'd suggest migrating **after** you've completed the visibility toggle feature. That way you're not juggling two major changes at once, and the visibility feature will be ready to work with a more robust database backend.

---

## Rollback Plan

If you need to rollback:
1. Keep SQLite code in a branch
2. Database: PostgreSQL can export to SQL, but easier to keep SQLite backup
3. Quick rollback: switch npm packages and connection string back

---

## Additional Resources

- [node-postgres Documentation](https://node-postgres.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgloader Documentation](https://pgloader.readthedocs.io/)
- [SQLite to PostgreSQL Migration Guide](https://www.postgresql.org/docs/current/migration.html)
