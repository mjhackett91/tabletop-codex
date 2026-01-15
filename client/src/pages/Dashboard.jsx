// client/src/pages/Dashboard.jsx - Main dashboard after login (campaign management)
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Fab,
  Snackbar,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CampaignIcon from "@mui/icons-material/Campaign";
import ShareIcon from "@mui/icons-material/Share";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GroupIcon from "@mui/icons-material/Group";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PetsIcon from "@mui/icons-material/Pets";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import apiClient from "../services/apiClient";

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();
  
  // Participant sharing state
  const [sharingCampaign, setSharingCampaign] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("player");
  
  // Statistics state
  const [statistics, setStatistics] = useState({});
  const [loadingStatistics, setLoadingStatistics] = useState({});
  
  // Activity feed state
  const [activity, setActivity] = useState({});
  const [loadingActivity, setLoadingActivity] = useState({});

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const data = await apiClient.get("/campaigns");
      setCampaigns(data);
      
      // Fetch statistics for each campaign
      // Activity feed temporarily disabled - will revisit later
      if (data && data.length > 0) {
        fetchAllStatistics(data);
        // fetchAllActivity(data);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      if (error.message?.includes("401") || error.message?.includes("403")) {
        navigate("/login");
      } else {
        setSnackbar({
          open: true,
          message: "Failed to load campaigns",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics for all campaigns
  const fetchAllStatistics = async (campaignsList) => {
    const statsPromises = campaignsList.map(async (campaign) => {
      try {
        setLoadingStatistics((prev) => ({ ...prev, [campaign.id]: true }));
        const stats = await apiClient.get(`/campaigns/${campaign.id}/statistics`);
        setStatistics((prev) => ({ ...prev, [campaign.id]: stats }));
        return { campaignId: campaign.id, stats };
      } catch (error) {
        console.error(`Error fetching statistics for campaign ${campaign.id}:`, error);
        // Set default stats on error
        setStatistics((prev) => ({
          ...prev,
          [campaign.id]: { characters: 0, sessions: 0, quests: 0 },
        }));
        return { campaignId: campaign.id, stats: { characters: 0, sessions: 0, quests: 0 } };
      } finally {
        setLoadingStatistics((prev) => ({ ...prev, [campaign.id]: false }));
      }
    });

    await Promise.all(statsPromises);
  };

  // Fetch activity feed for all campaigns
  const fetchAllActivity = async (campaignsList) => {
    const activityPromises = campaignsList.map(async (campaign) => {
      try {
        setLoadingActivity((prev) => ({ ...prev, [campaign.id]: true }));
        const activities = await apiClient.get(`/campaigns/${campaign.id}/activity`);
        setActivity((prev) => ({ ...prev, [campaign.id]: activities }));
        return { campaignId: campaign.id, activities };
      } catch (error) {
        console.error(`Error fetching activity for campaign ${campaign.id}:`, error);
        // Set empty activity on error
        setActivity((prev) => ({ ...prev, [campaign.id]: [] }));
        return { campaignId: campaign.id, activities: [] };
      } finally {
        setLoadingActivity((prev) => ({ ...prev, [campaign.id]: false }));
      }
    });

    await Promise.all(activityPromises);
  };

  // Get icon for entity type
  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'character':
        return <PersonIcon fontSize="small" />;
      case 'session':
        return <EventIcon fontSize="small" />;
      case 'quest':
        return <AssignmentIcon fontSize="small" />;
      case 'location':
        return <LocationOnIcon fontSize="small" />;
      case 'faction':
        return <GroupIcon fontSize="small" />;
      case 'world_info':
        return <MenuBookIcon fontSize="small" />;
      case 'creature':
        return <PetsIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  // Get action icon
  const getActionIcon = (actionType) => {
    return actionType === 'created' 
      ? <AddCircleIcon fontSize="small" sx={{ color: "success.main" }} />
      : <EditIcon fontSize="small" sx={{ color: "primary.main" }} />;
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleOpenDialog = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name || "",
        description: campaign.description || "",
      });
    } else {
      setEditingCampaign(null);
      setFormData({ name: "", description: "" });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCampaign(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = async () => {
    try {
      if (editingCampaign) {
        await apiClient.put(`/campaigns/${editingCampaign.id}`, formData);
      } else {
        await apiClient.post("/campaigns", formData);
      }

      await fetchCampaigns();
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: editingCampaign ? "Campaign updated successfully" : "Campaign created successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving campaign:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to save campaign",
        severity: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;

    try {
      await apiClient.delete(`/campaigns/${id}`);
      await fetchCampaigns();
      setSnackbar({
        open: true,
        message: "Campaign deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete campaign",
        severity: "error",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      // If it's a date-only string (YYYY-MM-DD), parse it as local date to avoid timezone issues
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
        return date.toLocaleDateString();
      }
      // For datetime strings, parse normally but use local timezone
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Participant management functions
  const handleOpenSharing = async (campaign) => {
    setSharingCampaign(campaign);
    await fetchParticipants(campaign.id);
  };

  const handleCloseSharing = () => {
    setSharingCampaign(null);
    setParticipants([]);
    setInviteEmail("");
    setInviteRole("player");
  };

  const fetchParticipants = async (campaignId) => {
    setLoadingParticipants(true);
    try {
      const data = await apiClient.get(`/campaigns/${campaignId}/participants`);
      setParticipants(data || []);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      setSnackbar({
        open: true,
        message: "Failed to load participants",
        severity: "error"
      });
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setSnackbar({
        open: true,
        message: "Email is required",
        severity: "error"
      });
      return;
    }

    try {
      const response = await apiClient.post(
        `/campaigns/${sharingCampaign.id}/participants/invite`,
        { email: inviteEmail.trim(), role: inviteRole }
      );
      setSnackbar({
        open: true,
        message: response.message || "User invited successfully",
        severity: "success"
      });
      setInviteEmail("");
      await fetchParticipants(sharingCampaign.id);
    } catch (error) {
      console.error("Failed to invite participant:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to invite user",
        severity: "error"
      });
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!window.confirm("Are you sure you want to remove this participant?")) {
      return;
    }

    try {
      await apiClient.delete(`/campaigns/${sharingCampaign.id}/participants/${participantId}`);
      setSnackbar({
        open: true,
        message: "Participant removed successfully",
        severity: "success"
      });
      await fetchParticipants(sharingCampaign.id);
    } catch (error) {
      console.error("Failed to remove participant:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to remove participant",
        severity: "error"
      });
    }
  };

  const handleChangeRole = async (participantId, newRole) => {
    try {
      await apiClient.put(
        `/campaigns/${sharingCampaign.id}/participants/${participantId}/role`,
        { role: newRole }
      );
      setSnackbar({
        open: true,
        message: "Participant role updated successfully",
        severity: "success"
      });
      await fetchParticipants(sharingCampaign.id);
    } catch (error) {
      console.error("Failed to update role:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to update role",
        severity: "error"
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography>Loading campaigns...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <Box sx={{ 
        display: "flex", 
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        mb: { xs: 3, sm: 4 },
        gap: { xs: 2, sm: 0 },
        pb: 3,
        borderBottom: "1px solid rgba(192, 163, 110, 0.2)"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2 }, flex: 1 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              background: "rgba(192, 163, 110, 0.1)",
              border: "1px solid rgba(192, 163, 110, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CampaignIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: "primary.main" }} />
          </Box>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontSize: { xs: "1.75rem", sm: "2.25rem" },
                fontWeight: 700,
                color: "primary.main",
                letterSpacing: "0.5px",
                mb: 0.5
              }}
            >
              My Campaigns
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                display: { xs: "none", sm: "block" },
                fontSize: "0.95rem"
              }}
            >
              Manage your tabletop RPG campaigns
            </Typography>
          </Box>
        </Box>
        <Chip
          label={`${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          color="primary"
          variant="outlined"
          sx={{ 
            flexShrink: 0,
            fontSize: "0.875rem",
            height: 32,
            px: 1.5,
            borderWidth: 1.5,
            fontWeight: 600
          }}
        />
      </Box>

      {campaigns.length === 0 ? (
        <Card 
          sx={{ 
            p: { xs: 4, sm: 6 }, 
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%)",
            border: "1px solid rgba(192, 163, 110, 0.2)",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "inline-flex",
                p: 3,
                borderRadius: "50%",
                background: "rgba(192, 163, 110, 0.1)",
                border: "2px solid rgba(192, 163, 110, 0.2)",
                mb: 3,
              }}
            >
              <CampaignIcon sx={{ fontSize: { xs: 56, sm: 72 }, color: "primary.main" }} />
            </Box>
            <Typography 
              variant="h5" 
              color="text.primary" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                mb: 1.5
              }}
            >
              No campaigns yet
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mb: 4, 
                maxWidth: "500px", 
                mx: "auto",
                lineHeight: 1.7
              }}
            >
              Create your first campaign to start organizing your tabletop RPG adventures!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(192, 163, 110, 0.3)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(192, 163, 110, 0.4)",
                  transform: "translateY(-2px)",
                },
                transition: "all 0.2s ease",
              }}
            >
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {campaigns.map((campaign) => (
            <Grid item xs={12} sm={6} md={4} key={campaign.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  background: "linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%)",
                  border: "1px solid rgba(192, 163, 110, 0.1)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    boxShadow: "0 8px 24px rgba(192, 163, 110, 0.15), 0 4px 8px rgba(0, 0, 0, 0.3)",
                    transform: "translateY(-4px)",
                    borderColor: "rgba(192, 163, 110, 0.3)",
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography 
                    variant="h5" 
                    gutterBottom 
                    fontWeight={600}
                    sx={{
                      mb: 1.5,
                      color: "primary.main",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {campaign.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 3,
                      minHeight: 60,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: 1.6,
                    }}
                  >
                    {campaign.description || "No description"}
                  </Typography>
                  
                  {/* Statistics Cards */}
                  {loadingStatistics[campaign.id] ? (
                    <Box sx={{ display: "flex", gap: 1, mb: 3, justifyContent: "space-around" }}>
                      <Typography variant="caption" color="text.secondary">Loading...</Typography>
                    </Box>
                  ) : (
                    <Box 
                      sx={{ 
                        display: "flex", 
                        gap: 2, 
                        mb: 3, 
                        justifyContent: "space-around", 
                        flexWrap: "wrap",
                        px: 1
                      }}
                    >
                      <Box 
                        sx={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          minWidth: 70,
                          p: 1.5,
                          borderRadius: 2,
                          background: "rgba(192, 163, 110, 0.08)",
                          border: "1px solid rgba(192, 163, 110, 0.15)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            background: "rgba(192, 163, 110, 0.12)",
                            transform: "scale(1.05)",
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: "50%",
                            background: "rgba(192, 163, 110, 0.2)",
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 24, color: "primary.main" }} />
                        </Box>
                        <Typography variant="h5" color="primary.main" fontWeight={700} sx={{ mb: 0.5 }}>
                          {statistics[campaign.id]?.characters || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", textAlign: "center" }}>
                          Character{statistics[campaign.id]?.characters !== 1 ? "s" : ""}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          minWidth: 70,
                          p: 1.5,
                          borderRadius: 2,
                          background: "rgba(107, 91, 149, 0.08)",
                          border: "1px solid rgba(107, 91, 149, 0.15)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            background: "rgba(107, 91, 149, 0.12)",
                            transform: "scale(1.05)",
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: "50%",
                            background: "rgba(107, 91, 149, 0.2)",
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <EventIcon sx={{ fontSize: 24, color: "secondary.main" }} />
                        </Box>
                        <Typography variant="h5" color="secondary.main" fontWeight={700} sx={{ mb: 0.5 }}>
                          {statistics[campaign.id]?.sessions || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", textAlign: "center" }}>
                          Session{statistics[campaign.id]?.sessions !== 1 ? "s" : ""}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          minWidth: 70,
                          p: 1.5,
                          borderRadius: 2,
                          background: "rgba(76, 175, 80, 0.08)",
                          border: "1px solid rgba(76, 175, 80, 0.15)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            background: "rgba(76, 175, 80, 0.12)",
                            transform: "scale(1.05)",
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: "50%",
                            background: "rgba(76, 175, 80, 0.2)",
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AssignmentIcon sx={{ fontSize: 24, color: "success.main" }} />
                        </Box>
                        <Typography variant="h5" color="success.main" fontWeight={700} sx={{ mb: 0.5 }}>
                          {statistics[campaign.id]?.quests || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", textAlign: "center" }}>
                          Quest{statistics[campaign.id]?.quests !== 1 ? "s" : ""}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  
                    {/* Recent Activity Feed - Temporarily disabled */}
                    {/* {loadingActivity[campaign.id] ? (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">Loading activity...</Typography>
                      </Box>
                    ) : activity[campaign.id] && activity[campaign.id].length > 0 ? (
                      <Box sx={{ mb: 2, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", fontWeight: "medium" }}>
                          Recent Activity
                        </Typography>
                        <List dense sx={{ py: 0, maxHeight: 150, overflowY: "auto" }}>
                          {activity[campaign.id].slice(0, 5).map((item, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                {getEntityIcon(item.entity_type)}
                                {getActionIcon(item.action_type)}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="caption" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    <strong>{item.entity_name}</strong> {item.action_type}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                    {item.username || "Unknown"} • {formatTimeAgo(item.activity_time)}
                                  </Typography>
                                </Box>
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ) : null} */}
                  
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 2, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Created: {formatDate(campaign.created_at)}
                    </Typography>
                    {campaign.user_role && (
                      <Chip 
                        label={campaign.user_role.toUpperCase()} 
                        size="small" 
                        color={campaign.user_role === "dm" ? "primary" : "secondary"}
                        variant="outlined"
                        sx={{ 
                          fontSize: "0.7rem",
                          height: 24,
                          borderWidth: 1.5,
                          fontWeight: 500
                        }}
                      />
                    )}
                    {campaign.is_owner && (
                      <Chip 
                        label="Owner" 
                        size="small" 
                        color="primary"
                        variant="filled"
                        sx={{ 
                          fontSize: "0.7rem",
                          height: 24,
                          fontWeight: 500
                        }}
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between", px: 3, pb: 3, pt: 0 }}>
                  <Button
                    component={Link}
                    to={`/campaigns/${campaign.id}/characters`}
                    size="medium"
                    variant="contained"
                    color="primary"
                    sx={{
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: 2,
                      boxShadow: "0 2px 8px rgba(192, 163, 110, 0.3)",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(192, 163, 110, 0.4)",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Open
                  </Button>
                  <Box>
                    {campaign.is_owner && (
                      <>
                        <Tooltip title="Share Campaign" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenSharing(campaign)}
                            color="primary"
                          >
                            <ShareIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Campaign" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(campaign)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Campaign" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(campaign.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Fab
        color="primary"
        aria-label="add campaign"
        sx={{ 
          position: "fixed", 
          bottom: { xs: 16, sm: 24 }, 
          right: { xs: 16, sm: 24 },
          zIndex: 1000
        }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: "90vh" }
        }}
      >
        <DialogTitle>
          {editingCampaign ? "Edit Campaign" : "New Campaign"}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              autoFocus
              label="Campaign Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your campaign..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim()}
          >
            {editingCampaign ? "Update" : "Create"} Campaign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sharing Dialog */}
      <Dialog 
        open={!!sharingCampaign} 
        onClose={handleCloseSharing} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: "90vh" }
        }}
      >
        <DialogTitle>
          Share Campaign: {sharingCampaign?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Invite Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Invite User by Email
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <TextField
                  label="Email Address"
                  fullWidth
                  size="small"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleInvite();
                    }
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    label="Role"
                  >
                    <MenuItem value="player">Player</MenuItem>
                    <MenuItem value="dm">DM</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                >
                  Invite
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* Participants List */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Participants ({participants.length})
              </Typography>
              {loadingParticipants ? (
                <Typography variant="body2" color="text.secondary">
                  Loading participants...
                </Typography>
              ) : participants.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No participants yet. Invite users to share this campaign.
                </Typography>
              ) : (
                <List dense>
                  {participants.map((participant) => (
                    <ListItem key={participant.id}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            <Typography variant="body2">{participant.username}</Typography>
                            {participant.is_owner && (
                              <Chip label="Owner" size="small" color="primary" />
                            )}
                            <Chip 
                              label={participant.role.toUpperCase()} 
                              size="small" 
                              color={participant.role === "dm" ? "primary" : "secondary"}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={participant.email}
                      />
                      {sharingCampaign?.is_owner && !participant.is_owner && (
                        <ListItemSecondaryAction>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={participant.role}
                                onChange={(e) => handleChangeRole(participant.id, e.target.value)}
                                size="small"
                              >
                                <MenuItem value="player">Player</MenuItem>
                                <MenuItem value="dm">DM</MenuItem>
                              </Select>
                            </FormControl>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveParticipant(participant.id)}
                              color="error"
                            >
                              <PersonRemoveIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSharing}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
