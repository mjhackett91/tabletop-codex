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

const app = express();

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
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? process.env.ALLOWED_ORIGINS?.split(",") || ["https://your-domain.com"]
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10mb" })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply general API rate limiting
app.use("/api", apiLimiter);

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