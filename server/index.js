import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import campaignsRouter from "./routes/campaigns.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TTC API running");
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/campaigns", campaignsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));