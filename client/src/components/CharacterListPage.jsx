// client/src/components/CharacterListPage.jsx - Shared component for Characters, NPCs, Antagonists
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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab,
  Skeleton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import apiClient from "../services/apiClient";
import RichTextEditor from "./RichTextEditor";
import CampaignNav from "./CampaignNav";
import CharacterSheetEditor from "./CharacterSheetEditor";
import BackButton from "./BackButton";
import ImageGallery from "./ImageGallery";
import TagSelector from "./TagSelector";

const TYPE_CONFIG = {
  player: {
    label: "Character",
    plural: "Characters",
    color: "primary",
    suggestions: [
      "Include full character sheet: stats, HP, AC, level, class, race",
      "Add equipment and inventory",
      "Track spells and abilities",
      "Include backstory and personality",
      "Note character goals and motivations"
    ]
  },
  npc: {
    label: "NPC",
    plural: "NPCs",
    color: "secondary",
    suggestions: [
      "Include basic stats: HP, AC, and key abilities",
      "Add alignment and faction affiliation",
      "Note relationship to party and motivations",
      "Include equipment and notable items",
      "Add personality traits and mannerisms"
    ]
  },
  antagonist: {
    label: "Antagonist",
    plural: "Antagonists",
    color: "error",
    suggestions: [
      "Include full stats and abilities",
      "Add alignment, goals, and motivations",
      "Note connections to factions or other entities",
      "Track legendary actions and special abilities",
      "Include lair information if applicable"
    ]
  }
};

