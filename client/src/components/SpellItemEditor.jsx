// client/src/components/SpellItemEditor.jsx - D&D 2024 PHB Style Spell Editor
import { useState } from "react";
import {
  Box,
  TextField,
  Grid,
  Typography,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";

const SPELL_LEVELS = [
  "Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"
];

export default function SpellItemEditor({ spell, onChange, onDelete, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);

  const updateSpell = (field, value) => {
    if (readOnly) return;
    onChange({ ...spell, [field]: value });
  };

  return (
    <Accordion 
      expanded={expanded}
      onChange={(e, isExpanded) => setExpanded(isExpanded)}
      sx={{ mb: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {spell.name || "New Spell"}
            </Typography>
            {spell.level && (
              <Chip label={spell.level} size="small" variant="outlined" />
            )}
            {spell.concentration && (
              <Chip label="Concentration" size="small" color="warning" />
            )}
            {spell.ritual && (
              <Chip label="Ritual" size="small" color="info" />
            )}
          </Box>
          {!readOnly && (
            <Box
              component="div"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxSizing: "border-box",
                WebkitTapHighlightColor: "transparent",
                backgroundColor: "transparent",
                outline: 0,
                border: 0,
                margin: 0,
                borderRadius: "50%",
                cursor: "pointer",
                userSelect: "none",
                verticalAlign: "middle",
                appearance: "none",
                textDecoration: "none",
                color: "inherit",
                padding: "8px",
                fontSize: "1.5rem",
                width: "40px",
                height: "40px",
                "&:hover": {
                  backgroundColor: "rgba(211, 47, 47, 0.08)",
                },
                "&:active": {
                  backgroundColor: "rgba(211, 47, 47, 0.12)",
                },
              }}
            >
              <DeleteIcon sx={{ color: "error.main", fontSize: "1.25rem" }} />
            </Box>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {/* Basic Info */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Spell Name"
              value={spell.name || ""}
              onChange={(e) => updateSpell("name", e.target.value)}
              required
              sx={{ minWidth: 200 }}
              disabled={readOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Level"
              select
              value={spell.level || ""}
              onChange={(e) => updateSpell("level", e.target.value)}
              sx={{ minWidth: 150 }}
              disabled={readOnly}
            >
              {SPELL_LEVELS.map((level) => (
                <MenuItem key={level} value={level}>{level}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Casting Time */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Casting Time"
              value={spell.castingTime || ""}
              onChange={(e) => updateSpell("castingTime", e.target.value)}
              placeholder="e.g., 1 action, 1 bonus action, 1 reaction, 1 minute"
              sx={{ minWidth: 200 }}
              disabled={readOnly}
            />
          </Grid>

          {/* Range */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Range"
              value={spell.range || ""}
              onChange={(e) => updateSpell("range", e.target.value)}
              placeholder="e.g., Self, 30 feet, 60 feet, Touch"
              sx={{ minWidth: 200 }}
              disabled={readOnly}
            />
          </Grid>

          {/* Components */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Components
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={spell.verbal || false}
                    onChange={(e) => updateSpell("verbal", e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label="Verbal (V)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={spell.somatic || false}
                    onChange={(e) => updateSpell("somatic", e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label="Somatic (S)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={spell.materials || false}
                    onChange={(e) => {
                      updateSpell("materials", e.target.checked);
                      // Clear materials description if unchecking
                      if (!e.target.checked) {
                        updateSpell("materialsDescription", "");
                      }
                    }}
                    disabled={readOnly}
                  />
                }
                label="Material (M)"
              />
            </Box>
          </Grid>

          {/* Materials Description */}
          {spell.materials && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Material Components"
                value={spell.materialsDescription || ""}
                onChange={(e) => updateSpell("materialsDescription", e.target.value)}
                placeholder="e.g., a bit of spiderweb, a piece of fur, a pinch of bone dust"
                disabled={readOnly}
              />
            </Grid>
          )}

          {/* Duration & Concentration */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Duration"
              value={spell.duration || ""}
              onChange={(e) => updateSpell("duration", e.target.value)}
              placeholder="e.g., Instantaneous, 1 minute, 1 hour, 8 hours"
              sx={{ minWidth: 200 }}
              disabled={readOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", height: "100%" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={spell.concentration || false}
                    onChange={(e) => updateSpell("concentration", e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label="Concentration"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={spell.ritual || false}
                    onChange={(e) => updateSpell("ritual", e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label="Ritual"
              />
            </Box>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={spell.description || ""}
              onChange={(e) => updateSpell("description", e.target.value)}
              placeholder="Spell description and effects..."
              disabled={readOnly}
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}
