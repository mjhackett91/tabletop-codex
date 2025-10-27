import { Typography, Box } from "@mui/material";

export default function NotFound() {
  return (
    <Box>
      <Typography variant="h4" color="secondary.main" gutterBottom>
        404
      </Typography>
      <Typography variant="body1">The page you seek is lost to the void.</Typography>
    </Box>
  );
}