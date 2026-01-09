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
