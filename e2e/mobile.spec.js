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
// Cards use a tap-to-select model: tapping a card selects it and reveals
// "✏ Edit" and "✕ Delete" toolbar buttons above the card list.

test.describe("Mobile — card interactions", () => {
  test("tapping a card and Edit opens edit modal", async ({ page }) => {
    await page.locator(".job-card").first().tap();
    await page.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("tapping a card and Delete shows confirmation dialog", async ({ page }) => {
    await page.locator(".job-card").first().tap();
    await page.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/delete record/i)).toBeVisible();
  });
});
