// client/src/pages/Locations.jsx - Locations management page
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";

const LOCATION_TYPES = [
  "City", "Town", "Village", "Dungeon", "Castle", "Tavern", "Shop",
  "Temple", "Forest", "Mountain", "River", "Desert", "Island",
  "Building", "Room", "District", "Region", "Country", "Other"
];

export default function Locations() {
  const { id: campaignId } = useParams();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    location_type: "",
    parent_location_id: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Fetch locations
  const fetchLocations = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching locations for campaign:", campaignId);
      const data = await apiClient.get(`/api/campaigns/${campaignId}/locations`);
      console.log("Locations data received:", data);
      setLocations(data);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      setSnackbar({
        open: true,
        message: "Failed to load locations",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [campaignId]);

  const handleOpenDialog = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || "",
        description: location.description || "",
        location_type: location.location_type || "",
        parent_location_id: location.parent_location_id || null
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: "",
        description: "",
        location_type: "",
        parent_location_id: null
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setFormData({ name: "", description: "", location_type: "", parent_location_id: null });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setSnackbar({
        open: true,
        message: "Location name is required",
        severity: "error"
      });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description || "",
        location_type: formData.location_type || null,
        parent_location_id: formData.parent_location_id || null
      };

      if (editingLocation) {
        await apiClient.put(`/api/campaigns/${campaignId}/locations/${editingLocation.id}`, payload);
        setSnackbar({
          open: true,
          message: "Location updated successfully",
          severity: "success"
        });
      } else {
        await apiClient.post(`/api/campaigns/${campaignId}/locations`, payload);
        setSnackbar({
          open: true,
          message: "Location created successfully",
          severity: "success"
        });
      }

      handleCloseDialog();
      fetchLocations();
    } catch (error) {
      console.error("Failed to save location:", error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingLocation ? "update" : "create"} location`,
        severity: "error"
      });
    }
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm("Are you sure you want to delete this location?")) {
      return;
    }

    try {
      await apiClient.delete(`/api/campaigns/${campaignId}/locations/${locationId}`);
      setSnackbar({
        open: true,
        message: "Location deleted successfully",
        severity: "success"
      });
      fetchLocations();
    } catch (error) {
      console.error("Failed to delete location:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete location",
        severity: "error"
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Filter out current location from parent options (to prevent cycles)
  const availableParentLocations = locations.filter(
    loc => !editingLocation || loc.id !== editingLocation.id
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BackButton variant="icon" />
        <CampaignNav campaignId={campaignId} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <LocationOnIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4">Locations</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage locations, cities, dungeons, and other places in your campaign
            </Typography>
          </Box>
        </Box>
      </Box>

      <Accordion 
        defaultExpanded 
        sx={{ 
          mb: 3, 
          bgcolor: "background.paper", 
          border: `1px solid`, 
          borderColor: "primary.main",
          "&:before": { display: "none" }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
          sx={{
            bgcolor: "action.hover",
            "&:hover": { bgcolor: "action.selected" }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", mr: 1 }}>
            <InfoIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" color="primary.main">
              Creating Locations: What to Include
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Name the location clearly and descriptively
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Select an appropriate location type (City, Dungeon, Tavern, etc.)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Use parent locations to create hierarchies (e.g., Tavern within City)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Describe the location's appearance, atmosphere, and notable features
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Note important NPCs, events, or items associated with the location
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <TableContainer component={Paper} sx={{ backgroundColor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Parent Location</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading locations...</Typography>
                </TableCell>
              </TableRow>
            ) : locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No locations yet. Create your first location!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow 
                  key={location.id} 
                  hover
                  onClick={() => handleOpenDialog(location)}
                  sx={{ 
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover"
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {location.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {location.location_type && (
                      <Chip label={location.location_type} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {location.parent_location_name ? (
                      <Chip 
                        label={location.parent_location_name} 
                        size="small" 
                        variant="outlined" 
                        color="secondary"
                      />
                    ) : (
                      <Typography color="text.secondary" variant="body2">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{ 
                        maxWidth: 300, 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        "& p": { margin: 0, display: "inline" },
                        "& *": { display: "inline" }
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: location.description || "<span style='color: #bdbdbd'>No description</span>" 
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary">
                      {formatDate(location.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      onClick={() => handleOpenDialog(location)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(location.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab
        color="primary"
        aria-label="add location"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingLocation ? "Edit Location" : "New Location"}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingLocation ? "Update" : "Create"} a location for this campaign
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              autoFocus
              label="Location Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={formData.location_type}
                label="Location Type"
                onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {LOCATION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Parent Location (Optional)</InputLabel>
              <Select
                value={formData.parent_location_id || ""}
                label="Parent Location (Optional)"
                onChange={(e) => setFormData({ 
                  ...formData, 
                  parent_location_id: e.target.value === "" ? null : e.target.value 
                })}
              >
                <MenuItem value="">None (Top-level location)</MenuItem>
                {availableParentLocations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Enter location description..."
              />
            </Box>
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
            {editingLocation ? "Update" : "Create"} Location
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
