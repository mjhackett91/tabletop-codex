// client/src/pages/Quests.jsx - Enhanced Quests management page
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
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";

const QUEST_TYPES = [
  { value: "main", label: "Main Quest" },
  { value: "side", label: "Side Quest" },
  { value: "faction", label: "Faction Quest" },
  { value: "personal", label: "Personal Character Quest" },
  { value: "one-shot", label: "One-Shot / Session Quest" },
];

const QUEST_STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "on-hold", label: "On Hold" },
  { value: "abandoned", label: "Abandoned" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "time-sensitive", label: "Time-Sensitive" },
];

const OBJECTIVE_TYPES = [
  { value: "primary", label: "Primary" },
  { value: "optional", label: "Optional" },
  { value: "hidden", label: "Hidden (DM Only)" },
];

const OBJECTIVE_STATUSES = [
  { value: "incomplete", label: "Incomplete" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
];

export default function Quests() {
  const { id: campaignId } = useParams();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    quest_type: "",
    status: "active",
    short_summary: "",
    description: "",
    quest_giver: "",
    initial_hook: "",
    rewards: "",
    consequences: "",
    urgency_level: "",
    estimated_sessions: "",
    difficulty: "",
    introduced_in_session: "",
    completed_in_session: "",
  });
  const [objectives, setObjectives] = useState([]);
  const [links, setLinks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  // Entity data for linking
  const [availableEntities, setAvailableEntities] = useState({
    characters: [],
    locations: [],
    factions: [],
    world_info: [],
    quests: []
  });
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Fetch quests
  const fetchQuests = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient.get(`/api/campaigns/${campaignId}/quests`);
      setQuests(data);
    } catch (error) {
      console.error("Failed to fetch quests:", error);
      setSnackbar({
        open: true,
        message: "Failed to load quests",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [campaignId]);

  const handleOpenDialog = async (quest = null) => {
    if (quest) {
      // Fetch full quest with relationships
      try {
        const fullQuest = await apiClient.get(`/api/campaigns/${campaignId}/quests/${quest.id}`);
        setEditingQuest(fullQuest);
        setFormData({
          title: fullQuest.title || "",
          quest_type: fullQuest.quest_type || "",
          status: fullQuest.status || "active",
          short_summary: fullQuest.short_summary || "",
          description: fullQuest.description || "",
          quest_giver: fullQuest.quest_giver || "",
          initial_hook: fullQuest.initial_hook || "",
          rewards: fullQuest.rewards || "",
          consequences: fullQuest.consequences || "",
          urgency_level: fullQuest.urgency_level || "",
          estimated_sessions: fullQuest.estimated_sessions?.toString() || "",
          difficulty: fullQuest.difficulty || "",
          introduced_in_session: fullQuest.introduced_in_session?.toString() || "",
          completed_in_session: fullQuest.completed_in_session?.toString() || "",
        });
        setObjectives(fullQuest.objectives || []);
        setLinks(fullQuest.links || []);
        setMilestones(fullQuest.milestones || []);
      } catch (error) {
        console.error("Failed to fetch quest details:", error);
        setSnackbar({
          open: true,
          message: "Failed to load quest details",
          severity: "error"
        });
        return;
      }
    } else {
      setEditingQuest(null);
      setFormData({
        title: "",
        quest_type: "",
        status: "active",
        short_summary: "",
        description: "",
        quest_giver: "",
        initial_hook: "",
        rewards: "",
        consequences: "",
        urgency_level: "",
        estimated_sessions: "",
        difficulty: "",
        introduced_in_session: "",
        completed_in_session: "",
      });
      setObjectives([]);
      setLinks([]);
      setMilestones([]);
    }
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingQuest(null);
    setDialogTab(0);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setSnackbar({
        open: true,
        message: "Quest title is required",
        severity: "error"
      });
      return;
    }

    try {
      const payload = {
        ...formData,
        estimated_sessions: formData.estimated_sessions ? parseInt(formData.estimated_sessions) : null,
        introduced_in_session: formData.introduced_in_session ? parseInt(formData.introduced_in_session) : null,
        completed_in_session: formData.completed_in_session ? parseInt(formData.completed_in_session) : null,
        objectives: objectives,
        links: links.filter(link => link.entity_id), // Only include links with selected entities
        milestones: milestones.filter(m => m.title && m.title.trim()), // Only include milestones with titles
      };

      if (editingQuest) {
        await apiClient.put(`/api/campaigns/${campaignId}/quests/${editingQuest.id}`, payload);
        setSnackbar({
          open: true,
          message: "Quest updated successfully",
          severity: "success"
        });
      } else {
        await apiClient.post(`/api/campaigns/${campaignId}/quests`, payload);
        setSnackbar({
          open: true,
          message: "Quest created successfully",
          severity: "success"
        });
      }

      handleCloseDialog();
      fetchQuests();
    } catch (error) {
      console.error("Failed to save quest:", error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingQuest ? "update" : "create"} quest`,
        severity: "error"
      });
    }
  };

  const handleDelete = async (questId) => {
    if (!window.confirm("Are you sure you want to delete this quest? This will also delete all associated objectives, links, and milestones.")) {
      return;
    }

    try {
      await apiClient.delete(`/api/campaigns/${campaignId}/quests/${questId}`);
      setSnackbar({
        open: true,
        message: "Quest deleted successfully",
        severity: "success"
      });
      fetchQuests();
    } catch (error) {
      console.error("Failed to delete quest:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete quest",
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

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "success";
      case "completed": return "primary";
      case "on-hold": return "warning";
      case "failed": return "error";
      case "abandoned": return "default";
      default: return "default";
    }
  };

  const getQuestTypeLabel = (type) => {
    const found = QUEST_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const addObjective = () => {
    setObjectives([...objectives, {
      objective_type: "primary",
      title: "",
      description: "",
      status: "incomplete",
      order_index: objectives.length
    }]);
  };

  const updateObjective = (index, field, value) => {
    const updated = [...objectives];
    updated[index] = { ...updated[index], [field]: value };
    setObjectives(updated);
  };

  const removeObjective = (index) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  // Fetch entities for linking
  const fetchEntities = async () => {
    if (!campaignId) return;
    
    setLoadingEntities(true);
    try {
      console.log("Fetching entities for quest linking, campaign:", campaignId);
      
      // Fetch all character types and combine them
      console.log("Starting to fetch entities for campaign:", campaignId);
      
      const [playerChars, npcs, antagonists, locations, factions, worldInfo, quests] = await Promise.all([
        apiClient.get(`/api/campaigns/${campaignId}/characters?type=player`).catch((e) => { 
          console.error("❌ Failed to fetch player characters:", e.message, e); 
          return []; 
        }),
        apiClient.get(`/api/campaigns/${campaignId}/characters?type=npc`).catch((e) => { 
          console.error("❌ Failed to fetch NPCs:", e.message, e); 
          return []; 
        }),
        apiClient.get(`/api/campaigns/${campaignId}/characters?type=antagonist`).catch((e) => { 
          console.error("❌ Failed to fetch antagonists:", e.message, e); 
          return []; 
        }),
        apiClient.get(`/api/campaigns/${campaignId}/locations`).catch((e) => { 
          console.error("❌ Failed to fetch locations:", e.message, e); 
          return []; 
        }),
        apiClient.get(`/api/campaigns/${campaignId}/factions`).catch((e) => { 
          console.error("❌ Failed to fetch factions:", e.message, e); 
          return []; 
        }),
        apiClient.get(`/api/campaigns/${campaignId}/world-info`).catch((e) => { 
          console.error("❌ Failed to fetch world info:", e.message, e); 
          return []; 
        }),
        apiClient.get(`/api/campaigns/${campaignId}/quests`).catch((e) => { 
          console.error("❌ Failed to fetch quests:", e.message, e); 
          return []; 
        })
      ]);

      console.log("✅ Raw fetch results:", {
        playerChars: playerChars?.length || 0,
        npcs: npcs?.length || 0,
        antagonists: antagonists?.length || 0,
        locations: locations?.length || 0,
        factions: factions?.length || 0,
        worldInfo: worldInfo?.length || 0,
        quests: quests?.length || 0
      });

      // Combine all character types into one array
      const allCharacters = [
        ...(playerChars || []),
        ...(npcs || []),
        ...(antagonists || [])
      ];

      console.log("✅ Combined characters:", allCharacters.length);
      if (allCharacters.length > 0) {
        console.log("   Sample character:", { id: allCharacters[0].id, name: allCharacters[0].name, type: allCharacters[0].type });
      }

      const entitiesData = {
        characters: allCharacters,
        locations: locations || [],
        factions: factions || [],
        world_info: worldInfo || [],
        quests: (quests || []).filter(q => !editingQuest || q.id !== editingQuest.id) // Exclude current quest
      };

      console.log("✅ Final entities to set:", {
        characters: entitiesData.characters.length,
        locations: entitiesData.locations.length,
        factions: entitiesData.factions.length,
        world_info: entitiesData.world_info.length,
        quests: entitiesData.quests.length
      });

      setAvailableEntities(entitiesData);
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    } finally {
      setLoadingEntities(false);
    }
  };

  // Load entities when dialog opens
  useEffect(() => {
    if (openDialog && campaignId) {
      console.log("Dialog opened, fetching entities for campaign:", campaignId);
      fetchEntities();
    }
  }, [openDialog, campaignId]);

  // Link management functions
  const addLink = () => {
    setLinks([...links, {
      entity_type: "character",
      entity_id: "",
      role: "",
      visibility: "dm-only"
    }]);
  };

  const updateLink = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    // Clear entity_id if entity_type changes
    if (field === "entity_type") {
      updated[index].entity_id = "";
    }
    setLinks(updated);
  };

  const removeLink = async (index, linkId) => {
    if (editingQuest && linkId) {
      // Delete from backend
      try {
        await apiClient.delete(`/api/campaigns/${campaignId}/quests/${editingQuest.id}/links/${linkId}`);
        setLinks(links.filter((_, i) => i !== index));
        setSnackbar({
          open: true,
          message: "Link removed successfully",
          severity: "success"
        });
      } catch (error) {
        console.error("Failed to delete link:", error);
        setSnackbar({
          open: true,
          message: "Failed to remove link",
          severity: "error"
        });
      }
    } else {
      // Just remove from local state (new link not saved yet)
      setLinks(links.filter((_, i) => i !== index));
    }
  };

  // Milestone management functions
  const addMilestone = () => {
    setMilestones([...milestones, {
      title: "",
      description: "",
      session_number: null,
      id: null // Explicitly mark as new
    }]);
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const removeMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  // Helper to get the correct entity list from availableEntities based on entity_type
  const getEntityList = (entityType) => {
    // Map entity_type (as stored in links) to availableEntities key
    const keyMap = {
      character: "characters",  // "character" -> "characters"
      location: "locations",
      faction: "factions",
      world_info: "world_info",
      quest: "quests"
    };
    const key = keyMap[entityType] || entityType;
    return availableEntities[key] || [];
  };

  const getEntityName = (entityType, entityId) => {
    const entityList = getEntityList(entityType);
    const entity = entityList.find(e => e.id === parseInt(entityId));
    return entity ? (entity.name || entity.title) : `Unknown (ID: ${entityId})`;
  };

  const getEntityTypeLabel = (type) => {
    const labels = {
      character: "Character/NPC",
      location: "Location",
      faction: "Faction",
      world_info: "World Info",
      quest: "Quest"
    };
    return labels[type] || type;
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BackButton variant="icon" />
        <CampaignNav campaignId={campaignId} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <AssignmentIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4">Quests</Typography>
            <Typography variant="body2" color="text.secondary">
              Track campaign quests, missions, and objectives with comprehensive details
            </Typography>
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Summary</TableCell>
              <TableCell>Urgency</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading quests...</Typography>
                </TableCell>
              </TableRow>
            ) : quests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No quests yet. Create your first quest!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              quests.map((quest) => (
                <TableRow 
                  key={quest.id} 
                  hover
                  onClick={() => handleOpenDialog(quest)}
                  sx={{ 
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover"
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {quest.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {quest.quest_type && (
                      <Chip label={getQuestTypeLabel(quest.quest_type)} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={QUEST_STATUSES.find(s => s.value === quest.status)?.label || quest.status} 
                      size="small" 
                      color={getStatusColor(quest.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        maxWidth: 300, 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {quest.short_summary || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {quest.urgency_level && (
                      <Chip 
                        label={URGENCY_LEVELS.find(u => u.value === quest.urgency_level)?.label || quest.urgency_level} 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      onClick={() => handleOpenDialog(quest)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(quest.id)}
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
        aria-label="add quest"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: "90vh" }
        }}
      >
        <DialogTitle>
          {editingQuest ? "Edit Quest" : "New Quest"}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <Tabs value={dialogTab} onChange={(e, v) => setDialogTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tab label="Core Info" />
            <Tab label="Objectives" />
            <Tab label="Links" />
            <Tab label="Rewards & Consequences" />
            <Tab label="Milestones" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            {dialogTab === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  autoFocus
                  label="Quest Title *"
                  fullWidth
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Quest Type</InputLabel>
                    <Select
                      value={formData.quest_type || ""}
                      onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
                      label="Quest Type"
                    >
                      <MenuItem value="">None</MenuItem>
                      {QUEST_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      label="Status"
                    >
                      {QUEST_STATUSES.map((status) => (
                        <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Short Summary (1-2 sentences, player-facing)"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.short_summary}
                  onChange={(e) => setFormData({ ...formData, short_summary: e.target.value })}
                  placeholder="A brief hook for players..."
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Detailed Description</Typography>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Full narrative context (DM-facing)..."
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="Quest Giver"
                    fullWidth
                    value={formData.quest_giver}
                    onChange={(e) => setFormData({ ...formData, quest_giver: e.target.value })}
                    placeholder="NPC name, 'anonymous', 'letter', 'rumor', etc."
                  />
                  <TextField
                    label="Initial Hook"
                    fullWidth
                    value={formData.initial_hook}
                    onChange={(e) => setFormData({ ...formData, initial_hook: e.target.value })}
                    placeholder="How the party encountered this quest"
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Urgency Level</InputLabel>
                    <Select
                      value={formData.urgency_level || ""}
                      onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                      label="Urgency Level"
                    >
                      <MenuItem value="">None</MenuItem>
                      {URGENCY_LEVELS.map((level) => (
                        <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Estimated Sessions"
                    type="number"
                    fullWidth
                    value={formData.estimated_sessions}
                    onChange={(e) => setFormData({ ...formData, estimated_sessions: e.target.value })}
                  />
                  <TextField
                    label="Difficulty"
                    fullWidth
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    placeholder="e.g., Easy, Medium, Hard"
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="Introduced in Session #"
                    type="number"
                    fullWidth
                    value={formData.introduced_in_session}
                    onChange={(e) => setFormData({ ...formData, introduced_in_session: e.target.value })}
                  />
                  <TextField
                    label="Completed in Session #"
                    type="number"
                    fullWidth
                    value={formData.completed_in_session}
                    onChange={(e) => setFormData({ ...formData, completed_in_session: e.target.value })}
                  />
                </Box>
              </Box>
            )}

            {dialogTab === 1 && (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">Objectives</Typography>
                  <Button startIcon={<AddIcon />} onClick={addObjective} size="small">
                    Add Objective
                  </Button>
                </Box>
                {objectives.map((obj, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <TextField
                        label="Type"
                        select
                        size="small"
                        value={obj.objective_type}
                        onChange={(e) => updateObjective(index, "objective_type", e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{ minWidth: 120 }}
                      >
                        {OBJECTIVE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </TextField>
                      <TextField
                        label="Status"
                        select
                        size="small"
                        value={obj.status}
                        onChange={(e) => updateObjective(index, "status", e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{ minWidth: 120 }}
                      >
                        {OBJECTIVE_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </TextField>
                      <IconButton
                        onClick={() => removeObjective(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <TextField
                      label="Objective Title"
                      fullWidth
                      size="small"
                      value={obj.title}
                      onChange={(e) => updateObjective(index, "title", e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Description / Notes"
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      value={obj.description || ""}
                      onChange={(e) => updateObjective(index, "description", e.target.value)}
                    />
                  </Paper>
                ))}
                {objectives.length === 0 && (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No objectives yet. Click "Add Objective" to create one.
                  </Typography>
                )}
              </Box>
            )}

            {dialogTab === 2 && (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">Linked Entities</Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button 
                      startIcon={loadingEntities ? <CircularProgress size={16} /> : <RefreshIcon />}
                      onClick={fetchEntities} 
                      size="small" 
                      variant="outlined"
                      disabled={loadingEntities}
                    >
                      Refresh
                    </Button>
                    <Button startIcon={<AddIcon />} onClick={addLink} size="small" variant="outlined">
                      Add Link
                    </Button>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Link NPCs, characters, locations, factions, world info, and other quests to this quest with specific roles.
                </Typography>
                {loadingEntities && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">Loading entities...</Typography>
                  </Box>
                )}
                {!loadingEntities && (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                    Available: {availableEntities.characters.length} characters/NPCs, {availableEntities.locations.length} locations, {availableEntities.factions.length} factions, {availableEntities.world_info.length} world info entries, {availableEntities.quests.length} quests
                  </Typography>
                )}
                
                {links.map((link, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Entity Type</InputLabel>
                        <Select
                          value={link.entity_type}
                          onChange={(e) => updateLink(index, "entity_type", e.target.value)}
                          label="Entity Type"
                        >
                          <MenuItem value="character">Character/NPC</MenuItem>
                          <MenuItem value="location">Location</MenuItem>
                          <MenuItem value="faction">Faction</MenuItem>
                          <MenuItem value="world_info">World Info</MenuItem>
                          <MenuItem value="quest">Quest</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                        <InputLabel>Entity</InputLabel>
                        <Select
                          value={link.entity_id || ""}
                          onChange={(e) => updateLink(index, "entity_id", e.target.value)}
                          label="Entity"
                          disabled={loadingEntities || !link.entity_type}
                        >
                          <MenuItem value="">
                            {loadingEntities 
                              ? "Loading entities..." 
                              : `Select ${getEntityTypeLabel(link.entity_type)}...`}
                          </MenuItem>
                          {(() => {
                            const entityList = getEntityList(link.entity_type);
                            return entityList.length === 0 && !loadingEntities ? (
                              <MenuItem disabled>
                                No {getEntityTypeLabel(link.entity_type).toLowerCase()} available in this campaign
                              </MenuItem>
                            ) : (
                              entityList.map((entity) => (
                                <MenuItem key={entity.id} value={entity.id}>
                                  {entity.name || entity.title}
                                </MenuItem>
                              ))
                            );
                          })()}
                        </Select>
                        {link.entity_type && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            {loadingEntities 
                              ? "Loading..." 
                              : `${getEntityList(link.entity_type).length} ${getEntityTypeLabel(link.entity_type).toLowerCase()} available`}
                          </Typography>
                        )}
                      </FormControl>
                      
                      <IconButton
                        onClick={() => removeLink(index, link.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <TextField
                        label="Role (e.g., Quest Giver, Target, Location)"
                        size="small"
                        fullWidth
                        value={link.role || ""}
                        onChange={(e) => updateLink(index, "role", e.target.value)}
                        placeholder="e.g., Quest Giver, Target Location, Ally"
                      />
                      
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Visibility</InputLabel>
                        <Select
                          value={link.visibility || "dm-only"}
                          onChange={(e) => updateLink(index, "visibility", e.target.value)}
                          label="Visibility"
                        >
                          <MenuItem value="dm-only">DM Only</MenuItem>
                          <MenuItem value="player-visible">Player Visible</MenuItem>
                          <MenuItem value="hidden">Hidden</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    
                    {link.entity_id && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Linked to: {getEntityName(link.entity_type, link.entity_id)}
                      </Typography>
                    )}
                  </Paper>
                ))}
                
                {links.length === 0 && (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No links yet. Click "Add Link" to link entities to this quest.
                  </Typography>
                )}
              </Box>
            )}

            {dialogTab === 3 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Rewards</Typography>
                  <RichTextEditor
                    value={formData.rewards}
                    onChange={(html) => setFormData({ ...formData, rewards: html })}
                    placeholder="Gold, items, faction reputation, titles, land, narrative rewards..."
                  />
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Consequences</Typography>
                  <RichTextEditor
                    value={formData.consequences}
                    onChange={(html) => setFormData({ ...formData, consequences: html })}
                    placeholder="What happens if ignored, fails, or is delayed? World-state changes..."
                  />
                </Box>
              </Box>
            )}

            {dialogTab === 4 && (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">Milestones</Typography>
                  <Button startIcon={<AddIcon />} onClick={addMilestone} size="small" variant="outlined">
                    Add Milestone
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Major turning points, revelations, and escalations in this quest. Track when key events happen.
                </Typography>
                
                {milestones.map((milestone, index) => {
                  // If milestone has an ID, it's saved (show read-only). Otherwise it's new (show editable).
                  const isSaved = !!milestone.id;
                  
                  return (
                    <Paper key={milestone.id || `new-${index}`} sx={{ p: 2, mb: 2 }}>
                      {!isSaved ? (
                        // Editable form for new milestones
                        <>
                          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "flex-start" }}>
                            <TextField
                              label="Milestone Title *"
                              size="small"
                              fullWidth
                              value={milestone.title || ""}
                              onChange={(e) => updateMilestone(index, "title", e.target.value)}
                              placeholder="e.g., Party discovers the artifact"
                              required
                              autoFocus
                            />
                            <TextField
                              label="Session #"
                              type="number"
                              size="small"
                              sx={{ width: 120 }}
                              value={milestone.session_number || ""}
                              onChange={(e) => updateMilestone(index, "session_number", e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="Session"
                            />
                            <IconButton
                              onClick={() => removeMilestone(index)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          <TextField
                            label="Description"
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                            value={milestone.description || ""}
                            onChange={(e) => updateMilestone(index, "description", e.target.value)}
                            placeholder="What happened at this milestone? What changed?"
                          />
                        </>
                      ) : (
                        // Read-only display for saved milestones
                        <>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                                {milestone.title}
                              </Typography>
                              {milestone.session_number && (
                                <Chip 
                                  label={`Session ${milestone.session_number}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mb: 1 }}
                                />
                              )}
                            </Box>
                            <IconButton
                              onClick={() => removeMilestone(index)}
                              color="error"
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          {milestone.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                              {milestone.description}
                            </Typography>
                          )}
                        </>
                      )}
                    </Paper>
                  );
                })}
                
                {milestones.length === 0 && (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No milestones yet. Click "Add Milestone" to track major quest events.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color="primary"
            disabled={!formData.title.trim()}
          >
            {editingQuest ? "Update" : "Create"} Quest
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
