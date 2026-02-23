import { Navbar, Container, Button, Image } from "react-bootstrap";

export default function Header() {
  return (
    <Navbar bg="light" expand="lg" className="mb-4 border-bottom">
      {/* Use regular Container to match page content padding */}
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

        {/* Right: Login Button */}
        <div className="ms-auto">
          <Button variant="primary">Login</Button>
        </div>

      </Container>
    </Navbar>
  );
}