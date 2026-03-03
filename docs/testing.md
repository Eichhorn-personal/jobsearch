# Testing

Three test layers cover the full stack:

| Layer | Tool | Count | Command |
|-------|------|-------|---------|
| Backend API | Jest + Supertest | 98 tests | `cd server && npm test` |
| Frontend components | Jest + React Testing Library | 57 tests | `npm test` |
| End-to-end | Playwright | 44 tests | `npm run test:e2e` |

Run all three suites together with a timestamped log:
```bash
npm run test:all   # node scripts/run-tests.js
```

---

## Layer 1 — Backend API tests

**Location**: `server/tests/`
**Runner**: Jest with `--runInBand` (sequential — tests share a DB singleton)
**Database**: In-memory SQLite (`DB_PATH=:memory:`) created fresh for each test run via `server/tests/setup.js`

The tests import the Express `app` directly (from `server/app.js`) and use Supertest to make HTTP requests. No server port is bound; no real file I/O.

### `auth.test.js` — 32 tests

**Register (8)**: valid email+password (201); duplicate email (409); invalid email format (400); password < 8 chars (400); password > 128 chars (400); missing password (400); ALLOWED_EMAILS set and email not listed (403); email in ALLOWED_EMAILS accepted (201).

**Login (6)**: correct credentials (200, JWT + user); wrong password (401); unknown email (401, same as wrong password); missing password (400); missing username (400); invalid email format (400).

**Logout (2)**: authenticated (204); unauthenticated (401).

**`GET /api/auth/me` (5)**: valid token (200, user without password field); no token (401); malformed token (401); token signed with wrong secret (401); token for deleted user (401).

**`PUT /api/auth/profile` (11)**:

| Test | What it verifies |
|------|-----------------|
| update display_name | 200, display_name in response |
| update photo (base64 data URL) | 200, photo stored |
| photo exceeds 300 KB | 400 |
| change password — correct current password | 200, has_password true |
| change password — wrong current password | 401 |
| Google-only account sets password without current_password | 200, has_password true |
| new password too short (< 8 chars) | 400 |
| no fields provided | 400 |
| update resume_link | 200, resume_link in response |
| resume_link without http(s) prefix | 400 |
| unauthenticated | 401 |

### `jobs.test.js` — 24 tests

**`GET /api/jobs` (3)**: authenticated (200, array); unauthenticated (401); returns only requesting user's jobs.

**`POST /api/jobs` (11)**: valid body (201); unauthenticated (401); company > 200 chars (400); role > 200 chars (400); Notes > 5000 chars (400); Job Board Link with `javascript:` scheme (400); Direct Company Job Link with `data:` scheme (400); valid `https://` Job Board Link (201); empty Job Board Link (201); Notes saved and returned as `Notes` not `Comments` (201); boolean fields returned as booleans (201).

**`PUT /api/jobs/:id` (5)**: own job (200, updated); another user's job (403); nonexistent job (404); invalid URL on update (400); unauthenticated (401).

**`DELETE /api/jobs/:id` (5)**: own job (204); job actually removed; another user's job (403); nonexistent job (404); unauthenticated (401).

### `users.test.js` — 17 tests

**`GET /api/users` (4)**: admin (200, array); response excludes passwords; user token (403); unauthenticated (401).

**`PUT /api/users/:id/role` (6)**: admin promotes user (200); admin demotes admin (200); invalid role value (400); nonexistent user (404); user cannot change roles (403); unauthenticated (401).

**`DELETE /api/users/:id` (7)**: admin deletes another user (204); deleted user gone from list; deleting user cascades to their jobs; admin cannot delete own account (400); user cannot delete users (403); nonexistent user (404); unauthenticated (401).

### `logs.test.js` — 4 tests

| Test | What it verifies |
|------|-----------------|
| `GET /api/logs` — admin token | 200, array of log entries |
| `GET /api/logs` — user token | 403 |
| `GET /api/logs` — unauthenticated | 401 |
| entries returned newest-first | second entry precedes first in response |

### `dropdowns.test.js` — 21 tests

**`GET /api/dropdowns` (4)**: user token (200); admin token (200); unauthenticated (401); options grouped by field name.

**`POST /api/dropdowns/:fieldName` (5)**: admin adds option (201); user token (403); duplicate label (409); empty label (400); unauthenticated (401).

**`PUT /api/dropdowns/option/:id` rename (4)**: admin renames (200); user token (403); nonexistent option (404); unauthenticated (401).

**`PUT /api/dropdowns/:fieldName/reorder` (3)**: admin reorders (200); user token (403); orderedIds not an array (400).

**`DELETE /api/dropdowns/option/:id` (5)**: admin deletes (204); option actually removed; user token (403); nonexistent option (404); unauthenticated (401).

---

## Layer 2 — Frontend component tests

