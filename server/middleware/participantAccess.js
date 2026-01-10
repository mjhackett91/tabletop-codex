// server/middleware/participantAccess.js - Middleware for participant access control
import { hasCampaignAccess, isCampaignDM, getUserCampaignRole } from "../utils/participantAccess.js";

/**
 * Middleware to require campaign access (owner or participant)
 */
export async function requireCampaignAccess(req, res, next) {
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

    const hasAccess = await hasCampaignAccess(campaignIdInt, userId, req);
    
    if (!hasAccess) {
      return res.status(403).json({ error: "You are not a participant in this campaign" });
    }

    // Attach user's role to request for use in route handlers
    req.userCampaignRole = await getUserCampaignRole(campaignIdInt, userId, req);
    next();
  } catch (error) {
    console.error("Error in requireCampaignAccess:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

/**
 * Middleware to require DM access
 */
export async function requireCampaignDM(req, res, next) {
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

    if (!(await isCampaignDM(campaignIdInt, userId, req))) {
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
