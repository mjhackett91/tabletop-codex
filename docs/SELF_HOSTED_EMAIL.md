# Self-Hosted Email Setup Guide

This guide explains options for email sending when self-hosting Table Top Codex on your NAS or home server.

## Option 1: Mailpit (Easiest - Recommended for Self-Hosted) ⭐

**Best for:** Self-hosted deployments where you want to catch all emails locally

**Pros:**
- ✅ Super easy setup (just add to docker-compose.yml)
- ✅ No domain/DNS configuration needed
- ✅ Web UI to view all emails at `http://your-nas-ip:8025`
- ✅ Perfect for internal/self-hosted apps
- ✅ Zero configuration
- ✅ Lightweight and fast

**Cons:**
- ⚠️ Emails don't actually get sent to users (caught locally)
- ⚠️ You need to manually share reset links or check the Mailpit UI

**How It Works:**
- All emails are "sent" but caught by Mailpit instead of going to real inboxes
- You can view all emails in a web interface (like a mail catcher)
- Perfect for password reset links - just check Mailpit UI and copy the link

### Setup

1. **Already added to docker-compose.yml** - Just start it:
   ```bash
   docker compose up -d mailpit
   ```

2. **No configuration needed!** The backend is already configured to use Mailpit

3. **View emails:**
   - Open `http://your-nas-ip:8025` in your browser
   - All sent emails will appear here
   - Click on any email to see the full content and copy reset links

4. **Access from other devices:**
   - Make sure port 8025 is accessible on your NAS
   - Visit `http://your-nas-ip:8025` from any device on your network

### Configuration

The backend is already configured in `docker-compose.yml`:
```yaml
environment:
  - SMTP_HOST=mailpit
  - SMTP_PORT=1025
  - SMTP_SECURE=false
  - EMAIL_FROM=noreply@tabletopcodex.local
```

You can customize `EMAIL_FROM` in your `.env` file if desired.

---

## Option 2: Gmail "Send As" (Custom Domain)

**Best for:** You have a domain and want emails to appear from your domain

### Requirements:
- Own a domain (e.g., `yourdomain.com`)
- Access to domain DNS settings
- Gmail account with 2FA enabled

### Setup Steps:

1. **Add domain in Gmail:**
   - Go to Gmail Settings → "Accounts and Import"
   - Click "Send mail as" → "Add another email address"
   - Enter: `noreply@yourdomain.com`
   - Gmail will send a verification code to that address

2. **Set up DNS records** (requires domain DNS access):
   - **SPF Record**: `v=spf1 include:_spf.google.com ~all`
   - **DKIM**: Gmail provides keys to add to your DNS
   - This verifies you own the domain

3. **Configure in `.env`:**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASSWORD=your-gmail-app-password
   EMAIL_FROM=noreply@yourdomain.com  # Your custom domain
   ```

**Note:** This is more complex and requires DNS management. For self-hosted on NAS, Mailpit is much easier.

---

## Option 3: Full SMTP Server (Postfix)

**Best for:** Advanced users who want a production email server

**Pros:**
- Real email delivery
- Full control
- Can send to external email addresses

**Cons:**
- Complex setup
- Requires DNS configuration (MX, SPF, DKIM, DMARC)
- Higher maintenance
- May have deliverability issues (emails go to spam)
- Requires port 25/587 open (often blocked by ISPs)

### Quick Setup with Docker:

```yaml
# Add to docker-compose.yml
postfix:
  image: catatnight/postfix:latest
  container_name: ttc-postfix
  hostname: mail.yourdomain.com
  environment:
    - maildomain=yourdomain.com
    - smtp_user=username:password
  ports:
    - "587:587"
  restart: unless-stopped
```

Then configure:
```env
SMTP_HOST=postfix
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
EMAIL_FROM=noreply@yourdomain.com
```

**Warning:** This is advanced and requires:
- Domain DNS setup (MX records, SPF, DKIM)
- Port forwarding on your router (if external access)
- ISP allowing port 25/587 (many block these)
- Deliverability management (avoiding spam filters)

---

## Recommendation for NAS Deployment

**Use Mailpit** because:
1. ✅ Zero configuration - just works
2. ✅ No domain/DNS needed
3. ✅ Perfect for password resets (check UI, copy link)
4. ✅ Already added to your docker-compose.yml
5. ✅ Web UI to view all emails
6. ✅ No external dependencies

**Workflow:**
1. User requests password reset
2. Check Mailpit UI at `http://your-nas:8025`
3. Find the reset email, copy the link
4. Share link with user manually (or they can check Mailpit if they have access)

This is the standard approach for self-hosted apps where you don't need actual email delivery.

---

## Switching Between Options

You can switch by updating environment variables in `docker-compose.yml` or `.env`:

### To use Mailpit (self-hosted):
```env
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
```

### To use Gmail:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### To use SendGrid (external service):
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-key
EMAIL_FROM=noreply@yourdomain.com
```

### To use Custom SMTP:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
EMAIL_FROM=noreply@yourdomain.com
```

---

## Mailpit Web UI

Once Mailpit is running, access it at:
- **URL**: `http://your-nas-ip:8025`
- **Features**:
  - View all sent emails
  - Search emails
  - See email content (HTML and plain text)
  - Copy links from emails
  - Delete emails
  - Real-time updates

**Tip:** Bookmark `http://your-nas-ip:8025` for easy access to password reset links!
