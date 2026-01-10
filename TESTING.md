# Testing Guide

## Local Testing (Before Production Deployment)

### Option 1: Use Test Compose File (Recommended)

This exposes ports for local testing while keeping production configs clean:

```bash
# Start with test compose (exposes ports)
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build

# Access the app
# Frontend: http://localhost (or http://localhost:80)
# Backend API: http://localhost:5000/api
# Mailpit UI: http://localhost:8025

# Stop when done
docker compose -f docker-compose.yml -f docker-compose.test.yml down
```

### Option 2: Development Mode (Separate Backend/Frontend)

For faster iteration during development:

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm start  # Runs on port 5050 (or PORT env var)
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev  # Runs on port 5173 with Vite proxy
```

Access at: `http://localhost:5173`

## Testing Image Loading Fix

1. **Start the test environment:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build
   ```

2. **Create a test account:**
   - Go to `http://localhost/register`
   - Create a user account

3. **Create a campaign:**
   - Login
   - Create a new campaign
   - Note the campaign ID from the URL

4. **Upload an image:**
   - Go to any entity (Character, Location, etc.)
   - Open the "Images" tab
   - Upload a test image (JPEG, PNG, etc.)

5. **Verify image loads:**
   - Image should appear in the gallery
   - Click image to view full size
   - Check browser console for any errors (F12 → Console)
   - Look for `[ImageGallery]` log messages

6. **Test with browser DevTools:**
   - Open Network tab
   - Filter by "Images" or "Fetch/XHR"
   - Upload an image and check:
     - Request URL should be `/api/campaigns/{id}/images/{id}/file` (relative)
     - Status should be 200
     - Response should be binary/image data

## Testing Registration (403 Error Fix)

### The Problem
403 errors on registration are usually caused by:
1. **CORS misconfiguration** - `ALLOWED_ORIGINS` not set correctly
2. **Rate limiting** - Too many attempts (5 per 15 minutes on auth endpoints)

### How to Test

1. **Test locally first:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.test.yml up -d
   ```
   - This uses `NODE_ENV=development` which allows all CORS origins
   - Registration should work at `http://localhost/register`

2. **Test in production:**
   - Check your `.env` file has `ALLOWED_ORIGINS` set correctly
   - Example: `ALLOWED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com`
   - Make sure there are NO spaces after commas
   - The origin must match EXACTLY (including http/https, port, trailing slash)

3. **Debug CORS issues:**
   ```bash
   # Check backend logs
   docker compose logs -f backend | grep -i cors
   
   # Test API directly
   curl -X POST http://YOUR_BACKEND/api/auth/register \
     -H "Content-Type: application/json" \
     -H "Origin: http://YOUR_FRONTEND" \
     -d '{"username":"test","email":"test@test.com","password":"test123"}'
   ```

4. **Check rate limiting:**
   - If you hit rate limit, wait 15 minutes or restart backend
   - Check logs: `docker compose logs backend | grep -i "rate limit"`

### Fixing CORS in Production

**If using Cloudflare Tunnel (recommended setup):**

**Option 1: Same Domain** (simplest):
- Frontend: `https://yourdomain.com`
- Backend API: `https://yourdomain.com/api` (same domain, different path)
- In your `.env`:
```env
ALLOWED_ORIGINS=https://yourdomain.com
```

**Option 2: Subdomains:**
- Frontend: `https://app.yourdomain.com`
- Backend API: `https://api.yourdomain.com`
- In your `.env`:
```env
ALLOWED_ORIGINS=https://app.yourdomain.com
```
(Only the frontend domain is needed in ALLOWED_ORIGINS)

**If using Nginx Proxy Manager (without Cloudflare):**
- Frontend at: `https://app.yourdomain.com`
- Backend at: `https://api.yourdomain.com`

In your `.env`:
```env
ALLOWED_ORIGINS=https://app.yourdomain.com
```

**Multiple origins:**
```env
ALLOWED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com,https://www.yourdomain.com
```

**Important for Cloudflare Tunnel:**
- Use your **public Cloudflare domain**, not localhost or internal IPs
- The origin seen by your backend will be the domain configured in Cloudflare Tunnel
- Check backend logs to see what origin is actually being sent: `docker compose logs backend | grep CORS`

## Testing Checklist

- [ ] Registration works (no 403 error)
- [ ] Login works
- [ ] Images upload successfully
- [ ] Images display in gallery
- [ ] Images load in full-size preview
- [ ] No CORS errors in browser console
- [ ] All API calls use relative URLs (`/api/...`)
- [ ] No hardcoded URLs in network requests

## Common Issues

### Images Don't Load
- Check browser console for errors
- Verify endpoint is `/api/campaigns/.../images/.../file`
- Check backend logs: `docker compose logs backend | grep -i image`
- Verify image file exists: `docker compose exec backend ls -la /app/uploads/...`

### 403 on Registration
- Check `ALLOWED_ORIGINS` matches frontend URL exactly
- Check browser console for CORS error details
- Verify `NODE_ENV` is set correctly
- Check rate limiting hasn't been triggered

### CORS Errors
- Origin must match exactly (protocol, domain, port)
- Check `ALLOWED_ORIGINS` has no spaces: `origin1,origin2` not `origin1, origin2`
- If using Cloudflare Tunnel, origin might be Cloudflare's URL, not your domain

### Cloudflare Tunnel Specific Issues

**If you're using Cloudflare Tunnel:**

1. **Same Domain Setup** (recommended):
   - Frontend: `https://yourdomain.com`
   - Backend API: `https://yourdomain.com/api` (same domain)
   - In `.env`: `ALLOWED_ORIGINS=https://yourdomain.com`

2. **Subdomain Setup**:
   - Frontend: `https://app.yourdomain.com`
   - Backend API: `https://api.yourdomain.com`
   - In `.env`: `ALLOWED_ORIGINS=https://app.yourdomain.com` (only frontend domain needed)

3. **Finding the actual origin**:
   - Check browser console for CORS errors - it will show the origin being sent
   - Check backend logs: `docker compose logs backend | grep CORS`
   - The origin should be your Cloudflare domain, not the tunnel endpoint

4. **Debugging CORS with Cloudflare Tunnel**:
   ```bash
   # Check what origin is being sent
   docker compose logs backend | grep -i "CORS blocked\|CORS.*Allowed"
   
   # Test from browser console:
   fetch('https://api.yourdomain.com/api/health', { 
     credentials: 'include' 
   }).then(r => r.json()).then(console.log)
   ```

5. **Common Cloudflare Tunnel CORS Fix**:
   - Make sure `ALLOWED_ORIGINS` includes your public-facing domain (the one users see)
   - Don't use localhost or internal IPs in `ALLOWED_ORIGINS`
   - The origin seen by your backend will be the Cloudflare domain, not the tunnel endpoint
