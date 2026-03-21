import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const REFRESH_THRESHOLD_S = 30 * 60; // request a new token when < 30 min remain
const CHECK_THROTTLE_MS = 60 * 1000; // skip if checked within the last minute

function getTokenExp(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)).exp; // seconds since epoch
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("authUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Refresh user data from server on app load to pick up role/profile changes
  // made by an admin while this user was already logged in.
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const base = process.env.REACT_APP_API_URL || "";
    fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((userData) => {
        if (userData) {
          localStorage.setItem("authUser", JSON.stringify(userData));
          setUser(userData);
        }
      })
      .catch(() => {});
  }, []);

  // On tab focus: verify the token is still valid and renew it if near expiry.
  useEffect(() => {
    let lastCheck = 0;

    const clearSession = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      localStorage.removeItem("authGooglePicture");
      setUser(null);
    };

    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const now = Date.now();
      if (now - lastCheck < CHECK_THROTTLE_MS) return;
      lastCheck = now;

      const exp = getTokenExp(token);
      const nowS = Math.floor(now / 1000);
      const base = process.env.REACT_APP_API_URL || "";

      if (exp !== null && nowS >= exp) {
        clearSession();
        return;
      }

      if (exp !== null && exp - nowS < REFRESH_THRESHOLD_S) {
        // Token expiring soon — get a fresh one
        try {
          const res = await fetch(`${base}/api/auth/refresh`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("authUser", JSON.stringify(data.user));
            setUser(data.user);
          } else if (res.status === 401) {
            clearSession();
          }
        } catch {}
      } else {
        // Token is valid — sync user data to pick up any server-side changes
        try {
          const res = await fetch(`${base}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const userData = await res.json();
            localStorage.setItem("authUser", JSON.stringify(userData));
            setUser(userData);
          } else if (res.status === 401) {
            clearSession();
          }
        } catch {}
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkAuth();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (token, userData, googlePicture = null) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(userData));
    if (googlePicture) {
      localStorage.setItem("authGooglePicture", googlePicture);
    }
    setUser(userData);
  };

  const logout = () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      const base = process.env.REACT_APP_API_URL || "";
      fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authGooglePicture");
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem("authUser", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
