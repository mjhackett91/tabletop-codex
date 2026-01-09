import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
app.use("/api/campaigns", contentRouter);
app.use("/api/campaigns", charactersRouter);
app.use("/api/campaigns", locationsRouter);
app.use("/api/campaigns", factionsRouter);
app.use("/api/campaigns", worldInfoRouter);
app.use("/api/campaigns", sessionsRouter);
app.use("/api/campaigns", questsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database path: ${process.env.DB_PATH || "./data/codex.db"}`);
});