// client/src/components/BackButton.jsx - Back button component for navigation
import { useNavigate, useLocation } from "react-router-dom";
import { Button, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function BackButton({ label = "Back", variant = "text", sx = {} }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Go back one level in the path
    const pathParts = location.pathname.split("/").filter(Boolean);
    
    // If we're at a campaign section (e.g., /campaigns/3/characters)
    // Go back to dashboard (campaign overview doesn't exist yet)
    if (pathParts.length >= 3 && pathParts[0] === "campaigns") {
      navigate("/dashboard");
    } else if (pathParts.length > 1) {
      // Remove last segment for other paths
      pathParts.pop();
      navigate("/" + pathParts.join("/"));
    } else {
      // Default to dashboard
      navigate("/dashboard");
    }
  };

  if (variant === "icon") {
    return (
      <IconButton onClick={handleBack} sx={sx}>
        <ArrowBackIcon />
      </IconButton>
    );
  }

  return (
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={handleBack}
      variant={variant}
      sx={sx}
    >
      {label}
    </Button>
  );
}
