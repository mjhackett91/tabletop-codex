# Table Top Codex

A self-hosted full-stack web app that helps Game Masters organize tabletop RPG campaigns.

## Quick Start

### Backend (Server)
```bash
cd server
npm start
```
Server runs on port 5000

### Frontend (Client)
```bash
cd client
npm run dev
```
Client runs on port 5173

## Tech Stack
- Frontend: React 18 + Vite + Material UI (MUI v5)
- Backend: Node 22 + Express 5 (ES Modules) + Better-SQLite3
- Database: SQLite (local file db/ttc.db)

## Testing Campaign CRUD

1. Start both servers (see Quick Start above)
2. Navigate to http://localhost:5173/campaigns
3. Test features:
   - **Create**: Click the + button to add a new campaign
   - **Read**: View campaigns in the table
   - **Update**: Click the edit icon to modify a campaign
   - **Delete**: Click the delete icon to remove a campaign
4. Database is automatically created at `db/ttc.db` on first run
