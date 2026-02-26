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

// ── header dropdown ───────────────────────────────────────────────────────────

test.describe("Navigation — header dropdown", () => {
  test("admin user sees Manage item in dropdown", async ({ page }) => {
    await setAuth(page, ADMIN);
    await mockApi(page);
    // Pre-mock /api/users in case AdminPage loads
    await page.route("**/api/users", (route) => route.fulfill({ json: [] }));
    await page.goto("/#/");
    await page.getByText("admin@example.com").click();
    await expect(page.getByText(/manage/i)).toBeVisible();
  });

  test("contributor user does not see Manage item in dropdown", async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/");
    await page.getByText("user@example.com").click();
    await expect(page.getByText(/logout/i)).toBeVisible();
    await expect(page.getByText(/manage/i)).not.toBeVisible();
  });

  test("Manage link navigates to /#/admin for admin user", async ({ page }) => {
    await setAuth(page, ADMIN);
    await mockApi(page);
    await page.route("**/api/users", (route) => route.fulfill({ json: [] }));
    await page.goto("/#/");
    await page.getByText("admin@example.com").click();
    await page.getByText(/manage/i).click();
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
