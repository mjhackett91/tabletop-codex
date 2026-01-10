import { useState } from "react";
import { Box, TextField, Button, Typography, Alert, Paper, Link } from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import apiClient from "../services/apiClient";

export default function Register() {
  const [formData, setFormData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Strengthen password requirements to match backend
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    // Check for basic password complexity (at least one letter and one number)
    if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError("Password must contain at least one letter and one number");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Invalid email format");
      return;
    }
    
    // Sanitize username (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(formData.username)) {
      setError("Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      console.log("Registration response:", response);
      
      // Store token
      if (response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        console.log("Token stored, redirecting to dashboard...");
        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        throw new Error("No token received from server");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed");
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
          Register
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            variant="outlined"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            autoFocus
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            variant="outlined"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            helperText="At least 8 characters, must contain letters and numbers"
          />
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            margin="normal"
            variant="outlined"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !formData.username || !formData.email || !formData.password || !formData.confirmPassword}
          >
            {loading ? "Registering..." : "Register"}
          </Button>
          <Box sx={{ textAlign: "center" }}>
            <Link component={RouterLink} to="/login" color="primary">
              Already have an account? Login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}