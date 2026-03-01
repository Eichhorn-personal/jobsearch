# Code Reference

## Frontend entry point

### `src/index.js`

Mounts the React app. Wraps everything in (outermost first):

1. `GoogleOAuthProvider` — provides Google client ID to `GoogleLogin` buttons
2. `ThemeProvider` — light/dark theme state
3. `HashRouter` — hash-based routing for GitHub Pages compatibility
4. `App` — route definitions

---

## App — `src/App.js`

Defines all routes and layout wrappers.

### Route guards

**`ProtectedRoute`** — redirects to `/#/login` if `user` is null.

**`AdminRoute`** — redirects to `/#/login` if unauthenticated; redirects to `/#/` if authenticated but not admin.

### `PageLayout`

Renders the full-page shell: skip link → `<Header>` → `<main id="main-content">` → `<Footer>`. Used by all protected routes.

---

## Contexts

### `AuthContext` — `src/context/AuthContext.js`

```js
const { user, login, logout, updateUser } = useAuth();
```

| Property | Type | Description |
|----------|------|-------------|
| `user` | `object \| null` | `{ id, username, role, display_name, photo, has_password }` — null when not logged in |
| `login(token, userData, googlePicture?)` | function | Writes token + user to localStorage; optionally stores `googlePicture` URL as `authGooglePicture`; sets `user` state |
| `logout()` | function | POSTs to `/api/auth/logout` (best-effort), clears localStorage (`authToken`, `authUser`, `authGooglePicture`), sets `user` to null |
| `updateUser(updatedUser)` | function | Patches `authUser` in localStorage and updates `user` state — used by ProfilePage after a successful `PUT /api/auth/profile` |

State is initialised from `localStorage` so the session survives page refreshes.

---

### `ThemeContext` — `src/context/ThemeContext.js`

```js
const { theme, toggleTheme } = useTheme();
```

| Property | Type | Description |
|----------|------|-------------|
| `theme` | `'light' \| 'dark'` | Current theme |
| `toggleTheme()` | function | Toggles between light and dark |

