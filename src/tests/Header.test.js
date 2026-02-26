import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import Header from "../components/Header";

function renderHeader(user = null) {
  if (user) {
    localStorage.setItem("authUser", JSON.stringify(user));
    localStorage.setItem("authToken", "test-token");
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Header />
      </AuthProvider>
    </MemoryRouter>
  );
}

afterEach(() => localStorage.clear());

// ── semantic / ARIA structure ─────────────────────────────────────────────────

describe("Header — ARIA structure", () => {
  test('navbar has aria-label="Main navigation"', () => {
    renderHeader({ id: 1, username: "u@example.com", role: "contributor" });
    expect(
      screen.getByRole("navigation", { name: /main navigation/i })
    ).toBeInTheDocument();
  });

  test("logo image is decorative (alt='')", () => {
    const { container } = renderHeader({
      id: 1,
      username: "u@example.com",
      role: "contributor",
    });
    // eslint-disable-next-line testing-library/no-node-access
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
  });

  test("brand renders as a link", () => {
    renderHeader({ id: 1, username: "u@example.com", role: "contributor" });
    expect(screen.getByRole("link", { name: /jobtracker/i })).toBeInTheDocument();
  });
});

// ── role-conditional menu items ───────────────────────────────────────────────

describe("Header — role-based menu items", () => {
  test("admin user sees Manage item after opening dropdown", async () => {
    renderHeader({ id: 1, username: "admin@example.com", role: "admin" });
    // NavDropdown renders items lazily — need to open it first
    userEvent.click(screen.getByText("admin@example.com"));
    await waitFor(() =>
      expect(screen.getByText(/manage/i)).toBeInTheDocument()
    );
  });

  test("contributor user does not see Manage item after opening dropdown", async () => {
    renderHeader({ id: 2, username: "user@example.com", role: "contributor" });
    userEvent.click(screen.getByText("user@example.com"));
    // Wait for dropdown to open (Logout should appear)
    await waitFor(() =>
      expect(screen.getByText(/logout/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/manage/i)).not.toBeInTheDocument();
  });

  test("Logout item is present after opening dropdown", async () => {
    renderHeader({ id: 1, username: "u@example.com", role: "contributor" });
    userEvent.click(screen.getByText("u@example.com"));
    await waitFor(() =>
      expect(screen.getByText(/logout/i)).toBeInTheDocument()
    );
  });
});
