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

**For Local Network Deployment:**
```bash
# Build and start all services (direct port access)
docker compose up -d --build

# View logs to ensure everything starts correctly
docker compose logs -f
```

**For Public/Production Deployment with HTTPS:**
```bash
# Use production compose (includes Nginx Proxy Manager, internal-only services)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs to ensure everything starts correctly
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

See the [Public / HTTPS Deployment](#public--https-deployment-production) section below for complete setup instructions.

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
   - **Local deployment:** 
     - Frontend: `http://YOUR_NAS_IP` (or the port you configured)
     - Mailpit UI: `http://YOUR_NAS_IP:8025` (to view emails)
   - **Production deployment (with Nginx Proxy Manager):**
     - Frontend: `https://app.yourdomain.com` (or your configured domain)
     - Backend API: `https://api.yourdomain.com`
     - NPM Admin: `http://YOUR_NAS_IP:81` (internal access only)
     - Mailpit: Access via reverse proxy or `http://YOUR_NAS_IP:8025` (internal only)

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

## Public / HTTPS Deployment (Production)

For public internet access with HTTPS, you can use either:
- **Cloudflare Tunnel** (recommended - no port forwarding needed, easier setup)
- **Nginx Proxy Manager** (included in production compose - requires port forwarding)

### Cloudflare Tunnel Setup (Recommended)

**Benefits:**
- ✅ No port forwarding needed on router
- ✅ Automatic HTTPS via Cloudflare
- ✅ DDoS protection included
- ✅ No public IP exposure
- ✅ Free SSL certificates
- ✅ Works behind NAT/firewall

**Setup Steps:**

1. **Install Cloudflare Tunnel** (cloudflared) on your NAS/server
   - See: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

2. **Configure Cloudflare Tunnel:**
   ```yaml
   # config.yml example
   tunnel: your-tunnel-id
   credentials-file: /path/to/credentials.json
   
   ingress:
     - hostname: app.yourdomain.com
       service: http://localhost:80
     - hostname: api.yourdomain.com
       service: http://localhost:5000
     - service: http_status:404
   ```

3. **Start your Docker containers:**
   ```bash
   # With Cloudflare Tunnel, you need ports exposed on localhost
   # Option 1: Use test compose (exposes ports for Cloudflare Tunnel)
   docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build
   
   # Option 2: Modify docker-compose.yml to expose ports, then:
   # docker compose up -d --build
   ```
   
   **Important:** Cloudflare Tunnel connects to `localhost:80` and `localhost:5000`, so these ports must be exposed on the host. The base `docker-compose.yml` uses `ports: []` (internal-only) which won't work with Cloudflare Tunnel. Use `docker-compose.test.yml` to expose ports, or manually add port mappings.

4. **Configure CORS in `.env`:**
   ```env
   # Use your public Cloudflare domain (what users see in browser)
   ALLOWED_ORIGINS=https://app.yourdomain.com
   
   # Or if using same domain for frontend/backend:
   ALLOWED_ORIGINS=https://yourdomain.com
   
   # Frontend URL
   FRONTEND_URL=https://app.yourdomain.com
   ```

5. **Debug CORS issues:**
   - Check backend logs: `docker compose logs backend | grep CORS`
   - The origin should be your Cloudflare domain (e.g., `https://app.yourdomain.com`)
   - If CORS errors, verify `ALLOWED_ORIGINS` matches exactly (including `https://`)

**Note:** With Cloudflare Tunnel, you don't need `docker-compose.prod.yml` since Cloudflare handles the reverse proxy. Use the base `docker-compose.yml` and expose ports as needed.

### Security Requirements

**⚠️ CRITICAL: Do NOT expose the following services directly to the internet:**
- ❌ **PostgreSQL** - Internal-only (already configured)
- ❌ **Mailpit** - Internal-only or via reverse proxy with authentication
- ❌ **Backend API** - Access via reverse proxy only
- ❌ **Frontend** - Access via reverse proxy only

**✅ ONLY expose:**
- ✅ **Port 80** (HTTP) - For Let's Encrypt certificate challenges
- ✅ **Port 443** (HTTPS) - Main application access
- ✅ **Port 81** (Admin) - Nginx Proxy Manager admin UI (internal access only)

### Using Production Compose

```bash
# Use production compose (includes Nginx Proxy Manager)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Setting Up Nginx Proxy Manager

1. **Access NPM Admin UI:**
   - Navigate to `http://YOUR_NAS_IP:81`
   - Default login: `admin@example.com` / `changeme`
   - **Change password immediately!**

2. **Configure SSL Certificates:**
   - Go to "SSL Certificates" tab
   - Click "Add SSL Certificate"
   - Use "Let's Encrypt" for automatic certificates
   - Enter your domain(s) (e.g., `app.yourdomain.com`, `api.yourdomain.com`)

