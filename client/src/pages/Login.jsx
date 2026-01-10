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
      const response = await apiClient.post("/auth/login", formData);
      
      // Store token
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
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
            required
            autoFocus
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