import { AppBar, Toolbar, Typography, Container, Button, Box } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: "primary.main" }}>
            Table Top Codex
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              component={Link}
              to="/"
              color="inherit"
              sx={{ 
                color: location.pathname === "/" ? "primary.main" : "text.secondary",
                fontWeight: location.pathname === "/" ? 600 : 400
              }}
            >
              Home
            </Button>
            <Button
              component={Link}
              to="/campaigns"
              color="inherit"
              sx={{ 
                color: location.pathname === "/campaigns" ? "primary.main" : "text.secondary",
                fontWeight: location.pathname === "/campaigns" ? 600 : 400
              }}
            >
              Campaigns
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>{children}</Container>
    </>
  );
}