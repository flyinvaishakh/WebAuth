import axios from "axios";
import { server } from "./config";

const api = axios.create({
  baseURL: server,
  withCredentials: true,
});

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
}

// Attach CSRF token to state-changing requests
api.interceptors.request.use(
  (config) => {
    if (["post", "put", "delete", "patch"].includes(config.method.toLowerCase())) {
      const csrfToken = getCookie("csrfToken");
      if (csrfToken) {
        config.headers["x-csrf-token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatic token refresh interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // List of public endpoints that should NEVER trigger auto-refresh on 401
    const publicAuthEndpoints = [
      "/api/v1/refresh",
      "/api/v1/login",
      "/api/v1/register",
      "/api/v1/verify",
    ];

    const isPublicEndpoint = publicAuthEndpoints.some((endpoint) =>
      originalRequest.url?.includes(endpoint)
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/api/v1/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;