// server/utils/email.js - Email sending utility using nodemailer
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create a nodemailer transporter based on environment variables
 * Supports multiple providers: Gmail, SendGrid, Mailgun, custom SMTP
 */
function createTransporter() {
  // Option 1: Gmail (most common for small apps)
  if (process.env.SMTP_SERVICE === "gmail" || process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // Option 2: SendGrid
  if (process.env.SMTP_SERVICE === "sendgrid" || process.env.EMAIL_SERVICE === "sendgrid") {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Option 3: Mailgun
  if (process.env.SMTP_SERVICE === "mailgun" || process.env.EMAIL_SERVICE === "mailgun") {
    return nodemailer.createTransport({
      host: process.env.MAILGUN_SMTP_SERVER || "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_LOGIN,
        pass: process.env.MAILGUN_SMTP_PASSWORD
      }
    });
  }

  // Option 4: Custom SMTP server (including Mailpit for self-hosted)
  if (process.env.SMTP_HOST) {
    const port = parseInt(process.env.SMTP_PORT || "587");
    const isSecure = process.env.SMTP_SECURE === "true" || port === 465;
    const isMailpit = process.env.SMTP_HOST.includes("mailpit") || process.env.SMTP_HOST.includes("localhost") || process.env.SMTP_HOST === "127.0.0.1";
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: isSecure, // true for 465, false for other ports
      // Mailpit accepts any credentials, so auth is optional for local servers
      auth: (process.env.SMTP_USER && process.env.SMTP_PASSWORD) ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      } : undefined,
      // Allow self-signed certificates for local SMTP servers like Mailpit
      tls: isMailpit || process.env.SMTP_REJECT_UNAUTHORIZED === "false" ? {
        rejectUnauthorized: false
      } : undefined
    });
  }

  // No email configured - return null (emails will be skipped)
  return null;
}

let transporter = null;
let emailConfigured = false;

/**
 * Initialize email transporter
 */
export function initEmail() {
  transporter = createTransporter();
  emailConfigured = !!transporter;
  
  if (emailConfigured) {
    // Verify connection
    transporter.verify().then(() => {
      console.log("✅ Email service configured successfully");
    }).catch((error) => {
      console.error("❌ Email service configuration error:", error.message);
      console.error("   Email sending will be disabled. Check your SMTP settings in .env");
    });
  } else {
    console.warn("⚠️  No email service configured. Password reset emails will not be sent.");
    console.warn("   Set SMTP_* environment variables or use EMAIL_SERVICE=gmail|sendgrid|mailgun");
  }
  
  return emailConfigured;
}

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full URL to password reset page
 * @returns {Promise<boolean>} - True if email sent successfully
 */
export async function sendPasswordResetEmail(to, resetToken, resetUrl) {
  if (!emailConfigured || !transporter) {
    console.warn(`[Email] Email not configured. Skipping password reset email to ${to}`);
    console.warn(`[Email] Reset token: ${resetToken}`);
    console.warn(`[Email] Reset URL: ${resetUrl}`);
    return false;
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@tabletopcodex.com";
  const appName = process.env.APP_NAME || "Table Top Codex";

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: to,
    subject: "Password Reset Request",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1a1a1a; color: #d4af37; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">${appName}</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
            <h2 style="color: #1a1a1a; margin-top: 0;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #d4af37; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #d4af37; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
              <strong>This link will expire in 1 hour.</strong><br>
              If you didn't request a password reset, please ignore this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            <p>This is an automated message, please do not reply.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request

      You requested to reset your password for ${appName}.

      Click the following link to reset your password:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request a password reset, please ignore this email.

      This is an automated message, please do not reply.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Password reset email sent to ${to}:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send password reset email to ${to}:`, error.message);
    return false;
  }
}

// Initialize on import
initEmail();

export default {
  sendPasswordResetEmail,
  initEmail,
  isConfigured: () => emailConfigured
};
