// client/src/components/CampaignNav.jsx - Navigation for campaign content pages
import { useParams, useLocation, Link } from "react-router-dom";
import { Box, Tabs, Tab, Paper } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PeopleIcon from "@mui/icons-material/People";
import DangerousIcon from "@mui/icons-material/Dangerous";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventIcon from "@mui/icons-material/Event";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PetsIcon from "@mui/icons-material/Pets";

function LinkTab(props) {
  return (
    <Tab
      component={Link}
      {...props}
      sx={{
        color: "text.secondary",
        "&.Mui-selected": {
          color: "primary.main",
        },
      }}
    />
  );
}

export default function CampaignNav({ campaignId }) {
  const location = useLocation();
  
  // Determine which tab should be active based on current route
  let currentTab = "/characters";
  if (location.pathname.includes("/npcs")) {
    currentTab = "/npcs";
  } else if (location.pathname.includes("/antagonists")) {
    currentTab = "/antagonists";
  } else if (location.pathname.includes("/locations")) {
    currentTab = "/locations";
  } else if (location.pathname.includes("/factions")) {
    currentTab = "/factions";
  } else if (location.pathname.includes("/world-info")) {
    currentTab = "/world-info";
  } else if (location.pathname.includes("/sessions")) {
    currentTab = "/sessions";
  } else if (location.pathname.includes("/quests")) {
    currentTab = "/quests";
  } else if (location.pathname.includes("/creatures")) {
    currentTab = "/creatures";
  } else if (location.pathname.includes("/characters")) {
    currentTab = "/characters";
  }

  const basePath = `/campaigns/${campaignId}`;

  return (
    <Paper sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
        <Tabs
          value={currentTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            minHeight: { xs: 48, sm: 64 },
            "& .MuiTab-root": {
              minHeight: { xs: 48, sm: 64 },
              minWidth: { xs: 100, sm: 120 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            },
          }}
        >
        <LinkTab
          label="Characters"
          value="/characters"
          to={`${basePath}/characters`}
          icon={<PersonIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="NPCs"
          value="/npcs"
          to={`${basePath}/npcs`}
          icon={<PeopleIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="Antagonists"
          value="/antagonists"
          to={`${basePath}/antagonists`}
          icon={<DangerousIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="Creatures"
          value="/creatures"
          to={`${basePath}/creatures`}
          icon={<PetsIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="Locations"
          value="/locations"
          to={`${basePath}/locations`}
          icon={<LocationOnIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="Factions"
          value="/factions"
          to={`${basePath}/factions`}
          icon={<GroupsIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="World Info"
          value="/world-info"
          to={`${basePath}/world-info`}
          icon={<MenuBookIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="Sessions"
          value="/sessions"
          to={`${basePath}/sessions`}
          icon={<EventIcon />}
          iconPosition="start"
        />
        <LinkTab
          label="Quests"
          value="/quests"
          to={`${basePath}/quests`}
          icon={<AssignmentIcon />}
          iconPosition="start"
        />
      </Tabs>
      </Box>
    </Paper>
  );
}
