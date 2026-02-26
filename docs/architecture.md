# Architecture

## System overview

```
Browser
  └─ React 19 (CRA, HashRouter)          port 3000
       └─ http-proxy-middleware           proxies /api/* → localhost:3001
  └─ Node/Express 5 (better-sqlite3)     port 3001
```

The frontend and backend are developed together in one repository but deployed to separate services.

## Frontend

| Concern | Technology |
|---------|-----------|
| Framework | React 19 |
| Bundler | Create React App 5 (react-scripts) |
| Router | `react-router-dom` v7 — **HashRouter** (required for GitHub Pages) |
| UI | React Bootstrap 2 + Bootstrap 5 |
| Auth provider | `@react-oauth/google` |
| Dev proxy | `src/setupProxy.js` via `http-proxy-middleware` |

> **Why `setupProxy.js` instead of the `"proxy"` field in `package.json`?**
> The `"proxy"` field causes an `allowedHosts[0] should be a non-empty string` crash in react-scripts 5.0.1.

### Routing

All routes are hash-based (`/#/path`) because the app is hosted on GitHub Pages which cannot serve arbitrary paths.

| Hash route | Component | Auth guard |
|------------|-----------|-----------|
| `/#/login` | `LoginPage` | None |
| `/#/` | `DataTable` | `ProtectedRoute` (any logged-in user) |
| `/#/admin` | `AdminPage` | `AdminRoute` (role = `admin`) |
| `/#/logs` | `LogsPage` | `AdminRoute` (role = `admin`) |

## Backend

| Concern | Technology |
|---------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | SQLite via `better-sqlite3` (synchronous, single-file) |
| Auth | JWT (HS256, 8-hour expiry) via `jsonwebtoken` |
| Password hashing | `bcryptjs` |
| Google OAuth | `google-auth-library` (verifies credential from frontend) |
| Security headers | `helmet` |
| Rate limiting | `express-rate-limit` (10 req / 15 min on login + register; disabled in `NODE_ENV=test`) |

### Authentication flow

```
Username/password login
  POST /api/auth/login  →  bcrypt.compare  →  sign JWT  →  return { token, user }

Google OAuth login
  Frontend: GoogleLogin button  →  Google credential (ID token)
  POST /api/auth/google  →  google-auth-library.verifyIdToken  →  upsert user  →  sign JWT  →  return { token, user }

Every protected request
  Authorization: Bearer <token>
  authenticate middleware  →  jwt.verify  →  re-fetch role from DB  →  req.user
```

Role is **re-fetched from the database on every request** (not just read from the token), so role changes take effect immediately without waiting for token expiry.

### Database

- File: `server/jobtracker.db` (auto-created, gitignored)
- WAL journal mode + foreign keys enabled
- Migrations run automatically at startup via `PRAGMA table_info` checks

**Tables**

| Table | Key columns |
|-------|-------------|
| `users` | `id`, `username`, `password`, `google_id`, `role` (default `contributor`) |
| `jobs` | `id`, `user_id → users.id CASCADE`, all job fields |
| `dropdown_options` | `id`, `field_name`, `label`, `sort_order` |

**Admin seeding**: If `ADMIN_EMAIL` env var is set, the corresponding user's role is forced to `admin` every time the server starts. This handles ephemeral databases (e.g., Render free tier) where the DB is wiped on redeploy.

## Deployment

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | GitHub Pages | https://eichhorn-personal.github.io/jobtracker |
| Backend | Render.com | https://jobsearch-wc4q.onrender.com |

### Frontend deploy

```bash
npm run deploy   # runs npm run build then gh-pages -d build
```

Environment variable required in `.env.production`:
```
REACT_APP_API_URL=https://jobsearch-wc4q.onrender.com
```

### Backend deploy

Auto-deploys to Render on every push to `master`. Required Render environment variables:

| Variable | Source |
|----------|--------|
| `JWT_SECRET` | Set manually in Render dashboard |
| `GOOGLE_CLIENT_ID` | Set manually in Render dashboard |
| `ALLOWED_ORIGINS` | `https://eichhorn-personal.github.io` |
| `ADMIN_EMAIL` | Email address to grant admin role on startup |

> **SQLite on Render**: A 1 GB persistent disk is mounted at `/var/data` and the DB path is set to `/var/data/jobtracker.db` via the `DB_PATH` env var, so data survives redeploys. The `ADMIN_EMAIL` mechanism additionally ensures the admin account role is enforced on every startup.

### Keep-alive

A FreeCron job hits the backend's `/api/health` endpoint every 12 minutes to prevent Render cold starts.

## Theme

Light/dark theme is stored in `localStorage` (`theme` key) and applied as `data-bs-theme` on `<html>`. The `ThemeProvider` reads the saved value synchronously in its state initialiser to avoid a flash of the wrong theme on load.
