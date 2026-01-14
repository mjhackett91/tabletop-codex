// client/src/components/EquipmentItemEditor.jsx - Detailed D&D Equipment Item Editor
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
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";

const ITEM_TYPES = [
  "Weapon", "Armor", "Shield", "Adventuring Gear", "Tool", 
  "Wondrous Item", "Potion", "Scroll", "Ring", "Staff", "Wand", "Other"
];

const WEAPON_TYPES = [
  "Simple Melee", "Simple Ranged", "Martial Melee", "Martial Ranged"
];

const ARMOR_TYPES = [
  "Light Armor", "Medium Armor", "Heavy Armor", "Shield"
];

export default function EquipmentItemEditor({ item, onChange, onDelete, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const updateItem = (field, value) => {
    if (readOnly) return;
    onChange({ ...item, [field]: value });
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
              {item.name || "New Item"}
            </Typography>
            {item.type && <Chip label={item.type} size="small" variant="outlined" />}
            {item.attunement && (
              <Chip label="Requires Attunement" size="small" color="warning" />
            )}
          </Box>
          {!readOnly && (
            <Box
              component="div"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmOpen(true);
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
              label="Item Name"
              value={item.name || ""}
              onChange={(e) => updateItem("name", e.target.value)}
              required
              sx={{ minWidth: 200 }}
              disabled={readOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Item Type"
              select
              value={item.type || ""}
              onChange={(e) => updateItem("type", e.target.value)}
              sx={{ minWidth: 200 }}
              disabled={readOnly}
            >
              {ITEM_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={item.description || ""}
              onChange={(e) => updateItem("description", e.target.value)}
              placeholder="Item description and properties..."
              sx={{ minWidth: 300 }}
              disabled={readOnly}
            />
          </Grid>

          {/* Statistics */}
          {(item.type === "Weapon" || item.type === "Armor" || item.type === "Shield") && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>Statistics</Typography>
              </Grid>
              
              {item.type === "Weapon" && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Weapon Type"
                      select
                      value={item.weaponType || ""}
                      onChange={(e) => updateItem("weaponType", e.target.value)}
                      sx={{ minWidth: 180 }}
                      disabled={readOnly}
                    >
                      {WEAPON_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Damage"
                      value={item.damage || ""}
                      onChange={(e) => updateItem("damage", e.target.value)}
                      placeholder="1d8 + 2"
                      sx={{ minWidth: 150 }}
                      disabled={readOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Damage Type"
                      value={item.damageType || ""}
                      onChange={(e) => updateItem("damageType", e.target.value)}
                      placeholder="Slashing, Piercing, Bludgeoning"
                      sx={{ minWidth: 200 }}
                      disabled={readOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Properties"
                      value={item.properties || ""}
                      onChange={(e) => updateItem("properties", e.target.value)}
                      placeholder="Versatile, Finesse, etc."
                      sx={{ minWidth: 180 }}
                      disabled={readOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Range (ft)"
                      value={item.range || ""}
                      onChange={(e) => updateItem("range", e.target.value)}
                      sx={{ minWidth: 120 }}
                      disabled={readOnly}
                    />
                  </Grid>
                </>
              )}

              {item.type === "Armor" && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Armor Type"
                      select
                      value={item.armorType || ""}
                      onChange={(e) => updateItem("armorType", e.target.value)}
                      sx={{ minWidth: 180 }}
                      disabled={readOnly}
                    >
                      {ARMOR_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Armor Class (AC)"
                      value={item.ac || ""}
                      onChange={(e) => updateItem("ac", e.target.value)}
                      sx={{ minWidth: 120 }}
                      disabled={readOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Dexterity Modifier Max"
                      value={item.dexModMax || ""}
                      onChange={(e) => updateItem("dexModMax", e.target.value)}
                      placeholder="e.g., 2 for medium armor"
                      sx={{ minWidth: 200 }}
                      disabled={readOnly}
                    />
                  </Grid>
                </>
              )}

              {item.type === "Shield" && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="AC Bonus"
                    value={item.acBonus || ""}
                    onChange={(e) => updateItem("acBonus", e.target.value)}
                    sx={{ minWidth: 120 }}
                    disabled={readOnly}
                  />
                </Grid>
              )}
            </>
          )}

          {/* Other Stats */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" gutterBottom>Additional Properties</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Weight (lbs)"
              value={item.weight || ""}
              onChange={(e) => updateItem("weight", e.target.value)}
              sx={{ minWidth: 150 }}
              disabled={readOnly}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Value"
              value={item.value || ""}
              onChange={(e) => updateItem("value", e.target.value)}
              placeholder="e.g., 50 gp"
              sx={{ minWidth: 150 }}
              disabled={readOnly}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Rarity"
              select
              value={item.rarity || ""}
              onChange={(e) => updateItem("rarity", e.target.value)}
              sx={{ minWidth: 150 }}
              disabled={readOnly}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Common">Common</MenuItem>
              <MenuItem value="Uncommon">Uncommon</MenuItem>
              <MenuItem value="Rare">Rare</MenuItem>
              <MenuItem value="Very Rare">Very Rare</MenuItem>
              <MenuItem value="Legendary">Legendary</MenuItem>
              <MenuItem value="Artifact">Artifact</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={item.attunement || false}
                  onChange={(e) => updateItem("attunement", e.target.checked)}
                  disabled={readOnly}
                />
              }
              label="Requires Attunement"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Special Properties"
              value={item.specialProperties || ""}
              onChange={(e) => updateItem("specialProperties", e.target.value)}
              placeholder="Additional magical properties, curses, or special abilities..."
              sx={{ minWidth: 400 }}
              disabled={readOnly}
            />
          </Grid>
        </Grid>
      </AccordionDetails>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Equipment Item?
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete &quot;{item.name || "this item"}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setDeleteConfirmOpen(false);
              onDelete();
            }} 
            color="error" 
            variant="contained" 
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
}
