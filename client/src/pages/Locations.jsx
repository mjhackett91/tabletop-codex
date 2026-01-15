// client/src/pages/Locations.jsx - Locations management page
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
  Skeleton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";
import ImageGallery from "../components/ImageGallery";
import { sanitizeHTML } from "../utils/sanitize.js";
import TagSelector from "../components/TagSelector";
import EmptyState from "../components/EmptyState";

const LOCATION_TYPES = [
  "City", "Town", "Village", "Dungeon", "Castle", "Tavern", "Shop",
  "Temple", "Forest", "Mountain", "River", "Desert", "Island",
  "Building", "Room", "District", "Region", "Country", "Other"
];

export default function Locations() {
  const { id: campaignId } = useParams();
  const location = useLocation();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    location_type: "",
    parent_location_id: null,
    visibility: "dm-only"
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Handle column sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Sort locations based on current sort settings
  const sortedLocations = [...locations].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "name":
        aValue = (a.name || "").toLowerCase();
        bValue = (b.name || "").toLowerCase();
        break;
      case "type":
        aValue = (a.location_type || "").toLowerCase();
        bValue = (b.location_type || "").toLowerCase();
        break;
      case "created":
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Fetch locations
  const fetchLocations = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching locations for campaign:", campaignId);
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      
      const data = await apiClient.get(`/campaigns/${campaignId}/locations?${params.toString()}`);
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

  // Fetch user role
  const fetchUserRole = async () => {
    try {
      const roleData = await apiClient.get(`/campaigns/${campaignId}/my-role`);
      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error("Failed to fetch user role:", error);
    }
  };

  // Debounce search to avoid API spam on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchLocations();
    fetchUserRole();
  }, [campaignId, debouncedSearchTerm]);

  // Check for navigation state to auto-open entity dialog
  useEffect(() => {
    if (location.state?.openEntityId && locations.length > 0) {
      const entityId = location.state.openEntityId;
      const entityType = location.state.entityType;
      
      console.log("[Locations] Navigation state detected:", {
        entityId,
        entityType,
        locationsCount: locations.length,
        locationIds: locations.map(l => l.id)
      });
      
      if (entityType === "location") {
        // Normalize IDs to numbers for comparison (handle both string and number IDs)
        const entityIdNum = typeof entityId === 'string' ? parseInt(entityId, 10) : entityId;
        console.log("[Locations] Looking for location with ID:", entityId, "(normalized:", entityIdNum, ")");
        const foundLocation = locations.find(l => {
          const locIdNum = typeof l.id === 'string' ? parseInt(l.id, 10) : l.id;
          return locIdNum === entityIdNum;
        });
        if (foundLocation) {
          console.log("[Locations] Found location, opening dialog:", foundLocation.name);
          handleOpenDialog(foundLocation);
          // Clear the state to prevent re-opening on re-render
          window.history.replaceState({}, document.title);
        } else {
          console.log("[Locations] Location not found with ID:", entityId, "(normalized:", entityIdNum, ")");
        }
      }
    } else if (location.state?.openEntityId) {
      console.log("[Locations] Navigation state detected but locations not loaded yet:", {
        entityId: location.state.openEntityId,
        locationsCount: locations.length
      });
    }
  }, [location.state, locations]);

  // Fetch tags for a location
  const fetchLocationTags = async (locationId) => {
    try {
      const tags = await apiClient.get(`/campaigns/${campaignId}/entities/location/${locationId}/tags`);
      setSelectedTagIds(tags.map(tag => tag.id));
    } catch (error) {
      console.error("Failed to fetch location tags:", error);
      setSelectedTagIds([]);
    }
  };

  const handleOpenDialog = async (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || "",
        description: location.description || "",
        location_type: location.location_type || "",
        parent_location_id: location.parent_location_id || null,
        visibility: location.visibility || "dm-only"
      });
      await fetchLocationTags(location.id);
    } else {
      setEditingLocation(null);
      setFormData({
        name: "",
        description: "",
        location_type: "",
        parent_location_id: null,
        visibility: "dm-only"
      });
      setSelectedTagIds([]);
    }
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setDialogTab(0);
    setSelectedTagIds([]);
    setFormData({ name: "", description: "", location_type: "", parent_location_id: null, visibility: "dm-only" });
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
        parent_location_id: formData.parent_location_id || null,
        visibility: formData.visibility
      };

      let locationId;
      if (editingLocation) {
        await apiClient.put(`/campaigns/${campaignId}/locations/${editingLocation.id}`, payload);
        locationId = editingLocation.id;
        setSnackbar({
          open: true,
          message: "Location updated successfully",
          severity: "success"
        });
      } else {
        const result = await apiClient.post(`/campaigns/${campaignId}/locations`, payload);
        locationId = result.id;
        setSnackbar({
          open: true,
          message: "Location created successfully",
          severity: "success"
        });
      }

      // Update tags
      if (locationId) {
        try {
          await apiClient.post(
            `/campaigns/${campaignId}/entities/location/${locationId}/tags`,
            { tagIds: selectedTagIds }
          );
        } catch (error) {
          console.error("Failed to update location tags:", error);
        }
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

  const handleDeleteClick = (locationId) => {
    setItemToDelete(locationId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await apiClient.delete(`/campaigns/${campaignId}/locations/${itemToDelete}`);
      setSnackbar({
        open: true,
        message: "Location deleted successfully",
        severity: "success"
      });
      fetchLocations();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete location:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete location",
        severity: "error"
      });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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

  // Filter out current location from parent options (to prevent cycles)
  const availableParentLocations = locations.filter(
    loc => !editingLocation || loc.id !== editingLocation.id
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 3 }, flexWrap: "wrap" }}>
        <BackButton variant="icon" />
        <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: "auto" } }}>
          <CampaignNav campaignId={campaignId} />
        </Box>
      </Box>

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
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2 } }}>
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
            <LocationOnIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: "primary.main" }} />
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
              Locations
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                display: { xs: "none", sm: "block" },
                fontSize: "0.95rem"
              }}
            >
              Manage locations, cities, dungeons, and other places in your campaign
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ maxWidth: { xs: "100%", sm: 400 } }}
        />
      </Box>

      <Accordion 
        defaultExpanded 
        sx={{ 
          mb: { xs: 2, sm: 3 }, 
          bgcolor: "background.paper",
          background: "linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%)",
          border: "1px solid rgba(192, 163, 110, 0.2)",
          borderRadius: 2,
          "&:before": { display: "none" }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
          sx={{
            bgcolor: "rgba(192, 163, 110, 0.05)",
            "&:hover": { bgcolor: "rgba(192, 163, 110, 0.1)" },
            transition: "background-color 0.2s ease"
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

      <TableContainer 
        component={Paper} 
        sx={{ 
          backgroundColor: "background.paper",
          background: "linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%)",
          border: "1px solid rgba(192, 163, 110, 0.1)",
          borderRadius: 2,
          overflow: "hidden",
          maxHeight: { xs: "calc(100vh - 300px)", sm: "calc(100vh - 350px)" },
          overflowX: "auto",
          overflowY: "auto"
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(192, 163, 110, 0.05)" }}>
              <TableCell 
                sx={{ 
                  minWidth: { xs: 150, sm: 180 }, 
                  cursor: "pointer", 
                  userSelect: "none",
                  fontWeight: 600,
                  color: "primary.main",
                  py: 2,
                  "&:hover": {
                    bgcolor: "rgba(192, 163, 110, 0.1)",
                  }
                }}
                onClick={() => handleSort("name")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Name
                  {sortBy === "name" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ 
                  minWidth: 100, 
                  display: { xs: "none", md: "table-cell" }, 
                  cursor: "pointer", 
                  userSelect: "none",
                  fontWeight: 600,
                  color: "primary.main",
                  py: 2,
                  "&:hover": {
                    bgcolor: "rgba(192, 163, 110, 0.1)",
                  }
                }}
                onClick={() => handleSort("type")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Type
                  {sortBy === "type" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 120, display: { xs: "none", lg: "table-cell" }, fontWeight: 600, color: "primary.main", py: 2 }}>Tags</TableCell>
              <TableCell sx={{ minWidth: 150, display: { xs: "none", lg: "table-cell" }, fontWeight: 600, color: "primary.main", py: 2 }}>Parent Location</TableCell>
              <TableCell sx={{ minWidth: 200, display: { xs: "none", sm: "table-cell" }, fontWeight: 600, color: "primary.main", py: 2 }}>Description</TableCell>
              <TableCell 
                sx={{ 
                  minWidth: 100, 
                  display: { xs: "none", md: "table-cell" }, 
                  cursor: "pointer", 
                  userSelect: "none",
                  fontWeight: 600,
                  color: "primary.main",
                  py: 2,
                  "&:hover": {
                    bgcolor: "rgba(192, 163, 110, 0.1)",
                  }
                }}
                onClick={() => handleSort("created")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Created
                  {sortBy === "created" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 100, fontWeight: 600, color: "primary.main", py: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}><Skeleton variant="text" width="40%" /></TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}><Skeleton variant="text" width="50%" /></TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}><Skeleton variant="text" width="40%" /></TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><Skeleton variant="text" width="80%" /></TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}><Skeleton variant="text" width="30%" /></TableCell>
                  <TableCell align="right"><Skeleton variant="circular" width={32} height={32} /></TableCell>
                </TableRow>
              ))
            ) : sortedLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ p: 0, border: "none" }}>
                  <EmptyState
                    icon={LocationOnIcon}
                    title="No locations yet"
                    description="Create your first location to get started! Locations help you track cities, dungeons, taverns, and other places in your campaign world."
                    suggestions={[
                      "Name the location clearly and descriptively",
                      "Select an appropriate location type (City, Dungeon, Tavern, etc.)",
                      "Use parent locations to create hierarchies (e.g., Tavern within City)",
                      "Describe the location's appearance, atmosphere, and notable features",
                      "Note important NPCs, events, or items associated with the location"
                    ]}
                    actionLabel="Create Location"
                    onAction={() => handleOpenDialog()}
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedLocations.map((location) => (
                <TableRow 
                  key={location.id} 
                  hover
                  onClick={() => handleOpenDialog(location)}
                  sx={{ 
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "rgba(192, 163, 110, 0.08)",
                      transform: "scale(1.01)",
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {location.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    {location.location_type && (
                      <Chip label={location.location_type} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {location.tags && location.tags.length > 0 ? (
                        location.tags.map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{
                              bgcolor: tag.color || "#757575",
                              color: "white",
                              fontSize: "0.7rem",
                              height: 20
                            }}
                          />
                        ))
                      ) : (
                        <Typography color="text.secondary" variant="caption">—</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
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
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {(() => {
                      // Check if description has actual content (not just empty HTML tags)
                      const hasContent = location.description && 
                        location.description.trim() && 
                        location.description.replace(/<[^>]*>/g, '').trim().length > 0;
                      
                      if (hasContent) {
                        return (
                          <Box
                            sx={{ 
                              maxWidth: 300, 
                              overflow: "hidden", 
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              "& p": { margin: 0, display: "inline" },
                              "& *": { display: "inline" }
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(location.description || "") }}
                          />
                        );
                      }
                      return (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                          No description
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {formatDate(location.created_at)}
                      </Typography>
                      {location.created_by_username && (
                        <Typography color="text.secondary" variant="caption" display="block">
                          by {location.created_by_username}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ minWidth: 100 }}>
                    <Tooltip title="Edit Location" arrow>
                      <IconButton
                        onClick={() => handleOpenDialog(location)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Location" arrow>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(location.id);
                        }}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
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
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
            {editingLocation ? "Edit Location" : "New Location"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingLocation ? "Update" : "Create"} a location for this campaign
            {editingLocation && editingLocation.created_by_username && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Created by {editingLocation.created_by_username} on {formatDate(editingLocation.created_at)}
                {editingLocation.last_updated_by_username && editingLocation.last_updated_by_username !== editingLocation.created_by_username && (
                  <> • Last updated by {editingLocation.last_updated_by_username} on {formatDate(editingLocation.updated_at)}</>
                )}
              </Typography>
            )}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: "auto", px: { xs: 2, sm: 3 } }}>
          <Tabs value={dialogTab} onChange={(e, newValue) => setDialogTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Details" />
            <Tab label="Images" />
          </Tabs>

          {dialogTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: { xs: 1, sm: 2 } }}>
            <TextField
              autoFocus
              label="Location Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              size="small"
            />

            <FormControl fullWidth size="small">
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

            <FormControl fullWidth size="small">
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
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Description
              </Typography>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Enter location description..."
                campaignId={campaignId}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Tags
              </Typography>
              <TagSelector
                campaignId={campaignId}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                entityType="location"
                entityId={editingLocation?.id}
                userRole={userRole}
              />
            </Box>

            <Box>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 600 }}>Visibility</FormLabel>
                <RadioGroup
                  row
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  sx={{ flexWrap: { xs: "wrap", sm: "nowrap" } }}
                >
                  <FormControlLabel 
                    value="dm-only" 
                    control={<Radio />} 
                    label="DM Only" 
                  />
                  <FormControlLabel 
                    value="player-visible" 
                    control={<Radio />} 
                    label="DM & Players" 
                  />
                  <FormControlLabel 
                    value="hidden" 
                    control={<Radio />} 
                    label="Hidden" 
                  />
                </RadioGroup>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {formData.visibility === "dm-only" && "Only DMs can see this location"}
                  {formData.visibility === "player-visible" && "Both DMs and players can see this location"}
                  {formData.visibility === "hidden" && "Hidden from all participants"}
                </Typography>
              </FormControl>
            </Box>
          </Box>
          )}

          {dialogTab === 1 && (
            <Box sx={{ pt: 2 }}>
              {editingLocation?.id ? (
                <ImageGallery
                  campaignId={campaignId}
                  entityType="location"
                  entityId={editingLocation.id}
                  onUpdate={fetchLocations}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    Save the location first to upload images.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, flexWrap: { xs: "wrap", sm: "nowrap" }, gap: { xs: 1, sm: 0 } }}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Location?
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this location? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Delete
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