**Location**: `src/tests/`
**Runner**: Jest + React Testing Library (bundled with CRA)
**Strategy**: Components rendered in jsdom with `MemoryRouter` + `AuthProvider`. API calls are mocked via `jest.mock("../hooks/useApi")`.

### `LoginPage.test.js` — 6 tests

| Test | What it verifies |
|------|-----------------|
| Renders "Sign in" heading | `role="heading"` with text `/^sign in$/i` present |
| Toggle to register mode | heading changes to "Create account" |
| Toggle back to sign in | heading reverts |
| Error from API shown in alert | `role="alert"` contains error text |
| Error container has `aria-live="polite"` | live region announced to screen readers |
| Mode toggle buttons have `type="button"` | don't accidentally submit the form |

### `AdminRoute.test.js` — 10 tests

| Test | What it verifies |
|------|-----------------|
| Regular user visits `/#/admin` | redirected to `/` |
| Unauthenticated visits `/#/admin` | redirected to `/login` |
| Admin visits `/#/admin` | AdminPage renders |
| Regular user visits `/#/logs` | redirected to `/` |
| Unauthenticated visits `/#/logs` | redirected to `/login` |
| Admin visits `/#/logs` | LogsPage renders |
| Regular user visits `/#/site-admin` | redirected to `/` |
| Unauthenticated visits `/#/site-admin` | redirected to `/login` |
| Admin without `is_site_admin` visits `/#/site-admin` | redirected to `/` |
| Site admin user (`is_site_admin: true`) visits `/#/site-admin` | SiteAdminPage renders |

### `DataTable.test.js` — 8 tests

| Test | What it verifies |
|------|-----------------|
| Renders element with `role="table"` | ARIA table structure |
| Table has `aria-label="Job applications"` | accessible name |
| Click row → Edit toolbar button appears | single-click selection model |
| Click row → Delete toolbar button appears | single-click selection model |
| Double-click row → edit modal opens with row data | `initialData` set on modal |
| Click delete toolbar button → confirmation dialog appears | dialog rendered |
| Confirm dialog has `aria-labelledby="confirm-delete-title"` | accessible modal |
| Confirm delete → row removed from table | row no longer in DOM |

### `AddJobModal.test.js` — 9 tests

| Test | What it verifies |
|------|-----------------|
| Dialog has `aria-labelledby="add-job-modal-title"` | ARIA wiring |
| Title element has `id="add-job-modal-title"` | ARIA wiring |
| Invalid date shows error with `id="date-error"` | error element present |
| Date input gains `aria-describedby="date-error"` when invalid | ARIA association |
| Submit button disabled when date is invalid | blocked by date error |
| `onSave` not called when date is invalid | submission blocked |
| Submit add form with valid date calls `onAdd` | form submission |
| Edit mode title says "Edit Job" | mode detection |
| Edit mode submit button says "Save Changes" | mode detection |

### `Header.test.js` — 10 tests

| Test | What it verifies |
|------|-----------------|
| Navbar has `aria-label="Main navigation"` | landmark is labelled |
| Logo image has `alt=""` | decorative, not announced |
| Brand renders as a link | `role="link"` present |
| Admin user sees Manage item after opening dropdown | conditional rendering |
| Regular user does not see Manage item | absent after dropdown opens |
| User with photo renders `<img>` avatar instead of letter span | photo takes priority |
| Dropdown header shows display_name when set | display_name replaces username |
| Edit Profile item present in dropdown | links to /profile |
| Site admin user sees Admin link in dropdown | site-admin link present |
| Other admin does not see Admin link | site-admin link absent |

### `ProfilePage.test.js` — 13 tests

| Test | What it verifies |
|------|-----------------|
| Renders Photo, Account, Resume, Password panel headers | all four sections present |
| Display name input pre-filled from `user.display_name` | value equals display name |
| Email field is read-only | `readOnly` attribute set |
| Password inputs hidden by default | New/Confirm inputs absent |
| "Change password" reveals password inputs | inputs appear after click |
| "Cancel" hides password section | inputs removed from DOM |
| "Current password" shown only when `has_password` is true | conditional render |
| Mismatched passwords shows inline error | `role="alert"` contains message |
| New password too short shows inline error | `role="alert"` contains 8/128 message |
| Successful save shows success message | `role="status"` contains "Profile saved." |
| Google import banner shown when `authGooglePicture` set and no photo | banner rendered |
| Google import banner not shown when user already has a photo | banner not rendered |
| Dismiss removes `authGooglePicture` from localStorage | key cleared |

---

## Layer 3 — Playwright E2E tests

**Location**: `e2e/`
**Runner**: Playwright (Chromium only)
**Strategy**: No backend required. All API calls are intercepted with `page.route()` and return fixture data. Auth state is pre-seeded into `localStorage` via `page.addInitScript()` before navigation.

