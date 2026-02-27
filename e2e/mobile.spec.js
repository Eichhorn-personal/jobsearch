/**
 * Mobile smoke tests — run against the Pixel 5 viewport (393 × 851 px).
 * Verifies that the card layout is shown (not the desktop table) and that
 * card interactions work correctly on a phone-sized screen.
 */
const { test, expect } = require("@playwright/test");
const { setAuth, mockApi, CONTRIBUTOR } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await setAuth(page, CONTRIBUTOR);
  await mockApi(page);
  await page.goto("/#/");
  await page.waitForSelector(".job-card");
});

// ── Layout ────────────────────────────────────────────────────────────────────

test.describe("Mobile — layout", () => {
  test("card list is visible and desktop table is hidden", async ({ page }) => {
    await expect(page.locator(".job-cards")).toBeVisible();
    await expect(page.locator(".sheet-scroll")).toBeHidden();
  });

  test("footer is visible without scrolling", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const box = await footer.boundingBox();
    const viewportHeight = page.viewportSize().height;
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 2);
  });
});

// ── Card interactions ─────────────────────────────────────────────────────────

test.describe("Mobile — card interactions", () => {
  test("tapping eye icon opens edit modal", async ({ page }) => {
    await page.locator(".job-card").first().locator(".job-card-btn").first().tap();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("tapping delete icon shows confirmation dialog", async ({ page }) => {
    await page.locator(".job-card").first().locator(".job-card-btn").nth(1).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/delete record/i)).toBeVisible();
  });
});
