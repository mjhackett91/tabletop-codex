// client/src/components/RichTextEditor.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Box, IconButton, Paper } from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Undo,
  Redo,
} from "@mui/icons-material";
import WikiLink from "../extensions/WikiLink";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Enter text...", 
  readOnly = false,
  campaignId = null // Optional: if provided, enables wiki linking
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const effectiveCampaignId = campaignId || params.id;

  // Fetch entities for wiki linking
  const [entities, setEntities] = useState({
    characters: [],
    locations: [],
    factions: [],
    world_info: [],
    quests: [],
    equipment: [] // Equipment items from character sheets
  });

  useEffect(() => {
    if (effectiveCampaignId && !readOnly) {
      // Fetch entities for autocomplete
      const fetchEntities = async () => {
        try {
          const [playerChars, npcs, antagonists, locations, factions, worldInfo, quests] = await Promise.all([
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/characters?type=player`).catch(() => []),
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/characters?type=npc`).catch(() => []),
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/characters?type=antagonist`).catch(() => []),
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/locations`).catch(() => []),
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/factions`).catch(() => []),
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/world-info`).catch(() => []),
            apiClient.get(`/api/campaigns/${effectiveCampaignId}/quests`).catch(() => [])
          ]);

          const allCharacters = [
            ...(playerChars || []),
            ...(npcs || []),
            ...(antagonists || [])
          ];

          // Extract equipment from all character sheets
          const equipmentMap = new Map(); // Use Map to deduplicate by name
          allCharacters.forEach(char => {
            try {
              const sheet = typeof char.character_sheet === 'string' 
                ? JSON.parse(char.character_sheet) 
                : char.character_sheet;
              
              if (sheet && Array.isArray(sheet.equipment)) {
                sheet.equipment.forEach(item => {
                  const itemName = typeof item === 'string' ? item : item?.name;
                  if (itemName && itemName.trim() && !equipmentMap.has(itemName.trim())) {
                    equipmentMap.set(itemName.trim(), {
                      name: itemName.trim(),
                      characterId: char.id,
                      characterName: char.name
                    });
                  }
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          });

          const entitiesData = {
            characters: allCharacters,
            locations: locations || [],
            factions: factions || [],
            world_info: worldInfo || [],
            quests: quests || [],
            equipment: Array.from(equipmentMap.values())
          };
          
          console.log("[RichTextEditor] Entities fetched for wiki linking:", {
            characters: entitiesData.characters.length,
            locations: entitiesData.locations.length,
            factions: entitiesData.factions.length,
            world_info: entitiesData.world_info.length,
            quests: entitiesData.quests.length,
            equipment: entitiesData.equipment.length,
            sampleCharacter: entitiesData.characters[0]?.name || "none",
            sampleEquipment: entitiesData.equipment[0]?.name || "none"
          });
          
          setEntities(entitiesData);
        } catch (error) {
          console.error("Failed to fetch entities for wiki linking:", error);
        }
      };

      fetchEntities();
    }
  }, [effectiveCampaignId, readOnly]);

  // Use ref to always access current entities (avoid stale closure)
  const entitiesRef = useRef(entities);
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  // Create entity search function for autocomplete
  const getEntities = useMemo(() => {
    return (query) => {
      // Always use current entities from ref
      const currentEntities = entitiesRef.current;
      const searchTerm = query ? query.toLowerCase().trim() : "";
      const results = [];

      console.log("[WikiLink getEntities] Query received:", query, "Search term:", searchTerm);
      console.log("[WikiLink getEntities] Entities available:", {
        characters: currentEntities.characters.length,
        locations: currentEntities.locations.length,
        factions: currentEntities.factions.length,
        world_info: currentEntities.world_info.length,
        quests: currentEntities.quests.length,
        equipment: currentEntities.equipment.length
      });

      // Only search entity names/titles, not descriptions
      // If query is empty, show first 5 of each type
      // Otherwise, filter by search term (prefer exact/starts-with matches)
      const shouldShowAll = !searchTerm || searchTerm.length === 0;
      
      console.log("[WikiLink getEntities] Should show all:", shouldShowAll);

      // Helper to check if name matches (prefer exact/starts-with)
      const nameMatches = (name, term) => {
        if (!name || !term) return shouldShowAll;
        const lowerName = name.toLowerCase();
        const lowerTerm = term.toLowerCase();
        return lowerName === lowerTerm || lowerName.startsWith(lowerTerm);
      };

      // Search characters (by name only)
      currentEntities.characters.forEach(char => {
        if (char.name && (shouldShowAll || nameMatches(char.name, searchTerm))) {
          results.push({
            id: char.id,
            label: char.name,
            type: "character",
            typeLabel: `Character (${char.type || "unknown"})`,
            matchScore: char.name.toLowerCase() === searchTerm ? 0 : 1 // Exact match gets priority
          });
        }
      });

      // Search locations (by name only)
      currentEntities.locations.forEach(loc => {
        if (loc.name && (shouldShowAll || nameMatches(loc.name, searchTerm))) {
          results.push({
            id: loc.id,
            label: loc.name,
            type: "location",
            typeLabel: "Location",
            matchScore: loc.name.toLowerCase() === searchTerm ? 0 : 1
          });
        }
      });

      // Search factions (by name only)
      currentEntities.factions.forEach(faction => {
        if (faction.name && (shouldShowAll || nameMatches(faction.name, searchTerm))) {
          results.push({
            id: faction.id,
            label: faction.name,
            type: "faction",
            typeLabel: "Faction",
            matchScore: faction.name.toLowerCase() === searchTerm ? 0 : 1
          });
        }
      });

      // Search world info (by title only)
      currentEntities.world_info.forEach(info => {
        if (info.title && (shouldShowAll || nameMatches(info.title, searchTerm))) {
          results.push({
            id: info.id,
            label: info.title,
            type: "world_info",
            typeLabel: "World Info",
            matchScore: info.title.toLowerCase() === searchTerm ? 0 : 1
          });
        }
      });

      // Search quests (by title only)
      currentEntities.quests.forEach(quest => {
        if (quest.title && (shouldShowAll || nameMatches(quest.title, searchTerm))) {
          results.push({
            id: quest.id,
            label: quest.title,
            type: "quest",
            typeLabel: "Quest",
            matchScore: quest.title.toLowerCase() === searchTerm ? 0 : 1
          });
        }
      });

      // Search equipment (by name only)
      currentEntities.equipment.forEach(item => {
        if (item.name && (shouldShowAll || nameMatches(item.name, searchTerm))) {
          results.push({
            id: `equipment-${item.characterId}-${item.name}`, // Unique ID for equipment
            label: item.name,
            type: "equipment",
            typeLabel: `Equipment (${item.characterName})`,
            matchScore: item.name.toLowerCase() === searchTerm ? 0 : 1,
            characterId: item.characterId // Store for navigation
          });
        }
      });

      // Sort by relevance: exact matches first, then starts-with, then by type priority
      const sorted = results.sort((a, b) => {
        // First: exact matches
        if (a.matchScore !== b.matchScore) {
          return a.matchScore - b.matchScore;
        }
        // Second: type priority (characters, locations, factions, equipment, world_info, quests)
        const typeOrder = { 
          character: 0, 
          location: 1, 
          faction: 2, 
          equipment: 3,
          world_info: 4, 
          quest: 5 
        };
        const typeDiff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
        if (typeDiff !== 0) return typeDiff;
        // Third: shorter names first (more specific)
        return a.label.length - b.label.length;
      });

      const limited = sorted.slice(0, 20); // Show up to 20 results
      return limited;
    };
  }, []); // Empty deps - we use ref to access current entities

  // Handle wiki link clicks
  const handleWikiLinkClick = ({ id, type, characterId }) => {
    if (!effectiveCampaignId) return;

    console.log("[RichTextEditor] Wiki link clicked:", { id, type, characterId, effectiveCampaignId });

    // Map entity types to routes
    const routeMap = {
      character: `/campaigns/${effectiveCampaignId}/characters`,
      location: `/campaigns/${effectiveCampaignId}/locations`,
      faction: `/campaigns/${effectiveCampaignId}/factions`,
      world_info: `/campaigns/${effectiveCampaignId}/world-info`,
      quest: `/campaigns/${effectiveCampaignId}/quests`,
      equipment: characterId 
        ? `/campaigns/${effectiveCampaignId}/characters` // Navigate to character's equipment
        : `/campaigns/${effectiveCampaignId}/characters`
    };

    const baseRoute = routeMap[type];
    if (baseRoute) {
      const navigationState = { 
        openEntityId: id, 
        entityType: type,
        characterId: characterId // For equipment links
      };
      console.log("[RichTextEditor] Navigating to:", baseRoute, "with state:", navigationState);
      // Navigate to the page with entity ID in state so it can auto-open the dialog
      navigate(baseRoute, { state: navigationState });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      WikiLink.configure({
        getEntities: getEntities,
        onClick: handleWikiLinkClick,
      }),
    ],
    content: value || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange && !readOnly) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none",
      },
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  // Update editor editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: "divider",
        opacity: readOnly ? 0.7 : 1,
        pointerEvents: readOnly ? "none" : "auto",
        "& .tiptap": {
          minHeight: 200,
          padding: 2,
          outline: "none",
          color: "text.primary",
          cursor: readOnly ? "default" : "text",
          "& p.is-editor-empty:first-child::before": {
            content: `"${placeholder}"`,
            float: "left",
            color: "text.disabled",
            pointerEvents: "none",
            height: 0,
          },
          "& p": {
            margin: "0.5rem 0",
          },
          "& ul, & ol": {
            paddingLeft: "1.5rem",
            margin: "0.5rem 0",
          },
          "& strong": {
            fontWeight: 600,
          },
          "& em": {
            fontStyle: "italic",
          },
          "& code": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            padding: "0.2rem 0.4rem",
            borderRadius: "4px",
            fontFamily: "monospace",
          },
          "& blockquote": {
            borderLeft: "3px solid",
            borderColor: "primary.main",
            paddingLeft: "1rem",
            margin: "0.5rem 0",
            fontStyle: "italic",
          },
          "& .wiki-link": {
            color: "#ffd700",
            cursor: "pointer",
            textDecoration: "underline",
            "&:hover": {
              color: "#ffed4e",
              textDecoration: "underline",
            },
          },
        },
      }}
    >
      {!readOnly && (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            p: 0.5,
            borderBottom: 1,
            borderColor: "divider",
            flexWrap: "wrap",
          }}
        >
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive("bold") ? "primary" : "default"}
            disabled={!editor.can().chain().focus().toggleBold().run()}
          >
            <FormatBold fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive("italic") ? "primary" : "default"}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
          >
            <FormatItalic fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive("bulletList") ? "primary" : "default"}
          >
            <FormatListBulleted fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive("orderedList") ? "primary" : "default"}
          >
            <FormatListNumbered fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            color={editor.isActive("blockquote") ? "primary" : "default"}
          >
            <FormatQuote fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCode().run()}
            color={editor.isActive("code") ? "primary" : "default"}
          >
            <Code fontSize="small" />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
          >
            <Undo fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
          >
            <Redo fontSize="small" />
          </IconButton>
        </Box>
      )}
      <EditorContent editor={editor} />
    </Paper>
  );
};

export default RichTextEditor;