**Config**: `playwright.config.js` — starts the CRA dev server automatically (`webServer` config with `reuseExistingServer: true`).

### Shared helpers — `e2e/helpers.js`

| Helper | Description |
|--------|-------------|
| `setAuth(page, user)` | Injects `authToken` + `authUser` into localStorage before the page loads |
| `mockApi(page, { jobs })` | Intercepts `GET /api/jobs`, `POST /api/jobs`, `PUT/DELETE /api/jobs/*`, `GET /api/dropdowns`, `POST /api/auth/logout` |
| `mockLoginSuccess(page, user)` | Intercepts `POST /api/auth/login` → returns JWT + user |
| `mockLoginError(page, message)` | Intercepts `POST /api/auth/login` → returns 401 with error message |
| `CONTRIBUTOR` / `ADMIN` | Fixture user objects |
| `SAMPLE_JOBS` | Two fixture job rows used in all job tests |

### `auth.spec.js` — 6 tests

| Test | Flow |
|------|------|
| Unauthenticated → redirected to `/#/login` | Navigate to `/#/`; assert URL |
| "Sign in" heading renders | Navigate to `/#/login`; assert heading |
| Toggle to register mode | Click Register button; assert "Create account" heading |
| Successful login redirects home and shows avatar | Fill form; submit; assert URL and avatar aria-label in header |
| Invalid credentials shows error alert | Mock 401; fill form; submit; assert alert text |
| Sign out returns to `/#/login` | Click avatar → Sign out; assert URL |

### `jobs.spec.js` — 10 tests

Each test starts with auth pre-seeded and waits for the job table to be visible.

| Test | Flow |
|------|------|
| Displays all sample jobs | Assert Role + Company text visible in table |
| Table has correct column headers | Assert Date, Role, Company, Status columnheaders |
| Opens Add Job modal | Click Add Job; assert dialog + modal title |
| Submit add form → new row appears | Fill Role + Company; submit; assert new text in table |
| Delete toolbar button shows confirmation dialog | Click row to select; click ✕ Delete; assert dialog + title |
| Cancel delete keeps the row | Select row → Delete → Cancel; assert row still in table |
| Confirm delete removes the row | Select row → Delete → Delete (exact match); assert row gone |
| Edit toolbar button opens modal pre-filled | Select row → ✏ Edit; assert "Edit Job" title + input values |
| Double-click opens edit modal directly | `dblclick` row; assert "Edit Job" dialog visible (no toolbar needed) |
| Saving edit updates row inline | Select row → Edit; change Role; Save Changes; assert updated text |

> **ARIA / selector notes**:
> - `Modal.Title` renders as `<div class="modal-title h4">` — use `.locator(".modal-title")`
> - Row selection: `table.getByRole("row").filter({ hasText: /.../ }).click()` then click toolbar button
> - Confirm delete button: `{ name: "Delete", exact: true }` to avoid matching the toolbar button
> - `Form.Group` has no `controlId` — select text inputs by `nth()` index (Date=0, Company=1, Role=2)

### `navigation.spec.js` — 6 tests

| Test | Flow |
|------|------|
| Contributor visiting `/#/admin` → redirected to `/#/` | Navigate; assert URL |
| Contributor visiting `/#/logs` → redirected to `/#/` | Navigate; assert URL |
| Admin sees standalone Manage button in header | Navigate to `/#/`; assert button visible (no dropdown needed) |
| Contributor does not see Manage button | Open account dropdown; confirm Sign out visible; assert no Manage button |
| Manage button navigates to `/#/admin` | Click Manage; assert URL |
| Skip link is present in DOM | Assert skip-to-content link attached |

### `mobile.spec.js` — 4 tests

Run at Pixel 5 viewport (393 × 851 px). Each test pre-seeds auth and waits for `.job-card`.

| Test | Flow |
|------|------|
| Card list visible, desktop table hidden | Assert `.job-cards` visible; `.sheet-scroll` hidden |
| Footer visible without scrolling | Assert footer bounding box fits within viewport height |
| Tap card + Edit opens edit modal | Tap `.job-card`; click Edit toolbar button; assert dialog visible |
| Tap card + Delete shows confirmation dialog | Tap `.job-card`; click Delete; assert dialog + "Delete Record" text |

### `archived.spec.js` — 7 tests

Uses extended job fixture: `SAMPLE_JOBS` + one Ghosted row + one Duplicate row.

