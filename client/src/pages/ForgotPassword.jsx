import { useState } from "react";
import { Box, TextField, Button, Typography, Alert, Paper, Link } from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import apiClient from "../services/apiClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [devInfo, setDevInfo] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevInfo(null);
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/forgot-password", { email });
      
      setSuccess(response.message || "If an account with that email exists, a password reset link has been sent.");
      
      // In development mode, show the reset token/URL
      if (response.dev) {
        setDevInfo(response.dev);
        console.log("Development mode: Password reset info:", response.dev);
      }
    } catch (err) {
      setError(err.message || "Failed to send password reset email. Please try again.");
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
      <Paper sx={{ p: 4, maxWidth: 500, width: "100%" }}>
        <Typography variant="h4" color="primary.main" gutterBottom align="center">
          Forgot Password
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Enter your email address and we'll send you instructions to reset your password.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Development mode: Show reset token/URL */}
        {devInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Development Mode - Reset Information:
            </Typography>
            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>Reset URL:</strong>{" "}
              <Link href={devInfo.resetUrl} target="_blank" rel="noopener noreferrer">
                {devInfo.resetUrl}
              </Link>
            </Typography>
            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>Token:</strong> <code style={{ fontSize: "0.8em", wordBreak: "break-all" }}>{devInfo.token}</code>
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Expires:</strong> {new Date(devInfo.expiresAt).toLocaleString()}
            </Typography>
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            margin="normal"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="your.email@example.com"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Send Reset Link"}
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
