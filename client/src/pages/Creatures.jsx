// client/src/pages/Creatures.jsx - Creatures management page (D&D 5e-style statblocks)
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
  Tabs,
  Tab,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoIcon from "@mui/icons-material/Info";
import PetsIcon from "@mui/icons-material/Pets";
import apiClient from "../services/apiClient";
import RichTextEditor from "../components/RichTextEditor";
import CampaignNav from "../components/CampaignNav";
import BackButton from "../components/BackButton";
import ImageGallery from "../components/ImageGallery";
import TagSelector from "../components/TagSelector";

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const CREATURE_TYPES = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental",
  "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead", "other"
];
const CHALLENGE_RATINGS = [
  "0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"
];
const ACTION_TYPES = ["action", "bonus", "reaction", "legendary", "lair", "mythic", "other"];
const SPELLCASTING_TYPES = ["innate", "prepared", "pact", "other"];
const SPELLCASTING_ABILITIES = ["int", "wis", "cha"];

export default function Creatures() {
  const { id: campaignId } = useParams();
  const location = useLocation();
  const [creatures, setCreatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCreature, setEditingCreature] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    sourceType: "homebrew",
    visibility: "dm-only",
    tags: [],
    size: "",
    creatureType: "",
    subtype: "",
    alignment: "",
    challengeRating: "",
    proficiencyBonus: null,
    armorClass: { value: 10, type: "", notes: "" },
    hitPoints: { average: 0, formula: "", notes: "" },
    hitDice: "",
    damageVulnerabilities: "",
    damageResistances: "",
    damageImmunities: "",
    conditionImmunities: "",
    speeds: { walk: 30, fly: null, swim: null, climb: null, burrow: null, hover: false },
    senses: { blindsight: null, darkvision: null, tremorsense: null, truesight: null, passivePerception: null },
    languages: "",
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: [],
    skills: [],
    traits: [],
    actions: [],
    legendaryActionsMeta: null,
    lairActions: [],
    spellcasting: null,
    shortDescription: "",
    appearanceRichText: "",
    loreRichText: "",
    tacticsRichText: "",
    dmNotesRichText: "",
    linkedEntities: { npcs: [], factions: [], locations: [], quests: [], sessions: [] }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");  const [filterCR, setFilterCR] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [userRole, setUserRole] = useState(null);

  // Fetch creatures
  const fetchCreatures = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      if (filterType) params.append("creatureType", filterType);
      if (filterCR) params.append("challengeRating", filterCR);

      const data = await apiClient.get(`/campaigns/${campaignId}/creatures?${params.toString()}`);
      setCreatures(data);
    } catch (error) {
      console.error("Failed to fetch creatures:", error);
      setSnackbar({
        open: true,
        message: "Failed to load creatures",
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
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

useEffect(() => {
    fetchCreatures();
  }, [campaignId, debouncedSearchTerm, filterType, filterCR]);

  useEffect(() => {
    fetchUserRole();
  }, [campaignId]);

// Check for navigation state to auto-open entity dialog
  useEffect(() => {
    if (location.state?.openEntityId && creatures.length > 0) {
      const entityId = location.state.openEntityId;
      const entityType = location.state.entityType;
      
      if (entityType === "creature") {
        // Normalize IDs to numbers for comparison (handle both string and number IDs)
        const entityIdNum = typeof entityId === 'string' ? parseInt(entityId, 10) : entityId;
        const creature = creatures.find(c => {
          const creatureIdNum = typeof c.id === 'string' ? parseInt(c.id, 10) : c.id;
          return creatureIdNum === entityIdNum;
        });
        if (creature) {
          handleOpenDialog(creature);
          // Clear the state to prevent re-opening on re-render
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [location.state, creatures]);

  // Fetch tags for a creature
  const fetchCreatureTags = async (creatureId) => {
    try {
      const tags = await apiClient.get(`/campaigns/${campaignId}/entities/creature/${creatureId}/tags`);
      setSelectedTagIds(tags.map(tag => tag.id));
    } catch (error) {
      console.error("Failed to fetch creature tags:", error);
      setSelectedTagIds([]);
    }
  };

  const handleOpenDialog = async (creature = null) => {
    if (creature) {
      setEditingCreature(creature);
      setFormData({
        name: creature.name || "",
        sourceType: creature.source_type || "homebrew",
        visibility: creature.visibility || "dm-only",
        tags: creature.tags || [],
        size: creature.size || "",
        creatureType: creature.creature_type || "",
        subtype: creature.subtype || "",
        alignment: creature.alignment || "",
        challengeRating: creature.challenge_rating || "",
        proficiencyBonus: creature.proficiency_bonus || null,
        armorClass: creature.armorClass || { value: 10, type: "", notes: "" },
        hitPoints: creature.hitPoints || { average: 0, formula: "", notes: "" },
        hitDice: creature.hit_dice || "",
        damageVulnerabilities: creature.damage_vulnerabilities || "",
        damageResistances: creature.damage_resistances || "",
        damageImmunities: creature.damage_immunities || "",
        conditionImmunities: creature.condition_immunities || "",
        speeds: creature.speeds || { walk: 30, fly: null, swim: null, climb: null, burrow: null, hover: false },
        senses: creature.senses || { blindsight: null, darkvision: null, tremorsense: null, truesight: null, passivePerception: null },
        languages: creature.languages || "",
        abilities: creature.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrows: creature.savingThrows || [],
        skills: creature.skills || [],
        traits: creature.traits || [],
        actions: creature.actions || [],
        legendaryActionsMeta: creature.legendaryActionsMeta || null,
        lairActions: creature.lairActions || [],
        spellcasting: creature.spellcasting || null,
        shortDescription: creature.short_description || "",
        appearanceRichText: creature.appearance_rich_text || "",
        loreRichText: creature.lore_rich_text || "",
        tacticsRichText: creature.tactics_rich_text || "",
        dmNotesRichText: creature.dm_notes_rich_text || "",
        linkedEntities: creature.linkedEntities || { npcs: [], factions: [], locations: [], quests: [], sessions: [] }
      });
      await fetchCreatureTags(creature.id);
    } else {
      setEditingCreature(null);
      setFormData({
        name: "",
        sourceType: "homebrew",
        visibility: "dm-only",
        tags: [],
        size: "",
        creatureType: "",
        subtype: "",
        alignment: "",
        challengeRating: "",
        proficiencyBonus: null,
        armorClass: { value: 10, type: "", notes: "" },
        hitPoints: { average: 0, formula: "", notes: "" },
        hitDice: "",
        damageVulnerabilities: "",
        damageResistances: "",
        damageImmunities: "",
        conditionImmunities: "",
        speeds: { walk: 30, fly: null, swim: null, climb: null, burrow: null, hover: false },
        senses: { blindsight: null, darkvision: null, tremorsense: null, truesight: null, passivePerception: null },
        languages: "",
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrows: [],
        skills: [],
        traits: [],
        actions: [],
        legendaryActionsMeta: null,
        lairActions: [],
        spellcasting: null,
        shortDescription: "",
        appearanceRichText: "",
        loreRichText: "",
        tacticsRichText: "",
        dmNotesRichText: "",
        linkedEntities: { npcs: [], factions: [], locations: [], quests: [], sessions: [] }
      });
      setSelectedTagIds([]);
    }
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCreature(null);
    setDialogTab(0);
    setSelectedTagIds([]);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setSnackbar({
        open: true,
        message: "Creature name is required",
        severity: "error"
      });
      return;
    }
    if (!formData.size) {
      setSnackbar({
        open: true,
        message: "Size is required",
        severity: "error"
      });
      return;
    }
    if (!formData.creatureType) {
      setSnackbar({
        open: true,
        message: "Creature type is required",
        severity: "error"
      });
      return;
    }
    if (!formData.armorClass || formData.armorClass.value === null || formData.armorClass.value === undefined) {
      setSnackbar({
        open: true,
        message: "Armor Class value is required",
        severity: "error"
      });
      return;
    }
    if (!formData.hitPoints || formData.hitPoints.average === null || formData.hitPoints.average === undefined) {
      setSnackbar({
        open: true,
        message: "Hit Points average is required",
        severity: "error"
      });
      return;
    }
    if (!formData.abilities || !formData.abilities.str || !formData.abilities.dex || !formData.abilities.con || !formData.abilities.int || !formData.abilities.wis || !formData.abilities.cha) {
      setSnackbar({
        open: true,
        message: "All ability scores are required",
        severity: "error"
      });
      return;
    }

    try {
      // Ensure hitPoints.average and armorClass.value are numbers, not null/undefined
      const payload = {
        ...formData,
        proficiencyBonus: formData.proficiencyBonus ? parseInt(formData.proficiencyBonus) : null,
        hitPoints: {
          ...formData.hitPoints,
          average: formData.hitPoints.average === null || formData.hitPoints.average === undefined ? 0 : parseInt(formData.hitPoints.average) || 0
        },
        armorClass: {
          ...formData.armorClass,
          value: formData.armorClass.value === null || formData.armorClass.value === undefined ? 10 : parseInt(formData.armorClass.value) || 10
        }
      };

      let creatureId;
      if (editingCreature) {
        await apiClient.put(`/campaigns/${campaignId}/creatures/${editingCreature.id}`, payload);
        creatureId = editingCreature.id;
        setSnackbar({
          open: true,
          message: "Creature updated successfully",
          severity: "success"
        });
      } else {
        const result = await apiClient.post(`/campaigns/${campaignId}/creatures`, payload);
        creatureId = result.id;
        setSnackbar({
          open: true,
          message: "Creature created successfully",
          severity: "success"
        });
      }

      // Update tags
      if (creatureId) {
        try {
          await apiClient.post(
            `/campaigns/${campaignId}/entities/creature/${creatureId}/tags`,
            { tagIds: selectedTagIds }
          );
        } catch (error) {
          console.error("Failed to update creature tags:", error);
        }
      }

      handleCloseDialog();
      fetchCreatures();
    } catch (error) {
      console.error("Failed to save creature:", error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingCreature ? "update" : "create"} creature`,
        severity: "error"
      });
    }
  };

  const handleDelete = async (creatureId) => {
    if (!window.confirm("Are you sure you want to delete this creature?")) {
      return;
    }

    try {
      await apiClient.delete(`/campaigns/${campaignId}/creatures/${creatureId}`);
      setSnackbar({
        open: true,
        message: "Creature deleted successfully",
        severity: "success"
      });
      fetchCreatures();
    } catch (error) {
      console.error("Failed to delete creature:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete creature",
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
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString();
      }
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Helper to calculate ability modifier
  const getModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  // Helper to format ability score display
  const formatAbility = (score) => {
    const mod = getModifier(score);
    return `${score} (${mod >= 0 ? "+" : ""}${mod})`;
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography>Loading creatures...</Typography>
      </Box>
    );
  }

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
        <Typography 
          variant="h4" 
          color="primary.main"
          sx={{
            fontWeight: 700,
            letterSpacing: "0.5px",
            fontSize: { xs: "1.75rem", sm: "2.25rem" }
          }}
        >
          Creatures
        </Typography>
        <Chip 
          label={`${creatures.length} creature${creatures.length !== 1 ? "s" : ""}`} 
          color="primary"
          variant="outlined"
          sx={{
            fontSize: "0.875rem",
            height: 32,
            px: 1.5,
            borderWidth: 1.5,
            fontWeight: 600
          }}
        />
      </Box>

      {/* Search and Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search creatures..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterType}
            label="Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            {CREATURE_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>CR</InputLabel>
          <Select
            value={filterCR}
            label="CR"
            onChange={(e) => setFilterCR(e.target.value)}
          >
            <MenuItem value="">All CR</MenuItem>
            {CHALLENGE_RATINGS.map((cr) => (
              <MenuItem key={cr} value={cr}>
                {cr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
              Creating Creatures: What to Include
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Include full D&D 5e-style statblock: AC, HP, speed, ability scores
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Add creature type, size, and challenge rating (CR)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              List skills, saving throws, damage resistances/immunities, and condition immunities
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Describe special abilities, actions, legendary actions, and lair actions
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Note senses, languages, and any special traits or behaviors
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Include environment, typical behavior, and role in your campaign
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Creatures Table */}
      <TableContainer 
        component={Paper}
        sx={{
          background: "linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%)",
          border: "1px solid rgba(192, 163, 110, 0.1)",
          borderRadius: 2,
          overflow: "hidden"
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(192, 163, 110, 0.05)" }}>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>CR</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>AC</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Tags</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Visibility</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Created</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "primary.main", py: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {creatures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No creatures found. Create your first creature to get started!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              creatures.map((creature) => (
                <TableRow 
                  key={creature.id} 
                  hover
                  onClick={() => handleOpenDialog(creature)}
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
                      {creature.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {creature.creature_type && (
                      <Chip 
                        label={creature.creature_type} 
                        size="small" 
                        variant="outlined" 
                      />
                    )}
                    {creature.size && (
                      <Chip 
                        label={creature.size} 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {creature.challenge_rating || "—"}
                  </TableCell>
                  <TableCell>
                    {creature.armorClass?.value || "—"}
                  </TableCell>
                  <TableCell>
                    {creature.hitPoints?.average || "—"}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {creature.tags && creature.tags.length > 0 ? (
                        creature.tags.map((tag) => (
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
                    <Chip 
                      label={creature.visibility === "player-visible" ? "DM & Players" : creature.visibility === "hidden" ? "Hidden" : "DM Only"}
                      size="small"
                      color={creature.visibility === "player-visible" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {formatDate(creature.created_at)}
                      </Typography>
                      {creature.created_by_username && (
                        <Typography color="text.secondary" variant="caption" display="block">
                          by {creature.created_by_username}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      onClick={() => handleOpenDialog(creature)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(creature.id)}
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
        aria-label="add creature"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: "90vh" }
        }}
      >
        <DialogTitle>
          {editingCreature ? "Edit Creature" : "New Creature"}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingCreature ? "Update" : "Create"} a D&D 5e-style creature statblock
            {editingCreature && editingCreature.created_by_username && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Created by {editingCreature.created_by_username} on {formatDate(editingCreature.created_at)}
                {editingCreature.last_updated_by_username && editingCreature.last_updated_by_username !== editingCreature.created_by_username && (
                  <> • Last updated by {editingCreature.last_updated_by_username} on {formatDate(editingCreature.updated_at)}</>
                )}
              </Typography>
            )}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ overflow: "auto" }}>
          <Tabs value={dialogTab} onChange={(e, newValue) => setDialogTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Overview" />
            <Tab label="Stats" />
            <Tab label="Defenses" />
            <Tab label="Senses & Languages" />
            <Tab label="Traits" />
            <Tab label="Actions" />
            <Tab label="Spellcasting" />
            <Tab label="Lore & Tactics" />
            <Tab label="Links" />
            <Tab label="Images" />
          </Tabs>

          {/* Overview Tab */}
          {dialogTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                autoFocus
                label="Creature Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={{ minWidth: 200 }}>
                    <InputLabel>Size</InputLabel>
                    <Select
                      value={formData.size}
                      label="Size"
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    >
                      {SIZES.map((size) => (
                        <MenuItem key={size} value={size}>{size}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={{ minWidth: 200 }}>
                    <InputLabel>Creature Type</InputLabel>
                    <Select
                      value={formData.creatureType}
                      label="Creature Type"
                      onChange={(e) => setFormData({ ...formData, creatureType: e.target.value })}
                    >
                      {CREATURE_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Subtype (Optional)"
                    value={formData.subtype}
                    onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Alignment (Optional)"
                    value={formData.alignment}
                    onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel>Challenge Rating</InputLabel>
                    <Select
                      value={formData.challengeRating}
                      label="Challenge Rating"
                      onChange={(e) => setFormData({ ...formData, challengeRating: e.target.value })}
                    >
                      <MenuItem value="">None</MenuItem>
                      {CHALLENGE_RATINGS.map((cr) => (
                        <MenuItem key={cr} value={cr}>{cr}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Proficiency Bonus (Optional)"
                    value={formData.proficiencyBonus || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      proficiencyBonus: e.target.value === "" ? null : parseInt(e.target.value) 
                    })}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Short Description"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief description of the creature..."
              />

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
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <TagSelector
                  campaignId={campaignId}
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                  entityType="creature"
                  entityId={editingCreature?.id}
                  userRole={userRole}
                />
              </Box>
            </Box>
          )}

          {/* Stats Tab */}
          {dialogTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6">Armor Class</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="AC Value"
                    required
                    value={formData.armorClass?.value || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      armorClass: { ...formData.armorClass, value: parseInt(e.target.value) || 0 }
                    })}
                    sx={{ minWidth: 150 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="AC Type (e.g., 'natural armor')"
                    value={formData.armorClass?.type || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      armorClass: { ...formData.armorClass, type: e.target.value }
                    })}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="AC Notes"
                    value={formData.armorClass?.notes || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      armorClass: { ...formData.armorClass, notes: e.target.value }
                    })}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6">Hit Points</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Average HP"
                    required
                    value={formData.hitPoints?.average === 0 || formData.hitPoints?.average === null || formData.hitPoints?.average === undefined ? "" : formData.hitPoints.average}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        hitPoints: { ...formData.hitPoints, average: val ?? 0 }
                      });
                    }}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    sx={{ minWidth: 150 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Hit Dice Formula"
                    value={formData.hitPoints?.formula || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      hitPoints: { ...formData.hitPoints, formula: e.target.value }
                    })}
                    placeholder="e.g., 10d8+30"
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="HP Notes"
                    value={formData.hitPoints?.notes || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      hitPoints: { ...formData.hitPoints, notes: e.target.value }
                    })}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Hit Dice (Optional)"
                    value={formData.hitDice}
                    onChange={(e) => setFormData({ ...formData, hitDice: e.target.value })}
                    placeholder="e.g., 10d8"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6">Speed</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Walk Speed (ft)"
                    value={formData.speeds?.walk === null || formData.speeds?.walk === undefined ? "" : formData.speeds.walk}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        speeds: { ...formData.speeds, walk: val ?? 30 }
                      });
                    }}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    sx={{ minWidth: 180 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Fly Speed (ft, Optional)"
                    value={formData.speeds?.fly === null || formData.speeds?.fly === undefined ? "" : formData.speeds.fly}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        speeds: { ...formData.speeds, fly: val }
                      });
                    }}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Swim Speed (ft, Optional)"
                    value={formData.speeds?.swim === null || formData.speeds?.swim === undefined ? "" : formData.speeds.swim}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        speeds: { ...formData.speeds, swim: val }
                      });
                    }}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Climb Speed (ft, Optional)"
                    value={formData.speeds?.climb === null || formData.speeds?.climb === undefined ? "" : formData.speeds.climb}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        speeds: { ...formData.speeds, climb: val }
                      });
                    }}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Burrow Speed (ft, Optional)"
                    value={formData.speeds?.burrow === null || formData.speeds?.burrow === undefined ? "" : formData.speeds.burrow}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        speeds: { ...formData.speeds, burrow: val }
                      });
                    }}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6">Ability Scores</Typography>
              <Grid container spacing={2}>
                {["str", "dex", "con", "int", "wis", "cha"].map((ability) => (
                  <Grid item xs={6} sm={4} md={2} key={ability}>
                    <TextField
                      fullWidth
                      type="number"
                      label={ability.toUpperCase()}
                      required
                      value={formData.abilities?.[ability] === null || formData.abilities?.[ability] === undefined ? "" : formData.abilities[ability]}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                        setFormData({
                          ...formData,
                          abilities: { ...formData.abilities, [ability]: val ?? 10 }
                        });
                      }}
                      onFocus={(e) => {
                        if (e.target.value === "0") {
                          e.target.select();
                        }
                      }}
                      helperText={formData.abilities?.[ability] ? formatAbility(formData.abilities[ability]) : ""}
                      sx={{ minWidth: 120 }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Saving Throws</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setFormData({
                    ...formData,
                    savingThrows: [...(formData.savingThrows || []), { ability: "str", bonus: 0 }]
                  })}
                  variant="outlined"
                  size="small"
                >
                  Add Saving Throw
                </Button>
              </Box>
              {(formData.savingThrows || []).map((save, index) => (
                <Box key={index} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Ability</InputLabel>
                    <Select
                      value={save.ability}
                      label="Ability"
                      onChange={(e) => {
                        const updated = [...formData.savingThrows];
                        updated[index] = { ...save, ability: e.target.value };
                        setFormData({ ...formData, savingThrows: updated });
                      }}
                    >
                      {["str", "dex", "con", "int", "wis", "cha"].map((ability) => (
                        <MenuItem key={ability} value={ability}>
                          {ability.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    type="number"
                    label="Bonus"
                    value={save.bonus === null || save.bonus === undefined ? "" : save.bonus}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      const updated = [...formData.savingThrows];
                      updated[index] = { ...save, bonus: val ?? 0 };
                      setFormData({ ...formData, savingThrows: updated });
                    }}
                    sx={{ minWidth: 120, width: 120 }}
                  />
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      const updated = formData.savingThrows.filter((_, i) => i !== index);
                      setFormData({ ...formData, savingThrows: updated });
                    }}
                    color="error"
                    variant="outlined"
                    size="small"
                  >
                    Remove
                  </Button>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Skills</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setFormData({
                    ...formData,
                    skills: [...(formData.skills || []), { skill: "", bonus: 0 }]
                  })}
                  variant="outlined"
                  size="small"
                >
                  Add Skill
                </Button>
              </Box>
              {(formData.skills || []).map((skill, index) => (
                <Box key={index} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    fullWidth
                    label="Skill Name"
                    value={skill.skill}
                    onChange={(e) => {
                      const updated = [...formData.skills];
                      updated[index] = { ...skill, skill: e.target.value };
                      setFormData({ ...formData, skills: updated });
                    }}
                    placeholder="e.g., Perception, Stealth"
                    sx={{ minWidth: 200 }}
                  />
                  <TextField
                    type="number"
                    label="Bonus"
                    value={skill.bonus === null || skill.bonus === undefined ? "" : skill.bonus}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      const updated = [...formData.skills];
                      updated[index] = { ...skill, bonus: val ?? 0 };
                      setFormData({ ...formData, skills: updated });
                    }}
                    sx={{ minWidth: 120, width: 120 }}
                  />
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      const updated = formData.skills.filter((_, i) => i !== index);
                      setFormData({ ...formData, skills: updated });
                    }}
                    color="error"
                    variant="outlined"
                    size="small"
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          {/* Defenses Tab */}
          {dialogTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Damage Vulnerabilities"
                value={formData.damageVulnerabilities}
                onChange={(e) => setFormData({ ...formData, damageVulnerabilities: e.target.value })}
                placeholder="e.g., fire, cold"
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Damage Resistances"
                value={formData.damageResistances}
                onChange={(e) => setFormData({ ...formData, damageResistances: e.target.value })}
                placeholder="e.g., bludgeoning, piercing, and slashing from nonmagical attacks"
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Damage Immunities"
                value={formData.damageImmunities}
                onChange={(e) => setFormData({ ...formData, damageImmunities: e.target.value })}
                placeholder="e.g., poison"
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Condition Immunities"
                value={formData.conditionImmunities}
                onChange={(e) => setFormData({ ...formData, conditionImmunities: e.target.value })}
                placeholder="e.g., charmed, frightened"
              />
            </Box>
          )}

          {/* Senses & Languages Tab */}
          {dialogTab === 3 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6">Senses</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Blindsight (ft, Optional)"
                    value={formData.senses?.blindsight === null || formData.senses?.blindsight === undefined ? "" : formData.senses.blindsight}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        senses: { ...formData.senses, blindsight: val }
                      });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Darkvision (ft, Optional)"
                    value={formData.senses?.darkvision === null || formData.senses?.darkvision === undefined ? "" : formData.senses.darkvision}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        senses: { ...formData.senses, darkvision: val }
                      });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Tremorsense (ft, Optional)"
                    value={formData.senses?.tremorsense === null || formData.senses?.tremorsense === undefined ? "" : formData.senses.tremorsense}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        senses: { ...formData.senses, tremorsense: val }
                      });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Truesight (ft, Optional)"
                    value={formData.senses?.truesight === null || formData.senses?.truesight === undefined ? "" : formData.senses.truesight}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        senses: { ...formData.senses, truesight: val }
                      });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Passive Perception"
                    value={formData.senses?.passivePerception === null || formData.senses?.passivePerception === undefined ? "" : formData.senses.passivePerception}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        senses: { ...formData.senses, passivePerception: val }
                      });
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label="Languages"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                placeholder="e.g., Common, Draconic, telepathy 120 ft."
              />
            </Box>
          )}

          {/* Traits Tab */}
          {dialogTab === 4 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Traits</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setFormData({
                    ...formData,
                    traits: [...(formData.traits || []), { name: "", descriptionRichText: "" }]
                  })}
                  variant="outlined"
                  size="small"
                >
                  Add Trait
                </Button>
              </Box>
              {(formData.traits || []).map((trait, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{trait.name || `Trait ${index + 1}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Trait Name"
                        value={trait.name}
                        onChange={(e) => {
                          const updated = [...formData.traits];
                          updated[index] = { ...trait, name: e.target.value };
                          setFormData({ ...formData, traits: updated });
                        }}
                      />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Description</Typography>
                        <RichTextEditor
                          value={trait.descriptionRichText || ""}
                          onChange={(html) => {
                            const updated = [...formData.traits];
                            updated[index] = { ...trait, descriptionRichText: html };
                            setFormData({ ...formData, traits: updated });
                          }}
                          placeholder="Enter trait description..."
                          campaignId={campaignId}
                        />
                      </Box>
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          const updated = formData.traits.filter((_, i) => i !== index);
                          setFormData({ ...formData, traits: updated });
                        }}
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        Remove Trait
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* Actions Tab */}
          {dialogTab === 5 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Actions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setFormData({
                    ...formData,
                    actions: [...(formData.actions || []), { name: "", type: "action", descriptionRichText: "" }]
                  })}
                  variant="outlined"
                  size="small"
                >
                  Add Action
                </Button>
              </Box>
              {(formData.actions || []).map((action, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                      <Typography sx={{ flexGrow: 1 }}>{action.name || `Action ${index + 1}`}</Typography>
                      <Chip label={action.type} size="small" variant="outlined" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Action Name"
                        value={action.name}
                        onChange={(e) => {
                          const updated = [...formData.actions];
                          updated[index] = { ...action, name: e.target.value };
                          setFormData({ ...formData, actions: updated });
                        }}
                      />
                      <FormControl fullWidth sx={{ minWidth: 200 }}>
                        <InputLabel>Action Type</InputLabel>
                        <Select
                          value={action.type}
                          label="Action Type"
                          onChange={(e) => {
                            const updated = [...formData.actions];
                            updated[index] = { ...action, type: e.target.value };
                            setFormData({ ...formData, actions: updated });
                          }}
                        >
                          {ACTION_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Description</Typography>
                        <RichTextEditor
                          value={action.descriptionRichText || ""}
                          onChange={(html) => {
                            const updated = [...formData.actions];
                            updated[index] = { ...action, descriptionRichText: html };
                            setFormData({ ...formData, actions: updated });
                          }}
                          placeholder="Enter action description..."
                          campaignId={campaignId}
                        />
                      </Box>
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          const updated = formData.actions.filter((_, i) => i !== index);
                          setFormData({ ...formData, actions: updated });
                        }}
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        Remove Action
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* Legendary Actions */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Legendary Actions</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Actions Per Round"
                    value={formData.legendaryActionsMeta?.actionsPerRound === null || formData.legendaryActionsMeta?.actionsPerRound === undefined ? "" : formData.legendaryActionsMeta.actionsPerRound}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        legendaryActionsMeta: {
                          ...formData.legendaryActionsMeta,
                          actionsPerRound: val
                        }
                      });
                    }}
                  />
                </Grid>
              </Grid>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Legendary Actions Description</Typography>
                <RichTextEditor
                  value={formData.legendaryActionsMeta?.descriptionRichText || ""}
                  onChange={(html) => {
                    setFormData({
                      ...formData,
                      legendaryActionsMeta: {
                        ...formData.legendaryActionsMeta,
                        descriptionRichText: html
                      }
                    });
                  }}
                  placeholder="Enter legendary actions description..."
                  campaignId={campaignId}
                />
              </Box>

              {/* Lair Actions */}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Lair Actions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setFormData({
                    ...formData,
                    lairActions: [...(formData.lairActions || []), { name: "", descriptionRichText: "" }]
                  })}
                  variant="outlined"
                  size="small"
                >
                  Add Lair Action
                </Button>
              </Box>
              {(formData.lairActions || []).map((lairAction, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{lairAction.name || `Lair Action ${index + 1}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Lair Action Name"
                        value={lairAction.name}
                        onChange={(e) => {
                          const updated = [...formData.lairActions];
                          updated[index] = { ...lairAction, name: e.target.value };
                          setFormData({ ...formData, lairActions: updated });
                        }}
                      />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Description</Typography>
                        <RichTextEditor
                          value={lairAction.descriptionRichText || ""}
                          onChange={(html) => {
                            const updated = [...formData.lairActions];
                            updated[index] = { ...lairAction, descriptionRichText: html };
                            setFormData({ ...formData, lairActions: updated });
                          }}
                          placeholder="Enter lair action description..."
                          campaignId={campaignId}
                        />
                      </Box>
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          const updated = formData.lairActions.filter((_, i) => i !== index);
                          setFormData({ ...formData, lairActions: updated });
                        }}
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        Remove Lair Action
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* Spellcasting Tab */}
          {dialogTab === 6 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControlLabel
                control={
                  <Radio
                    checked={formData.spellcasting !== null}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          spellcasting: {
                            type: "prepared",
                            ability: "int",
                            saveDC: null,
                            attackBonus: null,
                            notesRichText: "",
                            spellsByLevel: {},
                            atWill: [],
                            perDay: {}
                          }
                        });
                      } else {
                        setFormData({ ...formData, spellcasting: null });
                      }
                    }}
                  />
                }
                label="Enable Spellcasting"
              />
              {formData.spellcasting && (
                <>
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel>Spellcasting Type</InputLabel>
                    <Select
                      value={formData.spellcasting.type}
                      label="Spellcasting Type"
                      onChange={(e) => setFormData({
                        ...formData,
                        spellcasting: { ...formData.spellcasting, type: e.target.value }
                      })}
                    >
                      {SPELLCASTING_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel>Spellcasting Ability</InputLabel>
                    <Select
                      value={formData.spellcasting.ability || ""}
                      label="Spellcasting Ability"
                      onChange={(e) => setFormData({
                        ...formData,
                        spellcasting: { ...formData.spellcasting, ability: e.target.value }
                      })}
                    >
                      {SPELLCASTING_ABILITIES.map((ability) => (
                        <MenuItem key={ability} value={ability}>
                          {ability.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Spell Save DC (Optional)"
                        value={formData.spellcasting.saveDC === null || formData.spellcasting.saveDC === undefined ? "" : formData.spellcasting.saveDC}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                          setFormData({
                            ...formData,
                            spellcasting: { ...formData.spellcasting, saveDC: val }
                          });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Spell Attack Bonus (Optional)"
                        value={formData.spellcasting.attackBonus === null || formData.spellcasting.attackBonus === undefined ? "" : formData.spellcasting.attackBonus}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                          setFormData({
                            ...formData,
                            spellcasting: { ...formData.spellcasting, attackBonus: val }
                          });
                        }}
                      />
                    </Grid>
                  </Grid>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Spellcasting Notes</Typography>
                    <RichTextEditor
                      value={formData.spellcasting.notesRichText || ""}
                      onChange={(html) => setFormData({
                        ...formData,
                        spellcasting: { ...formData.spellcasting, notesRichText: html }
                      })}
                      placeholder="Enter spellcasting notes..."
                      campaignId={campaignId}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Note: Spell lists by level, at-will spells, and per-day spells can be added in future updates.
                    For now, use the notes field to document spellcasting details.
                  </Typography>
                </>
              )}
            </Box>
          )}

          {/* Lore & Tactics Tab */}
          {dialogTab === 7 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Appearance</Typography>
                <RichTextEditor
                  value={formData.appearanceRichText}
                  onChange={(html) => setFormData({ ...formData, appearanceRichText: html })}
                  placeholder="Describe the creature's appearance..."
                  campaignId={campaignId}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Lore & Background</Typography>
                <RichTextEditor
                  value={formData.loreRichText}
                  onChange={(html) => setFormData({ ...formData, loreRichText: html })}
                  placeholder="Enter lore and background information..."
                  campaignId={campaignId}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Tactics</Typography>
                <RichTextEditor
                  value={formData.tacticsRichText}
                  onChange={(html) => setFormData({ ...formData, tacticsRichText: html })}
                  placeholder="Describe combat tactics and behavior..."
                  campaignId={campaignId}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>DM Notes</Typography>
                <RichTextEditor
                  value={formData.dmNotesRichText}
                  onChange={(html) => setFormData({ ...formData, dmNotesRichText: html })}
                  placeholder="Private DM-only notes..."
                  campaignId={campaignId}
                />
              </Box>
            </Box>
          )}

          {/* Links Tab */}
          {dialogTab === 8 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Link this creature to other entities in your campaign. This feature will be enhanced in future updates.
              </Typography>
              {/* TODO: Implement entity linking UI similar to quests */}
            </Box>
          )}

          {/* Images Tab */}
          {dialogTab === 9 && (
            <Box sx={{ pt: 2 }}>
              {editingCreature?.id ? (
                <ImageGallery
                  campaignId={campaignId}
                  entityType="creature"
                  entityId={editingCreature.id}
                  onUpdate={fetchCreatures}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    Save the creature first to upload images.
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
            disabled={!formData.name.trim() || !formData.size || !formData.creatureType}
          >
            {editingCreature ? "Update" : "Create"} Creature
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
