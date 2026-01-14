// client/src/services/apiClient.js
/**
 * API Client for Table Top Codex
 * Always uses relative URLs that go through the reverse proxy (Nginx Proxy Manager)
 * This ensures consistent routing in both dev and production environments
 */
/**
 * Base fetch wrapper with error handling
 * All endpoints are relative and will be handled by the reverse proxy
 * Automatically prepends /api to endpoints that don't already include it
 */
async function apiRequest(endpoint, options = {}) {
  // Skip /api prefix for absolute URLs
  let url;
  if (endpoint.startsWith("http")) {
    url = endpoint;
  } else {
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    // Prepend /api if not already present
    url = cleanEndpoint.startsWith("/api/") ? cleanEndpoint : `/api${cleanEndpoint}`;
  }
  
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available (safely handle localStorage)
  let token = null;
  try {
    if (typeof Storage !== "undefined" && window.localStorage) {
      token = localStorage.getItem("token");
    }
  } catch (e) {
    console.warn("localStorage access failed:", e);
  }
  
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
      // For 401 on auth endpoints, show the actual error message from server
      const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");
      if (response.status === 401) {
        if (isAuthEndpoint) {
          // For login/register, show the actual server error (e.g., "Invalid credentials")
          throw new Error(errorMessage || "Authentication failed");
        } else {
          throw new Error("Authentication required. Please login.");
        }
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

/**
 * Fetch binary data (e.g., images) as Blob
 * @param {string} endpoint - Relative API endpoint
 * @returns {Promise<Blob>} - Blob object
 */
async function apiRequestBlob(endpoint) {
  // Skip /api prefix for absolute URLs
  let url;
  if (endpoint.startsWith("http")) {
    url = endpoint;
  } else {
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    // Prepend /api if not already present
    url = cleanEndpoint.startsWith("/api/") ? cleanEndpoint : `/api${cleanEndpoint}`;
  }
  
  const headers = {};
  
  // Add auth token if available (safely handle localStorage)
  let token = null;
  try {
    if (typeof Storage !== "undefined" && window.localStorage) {
      token = localStorage.getItem("token");
    }
  } catch (e) {
    console.warn("localStorage access failed:", e);
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText };
      }
      
      const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return await response.blob();
  } catch (error) {
    console.error("API blob request failed:", error);
    throw error;
  }
}

export const apiClient = {
  get: (endpoint) => apiRequest(endpoint, { method: "GET" }),
  /**
   * Get binary data as Blob (e.g., for images)
   * @param {string} endpoint - Relative API endpoint
   * @returns {Promise<Blob>} - Blob object
   */
  getBlob: (endpoint) => apiRequestBlob(endpoint),
  post: (endpoint, data) => {
    // Special handling for auth endpoints - don't send existing token
    const isAuthEndpoint = endpoint.includes("/auth/login") || endpoint.includes("/auth/register");
    
    // If data is FormData, don't stringify and don't set Content-Type
    if (data instanceof FormData) {
      // Skip /api prefix for absolute URLs
      let url;
      if (endpoint.startsWith("http")) {
        url = endpoint;
      } else {
        // Ensure endpoint starts with /
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        // Prepend /api if not already present
        url = cleanEndpoint.startsWith("/api/") ? cleanEndpoint : `/api${cleanEndpoint}`;
      }
      
      // Don't send token for auth endpoints
      const headers = {};
      if (!isAuthEndpoint) {
        // Safely get token from localStorage
        let token = null;
        try {
          if (typeof Storage !== "undefined" && window.localStorage) {
            token = localStorage.getItem("token");
          }
        } catch (e) {
          console.warn("localStorage access failed:", e);
        }
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
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
    // For auth endpoints, don't include Authorization header
    if (isAuthEndpoint) {
      // Build URL
      let url;
      if (endpoint.startsWith("http")) {
        url = endpoint;
      } else {
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        url = cleanEndpoint.startsWith("/api/") ? cleanEndpoint : `/api${cleanEndpoint}`;
      }
      
      const config = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };
      
      return fetch(url, config).then(async (response) => {
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { error: response.statusText };
          }
          
          const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
        
        return await response.json();
      }).catch((error) => {
        console.error("API request failed:", error);
        throw error;
      });
    }
    
    return apiRequest(endpoint, { method: "POST", body: JSON.stringify(data) });
  },
  put: (endpoint, data) => apiRequest(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" }),
};

export default apiClient;
