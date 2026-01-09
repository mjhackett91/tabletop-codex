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
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Show TopAppBar only for logged-in users on non-public pages */}
      {isLoggedIn && !isPublicPage && <TopAppBar />}
      
      {/* Main content */}
      <Box sx={{ flexGrow: 1 }}>
        {isPublicPage ? (
          // Full-width for hero page
          children
        ) : (
          // Container with breadcrumbs for app pages
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Breadcrumbs />
            {children}
          </Container>
        )}
      </Box>
    </Box>
  );
}