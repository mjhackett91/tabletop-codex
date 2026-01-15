// client/src/pages/WorldInfo.jsx - World Info management page
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { sanitizeHTML } from "../utils/sanitize.js";
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
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";
import ImageGallery from "../components/ImageGallery";
import TagSelector from "../components/TagSelector";
import EmptyState from "../components/EmptyState";

const CATEGORIES = [
  "History",
  "Magic",
  "Religion",
  "Lore",
  "Timeline",
  "Geography",
  "Politics",
  "Culture",
  "Economics",
  "Technology",
  "Custom"
];

export default function WorldInfo() {
  const { id: campaignId } = useParams();
  const location = useLocation();
  const [worldInfo, setWorldInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWorldInfo, setEditingWorldInfo] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  const [formData, setFormData] = useState({ 
    title: "", 
    content: "", 
    category: "",
    visibility: "dm-only"
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Fetch world info
  const fetchWorldInfo = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching world info for campaign:", campaignId);
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      
      const data = await apiClient.get(`/campaigns/${campaignId}/world-info?${params.toString()}`);
      console.log("World info data received:", data);
      setWorldInfo(data);
    } catch (error) {
      console.error("Failed to fetch world info:", error);
      setSnackbar({
        open: true,
        message: "Failed to load world info",
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
    fetchWorldInfo();
    fetchUserRole();
  }, [campaignId, debouncedSearchTerm]);

  // Check for navigation state to auto-open entity dialog
  useEffect(() => {
    if (location.state?.openEntityId && worldInfo.length > 0) {
      const entityId = location.state.openEntityId;
      const entityType = location.state.entityType;
      
      if (entityType === "world_info") {
        // Normalize IDs to numbers for comparison (handle both string and number IDs)
        const entityIdNum = typeof entityId === 'string' ? parseInt(entityId, 10) : entityId;
        const info = worldInfo.find(w => {
          const infoIdNum = typeof w.id === 'string' ? parseInt(w.id, 10) : w.id;
          return infoIdNum === entityIdNum;
        });
        if (info) {
          handleOpenDialog(info);
          // Clear the state to prevent re-opening on re-render
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [location.state, worldInfo]);

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

  // Sort world info based on current sort settings
  const sortedWorldInfo = (Array.isArray(worldInfo) ? [...worldInfo] : []).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "title":
        aValue = (a.title || "").toLowerCase();
        bValue = (b.title || "").toLowerCase();
        break;
      case "category":
        aValue = (a.category || "").toLowerCase();
        bValue = (b.category || "").toLowerCase();
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

  // Fetch tags for a world info entry
  const fetchWorldInfoTags = async (infoId) => {
    try {
      const tags = await apiClient.get(`/campaigns/${campaignId}/entities/world_info/${infoId}/tags`);
      setSelectedTagIds(tags.map(tag => tag.id));
    } catch (error) {
      console.error("Failed to fetch world info tags:", error);
      setSelectedTagIds([]);
    }
  };

  const handleOpenDialog = async (info = null) => {
    if (info) {
      setEditingWorldInfo(info);
      setFormData({
        title: info.title || "",
        content: info.content || "",
        category: info.category || "",
        visibility: info.visibility || "dm-only"
      });
      await fetchWorldInfoTags(info.id);
    } else {
      setEditingWorldInfo(null);
      setFormData({
        title: "",
        content: "",
        category: "",
        visibility: "dm-only"
      });
      setSelectedTagIds([]);
    }
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWorldInfo(null);
    setDialogTab(0);
    setSelectedTagIds([]);
    setFormData({ title: "", content: "", category: "", visibility: "dm-only" });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setSnackbar({
        open: true,
        message: "Title is required",
        severity: "error"
      });
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content || "",
        category: formData.category || null
      };

      let infoId;
      if (editingWorldInfo) {
        await apiClient.put(`/campaigns/${campaignId}/world-info/${editingWorldInfo.id}`, payload);
        infoId = editingWorldInfo.id;
        setSnackbar({
          open: true,
          message: "World info updated successfully",
          severity: "success"
        });
      } else {
        const result = await apiClient.post(`/campaigns/${campaignId}/world-info`, payload);
        infoId = result.id;
        setSnackbar({
          open: true,
          message: "World info created successfully",
          severity: "success"
        });
      }

      // Update tags
      if (infoId) {
        try {
          await apiClient.post(
            `/campaigns/${campaignId}/entities/world_info/${infoId}/tags`,
            { tagIds: selectedTagIds }
          );
        } catch (error) {
          console.error("Failed to update world info tags:", error);
        }
      }

      handleCloseDialog();
      fetchWorldInfo();
    } catch (error) {
      console.error("Failed to save world info:", error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingWorldInfo ? "update" : "create"} world info`,
        severity: "error"
      });
    }
  };

  const handleDeleteClick = (infoId) => {
    setItemToDelete(infoId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await apiClient.delete(`/campaigns/${campaignId}/world-info/${itemToDelete}`);
      setSnackbar({
        open: true,
        message: "World info deleted successfully",
        severity: "success"
      });
      fetchWorldInfo();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete world info:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete world info",
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

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BackButton variant="icon" />
        <CampaignNav campaignId={campaignId} />
      </Box>

      <Box sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        mb: 4,
        pb: 3,
        borderBottom: "1px solid rgba(192, 163, 110, 0.2)"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
            <MenuBookIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: "primary.main" }} />
          </Box>
          <Box>
            <Typography 
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                letterSpacing: "0.5px",
                fontSize: { xs: "1.75rem", sm: "2.25rem" },
                mb: 0.5
              }}
            >
              World Information
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: "0.95rem" }}
            >
              Store lore, history, magic systems, and other campaign world details
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search world info..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ maxWidth: { xs: "100%", sm: 400 } }}
        />
      </Box>

      <Accordion 
        defaultExpanded 
        sx={{ 
          mb: 3, 
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
              Creating World Information: What to Include
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Choose a clear, descriptive title for your world information entry
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Select a category (History, Magic, Religion, Lore, etc.) to organize your content
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Use rich text formatting to create well-structured, readable entries
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Link to other entities using wiki-style notation (coming soon)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Document historical events, magical systems, religious practices, cultural traditions, and more
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
          overflow: "hidden"
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(192, 163, 110, 0.05)" }}>
              <TableCell 
                sx={{ 
                  cursor: "pointer", 
                  userSelect: "none",
                  fontWeight: 600, 
                  color: "primary.main", 
                  py: 2,
                  "&:hover": {
                    bgcolor: "rgba(192, 163, 110, 0.1)",
                  }
                }}
                onClick={() => handleSort("title")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Title
                  {sortBy === "title" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ 
                  cursor: "pointer", 
                  userSelect: "none",
                  fontWeight: 600, 
                  color: "primary.main", 
                  py: 2,
                  "&:hover": {
                    bgcolor: "rgba(192, 163, 110, 0.1)",
                  }
                }}
                onClick={() => handleSort("category")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Category
                  {sortBy === "category" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Tags</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Content</TableCell>
              <TableCell 
                sx={{ 
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
              <TableCell align="right" sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="40%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="50%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="30%" /></TableCell>
                  <TableCell align="right"><Skeleton variant="circular" width={32} height={32} /></TableCell>
                </TableRow>
              ))
            ) : sortedWorldInfo.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, border: "none" }}>
                  <EmptyState
                    icon={MenuBookIcon}
                    title="No world information yet"
                    description="Create your first world information entry to get started! World information helps you document lore, history, magic systems, and other important details about your campaign world."
                    suggestions={[
                      "Choose a clear, descriptive title for your entry",
                      "Select an appropriate category (History, Magic, Religion, etc.)",
                      "Use rich text formatting to organize information clearly",
                      "Link entries to related characters, locations, and quests",
                      "Keep entries organized and easy to reference during sessions"
                    ]}
                    actionLabel="Create World Information"
                    onAction={() => handleOpenDialog()}
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedWorldInfo.map((info) => (
                <TableRow 
                  key={info.id} 
                  hover
                  onClick={() => handleOpenDialog(info)}
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
                      {info.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {info.category && (
                      <Chip label={info.category} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {info.tags && info.tags.length > 0 ? (
                        info.tags.map((tag) => (
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
                  <TableCell>
                    <Box
                      sx={{ 
                        maxWidth: 400, 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        "& p": { margin: 0, display: "inline" },
                        "& *": { display: "inline" }
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: sanitizeHTML(info.content || "<span style='color: #bdbdbd'>No content</span>")
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {formatDate(info.created_at)}
                      </Typography>
                      {info.created_by_username && (
                        <Typography color="text.secondary" variant="caption" display="block">
                          by {info.created_by_username}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit World Information" arrow>
                      <IconButton
                        onClick={() => handleOpenDialog(info)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete World Information" arrow>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(info.id);
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
        aria-label="add world info"
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
          {editingWorldInfo ? "Edit World Information" : "New World Information"}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingWorldInfo ? "Update" : "Create"} a world information entry for this campaign
            {editingWorldInfo && editingWorldInfo.created_by_username && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Created by {editingWorldInfo.created_by_username} on {formatDate(editingWorldInfo.created_at)}
                {editingWorldInfo.last_updated_by_username && editingWorldInfo.last_updated_by_username !== editingWorldInfo.created_by_username && (
                  <> • Last updated by {editingWorldInfo.last_updated_by_username} on {formatDate(editingWorldInfo.updated_at)}</>
                )}
              </Typography>
            )}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Tabs value={dialogTab} onChange={(e, newValue) => setDialogTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Details" />
            <Tab label="Images" />
          </Tabs>

          {dialogTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              autoFocus
              label="Title"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., The Great War of 1423"
            />

            <TextField
              label="Category"
              fullWidth
              select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              variant="outlined"
              helperText="Select a category to organize your world information"
            >
              <MenuItem value="">None</MenuItem>
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Content
              </Typography>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData({ ...formData, content: html })}
                placeholder="Enter world information content..."
                campaignId={campaignId}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <TagSelector
                campaignId={campaignId}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                entityType="world_info"
                entityId={editingWorldInfo?.id}
                userRole={userRole}
              />
            </Box>

            <Box>
              <FormControl component="fieldset">
                <FormLabel component="legend">Visibility</FormLabel>
                <RadioGroup
                  row
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
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
                  {formData.visibility === "dm-only" && "Only DMs can see this world info"}
                  {formData.visibility === "player-visible" && "Both DMs and players can see this world info"}
                  {formData.visibility === "hidden" && "Hidden from all participants"}
                </Typography>
              </FormControl>
            </Box>
          </Box>
          )}

          {dialogTab === 1 && (
            <Box sx={{ pt: 2 }}>
              {editingWorldInfo?.id ? (
                <ImageGallery
                  campaignId={campaignId}
                  entityType="world_info"
                  entityId={editingWorldInfo.id}
                  onUpdate={fetchWorldInfo}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    Save the world info entry first to upload images.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color="primary"
            disabled={!formData.title.trim()}
          >
            {editingWorldInfo ? "Update" : "Create"} Entry
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
          Delete World Info?
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this world info? This action cannot be undone.
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
