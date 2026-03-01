import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Container } from "react-bootstrap";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import iconSrc from "../job-tracker-icon.svg";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || "";

  // --- Google Sign-In ---
  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      if (!res.ok) {
        let msg = "Google sign-in failed";
        try { const d = await res.json(); msg = d.error || msg; } catch { /* ignore */ }
        setError(msg);
        return;
      }
      const data = await res.json();
      login(data.token, data.user, data.google_picture || null);
      navigate("/");
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // --- Username/password ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/register`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        let errorMsg = "Something went wrong";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          errorMsg = "Server unreachable — make sure the backend is running (npm run dev)";
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (mode === "register") {
        // Auto-login after register
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!loginRes.ok) {
          let loginErrMsg = "Registered but login failed";
          try {
            const loginData = await loginRes.json();
            loginErrMsg = loginData.error || loginErrMsg;
          } catch { /* ignore */ }
          setError(loginErrMsg);
          setLoading(false);
          return;
        }
        const loginData = await loginRes.json();
        login(loginData.token, loginData.user);
      } else {
        login(data.token, data.user);
      }

      navigate("/");
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <div className="admin-panel" style={{ width: "100%", maxWidth: 400, borderRadius: 12 }}>
        <div style={{ padding: "32px 32px 24px" }}>

          {/* Header */}
          <div className="text-center mb-4">
            <img src={iconSrc} alt="" width={48} height={48} style={{ borderRadius: 10, marginBottom: 12 }} />
            <h1 style={{ fontSize: 20, fontWeight: 400, color: "#202124", margin: "0 0 4px" }}>
              {mode === "login" ? "Sign in" : "Create account"}
            </h1>
            <p className="text-muted small mb-0">to continue to JobTracker</p>
          </div>

          {/* Error */}
          <div aria-live="polite" aria-atomic="true">
            {error && (
              <div role="alert" style={{ background: "#fce8e6", color: "#c5221f", border: "1px solid #f5c2c0", borderRadius: 4, padding: "10px 12px", fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
            )}
          </div>

          {/* Google button */}
          <div className="d-flex justify-content-center mb-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in was cancelled or failed")}
              useOneTap={false}
              text={mode === "login" ? "signin_with" : "signup_with"}
              theme={theme === "dark" ? "filled_black" : "outline"}
            />
          </div>

          <div className="d-flex align-items-center mb-3 text-muted small">
            <hr className="flex-grow-1" />
            <span className="mx-2">or</span>
            <hr className="flex-grow-1" />
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 14 }}>Email</Form.Label>
              <Form.Control
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontSize: 14 }}>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </Form>

          <div className="text-center mt-3 text-muted small">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => { setMode("register"); setError(""); }}>
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => { setMode("login"); setError(""); }}>
                  Sign in
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </Container>
  );
}
