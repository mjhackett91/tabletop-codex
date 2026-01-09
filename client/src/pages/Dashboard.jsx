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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CampaignIcon from "@mui/icons-material/Campaign";
import apiClient from "../services/apiClient";

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const data = await apiClient.get("/api/campaigns");
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
        await apiClient.put(`/api/campaigns/${editingCampaign.id}`, formData);
      } else {
        await apiClient.post("/api/campaigns", formData);
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
      await apiClient.delete(`/api/campaigns/${id}`);
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
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography>Loading campaigns...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CampaignIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4">My Campaigns</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your tabletop RPG campaigns
            </Typography>
          </Box>
        </Box>
        <Chip
          label={`${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {campaigns.length === 0 ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <CardContent>
            <CampaignIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No campaigns yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first campaign to start organizing your tabletop RPG adventures!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
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
                  <Typography variant="caption" color="text.secondary">
                    Created: {formatDate(campaign.created_at)}
                  </Typography>
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
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(campaign)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(campaign.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
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
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCampaign ? "Edit Campaign" : "New Campaign"}
        </DialogTitle>
        <DialogContent dividers>
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
