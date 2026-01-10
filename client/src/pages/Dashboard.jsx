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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CampaignIcon from "@mui/icons-material/Campaign";
import ShareIcon from "@mui/icons-material/Share";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
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
        mb: { xs: 2, sm: 3 },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2 }, flex: 1 }}>
          <CampaignIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: "primary.main", flexShrink: 0 }} />
          <Box>
            <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}>
              My Campaigns
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              Manage your tabletop RPG campaigns
            </Typography>
          </Box>
        </Box>
        <Chip
          label={`${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          color="primary"
          variant="outlined"
          sx={{ flexShrink: 0 }}
        />
      </Box>

      {campaigns.length === 0 ? (
        <Card sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
          <CardContent>
            <CampaignIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No campaigns yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: "600px", mx: "auto" }}>
              Create your first campaign to start organizing your tabletop RPG adventures!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="medium"
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
                  "&:hover": {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    {campaign.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {campaign.description || "No description"}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Created: {formatDate(campaign.created_at)}
                    </Typography>
                    {campaign.user_role && (
                      <Chip 
                        label={campaign.user_role.toUpperCase()} 
                        size="small" 
                        color={campaign.user_role === "dm" ? "primary" : "secondary"}
                        variant="outlined"
                      />
                    )}
                    {campaign.is_owner && (
                      <Chip 
                        label="Owner" 
                        size="small" 
                        color="primary"
                        variant="filled"
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                  <Button
                    component={Link}
                    to={`/campaigns/${campaign.id}/characters`}
                    size="small"
                    variant="contained"
                    color="primary"
                  >
                    Open
                  </Button>
                  <Box>
                    {campaign.is_owner && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenSharing(campaign)}
                          color="primary"
                          title="Share Campaign"
                        >
                          <ShareIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(campaign)}
                          color="primary"
                          title="Edit Campaign"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(campaign.id)}
                          color="error"
                          title="Delete Campaign"
                        >
                          <DeleteIcon />
                        </IconButton>
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
