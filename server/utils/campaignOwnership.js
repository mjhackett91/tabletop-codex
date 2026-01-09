// server/utils/campaignOwnership.js - Shared campaign ownership checker
import { get } from "../db-pg.js";

/**
 * Verify that a campaign belongs to the authenticated user
 * @param {number} campaignId - Campaign ID to check
 * @param {number} userId - Authenticated user ID
 * @returns {Promise<boolean>} True if owned, false otherwise
 */
export async function verifyCampaignOwnership(campaignId, userId) {
  const campaign = await get(
    "SELECT id FROM campaigns WHERE id = $1 AND user_id = $2",
    [campaignId, userId]
  );
  
  return campaign !== null;
}

/**
 * Middleware to check campaign ownership
 */
export async function requireCampaignOwnership(req, res, next) {
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

    if (!(await verifyCampaignOwnership(campaignId, userId))) {
      return res.status(403).json({ error: "Campaign not found or access denied" });
    }

    next();
  } catch (error) {
    console.error("Error in requireCampaignOwnership:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export default verifyCampaignOwnership;
