// client/src/services/apiClient.js
/**
 * API Client for Table Top Codex
 * Uses VITE_API_URL environment variable for base URL (for production/Docker)
 * In dev mode, uses relative URLs that go through Vite proxy
 */
const isDev = import.meta.env.DEV;
const baseURL = isDev ? "" : (import.meta.env.VITE_API_URL || "");

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
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText };
      }
      
      const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
      const fullError = errorData.details ? `${errorMessage} (${errorData.details})` : errorMessage;
      
      // Enhance error messages for common auth errors
      if (response.status === 401) {
        throw new Error("Authentication required. Please login.");
      } else if (response.status === 403) {
        // Use the actual error message from the server, don't override it
        throw new Error(errorMessage || "Access denied");
      } else {
        throw new Error(fullError);
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
  post: (endpoint, data) => {
    // If data is FormData, don't stringify and don't set Content-Type
    if (data instanceof FormData) {
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const url = endpoint.startsWith("http") 
        ? endpoint 
        : isDev 
          ? cleanEndpoint 
          : `${baseURL}${cleanEndpoint}`;
      
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      return fetch(url, {
        method: "POST",
        headers,
        body: data
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      });
    }
    return apiRequest(endpoint, { method: "POST", body: JSON.stringify(data) });
  },
  put: (endpoint, data) => apiRequest(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" }),
};

export default apiClient;
