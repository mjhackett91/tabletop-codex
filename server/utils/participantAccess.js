// server/utils/participantAccess.js - Campaign participant access and role checking
import db from "../db.js";

/**
 * Get user's role in a campaign (dm, player, or null if not a participant)
 * ⚠️ DEV MODE: Checks for simulated role from X-Dev-Simulated-Role header
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object (optional, for dev mode)
 * @returns {string|null} - 'dm', 'player', or null
 */
export function getUserCampaignRole(campaignId, userId, req = null) {
  if (!campaignId || !userId) return null;

  // ⚠️ DEV MODE ONLY - Check for simulated role header
  if (process.env.NODE_ENV !== "production" && req) {
    const devRole = req.headers["x-dev-simulated-role"];
    const devCampaignId = req.headers["x-dev-campaign-id"];
    if (devRole && devCampaignId && String(campaignId) === String(devCampaignId)) {
      console.log(`[DEV MODE] Using simulated role: ${devRole} for campaign ${campaignId}`);
      return devRole === "dm" ? "dm" : devRole === "player" ? "player" : null;
    }
  }

  // Check if user is the campaign owner (always DM)
  const campaign = db
    .prepare("SELECT user_id FROM campaigns WHERE id = ?")
    .get(campaignId);

  if (campaign && campaign.user_id === userId) {
    return "dm";
  }

  // Check campaign_participants table
  const participant = db
    .prepare("SELECT role FROM campaign_participants WHERE campaign_id = ? AND user_id = ?")
    .get(campaignId, userId);

  return participant ? participant.role : null;
}

/**
 * Check if user has access to a campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @returns {boolean} - True if user has access (owner or participant)
 */
export function hasCampaignAccess(campaignId, userId, req = null) {
  return getUserCampaignRole(campaignId, userId, req) !== null;
}

/**
 * Check if user is DM of a campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object (optional, for dev mode)
 * @returns {boolean}
 */
export function isCampaignDM(campaignId, userId, req = null) {
  return getUserCampaignRole(campaignId, userId, req) === "dm";
}

/**
 * Check if user is player in a campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @returns {boolean}
 */
export function isCampaignPlayer(campaignId, userId) {
  return getUserCampaignRole(campaignId, userId) === "player";
}

/**
 * Filter entity based on visibility and user role
 * @param {Object} entity - Entity object with visibility field
 * @param {string} userRole - User's role ('dm' or 'player')
 * @returns {boolean} - True if entity should be visible to user
 */
export function isEntityVisible(entity, userRole) {
  if (!entity) return false;

  // DMs see everything
  if (userRole === "dm") {
    return entity.visibility !== "hidden";
  }

  // Players only see player-visible content
  if (userRole === "player") {
    return entity.visibility === "player-visible";
  }

  // No role = no access
  return false;
}

/**
 * Filter entities array based on visibility and user role
 * @param {Array} entities - Array of entity objects
 * @param {string} userRole - User's role ('dm' or 'player')
 * @returns {Array} - Filtered array of visible entities
 */
export function filterVisibleEntities(entities, userRole) {
  if (!Array.isArray(entities)) return [];
  return entities.filter(entity => isEntityVisible(entity, userRole));
}

/**
 * Sanitize entity for player view (remove DM-only fields)
 * @param {Object} entity - Entity object
 * @param {string} userRole - User's role
 * @returns {Object} - Sanitized entity
 */
export function sanitizeEntityForRole(entity, userRole) {
  if (!entity) return null;

  // DMs see everything
  if (userRole === "dm") {
    return entity;
  }

  // Players see limited fields - remove sensitive DM notes
  const sanitized = { ...entity };

  // For characters, remove full character sheet details for NPCs/antagonists
  if (sanitized.type && sanitized.type !== "player" && sanitized.character_sheet) {
    // Keep basic info but hide detailed sheet
    sanitized.character_sheet = null;
  }

  // Remove detailed notes/descriptions for non-player entities if visibility is limited
  // This will be handled by visibility filtering, but we can add additional sanitization here

  return sanitized;
}

/**
 * Get the effective role for a user in a campaign, considering dev simulation.
 * This is a wrapper around getUserCampaignRole that ensures req is passed.
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object
 * @returns {string|null} - 'dm', 'player', or null
 */
export function getRole(campaignId, userId, req) {
  return getUserCampaignRole(campaignId, userId, req);
}

export default {
  getUserCampaignRole,
  hasCampaignAccess,
  isCampaignDM,
  isCampaignPlayer,
  isEntityVisible,
  filterVisibleEntities,
  sanitizeEntityForRole,
  getRole
};
