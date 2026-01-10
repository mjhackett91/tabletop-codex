# Git Branch Strategy

## Current Branches

- **`main`** - Original SQLite-based version (preserved)
- **`feature/mvp-auth-content`** - Feature development branch
- **`postgresql-migration`** - PostgreSQL migration branch (new)

## Branch Purpose

### `postgresql-migration` Branch
- **Contains:** Full PostgreSQL migration with all features
- **Purpose:** Production-ready deployment version
- **Use for:** NAS/server deployment
- **Status:** Ready for deployment

### `main` / `feature/mvp-auth-content` Branches
- **Contains:** Original SQLite implementation
- **Purpose:** Rollback option if needed
- **Use for:** Development or if PostgreSQL issues occur
- **Status:** Preserved for historical reference

## SQLite Code Preservation

The SQLite code is preserved in:
- `server/db.js` - Original SQLite database connection (not imported, but kept in repo)
- Previous commits contain full SQLite implementation

To rollback to SQLite:
1. Switch to `main` or `feature/mvp-auth-content` branch
2. The SQLite code is already there
3. Run `npm install better-sqlite3` in server directory
4. Change `server/index.js` import from `db-pg.js` to `db.js`

## Deployment Recommendation

**For NAS deployment, use `postgresql-migration` branch:**
```bash
git clone <repo-url>
cd tabletop-codex
git checkout postgresql-migration
```

This ensures you get the latest PostgreSQL implementation with all features.
