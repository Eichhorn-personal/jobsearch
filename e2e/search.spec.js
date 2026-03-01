/**
 * E2E tests for the job search field.
 *
 * The search box filters both the active and archived tables by Role or
 * Company (case-insensitive substring match) as the user types.
 */
const { test, expect } = require("@playwright/test");
const { setAuth, mockApi, CONTRIBUTOR, SAMPLE_JOBS } = require("./helpers");

// One Ghosted row to test that search also filters the archived table
const JOBS_WITH_ARCHIVED = [
  ...SAMPLE_JOBS,
  { id: 3, Role: "Phantom Dev", Company: "SpookCo", Date: "03/01/2025", Status: "Ghosted" },
];

// ── Main table filtering ───────────────────────────────────────────────────────

test.describe("Search — main table", () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page);
    await page.goto("/#/");
    await expect(page.getByRole("table", { name: "Job applications" })).toBeVisible();
  });

  test("search input is visible", async ({ page }) => {
    await expect(page.getByLabel("Search jobs")).toBeVisible();
  });

  test("filtering by role shows matching row and hides others", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("engineer");
    const table = page.getByRole("table", { name: "Job applications" });
    await expect(table.getByText("Engineer", { exact: true })).toBeVisible();
    await expect(table.getByText("Designer", { exact: true })).not.toBeVisible();
  });

  test("filtering by company shows matching row and hides others", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("globex");
    const table = page.getByRole("table", { name: "Job applications" });
    await expect(table.getByText("Designer", { exact: true })).toBeVisible();
    await expect(table.getByText("Engineer", { exact: true })).not.toBeVisible();
  });

  test("search is case-insensitive", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("ACME");
    await expect(
      page.getByRole("table", { name: "Job applications" }).getByText("Engineer", { exact: true })
    ).toBeVisible();
  });

  test("non-matching search hides all rows", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("zzz-no-match");
    const table = page.getByRole("table", { name: "Job applications" });
    await expect(table.getByText("Engineer", { exact: true })).not.toBeVisible();
    await expect(table.getByText("Designer", { exact: true })).not.toBeVisible();
  });

  test("clear button is absent when field is empty", async ({ page }) => {
    await expect(page.getByLabel("Clear search")).not.toBeAttached();
  });

  test("clear button appears once the field has text", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("eng");
    await expect(page.getByLabel("Clear search")).toBeVisible();
  });

  test("clicking clear restores all rows and empties the field", async ({ page }) => {
    const table = page.getByRole("table", { name: "Job applications" });
    await page.getByLabel("Search jobs").fill("engineer");
    await expect(table.getByText("Designer", { exact: true })).not.toBeVisible();

    await page.getByLabel("Clear search").click();

    await expect(table.getByText("Engineer", { exact: true })).toBeVisible();
    await expect(table.getByText("Designer", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Search jobs")).toHaveValue("");
  });
});

// ── Archived table filtering ───────────────────────────────────────────────────

test.describe("Search — archived table", () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page, CONTRIBUTOR);
    await mockApi(page, { jobs: JOBS_WITH_ARCHIVED });
    await page.goto("/#/");
    await expect(page.getByRole("table", { name: "Job applications" })).toBeVisible();
    // Expand the archived section before each test
    await page.locator("button.archived-toggle:visible").click();
    await expect(page.getByRole("table", { name: "Archived job applications" })).toBeVisible();
  });

  test("search hides non-matching archived rows", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("engineer");
    await expect(
      page.getByRole("table", { name: "Archived job applications" }).getByText("Phantom Dev", { exact: true })
    ).not.toBeVisible();
  });

  test("search matching an archived row keeps it visible", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("phantom");
    await expect(
      page.getByRole("table", { name: "Archived job applications" }).getByText("Phantom Dev", { exact: true })
    ).toBeVisible();
  });

  test("clearing search after filtering restores archived rows", async ({ page }) => {
    await page.getByLabel("Search jobs").fill("engineer");
    await page.getByLabel("Clear search").click();
    await expect(
      page.getByRole("table", { name: "Archived job applications" }).getByText("Phantom Dev", { exact: true })
    ).toBeVisible();
  });
});
