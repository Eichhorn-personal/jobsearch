# Testing

Three test layers cover the full stack:

| Layer | Tool | Count | Command |
|-------|------|-------|---------|
| Backend API | Jest + Supertest | 86 tests | `cd server && npm test` |
| Frontend components | Jest + React Testing Library | 35 tests | `npm test` |
| End-to-end | Playwright | 21 tests | `npm run test:e2e` |

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
| Login — correct credentials | 200, JWT returned |
| Login — wrong password | 401 |
| Login — unknown email | 401 (same response as wrong password — no user enumeration) |
| Login — missing body fields | 400 |
| Logout — authenticated | 204 |
| `GET /api/auth/me` — valid token | 200, user object |
| `GET /api/auth/me` — no token | 401 |
| `GET /api/auth/me` — invalid token | 401 |

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
| Renders "Sign in to JobTracker" heading | `role="heading"` present |
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

### `Header.test.js` — 5 tests

| Test | What it verifies |
|------|-----------------|
| Navbar has `aria-label="Main navigation"` | landmark is labelled |
| Logo image has `alt=""` | decorative, not announced |
| Brand renders as a link | `role="link"` present |
| Admin user sees Manage item after opening dropdown | conditional rendering |
| Contributor user does not see Manage item | absent after dropdown opens |

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

### `auth.spec.js` — 5 tests

| Test | Flow |
|------|------|
| Unauthenticated → redirected to `/#/login` | Navigate to `/#/`; assert URL |
| "Sign in to JobTracker" heading renders | Navigate to `/#/login`; assert heading |
| Toggle to register mode | Click Register button; assert heading changes |
| Successful login redirects home | Fill form; submit; assert URL and username in header |
| Invalid credentials shows error alert | Mock 401; fill form; submit; assert alert text |
| Logout returns to `/#/login` | Click username dropdown → Logout; assert URL |

### `jobs.spec.js` — 10 tests

Each test starts with auth pre-seeded and waits for the job table to be visible.

| Test | Flow |
|------|------|
| Displays all sample jobs | Assert Role + Company text visible in table |
| Table has correct column headers | Assert Date, Role, Company, Status columnheaders |
| Opens Add Job modal | Click Add Job; assert dialog + modal title |
| Submit add form → new row appears | Fill Role + Company; submit; assert new text in table |
| Delete icon shows confirmation dialog | Click trash button; assert dialog + title |
| Cancel delete keeps the row | Click trash → Cancel; assert button still visible |
| Confirm delete removes the row | Click trash → Delete (exact); assert button gone |
| Eye icon opens modal pre-filled | Click eye; assert dialog title "Edit Job" + input values |
| Saving edit updates row | Click eye; change Role; Save Changes; assert new text in table |

> **ARIA notes for selectors**:
> - `Modal.Title` renders as `<div class="modal-title h4">`, not an `<h>` element — use `.locator(".modal-title")`
> - Action cell aria-labels include job names as substrings — use `{ name: "Delete", exact: true }` for the confirm button; use `getByText(job.Role, { exact: true })` for cell content
> - `Form.Group` has no `controlId` — labels aren't associated with inputs — select text inputs by `nth()` index (Date=0, Role=1, Company=2)

### `navigation.spec.js` — 6 tests

| Test | Flow |
|------|------|
| Contributor visiting `/#/admin` → redirected to `/#/` | Navigate; assert URL |
| Contributor visiting `/#/logs` → redirected to `/#/` | Navigate; assert URL |
| Admin sees Manage item in dropdown | Click username; assert "Manage" visible |
| Contributor does not see Manage item | Click username; assert "Logout" visible, "Manage" not visible |
| Manage link navigates to `/#/admin` | Click username → Manage; assert URL |
| Skip link is present in DOM | Assert skip-to-content link attached |

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
