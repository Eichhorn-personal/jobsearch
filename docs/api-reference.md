# API Reference

All endpoints are prefixed with `/api`. In development the frontend proxies `/api/*` to `http://localhost:3001` via `src/setupProxy.js`.

Authentication is via `Authorization: Bearer <token>` on every protected endpoint. A 401 response from any endpoint causes the frontend to log out and redirect to `/#/login`.

---

## Auth — `/api/auth`

### `POST /api/auth/register`

Create a new account.

**Body**
```json
{ "username": "user@example.com", "password": "secret123" }
```

**Responses**

| Status | Body |
|--------|------|
| 201 | `{ "id": 1, "username": "user@example.com" }` |
| 400 | `{ "error": "..." }` — missing fields, invalid email, password too short (<8) or too long (>128) |
| 403 | `{ "error": "Registration not allowed" }` — `ALLOWED_EMAILS` env var set and email not listed |
| 409 | `{ "error": "Email already registered" }` |

Rate limited: 10 requests per 15 minutes.

---

### `POST /api/auth/login`

Authenticate with email/password.

**Body**
```json
{ "username": "user@example.com", "password": "secret123" }
```

**Responses**

| Status | Body |
|--------|------|
| 200 | `{ "token": "<jwt>", "user": { "id": 1, "username": "...", "role": "contributor", "display_name": null, "photo": null, "has_password": true } }` |
| 400 | `{ "error": "..." }` — missing fields |
| 401 | `{ "error": "Invalid credentials" }` |

Rate limited: 10 requests per 15 minutes. Both wrong-password and unknown-email return 401 with the same message and similar timing (no user enumeration).

---

### `POST /api/auth/google`

