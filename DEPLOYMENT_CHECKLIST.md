# Deployment Checklist

Use this checklist when deploying Table Top Codex to your NAS/server.

## Pre-Deployment (Before Git Push)

- [x] All code is tested and working
- [x] No hardcoded IPs or URLs (everything uses environment variables)
- [x] `.env.example` file created with all configuration options
- [x] `.env` is in `.gitignore` (won't be committed)
- [x] `docker-compose.yml` uses environment variables for all configurable values
- [x] Documentation complete (`docs/DEPLOYMENT.md`)

## On Your NAS/Server (After Git Clone)

### Step 1: Environment Setup
- [ ] Cloned repository to desired location
- [ ] Copied `.env.example` to `.env`
- [ ] Opened `.env` file for editing

### Step 2: Required Configuration
- [ ] Set `FRONTEND_URL` to your NAS IP or domain
  - Example: `FRONTEND_URL=http://192.168.1.100`
  - Or: `FRONTEND_URL=https://yourdomain.com`
- [ ] Generated and set `JWT_SECRET` (run: `openssl rand -base64 32`)
- [ ] Changed `POSTGRES_PASSWORD` from default value

### Step 3: Optional Configuration
- [ ] Changed port numbers if they conflict with other services
  - `BACKEND_PORT`, `FRONTEND_PORT`, `MAILPIT_UI_PORT`, etc.
- [ ] Set `APP_NAME` if you want a custom name
- [ ] Configured `EMAIL_FROM` if you want custom sender address
- [ ] Set `ALLOWED_ORIGINS` if using custom domain with CORS

### Step 4: Deployment
- [ ] Run `docker compose up -d --build`
- [ ] Check logs: `docker compose logs -f`
- [ ] Verify all services are running: `docker compose ps`
- [ ] All services show "Up" status

### Step 5: Verification
- [ ] Can access frontend: `http://YOUR_NAS_IP`
- [ ] Can access Mailpit UI: `http://YOUR_NAS_IP:8025`
- [ ] API health check works: `curl http://YOUR_NAS_IP:5000/api/health`
- [ ] Can register a new user
- [ ] Can log in
- [ ] Password reset emails appear in Mailpit UI

### Step 6: Security Check
- [ ] `.env` file is NOT committed to Git
- [ ] Default passwords changed
- [ ] JWT_SECRET is strong and unique
- [ ] Firewall rules configured (if applicable)
- [ ] Regular backups scheduled (database + uploads)

### Step 7: Public Launch Checklist (If Exposing to Internet)
- [ ] Using `docker-compose.prod.yml` for production deployment
- [ ] PostgreSQL is **NOT** exposed on host (no port mapping)
- [ ] Mailpit is **NOT** publicly exposed (or behind auth proxy)
- [ ] Backend is **NOT** directly exposed (using `expose:` only)
- [ ] Frontend is **NOT** directly exposed (using `expose:` only)
- [ ] Nginx Proxy Manager is configured and running
- [ ] Only ports 80 and 443 are forwarded from router to NAS
- [ ] **DO NOT forward:** 5432 (PostgreSQL), 5000 (Backend), 8025 (Mailpit), 81 (NPM Admin)
- [ ] SSL certificates configured in Nginx Proxy Manager
- [ ] Frontend proxy host configured (`app.yourdomain.com` → `ttc-frontend:80`)
- [ ] Backend proxy host configured (`api.yourdomain.com` → `ttc-backend:5000`)
- [ ] `FRONTEND_URL` set to HTTPS domain (e.g., `https://app.yourdomain.com`)
- [ ] `ALLOWED_ORIGINS` configured for CORS
- [ ] NPM admin password changed from default
- [ ] Mailpit access (if public) has authentication/IP whitelisting
- [ ] Firewall blocks all ports except 80, 443
- [ ] DNS records point to your public IP
- [ ] Tested HTTPS access from external network

## Post-Deployment

- [ ] Bookmarked Mailpit UI for password reset links
- [ ] Shared access instructions with users (if needed)
- [ ] Documented your specific configuration for future reference
- [ ] Set up automated backups (recommended)

## Troubleshooting Reference

If something doesn't work:
1. Check logs: `docker compose logs -f [service-name]`
2. Verify environment variables match your setup
3. Check port conflicts: `sudo lsof -i :PORT`
4. Verify `.env` file exists and has correct values
5. See `docs/DEPLOYMENT.md` for detailed troubleshooting

## Quick Commands

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps

# Rebuild after changes
docker compose up -d --build

# View Mailpit emails
# Open http://YOUR_NAS_IP:8025
```
