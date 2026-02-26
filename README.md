# JobSearch

A personal job-application tracker with a React frontend and a Node/Express backend.

## Quick start

```bash
# Clone and install both workspaces
npm install
cd server && npm install && cd ..

# Copy and fill in secrets
cp server/.env.example server/.env   # set JWT_SECRET, GOOGLE_CLIENT_ID, ADMIN_EMAIL

# Start frontend (port 3000) + backend (port 3001) together
npm run dev
```

Open http://localhost:3000 in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend and backend concurrently |
| `npm start` | Frontend only (port 3000) |
| `npm run server` | Backend only (port 3001) |
| `npm test` | Frontend unit tests (Jest + RTL, watch mode) |
| `npm run test:e2e` | Playwright E2E tests (headless) |
| `npm run test:e2e:ui` | Playwright E2E tests (interactive UI) |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to GitHub Pages |
| `cd server && npm test` | Backend API tests (Jest + Supertest) |

## Docs

- [Architecture](docs/architecture.md) — system overview, auth, deployment
- [File Structure](docs/file-structure.md) — annotated directory tree
- [API Reference](docs/api-reference.md) — all backend endpoints
- [Code Reference](docs/code-reference.md) — frontend components, hooks, contexts
- [Testing](docs/testing.md) — all three test layers
