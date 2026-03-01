# Deployment Guide

The app uses a split architecture:

| Layer | Host | Deploy trigger |
|-------|------|----------------|
| React SPA (static build) | GitHub Pages | `npm run deploy` |
| Express API + SQLite | Fly.io (free tier) | `fly deploy` |

**Live URLs:**
- Frontend: https://eichhorn-personal.github.io/jobtracker
- API: https://jobtracker-dctgiw.fly.dev

---

## Prerequisites

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Authenticate: `fly auth login`

---

## First Deploy

### 1. Create the Fly app

```bash
fly apps create <name>
```

The name you choose becomes the public hostname: `https://<name>.fly.dev`.

> **Note:** If your desired name is taken, Fly auto-generates one (e.g. `jobtracker-dctgiw`).
> Check the actual name with `fly apps list` before proceeding — you'll need it in steps 3 and 4.

### 2. Create the persistent volume

SQLite requires a single writer, so run **one** machine with **one** volume:

```bash
fly volumes create jobtracker_data --size 1 -r iad
fly scale count 1
```

The volume mounts at `/data` and holds the SQLite database (`jobtracker.db`) and
application log (`app.log`) across redeploys.

### 3. Update `fly.toml` and `.env.production`

Edit both files with the actual app name from step 1:

**`fly.toml`** (line 1):
```toml
app = '<actual-name>'
```

**`.env.production`**:
```
REACT_APP_API_URL=https://<actual-name>.fly.dev
```

### 4. Set secrets

**PowerShell:**
```powershell
$jwt = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
fly secrets set JWT_SECRET=$jwt GOOGLE_CLIENT_ID=<your-gcp-client-id> ALLOWED_ORIGINS=https://eichhorn-personal.github.io ADMIN_EMAIL=<you@example.com>
```

**bash/macOS:**
```bash
fly secrets set \
  JWT_SECRET=$(openssl rand -hex 32) \
  GOOGLE_CLIENT_ID=<your-gcp-client-id> \
  ALLOWED_ORIGINS=https://eichhorn-personal.github.io \
  ADMIN_EMAIL=<you@example.com>
```

Optional:
```bash
fly secrets set ALLOWED_EMAILS=you@example.com,colleague@example.com
```

> **Important:** All secrets must be set via `fly secrets set` or the Fly.io dashboard.
> The `server/.env` file is excluded from the Docker image (`.dockerignore`) — values
> in it are not available in production.

### 5. Deploy the API

```bash
fly deploy
```

Fly builds the Docker image (using `Dockerfile` in the repo root), pushes it, and
starts the machine with the mounted volume.

Verify:

```bash
curl https://<actual-name>.fly.dev/api/health
# → {"ok":true}
```

### 6. Deploy the frontend

```bash
npm run build && npm run deploy
```

This bakes `REACT_APP_API_URL` from `.env.production` into the React bundle and
publishes it to GitHub Pages.

---

## Subsequent Deploys

### API only

```bash
fly deploy
```

The volume (database + log) is preserved across all redeploys.

### Frontend only

If `.env.production` has not changed (API URL is stable):

```bash
npm run build && npm run deploy
```

---

## Ops Commands

| Task | Command |
|------|---------|
| Tail live logs | `fly logs` |
| Check machine status | `fly status` |
| Open a shell on the machine | `fly ssh console` |
| List volumes | `fly volumes list` |
| List secrets (names only) | `fly secrets list` |
| Update a secret | `fly secrets set KEY=value` |

---

## Google OAuth Setup

After your first `fly deploy`, add the Fly.io URL to your GCP OAuth 2.0 client:

1. Open [GCP Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add:
   ```
   https://<actual-name>.fly.dev
   ```
4. Under **Authorized redirect URIs**, add:
   ```
   https://<actual-name>.fly.dev/api/auth/google/callback
   ```
5. Save

`force_https = true` in `fly.toml` ensures all traffic uses HTTPS, which is required
for Google OAuth callbacks.

---

## Environment Variables Reference

See [`server/.env.example`](../server/.env.example) for all variables the server reads,
with descriptions. Non-secret variables (`PORT`, `NODE_ENV`, `DB_PATH`, `LOG_PATH`) are
set directly in `fly.toml [env]`. Secrets are set via `fly secrets set`.

---

## Lessons Learned

**App name is auto-generated.** `fly apps create` may assign a name different from what
you requested (e.g. `jobtracker-dctgiw` instead of `jobtracker`). Always run
`fly apps list` after creation and update `fly.toml` and `.env.production` before
deploying.

**Set fly.toml app name before `fly deploy`.** Deploying with the wrong app name in
`fly.toml` silently deploys to the wrong target or fails. The machine will run the
previous placeholder image (Fly's `goStatic` static server) instead of Node.js. Check
`fly logs` for `Preparing to run: /goStatic` as a diagnostic.

**Exclude `server/.env` from Docker.** The `.dockerignore` must include `server/.env`.
Without it, local dev values (`PORT=3001`) get baked into the image and can override
the `PORT=8080` set by fly.toml, causing health checks to fail.

**Set all secrets before first deploy.** `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
`ALLOWED_ORIGINS`, and `ADMIN_EMAIL` must all be present at startup. Missing secrets
cause immediate 500 errors. Use `fly secrets list` to verify before deploying.

**SQLite requires one machine and one volume.** Fly defaults to 2 machines for HA.
With SQLite (single-writer), run `fly scale count 1` and create exactly one volume.
Two machines with two separate volumes would split the database.

**PowerShell line continuation.** The `\` continuation used in bash does not work in
PowerShell. Either put the entire `fly secrets set` call on one line or use PowerShell
multi-line syntax.

**DNS warnings are benign.** The `WARNING: DNS verification failed: i/o timeout`
message that appears after `fly deploy` is Fly's internal resolver timing out — not
your app. The deployment succeeds regardless.
