import { Typography, Box, Chip, Button } from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";

export default function Home() {
  const [pingStatus, setPingStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchPing = async () => {
      try {
        const data = await apiClient.get("/ping");
        setPingStatus(data.ok);
      } catch (error) {
        console.error('Failed to ping server:', error);
        setPingStatus(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPing();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h3" color="primary.main">
          Welcome to the Codex
        </Typography>
        {user && (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {user.username}
            </Typography>
            <Button variant="outlined" size="small" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        )}
      </Box>
      
      <Typography variant="body1" gutterBottom>
        Your dark-fantasy campaign assistant awaits.
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          System Status:
        </Typography>
        {isLoading ? (
          <Chip label="Checking connection..." color="default" />
        ) : pingStatus ? (
          <Chip label="✓ Backend Connected" color="success" />
        ) : (
          <Chip label="✗ Backend Disconnected" color="error" />
        )}
      </Box>

      {!user && (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Please login or register to manage your campaigns
          </Typography>
        </Box>
      )}
    </Box>
  );
}