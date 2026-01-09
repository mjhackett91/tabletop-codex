import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import authRouter from "./routes/auth.js";
import campaignsRouter from "./routes/campaigns.js";
import contentRouter from "./routes/content.js";
import charactersRouter from "./routes/characters.js";
import locationsRouter from "./routes/locations.js";
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

const app = express();
app.use(cors());
app.use(express.json());

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

// Routes
app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/campaigns", participantsRouter);
// Images router must come before other entity routers to avoid route conflicts
app.use("/api/campaigns", imagesRouter);
// Tags router must come before entity routers to avoid route conflicts
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
  console.log(`Database path: ${process.env.DB_PATH || "./data/codex.db"}`);
});