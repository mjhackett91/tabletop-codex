# Port Configuration Guide

## Current Setup

- **Server Port**: `5050` (configured via `PORT` environment variable or defaults to `5000`)
- **Vite Proxy**: `http://localhost:5050` (configured in `client/vite.config.js`)
- **Frontend**: `http://localhost:5173` (default Vite dev server)

## Important Notes

1. **Port Mismatch Risk**: If `PORT` is not set, the server defaults to `5000`, but Vite proxy expects `5050`
   - **Solution**: Always set `PORT=5050` in `server/.env` or export it before starting the server

2. **Checking Port**: 
   ```bash
   # Check what port the server is using
   lsof -i :5050 | grep LISTEN
   curl http://localhost:5050/api/ping
   ```

3. **Startup Commands**:
   ```bash
   # Backend (from server directory)
   PORT=5050 node index.js
   # OR if PORT is in .env
   node index.js
   
   # Frontend (from client directory)
   npm run dev
   ```

4. **Docker/Production**: The `VITE_API_URL` environment variable is used in production builds instead of the Vite proxy.
