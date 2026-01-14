import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
// Database is now imported from db-pg.js in individual route files
// import db from "./db.js"; // SQLite - deprecated
import authRouter from "./routes/auth.js";
import campaignsRouter from "./routes/campaigns.js";
import charactersRouter from "./routes/characters.js";
import locationsRouter from "./routes/locations.js";
import contentRouter from "./routes/content.js";
import factionsRouter from "./routes/factions.js";
import worldInfoRouter from "./routes/worldInfo.js";
import sessionsRouter from "./routes/sessions.js";
import questsRouter from "./routes/quests.js";
import participantsRouter from "./routes/participants.js";
import creaturesRouter from "./routes/creatures.js";
import imagesRouter from "./routes/images.js";
import tagsRouter from "./routes/tags.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validate required environment variables in production
if (process.env.NODE_ENV === "production") {
  const required = ["JWT_SECRET", "DATABASE_URL"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function getClientIp(req) {
  const cf = req.headers["cf-connecting-ip"];
  if (cf) return String(cf);

  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();

  return req.ip;
}

const app = express();

app.set("trust proxy", 1);


// Security headers
app.use((req, res, next) => {
  
// Prevent XSS
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Prevent MIME type sniffing
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // Content Security Policy (relaxed for development, strict for production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;");
  }
  next();
});

// CORS configuration - restrict origins in production
// Cloudflare Tunnel: If frontend and backend use same domain, set ALLOWED_ORIGINS to that domain
// If using subdomains (app.domain.com / api.domain.com), include the frontend domain
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      console.log("[CORS] Request with no origin header - allowing (server-to-server or direct request)");
      return callback(null, true);
    }
    
    if (process.env.NODE_ENV !== "production") {
      // In development, allow all origins
      console.log(`[CORS] Development mode - allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    // In production, check ALLOWED_ORIGINS
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim().toLowerCase())
      : [];
    
    // Normalize origin for comparison (remove trailing slash, lowercase)
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, "");
    
    // If ALLOWED_ORIGINS is not set, allow the origin (fallback for easier setup)
    // This is less secure but helps with initial deployment behind Cloudflare Tunnel
    if (allowedOrigins.length === 0) {
      console.warn(`⚠️  WARNING: ALLOWED_ORIGINS not set in production. Allowing origin: ${origin} (not recommended for security)`);
      console.warn(`⚠️  Set ALLOWED_ORIGINS in .env to restrict access`);
      return callback(null, true);
    }
    
    // Check if origin matches any allowed origin (with normalization)
    const originMatches = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, "");
      return normalizedOrigin === normalizedAllowed;
    });
    
    if (originMatches) {
      console.log(`[CORS] ✅ Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: ${origin}`);
      console.error(`   Allowed origins: ${allowedOrigins.join(", ")}`);
      console.error(`   Tip: If using Cloudflare Tunnel, set ALLOWED_ORIGINS to your frontend domain`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin} not in allowed list.`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  // Cloudflare Tunnel compatibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting for API endpoints
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20000,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 4000,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  keyGenerator: (req) => getClientIp(req),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:    20, // Limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10mb" })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply general API rate limiting
app.use("/api", (req, res, next) => {
  const m = String(req.method || "").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return readLimiter(req, res, next);
  return writeLimiter(req, res, next);
});


// REQLOG (temporary): log each API request path + resolved client IP
app.use((req, res, next) => {
  const ip = (req.headers["cf-connecting-ip"] || (req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : req.ip));
  console.log("[REQLOG]", req.method, req.originalUrl, "ip=", ip);
  next();
});

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/", (req, res) => {
  res.send("TTC API running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});

// Version/health endpoint to verify deployment
app.get("/api/version", (req, res) => {
  res.json({ 
    version: "1.0.0",
    loginFix: "mobile-password-sanitization",
    timestamp: new Date().toISOString()
  });
});

// Routes - All converted to PostgreSQL
// Apply stricter rate limiting to auth routes
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/campaigns", participantsRouter);
app.use("/api/campaigns", imagesRouter); // Must come before other /:campaignId routes to avoid route conflicts
app.use("/api/campaigns", tagsRouter);
app.use("/api/campaigns", contentRouter);
app.use("/api/campaigns", charactersRouter);
app.use("/api/campaigns", locationsRouter);
app.use("/api/campaigns", factionsRouter);
app.use("/api/campaigns", worldInfoRouter);
app.use("/api/campaigns", sessionsRouter);
app.use("/api/campaigns", questsRouter);
app.use("/api/campaigns", creaturesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: PostgreSQL (${process.env.DATABASE_URL ? "configured" : "not configured"})`);
});