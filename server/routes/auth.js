// server/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { get, query } from "../db-pg.js";
import { sendPasswordResetEmail, isConfigured } from "../utils/email.js";

const router = express.Router();

// In production, JWT_SECRET must be set via environment variable
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is required in production");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-dev-only";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password required" });
    }

    // Strengthen password requirements
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    
    // Check for basic password complexity (at least one letter and one number)
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one letter and one number" });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    
    // Sanitize username (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: "Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens" });
    }

    // Check if user exists
    const existing = await get("SELECT id FROM users WHERE username = $1 OR email = $2", [username, email]);
    if (existing) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [username, email, passwordHash]
    );

    const userId = result.rows[0].id;
    const token = jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: userId, username, email }
    });
  } catch (error) {
    console.error("Registration error:", error);
    // Don't expose internal error details to clients
    res.status(500).json({ error: "Failed to register user. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Trim whitespace and remove any hidden characters (iOS Safari autofill sometimes adds them)
    const trimmedUsername = typeof username === "string" ? username.trim().replace(/\u200B/g, '') : username;
    
    // More aggressive password sanitization - remove all whitespace and control characters
    let trimmedPassword = password;
    if (typeof password === "string") {
      // Remove all types of whitespace (spaces, tabs, newlines, etc.)
      trimmedPassword = password.replace(/\s+/g, '');
      // Remove zero-width spaces and other invisible characters
      trimmedPassword = trimmedPassword.replace(/[\u200B-\u200D\uFEFF]/g, '');
      // Remove control characters
      trimmedPassword = trimmedPassword.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // Log request details (don't log actual password, just length and first char for debugging)
    console.log(`[Login] Attempt from IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`[Login] Username: ${trimmedUsername}`);
    console.log(`[Login] Original password length: ${password?.length || 0}, Trimmed length: ${trimmedPassword?.length || 0}`);
    console.log(`[Login] User-Agent: ${req.get("user-agent") || "unknown"}`);
    
    // Log first and last character codes for debugging (not the actual characters)
    if (typeof password === "string" && password.length > 0) {
      console.log(`[Login] First char code: ${password.charCodeAt(0)}, Last char code: ${password.charCodeAt(password.length - 1)}`);
    }

    // Find user
    const user = await get("SELECT * FROM users WHERE username = $1 OR email = $1", [trimmedUsername]);
    if (!user) {
      console.log(`[Login] User not found: ${trimmedUsername}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`[Login] User found: ${user.username} (ID: ${user.id})`);

    // Verify password
    // Try with trimmed password first
    let valid = await bcrypt.compare(trimmedPassword, user.password_hash);
    
    // If that fails and original password was different, try original (in case trimming removed important chars)
    if (!valid && password !== trimmedPassword) {
      console.log(`[Login] Trimmed password failed, trying original password`);
      valid = await bcrypt.compare(password, user.password_hash);
    }
    
    if (!valid) {
      console.log(`[Login] Password mismatch for user: ${user.username}`);
      console.log(`[Login] Received password length: ${password?.length || 0}, Trimmed length: ${trimmedPassword?.length || 0}`);
      // Log password hash prefix for debugging (first 10 chars only)
      console.log(`[Login] Stored hash prefix: ${user.password_hash?.substring(0, 10)}...`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`[Login] Authentication successful for user: ${user.username}`);

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    // Don't expose internal error details to clients
    res.status(500).json({ error: "Failed to login. Please try again." });
  }
});

// POST /api/auth/forgot-password
// Request password reset - generates token and optionally sends email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Find user by email
    const user = await get("SELECT id, username, email FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    
    // Always return success message to prevent email enumeration
    // In production, you might want to add rate limiting here
    const responseMessage = {
      message: "If an account with that email exists, a password reset link has been sent."
    };

    if (!user) {
      // User doesn't exist, but don't reveal this
      return res.json(responseMessage);
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidate any existing unused tokens for this user
    await query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [user.id]
    );

    // Store reset token in database
    await query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, resetToken, expiresAt]
    );

    // Construct reset URL
    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Attempt to send email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, resetUrl);

    // If email is not configured (development/self-hosted), return token in response
    if (!isConfigured() || process.env.NODE_ENV === "development") {
      console.log(`[Password Reset] Token for ${user.email}: ${resetToken}`);
      console.log(`[Password Reset] Reset URL: ${resetUrl}`);
      
      // Only include dev info if email failed to send OR in development mode
      if (!emailSent || process.env.NODE_ENV === "development") {
        return res.json({
          ...responseMessage,
          dev: {
            token: resetToken,
            resetUrl: resetUrl,
            expiresAt: expiresAt.toISOString(),
            note: emailSent ? "Email also sent" : "Email not configured - use this link"
          }
        });
      }
    }

    // If email was sent successfully, just return success message
    res.json(responseMessage);
  } catch (error) {
    console.error("Forgot password error:", error);
    // Don't expose internal error details
    res.status(500).json({ error: "Failed to process password reset request. Please try again." });
  }
});

// POST /api/auth/reset-password
// Reset password using token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    // Validate password requirements
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one letter and one number" });
    }

    // Find valid, unused, non-expired token
    const resetToken = await get(`
      SELECT prt.*, u.id as user_id, u.email, u.username
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 
        AND prt.used = FALSE 
        AND prt.expires_at > NOW()
      ORDER BY prt.created_at DESC
      LIMIT 1
    `, [token]);

    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    await query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
      [resetToken.id]
    );

    // Invalidate all other unused tokens for this user
    await query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE AND id != $2",
      [resetToken.user_id, resetToken.id]
    );

    res.json({ 
      message: "Password reset successfully. You can now login with your new password." 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

export default router;
