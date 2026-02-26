import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";

jest.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="google-login" />,
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

// ── heading & mode toggle ─────────────────────────────────────────────────────

describe("LoginPage — heading", () => {
  test('renders "Sign in to JobTracker" heading', () => {
    renderLoginPage();
    expect(
      screen.getByRole("heading", { name: /sign in to jobtracker/i })
    ).toBeInTheDocument();
  });

  test('clicking Register shows "Create account" heading', () => {
    renderLoginPage();
    userEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(
      screen.getByRole("heading", { name: /create account/i })
    ).toBeInTheDocument();
  });

  test("clicking Sign in from register mode restores login heading", () => {
    renderLoginPage();
    userEvent.click(screen.getByRole("button", { name: /register/i }));
    userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      screen.getByRole("heading", { name: /sign in to jobtracker/i })
    ).toBeInTheDocument();
  });
});

// ── accessibility structure ───────────────────────────────────────────────────

describe("LoginPage — accessibility", () => {
  test('error container has aria-live="polite"', () => {
    renderLoginPage();
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector("[aria-live='polite']")).toBeInTheDocument();
  });

  test('mode toggle buttons have type="button"', () => {
    renderLoginPage();
    expect(
      screen.getByRole("button", { name: /register/i })
    ).toHaveAttribute("type", "button");
  });
});

// ── API error display ─────────────────────────────────────────────────────────

describe("LoginPage — API error", () => {
  test("error from API is shown in a role=alert element", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    const { container } = renderLoginPage();
    const emailInput = container.querySelector("input[type='email']");
    const passwordInput = container.querySelector("input[type='password']");

    userEvent.type(emailInput, "user@example.com");
    userEvent.type(passwordInput, "wrongpassword");
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid credentials"
      );
    });
  });
});