export default function CharacterListPage({ type }) {
  const { id: campaignId } = useParams();
  const location = useLocation();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    alignment: "",
    character_sheet: null,
    visibility: "dm-only",
    player_user_id: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [participants, setParticipants] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const config = TYPE_CONFIG[type];

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

  // Sort characters based on current sort settings
  const sortedCharacters = [...characters].sort((a, b) => {
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

  // Fetch characters
  const fetchCharacters = async () => {
    if (!campaignId) {
      console.error("Campaign ID is missing");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching characters for campaign:", campaignId, "type:", type);
      const params = new URLSearchParams();
      params.append("type", type);
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      
      const data = await apiClient.get(`/campaigns/${campaignId}/characters?${params.toString()}`);
      console.log("Characters data received:", data);
      // Log tags for each character to debug
      if (Array.isArray(data)) {
        data.forEach(char => {
          console.log(`Character "${char.name}" (ID: ${char.id}) tags:`, char.tags || []);
        });
      }
      setCharacters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch characters:", error);
      console.error("Error details:", { campaignId, type, error: error.message });
      showSnackbar(error.message || "Failed to fetch characters", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch participants and user role
  const fetchParticipants = async () => {
    try {
      const [participantsData, roleData] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/participants`),
        apiClient.get(`/campaigns/${campaignId}/my-role`)
      ]);
      setParticipants(participantsData || []);
      setUserRole(roleData?.role || null);
      
      // Get current user ID from token
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setCurrentUserId(payload.userId);
        } catch (e) {
          console.error("Error parsing token:", e);
        }
      }
    } catch (error) {
      console.error("Failed to fetch participants or role:", error);
    }
  };

  // Debounce search to avoid API spam on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchCharacters();
    fetchParticipants();
  }, [campaignId, type, debouncedSearchTerm]);

  // Check for navigation state to auto-open entity dialog
  useEffect(() => {
    if (location.state?.openEntityId && characters.length > 0) {
      const entityId = location.state.openEntityId;
      const entityType = location.state.entityType;
      const characterId = location.state.characterId; // For equipment links
      
      console.log("[CharacterListPage] Navigation state detected:", {
        entityId,
        entityType,
        characterId,
        charactersCount: characters.length,
        characterIds: characters.map(c => c.id)
      });
      
      // Only auto-open if the entity type matches this page's type
      if (entityType === "character" || entityType === "equipment") {
        // For equipment, use characterId; for characters, use entityId
        let targetId;
        if (entityType === "equipment") {
          // First try to use characterId from navigation state
          if (characterId) {
            targetId = characterId;
            console.log("[CharacterListPage] Equipment link detected, using characterId from state:", characterId);
          } else {
            // Fallback: extract characterId from entityId (format: "equipment-{characterId}-{itemName}")
            const match = typeof entityId === 'string' ? entityId.match(/^equipment-(\d+)-/) : null;
            if (match && match[1]) {
              targetId = match[1];
              console.log("[CharacterListPage] Equipment link detected, extracted characterId from entityId:", targetId);
            } else {
              console.warn("[CharacterListPage] Equipment link but could not extract characterId from entityId:", entityId);
              return;
            }
          }
        } else {
          targetId = entityId;
        }
        // Normalize IDs to numbers for comparison (handle both string and number IDs)
        const targetIdNum = typeof targetId === 'string' ? parseInt(targetId, 10) : targetId;
        if (isNaN(targetIdNum)) {
          console.warn("[CharacterListPage] Invalid target ID (could not parse to number):", targetId);
          return;
        }
        console.log("[CharacterListPage] Looking for character with ID:", targetId, "(normalized:", targetIdNum, ")");
        const character = characters.find(c => {
          const charIdNum = typeof c.id === 'string' ? parseInt(c.id, 10) : c.id;
          return charIdNum === targetIdNum;
        });
        if (character) {
          console.log("[CharacterListPage] Found character, opening dialog:", character.name);
          handleOpenDialog(character);
          // Clear the state to prevent re-opening on re-render
          window.history.replaceState({}, document.title);
        } else {
          console.log("[CharacterListPage] Character not found with ID:", targetId, "(normalized:", targetIdNum, ")");
        }
      }
    } else if (location.state?.openEntityId) {
      console.log("[CharacterListPage] Navigation state detected but characters not loaded yet:", {
        entityId: location.state.openEntityId,
        charactersCount: characters.length
      });
    }
  }, [location.state, characters]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Fetch tags for a character
  const fetchCharacterTags = async (characterId) => {
    try {
      const tags = await apiClient.get(`/campaigns/${campaignId}/entities/character/${characterId}/tags`);
      setSelectedTagIds(tags.map(tag => tag.id));
    } catch (error) {
      console.error("Failed to fetch character tags:", error);
      setSelectedTagIds([]);
    }
  };

  const handleOpenDialog = async (character = null) => {
    setEditingCharacter(character);
    setDialogTab(0); // Reset to first tab when opening dialog
    
    // Determine default visibility based on who is creating and what type
    let defaultVisibility = "dm-only";
    if (!character) {
      // New character - set default based on creator role and type
      if (userRole === "player") {
        // Players creating NPCs/antagonists default to "player-visible"
        // Players creating player characters default to "player-visible"
        defaultVisibility = "player-visible";
      }
      // DMs default to "dm-only" for new characters
    } else {
      // Editing existing character - use current visibility
      defaultVisibility = character.visibility || "dm-only";
    }
    
    // Allow viewing even if can't edit (for NPCs/antagonists visible to players)
    setFormData({
      name: character?.name || "",
      description: character?.description || "",
      alignment: character?.alignment || "",
      character_sheet: character?.character_sheet || null,
      visibility: defaultVisibility,
      player_user_id: character?.player_user_id || null
    });
    
    if (character) {
      await fetchCharacterTags(character.id);
    } else {
      setSelectedTagIds([]);
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCharacter(null);
    setSelectedTagIds([]);
    setFormData({ 
      name: "", 
      description: "", 
      alignment: "", 
      character_sheet: null, 
      visibility: "dm-only",
      player_user_id: null
    });
  };

  const handleSubmit = async () => {
    try {
      const isPlayer = userRole === "player";
      const isOwnCharacter = editingCharacter?.type === "player" && editingCharacter?.player_user_id === currentUserId;
      const isOwnNPC = editingCharacter && (editingCharacter.type === "npc" || editingCharacter.type === "antagonist") && editingCharacter.created_by_user_id === currentUserId;
      const isNewCharacter = !editingCharacter;
      
      let payload;
      if (isPlayer && isOwnCharacter) {
        // Players can update description, character_sheet, and visibility for their own player character
        payload = {
          description: formData.description,
          character_sheet: formData.character_sheet,
          visibility: formData.visibility || "dm-only"
        };
      } else if (isPlayer && isOwnNPC) {
        // Players editing NPCs/antagonists they created can update everything except type and player_user_id
        payload = {
          type: editingCharacter.type, // Keep original type
          name: formData.name,
          description: formData.description,
          alignment: formData.alignment,
          character_sheet: formData.character_sheet,
          visibility: formData.visibility || "player-visible"
        };
      } else if (isPlayer && isNewCharacter) {
        // Players creating new NPCs/antagonists can set all fields except player_user_id
        payload = {
          type,
          name: formData.name,
          description: formData.description,
          alignment: formData.alignment,
          character_sheet: formData.character_sheet,
          visibility: formData.visibility || "player-visible" // Default to player-visible for player-created NPCs/antagonists
        };
      } else {
        // DMs can update everything
        payload = {
          type,
          name: formData.name,
          description: formData.description,
          alignment: formData.alignment,
          character_sheet: formData.character_sheet,
          visibility: formData.visibility
        };
        
        // Only include player_user_id for player characters and when DM is editing
        if (type === "player" && userRole === "dm") {
          payload.player_user_id = formData.player_user_id || null;
        }
      }

      let characterId;
      if (editingCharacter) {
        const result = await apiClient.put(`/campaigns/${campaignId}/characters/${editingCharacter.id}`, payload);
        characterId = result?.id || editingCharacter.id;
        console.log(`[CharacterListPage] Updated character, ID: ${characterId}, result:`, result);
      } else {
        const result = await apiClient.post(`/campaigns/${campaignId}/characters`, payload);
        characterId = result?.id;
        console.log(`[CharacterListPage] Created character, ID: ${characterId}, result:`, result);
      }

      // Update tags - always save, even if empty array (to clear tags)
      if (characterId) {
        try {
          console.log(`[CharacterListPage] Saving tags for character ${characterId}:`, selectedTagIds);
          const tagsResult = await apiClient.post(
            `/campaigns/${campaignId}/entities/character/${characterId}/tags`,
            { tagIds: selectedTagIds || [] }
          );
          console.log(`[CharacterListPage] Tags saved successfully, received:`, tagsResult);
          // Small delay to ensure database commit
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error("[CharacterListPage] Failed to update character tags:", error);
          console.error("[CharacterListPage] Error details:", {
            characterId,
            campaignId,
            selectedTagIds,
            errorMessage: error.message,
            errorResponse: error.response?.data
          });
          // Don't fail the whole operation if tags fail
        }
      } else {
        console.error("[CharacterListPage] No characterId available to save tags!");
      }

      // Refresh the list to show updated tags
      console.log(`[CharacterListPage] Refreshing character list after tag update...`);
      await fetchCharacters();
      handleCloseDialog();
      showSnackbar(
        editingCharacter ? `${config.label} updated successfully` : `${config.label} created successfully`
      );
    } catch (error) {
      console.error("Error saving character:", error);
      showSnackbar(error.message, "error");
    }
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await apiClient.delete(`/campaigns/${campaignId}/characters/${itemToDelete}`);
      await fetchCharacters();
      showSnackbar(`${config.label} deleted successfully`);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting character:", error);
      showSnackbar(error.message, "error");
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
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

  // Loading skeleton rows
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton variant="text" width="60%" /></TableCell>
        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
        <TableCell><Skeleton variant="text" width="50%" /></TableCell>
        <TableCell><Skeleton variant="text" width="80%" /></TableCell>
        <TableCell><Skeleton variant="text" width="30%" /></TableCell>
        <TableCell align="right"><Skeleton variant="circular" width={32} height={32} /></TableCell>
      </TableRow>
    ));
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BackButton variant="icon" />
        <CampaignNav campaignId={campaignId} />
      </Box>
      
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" color={`${config.color}.main`}>
          {config.plural}
        </Typography>
        <Chip 
          label={`${characters.length} ${config.plural.toLowerCase()}`} 
          color={config.color}
          variant="outlined"
        />
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder={`Search ${config.plural.toLowerCase()}...`}
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
          border: `1px solid`, 
          borderColor: `${config.color}.main`,
          "&:before": { display: "none" }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: `${config.color}.main` }} />}
          sx={{
            bgcolor: "action.hover",
            "&:hover": { bgcolor: "action.selected" }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", mr: 1 }}>
            <InfoIcon sx={{ mr: 1, color: `${config.color}.main` }} />
            <Typography variant="h6" color={`${config.color}.main`}>
              Creating {config.plural}: What to Include
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {config.suggestions.map((suggestion, index) => (
              <Typography key={index} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {suggestion}
              </Typography>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <TableContainer component={Paper} sx={{ backgroundColor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ cursor: "pointer", userSelect: "none" }}
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
                sx={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("alignment")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Alignment
                  {sortBy === "alignment" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Description</TableCell>
              <TableCell 
                sx={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("created")}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Created
                  {sortBy === "created" && (
                    sortOrder === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : sortedCharacters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No {config.plural.toLowerCase()} yet. Create your first {config.label.toLowerCase()}!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedCharacters.map((character) => (
                <TableRow 
                  key={character.id} 
                  hover
                  onClick={() => handleOpenDialog(character)}
                  sx={{ 
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover"
                    }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {character.name}
                      </Typography>
                      {character.player_user_id && type === "player" && (
                        <Chip 
                          label="Assigned" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ fontSize: "0.7rem", height: 20 }}
                        />
                      )}
                      {character.player_user_id === currentUserId && (
                        <Chip 
                          label="Your Character" 
                          size="small" 
                          color="primary" 
                          variant="filled"
                          sx={{ fontSize: "0.7rem", height: 20 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {character.alignment && (
                      <Chip label={character.alignment} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {character.tags && character.tags.length > 0 ? (
                        character.tags.map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{
                              backgroundColor: tag.color || "#616161",
                              color: "#fff",
                              fontSize: "0.7rem",
                              height: 20
                            }}
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No tags
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // Check if description has actual content (not just empty HTML tags)
                      const hasContent = character.description && 
                        character.description.trim() && 
                        character.description.replace(/<[^>]*>/g, '').trim().length > 0;
                      
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
                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(character.description) }}
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
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {formatDate(character.created_at)}
                      </Typography>
                      {character.created_by_username && (
                        <Typography color="text.secondary" variant="caption" display="block">
                          by {character.created_by_username}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {/* Show edit button if user is DM, owns the character, or created the NPC/antagonist */}
                    {(userRole === "dm" || 
                      (character.type === "player" && character.player_user_id === currentUserId) ||
                      ((character.type === "npc" || character.type === "antagonist") && character.created_by_user_id === currentUserId)
                    ) && (
                      <IconButton
                        onClick={() => handleOpenDialog(character)}
                        color={config.color}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {/* Only DMs can delete, or players can delete NPCs/antagonists they created */}
                    {(userRole === "dm" || 
                      ((character.type === "npc" || character.type === "antagonist") && character.created_by_user_id === currentUserId)
                    ) && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(character.id);
                        }}
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

      {/* Allow players to create NPCs/antagonists, and all participants can create player characters */}
      {(userRole === "dm" || type === "player" || (type === "npc" && userRole === "player") || (type === "antagonist" && userRole === "player")) && (
        <Fab
          color={config.color}
          aria-label={`add ${config.label.toLowerCase()}`}
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog()}
        >
          <AddIcon />
        </Fab>
      )}

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          {editingCharacter ? `Edit ${config.label}` : `New ${config.label}`}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingCharacter ? "Update" : "Create"} a {config.label.toLowerCase()} for this campaign
            {editingCharacter && editingCharacter.created_by_username && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Created by {editingCharacter.created_by_username} on {formatDate(editingCharacter.created_at)}
                {editingCharacter.last_updated_by_username && editingCharacter.last_updated_by_username !== editingCharacter.created_by_username && (
                  <> • Last updated by {editingCharacter.last_updated_by_username} on {formatDate(editingCharacter.updated_at)}</>
                )}
              </Typography>
            )}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ overflow: "auto" }}>
          <Tabs value={dialogTab} onChange={(e, newValue) => setDialogTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Details" />
            <Tab label="Images" />
          </Tabs>

          {/* Details Tab */}
          {dialogTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            {/* Name - read-only for players editing their own character */}
            <TextField
              autoFocus={userRole === "dm"}
              label={`${config.label} Name`}
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={
                userRole === "player" && 
                editingCharacter && 
                editingCharacter.type === "player" && 
                editingCharacter.player_user_id === currentUserId
              }
              helperText={
                userRole === "player" && editingCharacter && editingCharacter.type === "player" && editingCharacter.player_user_id === currentUserId
                  ? "Name cannot be changed"
                  : userRole === "player" && editingCharacter && editingCharacter.type !== "player" && editingCharacter.created_by_user_id !== currentUserId
                  ? "Read-only view"
                  : ""
              }
            />

            {/* Alignment - hidden for players editing their own player character, but editable for NPCs/antagonists they created */}
            {!(userRole === "player" && editingCharacter && editingCharacter.type === "player" && editingCharacter.player_user_id === currentUserId) && (
              <TextField
                label="Alignment"
                fullWidth
                variant="outlined"
                value={formData.alignment}
                onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
                placeholder="e.g., Lawful Good, Chaotic Evil"
                helperText="D&D alignment (optional)"
                disabled={
                  userRole === "player" && 
                  editingCharacter && 
                  editingCharacter.type !== "player" && 
                  editingCharacter.created_by_user_id !== currentUserId
                }
              />
            )}

            {/* Player Assignment - DM only, player type only */}
            {type === "player" && userRole === "dm" && (
              <FormControl fullWidth>
                <InputLabel>Assign to Player</InputLabel>
                <Select
                  value={formData.player_user_id || ""}
                  onChange={(e) => setFormData({ ...formData, player_user_id: e.target.value || null })}
                  label="Assign to Player"
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {participants
                    .filter(p => p.role === "player")
                    .map((participant) => (
                      <MenuItem key={participant.user_id} value={participant.user_id}>
                        {participant.username} ({participant.email})
                      </MenuItem>
                    ))}
                </Select>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Assign this character to a player. Unassigned characters can be claimed by players.
                </Typography>
              </FormControl>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder={`Enter ${config.label.toLowerCase()} description...`}
                campaignId={campaignId}
                readOnly={
                  userRole === "player" && 
                  editingCharacter && 
                  editingCharacter.type !== "player" && 
                  editingCharacter.created_by_user_id !== currentUserId
                }
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Character Sheet
              </Typography>
              <CharacterSheetEditor
                value={formData.character_sheet}
                onChange={(sheet) => setFormData({ ...formData, character_sheet: sheet })}
                type={type}
                readOnly={
                  userRole === "player" && 
                  editingCharacter && 
                  editingCharacter.type !== "player" && 
                  editingCharacter.created_by_user_id !== currentUserId
                }
              />
            </Box>

            {/* Tags */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <TagSelector
                campaignId={campaignId}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                entityType="character"
                entityId={editingCharacter?.id}
                userRole={userRole}
              />
            </Box>

            {/* Visibility - for players editing their own player character, show a simplified visibility control */}
            {userRole === "player" && editingCharacter && editingCharacter.type === "player" && editingCharacter.player_user_id === currentUserId ? (
              <Box>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Share Updates with Other Players</FormLabel>
                  <RadioGroup
                    row
                    value={formData.visibility || "dm-only"}
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
                  </RadioGroup>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {formData.visibility === "dm-only" && "Only the DM will see your character updates"}
                    {formData.visibility === "player-visible" && "All players and the DM will see your character updates"}
                  </Typography>
                </FormControl>
              </Box>
            ) : (
              <Box>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Visibility</FormLabel>
                  <RadioGroup
                    row
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    disabled={
                      userRole === "player" && 
                      editingCharacter && 
                      editingCharacter.type !== "player" && 
                      editingCharacter.created_by_user_id !== currentUserId
                    }
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
                    {userRole === "dm" && (
                      <FormControlLabel 
                        value="hidden" 
                        control={<Radio />} 
                        label="Hidden" 
                      />
                    )}
                  </RadioGroup>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {formData.visibility === "dm-only" && "Only DMs can see this character"}
                    {formData.visibility === "player-visible" && "Both DMs and players can see this character"}
                    {formData.visibility === "hidden" && "Hidden from all participants"}
                  </Typography>
                </FormControl>
              </Box>
            )}
          </Box>
          )}

          {/* Images Tab */}
          {dialogTab === 1 && (
            <Box sx={{ pt: 2 }}>
              {editingCharacter ? (
                <ImageGallery
                  campaignId={campaignId}
                  entityType="character"
                  entityId={editingCharacter.id}
                  onUpdate={() => {
                    // Optionally refresh character data if needed
                  }}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    Save the {config.label.toLowerCase()} first to upload images.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {/* Show Save button if user can edit or is creating new entity */}
          {(userRole === "dm" || 
            (editingCharacter?.type === "player" && editingCharacter?.player_user_id === currentUserId) ||
            ((editingCharacter?.type === "npc" || editingCharacter?.type === "antagonist") && editingCharacter?.created_by_user_id === currentUserId) ||
            (!editingCharacter && (type === "player" || type === "npc" || type === "antagonist"))
          ) && (
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              color={config.color}
              disabled={!formData.name.trim()}
            >
              {editingCharacter ? "Update" : "Create"} {config.label}
            </Button>
          )}
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
          Delete {config.label}?
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this {config.label.toLowerCase()}? This action cannot be undone.
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
