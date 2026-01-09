# Email Setup Guide for Password Reset

This guide explains how to configure email sending for password reset functionality in Table Top Codex.

## Why Email is Needed

When users request a password reset, they need to receive a secure link via email to reset their password. Without email configured, the system will show the reset link in the UI (development mode only).

## Quick Start Options

### Option 1: Gmail (Easiest for Small Deployments) ⭐ Recommended for Testing

**Pros:**
- Free
- Easy to set up
- Good for personal/small projects

**Cons:**
- Not ideal for high volume
- Requires 2FA and App Password

**Setup Steps:**

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Table Top Codex" as the name
   - Copy the 16-character password (it looks like: `abcd efgh ijkl mnop`)

3. **Add to your `server/.env` file:**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop  # Your 16-char app password (no spaces)
   # Alternative: You can also use SMTP_SERVICE, SMTP_USER, SMTP_PASSWORD
   EMAIL_FROM=your-email@gmail.com
   APP_NAME=Table Top Codex
   FRONTEND_URL=http://localhost:5173  # Your frontend URL
   ```

### Option 2: SendGrid (Recommended for Production) ⭐ Best for Production

**Pros:**
- Free tier: 100 emails/day forever
- Very reliable
- Professional service
- Great for production apps

**Cons:**
- Need to create account
- Requires API key setup

**Setup Steps:**

1. **Create SendGrid Account**
   - Sign up at: https://sendgrid.com
   - Free tier gives you 100 emails/day

2. **Create API Key**
   - Go to Settings → API Keys
   - Create new API Key with "Mail Send" permissions
   - Copy the API key (starts with `SG.`)

3. **Verify Sender Email** (required)
   - Go to Settings → Sender Authentication
   - Verify your sender email address

4. **Add to your `server/.env` file:**
   ```env
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.your-api-key-here
   EMAIL_FROM=noreply@yourdomain.com  # Must be verified in SendGrid
   APP_NAME=Table Top Codex
   FRONTEND_URL=https://yourdomain.com
   ```

### Option 3: Mailgun

**Pros:**
- Good free tier (5,000 emails/month for 3 months)
- Reliable delivery
- Good for development

**Setup Steps:**

1. **Create Mailgun Account** at https://www.mailgun.com
2. **Get SMTP Credentials** from your dashboard
3. **Add to your `server/.env` file:**
   ```env
   EMAIL_SERVICE=mailgun
   MAILGUN_SMTP_LOGIN=postmaster@yourdomain.mailgun.org
   MAILGUN_SMTP_PASSWORD=your-mailgun-password
   EMAIL_FROM=noreply@yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

### Option 4: Mailpit (Self-Hosted - Recommended for NAS) ⭐ Best for Self-Hosted

**Best for:** Running on your own NAS/server where you want to catch emails locally

**Pros:**
- ✅ Already configured in `docker-compose.yml`
- ✅ No external dependencies
- ✅ Web UI to view all emails at `http://your-nas:8025`
- ✅ Zero configuration needed
- ✅ Perfect for password resets (check UI, copy link)
- ✅ No domain/DNS setup required

**Cons:**
- ⚠️ Emails don't actually get delivered (caught locally)
- ⚠️ You need to manually check Mailpit UI for reset links

**Setup:**
1. Already added to `docker-compose.yml` - just run: `docker compose up -d mailpit`
2. View emails at: `http://your-nas-ip:8025`
3. Backend is automatically configured to use Mailpit

**See `docs/SELF_HOSTED_EMAIL.md` for detailed setup instructions.**

### Option 5: Custom SMTP Server

If you have your own email server or use another provider (Outlook, Yahoo, etc.):

