// server/middleware/auth.js
import jwt from "jsonwebtoken";

// In production, JWT_SECRET must be set via environment variable
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is required in production");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-dev-only";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, username: decoded.username };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export default authenticateToken;
