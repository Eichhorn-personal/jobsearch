const { test, expect } = require("@playwright/test");
const { setAuth, mockApi, CONTRIBUTOR, SAMPLE_JOBS } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await setAuth(page, CONTRIBUTOR);
  await mockApi(page);
  await page.goto("/#/");
  // Wait for jobs table to populate
  await expect(page.getByRole("table", { name: /job applications/i })).toBeVisible();
});

// ── table rendering ───────────────────────────────────────────────────────────

test.describe("Jobs — table", () => {
  test("displays all sample jobs", async ({ page }) => {
    const table = page.getByRole("table", { name: /job applications/i });
    for (const job of SAMPLE_JOBS) {
      // Use text check rather than cell role to avoid aria-label substring collisions
      await expect(table.getByText(job.Role, { exact: true })).toBeVisible();
      await expect(table.getByText(job.Company, { exact: true })).toBeVisible();
    }
  });

  test("table has correct column headers", async ({ page }) => {
    for (const col of ["Date", "Role", "Company", "Status"]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible();
    }
  });
});

// ── add job ───────────────────────────────────────────────────────────────────

test.describe("Jobs — add", () => {
  test("opens Add Job modal when Add Job button is clicked", async ({ page }) => {
    await page.getByRole("button", { name: /add job/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Modal.Title renders as <div class="modal-title h4">, not a heading element
    await expect(dialog.locator(".modal-title")).toContainText(/add job/i);
  });

  test("submitting the add form appends a new row", async ({ page }) => {
    await page.getByRole("button", { name: /add job/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Form.Label has no controlId — target text inputs by index in the form
    // Order: Date(0), Role(1), Company(2), then Recruiter/HiringMgr/Panel/HR
    const textInputs = dialog.locator('input[type="text"]');
    await textInputs.nth(1).fill("QA Engineer"); // Role
    await textInputs.nth(2).fill("Initech");     // Company
    // Submit button text is "Add Job" in add mode
    await dialog.getByRole("button", { name: /^add job$/i }).click();
    // The new row should appear (API mock echoes back the submitted data with id=99)
    const table = page.getByRole("table", { name: /job applications/i });
    await expect(table.getByText("QA Engineer", { exact: true })).toBeVisible();
  });
});

// ── delete job ────────────────────────────────────────────────────────────────

test.describe("Jobs — delete", () => {
  test("clicking delete icon shows confirmation dialog", async ({ page }) => {
    await page.getByRole("button", { name: /delete engineer at acme/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Modal.Title renders as <div class="modal-title h4">, not a heading element
    await expect(dialog.locator(".modal-title")).toContainText(/delete record/i);
  });

  test("cancelling delete keeps the row", async ({ page }) => {
    await page.getByRole("button", { name: /delete engineer at acme/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("button", { name: /delete engineer at acme/i })).toBeVisible();
  });

  test("confirming delete removes the row", async ({ page }) => {
    await page.getByRole("button", { name: /delete engineer at acme/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Use exact:true so "Delete Engineer at Acme" trash buttons don't also match
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /delete engineer at acme/i })
    ).not.toBeVisible();
  });
});

// ── edit job ──────────────────────────────────────────────────────────────────

test.describe("Jobs — edit", () => {
  test("clicking eye icon opens modal pre-filled with job data", async ({ page }) => {
    await page.getByRole("button", { name: /view or edit engineer at acme/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".modal-title")).toContainText(/edit job/i);
    // Form.Label has no controlId — check by input index: Date(0), Role(1), Company(2)
    const textInputs = dialog.locator('input[type="text"]');
    await expect(textInputs.nth(1)).toHaveValue("Engineer"); // Role
    await expect(textInputs.nth(2)).toHaveValue("Acme");     // Company
  });

  test("saving edit updates the row inline", async ({ page }) => {
    await page.getByRole("button", { name: /view or edit engineer at acme/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const textInputs = dialog.locator('input[type="text"]');
    await textInputs.nth(1).fill("Senior Engineer"); // Role
    // Submit button text is "Save Changes" in edit mode
    await dialog.getByRole("button", { name: /save changes/i }).click();
    const table = page.getByRole("table", { name: /job applications/i });
    await expect(table.getByText("Senior Engineer", { exact: true })).toBeVisible();
  });
});
