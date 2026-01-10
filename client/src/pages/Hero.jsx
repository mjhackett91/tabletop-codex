// client/src/pages/Hero.jsx - Landing/Hero page (public)
// Image already contains text: "WELCOME TO TABLE TOP CODEX" and "YOUR ULTIMATE TABLETOP GAMING ASSISTANT"
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Hero() {
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleEnterClick = () => {
    // Check if logged in, go to dashboard, otherwise login
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: "url(/hero-image.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        // Subtle dark overlay
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          transition: "background-color 0.5s ease",
        },
        // Gold glow on hover
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: "inset 0 0 0 0 rgba(192, 163, 110, 0)",
          transition: "box-shadow 0.5s ease",
          pointerEvents: "none",
        },
        "&:hover": {
          "&::before": {
            backgroundColor: "rgba(0, 0, 0, 0.1)",
          },
          "&::after": {
            boxShadow: "inset 0 0 200px 40px rgba(192, 163, 110, 0.4)",
          },
        },
      }}
    >
      {/* Clickable overlay for the main image area */}
      <Box
        onClick={handleEnterClick}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: "pointer",
          zIndex: 1,
        }}
      />

      {/* Content Container */}
      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        {/* Main Content Area - positioned to not overlap with image text */}
        <Box
          sx={{
            width: "100%",
            maxWidth: "600px",
            textAlign: "center",
            pointerEvents: "none", // Let clicks pass through to overlay
          }}
        >
          {/* Spacer to account for text on image (adjust based on your image) */}
          <Box sx={{ height: { xs: "40vh", md: "50vh" } }} />

          {/* Action Buttons - positioned below the image text */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            justifyContent="center"
            sx={{
              mt: 4,
              pointerEvents: "auto", // Make buttons clickable
            }}
          >
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              onClick={(e) => e.stopPropagation()}
              sx={{
                px: 5,
                py: 2,
                fontSize: "1.2rem",
                fontWeight: 700,
                letterSpacing: 1,
                bgcolor: "primary.main",
                color: "background.default",
                borderRadius: 2,
                textTransform: "uppercase",
                boxShadow: "0 4px 20px rgba(192, 163, 110, 0.3)",
                "&:hover": {
                  bgcolor: "primary.dark",
                  boxShadow: "0 6px 30px rgba(192, 163, 110, 0.6)",
                  transform: "translateY(-3px)",
                },
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              Login
            </Button>
            <Button
              component={Link}
              to="/register"
              variant="outlined"
              size="large"
              onClick={(e) => e.stopPropagation()}
              sx={{
                px: 5,
                py: 2,
                fontSize: "1.2rem",
                fontWeight: 700,
                letterSpacing: 1,
                borderColor: "primary.main",
                borderWidth: 3,
                color: "primary.main",
                borderRadius: 2,
                textTransform: "uppercase",
                backgroundColor: "rgba(192, 163, 110, 0.1)",
                backdropFilter: "blur(10px)",
                "&:hover": {
                  borderColor: "primary.dark",
                  borderWidth: 3,
                  backgroundColor: "rgba(192, 163, 110, 0.2)",
                  boxShadow: "0 6px 30px rgba(192, 163, 110, 0.5)",
                  transform: "translateY(-3px)",
                },
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              Get Started
            </Button>
          </Stack>

          {/* Optional: Subtle hint text */}
          <Typography
            variant="body2"
            sx={{
              mt: 4,
              color: "rgba(192, 163, 110, 0.7)",
              fontSize: "0.9rem",
              letterSpacing: 2,
              textTransform: "uppercase",
              pointerEvents: "auto",
              cursor: "pointer",
              "&:hover": {
                color: "primary.main",
              },
              transition: "color 0.3s ease",
            }}
            onClick={handleEnterClick}
          >
            Click anywhere to enter →
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