Exchange a Google credential (ID token from the frontend's `GoogleLogin` button) for a JWT.

**Body**
```json
{ "credential": "<google-id-token>" }
```

**Responses**

| Status | Body |
|--------|------|
| 200 | `{ "token": "<jwt>", "user": { "id": 1, "username": "...", "role": "contributor", "display_name": null, "photo": null, "has_password": false }, "google_picture": "<url-or-null>" }` |
| 401 | `{ "error": "Google sign-in failed" }` |

New Google users are created automatically with role `contributor`. If `ADMIN_EMAIL` matches the Google account, the role is set to `admin` at creation time. `google_picture` is the Google-hosted avatar URL from the ID token payload; the frontend stores it in `localStorage` (`authGooglePicture`) and offers a one-time import prompt on the Profile page if the user has no photo yet.

---

### `POST /api/auth/logout`

Best-effort server-side logout (logs the event). No token invalidation (stateless JWT).

**Auth**: Required

**Responses**: 204 No Content

---

### `GET /api/auth/me`

Return the current user's profile (re-read from DB).

**Auth**: Required

**Responses**

| Status | Body |
|--------|------|
| 200 | `{ "id": 1, "username": "...", "role": "contributor", "display_name": null, "photo": null, "has_password": true }` |
| 401 | Missing or invalid token |

---

### `PUT /api/auth/profile`

Update the current user's display name, photo, and/or password. All fields are optional; include only what you want to change.

**Auth**: Required (any role)

**Body**
```json
{
  "display_name": "Jane Smith",
  "photo": "data:image/jpeg;base64,...",
  "google_picture_url": "https://lh3.googleusercontent.com/...",
  "current_password": "oldpass",
  "new_password": "newpass123"
}
```

- `photo` — base64 data URL (max 300 KB string length). Provide `null` to remove.
- `google_picture_url` — alternative to `photo`; the server fetches the image from `*.googleusercontent.com` and stores it as base64. Host is validated; other origins are rejected.
- `current_password` — required when changing password **and** the account already has a password hash. Omit for Google-only accounts (empty password hash) setting a password for the first time.
- `new_password` — 8–128 characters.

**Responses**

| Status | Body |
|--------|------|
| 200 | Updated user object (`id`, `username`, `role`, `display_name`, `photo`, `has_password`) |
| 400 | Validation error (missing current password, password length, invalid photo, no fields given) |
| 401 | Wrong current password |
| 502 | Could not fetch photo from Google |

---

## Jobs — `/api/jobs`

All jobs routes require authentication. Users only see and modify their own jobs.

### `GET /api/jobs`

Return all jobs for the current user, ordered by `id ASC`.

**Response**: 200 — array of job objects (see field mapping below)

---

### `POST /api/jobs`

Create a new job.

**Body**: Job fields object (see field mapping below)

**Responses**

| Status | Body |
|--------|------|
| 201 | Created job object |
| 400 | `{ "error": "..." }` — validation failure |

---

### `PUT /api/jobs/:id`

Update an existing job.

**Body**: Job fields object (partial updates supported — omitted fields keep current values)

**Responses**

| Status | Body |
|--------|------|
| 200 | Updated job object |
| 400 | Validation error |
| 403 | Job belongs to another user |
| 404 | Job not found |

---

### `DELETE /api/jobs/:id`

Delete a job.

**Responses**

| Status | Body |
|--------|------|
| 204 | No content |
| 403 | Job belongs to another user |
| 404 | Job not found |

---

### Job field mapping

The frontend uses space-delimited field names; the database uses snake_case. The API accepts and returns frontend names.

| Frontend field | DB column | Type | Notes |
|----------------|-----------|------|-------|
| `id` | `id` | integer | Auto-assigned |
| `Date` | `date` | string | Format: `MM/DD/YYYY` |
| `Role` | `role` | string | Max 200 chars |
| `Company` | `company` | string | Max 200 chars |
| `Source Link` | `source_link` | string | Must start with `http://` or `https://`; max 2000 chars |
| `Company Link` | `company_link` | string | Must start with `http://` or `https://`; max 2000 chars |
| `Resume` | `resume` | boolean | Stored as 0/1 |
| `Cover Letter` | `cover_letter` | boolean | Stored as 0/1 |
| `Status` | `status` | string | Default `Applied` |
| `Recruiter` | `recruiter` | string | Max 200 chars |
| `Hiring Mgr` | `hiring_mgr` | string | Max 200 chars |
| `Panel` | `panel` | string | Max 200 chars |
| `HR` | `hr` | string | Max 200 chars |
| `Comments` | `comments` | string | Max 5000 chars |

---

## Users — `/api/users`

All users routes require **admin** role.

### `GET /api/users`

Return all users (passwords excluded).

**Response**: 200 — `[{ "id": 1, "username": "...", "role": "...", "created_at": "..." }, ...]`

---

### `PUT /api/users/:id/role`

Change a user's role.

**Body**: `{ "role": "admin" }` or `{ "role": "contributor" }`

**Responses**

| Status | Body |
|--------|------|
| 200 | Updated user object |
| 400 | Invalid role value |
| 404 | User not found |

---

### `DELETE /api/users/:id`

Delete a user and all their jobs (cascade).

**Responses**

| Status | Body |
|--------|------|
| 204 | No content |
| 400 | `{ "error": "Cannot delete your own account" }` |
| 404 | User not found |

---

## Dropdowns — `/api/dropdowns`

Manage the dropdown option lists shown in the Add/Edit job form.

### `GET /api/dropdowns`

Return all dropdown options grouped by field name. **Auth**: Required (any role).

**Response**: `{ "Status": [{ "id": 1, "label": "Applied", "sort_order": 0, "color": null }, ...], ... }`

Each option includes a `color` field — a CSS class name (e.g. `"status-applied"`) or `null` for auto-detection.

---

### `POST /api/dropdowns/:field`

Add a new option to a field. **Auth**: Admin only.

**Body**: `{ "label": "Screening" }`

**Response**: 201 — `{ "id": 5, "label": "Screening", "sort_order": 4, "color": null }`

---

### `PUT /api/dropdowns/option/:id`

Rename and/or set the chip color for an option. At least one field must be provided. **Auth**: Admin only.

**Body**: `{ "label": "New label", "color": "status-applied" }` — both fields optional; omit either to leave it unchanged. Send `"color": ""` or `"color": null` to reset to auto.

**Response**: 200 — updated option object (includes `color`)

---

### `PUT /api/dropdowns/:fieldName/reorder`

Bulk-update sort order. **Auth**: Admin only.

**Body**: `{ "orderedIds": [3, 1, 2] }` — array of option IDs in desired display order.

**Response**: 200 — `{ "ok": true }`

---

### `DELETE /api/dropdowns/option/:id`

Delete a dropdown option. **Auth**: Admin only.

**Response**: 204

---

## Logs — `/api/logs`

### `GET /api/logs`

Return all activity log entries, newest-first. **Auth**: Admin only.

**Response**: `[{ "timestamp": "...", "event": "JOB_CREATED", "email": "...", ... }, ...]`

The `id` field is excluded from the returned entries.

---

## Health

### `GET /api/health`

No auth required. Used by keep-alive pinger.

**Response**: 200 — `{ "ok": true }`

---

## Activity log events

| Event | Logged fields |
|-------|--------------|
| `USER_CREATED` | `email`, `source` (`password` or `google`) |
| `USER_LOGIN` | `email`, `source` |
| `USER_LOGOUT` | `email` |
| `USER_PROFILE_UPDATED` | `id`, `email` |
| `USER_ROLE_CHANGED` | `adminEmail`, `targetId`, `targetEmail`, `newRole` |
| `USER_DELETED` | `adminEmail`, `targetId`, `targetEmail` |
| `GOOGLE_ACCOUNT_LINKED` | `id`, `email` |
| `JOB_CREATED` | `id`, `email`, `role`, `company` |
| `JOB_UPDATED` | `id`, `email`, `role`, `company` |
| `JOB_DELETED` | `id`, `email`, `role`, `company` |

Log format: `[ISO_TIMESTAMP] EVENT_NAME key="value" ...`
