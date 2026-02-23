import { Navbar, Container, Button, Image } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Navbar bg="light" expand="lg" className="mb-4 border-bottom">
      <Container className="d-flex align-items-center">

        {/* Left: Logo + Title */}
        <div className="d-flex align-items-center">
          <Image
            src="/logo192.png"
            width={32}
            height={32}
            roundedCircle
            className="me-2"
          />
          <Navbar.Brand className="fw-bold fs-4">JobSearch</Navbar.Brand>
        </div>

        {/* Right: user info or login */}
        <div className="ms-auto d-flex align-items-center gap-3">
          {user ? (
            <>
              <span className="text-muted small">{user.username}</span>
              <Button variant="outline-secondary" size="sm" onClick={() => navigate("/admin")}>
                ⚙ Manage
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => navigate("/login")}>
              Login
            </Button>
          )}
        </div>

      </Container>
    </Navbar>
  );
}
