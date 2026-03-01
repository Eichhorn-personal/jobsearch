# Deployment Guide

The app uses a split architecture:

| Layer | Host | Deploy trigger |
|-------|------|----------------|
| React SPA (static build) | GitHub Pages | `npm run deploy` |
| Express API + SQLite | Fly.io (free tier) | `fly deploy` |

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

### 2. Create the persistent volume

```bash
fly volumes create jobtracker_data --size 1 -r iad
```

This volume mounts at `/data` and holds the SQLite database (`jobtracker.db`) and
application log (`app.log`) across redeploys.

### 3. Set secrets

```bash
fly secrets set \
  JWT_SECRET=$(openssl rand -hex 32) \
  GOOGLE_CLIENT_ID=<your-gcp-client-id> \
  ALLOWED_ORIGINS=https://eichhorn-personal.github.io
```

Optional secrets:

```bash
fly secrets set ADMIN_EMAIL=you@example.com
fly secrets set ALLOWED_EMAILS=you@example.com,colleague@example.com
```

### 4. Update `.env.production`

Edit `.env.production` in the repo root to match your actual app name:

```
REACT_APP_API_URL=https://<name>.fly.dev
```

### 5. Deploy the API

```bash
fly deploy
```

Fly builds the Docker image (using `Dockerfile` in the repo root), pushes it, and
starts the machine with the mounted volume.

Verify:

```bash
curl https://<name>.fly.dev/api/health
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

If you renamed the Fly app or changed the hostname, update `.env.production` first.

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
   https://<name>.fly.dev
   ```
4. Under **Authorized redirect URIs**, add:
   ```
   https://<name>.fly.dev/api/auth/google/callback
   ```
5. Save

`force_https = true` in `fly.toml` ensures all traffic uses HTTPS, which is required
for Google OAuth callbacks.

---

## Environment Variables Reference

See [`server/.env.example`](../server/.env.example) for all variables the server reads,
with descriptions. Non-secret variables (`PORT`, `NODE_ENV`, `DB_PATH`, `LOG_PATH`) are
set directly in `fly.toml [env]`. Secrets are set via `fly secrets set`.
