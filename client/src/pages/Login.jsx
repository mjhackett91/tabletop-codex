import { useState } from "react";
import { Box, TextField, Button, Typography, Alert, Paper, Link } from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import apiClient from "../services/apiClient";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check if localStorage is available (iOS Safari private mode blocks it)
      if (typeof Storage === "undefined" || !window.localStorage) {
        setError("Local storage is not available. Please disable private browsing mode.");
        setLoading(false);
        return;
      }

      // Clear any existing invalid token before attempting login
      try {
        const oldToken = localStorage.getItem("token");
        if (oldToken) {
          console.log("[Login] Clearing old token before login attempt");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      // Trim whitespace from inputs (iOS autofill sometimes adds spaces)
      const trimmedData = {
        username: (formData.username || "").trim(),
        password: (formData.password || "").trim()
      };
      
      console.log("[Login] Attempting login for:", trimmedData.username);
      console.log("[Login] Password length:", trimmedData.password.length);
      console.log("[Login] Username length:", trimmedData.username.length);
      
      const response = await apiClient.post("/auth/login", trimmedData);
      console.log("[Login] Response received:", response ? "Success" : "Failed", response);
      
      // Verify response has required data
      if (!response || !response.token) {
        const errorMsg = "Login failed: Invalid response from server. Please try again.";
        console.error("[Login] Response missing token:", response);
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      console.log("[Login] Token received, length:", response.token?.length);

      try {
        // Store token with error handling
        console.log("[Login] Attempting to save token to localStorage...");
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        console.log("[Login] Token saved to localStorage");
        
        // Verify token was actually saved (iOS Safari sometimes silently fails)
        const savedToken = localStorage.getItem("token");
        console.log("[Login] Verifying saved token, exists:", !!savedToken, "length:", savedToken?.length);
        if (!savedToken || savedToken !== response.token) {
          const errorMsg = "Failed to save authentication token. Local storage may be disabled or in private browsing mode.";
          console.error("[Login] Token verification failed. Expected length:", response.token?.length, "Got length:", savedToken?.length);
          throw new Error(errorMsg);
        }
        
        console.log("[Login] Token verified successfully");
        // Small delay to ensure localStorage is persisted
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to dashboard
        console.log("[Login] Redirecting to dashboard...");
        navigate("/dashboard");
      } catch (storageError) {
        console.error("[Login] localStorage error:", storageError);
        setError(storageError.message || "Failed to save login credentials. Please check your browser settings or try disabling private browsing mode.");
        // Clear any partial data
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      // Show the actual error message from the server
      // Server returns "Invalid credentials" for wrong username/password
      if (err.message.includes("Invalid credentials")) {
        setError("Invalid username or password. Please check your credentials and try again.");
      } else if (err.message.includes("Network") || err.message.includes("fetch") || err.message.includes("Failed to fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else if (err.message.includes("Too many")) {
        setError("Too many login attempts. Please wait a few minutes and try again.");
      } else {
        // Show the actual error message from server
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: "100%" }}>
        <Typography variant="h4" color="primary.main" gutterBottom align="center">
          Login
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username or Email"
            margin="normal"
            variant="outlined"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) {
                setFormData({ ...formData, username: trimmed });
              }
            }}
            required
            autoFocus
            autoComplete="username"
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off"
            }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            variant="outlined"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            onBlur={(e) => {
              // Trim password on blur (but don't trim during typing to avoid issues)
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) {
                setFormData({ ...formData, password: trimmed });
              }
            }}
            required
            autoComplete="current-password"
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off"
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !formData.username || !formData.password}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
          <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 1 }}>
            <Link component={RouterLink} to="/forgot-password" color="primary">
              Forgot Password?
            </Link>
            <Link component={RouterLink} to="/register" color="primary">
              Don't have an account? Register
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}