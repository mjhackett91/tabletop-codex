// client/src/components/CharacterSheetViewer.jsx - Read-only character sheet viewer
import { Dialog, DialogTitle, DialogContent, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CharacterSheetEditor from "./CharacterSheetEditor";

export default function CharacterSheetViewer({ open, onClose, characterSheet, characterName }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: "90vh",
          height: "90vh"
        }
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          {characterName ? `${characterName}'s Character Sheet` : "Character Sheet"}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          overflow: "auto",
          p: 3
        }}
      >
        <CharacterSheetEditor
          value={characterSheet}
          onChange={() => {}} // No-op for read-only
          readOnly={true}
        />
      </DialogContent>
    </Dialog>
  );
}
