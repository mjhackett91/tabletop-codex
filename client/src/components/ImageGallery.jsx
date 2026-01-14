import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Grid,
  Card,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  Image as ImageIcon
} from "@mui/icons-material";
import { apiClient } from "../services/apiClient";

const ImageGallery = ({ campaignId, entityType, entityId, onUpdate }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [imageUrls, setImageUrls] = useState({}); // Cache of blob URLs
  const imageUrlsRef = useRef({}); // Keep ref for cleanup
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);

  useEffect(() => {
    if (campaignId && entityType && entityId) {
      fetchImages();
    }
  }, [campaignId, entityType, entityId]);

  // Load image URLs when images change
  useEffect(() => {
    if (!images.length || !campaignId) return;

    const loadImageUrls = async () => {
      const newUrls = {};
      const loadPromises = images.map(async (image) => {
        // Skip if already loaded (check ref for current state)
        if (imageUrlsRef.current[image.id]) {
          newUrls[image.id] = imageUrlsRef.current[image.id];
          return;
        }

        try {
          // Use relative endpoint - apiClient automatically prepends /api
          const endpoint = `/campaigns/${campaignId}/images/${image.id}/file`;
          
          console.log("[ImageGallery] Fetching image:", endpoint);
          const blob = await apiClient.getBlob(endpoint);
          
          console.log("[ImageGallery] Blob received:", {
            id: image.id,
            size: blob.size,
            type: blob.type,
            expectedType: image.mime_type,
            isEmpty: blob.size === 0
          });
          
          if (blob.size === 0) {
            console.error("[ImageGallery] Blob is empty for image", image.id);
            return;
          }
          
          // Verify it's actually an image blob
          if (!blob.type || !blob.type.startsWith('image/')) {
            console.error("[ImageGallery] Blob is not an image type:", blob.type);
            return;
          }
          
          const objectUrl = URL.createObjectURL(blob);
          console.log("[ImageGallery] Created blob URL for image", image.id, ":", objectUrl);
          newUrls[image.id] = objectUrl;
        } catch (error) {
          console.error("[ImageGallery] Error loading image:", image.id, error);
        }
      });

      await Promise.all(loadPromises);
      
      if (Object.keys(newUrls).length > 0) {
        console.log("[ImageGallery] Updating image URLs:", Object.keys(newUrls));
        setImageUrls(prev => {
          const updated = { ...prev, ...newUrls };
          imageUrlsRef.current = updated; // Update ref
          return updated;
        });
      }
    };

    loadImageUrls();
  }, [images, campaignId]); // Don't include imageUrls to avoid infinite loops

  const fetchImages = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/campaigns/${campaignId}/images/${entityType}/${entityId}`);
      setImages(data || []);
    } catch (error) {
      console.error("Failed to fetch images:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to load images",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      // Clean up all object URLs when component unmounts
      Object.values(imageUrlsRef.current).forEach(url => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSnackbar({
        open: true,
        message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
        severity: "error"
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "File size exceeds 10MB limit.",
        severity: "error"
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploading(true);
      await apiClient.post(`/campaigns/${campaignId}/images/${entityType}/${entityId}`, formData);
      setSnackbar({
        open: true,
        message: "Image uploaded successfully",
        severity: "success"
      });
      fetchImages();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to upload image:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to upload image",
        severity: "error"
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteClick = (imageId) => {
    setImageToDelete(imageId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return;

    try {
      await apiClient.delete(`/campaigns/${campaignId}/images/${imageToDelete}`);
      await fetchImages();
      if (onUpdate) onUpdate();
      setSnackbar({
        open: true,
        message: "Image deleted successfully",
        severity: "success"
      });
      setDeleteConfirmOpen(false);
      setImageToDelete(null);
    } catch (error) {
      console.error("Failed to delete image:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete image",
        severity: "error"
      });
      setDeleteConfirmOpen(false);
      setImageToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setImageToDelete(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Images</Typography>
        <input
          accept="image/*"
          style={{ display: "none" }}
          id="image-upload-input"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="image-upload-input">
          <Button
            variant="outlined"
            component="span"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
        </label>
      </Box>

      {images.length === 0 ? (
        <Box
          sx={{
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
            p: 4,
            textAlign: "center"
          }}
        >
          <ImageIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography color="text.secondary" gutterBottom>
            No images uploaded yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Upload Image" to add images to this entry
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {images.map((image) => (
            <Grid item xs={6} sm={4} md={3} key={image.id}>
              <Card
                sx={{
                  position: "relative",
                  cursor: "pointer",
                  "&:hover .delete-button": {
                    opacity: 1
                  }
                }}
                onClick={() => setPreviewImage(image)}
              >
                {imageUrls[image.id] ? (
                  <CardMedia
                    component="img"
                    image={imageUrls[image.id]}
                    alt={image.file_name}
                    sx={{
                      height: 200,
                      objectFit: "cover"
                    }}
                    onError={(e) => {
                      console.error("[ImageGallery] Image failed to load:", image.id, imageUrls[image.id]);
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "action.hover"
                    }}
                  >
                    <CircularProgress size={40} />
                  </Box>
                )}
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(image.id);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "rgba(0, 0, 0, 0.5)",
                    color: "white",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    "&:hover": {
                      bgcolor: "rgba(0, 0, 0, 0.7)"
                    }
                  }}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Card>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {image.file_name}
              </Typography>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        fullWidth
      >
        {previewImage && (
          <>
            <DialogTitle>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography>{previewImage.file_name}</Typography>
                <IconButton onClick={() => setPreviewImage(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: "center" }}>
                {imageUrls[previewImage.id] ? (
                  <img
                    src={imageUrls[previewImage.id]}
                    alt={previewImage.file_name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain"
                    }}
                    onError={(e) => {
                      console.error("[ImageGallery] Preview image failed to load:", previewImage.id);
                    }}
                  />
                ) : (
                  <Box sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading image...
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {(previewImage.file_size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Image?
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ImageGallery;
