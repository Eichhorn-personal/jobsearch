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
  test('renders "Sign in" heading', async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
  });

  test('switching to register mode shows "Create account" heading', async ({ page }) => {
    await page.goto("/#/login");
    await page.getByRole("button", { name: /register/i }).click();
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });

  test("successful login redirects to home and shows avatar in header", async ({ page }) => {
    await mockLoginSuccess(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/login");
    // Form.Label has no controlId so isn't associated — target by input type
    await page.locator('input[type="email"]').fill("user@example.com");
    await page.locator('input[type="password"]').fill("secret");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/localhost:3000\/?#\/$/);
    // Header shows a letter-avatar; its aria-label includes the username
    await expect(
      page.locator('[aria-label="Account menu for user@example.com"]')
    ).toBeVisible();
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
  test("clicking Sign out returns to /#/login", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/");
    // Open the user dropdown via the letter-avatar toggle
    await page.locator('[aria-label="Account menu for user@example.com"]').click();
    await page.getByText(/sign out/i).click();
    await expect(page).toHaveURL(/#\/login/);
  });
});
