// client/src/services/apiClient.js
/**
 * API Client for Table Top Codex
 * Uses VITE_API_URL environment variable for base URL
 */
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Base fetch wrapper with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${baseURL}${endpoint}`;
  
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
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
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
