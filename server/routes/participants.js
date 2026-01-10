// server/routes/participants.js - Campaign participant management API
import express from "express";
import { get, all, query } from "../db-pg.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireCampaignOwnership, verifyCampaignOwnership } from "../utils/campaignOwnership.js";
import { getUserCampaignRole, isCampaignDM, hasCampaignAccess, getRole } from "../utils/participantAccess.js";

const router = express.Router({ mergeParams: true });

// All participant routes require authentication
router.use(authenticateToken);

/**
 * GET /api/campaigns/:campaignId/participants
 * List all participants in a campaign
 * Requires: DM access
 */
router.get("/:campaignId/participants", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user has access (DM or player can see participants)
    if (!(await hasCampaignAccess(campaignId, userId, req))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const participants = await all(`
      SELECT 
        cp.id,
        cp.role,
        cp.joined_at,
        u.id as user_id,
        u.username,
        u.email,
        c.user_id as campaign_owner_id
      FROM campaign_participants cp
      JOIN users u ON cp.user_id = u.id
      JOIN campaigns c ON cp.campaign_id = c.id
      WHERE cp.campaign_id = $1
      ORDER BY cp.role DESC, cp.joined_at ASC
    `, [campaignId]);

    // Mark campaign owner
    const participantsWithOwner = participants.map(p => ({
      ...p,
      is_owner: p.campaign_owner_id === p.user_id
    }));

    res.json(participantsWithOwner);
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

/**
 * POST /api/campaigns/:campaignId/participants/invite
 * Invite a user to the campaign by email
 * Requires: DM access
 */
router.post("/:campaignId/participants/invite", requireCampaignOwnership, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { email, role = "player" } = req.body;
    const userId = req.user?.id;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (role !== "dm" && role !== "player") {
      return res.status(400).json({ error: "Invalid role. Must be 'dm' or 'player'" });
    }

    // Find user by email
    const user = await get(
      "SELECT id, username, email FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found with that email" });
    }

    // Check if user is already a participant
    const existing = await get(
      "SELECT id FROM campaign_participants WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, user.id]
    );

    if (existing) {
      return res.status(400).json({ error: "User is already a participant in this campaign" });
    }

    // Add participant
    await query(`
      INSERT INTO campaign_participants (campaign_id, user_id, role, invited_by)
      VALUES ($1, $2, $3, $4)
    `, [campaignId, user.id, role, userId]);

    const newParticipant = await get(`
      SELECT 
        cp.id,
        cp.role,
        cp.joined_at,
        u.id as user_id,
        u.username,
        u.email
      FROM campaign_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.campaign_id = $1 AND cp.user_id = $2
    `, [campaignId, user.id]);

    res.status(201).json({
      message: `Successfully invited ${user.username} to the campaign`,
      participant: newParticipant
    });
  } catch (error) {
    console.error("Error inviting participant:", error);
    res.status(500).json({ error: "Failed to invite participant" });
  }
});

/**
 * PUT /api/campaigns/:campaignId/participants/:participantId/role
 * Update participant role
 * Requires: DM access, cannot change owner's role
 */
router.put("/:campaignId/participants/:participantId/role", requireCampaignOwnership, async (req, res) => {
  try {
    const { campaignId, participantId } = req.params;
    const { role } = req.body;

    if (role !== "dm" && role !== "player") {
      return res.status(400).json({ error: "Invalid role. Must be 'dm' or 'player'" });
    }

    // Get participant
    const participant = await get(`
      SELECT cp.*, c.user_id as campaign_owner_id
      FROM campaign_participants cp
      JOIN campaigns c ON cp.campaign_id = c.id
      WHERE cp.id = $1 AND cp.campaign_id = $2
    `, [participantId, campaignId]);

    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    // Cannot change owner's role
    if (participant.user_id === participant.campaign_owner_id) {
      return res.status(403).json({ error: "Cannot change campaign owner's role" });
    }

    // Update role
    await query(`
      UPDATE campaign_participants
      SET role = $1
      WHERE id = $2 AND campaign_id = $3
    `, [role, participantId, campaignId]);

    const updated = await get(`
      SELECT 
        cp.id,
        cp.role,
        cp.joined_at,
        u.id as user_id,
        u.username,
        u.email
      FROM campaign_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = $1
    `, [participantId]);

    res.json({
      message: "Participant role updated successfully",
      participant: updated
    });
  } catch (error) {
    console.error("Error updating participant role:", error);
    res.status(500).json({ error: "Failed to update participant role" });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/participants/:participantId
 * Remove a participant from the campaign
 * Requires: DM access, cannot remove owner
 */
router.delete("/:campaignId/participants/:participantId", requireCampaignOwnership, async (req, res) => {
  try {
    const { campaignId, participantId } = req.params;

    // Get participant
    const participant = await get(`
      SELECT cp.*, c.user_id as campaign_owner_id
      FROM campaign_participants cp
      JOIN campaigns c ON cp.campaign_id = c.id
      WHERE cp.id = $1 AND cp.campaign_id = $2
    `, [participantId, campaignId]);

    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    // Cannot remove owner
    if (participant.user_id === participant.campaign_owner_id) {
      return res.status(403).json({ error: "Cannot remove campaign owner" });
    }

    // Remove participant
    const result = await query(
      "DELETE FROM campaign_participants WHERE id = $1 AND campaign_id = $2",
      [participantId, campaignId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    res.json({ message: "Participant removed successfully" });
  } catch (error) {
    console.error("Error removing participant:", error);
    res.status(500).json({ error: "Failed to remove participant" });
  }
});

/**
 * GET /api/campaigns/:campaignId/my-role
 * Get current user's role in the campaign
 */
router.get("/:campaignId/my-role", async (req, res) => {
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

    // Use getRole to respect dev simulation
    const role = await getRole(campaignIdInt, userId, req);

    if (!role) {
      return res.status(403).json({ 
        error: "Not a participant",
        hasAccess: false,
        role: null
      });
    }

    res.json({
      hasAccess: true,
      role: role,
      isDM: role === "dm",
      isPlayer: role === "player"
    });
  } catch (error) {
    console.error("Error getting user role:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to get user role", details: error.message });
  }
});

export default router;
