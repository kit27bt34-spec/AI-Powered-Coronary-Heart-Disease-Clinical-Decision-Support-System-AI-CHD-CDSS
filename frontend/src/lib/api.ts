import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach Bearer Authorization token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const isAdminRoute = path.startsWith("/admin");
      
      let token: string | null = null;
      if (isAdminRoute) {
        token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      } else {
        token = localStorage.getItem("token") || localStorage.getItem("doctor_token");
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle global API errors (e.g. 401 token expiry, transient network errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.includes("/login") && !path.includes("/select-hospital") && !path.includes("/hospitals")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = `/admin/login?expired=true`;
        }
      }
    } else if (!error.response || error.code === "ERR_NETWORK" || error.message === "Network Error") {
      console.warn("Backend API transient connection issue:", error.message || "Network Error");
    }
    return Promise.reject(error);
  }
);

