const { test, expect } = require("@playwright/test");
const { setAuth, mockApi, CONTRIBUTOR, ADMIN } = require("./helpers");

// ── admin-only routes ─────────────────────────────────────────────────────────

test.describe("Navigation — admin routes", () => {
  test("contributor visiting /#/admin is redirected to /#/", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/admin");
    await expect(page).toHaveURL(/localhost:3000\/?#\/$/);
  });

  test("contributor visiting /#/logs is redirected to /#/", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/logs");
    await expect(page).toHaveURL(/localhost:3000\/?#\/$/);
  });
});

// ── header buttons ────────────────────────────────────────────────────────────
// The "Manage" button is a standalone button in the header (not inside the
// dropdown) — only rendered for admin users.

test.describe("Navigation — header", () => {
  test("admin user sees Manage button in header", async ({ page }) => {
    await setAuth(page, ADMIN);
    await mockApi(page);
    // Pre-mock /api/users in case AdminPage loads
    await page.route("**/api/users", (route) => route.fulfill({ json: [] }));
    await page.goto("/#/");
    await expect(page.getByRole("button", { name: /^manage$/i })).toBeVisible();
  });

  test("contributor user does not see Manage button", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/");
    // Open dropdown to confirm the user is logged in (Sign out should be visible)
    await page.locator('[aria-label="Account menu for user@example.com"]').click();
    await expect(page.getByText(/sign out/i)).toBeVisible();
    // Manage is not rendered for contributors
    await expect(page.getByRole("button", { name: /^manage$/i })).not.toBeVisible();
  });

  test("Manage button navigates to /#/admin for admin user", async ({ page }) => {
    await setAuth(page, ADMIN);
    await mockApi(page);
    await page.route("**/api/users", (route) => route.fulfill({ json: [] }));
    await page.goto("/#/");
    await page.getByRole("button", { name: /^manage$/i }).click();
    await expect(page).toHaveURL(/#\/admin/);
  });
});

// ── skip link ─────────────────────────────────────────────────────────────────

test.describe("Navigation — skip link", () => {
  test("skip to main content link is present in DOM", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeAttached();
  });
});
