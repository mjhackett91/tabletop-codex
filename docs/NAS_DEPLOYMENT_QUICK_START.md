# NAS Deployment - Quick Start Guide

**This is a condensed guide for deploying on your NAS. Full details in `DEPLOYMENT.md`.**

## Prerequisites
- Docker and Docker Compose installed
- Git installed
- Your NAS IP address

## Deployment Steps

### 1. Clone & Setup
```bash
cd /path/on/your/nas
git clone <your-repo-url> tabletop-codex
cd tabletop-codex
git checkout postgresql-migration  # Use the PostgreSQL branch
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file:
```bash
nano .env  # or your preferred editor
```

**Required changes:**
```env
# Replace with your NAS IP
FRONTEND_URL=http://192.168.1.100  # ← CHANGE THIS

# Generate: openssl rand -base64 32
JWT_SECRET=your-generated-secret-here  # ← CHANGE THIS

# Change from default
POSTGRES_PASSWORD=your-secure-password  # ← CHANGE THIS
```

### 3. Deploy
```bash
docker compose up -d --build
```

### 4. Verify
```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Access app
# Frontend: http://YOUR_NAS_IP
# Mailpit: http://YOUR_NAS_IP:8025
```

## Quick Troubleshooting

**Port conflict?** Change ports in `.env`:
```env
BACKEND_PORT=5001
FRONTEND_PORT=8080
```

**Can't access from other devices?**
- Check firewall rules
- Verify IP address is correct
- Check `FRONTEND_URL` matches how you're accessing

**Services won't start?**
```bash
docker compose logs -f backend
docker compose logs -f postgres
```

## Common Commands
```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f [service-name]

# Rebuild after code changes
docker compose up -d --build
```

## Access Points
- **Web App:** `http://YOUR_NAS_IP` (or port you configured)
- **Mailpit UI:** `http://YOUR_NAS_IP:8025` (view password reset emails)
- **API Health:** `curl http://YOUR_NAS_IP:5000/api/health`

## Password Reset Workflow
1. User clicks "Forgot Password" and enters email
2. Check Mailpit UI at `http://YOUR_NAS_IP:8025`
3. Find the reset email and copy the link
4. Share link with user (or they can access Mailpit if on network)

## Need Help?
- Full guide: `docs/DEPLOYMENT.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Email setup: `docs/EMAIL_SETUP.md`
