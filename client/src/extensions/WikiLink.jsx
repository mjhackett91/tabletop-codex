// client/src/extensions/WikiLink.js
// TipTap extension for wiki-style links using [[Entity Name]] syntax
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";

// Component for the suggestion dropdown
const WikiLinkSuggestionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command({ 
        id: item.id, 
        label: item.label, 
        type: item.type,
        characterId: item.characterId || null // Include characterId for equipment links
      });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <Paper
      elevation={3}
      sx={{
        maxHeight: 300,
        overflow: "auto",
        minWidth: 250,
        maxWidth: 400,
      }}
    >
      <List dense>
        {props.items.length ? (
          props.items.map((item, index) => (
            <ListItem key={`${item.type}-${item.id}`} disablePadding>
              <ListItemButton
                selected={index === selectedIndex}
                onClick={() => selectItem(index)}
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {item.typeLabel}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText
              primary="No matches found"
              secondary="Type to search for entities"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
});

WikiLinkSuggestionList.displayName = "WikiLinkSuggestionList";

const WikiLink = Node.create({
  name: "wikiLink",

  addOptions() {
    return {
      HTMLAttributes: {},
      getEntities: () => [], // Will be set when creating editor
      onClick: null, // Will be set when creating editor
    };
  },

  addProseMirrorPlugins() {
    // Capture options in closure
    const getEntities = this.options.getEntities;
    const onClick = this.options.onClick;

    return [
      Suggestion({
        editor: this.editor,
        char: "[",
        allowSpaces: true,
        allowedPrefixes: [" ", "\n"],
        startOfLine: false,
        command: ({ editor, range, props }) => {
          const { id, label, type, characterId } = props;
          // Replace the "[[" trigger with the wiki link
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: {
                  id,
                  label,
                  type,
                  characterId: characterId || null,
                },
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();
        },
        items: ({ query }) => {
          console.log("[WikiLink] items called with query:", query, "Full range:", arguments[0]);
          // Check if the previous character is also "[" to detect "[["
          // The query will be empty or start with "[" if we just typed the second "["
          // We need to check the editor content before the trigger
          try {
            const { from } = arguments[0]?.range || {};
            if (from !== undefined && from > 0) {
              const textBefore = this.editor.state.doc.textBetween(Math.max(0, from - 2), from);
              console.log("[WikiLink] Text before trigger:", textBefore);
              // Only show suggestions if we have "[["
              if (!textBefore.endsWith("[")) {
                console.log("[WikiLink] Not a wiki link trigger (need [[), returning empty");
                return [];
              }
            }
          } catch (e) {
            console.warn("[WikiLink] Error checking previous character:", e);
          }
          
          // Use captured function from closure
          if (typeof getEntities === "function") {
            // For "[[", the query will be "[" after the first bracket, so we need to handle that
            // If query starts with "[", remove it and treat as empty query
            const cleanQuery = query && query.startsWith("[") ? query.slice(1) : query;
            const results = getEntities(cleanQuery);
            console.log("[WikiLink] getEntities returned:", results.length, "results for query:", cleanQuery);
            return results;
          }
          console.warn("[WikiLink] getEntities is not a function!");
          return [];
        },
        render: () => {
          let component;
          let popup;

          return {
            onStart: (props) => {
              component = new ReactRenderer(WikiLinkSuggestionList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props) {
              console.log("[WikiLink] onUpdate called with props:", props);
              if (component) {
                component.updateProps(props);
              }

              if (!props.clientRect || !popup || !popup[0]) {
                console.warn("[WikiLink] Missing clientRect or popup in onUpdate");
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                if (popup && popup[0]) {
                  popup[0].hide();
                }
                return true;
              }

              if (component && component.ref) {
                return component.ref.onKeyDown(props);
              }
              return false;
            },

            onExit() {
              if (popup && popup[0]) {
                popup[0].destroy();
              }
              if (component) {
                component.destroy();
              }
            },
          };
        },
      }),
    ];
  },

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            "data-entity-id": attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }
          return {
            "data-entity-label": attributes.label,
          };
        },
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => {
          if (!attributes.type) {
            return {};
          }
          return {
            "data-entity-type": attributes.type,
          };
        },
      },
      characterId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-character-id"),
        renderHTML: (attributes) => {
          if (!attributes.characterId) {
            return {};
          }
          return {
            "data-character-id": attributes.characterId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wiki-link"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { id, label, type } = HTMLAttributes;
    return [
      "span",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          "data-type": "wiki-link",
          class: "wiki-link",
          style: "color: #ffd700; cursor: pointer; text-decoration: underline;",
        }
      ),
      `[[${label || "Link"}]]`,
    ];
  },

  addNodeView() {
    const onClick = this.options.onClick;
    
    return ({ node, HTMLAttributes, getPos }) => {
      const { id, label, type, characterId } = node.attrs;
      const span = document.createElement("span");
      span.className = "wiki-link";
      span.setAttribute("data-entity-id", id);
      span.setAttribute("data-entity-label", label);
      span.setAttribute("data-entity-type", type);
      if (characterId) {
        span.setAttribute("data-character-id", characterId);
      }
      span.style.cssText = "color: #ffd700; cursor: pointer; text-decoration: underline;";
      span.textContent = `[[${label || "Link"}]]`;

      // Add click handler to navigate to entity
      if (onClick && id && type) {
        span.addEventListener("click", (e) => {
          e.preventDefault();
          onClick({ id, type, characterId });
        });
      }

      return {
        dom: span,
      };
    };
  },

});

export default WikiLink;
