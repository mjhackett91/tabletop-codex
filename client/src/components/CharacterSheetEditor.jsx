// client/src/components/CharacterSheetEditor.jsx - D&D 5e Character Sheet Editor
import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Button,
  MenuItem,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EquipmentItemEditor from "./EquipmentItemEditor";

// D&D 5e ability scores
const ABILITY_SCORES = [
  { id: "strength", label: "Strength", abbr: "STR" },
  { id: "dexterity", label: "Dexterity", abbr: "DEX" },
  { id: "constitution", label: "Constitution", abbr: "CON" },
  { id: "intelligence", label: "Intelligence", abbr: "INT" },
  { id: "wisdom", label: "Wisdom", abbr: "WIS" },
  { id: "charisma", label: "Charisma", abbr: "CHA" },
];

// D&D 5e classes
const CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
  "Artificer", "Blood Hunter"
];

// D&D 5e races
const RACES = [
  "Human", "Elf", "Dwarf", "Halfling", "Dragonborn", "Gnome",
  "Half-Elf", "Half-Orc", "Tiefling", "Aasimar", "Firbolg",
  "Goliath", "Kenku", "Lizardfolk", "Tabaxi", "Triton", "Genasi",
  "Gith", "Yuan-ti", "Changeling", "Kalashtar", "Warforged", "Other"
];

// D&D 5e skills
const SKILLS = [
  { id: "acrobatics", name: "Acrobatics", ability: "dexterity" },
  { id: "animalHandling", name: "Animal Handling", ability: "wisdom" },
  { id: "arcana", name: "Arcana", ability: "intelligence" },
  { id: "athletics", name: "Athletics", ability: "strength" },
  { id: "deception", name: "Deception", ability: "charisma" },
  { id: "history", name: "History", ability: "intelligence" },
  { id: "insight", name: "Insight", ability: "wisdom" },
  { id: "intimidation", name: "Intimidation", ability: "charisma" },
  { id: "investigation", name: "Investigation", ability: "intelligence" },
  { id: "medicine", name: "Medicine", ability: "wisdom" },
  { id: "nature", name: "Nature", ability: "intelligence" },
  { id: "perception", name: "Perception", ability: "wisdom" },
  { id: "performance", name: "Performance", ability: "charisma" },
  { id: "persuasion", name: "Persuasion", ability: "charisma" },
  { id: "religion", name: "Religion", ability: "intelligence" },
  { id: "sleightOfHand", name: "Sleight of Hand", ability: "dexterity" },
  { id: "stealth", name: "Stealth", ability: "dexterity" },
  { id: "survival", name: "Survival", ability: "wisdom" },
];

// Calculate ability modifier
const getModifier = (score) => {
  return Math.floor((score - 10) / 2);
};

const DEFAULT_SHEET = {
  // Basic Info
  class: "",
  level: 1,
  race: "",
  background: "",
  
  // Ability Scores
  stats: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  
  // Combat
  hp: { current: 0, max: 0, temp: 0 },
  ac: 10,
  initiative: 0,
  speed: 30,
  
  // Skills (proficiency: true/false)
  skills: {},
  
  // Saving Throws (proficiency: true/false)
  savingThrows: {},
  
  // Features & Traits
  features: [],
  traits: [],
  
  // Equipment & Inventory
  equipment: [],
  
  // Spells
  spells: [],
  
  // Proficiencies
  proficiencies: {
    languages: [],
    tools: [],
    weapons: [],
    armor: [],
  },
  
  // Personality (for players)
  personality: {
    traits: "",
    ideals: "",
    bonds: "",
    flaws: "",
  },
  
  // Biography
  backstory: "",
};

