// server/utils/campaignOwnership.js - Shared campaign ownership checker
import db from "../db.js";

/**
 * Verify that a campaign belongs to the authenticated user
 * @param {number} campaignId - Campaign ID to check
 * @param {number} userId - Authenticated user ID
 * @returns {boolean} True if owned, false otherwise
 */
export function verifyCampaignOwnership(campaignId, userId) {
  const campaign = db
    .prepare("SELECT id FROM campaigns WHERE id = ? AND user_id = ?")
    .get(campaignId, userId);
  
  return campaign !== undefined;
}

/**
 * Middleware to check campaign ownership
 */
export function requireCampaignOwnership(req, res, next) {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    console.log("requireCampaignOwnership - campaignId:", campaignId, "userId:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!campaignId) {
      return res.status(400).json({ error: "Campaign ID is required" });
    }

    if (!verifyCampaignOwnership(campaignId, userId)) {
      return res.status(403).json({ error: "Campaign not found or access denied" });
    }

    next();
  } catch (error) {
    console.error("Error in requireCampaignOwnership:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export default verifyCampaignOwnership;
