// client/src/components/RichTextEditor.jsx
import { useEffect } from "react";
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

const RichTextEditor = ({ value, onChange, placeholder = "Enter text..." }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    onUpdate: ({ editor }) => {
      if (onChange) {
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

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: "divider",
        "& .tiptap": {
          minHeight: 200,
          padding: 2,
          outline: "none",
          color: "text.primary",
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
        },
      }}
    >
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
      <EditorContent editor={editor} />
    </Paper>
  );
};

export default RichTextEditor;
