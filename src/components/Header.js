import { Container, Image, NavDropdown } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const avatarLetter = user?.username?.charAt(0)?.toUpperCase() || "?";

  return (
    <header className="gmail-header" aria-label="Main navigation">
      <Container className="d-flex align-items-center h-100">

        {/* Left: Logo + App name */}
        <Link to="/" className="d-flex align-items-center text-decoration-none" style={{ gap: 10 }}>
          <Image src="/logo192.png" alt="" width={40} height={40} roundedCircle />
          <span className="gmail-app-name">JobTracker</span>
        </Link>

        {/* Right: admin button + user avatar dropdown or sign-in */}
        <div className="ms-auto d-flex align-items-center" style={{ gap: 8 }}>
          {user?.role === "admin" && (
            <button className="btn-toolbar-action" onClick={() => navigate("/admin")}>
              Manage
            </button>
          )}
          {user ? (
            <NavDropdown
              title={<span className="gmail-avatar" aria-label={`Account menu for ${user.username}`}>{avatarLetter}</span>}
              align="end"
              id="user-menu"
            >
              <NavDropdown.Header className="text-muted small">{user.username}</NavDropdown.Header>
              <NavDropdown.Item onClick={handleLogout}>Sign out</NavDropdown.Item>
            </NavDropdown>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>
              Sign in
            </button>
          )}
        </div>

      </Container>
    </header>
  );
}
