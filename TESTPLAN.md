# JobTracker Test Plan

## Recommended Test Framework Stack

### Three layers, three tools:

**1. Backend API — Jest + Supertest**
- Already in the ecosystem (Jest ships with CRA, Supertest is the standard Express testing companion)
- Tests run against a real Express app with an **in-memory SQLite database** (`:memory:`) — no test data bleeds into dev DB, no cleanup needed
- Covers auth, authorization, input validation, all CRUD routes
- Fast: no browser, no network

**2. Frontend components — Jest + React Testing Library**
- Already bundled with CRA — zero install, zero config
- Renders components in jsdom, fires events, asserts on DOM output
- Covers form validation, conditional rendering, error states, role guards
- Mocks `fetch`/`useApi` so no real backend needed

**3. End-to-end — Playwright**
- Best modern E2E tool: cross-browser, fast, reliable, built-in accessibility assertions
- Tests the full stack: real browser → real frontend → real backend (test instance)
- Handles the login flow, table interactions, modals
- Google OAuth is mocked at the API layer (test endpoint bypasses Google verification)

---

## Layer 1: Backend API Tests (`server/tests/`)

### Auth routes (`auth.test.js`)

| Test | Assertion |
|------|-----------|
| `POST /api/auth/register` — valid email + password | 201, user returned |
| `POST /api/auth/register` — duplicate email | 409 |
| `POST /api/auth/register` — invalid email format | 400 |
| `POST /api/auth/register` — password too short (<8) | 400 |
| `POST /api/auth/register` — password too long (>128) | 400 |
| `POST /api/auth/register` — ALLOWED_EMAILS set, email not in list | 403 |
| `POST /api/auth/login` — correct credentials | 200, JWT in response |
| `POST /api/auth/login` — wrong password | 401 |
| `POST /api/auth/login` — unknown email | 401 (same timing as wrong password) |
| `POST /api/auth/login` — missing body fields | 400 |
| `POST /api/auth/logout` — authenticated | 204 |
| `GET /api/auth/me` — valid token | 200, user object with `display_name`, `photo`, `has_password` |
| `GET /api/auth/me` — no token | 401 |
| `GET /api/auth/me` — expired/invalid token | 401 |
| `PUT /api/auth/profile` — update display_name | 200, updated user returned |
| `PUT /api/auth/profile` — update photo (base64 data URL) | 200, photo stored |
| `PUT /api/auth/profile` — photo too large (>300 KB) | 400 |
| `PUT /api/auth/profile` — change password (correct current password) | 200 |
| `PUT /api/auth/profile` — change password (wrong current password) | 401 |
| `PUT /api/auth/profile` — set password on Google-only account (no current password required) | 200 |
| `PUT /api/auth/profile` — new password too short (<8) | 400 |
| `PUT /api/auth/profile` — no fields provided | 400 |
| `PUT /api/auth/profile` — unauthenticated | 401 |
| Rate limiter — 11 requests to `/login` in <15 min | 11th returns 429 |

### Jobs routes (`jobs.test.js`)

| Test | Assertion |
|------|-----------|
| `GET /api/jobs` — authenticated | 200, array |
| `GET /api/jobs` — unauthenticated | 401 |
| `POST /api/jobs` — valid body | 201, job returned |
| `POST /api/jobs` — company name >200 chars | 400 |
| `POST /api/jobs` — comments >5000 chars | 400 |
| `POST /api/jobs` — source_link not starting with http | 400 |
| `PUT /api/jobs/:id` — own job | 200, updated |
| `PUT /api/jobs/:id` — another user's job | 403 |
| `DELETE /api/jobs/:id` — own job | 204 |
| `DELETE /api/jobs/:id` — another user's job | 403 |
| `DELETE /api/jobs/:id` — nonexistent id | 404 |

### Users routes (`users.test.js`) — admin-only

| Test | Assertion |
|------|-----------|
| `GET /api/users` — admin token | 200, array (no passwords) |
| `GET /api/users` — contributor token | 403 |
| `PUT /api/users/:id/role` — admin promotes user | 200, updated role |
| `PUT /api/users/:id/role` — invalid role value | 400 |
| `DELETE /api/users/:id` — admin deletes user | 204; user's jobs also deleted |
| `DELETE /api/users/:id` — admin deletes own account | 400 |

### Logs route (`logs.test.js`)

| Test | Assertion |
|------|-----------|
| `GET /api/logs` — admin token | 200, array |
| `GET /api/logs` — contributor token | 403 |
| `GET /api/logs` — unauthenticated | 401 |

### Dropdowns route (`dropdowns.test.js`)

| Test | Assertion |
|------|-----------|
| `GET /api/dropdowns` — contributor | 200 |
| `POST /api/dropdowns/:field` — contributor | 403 |
| `POST /api/dropdowns/:field` — admin | 201 |
| `DELETE /api/dropdowns/option/:id` — contributor | 403 |
| `DELETE /api/dropdowns/option/:id` — admin | 204 |

---

## Layer 2: Frontend Component Tests (`src/tests/`)

### LoginPage (`LoginPage.test.js`)

