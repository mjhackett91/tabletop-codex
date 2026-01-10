// client/src/components/Layout.jsx - Main layout wrapper
import { Box, Container } from "@mui/material";
import { useLocation } from "react-router-dom";
import TopAppBar from "./TopAppBar";
import Breadcrumbs from "./Breadcrumbs";

export default function Layout({ children }) {
  const location = useLocation();
  
  // Public pages (no top bar, no breadcrumbs)
  const publicPages = ["/", "/login", "/register"];
  const isPublicPage = publicPages.includes(location.pathname);
  
  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* Show TopAppBar only for logged-in users on non-public pages */}
      {isLoggedIn && !isPublicPage && <TopAppBar />}
      
      {/* Main content */}
      <Box sx={{ flexGrow: 1, overflowX: "hidden", width: "100%" }}>
        {isPublicPage ? (
          // Full-width for hero page
          children
        ) : (
          // Container with breadcrumbs for app pages - responsive maxWidth
          <Container 
            maxWidth={false}
            sx={{ 
              py: { xs: 2, sm: 3 },
              px: { xs: 2, sm: 3, md: 4 },
              maxWidth: { xs: "100%", sm: "100%", md: "960px", lg: "1280px", xl: "1536px" },
              width: "100%"
            }}
          >
            <Breadcrumbs />
            {children}
          </Container>
        )}
      </Box>
    </Box>
  );
}