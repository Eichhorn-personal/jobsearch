import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Alert, Container } from "react-bootstrap";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Google Sign-In ---
  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
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
      login(data.token, data.user);
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

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

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
        const loginRes = await fetch("/api/auth/login", {
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
      <Card style={{ width: "100%", maxWidth: 400 }} className="shadow-sm">
        <Card.Body className="p-4">
          <Card.Title className="mb-4 text-center fs-4 fw-bold">
            {mode === "login" ? "Sign in to JobSearch" : "Create account"}
          </Card.Title>

          {error && <Alert variant="danger">{error}</Alert>}

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
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              type="submit"
              variant="primary"
              className="w-100"
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </Button>
          </Form>

          <div className="text-center mt-3 text-muted small">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  className="btn btn-link btn-sm p-0"
                  onClick={() => { setMode("register"); setError(""); }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="btn btn-link btn-sm p-0"
                  onClick={() => { setMode("login"); setError(""); }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
