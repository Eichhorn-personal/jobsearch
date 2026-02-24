import { Navbar, Container, Button, Image, NavDropdown } from "react-bootstrap";
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
    <Navbar expand="lg" className="mb-4 border-bottom bg-body-tertiary">
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
