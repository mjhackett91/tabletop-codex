// client/src/components/CharacterListPage.jsx - Shared component for Characters, NPCs, Antagonists
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import apiClient from "../services/apiClient";
import RichTextEditor from "./RichTextEditor";
import CampaignNav from "./CampaignNav";
import CharacterSheetEditor from "./CharacterSheetEditor";
import BackButton from "./BackButton";

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
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    alignment: "",
    character_sheet: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const config = TYPE_CONFIG[type];

  // Fetch characters
  const fetchCharacters = async () => {
    if (!campaignId) {
      console.error("Campaign ID is missing");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching characters for campaign:", campaignId, "type:", type);
      const data = await apiClient.get(`/api/campaigns/${campaignId}/characters?type=${type}`);
      console.log("Characters data received:", data);
      setCharacters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch characters:", error);
      console.error("Error details:", { campaignId, type, error: error.message });
      showSnackbar(error.message || "Failed to fetch characters", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, [campaignId, type]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (character = null) => {
    setEditingCharacter(character);
    setFormData({
      name: character?.name || "",
      description: character?.description || "",
      alignment: character?.alignment || "",
      character_sheet: character?.character_sheet || null
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCharacter(null);
    setFormData({ name: "", description: "", alignment: "", character_sheet: null });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        type,
        name: formData.name,
        description: formData.description,
        alignment: formData.alignment,
        character_sheet: formData.character_sheet
      };

      if (editingCharacter) {
        await apiClient.put(`/api/campaigns/${campaignId}/characters/${editingCharacter.id}`, payload);
      } else {
        await apiClient.post(`/api/campaigns/${campaignId}/characters`, payload);
      }

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

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${config.label.toLowerCase()}?`)) return;

    try {
      await apiClient.delete(`/api/campaigns/${campaignId}/characters/${id}`);
      await fetchCharacters();
      showSnackbar(`${config.label} deleted successfully`);
    } catch (error) {
      console.error("Error deleting character:", error);
      showSnackbar(error.message, "error");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography>Loading {config.plural.toLowerCase()}...</Typography>
      </Box>
    );
  }

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
              <TableCell>Name</TableCell>
              <TableCell>Alignment</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {characters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No {config.plural.toLowerCase()} yet. Create your first {config.label.toLowerCase()}!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              characters.map((character) => (
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
                    <Typography variant="subtitle1" fontWeight="medium">
                      {character.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {character.alignment && (
                      <Chip label={character.alignment} size="small" variant="outlined" />
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
                      dangerouslySetInnerHTML={{ __html: character.description || "<span style='color: #bdbdbd'>No description</span>" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary">
                      {formatDate(character.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      onClick={() => handleOpenDialog(character)}
                      color={config.color}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(character.id)}
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
        color={config.color}
        aria-label={`add ${config.label.toLowerCase()}`}
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
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          {editingCharacter ? `Edit ${config.label}` : `New ${config.label}`}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {editingCharacter ? "Update" : "Create"} a {config.label.toLowerCase()} for this campaign
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              autoFocus
              label={`${config.label} Name`}
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <TextField
              label="Alignment"
              fullWidth
              variant="outlined"
              value={formData.alignment}
              onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
              placeholder="e.g., Lawful Good, Chaotic Evil"
              helperText="D&D alignment (optional)"
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder={`Enter ${config.label.toLowerCase()} description...`}
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
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color={config.color}
            disabled={!formData.name.trim()}
          >
            {editingCharacter ? "Update" : "Create"} {config.label}
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
