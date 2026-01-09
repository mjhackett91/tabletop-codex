// client/src/pages/Sessions.jsx - Session Notes management page with multiple sections
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import PeopleIcon from "@mui/icons-material/People";
import DangerousIcon from "@mui/icons-material/Dangerous";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SendIcon from "@mui/icons-material/Send";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";

const SECTIONS = [
  { key: "summary", label: "Summary", icon: EventIcon },
  { key: "characters", label: "Characters", icon: PersonIcon },
  { key: "npcs", label: "NPCs", icon: PeopleIcon },
  { key: "antagonists", label: "Antagonists", icon: DangerousIcon },
  { key: "locations", label: "Locations", icon: LocationOnIcon },
  { key: "factions", label: "Factions", icon: GroupsIcon },
  { key: "world_info", label: "World Info", icon: MenuBookIcon },
  { key: "quests", label: "Quests", icon: AssignmentIcon },
];

export default function Sessions() {
  const { id: campaignId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({ 
    session_number: "",
    title: "", 
    date_played: "",
    summary: "",
    notes_characters: "",
    notes_npcs: "",
    notes_antagonists: "",
    notes_locations: "",
    notes_factions: "",
    notes_world_info: "",
    notes_quests: "",
    visibility: "dm-only"
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [entities, setEntities] = useState({
    characters: [],
    npcs: [],
    antagonists: [],
    locations: [],
    factions: [],
    world_info: [],
    quests: []
  });
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState({
    characters: "",
    npcs: "",
    antagonists: "",
    locations: "",
    factions: "",
    world_info: "",
    quests: ""
  });
  const [postingNotes, setPostingNotes] = useState(false);
  const [playerNotes, setPlayerNotes] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [playerNoteContent, setPlayerNoteContent] = useState("");
  const [playerNoteVisibility, setPlayerNoteVisibility] = useState("dm-only");
  const [editingPlayerNote, setEditingPlayerNote] = useState(null);
  const [addingPlayerNote, setAddingPlayerNote] = useState(false);

  // Fetch user role
  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setCurrentUserId(payload.userId);
        } catch (e) {
          console.error("Error parsing token:", e);
        }
      }
      const roleData = await apiClient.get(`/api/campaigns/${campaignId}/my-role`);
      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error("Failed to fetch user role:", error);
    }
  };

  // Fetch sessions
  const fetchSessions = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching sessions for campaign:", campaignId);
      const data = await apiClient.get(`/api/campaigns/${campaignId}/sessions`);
      console.log("Sessions data received:", data);
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      setSnackbar({
        open: true,
        message: "Failed to load sessions",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch player notes for a session
  const fetchPlayerNotes = async (sessionId) => {
    if (!sessionId) {
      setPlayerNotes([]);
      return;
    }

    try {
      const notes = await apiClient.get(`/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes`);
      setPlayerNotes(notes || []);
    } catch (error) {
      console.error("Failed to fetch player notes:", error);
      setPlayerNotes([]);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchUserRole();
  }, [campaignId]);

  // Fetch entities for posting notes
  const fetchEntities = async () => {
    if (!campaignId || !editingSession) return;
    
    setLoadingEntities(true);
    try {
      console.log("Fetching entities for campaign:", campaignId);
      const [characters, npcs, antagonists, locations, factions, worldInfo, quests] = await Promise.all([
        apiClient.get(`/api/campaigns/${campaignId}/characters?type=player`).catch((e) => { console.error("Failed to fetch characters:", e); return []; }),
        apiClient.get(`/api/campaigns/${campaignId}/characters?type=npc`).catch((e) => { console.error("Failed to fetch npcs:", e); return []; }),
        apiClient.get(`/api/campaigns/${campaignId}/characters?type=antagonist`).catch((e) => { console.error("Failed to fetch antagonists:", e); return []; }),
        apiClient.get(`/api/campaigns/${campaignId}/locations`).catch((e) => { console.error("Failed to fetch locations:", e); return []; }),
        apiClient.get(`/api/campaigns/${campaignId}/factions`).catch((e) => { console.error("Failed to fetch factions:", e); return []; }),
        apiClient.get(`/api/campaigns/${campaignId}/world-info`).catch((e) => { console.error("Failed to fetch world info:", e); return []; }),
        apiClient.get(`/api/campaigns/${campaignId}/quests`).catch((e) => { console.error("Failed to fetch quests:", e); return []; })
      ]);

      console.log("Entities fetched:", { characters, npcs, antagonists, locations, factions, worldInfo, quests });

      setEntities({
        characters: characters || [],
        npcs: npcs || [],
        antagonists: antagonists || [],
        locations: locations || [],
        factions: factions || [],
        world_info: worldInfo || [],
        quests: quests || []
      });
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    } finally {
      setLoadingEntities(false);
    }
  };

  useEffect(() => {
    if (openDialog && editingSession) {
      fetchEntities();
      fetchPlayerNotes(editingSession.id);
    } else if (openDialog) {
      setPlayerNotes([]);
      setPlayerNoteContent("");
      setPlayerNoteVisibility("dm-only");
      setEditingPlayerNote(null);
      setAddingPlayerNote(false);
    }
  }, [openDialog, editingSession, campaignId]);

  const handleOpenDialog = (session = null) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        session_number: session.session_number?.toString() || "",
        title: session.title || "",
        date_played: session.date_played || "",
        summary: session.summary || "",
        notes_characters: session.notes_characters || "",
        notes_npcs: session.notes_npcs || "",
        notes_antagonists: session.notes_antagonists || "",
        notes_locations: session.notes_locations || "",
        notes_factions: session.notes_factions || "",
        notes_world_info: session.notes_world_info || "",
        notes_quests: session.notes_quests || "",
        visibility: session.visibility || (userRole === "player" ? "player-visible" : "dm-only")
      });
    } else {
      setEditingSession(null);
      setFormData({
        session_number: "",
        title: "",
        date_played: "",
        summary: "",
        notes_characters: "",
        notes_npcs: "",
        notes_antagonists: "",
        notes_locations: "",
        notes_factions: "",
        notes_world_info: "",
        notes_quests: "",
        visibility: userRole === "player" ? "player-visible" : "dm-only"
      });
    }
    setSelectedEntities({
      characters: "",
      npcs: "",
      antagonists: "",
      locations: "",
      factions: "",
      world_info: "",
      quests: ""
    });
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSession(null);
    setFormData({ 
      session_number: "",
      title: "",
      date_played: "",
      summary: "",
      notes_characters: "",
      notes_npcs: "",
      notes_antagonists: "",
      notes_locations: "",
      notes_factions: "",
      notes_world_info: "",
      notes_quests: "",
      visibility: "dm-only"
    });
    setSelectedEntities({
      characters: "",
      npcs: "",
      antagonists: "",
      locations: "",
      factions: "",
      world_info: "",
      quests: ""
    });
    setPlayerNotes([]);
    setPlayerNoteContent("");
    setPlayerNoteVisibility("dm-only");
    setEditingPlayerNote(null);
    setAddingPlayerNote(false);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        session_number: formData.session_number ? parseInt(formData.session_number) : null,
        title: formData.title.trim() || null,
        date_played: formData.date_played || null,
        summary: formData.summary || null,
        notes_characters: formData.notes_characters || null,
        notes_npcs: formData.notes_npcs || null,
        notes_antagonists: formData.notes_antagonists || null,
        notes_locations: formData.notes_locations || null,
        notes_factions: formData.notes_factions || null,
        notes_world_info: formData.notes_world_info || null,
        notes_quests: formData.notes_quests || null,
        visibility: formData.visibility
      };

      if (editingSession) {
        await apiClient.put(`/api/campaigns/${campaignId}/sessions/${editingSession.id}`, payload);
        setSnackbar({
          open: true,
          message: "Session updated successfully",
          severity: "success"
        });
      } else {
        await apiClient.post(`/api/campaigns/${campaignId}/sessions`, payload);
        setSnackbar({
          open: true,
          message: "Session created successfully",
          severity: "success"
        });
      }

      handleCloseDialog();
      fetchSessions();
    } catch (error) {
      console.error("Failed to save session:", error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingSession ? "update" : "create"} session`,
        severity: "error"
      });
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session? This will also delete all associated session notes.")) {
      return;
    }

    try {
      await apiClient.delete(`/api/campaigns/${campaignId}/sessions/${sessionId}`);
      setSnackbar({
        open: true,
        message: "Session deleted successfully",
        severity: "success"
      });
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete session",
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

  const getSectionValue = (sectionKey) => {
    const key = `notes_${sectionKey}`;
    return formData[key] || "";
  };

  const setSectionValue = (sectionKey, value) => {
    const key = `notes_${sectionKey}`;
    setFormData({ ...formData, [key]: value });
  };

  const getSectionLabel = (sectionKey) => {
    const section = SECTIONS.find(s => s.key === sectionKey);
    return section ? section.label : sectionKey;
  };

  const getEntityTypeForSection = (sectionKey) => {
    const mapping = {
      characters: "character",
      npcs: "character",
      antagonists: "character",
      locations: "location",
      factions: "faction",
      world_info: "world_info",
      quests: "quest"
    };
    return mapping[sectionKey] || sectionKey;
  };

  const getEntityListForSection = (sectionKey) => {
    if (sectionKey === "characters") return entities.characters;
    if (sectionKey === "npcs") return entities.npcs;
    if (sectionKey === "antagonists") return entities.antagonists;
    if (sectionKey === "locations") return entities.locations;
    if (sectionKey === "factions") return entities.factions;
    if (sectionKey === "world_info") return entities.world_info;
    if (sectionKey === "quests") return entities.quests;
    return [];
  };

  const handlePostNotes = async (sectionKey) => {
    console.log("handlePostNotes called with:", { sectionKey, editingSession: !!editingSession });
    
    if (!editingSession) {
      console.log("No editing session, showing warning");
      setSnackbar({
        open: true,
        message: "Please save the session first before posting notes",
        severity: "warning"
      });
      return;
    }

    const entityId = selectedEntities[sectionKey];
    console.log("Entity ID for section:", { sectionKey, entityId, selectedEntities });
    if (!entityId) {
      console.log("No entity selected, showing warning");
      setSnackbar({
        open: true,
        message: "Please select an entity to post notes to",
        severity: "warning"
      });
      return;
    }

    const noteContent = getSectionValue(sectionKey);
    console.log("Note content:", { sectionKey, noteContentLength: noteContent?.length, noteContent: noteContent?.substring(0, 100) });
    // Check if note content has actual text (strip HTML tags for validation)
    const textContent = noteContent ? noteContent.replace(/<[^>]*>/g, '').trim() : '';
    console.log("Text content after stripping HTML:", { textContentLength: textContent.length, textContent: textContent.substring(0, 100) });
    if (!textContent) {
      console.log("No text content, showing warning");
      setSnackbar({
        open: true,
        message: "No notes to post for this section",
        severity: "warning"
      });
      return;
    }

    setPostingNotes(true);
    try {
      const entityType = getEntityTypeForSection(sectionKey);
      console.log("Posting notes:", {
        sectionKey,
        entityType,
        entityId: parseInt(entityId),
        noteContentLength: noteContent.length,
        sessionId: editingSession.id
      });

      const response = await apiClient.post(
        `/api/campaigns/${campaignId}/sessions/${editingSession.id}/post-notes`,
        {
          entity_type: entityType,
          entity_id: parseInt(entityId),
          note_content: noteContent
        }
      );

      console.log("Post notes response:", response);

      // Get entity name for better feedback
      const entityList = getEntityListForSection(sectionKey);
      const entity = entityList.find(e => e.id === parseInt(entityId));
      const entityName = entity?.name || entity?.title || "entity";

      setSnackbar({
        open: true,
        message: `Notes posted to ${entityName} successfully! Check the ${getSectionLabel(sectionKey).slice(0, -1)}'s description field to see them. Note: Players will only see these notes if the ${getSectionLabel(sectionKey).slice(0, -1)}'s visibility is set to "DM & Players".`,
        severity: "success"
      });

      // Clear the selected entity and optionally clear the notes
      setSelectedEntities({ ...selectedEntities, [sectionKey]: "" });
    } catch (error) {
      console.error("Failed to post notes:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to post notes",
        severity: "error"
      });
    } finally {
      setPostingNotes(false);
    }
  };

  // Handle adding/updating player note
  const handleSavePlayerNote = async () => {
    if (!editingSession || !playerNoteContent.trim()) {
      return;
    }

    try {
      if (editingPlayerNote) {
        // Update existing note
        await apiClient.put(
          `/api/campaigns/${campaignId}/sessions/${editingSession.id}/player-notes/${editingPlayerNote.id}`,
          {
            note_content: playerNoteContent.trim(),
            visibility: playerNoteVisibility
          }
        );
        setSnackbar({
          open: true,
          message: "Player note updated successfully",
          severity: "success"
        });
      } else {
        // Create new note
        await apiClient.post(
          `/api/campaigns/${campaignId}/sessions/${editingSession.id}/player-notes`,
          {
            note_content: playerNoteContent.trim(),
            visibility: playerNoteVisibility
          }
        );
        setSnackbar({
          open: true,
          message: "Player note added successfully",
          severity: "success"
        });
      }
      
      await fetchPlayerNotes(editingSession.id);
      setPlayerNoteContent("");
      setPlayerNoteVisibility("dm-only");
      setEditingPlayerNote(null);
      setAddingPlayerNote(false);
    } catch (error) {
      console.error("Failed to save player note:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to save player note",
        severity: "error"
      });
    }
  };

  // Handle deleting player note
  const handleDeletePlayerNote = async (noteId) => {
    if (!editingSession || !window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      await apiClient.delete(
        `/api/campaigns/${campaignId}/sessions/${editingSession.id}/player-notes/${noteId}`
      );
      setSnackbar({
        open: true,
        message: "Player note deleted successfully",
        severity: "success"
      });
      await fetchPlayerNotes(editingSession.id);
    } catch (error) {
      console.error("Failed to delete player note:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete player note",
        severity: "error"
      });
    }
  };

  // Handle editing player note
  const handleEditPlayerNote = (note) => {
    setEditingPlayerNote(note);
    setPlayerNoteContent(note.note_content || "");
    setPlayerNoteVisibility(note.visibility || "dm-only");
    setAddingPlayerNote(true);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BackButton variant="icon" />
        <CampaignNav campaignId={campaignId} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <EventIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4">Session Notes</Typography>
            <Typography variant="body2" color="text.secondary">
              Track your campaign sessions with organized note sections
            </Typography>
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: "background.paper", mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Session #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Date Played</TableCell>
              <TableCell>Summary Preview</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading sessions...</Typography>
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No sessions yet. Create your first session!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow 
                  key={session.id} 
                  hover
                  onClick={() => handleOpenDialog(session)}
                  sx={{ 
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover"
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      #{session.session_number || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {session.title || "Untitled Session"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography color="text.secondary">
                        {formatDate(session.date_played)}
                      </Typography>
                      {session.created_by_username && (
                        <Typography color="text.secondary" variant="caption" display="block">
                          by {session.created_by_username}
                        </Typography>
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
                        __html: session.summary || "<span style='color: #bdbdbd'>No summary</span>" 
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary">
                      {formatDate(session.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {/* Show edit button if user is DM or created the session */}
                    {(userRole === "dm" || session.created_by_user_id === currentUserId) && (
                      <IconButton
                        onClick={() => handleOpenDialog(session)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {/* DMs can delete any session, players can delete their own */}
                    {(userRole === "dm" || session.created_by_user_id === currentUserId) && (
                      <IconButton
                        onClick={() => handleDelete(session.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Both DMs and players can create sessions */}
      <Fab
        color="primary"
        aria-label="add session"
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
          {editingSession ? "Edit Session" : "New Session"}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingSession ? "Update" : "Create"} a session entry with organized note sections
            {editingSession && editingSession.created_by_username && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Created by {editingSession.created_by_username} on {formatDate(editingSession.created_at)}
                {editingSession.last_updated_by_username && editingSession.last_updated_by_username !== editingSession.created_by_username && (
                  <> • Last updated by {editingSession.last_updated_by_username} on {formatDate(editingSession.updated_at)}</>
                )}
              </Typography>
            )}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label="Session Number"
                type="number"
                variant="outlined"
                value={formData.session_number}
                onChange={(e) => setFormData({ ...formData, session_number: e.target.value })}
                helperText={!editingSession ? "Leave empty to auto-increment" : ""}
                sx={{ flex: 1 }}
                size="small"
              />
              <TextField
                label="Date Played"
                type="date"
                variant="outlined"
                value={formData.date_played ? (() => {
                  // Ensure date is in YYYY-MM-DD format for date input
                  // If it's a full datetime string, extract just the date part
                  if (formData.date_played.includes('T')) {
                    return formData.date_played.split('T')[0];
                  }
                  return formData.date_played;
                })() : ""}
                onChange={(e) => {
                  // Store as YYYY-MM-DD format (date only, no time)
                  setFormData({ ...formData, date_played: e.target.value || null });
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                size="small"
              />
            </Box>
            <TextField
              label="Session Title"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., The Dragon's Lair"
              size="small"
            />
          </Box>

          <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <Tabs
              orientation="vertical"
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ 
                borderRight: 1, 
                borderColor: "divider",
                minWidth: 200,
                "& .MuiTab-root": {
                  textTransform: "none",
                  alignItems: "flex-start",
                  minHeight: 48
                }
              }}
            >
              {SECTIONS.map((section, index) => {
                const Icon = section.icon;
                return (
                  <Tab
                    key={section.key}
                    icon={<Icon />}
                    iconPosition="start"
                    label={section.label}
                    sx={{ justifyContent: "flex-start" }}
                  />
                );
              })}
            </Tabs>

            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Session Summary</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Overall summary of what happened in this session
                  </Typography>
                  <RichTextEditor
                    value={formData.summary}
                    onChange={(html) => setFormData({ ...formData, summary: html })}
                    placeholder="Enter session summary..."
                    campaignId={campaignId}
                  />
                </Box>
              )}
              {activeTab > 0 && (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">
                      {getSectionLabel(SECTIONS[activeTab].key)} Notes
                    </Typography>
                    {editingSession && (() => {
                      const sectionKey = SECTIONS[activeTab].key;
                      const hasEntity = !!selectedEntities[sectionKey];
                      const noteValue = getSectionValue(sectionKey);
                      const hasNotes = noteValue && noteValue.replace(/<[^>]*>/g, '').trim() !== '';
                      const isDisabled = postingNotes || !hasEntity || !hasNotes;
                      
                      // Debug log (only when state changes or button is disabled)
                      if (isDisabled && (hasNotes || hasEntity)) {
                        console.log("Button state:", {
                          sectionKey,
                          hasEntity,
                          hasNotes,
                          isDisabled,
                          reason: !hasEntity ? "No entity selected" : !hasNotes ? "No notes" : "Posting...",
                          selectedEntity: selectedEntities[sectionKey],
                          noteLength: noteValue?.length || 0,
                          availableEntities: getEntityListForSection(sectionKey).length
                        });
                      }
                      
                      return (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={postingNotes ? <CircularProgress size={16} /> : <SendIcon />}
                          onClick={() => {
                            console.log("Post Notes button clicked for section:", sectionKey);
                            handlePostNotes(sectionKey);
                          }}
                          disabled={isDisabled}
                          title={isDisabled ? (!hasEntity ? 'Disabled: No entity selected' : !hasNotes ? 'Disabled: No notes entered' : 'Disabled: Posting...') : 'Post notes to selected entity'}
                        >
                          Post Notes
                        </Button>
                      );
                    })()}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Quick notes about {getSectionLabel(SECTIONS[activeTab].key).toLowerCase()} during this session. 
                    {editingSession && (
                      <>
                        {" "}Select an entity below and click 'Post Notes' to add these notes to that entity's description.
                        {getEntityListForSection(SECTIONS[activeTab].key).length === 0 && (
                          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                            ⚠️ No {getSectionLabel(SECTIONS[activeTab].key).toLowerCase()} available. Create some first!
                          </Typography>
                        )}
                      </>
                    )}
                  </Typography>
                  
                  {editingSession && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Post to {getSectionLabel(SECTIONS[activeTab].key).slice(0, -1)}</InputLabel>
                      <Select
                        value={selectedEntities[SECTIONS[activeTab].key] || ""}
                        onChange={(e) => {
                          console.log("Entity selected:", { section: SECTIONS[activeTab].key, entityId: e.target.value });
                          setSelectedEntities({ 
                            ...selectedEntities, 
                            [SECTIONS[activeTab].key]: e.target.value 
                          });
                        }}
                        label={`Post to ${getSectionLabel(SECTIONS[activeTab].key).slice(0, -1)}`}
                        disabled={loadingEntities}
                      >
                        <MenuItem value="">Select an entity...</MenuItem>
                        {getEntityListForSection(SECTIONS[activeTab].key).length === 0 ? (
                          <MenuItem disabled>No {getSectionLabel(SECTIONS[activeTab].key).toLowerCase()} available</MenuItem>
                        ) : (
                          getEntityListForSection(SECTIONS[activeTab].key).map((entity) => (
                            <MenuItem key={entity.id} value={entity.id}>
                              {entity.name || entity.title}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {loadingEntities && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Loading entities...
                        </Typography>
                      )}
                    </FormControl>
                  )}

                  <RichTextEditor
                    value={getSectionValue(SECTIONS[activeTab].key)}
                    onChange={(html) => setSectionValue(SECTIONS[activeTab].key, html)}
                    placeholder={`Enter notes about ${getSectionLabel(SECTIONS[activeTab].key).toLowerCase()}...`}
                    campaignId={campaignId}
                  />
                </Box>
              )}
            </Box>
          </Box>
          
          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <FormControl component="fieldset" fullWidth>
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
                {formData.visibility === "dm-only" && "Only DMs can see this session"}
                {formData.visibility === "player-visible" && "Both DMs and players can see this session"}
                {formData.visibility === "hidden" && "Hidden from all participants"}
              </Typography>
            </FormControl>
          </Box>

          {/* Player Notes Section */}
          {editingSession && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="h6" gutterBottom>
                Player Notes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Notes added by players. DMs can see all notes, players can see notes marked as "Player Visible".
              </Typography>

              {/* Existing Player Notes */}
              {playerNotes.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {playerNotes.map((note) => (
                    <Paper
                      key={note.id}
                      sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: note.user_id === currentUserId ? "action.selected" : "background.paper",
                        border: note.user_id === currentUserId ? 1 : 0,
                        borderColor: "primary.main"
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {note.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(note.created_at)}
                            {note.visibility === "player-visible" && " • Visible to all players"}
                            {note.visibility === "dm-only" && " • DM only"}
                          </Typography>
                        </Box>
                        {note.user_id === currentUserId && (
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleEditPlayerNote(note)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeletePlayerNote(note.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      <Box
                        sx={{
                          "& p": { margin: 0 },
                          "& *": { display: "inline" }
                        }}
                        dangerouslySetInnerHTML={{ __html: note.note_content || "" }}
                      />
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Add/Edit Player Note Form */}
              {userRole === "player" && (
                <Box>
                  {!addingPlayerNote ? (
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setAddingPlayerNote(true);
                        setEditingPlayerNote(null);
                        setPlayerNoteContent("");
                        setPlayerNoteVisibility("dm-only");
                      }}
                      fullWidth
                    >
                      Add Your Note
                    </Button>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Typography variant="subtitle2">
                        {editingPlayerNote ? "Edit Your Note" : "Add Your Note"}
                      </Typography>
                      <RichTextEditor
                        value={playerNoteContent}
                        onChange={(html) => setPlayerNoteContent(html)}
                        placeholder="Enter your note about this session..."
                        campaignId={campaignId}
                      />
                      <FormControl component="fieldset">
                        <FormLabel component="legend">Visibility</FormLabel>
                        <RadioGroup
                          row
                          value={playerNoteVisibility}
                          onChange={(e) => setPlayerNoteVisibility(e.target.value)}
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
                        </RadioGroup>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          {playerNoteVisibility === "dm-only" && "Only the DM will see this note"}
                          {playerNoteVisibility === "player-visible" && "All players and the DM will see this note"}
                        </Typography>
                      </FormControl>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="contained"
                          onClick={handleSavePlayerNote}
                          disabled={!playerNoteContent.trim()}
                        >
                          {editingPlayerNote ? "Update" : "Add"} Note
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setAddingPlayerNote(false);
                            setEditingPlayerNote(null);
                            setPlayerNoteContent("");
                            setPlayerNoteVisibility("dm-only");
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {/* Both DMs and players can create/update sessions (players can only edit their own) */}
          {(userRole === "dm" || !editingSession || (editingSession && editingSession.created_by_user_id === currentUserId)) && (
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              color="primary"
            >
              {editingSession ? "Update" : "Create"} Session
            </Button>
          )}
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
