import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#c0a36e" },      // gold accent
    secondary: { main: "#6b5b95" },    // muted violet
    background: {
      default: "#0f0f0f",
      paper: "#1a1a1a",
    },
    text: {
      primary: "#f5f5f5",
      secondary: "#bdbdbd",
    },
  },
  typography: {
    fontFamily: "'Cinzel', 'serif'",
    h1: { fontWeight: 700, letterSpacing: 1 },
    h2: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
  },
  shape: { borderRadius: 8 },
});

export default theme;