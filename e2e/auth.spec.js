const { test, expect } = require("@playwright/test");
const { setAuth, mockApi, mockLoginSuccess, mockLoginError, CONTRIBUTOR } = require("./helpers");

// ── redirect behaviour ────────────────────────────────────────────────────────

test.describe("Auth — redirects", () => {
  test("unauthenticated user is redirected to /#/login", async ({ page }) => {
    await mockApi(page);
    await page.goto("/#/");
    await expect(page).toHaveURL(/#\/login/);
  });
});

// ── login form ────────────────────────────────────────────────────────────────

test.describe("Auth — login form", () => {
  test('renders "Sign in to JobTracker" heading', async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByRole("heading", { name: /sign in to jobtracker/i })).toBeVisible();
  });

  test('switching to register mode shows "Create account" heading', async ({ page }) => {
    await page.goto("/#/login");
    await page.getByRole("button", { name: /register/i }).click();
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });

  test("successful login redirects to home and shows username in header", async ({ page }) => {
    await mockLoginSuccess(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/login");
    // Form.Label has no controlId so isn't associated — target by input type
    await page.locator('input[type="email"]').fill("user@example.com");
    await page.locator('input[type="password"]').fill("secret");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/localhost:3000\/?#\/$/);
    await expect(page.getByText("user@example.com")).toBeVisible();
  });

  test("invalid credentials shows error alert", async ({ page }) => {
    await mockLoginError(page, "Invalid credentials");
    await page.goto("/#/login");
    await page.locator('input[type="email"]').fill("bad@example.com");
    await page.locator('input[type="password"]').fill("wrong");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toContainText(/invalid credentials/i);
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

test.describe("Auth — logout", () => {
  test("clicking Logout returns to /#/login", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/");
    // Open user dropdown then click Logout (NavDropdown.Item renders as <a>)
    await page.getByText("user@example.com").click();
    await page.getByText(/logout/i).click();
    await expect(page).toHaveURL(/#\/login/);
  });
});