Applies `data-bs-theme` to `<html>` (Bootstrap's built-in theming). Persists to `localStorage` (`theme` key). Applied synchronously in the state initialiser to prevent flash of wrong theme.

---

## Hooks

### `useApi` — `src/hooks/useApi.js`

```js
const { request } = useApi();
const res = await request("/api/jobs", { method: "POST", body: JSON.stringify(data) });
```

A thin wrapper around `fetch` that:
- Reads `authToken` from localStorage and adds `Authorization: Bearer <token>` to every request
- Prefixes `process.env.REACT_APP_API_URL` (empty in development — the proxy handles it)
- On a 401 response: calls `logout()` and navigates to `/#/login`, then throws

---

## Components

### `Header` — `src/components/Header.js`

Top navigation bar. Rendered inside `PageLayout` on all authenticated pages.

- Brand: `JobTracker` logo + text — links to `/#/`
- Logo image has `alt=""` (decorative, not announced by screen readers)
- Right side: `NavDropdown` whose toggle is:
  - A circular `<img>` of `user.photo` if a photo is stored, otherwise a letter-avatar `<span>` with the first character of the username
  - Dropdown header shows `user.display_name` if set, otherwise `user.username`
  - Admin users see a **Manage** button linking to `/#/admin`
  - All users see **Edit Profile** (links to `/#/profile`) and **Sign out**
- `aria-label="Main navigation"` on the `<nav>` element

---

### `Footer` — `src/components/Footer.js`

Simple footer rendered at the bottom of every page via `PageLayout`.

---

### `DataTable` — `src/components/DataTable.js`

Main job-tracking table.

**Columns**: Date (100 px fixed), Role (flex), Company (flex), Status (130 px fixed), plus an icon column (56 px fixed) for action buttons.

**State**

| State | Description |
|-------|-------------|
| `rows` | Array of job objects loaded from `GET /api/jobs` |
| `dropdownOptions` | Options per field from `GET /api/dropdowns` |
| `showAddModal` | Boolean — controls AddJobModal in add mode |
| `viewingRow` | Row object — controls AddJobModal in edit mode |
| `confirmRow` | Row object — controls the delete-confirmation modal |

**Handlers**

| Handler | Description |
|---------|-------------|
| `handleAddJob(formData)` | POSTs to `/api/jobs`; appends returned job to `rows` |
| `handleSaveJob(formData)` | Updates `rows` optimistically, then PUTs to `/api/jobs/:id` |
| `deleteRow(id)` | Removes from `rows` optimistically, then DELETEs `/api/jobs/:id` |

**ARIA structure**

The custom table uses `role="table"` / `role="rowgroup"` / `role="row"` / `role="columnheader"` / `role="cell"` divs. The table has `aria-label="Job applications"`.

Action buttons have descriptive `aria-label` values:
- Eye button: `View or edit {Role} at {Company}`
- Delete button: `Delete {Role} at {Company}`

---

### `AddJobModal` — `src/components/AddJobModal.js`

A React Bootstrap `Modal` used for both adding and editing jobs. The parent passes a `key` prop so it unmounts and remounts fresh for each new job being viewed.

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `show` | boolean | Controls modal visibility |
| `onHide` | function | Called when the user dismisses the modal |
| `onAdd` | function | Called with form data on submit in add mode |
| `onSave` | function | Called with form data on submit in edit mode |
| `initialData` | object \| null | Pre-fills the form when editing; null for new jobs |
| `dropdownOptions` | object | `{ Status: ["Applied", ...], ... }` — options for select fields |

**Mode**: `isEditing = !!initialData`. Submit button reads "Add Job" or "Save Changes" accordingly.

**Date handling**: The `Date` field accepts flexible input. On blur, `formatDate()` normalises it to `MM/DD/YYYY`. An inline error is shown if parsing fails; submission is blocked until it's fixed.

**URL handling**: Source Link and Company Link have an `onPaste` handler that calls `cleanJobUrl()` to strip tracking parameters before the value is set. If the pasted text is already clean, the default paste behaviour runs unchanged.

**Focus lock**: The modal uses `backdrop="static"` and `keyboard={false}` so it only closes when the user explicitly clicks Cancel or the submit button — not on outside click or Escape.

**Note**: `Form.Group` does not use `controlId`, so the `<label>` elements are not programmatically associated with their `<input>` elements via `htmlFor`. In tests, select form inputs by type and index.

---

## Pages

### `LoginPage` — `src/pages/LoginPage.js`

Handles both sign-in and register in one view, toggled by mode state.

- Renders a `GoogleLogin` button (from `@react-oauth/google`)
- Email/password form below an "or" divider
- Errors displayed in an `aria-live="polite"` + `role="alert"` region
- Successful login or register → calls `AuthContext.login()` → navigates to `/#/`
- After register, auto-logs in with the same credentials

---

### `AdminPage` — `src/pages/AdminPage.js`

Admin-only management console. Accessible at `/#/admin`.

Sections:
1. **Users** — table of all users; role dropdown (saves on change); delete button (confirms, cascades to jobs; cannot delete own account)
2. **Dropdown options** — add/rename/reorder/delete options per field (e.g. Status values)
3. **Download Data** — exports all jobs as a JSON file
4. **View Logs** — navigates to `/#/logs`

---

### `LogsPage` — `src/pages/LogsPage.js`

Admin-only activity log viewer. Accessible at `/#/logs`. Displays log entries newest-first with all key=value pairs rendered as small uniform tags. The `id` field is excluded from display.

---

### `ProfilePage` — `src/pages/ProfilePage.js`

User profile editor. Accessible at `/#/profile` (any logged-in user).

**Sections**

| Section | Content |
|---------|---------|
| **Google photo banner** | Shown once per login session (if `authGooglePicture` is in localStorage and the user has no stored photo). "Import" fetches the photo server-side via `PUT /api/auth/profile` with `google_picture_url`; "Dismiss" clears the localStorage key. |
| **Photo** | 96×96 circular preview. "Change photo" opens a hidden `<input type="file">`; the selected image is cover-cropped and resized to 96×96 JPEG via `<canvas>` before storing as a base64 data URL. "Remove" clears the photo. |
| **Account** | Display name text input (editable); email address (read-only). |
| **Password** | Hidden by default; toggled with "Change password". Shows "Current password" only if `user.has_password` is true (Google-only accounts can set a password without providing a current one). |

On submit: `PUT /api/auth/profile` → on success calls `updateUser(data)` to sync the header avatar and display name immediately, then shows an inline success message.

---

## Utilities

### `dateFormat.js` — `src/utils/dateFormat.js`

#### `formatDate(value)`

```js
import { formatDate } from "../utils/dateFormat";
formatDate("2/3")        // → "02/03/2025" (current year)
formatDate("2/3/25")     // → "02/03/2025"
formatDate("02/03/2025") // → "02/03/2025"
formatDate("not a date") // → null
```

Used by `AddJobModal` for live date validation on blur.

#### `cleanJobUrl(value)`

```js
import { cleanJobUrl } from "../utils/dateFormat";
cleanJobUrl("https://www.linkedin.com/jobs/view/123/?trk=abc&refId=xyz") // → "https://www.linkedin.com/jobs/view/123/"
cleanJobUrl("https://www.indeed.com/viewjob?jk=abc123&utm_source=google") // → "https://www.indeed.com/viewjob?jk=abc123"
cleanJobUrl("not a url") // → "not a url" (returned as-is)
```

Strips tracking parameters and hash fragments from job URLs. Called `onPaste` in `AddJobModal` for the Source Link and Company Link fields.

**Strategy**: two-tier.

1. **Site allowlist** — for known job boards, only explicitly listed query params are kept; everything else is stripped.
2. **Blocklist fallback** — for unknown domains, a set of common tracking param names (UTM, LinkedIn, Google, Facebook, etc.) is removed; unrecognised params are left untouched.

**Site allowlists**

| Domain | Kept params | Rationale |
|--------|-------------|-----------|
| `indeed.com` | `jk` | Job identifier is a query param |
| `linkedin.com` | _(none)_ | Job ID is in the path |
| `glassdoor.com` | _(none)_ | Job ID is in the path |
| `ziprecruiter.com` | `job` | Job identifier is a query param |
| `monster.com` | _(none)_ | Job ID is in the path |
| `dice.com` | _(none)_ | Job ID is in the path |
| `greenhouse.io` | `for`, `token` | Needed for embedded board URLs |

Subdomain matching is handled automatically (`www.indeed.com`, `boards.greenhouse.io`, etc.).

---

## Server middleware

### `authenticate` — `server/middleware/authenticate.js`

Express middleware applied to all protected route groups.

1. Reads `Authorization: Bearer <token>` header
2. Verifies JWT signature with `JWT_SECRET`
3. Re-fetches the user row from SQLite by the `sub` (id) in the payload — this ensures role changes propagate immediately without waiting for token expiry
4. Sets `req.user = { id, username, role }`
5. Returns 401 on any failure

---

## Server utilities

### `logger` — `server/logger.js`

```js
const { log } = require("../logger");
log("JOB_CREATED", { id: 1, email: "user@example.com", role: "Engineer", company: "Acme" });
// → [2025-01-15T10:30:00.000Z] JOB_CREATED id="1" email="user@example.com" role="Engineer" company="Acme"
```

Appends structured log lines to `server/app.log` (overridden by `LOG_PATH` env var) and also writes to stdout. The file is gitignored.
