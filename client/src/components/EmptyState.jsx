// client/src/components/EmptyState.jsx - Reusable empty state component
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  suggestions = [],
  actionLabel,
  onAction,
  color = "primary"
}) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        px: 3,
        background: "linear-gradient(135deg, rgba(26, 26, 26, 0.5) 0%, rgba(30, 30, 30, 0.7) 100%)",
        borderRadius: 3,
        border: "1px solid rgba(192, 163, 110, 0.2)",
      }}
    >
      {Icon && (
        <Box
          sx={{
            display: "inline-flex",
            p: 3,
            borderRadius: "50%",
            background: `rgba(192, 163, 110, 0.1)`,
            border: "2px solid rgba(192, 163, 110, 0.2)",
            mb: 3,
          }}
        >
          <Icon sx={{ fontSize: 64, color: `${color}.main` }} />
        </Box>
      )}
      
      <Typography 
        variant="h5" 
        color="text.primary" 
        gutterBottom
        sx={{ 
          fontWeight: 600,
          mb: 1.5
        }}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ 
          mb: 3, 
          maxWidth: "500px", 
          mx: "auto",
          lineHeight: 1.7
        }}
      >
        {description}
      </Typography>

      {suggestions.length > 0 && (
        <Box
          sx={{
            mb: 3,
            textAlign: "left",
            maxWidth: "600px",
            mx: "auto",
            p: 2,
            borderRadius: 2,
            background: "rgba(192, 163, 110, 0.05)",
            border: "1px solid rgba(192, 163, 110, 0.1)",
          }}
        >
          <Typography 
            variant="subtitle2" 
            color="primary.main" 
            sx={{ mb: 1.5, fontWeight: 600 }}
          >
            Quick Tips:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {suggestions.map((suggestion, index) => (
              <Typography 
                key={index}
                component="li" 
                variant="body2" 
                color="text.secondary" 
                sx={{ mb: 1, lineHeight: 1.6 }}
              >
                {suggestion}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {onAction && actionLabel && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAction}
          size="large"
          color={color}
          sx={{
            px: 4,
            py: 1.5,
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(192, 163, 110, 0.3)",
            "&:hover": {
              boxShadow: "0 6px 16px rgba(192, 163, 110, 0.4)",
              transform: "translateY(-2px)",
            },
            transition: "all 0.2s ease",
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
