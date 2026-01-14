# Table Top Codex

A self-hosted full-stack web app that helps Game Masters organize tabletop RPG campaigns.

## 🚀 Quick Start

### Development (Local)

**Backend:**
```bash
cd server
npm install
npm start
```
Server runs on port 5050 (or set `PORT` in `.env`)

**Frontend:**
```bash
cd client
npm install
npm run dev
```
Client runs on port 5173 with Vite dev server

### Production (Docker on NAS/Server)

**See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for complete deployment guide.**

Quick steps:
1. Clone repository
2. Copy `.env.example` to `.env` and configure
3. `docker compose up -d --build`
4. Access at `http://YOUR_NAS_IP`

## 📚 Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete guide for deploying to NAS/server
- **[Email Setup](docs/EMAIL_SETUP.md)** - Configure email services for password reset
- **[Self-Hosted Email](docs/SELF_HOSTED_EMAIL.md)** - Mailpit setup for local email catching

## 🛠 Tech Stack

- Frontend: React 18 + Vite + Material UI (MUI v5)
- Backend: Node 22 + Express 5 (ES Modules)
- Database: PostgreSQL 16
- Container: Docker & Docker Compose
- Email: Mailpit (local SMTP) or Gmail/SendGrid/Mailgun

## 📋 Features

- Campaign Management
- Character Sheets (D&D 5e style)
- NPCs, Antagonists, Creatures
- Locations & Factions
- World Information
- Session Notes
- Quests with Objectives & Milestones
- Wiki-style linking between entities
- Image uploads
- Tagging system
- Player/DM roles and visibility controls
- Password reset functionality

## ⚙️ Configuration

All configuration is done via environment variables:
- Copy `.env.example` to `.env` for Docker deployment
- Copy `server/.env.example` to `server/.env` for local development
- See deployment guide for details

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt)
- SQL injection protection (parameterized queries)
- XSS protection (DOMPurify)
- CORS configuration
- Rate limiting
- Security headers

## 📝 License

Self-hosted - use as you wish!

---

## Rate Limiting & Search Behavior

Table Top Codex is designed to support **search-heavy workflows** (wiki linking, live filters, autocomplete) while maintaining strong API protection and abuse prevention.

### Overview

The API uses **method-based rate limiting** and correctly resolves real client IPs when running behind **Cloudflare Tunnel / reverse proxies**.

Rate limits are applied per client IP and reset every 15 minutes.

### Rate Limit Buckets

#### Read Requests (GET / HEAD / OPTIONS)
- **Limit:** 20,000 requests / 15 minutes
- **Purpose:**  
  Supports live search, wiki linking, autocomplete, and filtering without triggering 429 errors.
- **Examples:**  
  - Creature search  
  - Wiki link entity lookups  
  - Campaign browsing  

#### Write Requests (POST / PUT / PATCH / DELETE)
- **Limit:** 4,000 requests / 15 minutes
- **Purpose:**  
  Prevents abuse while allowing normal campaign creation and editing.

#### Authentication Endpoints (`/api/auth`)
- **Limit:** 50 requests / 15 minutes
- **Purpose:**  
  Protects against brute-force login attempts.
- **Behavior:**  
  Returns a clear error message when exceeded.

### Cloudflare & Proxy Awareness

The backend correctly resolves client IPs using:
- `cf-connecting-ip`
- `x-forwarded-for`
- Express `trust proxy` configuration

This ensures:
- Accurate rate limiting per real user
- No accidental global throttling behind Cloudflare

### Frontend Search Optimization

To further reduce unnecessary API load:
- Search inputs (e.g. Creatures page) use **debounced queries**
- API calls are delayed until the user pauses typing
- Role lookups and search requests are handled independently

### Result

- Wiki linking and live search work smoothly
- No unintended 429 errors during normal use
- Security controls remain intact
- Scales cleanly for multiple concurrent players and DMs

---

