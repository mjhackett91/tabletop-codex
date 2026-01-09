// server/utils/participantAccess.js - Campaign participant access and role checking
import { get } from "../db-pg.js";

/**
 * Get user's role in a campaign (dm, player, or null if not a participant)
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object (optional, currently unused but kept for API compatibility)
 * @returns {Promise<string|null>} - 'dm', 'player', or null
 */
export async function getUserCampaignRole(campaignId, userId, req = null) {
  if (!campaignId || !userId) return null;

  // Check if user is the campaign owner (always DM)
  const campaign = await get(
    "SELECT user_id FROM campaigns WHERE id = $1",
    [campaignId]
  );

  if (campaign && campaign.user_id === userId) {
    return "dm";
  }

  // Check campaign_participants table
  const participant = await get(
    "SELECT role FROM campaign_participants WHERE campaign_id = $1 AND user_id = $2",
    [campaignId, userId]
  );

  return participant ? participant.role : null;
}

/**
 * Check if user has access to a campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object (optional, kept for API compatibility)
 * @returns {Promise<boolean>} - True if user has access (owner or participant)
 */
export async function hasCampaignAccess(campaignId, userId, req = null) {
  const role = await getUserCampaignRole(campaignId, userId, req);
  return role !== null;
}

/**
 * Check if user is DM of a campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object (optional, kept for API compatibility)
 * @returns {Promise<boolean>}
 */
export async function isCampaignDM(campaignId, userId, req = null) {
  const role = await getUserCampaignRole(campaignId, userId, req);
  return role === "dm";
}

/**
 * Check if user is player in a campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object (optional, kept for API compatibility)
 * @returns {Promise<boolean>}
 */
export async function isCampaignPlayer(campaignId, userId, req = null) {
  const role = await getUserCampaignRole(campaignId, userId, req);
  return role === "player";
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
 * Get the effective role for a user in a campaign.
 * This is a wrapper around getUserCampaignRole that ensures req is passed.
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {Object} req - Express request object
 * @returns {Promise<string|null>} - 'dm', 'player', or null
 */
export async function getRole(campaignId, userId, req) {
  return await getUserCampaignRole(campaignId, userId, req);
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