export default function CharacterSheetEditor({ value, onChange, type = "player", readOnly = false }) {
  const [sheet, setSheet] = useState(value || DEFAULT_SHEET);

  // Sync with external value changes (e.g., when editing different character)
  useEffect(() => {
    if (value) {
      // Convert legacy string equipment items to objects
      const processedValue = { ...value };
      if (Array.isArray(processedValue.equipment)) {
        processedValue.equipment = processedValue.equipment.map(item => 
          typeof item === "string" 
            ? { name: item, type: "", modifiers: {} }
            : item
        );
      }
      setSheet(processedValue);
    } else {
      setSheet(DEFAULT_SHEET);
    }
  }, [value]);

  const updateSheet = (updates) => {
    if (readOnly) return; // Don't update if read-only
    const newSheet = { ...sheet, ...updates };
    setSheet(newSheet);
    if (onChange) {
      onChange(newSheet);
    }
  };

  const updateStat = (statName, value) => {
    const numValue = parseInt(value) || 0;
    updateSheet({
      stats: { ...sheet.stats, [statName]: numValue }
    });
  };

  const toggleSkillProficiency = (skillId) => {
    if (readOnly) return;
    updateSheet({
      skills: { ...sheet.skills, [skillId]: !sheet.skills[skillId] }
    });
  };

  const toggleSavingThrowProficiency = (ability) => {
    if (readOnly) return;
    updateSheet({
      savingThrows: { ...sheet.savingThrows, [ability]: !sheet.savingThrows[ability] }
    });
  };

  const addListItem = (listName, item = "") => {
    if (readOnly) return;
    updateSheet({
      [listName]: [...(sheet[listName] || []), item]
    });
  };

  const removeListItem = (listName, index) => {
    if (readOnly) return;
    const newList = [...(sheet[listName] || [])];
    newList.splice(index, 1);
    updateSheet({ [listName]: newList });
  };

  const updateListItem = (listName, index, value) => {
    if (readOnly) return;
    const newList = [...(sheet[listName] || [])];
    newList[index] = value;
    updateSheet({ [listName]: newList });
  };

  const addEquipmentItem = () => {
    if (readOnly) return;
    const newItem = { name: "", type: "", modifiers: {} };
    updateSheet({
      equipment: [...(sheet.equipment || []), newItem]
    });
  };

  const updateEquipmentItem = (index, updatedItem) => {
    if (readOnly) return;
    const newEquipment = [...(sheet.equipment || [])];
    newEquipment[index] = updatedItem;
    updateSheet({ equipment: newEquipment });
  };

  const removeEquipmentItem = (index) => {
    if (readOnly) return;
    const newEquipment = [...(sheet.equipment || [])];
    newEquipment.splice(index, 1);
    updateSheet({ equipment: newEquipment });
  };

  const updateProficiencyList = (category, items) => {
    updateSheet({
      proficiencies: { ...sheet.proficiencies, [category]: items }
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Basic Information */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Basic Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Class"
                select
                value={sheet.class || ""}
                onChange={(e) => updateSheet({ class: e.target.value })}
                sx={{ minWidth: 200 }}
                disabled={readOnly}
              >
                {CLASSES.map((cls) => (
                  <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Level"
                value={sheet.level || 1}
                onChange={(e) => updateSheet({ level: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 20 }}
                disabled={readOnly}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Race"
                select
                value={sheet.race || ""}
                onChange={(e) => updateSheet({ race: e.target.value })}
                sx={{ minWidth: 180 }}
                disabled={readOnly}
              >
                {RACES.map((race) => (
                  <MenuItem key={race} value={race}>{race}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Background/Origin"
                value={sheet.background || ""}
                onChange={(e) => updateSheet({ background: e.target.value })}
                disabled={readOnly}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Ability Scores */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Ability Scores</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {ABILITY_SCORES.map((ability) => {
              const score = sheet.stats?.[ability.id] || 10;
              const modifier = getModifier(score);
              return (
                <Grid item xs={6} sm={4} md={2} key={ability.id}>
                  <Paper sx={{ p: 2, textAlign: "center", bgcolor: "background.paper" }}>
                    <Typography variant="caption" color="text.secondary">
                      {ability.label}
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={score}
                      onChange={(e) => updateStat(ability.id, e.target.value)}
                      inputProps={{ min: 1, max: 30 }}
                      sx={{ my: 1 }}
                      disabled={readOnly}
                    />
                    <Typography variant="h6" color={modifier >= 0 ? "success.main" : "error.main"}>
                      {modifier >= 0 ? "+" : ""}{modifier}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Combat Stats */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Combat Stats</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" gutterBottom>Hit Points</Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Current"
                    value={sheet.hp?.current === 0 || sheet.hp?.current === null || sheet.hp?.current === undefined ? "" : sheet.hp.current}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      updateSheet({
                        hp: { ...sheet.hp, current: val ?? 0 }
                      });
                    }}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    disabled={readOnly}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max"
                    value={sheet.hp?.max === 0 || sheet.hp?.max === null || sheet.hp?.max === undefined ? "" : sheet.hp.max}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      updateSheet({
                        hp: { ...sheet.hp, max: val ?? 0 }
                      });
                    }}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    disabled={readOnly}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Temp"
                    value={sheet.hp?.temp === 0 || sheet.hp?.temp === null || sheet.hp?.temp === undefined ? "" : sheet.hp.temp}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : (isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value));
                      updateSheet({
                        hp: { ...sheet.hp, temp: val ?? 0 }
                      });
                    }}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    disabled={readOnly}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Box sx={{ height: "24px", mb: 1 }} /> {/* Match label height */}
              <TextField
                fullWidth
                type="number"
                label="Armor Class (AC)"
                value={sheet.ac || 10}
                onChange={(e) => updateSheet({ ac: parseInt(e.target.value) || 10 })}
                disabled={readOnly}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Box sx={{ height: "24px", mb: 1 }} /> {/* Match label height */}
              <TextField
                fullWidth
                type="number"
                label="Initiative"
                value={sheet.initiative || 0}
                onChange={(e) => updateSheet({ initiative: parseInt(e.target.value) || 0 })}
                disabled={readOnly}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Box sx={{ height: "24px", mb: 1 }} /> {/* Match label height */}
              <TextField
                fullWidth
                type="number"
                label="Speed (ft)"
                value={sheet.speed || 30}
                onChange={(e) => updateSheet({ speed: parseInt(e.target.value) || 30 })}
                disabled={readOnly}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Skills & Saving Throws */}
      {type === "player" && (
        <>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Skills</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {SKILLS.map((skill) => {
                  const abilityMod = getModifier(sheet.stats?.[skill.ability] || 10);
                  const isProficient = sheet.skills?.[skill.id] || false;
                  const modifier = isProficient ? abilityMod + Math.ceil((sheet.level || 1) / 4) + 1 : abilityMod;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={skill.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={`${skill.name} (${skill.ability.substring(0, 3).toUpperCase()})`}
                          color={isProficient ? "primary" : "default"}
                          onClick={() => toggleSkillProficiency(skill.id)}
                          sx={{ cursor: readOnly ? "default" : "pointer" }}
                          disabled={readOnly}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {modifier >= 0 ? "+" : ""}{modifier}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Saving Throws</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {ABILITY_SCORES.map((ability) => {
                  const abilityMod = getModifier(sheet.stats?.[ability.id] || 10);
                  const isProficient = sheet.savingThrows?.[ability.id] || false;
                  const modifier = isProficient ? abilityMod + Math.ceil((sheet.level || 1) / 4) + 1 : abilityMod;
                  return (
                    <Grid item xs={6} sm={4} md={2} key={ability.id}>
                      <Chip
                        label={`${ability.abbr}: ${modifier >= 0 ? "+" : ""}${modifier}`}
                        color={isProficient ? "primary" : "default"}
                        onClick={() => toggleSavingThrowProficiency(ability.id)}
                        sx={{ cursor: readOnly ? "default" : "pointer", width: "100%" }}
                        disabled={readOnly}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* Equipment */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Equipment & Inventory</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {(sheet.equipment || []).map((item, index) => {
              // Handle legacy string items - convert to object format
              const equipmentItem = typeof item === "string" 
                ? { name: item, type: "", modifiers: {} }
                : item;
              
              return (
                <EquipmentItemEditor
                  key={index}
                  item={equipmentItem}
                  onChange={(updatedItem) => updateEquipmentItem(index, updatedItem)}
                  onDelete={() => removeEquipmentItem(index)}
                  readOnly={readOnly}
                />
              );
            })}
            {!readOnly && (
              <Button
                startIcon={<AddIcon />}
                onClick={addEquipmentItem}
                variant="outlined"
                size="small"
              >
                Add Item
              </Button>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Features & Traits */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Features & Traits</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Features</Typography>
              {(sheet.features || []).map((feature, index) => (
                <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    value={feature}
                    onChange={(e) => updateListItem("features", index, e.target.value)}
                    placeholder="Feature description..."
                    disabled={readOnly}
                  />
                  {!readOnly && (
                    <IconButton color="error" onClick={() => removeListItem("features", index)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              {!readOnly && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addListItem("features")}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Add Feature
                </Button>
              )}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Personality (for players) */}
      {type === "player" && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Personality</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Personality Traits"
                  value={sheet.personality?.traits || ""}
                  onChange={(e) => updateSheet({
                    personality: { ...sheet.personality, traits: e.target.value }
                  })}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Ideals"
                  value={sheet.personality?.ideals || ""}
                  onChange={(e) => updateSheet({
                    personality: { ...sheet.personality, ideals: e.target.value }
                  })}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Bonds"
                  value={sheet.personality?.bonds || ""}
                  onChange={(e) => updateSheet({
                    personality: { ...sheet.personality, bonds: e.target.value }
                  })}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Flaws"
                  value={sheet.personality?.flaws || ""}
                  onChange={(e) => updateSheet({
                    personality: { ...sheet.personality, flaws: e.target.value }
                  })}
                  disabled={readOnly}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Backstory */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Backstory</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={sheet.backstory || ""}
            onChange={(e) => updateSheet({ backstory: e.target.value })}
            placeholder="Character backstory and history..."
            disabled={readOnly}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
