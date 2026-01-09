// client/src/components/DevRoleSwitcher.jsx
// ⚠️ DEV MODE ONLY - Remove before production!
// This component allows toggling between DM and Player views for testing.
// To remove: Delete this file and remove its import from Layout.jsx

import { useState, useEffect } from "react";
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography, Chip, Alert, Button, IconButton, Collapse } from "@mui/material";
import { useParams, useLocation } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

const DEV_ROLE_KEY = "ttc_dev_role";
const DEV_CAMPAIGN_KEY = "ttc_dev_campaign_role_";

export default function DevRoleSwitcher() {
  const params = useParams();
  const location = useLocation();
  const campaignId = params?.id;
  const isDev = import.meta.env.DEV;

  // Fallback: try to extract campaignId from URL if useParams doesn't work
  const getCampaignIdFromUrl = () => {
    const pathMatch = location.pathname.match(/\/campaigns\/(\d+)/);
    return pathMatch ? pathMatch[1] : null;
  };

  const actualCampaignId = campaignId || getCampaignIdFromUrl();

  console.log("DevRoleSwitcher mounted:", { 
    params, 
    campaignId, 
    actualCampaignId, 
    pathname: window.location.pathname,
    isDev 
  });

  // Get current simulated role for this campaign
  const getSimulatedRole = () => {
    if (!actualCampaignId) return null;
    const key = `${DEV_CAMPAIGN_KEY}${actualCampaignId}`;
    const role = localStorage.getItem(key);
    console.log("DevRoleSwitcher: getSimulatedRole", { actualCampaignId, key, role });
    return role;
  };

  const [simulatedRole, setSimulatedRole] = useState(getSimulatedRole());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (actualCampaignId) {
      const role = getSimulatedRole();
      console.log("DevRoleSwitcher: useEffect", { actualCampaignId, role });
      setSimulatedRole(role);
    }
  }, [actualCampaignId]);

  // Only show in dev mode
  if (!isDev) {
    return null;
  }

  // Only show if we're on a campaign page
  if (!actualCampaignId) {
    console.log("DevRoleSwitcher: Not showing - no campaignId", { pathname: window.location.pathname });
    return null;
  }

  // If collapsed, show just a small button
  if (!isExpanded) {
    return (
      <Box sx={{ position: "fixed", bottom: 80, right: 16, zIndex: 9999 }}>
        <Button
          variant="contained"
          color="warning"
          size="small"
          onClick={() => setIsExpanded(true)}
          sx={{
            minWidth: "auto",
            width: 40,
            height: 40,
            borderRadius: "50%",
            p: 0,
            boxShadow: 4,
          }}
          title="Dev Role Switcher (Click to expand)"
        >
          <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: "bold" }}>
            DEV
          </Typography>
        </Button>
      </Box>
    );
  }

  const handleRoleChange = (event, newRole) => {
    console.log("DevRoleSwitcher: handleRoleChange called", { 
      event: event?.type, 
      newRole, 
      actualCampaignId,
      currentSimulatedRole: simulatedRole 
    });
    
    if (!actualCampaignId) {
      console.warn("DevRoleSwitcher: No campaignId available");
      return;
    }
    
    // newRole can be null if deselecting in ToggleButtonGroup
    if (newRole === null) {
      // ToggleButtonGroup was deselected - keep current value or set to "none"
      console.log("DevRoleSwitcher: Deselection detected, keeping current or setting to none");
      newRole = "none";
    }
    
    const key = `${DEV_CAMPAIGN_KEY}${actualCampaignId}`;
    
    if (newRole === "none") {
      console.log("DevRoleSwitcher: Removing simulated role", { key });
      localStorage.removeItem(key);
      setSimulatedRole(null);
    } else if (newRole === "dm" || newRole === "player") {
      console.log("DevRoleSwitcher: Setting simulated role to", newRole, { key });
      localStorage.setItem(key, newRole);
      setSimulatedRole(newRole);
    } else {
      console.warn("DevRoleSwitcher: Invalid role", newRole);
      return;
    }
    
    // Small delay before reload to ensure state updates
    setTimeout(() => {
      console.log("DevRoleSwitcher: Reloading page with new role:", newRole);
      window.location.reload();
    }, 100);
  };

  return (
    <Box sx={{ position: "fixed", bottom: 80, right: 16, zIndex: 9999 }}>
      <Paper
        elevation={8}
        sx={{
          p: 2,
          backgroundColor: "warning.dark",
          border: "2px solid",
          borderColor: "error.main",
          maxWidth: 300
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Alert severity="warning" sx={{ fontSize: "0.75rem", flex: 1, mr: 1 }}>
            ⚠️ DEV MODE ONLY
          </Alert>
          <IconButton
            size="small"
            onClick={() => setIsExpanded(false)}
            sx={{ color: "error.main" }}
            title="Minimize"
          >
            <ExpandLessIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" fontWeight="bold" gutterBottom display="block">
          Simulate Role (Campaign #{actualCampaignId || "N/A"})
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Current: {simulatedRole ? (
            <Chip label={simulatedRole.toUpperCase()} size="small" color={simulatedRole === "dm" ? "primary" : "secondary"} />
          ) : (
            <Chip label="NONE (Actual Role)" size="small" />
          )}
        </Typography>
        <ToggleButtonGroup
          value={simulatedRole || "none"}
          exclusive
          onChange={handleRoleChange}
          size="small"
          fullWidth
          aria-label="role switcher"
        >
          <ToggleButton value="none" aria-label="actual role">
            None
          </ToggleButton>
          <ToggleButton value="dm" aria-label="dm role">
            DM
          </ToggleButton>
          <ToggleButton value="player" aria-label="player role">
            Player
          </ToggleButton>
        </ToggleButtonGroup>
        
        {/* Debug buttons for testing */}
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => handleRoleChange(null, "dm")}
            sx={{ fontSize: "0.7rem" }}
          >
            Test: Set DM
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => handleRoleChange(null, "player")}
            sx={{ fontSize: "0.7rem" }}
          >
            Test: Set Player
          </Button>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
          Page will reload to apply role change
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", fontSize: "0.65rem" }}>
          Path: {location.pathname} | ID: {actualCampaignId || "none"}
        </Typography>
      </Paper>
    </Box>
  );
}

/**
 * Get simulated role for a campaign (dev mode only)
 * @param {string|number} campaignId - Campaign ID
 * @returns {string|null} - 'dm', 'player', or null
 */
export function getDevSimulatedRole(campaignId) {
  if (!import.meta.env.DEV || !campaignId) return null;
  const key = `${DEV_CAMPAIGN_KEY}${campaignId}`;
  return localStorage.getItem(key) || null;
}
