# Deployment Guide - Table Top Codex

This guide walks you through deploying Table Top Codex to your NAS or server using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your NAS/server
- Git installed (to clone the repository)
- Basic knowledge of your NAS's IP address and port availability

## Step-by-Step Deployment

### Step 1: Clone the Repository

On your NAS/server:

```bash
cd /path/to/where/you/want/the/app
git clone <your-repo-url> tabletop-codex
cd tabletop-codex
```

### Step 2: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 3: Configure Environment Variables

Edit the `.env` file with your settings:

```bash
nano .env  # or use your preferred editor
```

**Critical settings to configure:**

1. **FRONTEND_URL** - How users will access your app:
   ```env
   # For local network access (replace with your NAS IP):
   FRONTEND_URL=http://192.168.1.100
   
   # For domain name:
   FRONTEND_URL=https://yourdomain.com
   ```

2. **JWT_SECRET** - Generate a strong secret:
   ```bash
   openssl rand -base64 32
   ```
   Then add to `.env`:
   ```env
   JWT_SECRET=your-generated-secret-here
   ```

3. **Database Password** - Change from default:
   ```env
   POSTGRES_PASSWORD=your-secure-password-here
   ```

4. **Port Configuration** (if needed):
   ```env
   # Only change if ports conflict with other services
   BACKEND_PORT=5000
   FRONTEND_PORT=80
   MAILPIT_UI_PORT=8025
   ```

### Step 4: Build and Start Services

```bash
# Build and start all services
docker compose up -d --build

# View logs to ensure everything starts correctly
docker compose logs -f
```

**Expected output:**
- ✅ All services should start without errors
- ✅ You should see "Email service configured successfully" or Mailpit warnings (both OK)
- ✅ PostgreSQL schema initialized

### Step 5: Verify Deployment

1. **Check all containers are running:**
   ```bash
   docker compose ps
   ```
   All services should show "Up" status.

2. **Access the application:**
   - Frontend: `http://YOUR_NAS_IP` (or the port you configured)
   - Mailpit UI: `http://YOUR_NAS_IP:8025` (to view emails)

3. **Test the API:**
   ```bash
   curl http://YOUR_NAS_IP:5000/api/health
   ```
   Should return: `{"ok":true,"status":"healthy"}`

### Step 6: Create Your First User

1. Go to `http://YOUR_NAS_IP/register`
2. Create an account
3. Login at `http://YOUR_NAS_IP/login`

## Configuration Details

### Port Mapping

By default, these ports are exposed:

| Service | External Port | Internal Port | Purpose |
|---------|---------------|---------------|---------|
| Frontend | 80 | 80 | Web interface |
| Backend | 5000 | 5000 | API |
| PostgreSQL | 5432 | 5432 | Database (keep internal-only if possible) |
| Mailpit UI | 8025 | 8025 | View emails |
| Mailpit SMTP | 1025 | 1025 | SMTP (internal) |
| Nginx | 8080 | 80 | Reverse proxy (optional) |

**To change ports:** Edit the `.env` file and update the corresponding `*_PORT` variables.

### Network Configuration

**For Local Network Access:**
- Set `FRONTEND_URL=http://YOUR_NAS_IP` (e.g., `http://192.168.1.100`)
- Users on your local network can access at `http://192.168.1.100`

**For Domain Access:**
- Set `FRONTEND_URL=https://yourdomain.com`
- Configure DNS to point your domain to your NAS IP
- Set up reverse proxy (nginx/Caddy) for HTTPS

### Email Setup (Mailpit - Already Configured)

Mailpit is already set up and requires no configuration. 

- **View emails:** `http://YOUR_NAS_IP:8025`
- **Password reset links:** Check Mailpit UI and copy the link

To use a different email service (Gmail, SendGrid, etc.), see `docs/EMAIL_SETUP.md`.

## Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f mailpit
```

### Stop Services

```bash
docker compose down
```

### Restart Services

```bash
docker compose restart
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### Backup Database

```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U ttc_user ttc > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U ttc_user ttc < backup.sql
```

### Backup Uploads

```bash
# Copy uploads directory
cp -r uploads/ /path/to/backup/location/
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

1. Check what's using the port:
   ```bash
   sudo lsof -i :5000  # or whatever port
   ```

2. Change the port in `.env`:
   ```env
   BACKEND_PORT=5001  # Use a different port
   ```

3. Restart:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Cannot Access from Other Devices

1. **Check firewall:** Ensure ports are open on your NAS
2. **Check IP address:** Make sure you're using the correct NAS IP
3. **Check FRONTEND_URL:** Must match how you're accessing it

### Database Connection Errors

1. Check PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check logs:
   ```bash
   docker compose logs postgres
   ```

3. Verify environment variables in `.env` match docker-compose.yml

### Email Not Working

1. **Mailpit (default):** Check Mailpit UI at `http://YOUR_NAS_IP:8025`
2. **Other services:** Check `docs/EMAIL_SETUP.md` for configuration
3. **Check logs:**
   ```bash
   docker compose logs backend | grep -i email
   ```

### Frontend Can't Connect to Backend

1. Check `FRONTEND_URL` in `.env` matches how you're accessing the app
2. Verify backend is running: `curl http://YOUR_NAS_IP:5000/api/health`
3. Check CORS settings if using custom domain

## Security Checklist

Before going live:

- [ ] Changed `JWT_SECRET` to a strong random value
- [ ] Changed `POSTGRES_PASSWORD` from default
- [ ] Set `FRONTEND_URL` to your actual domain/IP
- [ ] Configured `ALLOWED_ORIGINS` for CORS (if using custom domain)
- [ ] Verified `.env` is NOT committed to Git
- [ ] Changed default database credentials
- [ ] Configured firewall rules on your NAS
- [ ] Set up HTTPS/SSL (if using domain) - recommended for production
- [ ] Regular backups configured for database and uploads

## Production Recommendations

1. **Use HTTPS:** Set up nginx/Caddy reverse proxy with SSL certificates
2. **Change all default passwords:** Database, JWT secret, etc.
3. **Set up backups:** Regular database and file backups
4. **Monitor logs:** Set up log rotation and monitoring
5. **Update regularly:** Keep Docker images and dependencies updated
6. **Use a domain:** Instead of IP address for better UX

## Quick Reference

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart backend

# Rebuild after code changes
docker compose up -d --build

# Check service status
docker compose ps

# Access database shell
docker compose exec postgres psql -U ttc_user -d ttc

# View Mailpit emails
# Open http://YOUR_NAS_IP:8025 in browser
```

## Getting Help

- Check logs: `docker compose logs -f`
- Review configuration: `docs/EMAIL_SETUP.md`, `docs/SELF_HOSTED_EMAIL.md`
- Verify environment variables: `.env` file
- Check service health: `docker compose ps`
