import { Navbar, Container, Button, Image, NavDropdown } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Navbar expand="lg" aria-label="Main navigation" className="mb-4 border-bottom bg-body-tertiary">
      <Container className="d-flex align-items-center">

        {/* Left: Logo + Title */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bold fs-4">
          <Image
            src="/logo192.png"
            alt=""
            width={32}
            height={32}
            roundedCircle
            className="me-2"
          />
          JobSearch
        </Navbar.Brand>

        {/* Right: user menu or login */}
        <div className="ms-auto d-flex align-items-center">
          {user ? (
            <NavDropdown title={user.username} align="end" id="user-menu">
              {user.role === "admin" && (
                <>
                  <NavDropdown.Item onClick={() => navigate("/admin")}>
                    ⚙ Manage
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                </>
              )}
              <NavDropdown.Item onClick={handleLogout}>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
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
