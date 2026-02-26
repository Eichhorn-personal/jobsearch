import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import App from "../App";

// Mock heavy components so we don't need full API setup
jest.mock("../components/DataTable", () => () => (
  <div data-testid="data-table" />
));
jest.mock("../pages/AdminPage", () => () => (
  <div data-testid="admin-page">Admin Page</div>
));
jest.mock("../pages/LogsPage", () => () => (
  <div data-testid="logs-page">Logs Page</div>
));
jest.mock("../components/Header", () => () => null);
jest.mock("../components/Footer", () => () => null);
jest.mock("@react-oauth/google", () => ({
  GoogleLogin: () => null,
}));

const adminUser = { id: 1, username: "admin@example.com", role: "admin" };
const contributorUser = {
  id: 2,
  username: "user@example.com",
  role: "contributor",
};

function renderApp(initialEntry, user = null) {
  if (user) {
    localStorage.setItem("authUser", JSON.stringify(user));
    localStorage.setItem("authToken", "test-token");
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MemoryRouter>
  );
}

afterEach(() => localStorage.clear());

// ── /admin route guard ────────────────────────────────────────────────────────

describe("AdminRoute /admin", () => {
  test("unauthenticated user is redirected to /login", () => {
    renderApp("/admin");
    expect(
      screen.getByRole("heading", { name: /sign in to jobtracker/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin-page")).not.toBeInTheDocument();
  });

  test("contributor is redirected to /", () => {
    renderApp("/admin", contributorUser);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-page")).not.toBeInTheDocument();
  });

  test("admin sees AdminPage", () => {
    renderApp("/admin", adminUser);
    expect(screen.getByTestId("admin-page")).toBeInTheDocument();
  });
});

// ── /logs route guard ─────────────────────────────────────────────────────────

describe("AdminRoute /logs", () => {
  test("unauthenticated user is redirected to /login", () => {
    renderApp("/logs");
    expect(
      screen.getByRole("heading", { name: /sign in to jobtracker/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("logs-page")).not.toBeInTheDocument();
  });

  test("contributor is redirected to /", () => {
    renderApp("/logs", contributorUser);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("logs-page")).not.toBeInTheDocument();
  });

  test("admin sees LogsPage", () => {
    renderApp("/logs", adminUser);
    expect(screen.getByTestId("logs-page")).toBeInTheDocument();
  });
});
