# File Structure

```
jobtracker/
├── docs/                          # Project wiki (this directory)
│   ├── architecture.md
│   ├── api-reference.md
│   ├── code-reference.md
│   ├── file-structure.md
│   └── testing.md
│
├── e2e/                           # Playwright E2E tests
│   ├── helpers.js                 # Shared auth helpers and API mocks
│   ├── auth.spec.js               # Login, logout, redirect flows
│   ├── jobs.spec.js               # Job CRUD interactions
│   ├── navigation.spec.js        # Role-based nav, admin routes, skip link
│   ├── mobile.spec.js             # Mobile layout and card interactions (Pixel 5 viewport)
│   ├── archived.spec.js           # Collapsible archived table (Ghosted / Duplicate rows)
│   └── search.spec.js             # Search field filtering (role, company, clear, archived)
│
├── public/                        # CRA static assets
│
├── server/                        # Express backend (separate npm workspace)
│   ├── app.js                     # Express app: middleware, routes, error handler
│   ├── server.js                  # Entry point: binds to PORT
│   ├── logger.js                  # Appends structured events to app.log
│   ├── .env                       # Secrets (gitignored): JWT_SECRET, GOOGLE_CLIENT_ID, PORT
│   ├── jobtracker.db               # SQLite database (gitignored, auto-created)
│   ├── app.log                    # Activity log (gitignored, LOG_PATH overrides path)
│   ├── db/
│   │   ├── database.js            # DB connection, schema creation, migrations, admin seeding
│   │   └── queries.js             # Shared helpers: serializeUser, findUserById
│   ├── middleware/
│   │   ├── authenticate.js        # JWT verification; re-fetches role from DB
│   │   └── requireAdmin.js        # 403 guard: rejects non-admin requests
│   ├── routes/
│   │   ├── auth.js                # POST /api/auth/login|register|logout|google, GET /api/auth/me, PUT /api/auth/profile
│   │   ├── jobs.js                # GET|POST /api/jobs, PUT|DELETE /api/jobs/:id
│   │   ├── users.js               # GET /api/users, PUT /api/users/:id/role, DELETE /api/users/:id
│   │   ├── dropdowns.js           # GET /api/dropdowns, POST/PATCH/DELETE dropdown options
│   │   ├── logs.js                # GET /api/logs (admin only)
│   │   └── scrape.js              # GET /api/scrape — extract role/company from a job posting URL
│   └── tests/
│       ├── setup.js               # Creates in-memory SQLite DB for each test run
│       ├── auth.test.js           # 14 tests — auth routes
│       ├── jobs.test.js           # 30 tests — jobs CRUD + auth/ownership
│       ├── users.test.js          # 23 tests — admin user management
│       ├── logs.test.js           # 7 tests — logs route auth/access
│       └── dropdowns.test.js      # 12 tests — dropdown CRUD + auth
│
├── src/
│   ├── App.js                     # Route definitions and layout wrapper
│   ├── App.test.js                # Placeholder (CRA requires ≥1 test file in src/)
│   ├── AdminRoute.test.js         # Route guard tests for /admin and /logs
│   ├── index.js                   # React root: GoogleOAuthProvider, ThemeProvider, HashRouter
│   ├── setupTests.js              # jest-dom matchers; TextEncoder/Decoder polyfill
│   ├── setupProxy.js              # Dev proxy: /api/* → localhost:3001
│   ├── DataTable.css              # Fluid table layout styles
│   │
│   ├── components/
│   │   ├── Header.js              # Navbar with logo, brand link, user dropdown
│   │   ├── Header.test.js         # ARIA structure, role-based menu items
│   │   ├── Footer.js              # Simple footer
│   │   ├── DataTable.js           # Jobs table with add/edit/delete actions
│   │   ├── DataTable.test.js      # Table ARIA, action buttons, delete confirmation
│   │   ├── AddJobModal.js         # Modal form for adding and editing jobs
│   │   └── AddJobModal.test.js    # Modal ARIA, date validation, form submission
│   │
│   ├── constants/
│   │   └── jobs.js                # ARCHIVED_STATUSES — statuses that move rows to the archived section
│   │
│   ├── context/
│   │   ├── AuthContext.js         # User state; login/logout/updateUser; JWT + authUser in localStorage
│   │   └── ThemeContext.js        # Light/dark toggle; persists to localStorage
│   │
│   ├── hooks/
│   │   └── useApi.js              # fetch wrapper: attaches JWT, handles 401 → logout
│   │
│   ├── pages/
│   │   ├── LoginPage.js           # Email/password + Google OAuth login and register
│   │   ├── LoginPage.test.js      # Heading, mode toggle, error display, accessibility
│   │   ├── AdminPage.js           # User management, dropdown options, logs link, data export
│   │   ├── LogsPage.js            # Activity log viewer (newest-first)
│   │   └── ProfilePage.js         # Edit display name, photo (upload or Google import), password
│   │
│   └── utils/
│       ├── dateFormat.js          # formatDate(input) → "MM/DD/YYYY" or null; cleanJobUrl()
│       └── statusColor.js         # statusClass(status) → CSS class; STATUS_COLORS picker list
│
├── playwright.config.js           # Playwright config; auto-starts CRA on port 3000
├── package.json                   # Frontend deps + npm scripts (including test:e2e)
├── README.md                      # Project overview and quick-start
├── TESTPLAN.md                    # Original test planning document
└── .gitignore
```

## Key relationships

- `src/index.js` wraps `App` in `HashRouter`, `ThemeProvider`, and `GoogleOAuthProvider`
- `App.js` defines routes; `ProtectedRoute` and `AdminRoute` guard them
- `AuthContext` stores JWT + user in localStorage; `useApi` reads the token on every fetch
- `authenticate.js` (middleware) verifies the JWT and re-fetches the user's role from SQLite on every request
- `database.js` creates all tables on first run and applies schema migrations automatically
- E2E tests in `e2e/` mock all API calls via `page.route()` — no backend needed
- Backend tests in `server/tests/` use an in-memory SQLite DB (`DB_PATH=:memory:`) — no file I/O
