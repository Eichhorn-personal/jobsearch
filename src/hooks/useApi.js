import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function useApi() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const request = useCallback(
    async (path, options = {}) => {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(path, { ...options, headers });

      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Session expired");
      }

      return res;
    },
    [logout, navigate]
  );

  return { request };
}