**Add to your `server/.env` file:**
```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587  # Usually 587 for TLS or 465 for SSL
SMTP_SECURE=false  # true for 465, false for 587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Common SMTP Settings:**
- **Outlook/Hotmail**: `smtp-mail.outlook.com`, port 587
- **Yahoo**: `smtp.mail.yahoo.com`, port 587
- **Custom Server**: Check with your hosting provider

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EMAIL_SERVICE` or `SMTP_SERVICE` | Optional* | Service type: `gmail`, `sendgrid`, `mailgun` | `gmail` |
| `EMAIL_USER` or `SMTP_USER` | Gmail only | Gmail address | `user@gmail.com` |
| `EMAIL_PASSWORD`, `SMTP_PASSWORD`, or `GMAIL_APP_PASSWORD` | Gmail only | Gmail app password | `abcdefghijklmnop` |
| `SENDGRID_API_KEY` | SendGrid only | SendGrid API key | `SG.abc123...` |
| `MAILGUN_SMTP_LOGIN` | Mailgun only | Mailgun SMTP username | `postmaster@...` |
| `MAILGUN_SMTP_PASSWORD` | Mailgun only | Mailgun SMTP password | `password123` |
| `SMTP_HOST` | Custom SMTP | SMTP server hostname | `smtp.example.com` |
| `SMTP_PORT` | Custom SMTP | SMTP port (587 or 465) | `587` |
| `SMTP_SECURE` | Custom SMTP | Use SSL/TLS (true for 465) | `false` |
| `SMTP_USER` | Custom SMTP | SMTP username | `username` |
| `SMTP_PASSWORD` | Custom SMTP | SMTP password | `password` |
| `EMAIL_FROM` | Recommended | Sender email address | `noreply@yourdomain.com` |
| `APP_NAME` | Optional | App name in emails | `Table Top Codex` |
| `FRONTEND_URL` | Recommended | Frontend URL for reset links | `https://yourdomain.com` |

**For Mailpit (self-hosted):**
```env
SMTP_HOST=mailpit  # Service name in docker-compose.yml
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@tabletopcodex.local
# No SMTP_USER or SMTP_PASSWORD needed (Mailpit accepts any)
```

\* *If no email service is configured, the reset token will be shown in the API response (development mode only)*

## Testing Email Configuration

After setting up your email service:

1. **Restart your server** to load new environment variables
2. **Check server logs** - you should see:
   - `✅ Email service configured successfully` (if configured correctly)
   - `⚠️  No email service configured` (if not configured)
3. **Test password reset:**
   - Go to `/forgot-password` page
   - Enter an email address
   - Check your email inbox for the reset link
   - In development mode, the reset link will also be shown in the UI

## Troubleshooting

### "Email service configuration error"
- **Gmail**: Make sure you're using an App Password, not your regular password
- **SendGrid**: Verify your API key has "Mail Send" permissions
- **Custom SMTP**: Check host, port, and credentials are correct

### Emails not being received
- Check spam/junk folder
- Verify `EMAIL_FROM` is set correctly
- For Gmail/SendGrid: Check sender verification status
- Check server logs for error messages

### "Connection timeout" or "Authentication failed"
- Verify SMTP credentials are correct
- Check firewall isn't blocking SMTP ports (587, 465)
- Try different port: 587 (TLS) or 465 (SSL)
- For Gmail: Make sure 2FA is enabled and using App Password

## Development Mode (No Email Setup)

If you don't configure email (or in development mode), the system will:
- ✅ Still generate reset tokens
- ✅ Show the reset link in the API response (visible in browser console)
- ✅ Allow password reset to work
- ⚠️ Reset links won't be sent via email (manual copy/paste required)

This is fine for local development and self-hosted instances where you can share reset links manually.

## Production Recommendations

For production deployments:

1. **Use SendGrid** - Most reliable and has generous free tier
2. **Set `FRONTEND_URL`** - Must match your actual domain
3. **Use domain email** - `noreply@yourdomain.com` looks more professional
4. **Monitor email delivery** - Check SendGrid/Mailgun dashboard for issues
5. **Set up SPF/DKIM** - Improves email deliverability (SendGrid does this automatically)

## Security Notes

- **Never commit `.env` file** - It's already in `.gitignore`
- **Use App Passwords for Gmail** - Never use your regular password
- **Rotate credentials** - Change email passwords/API keys periodically
- **Monitor usage** - Check email service dashboard for suspicious activity

## How It Works

1. User requests password reset on `/forgot-password` page
2. System generates secure 64-character token (1-hour expiration)
3. Token is stored in `password_reset_tokens` table
4. Email is sent with reset link (if configured) OR token shown in UI (dev mode)
5. User clicks link in email or copies from UI → `/reset-password?token=...`
6. User enters new password
7. System validates token, updates password, marks token as used
8. User redirected to login page

## Code Structure

- **Email Utility**: `server/utils/email.js` - Handles all email sending
- **Auth Routes**: `server/routes/auth.js` - Password reset endpoints
- **Database**: `password_reset_tokens` table stores tokens
- **Frontend**: `client/src/pages/ForgotPassword.jsx` and `ResetPassword.jsx`
