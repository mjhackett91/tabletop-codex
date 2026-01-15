// client/src/pages/Factions.jsx - Factions management page
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
  Skeleton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";
import ImageGallery from "../components/ImageGallery";
import TagSelector from "../components/TagSelector";
import EmptyState from "../components/EmptyState";
import { sanitizeHTML } from "../utils/sanitize.js";

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
  "Unaligned"
];

export default function Factions() {
  const { id: campaignId } = useParams();
  const location = useLocation();
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFaction, setEditingFaction] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    alignment: "",
    goals: "",
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

  // Fetch factions
  const fetchFactions = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching factions for campaign:", campaignId);
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      
      const data = await apiClient.get(`/campaigns/${campaignId}/factions?${params.toString()}`);
      console.log("Factions data received:", data);
      setFactions(data);
    } catch (error) {
      console.error("Failed to fetch factions:", error);
      setSnackbar({
        open: true,
        message: "Failed to load factions",
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
    fetchFactions();
    fetchUserRole();
  }, [campaignId, debouncedSearchTerm]);

  // Check for navigation state to auto-open entity dialog
  useEffect(() => {
    if (location.state?.openEntityId && factions.length > 0) {
      const entityId = location.state.openEntityId;
      const entityType = location.state.entityType;
      
      if (entityType === "faction") {
        // Normalize IDs to numbers for comparison (handle both string and number IDs)
        const entityIdNum = typeof entityId === 'string' ? parseInt(entityId, 10) : entityId;
        const faction = factions.find(f => {
          const facIdNum = typeof f.id === 'string' ? parseInt(f.id, 10) : f.id;
          return facIdNum === entityIdNum;
        });
        if (faction) {
          handleOpenDialog(faction);
          // Clear the state to prevent re-opening on re-render
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [location.state, factions]);

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

  // Sort factions based on current sort settings
  const sortedFactions = (Array.isArray(factions) ? [...factions] : []).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "name":
        aValue = (a.name || "").toLowerCase();
        bValue = (b.name || "").toLowerCase();
        break;
      case "alignment":
        aValue = (a.alignment || "").toLowerCase();
        bValue = (b.alignment || "").toLowerCase();
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

  // Fetch tags for a faction
  const fetchFactionTags = async (factionId) => {
    try {
      const tags = await apiClient.get(`/campaigns/${campaignId}/entities/faction/${factionId}/tags`);
      setSelectedTagIds(tags.map(tag => tag.id));
    } catch (error) {
      console.error("Failed to fetch faction tags:", error);
      setSelectedTagIds([]);
    }
  };

  const handleOpenDialog = async (faction = null) => {
    if (faction) {
      setEditingFaction(faction);
      setFormData({
        name: faction.name || "",
        description: faction.description || "",
        alignment: faction.alignment || "",
        goals: faction.goals || "",
        visibility: faction.visibility || "dm-only"
      });
      await fetchFactionTags(faction.id);
    } else {
      setEditingFaction(null);
      setFormData({
        name: "",
        description: "",
        alignment: "",
        goals: "",
        visibility: "dm-only"
      });
      setSelectedTagIds([]);
    }
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFaction(null);
    setDialogTab(0);
    setSelectedTagIds([]);
    setFormData({ name: "", description: "", alignment: "", goals: "", visibility: "dm-only" });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setSnackbar({
        open: true,
        message: "Faction name is required",
        severity: "error"
      });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description || "",
        alignment: formData.alignment || null,
        goals: formData.goals || "",
        visibility: formData.visibility
      };

      let factionId;
      if (editingFaction) {
        await apiClient.put(`/campaigns/${campaignId}/factions/${editingFaction.id}`, payload);
        factionId = editingFaction.id;
        setSnackbar({
          open: true,
          message: "Faction updated successfully",
          severity: "success"
        });
      } else {
        const result = await apiClient.post(`/campaigns/${campaignId}/factions`, payload);
        factionId = result.id;
        setSnackbar({
          open: true,
          message: "Faction created successfully",
          severity: "success"
        });
      }

      // Update tags
      if (factionId) {
        try {
          await apiClient.post(
            `/campaigns/${campaignId}/entities/faction/${factionId}/tags`,
            { tagIds: selectedTagIds }
          );
        } catch (error) {
          console.error("Failed to update faction tags:", error);
        }
      }

      handleCloseDialog();
      fetchFactions();
    } catch (error) {
      console.error("Failed to save faction:", error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingFaction ? "update" : "create"} faction`,
        severity: "error"
      });
    }
  };

  const handleDeleteClick = (factionId) => {
    setItemToDelete(factionId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await apiClient.delete(`/campaigns/${campaignId}/factions/${itemToDelete}`);
      setSnackbar({
        open: true,
        message: "Faction deleted successfully",
        severity: "success"
      });
      fetchFactions();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete faction:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete faction",
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
            <GroupsIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: "primary.main" }} />
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
              Factions
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: "0.95rem" }}
            >
              Manage factions, organizations, and groups in your campaign
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search factions..."
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
              Creating Factions: What to Include
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Name the faction clearly and descriptively
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Select an alignment that represents the faction's overall philosophy
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Describe the faction's purpose, structure, and key members
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              List the faction's goals, motivations, and current objectives
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Note relationships with other factions, locations, or important NPCs
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
                  cursor: "pointer", 
                  userSelect: "none",
                  fontWeight: 600, 
                  color: "primary.main", 
                  py: 2,
                  "&:hover": {
                    bgcolor: "rgba(192, 163, 110, 0.1)",
                  }
                }}
                onClick={() => handleSort("alignment")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Alignment
                  {sortBy === "alignment" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Tags</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Goals</TableCell>
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
                  <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="30%" /></TableCell>
                  <TableCell align="right"><Skeleton variant="circular" width={32} height={32} /></TableCell>
                </TableRow>
              ))
            ) : sortedFactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ p: 0, border: "none" }}>
                  <EmptyState
                    icon={GroupsIcon}
                    title="No factions yet"
                    description="Create your first faction to get started! Factions help you track organizations, guilds, and groups in your campaign world."
                    suggestions={[
                      "Define the faction's goals, values, and alignment",
                      "Note key members and leadership structure",
                      "Describe relationships with other factions and entities",
                      "Track faction resources, territories, and influence",
                      "Link factions to related characters, locations, and quests"
                    ]}
                    actionLabel="Create Faction"
                    onAction={() => handleOpenDialog()}
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedFactions.map((faction) => (
                <TableRow 
                  key={faction.id} 
                  hover
                  onClick={() => handleOpenDialog(faction)}
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
                      {faction.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {faction.alignment && (
                      <Chip label={faction.alignment} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {faction.tags && faction.tags.length > 0 ? (
                        faction.tags.map((tag) => (
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
                    {(() => {
                      // Check if description has actual content (not just empty HTML tags)
                      const hasContent = faction.description && 
                        faction.description.trim() && 
                        faction.description.replace(/<[^>]*>/g, '').trim().length > 0;
                      
                      if (hasContent) {
                        return (
                          <Box
                            sx={{ 
                              maxWidth: 250, 
                              overflow: "hidden", 
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              "& p": { margin: 0, display: "inline" },
                              "& *": { display: "inline" }
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(faction.description || "") }}
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
                  <TableCell>
                    <Typography 
                      color="text.secondary" 
                      variant="body2"
                      sx={{ 
                        maxWidth: 200, 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {faction.goals || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {formatDate(faction.created_at)}
                      </Typography>
                      {faction.created_by_username && (
                        <Typography color="text.secondary" variant="caption" display="block">
                          by {faction.created_by_username}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      onClick={() => handleOpenDialog(faction)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(faction.id);
                      }}
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
        aria-label="add faction"
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
          {editingFaction ? "Edit Faction" : "New Faction"}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingFaction ? "Update" : "Create"} a faction for this campaign
            {editingFaction && editingFaction.created_by_username && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Created by {editingFaction.created_by_username} on {formatDate(editingFaction.created_at)}
                {editingFaction.last_updated_by_username && editingFaction.last_updated_by_username !== editingFaction.created_by_username && (
                  <> • Last updated by {editingFaction.last_updated_by_username} on {formatDate(editingFaction.updated_at)}</>
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
              label="Faction Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <TextField
              label="Alignment"
              fullWidth
              select
              value={formData.alignment}
              onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
              variant="outlined"
            >
              <MenuItem value="">None</MenuItem>
              {ALIGNMENTS.map((alignment) => (
                <MenuItem key={alignment} value={alignment}>{alignment}</MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Enter faction description..."
                campaignId={campaignId}
              />
            </Box>

            <TextField
              label="Goals & Objectives"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="List the faction's goals, motivations, and current objectives..."
              helperText="What does this faction want to achieve?"
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <TagSelector
                campaignId={campaignId}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                entityType="faction"
                entityId={editingFaction?.id}
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
                  {formData.visibility === "dm-only" && "Only DMs can see this faction"}
                  {formData.visibility === "player-visible" && "Both DMs and players can see this faction"}
                  {formData.visibility === "hidden" && "Hidden from all participants"}
                </Typography>
              </FormControl>
            </Box>
          </Box>
          )}

          {dialogTab === 1 && (
            <Box sx={{ pt: 2 }}>
              {editingFaction?.id ? (
                <ImageGallery
                  campaignId={campaignId}
                  entityType="faction"
                  entityId={editingFaction.id}
                  onUpdate={fetchFactions}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    Save the faction first to upload images.
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
            disabled={!formData.name.trim()}
          >
            {editingFaction ? "Update" : "Create"} Faction
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
          Delete Faction?
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this faction? This action cannot be undone.
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