3. **Create Proxy Host for Frontend:**
   - Go to "Proxy Hosts" tab → "Add Proxy Host"
   - **Details:**
     - Domain Names: `app.yourdomain.com` (or `yourdomain.com`)
     - Forward Hostname/IP: `ttc-frontend` (container name)
     - Forward Port: `80`
     - Block Common Exploits: ✅ Enabled
     - Websockets Support: ✅ Enabled
   - **SSL:**
     - SSL Certificate: Select your Let's Encrypt certificate
     - Force SSL: ✅ Enabled
     - HTTP/2 Support: ✅ Enabled

4. **Create Proxy Host for Backend API:**
   - "Add Proxy Host"
   - **Details:**
     - Domain Names: `api.yourdomain.com`
     - Forward Hostname/IP: `ttc-backend` (container name)
     - Forward Port: `5000`
     - Block Common Exploits: ✅ Enabled
     - Websockets Support: ✅ Enabled (if needed)
   - **SSL:**
     - SSL Certificate: Select your Let's Encrypt certificate
     - Force SSL: ✅ Enabled
     - HTTP/2 Support: ✅ Enabled

5. **Optional: Mailpit Access (via Reverse Proxy):**
   - Only if you want to access Mailpit UI from the internet
   - Create proxy host for `mailpit.yourdomain.com` → `ttc-mailpit:8025`
   - **Add Authentication:** Use NPM's "Access Lists" to require authentication
   - **OR** use IP whitelisting to restrict to your IP only

### Environment Variables for Production

Update your `.env` file:

```env
# Frontend URL - Your public domain
FRONTEND_URL=https://app.yourdomain.com

# CORS - Allow your frontend domain
# CORS Configuration (for Cloudflare Tunnel or reverse proxy)
# If using Cloudflare Tunnel:
#   - Same domain: ALLOWED_ORIGINS=https://yourdomain.com
#   - Subdomains: ALLOWED_ORIGINS=https://app.yourdomain.com (frontend domain only)
# If using Nginx Proxy Manager:
#   - ALLOWED_ORIGINS=https://app.yourdomain.com (frontend domain)
ALLOWED_ORIGINS=https://app.yourdomain.com

# Nginx Proxy Manager ports (if using custom ports)
NPM_HTTP_PORT=80      # HTTP (for Let's Encrypt)
NPM_HTTPS_PORT=443    # HTTPS (main access)
NPM_ADMIN_PORT=81     # Admin UI (internal only)

# Backend CORS - Set to your frontend domain
# The backend will automatically use FRONTEND_URL for CORS if ALLOWED_ORIGINS is empty
```

### Router/Firewall Configuration

**Port Forwarding (on your router):**
- Forward **Port 80** → Your NAS IP (for Let's Encrypt)
- Forward **Port 443** → Your NAS IP (for HTTPS access)
- **DO NOT forward:** 5432 (PostgreSQL), 5000 (Backend), 8025 (Mailpit)

**Firewall Rules:**
- Allow incoming: 80, 443
- Block all other incoming ports to your NAS
- Backend services are only accessible via Docker internal network

### Testing Public Access

1. **Verify HTTPS works:**
   ```bash
   curl -I https://app.yourdomain.com
   # Should return 200 OK
   ```

2. **Verify API access:**
   ```bash
   curl https://api.yourdomain.com/api/health
   # Should return: {"ok":true,"status":"healthy"}
   ```

3. **Check CORS headers:**
   - Browser DevTools → Network tab
   - Verify `Access-Control-Allow-Origin` includes your frontend domain

### DNS Configuration

Point your domain's DNS to your NAS's public IP:
- `A Record`: `app.yourdomain.com` → `YOUR_PUBLIC_IP`
- `A Record`: `api.yourdomain.com` → `YOUR_PUBLIC_IP`
- `A Record`: `yourdomain.com` → `YOUR_PUBLIC_IP` (if using root domain)

### Recommended Subdomains

- **Frontend:** `app.yourdomain.com` or `yourdomain.com`
- **API:** `api.yourdomain.com`
- **Mailpit (optional):** `mailpit.yourdomain.com` (with authentication)

## Production Recommendations

1. **Use HTTPS:** ✅ Required for public deployment (via Nginx Proxy Manager)
2. **Change all default passwords:** Database, JWT secret, NPM admin password
3. **Set up backups:** Regular database and file backups
4. **Monitor logs:** Set up log rotation and monitoring
5. **Update regularly:** Keep Docker images and dependencies updated
6. **Use a domain:** ✅ Required for HTTPS/SSL certificates
7. **Enable firewall:** Block all ports except 80, 443 on your router
8. **Restrict Mailpit access:** Use authentication or IP whitelisting if exposing
9. **Regular security updates:** Keep your NAS/server OS updated

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
