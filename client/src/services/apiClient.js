// client/src/services/apiClient.js
/**
 * API Client for Table Top Codex
 * Uses VITE_API_URL environment variable for base URL (for production/Docker)
 * In dev mode, uses relative URLs that go through Vite proxy
 */
const isDev = import.meta.env.DEV;
const baseURL = isDev ? "" : (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

/**
 * Base fetch wrapper with error handling
 */
async function apiRequest(endpoint, options = {}) {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // In dev, use relative URLs (Vite proxy handles /api)
  // In prod, use full baseURL
  const url = endpoint.startsWith("http") 
    ? endpoint 
    : isDev 
      ? cleanEndpoint 
      : `${baseURL}${cleanEndpoint}`;
  
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || `HTTP ${response.status}: ${response.statusText}`;
      
      // Enhance error messages for common auth errors
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status === 403) {
        throw new Error("Access denied. Invalid or expired token.");
      } else {
        throw new Error(errorMessage);
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    // Re-throw the error so components can handle it
    throw error;
  }
}

export const apiClient = {
  get: (endpoint) => apiRequest(endpoint, { method: "GET" }),
  post: (endpoint, data) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(data) }),
  put: (endpoint, data) => apiRequest(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" }),
};

export default apiClient;
