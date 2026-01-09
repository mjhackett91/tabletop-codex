// client/src/pages/WorldInfo.jsx - World Info management page
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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";
import ImageGallery from "../components/ImageGallery";
import TagSelector from "../components/TagSelector";

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

  // Fetch world info
  const fetchWorldInfo = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching world info for campaign:", campaignId);
      const data = await apiClient.get(`/api/campaigns/${campaignId}/world-info`);
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
      const roleData = await apiClient.get(`/api/campaigns/${campaignId}/my-role`);
      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error("Failed to fetch user role:", error);
    }
  };

  useEffect(() => {
    fetchWorldInfo();
    fetchUserRole();
  }, [campaignId]);

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

  // Fetch tags for a world info entry
  const fetchWorldInfoTags = async (infoId) => {
    try {
      const tags = await apiClient.get(`/api/campaigns/${campaignId}/entities/world_info/${infoId}/tags`);
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
        await apiClient.put(`/api/campaigns/${campaignId}/world-info/${editingWorldInfo.id}`, payload);
        infoId = editingWorldInfo.id;
        setSnackbar({
          open: true,
          message: "World info updated successfully",
          severity: "success"
        });
      } else {
        const result = await apiClient.post(`/api/campaigns/${campaignId}/world-info`, payload);
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
            `/api/campaigns/${campaignId}/entities/world_info/${infoId}/tags`,
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

  const handleDelete = async (infoId) => {
    if (!window.confirm("Are you sure you want to delete this world info?")) {
      return;
    }

    try {
      await apiClient.delete(`/api/campaigns/${campaignId}/world-info/${infoId}`);
      setSnackbar({
        open: true,
        message: "World info deleted successfully",
        severity: "success"
      });
      fetchWorldInfo();
    } catch (error) {
      console.error("Failed to delete world info:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete world info",
        severity: "error"
      });
    }
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

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <MenuBookIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4">World Information</Typography>
            <Typography variant="body2" color="text.secondary">
              Store lore, history, magic systems, and other campaign world details
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

      <TableContainer component={Paper} sx={{ backgroundColor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading world info...</Typography>
                </TableCell>
              </TableRow>
            ) : worldInfo.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No world information yet. Create your first entry!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              worldInfo.map((info) => (
                <TableRow 
                  key={info.id} 
                  hover
                  onClick={() => handleOpenDialog(info)}
                  sx={{ 
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover"
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
                        __html: info.content || "<span style='color: #bdbdbd'>No content</span>" 
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
                    <IconButton
                      onClick={() => handleOpenDialog(info)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(info.id)}
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
            <Tab label="Images" disabled={!editingWorldInfo?.id} />
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

          {dialogTab === 1 && editingWorldInfo?.id && (
            <Box sx={{ pt: 2 }}>
              <ImageGallery
                campaignId={campaignId}
                entityType="world_info"
                entityId={editingWorldInfo.id}
                onUpdate={fetchWorldInfo}
              />
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
