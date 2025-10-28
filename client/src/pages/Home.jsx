import { Typography, Box, Chip } from "@mui/material";
import { useState, useEffect } from "react";

export default function Home() {
  const [pingStatus, setPingStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPing = async () => {
      try {
        const response = await fetch('/api/ping');
        const data = await response.json();
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

  return (
    <Box>
      <Typography variant="h3" color="primary.main" gutterBottom>
        Welcome to the Codex
      </Typography>
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
    </Box>
  );
}