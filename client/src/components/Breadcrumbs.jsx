// client/src/components/Breadcrumbs.jsx - Breadcrumb navigation component
import { Link, useParams, useLocation } from "react-router-dom";
import { Breadcrumbs as MuiBreadcrumbs, Typography, Box } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";

export default function Breadcrumbs() {
  const location = useLocation();
  const { id: campaignId } = useParams();
  const [campaignName, setCampaignName] = useState("");

  useEffect(() => {
    if (campaignId) {
      // Fetch campaign name for breadcrumb
      apiClient
        .get(`/campaigns/${campaignId}`)
        .then((campaign) => {
          setCampaignName(campaign.name);
        })
        .catch((error) => {
          console.error("Failed to fetch campaign:", error);
        });
    }
  }, [campaignId]);

  // Don't show breadcrumbs on certain pages
  if (
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/dashboard"
  ) {
    return null;
  }

  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = [];

  // Always start with Dashboard
  breadcrumbs.push({
    label: "Dashboard",
    path: "/dashboard",
    icon: <HomeIcon fontSize="small" />,
  });

  // Build breadcrumb trail
  if (pathParts[0] === "campaigns") {
    breadcrumbs.push({
      label: "Campaigns",
      path: "/dashboard",
    });

    if (campaignId) {
      breadcrumbs.push({
        label: campaignName || "Campaign",
        path: `/campaigns/${campaignId}`,
      });
    }

    // Add current section
    const section = pathParts[2];
    if (section) {
      const sectionNames = {
        characters: "Characters",
        npcs: "NPCs",
        antagonists: "Antagonists",
        locations: "Locations",
        factions: "Factions",
        "world-info": "World Info",
      };

      if (sectionNames[section]) {
        breadcrumbs.push({
          label: sectionNames[section],
          path: location.pathname,
          current: true,
        });
      }
    }
  }

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Box sx={{ mb: { xs: 1.5, sm: 2 }, mt: { xs: 1, sm: 2 }, overflowX: "auto" }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb navigation"
        sx={{
          "& .MuiBreadcrumbs-ol": {
            flexWrap: { xs: "wrap", sm: "nowrap" }
          }
        }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          if (isLast || crumb.current) {
            return (
              <Typography key={crumb.path} color="text.primary" variant="body2">
                {crumb.icon && <Box component="span" sx={{ mr: 0.5, verticalAlign: "middle" }}>{crumb.icon}</Box>}
                {crumb.label}
              </Typography>
            );
          }

          return (
            <Link
              key={crumb.path}
              to={crumb.path}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {crumb.icon}
              <Typography
                variant="body2"
                sx={{
                  color: "primary.main",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                {crumb.label}
              </Typography>
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
}
