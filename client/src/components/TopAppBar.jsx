// client/src/components/TopAppBar.jsx - Top navigation bar (logged in users)
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CampaignIcon from "@mui/icons-material/Campaign";

export default function TopAppBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    handleMenuClose();
    navigate("/");
  };

  const handleDashboard = () => {
    navigate("/dashboard");
    handleMenuClose();
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: "background.paper", color: "text.primary", boxShadow: 1, zIndex: 1100 }}>
      <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 }, minHeight: { xs: 56, sm: 64 } }}>
        {/* App Name/Logo - Links to Dashboard */}
        <Typography
          variant="h6"
          component={Link}
          to="/dashboard"
          sx={{
            flexGrow: 0,
            color: "primary.main",
            textDecoration: "none",
            fontWeight: 700,
            mr: { xs: 2, sm: 3, md: 4 },
            fontSize: { xs: "1rem", sm: "1.25rem" },
            "&:hover": {
              color: "primary.dark",
            },
          }}
        >
          Table Top Codex
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1, flexGrow: 1 }}>
          <Button
            component={Link}
            to="/dashboard"
            color="inherit"
            startIcon={<CampaignIcon />}
            sx={{
              color: isActive("/dashboard") ? "primary.main" : "text.secondary",
              fontWeight: isActive("/dashboard") ? 600 : 400,
              "&:hover": {
                color: "primary.main",
                bgcolor: "action.hover"
              },
            }}
          >
            Campaigns
          </Button>
        </Box>

        {/* User Menu */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, ml: "auto" }}>
          {user && (
            <Chip
              label={user.username}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ display: { xs: "none", sm: "flex" } }}
            />
          )}
          <IconButton
            onClick={handleMenuOpen}
            aria-label="user menu"
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
                bgcolor: "action.hover"
              },
            }}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={handleDashboard}>Dashboard</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
