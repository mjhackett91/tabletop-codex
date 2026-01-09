// server/middleware/participantAccess.js - Middleware for participant access control
// ⚠️ DEV MODE: Supports simulated roles via X-Dev-Simulated-Role header
import { hasCampaignAccess, isCampaignDM, getUserCampaignRole } from "../utils/participantAccess.js";

/**
 * Middleware to require campaign access (owner or participant)
 */
export function requireCampaignAccess(req, res, next) {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    // Parse campaignId as integer
    const campaignIdInt = parseInt(campaignId, 10);
    if (isNaN(campaignIdInt)) {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }

    const hasAccess = hasCampaignAccess(campaignIdInt, userId, req);
    console.log(`[requireCampaignAccess] Campaign ${campaignIdInt}, User ${userId}, Has Access: ${hasAccess}`);
    
    if (!hasAccess) {
      return res.status(403).json({ error: "You are not a participant in this campaign" });
    }

    // Attach user's role to request for use in route handlers
    // Pass req to check for dev simulated role
    req.userCampaignRole = getUserCampaignRole(campaignIdInt, userId, req);
    console.log(`[requireCampaignAccess] User role: ${req.userCampaignRole}`);
    next();
  } catch (error) {
    console.error("Error in requireCampaignAccess:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

/**
 * Middleware to require DM access
 */
export function requireCampaignDM(req, res, next) {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    // Parse campaignId as integer
    const campaignIdInt = parseInt(campaignId, 10);
    if (isNaN(campaignIdInt)) {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }

    if (!isCampaignDM(campaignIdInt, userId, req)) {
      return res.status(403).json({ error: "DM access required" });
    }

    req.userCampaignRole = "dm";
    next();
  } catch (error) {
    console.error("Error in requireCampaignDM:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export default {
  requireCampaignAccess,
  requireCampaignDM
};