| Test | Assertion |
|------|-----------|
| Renders "Sign in to JobTracker" h1 | heading present |
| Toggle to register mode | h1 changes to "Create account" |
| Submit with empty fields | form doesn't call fetch |
| API error shown in alert | `role="alert"` contains error text |
| Alert is in aria-live region | `aria-live="polite"` wrapper present |
| Mode toggle buttons have `type="button"` | don't accidentally submit form |

### AdminRoute guard (`AdminRoute.test.js`)

| Test | Assertion |
|------|-----------|
| Contributor user visits `/admin` | redirected to `/` |
| Unauthenticated user visits `/admin` | redirected to `/login` |
| Admin user visits `/admin` | AdminPage renders |
| Contributor user visits `/logs` | redirected to `/` |
| Unauthenticated user visits `/logs` | redirected to `/login` |
| Admin user visits `/logs` | LogsPage renders |

### DataTable (`DataTable.test.js`)

| Test | Assertion |
|------|-----------|
| Renders ARIA table roles | `role="table"` present |
| Eye button has accessible label | `aria-label` contains job role + company |
| Delete button has accessible label | `aria-label` contains job role + company |
| Click delete button — modal appears | modal with `aria-labelledby` rendered |
| Confirm delete — job removed from DOM | row no longer present |

### AddJobModal (`AddJobModal.test.js`)

| Test | Assertion |
|------|-----------|
| Modal has `aria-labelledby` pointing to title | wired correctly |
| Invalid date shows error with id | `id="date-error"` present; input has `aria-describedby` |
| Submit with date error blocked | `onAdd` not called |
| Submit valid form | `onAdd` called with correct data |

### Header (`Header.test.js`)

| Test | Assertion |
|------|-----------|
| Logo has `alt=""` | decorative, not announced |
| Brand is a link | renders as `<a>` |
| Navbar has `aria-label="Main navigation"` | landmark labelled |
| Admin user sees Manage item | present in dropdown |
| Contributor user does not see Manage | absent |
| User with photo shows `<img>` avatar | letter span replaced by img |
| Dropdown header shows display_name when set | display_name rendered, not username |
| Edit Profile item links to /profile | present in dropdown |

### ProfilePage (`ProfilePage.test.js`)

| Test | Assertion |
|------|-----------|
| Renders Photo, Account, Password panels | all three section headers present |
| Display name field pre-filled from user | input value equals user.display_name |
| Email field is read-only | input has `readOnly` attribute |
| Password section hidden by default | password inputs not in DOM |
| "Change password" button reveals password inputs | inputs appear after click |
| "Cancel" hides password section again | inputs removed from DOM |
| "Current password" shown only when `has_password` is true | conditional render |
| Save with mismatched passwords shows error | error message visible |
| Save with short new password shows error | error message visible |
| Successful save calls `updateUser` | mock verifies call with response data |
| Google import banner shown when `authGooglePicture` set and no photo | banner rendered |
| Google import banner hidden when user already has photo | banner not rendered |
| Dismiss clears `authGooglePicture` from localStorage | key removed |

---

## Layer 3: E2E Tests — Playwright (`e2e/`)

**Setup**: Playwright starts the Express server on a test port with an in-memory SQLite DB and a
pre-seeded admin user. Google OAuth disabled — a `POST /api/auth/test-login` endpoint (enabled only
in `NODE_ENV=test`) issues a JWT directly.

### Auth flow (`auth.spec.js`)

| Test | Steps |
|------|-------|
| Register → auto-login → land on home | fill form, submit, assert DataTable visible |
| Login with wrong password | error alert announced |
| Login with correct credentials | JWT stored, redirected to home |
| Logout | click logout, redirected to login, JWT cleared |

### Job management (`jobs.spec.js`)

| Test | Steps |
|------|-------|
| Add a job | click Add Job, fill form, save — row appears in table |
| Edit a job | click eye icon, change company, save — table updated |
| Delete a job | click delete icon, confirm — row gone |
| Cancel delete | click delete, click Cancel — row still present |

### Admin page (`admin.spec.js`)

| Test | Steps |
|------|-------|
| Contributor redirected from /admin | navigate, assert redirect to / |
| Admin sees user table | users list rendered |
| Admin changes user role | select changes, persists on reload |
| Admin deletes user | confirm modal, user gone from list |
| Add dropdown option | type in field, click Add, option appears |
| Reorder dropdown option | click ▲, order changes |

### Accessibility (`a11y.spec.js`) — using `@axe-core/playwright`

| Test | Steps |
|------|-------|
| Login page has no axe violations | `checkA11y()` passes |
| Home/DataTable page has no axe violations | after login, `checkA11y()` passes |
| Admin page has no axe violations | as admin, `checkA11y()` passes |
| Skip link is first focusable element | Tab once, assert skip link focused |
| Skip link jumps to main content | activate skip link, assert `#main-content` focused |
| All modals trap focus | open modal, Tab through, assert no escape |

---

## Priority Order to Implement

1. **Backend API tests** — highest value, fastest to write, no browser needed, catches security regressions
2. **Playwright E2E auth + jobs** — validates the critical user path works end-to-end
3. **Playwright a11y scans** — `axe-core` catches regressions automatically on every deploy
4. **Frontend component tests** — fills gaps between unit and E2E
