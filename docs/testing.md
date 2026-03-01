# Testing

Three test layers cover the full stack:

| Layer | Tool | Count | Command |
|-------|------|-------|---------|
| Backend API | Jest + Supertest | 86 tests | `cd server && npm test` |
| Frontend components | Jest + React Testing Library | 37 tests | `npm test` |
| End-to-end | Playwright | 43 tests | `npm run test:e2e` |

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

### `auth.test.js` — 14 tests

| Test | What it verifies |
|------|-----------------|
| Register valid email + password | 201, user returned |
| Register — duplicate email | 409 |
| Register — invalid email format | 400 |
| Register — password < 8 chars | 400 |
| Register — password > 128 chars | 400 |
| Register — ALLOWED_EMAILS set, email not listed | 403 |
| Login — correct credentials | 200, JWT + user with display_name/photo/has_password |
| Login — wrong password | 401 |
| Login — unknown email | 401 (same response as wrong password — no user enumeration) |
| Login — missing body fields | 400 |
| Logout — authenticated | 204 |
| `GET /api/auth/me` — valid token | 200, user object with display_name/photo/has_password |
| `GET /api/auth/me` — no token | 401 |
| `GET /api/auth/me` — invalid token | 401 |
| `PUT /api/auth/profile` — update display_name | 200, updated user returned |
| `PUT /api/auth/profile` — update photo (base64 data URL) | 200, photo stored |
| `PUT /api/auth/profile` — photo > 300 KB | 400 |
| `PUT /api/auth/profile` — change password (correct current) | 200 |
| `PUT /api/auth/profile` — change password (wrong current) | 401 |
| `PUT /api/auth/profile` — set password on Google-only account | 200 (no current password required) |
| `PUT /api/auth/profile` — new password < 8 chars | 400 |
| `PUT /api/auth/profile` — no fields provided | 400 |
| `PUT /api/auth/profile` — unauthenticated | 401 |

### `jobs.test.js` — 30 tests

| Test | What it verifies |
|------|-----------------|
| `GET /api/jobs` — authenticated | 200, array of user's jobs |
| `GET /api/jobs` — unauthenticated | 401 |
| `POST /api/jobs` — valid body | 201, job with all fields returned |
| `POST /api/jobs` — company > 200 chars | 400 |
| `POST /api/jobs` — comments > 5000 chars | 400 |
| `POST /api/jobs` — source_link not http(s) | 400 |
| `PUT /api/jobs/:id` — own job | 200, updated |
| `PUT /api/jobs/:id` — another user's job | 403 |
| `DELETE /api/jobs/:id` — own job | 204 |
| `DELETE /api/jobs/:id` — another user's job | 403 |
| `DELETE /api/jobs/:id` — nonexistent id | 404 |
| … (additional field validation and auth coverage) | |

### `users.test.js` — 23 tests

| Test | What it verifies |
|------|-----------------|
| `GET /api/users` — admin token | 200, array (no passwords) |
| `GET /api/users` — contributor token | 403 |
| `PUT /api/users/:id/role` — admin promotes user | 200, updated role |
| `PUT /api/users/:id/role` — invalid role value | 400 |
| `DELETE /api/users/:id` — admin deletes other user | 204; user's jobs also deleted |
| `DELETE /api/users/:id` — admin deletes own account | 400 |
| … (unauthenticated access, edge cases) | |

### `logs.test.js` — 7 tests

| Test | What it verifies |
|------|-----------------|
| `GET /api/logs` — admin token | 200, array of log entries |
| `GET /api/logs` — contributor token | 403 |
| `GET /api/logs` — unauthenticated | 401 |
| … (log format, entry count) | |

### `dropdowns.test.js` — 12 tests

| Test | What it verifies |
|------|-----------------|
| `GET /api/dropdowns` — contributor | 200 |
| `POST /api/dropdowns/:field` — contributor | 403 |
| `POST /api/dropdowns/:field` — admin | 201 |
| `DELETE /api/dropdowns/option/:id` — contributor | 403 |
| `DELETE /api/dropdowns/option/:id` — admin | 204 |
| … (reorder, rename, edge cases) | |

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

### `AdminRoute.test.js` — 6 tests

| Test | What it verifies |
|------|-----------------|
| Contributor visits `/#/admin` | redirected to `/` |
| Unauthenticated visits `/#/admin` | redirected to `/login` |
| Admin visits `/#/admin` | AdminPage renders |
| Contributor visits `/#/logs` | redirected to `/` |
| Unauthenticated visits `/#/logs` | redirected to `/login` |
| Admin visits `/#/logs` | LogsPage renders |

### `DataTable.test.js` — 5 tests

| Test | What it verifies |
|------|-----------------|
| Renders element with `role="table"` | ARIA table structure |
| Table has `aria-label="Job applications"` | accessible name |
| Eye button has descriptive `aria-label` | includes Role + Company |
| Delete button has descriptive `aria-label` | includes Role + Company |
| Click delete button → modal shows | dialog with `aria-labelledby` |
| Confirm delete → row removed | row no longer in DOM |

### `AddJobModal.test.js` — 10 tests

| Test | What it verifies |
|------|-----------------|
| Modal has `aria-labelledby` on the dialog | wired to title element |
| Invalid date shows error with `id="date-error"` | `aria-describedby` set on input |
| Submit blocked when date error is active | `onAdd` not called |
| Submit valid form | `onAdd` called with correct shape |
| … (edit mode, date normalisation, hide behaviour) | |

### `Header.test.js` — 8 tests

| Test | What it verifies |
|------|-----------------|
| Navbar has `aria-label="Main navigation"` | landmark is labelled |
| Logo image has `alt=""` | decorative, not announced |
| Brand renders as a link | `role="link"` present |
| Admin user sees Manage item after opening dropdown | conditional rendering |
| Contributor user does not see Manage item | absent after dropdown opens |
| User with photo renders `<img>` avatar instead of letter span | photo takes priority |
| Dropdown header shows display_name when set | display_name replaces username |
| Edit Profile item present in dropdown | links to /profile |

### `ProfilePage.test.js` — 13 tests

| Test | What it verifies |
|------|-----------------|
| Renders Photo, Account, Password panels | section headers present |
| Display name input pre-filled from user | value equals `user.display_name` |
| Email field is read-only | `readOnly` attribute set |
| Password section hidden by default | password inputs absent |
| "Change password" reveals password inputs | inputs appear after click |
| "Cancel" hides password section | inputs removed from DOM |
| "Current password" shown only when `has_password` is true | conditional render |
| Save with mismatched passwords shows inline error | error message visible |
| Save with short new password shows inline error | error message visible |
| Successful save calls `updateUser` with response data | mock verified |
| Google import banner shown when `authGooglePicture` set and no photo | banner rendered |
| Google import banner hidden when user already has a photo | banner not rendered |
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

### `jobs.spec.js` — 9 tests

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
| Saving edit updates row inline | Select row → Edit; change Role; Save Changes; assert updated text |

> **ARIA / selector notes**:
> - `Modal.Title` renders as `<div class="modal-title h4">` — use `.locator(".modal-title")`
> - Row selection: `table.getByRole("row").filter({ hasText: /.../ }).click()` then click toolbar button
> - Confirm delete button: `{ name: "Delete", exact: true }` to avoid matching the toolbar button
> - `Form.Group` has no `controlId` — select text inputs by `nth()` index (Date=0, Role=1, Company=2)

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
