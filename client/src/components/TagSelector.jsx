// client/src/components/TagSelector.jsx - Tag selection and display component
import { useState, useEffect } from "react";
import {
  Box,
  Chip,
  Autocomplete,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { apiClient } from "../services/apiClient";

const PRESET_COLORS = [
  "#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33",
  "#FF8C33", "#33FFF5", "#8C33FF", "#FF3333", "#33FF8C",
  "#FFD700", "#FF69B4", "#00CED1", "#32CD32", "#FF6347",
];

export default function TagSelector({ 
  campaignId, 
  selectedTagIds = [], 
  onChange, 
  entityType, 
  entityId,
  userRole = "dm",
  disabled = false 
}) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openManager, setOpenManager] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({ name: "", color: "#FF5733", is_premade: false });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Fetch tags for campaign
  const fetchTags = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log("[TagSelector] Fetching tags for campaign:", campaignId);
      const data = await apiClient.get(`/campaigns/${campaignId}/tags`);
      console.log("[TagSelector] Tags received:", data);
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[TagSelector] Failed to fetch tags:", error);
      setTags([]);
      setSnackbar({
        open: true,
        message: "Failed to load tags",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [campaignId]);

  // Get selected tags
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // Handle tag selection
  const handleTagChange = (newSelectedTags) => {
    const newTagIds = newSelectedTags.map(tag => tag.id);
    onChange(newTagIds);
    // Don't auto-save - tags will be saved when the form is submitted
  };


  // Tag management functions
  const handleCreateTag = async () => {
    if (!tagForm.name.trim()) {
      setSnackbar({
        open: true,
        message: "Tag name is required",
        severity: "error"
      });
      return;
    }

    try {
      await apiClient.post(`/campaigns/${campaignId}/tags`, tagForm);
      setSnackbar({
        open: true,
        message: "Tag created successfully",
        severity: "success"
      });
      setTagForm({ name: "", color: "#FF5733", is_premade: false });
      fetchTags();
    } catch (error) {
      console.error("Failed to create tag:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to create tag",
        severity: "error"
      });
    }
  };

  const handleUpdateTag = async () => {
    if (!tagForm.name.trim()) {
      setSnackbar({
        open: true,
        message: "Tag name is required",
        severity: "error"
      });
      return;
    }

    try {
      await apiClient.put(`/campaigns/${campaignId}/tags/${editingTag.id}`, tagForm);
      setSnackbar({
        open: true,
        message: "Tag updated successfully",
        severity: "success"
      });
      setEditingTag(null);
      setTagForm({ name: "", color: "#FF5733", is_premade: false });
      fetchTags();
    } catch (error) {
      console.error("Failed to update tag:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to update tag",
        severity: "error"
      });
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (!window.confirm("Are you sure you want to delete this tag? It will be removed from all entities.")) {
      return;
    }

    try {
      await apiClient.delete(`/campaigns/${campaignId}/tags/${tagId}`);
      setSnackbar({
        open: true,
        message: "Tag deleted successfully",
        severity: "success"
      });
      fetchTags();
      // Remove from selected tags if it was selected
      if (selectedTagIds.includes(tagId)) {
        onChange(selectedTagIds.filter(id => id !== tagId));
      }
    } catch (error) {
      console.error("Failed to delete tag:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete tag",
        severity: "error"
      });
    }
  };

  const handleOpenEditDialog = (tag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      color: tag.color || "#FF5733",
      is_premade: tag.is_premade === 1 || tag.is_premade === true
    });
    setOpenManager(true);
  };

  const handleCloseManager = () => {
    setOpenManager(false);
    setEditingTag(null);
    setTagForm({ name: "", color: "#FF5733", is_premade: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading tags...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
        <Autocomplete
          multiple
          disabled={disabled || userRole !== "dm"}
          options={tags}
          value={selectedTags}
          onChange={(event, newValue) => handleTagChange(newValue)}
          getOptionLabel={(option) => option.name || ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText={tags.length === 0 ? "No tags yet. Click + to create one." : "No matching tags"}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder={tags.length === 0 ? "No tags yet. Click + to create one." : "Select tags..."}
              size="small"
              sx={{ minWidth: 200 }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                size="small"
                sx={{
                  bgcolor: option.color || "#757575",
                  color: "white",
                  "& .MuiChip-deleteIcon": {
                    color: "white"
                  }
                }}
              />
            ))
          }
        />
        {userRole === "dm" && (
          <IconButton
            size="small"
            onClick={() => {
              setEditingTag(null);
              setTagForm({ name: "", color: "#FF5733", is_premade: false });
              setOpenManager(true);
            }}
            disabled={disabled}
          >
            <AddIcon />
          </IconButton>
        )}
      </Box>

      {/* Tag Manager Dialog */}
      <Dialog open={openManager} onClose={handleCloseManager} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTag ? "Edit Tag" : "Create New Tag"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              autoFocus
              label="Tag Name"
              fullWidth
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              required
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {PRESET_COLORS.map((color) => (
                  <Grid item key={color}>
                    <Box
                      onClick={() => setTagForm({ ...tagForm, color })}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: color,
                        borderRadius: 1,
                        cursor: "pointer",
                        border: tagForm.color === color ? 3 : 1,
                        borderColor: tagForm.color === color ? "primary.main" : "divider",
                        "&:hover": {
                          opacity: 0.8
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
              <TextField
                label="Custom Color (Hex)"
                fullWidth
                value={tagForm.color}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    setTagForm({ ...tagForm, color: value });
                  }
                }}
                placeholder="#FF5733"
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: tagForm.color || "#FF5733",
                        borderRadius: 0.5,
                        mr: 1,
                        border: 1,
                        borderColor: "divider"
                      }}
                    />
                  )
                }}
              />
            </Box>

            <FormControl>
              <InputLabel>Tag Type</InputLabel>
              <Select
                value={tagForm.is_premade ? "premade" : "custom"}
                onChange={(e) => setTagForm({ ...tagForm, is_premade: e.target.value === "premade" })}
                label="Tag Type"
              >
                <MenuItem value="custom">Custom Tag</MenuItem>
                <MenuItem value="premade">Pre-made Tag</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManager}>Cancel</Button>
          <Button
            onClick={editingTag ? handleUpdateTag : handleCreateTag}
            variant="contained"
            disabled={!tagForm.name.trim()}
          >
            {editingTag ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Management Section (Collapsible) */}
      {userRole === "dm" && tags.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption" color="text.secondary">
              Manage Tags ({tags.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  sx={{
                    bgcolor: tag.color || "#757575",
                    color: "white",
                  }}
                  onDelete={() => handleDeleteTag(tag.id)}
                  onClick={() => handleOpenEditDialog(tag)}
                  deleteIcon={<EditIcon sx={{ color: "white !important" }} />}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
