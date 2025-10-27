import { Typography, Box } from "@mui/material";

export default function Home() {
  return (
    <Box>
      <Typography variant="h3" color="primary.main" gutterBottom>
        Welcome to the Codex
      </Typography>
      <Typography variant="body1">
        Your dark-fantasy campaign assistant awaits.
      </Typography>
    </Box>
  );
}