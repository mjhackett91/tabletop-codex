import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Alert, Paper, Link } from "@mui/material";
import { useNavigate, Link as RouterLink, useSearchParams } from "react-router-dom";
import apiClient from "../services/apiClient";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password requirements (matching backend)
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError("Password must contain at least one letter and one number");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/api/auth/reset-password", {
        token,
        password: formData.password
      });
      
      setSuccess(response.message || "Password reset successfully!");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password. The token may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 500, width: "100%" }}>
          <Typography variant="h4" color="primary.main" gutterBottom align="center">
            Invalid Reset Link
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || "No reset token provided. Please request a new password reset."}
          </Alert>
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Link component={RouterLink} to="/forgot-password" color="primary">
              Request New Reset Link
            </Link>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 500, width: "100%" }}>
        <Typography variant="h4" color="primary.main" gutterBottom align="center">
          Reset Password
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Enter your new password below.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Redirecting to login...
            </Typography>
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            margin="normal"
            variant="outlined"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            autoFocus
            helperText="At least 8 characters, must contain letters and numbers"
          />
          <TextField
            fullWidth
            label="Confirm New Password"
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
            disabled={loading || !formData.password || !formData.confirmPassword || success}
          >
            {loading ? "Resetting..." : success ? "Redirecting..." : "Reset Password"}
          </Button>
          <Box sx={{ textAlign: "center" }}>
            <Link component={RouterLink} to="/login" color="primary">
              Back to Login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