| Test | Flow |
|------|------|
| Archived rows absent from main table | Assert "Phantom Dev" / "Copy of Eng" not visible in main table |
| Active rows remain in main table | Assert "Engineer" / "Designer" visible in main table |
| Toggle visible and `aria-expanded="false"` by default | Assert button present; assert attribute |
| Archived table not in DOM when collapsed | `not.toBeAttached()` on archived table |
| Clicking toggle expands and shows archived rows | Click toggle; assert table visible + row texts |
| Clicking toggle again collapses the table | Click toggle twice; assert table detached; attribute resets |
| Toggle absent when no archived jobs | Use default `SAMPLE_JOBS`; assert `button.archived-toggle` not attached |

### `search.spec.js` — 11 tests

| Test | Flow |
|------|------|
| Search input is visible | Assert `aria-label="Search jobs"` input visible |
| Filter by role shows matching row, hides others | Fill "engineer"; assert Engineer visible, Designer hidden |
| Filter by company shows matching row, hides others | Fill "globex"; assert Designer visible, Engineer hidden |
| Search is case-insensitive | Fill "ACME"; assert Engineer visible |
| Non-matching search hides all rows | Fill "zzz-no-match"; assert both rows hidden |
| Clear button absent when field is empty | Assert `aria-label="Clear search"` not attached |
| Clear button appears once field has text | Fill "eng"; assert clear button visible |
| Clear restores all rows and empties field | Fill → clear click; assert both rows visible; input value empty |
| Search hides non-matching archived rows | Expand archived; fill "engineer"; assert archived row hidden |
| Search matching archived row keeps it visible | Fill "phantom"; assert archived row visible |
| Clearing search restores archived rows | Fill then clear; assert archived row returns |

---

## Manual — `cleanJobUrl` utility

`cleanJobUrl` in `src/utils/dateFormat.js` was verified by running each site's typical URL patterns through a Node.js script. No automated test exists for this utility yet.

### LinkedIn

| Input | Output |
|-------|--------|
| `.../jobs/view/4168195487/?refId=…&trackingId=…&trk=…` | `.../jobs/view/4168195487/` |
| `.../jobs/view/4168195487/?trk=…&lipi=…` | `.../jobs/view/4168195487/` |
| `.../jobs/view/4168195487/` | unchanged |

### Indeed

| Input | Output |
|-------|--------|
| `…/viewjob?jk=abc123&utm_source=google&utm_medium=cpc&utm_campaign=jobs` | `…/viewjob?jk=abc123` |
| `…/viewjob?jk=abc123&from=serp&vjs=3&referer=…` | `…/viewjob?jk=abc123` |
| `…/applystart?jk=abc123&from=vj&pos=0&sjdu=…&astse=…` | `…/applystart?jk=abc123` |

### Glassdoor

| Input | Output |
|-------|--------|
| `…/job-listing/…JV_….htm?jl=…&src=GD_JOB_AD&t=SR&guid=…` | `…/job-listing/…JV_….htm` |
| `…/job-listing/apply/….htm?src=GD_JOB_AD&t=SR&guid=…` | `…/job-listing/apply/….htm` |

### ZipRecruiter

| Input | Output |
|-------|--------|
| `…/c/Acme/Job/Engineer?job=abc123&utm_source=google` | `…/c/Acme/Job/Engineer?job=abc123` |
| `…/jobs/acme-12345/engineer-abcdef?utm_source=linkedin&lvk=…` | `…/jobs/acme-12345/engineer-abcdef` |

### Monster

| Input | Output |
|-------|--------|
| `…/job-openings/engineer-acme--abc123?sid=…&jvo=…&utm_source=…` | `…/job-openings/engineer-acme--abc123` |
| `job-openings.monster.com/v2/job/abc123?mstr_dist=true&utm_source=…` | `job-openings.monster.com/v2/job/abc123` |

### Dice

| Input | Output |
|-------|--------|
| `…/job-detail/abc123?utm_source=google&trid=…` | `…/job-detail/abc123` |
| `…/jobs/detail/Engineer/Acme/abc123?utm_source=linkedin&src=…` | `…/jobs/detail/Engineer/Acme/abc123` |

### Greenhouse

| Input | Output |
|-------|--------|
| `boards.greenhouse.io/acme/jobs/123?gh_src=…` | `boards.greenhouse.io/acme/jobs/123` |
| `boards.greenhouse.io/acme/jobs/123?gh_src=…&utm_source=…` | `boards.greenhouse.io/acme/jobs/123` |
| `boards.greenhouse.io/embed/job_app?for=acme&token=123&gh_src=…` | `…?for=acme&token=123` |

### Unknown domains (blocklist fallback)

UTM params and other known trackers are stripped; unrecognised params are preserved.

| Input | Output |
|-------|--------|
| `jobs.acme.com/job/eng-123?utm_source=linkedin&custom_id=456` | `jobs.acme.com/job/eng-123?custom_id=456` |

---

## Running all tests

```bash
# Backend
cd server && npm test

# Frontend unit
npm test -- --watchAll=false

# E2E (starts CRA automatically if not already running)
npm run test:e2e
```
