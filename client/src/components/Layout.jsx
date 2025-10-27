import { AppBar, Toolbar, Typography, Container } from "@mui/material";

export default function Layout({ children }) {
  return (
    <>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: "primary.main" }}>
            Table Top Codex
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>{children}</Container>
    </>
  );
}