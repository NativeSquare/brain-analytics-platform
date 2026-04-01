# Story 8.2: SportMonks PostgreSQL Connection & API Routes

Status: draft
Story Type: backend
Points: 3

> **PROJECT SCOPE:** All API routes target the admin app at `apps/admin/app/api/sportmonks/`. These are read-only PostgreSQL queries via Next.js API routes -- Convex is NOT involved.

## Story

As a developer,
I want to establish a PostgreSQL connection to the SportMonks database and expose API routes for fixtures, team info, and standings,
so that the homepage, calendar, and analytics dashboards can display real match data (upcoming fixtures, recent results, league standings).

## Acceptance Criteria

### AC 1: SportMonks PostgreSQL connection pool is configured

**Given** the environment variable `SPORTMONKS_DATABASE_URL` is set to a valid PostgreSQL connection string
**When** the application starts
**Then** a dedicated connection pool is created for the SportMonks database using `node-postgres` (pg)
**And** the pool is separate from any StatsBomb connection pool
**And** if `SPORTMONKS_DATABASE_SSL_CA` is set, the connection uses the provided CA certificate for SSL
**And** if `SPORTMONKS_DATABASE_SSL_CA` is not set, the connection still works (SSL optional)
**And** the pool configuration uses sensible defaults (max connections, idle timeout, connection timeout)

### AC 2: Missing environment variable is handled gracefully

**Given** the environment variable `SPORTMONKS_DATABASE_URL` is NOT set
**When** any `/api/sportmonks/*` route is called
**Then** the route returns HTTP 503 with a JSON body `{ "error": "SportMonks database is not configured" }`
**And** no unhandled exception is thrown
**And** the rest of the application continues to function normally

### AC 3: Fixtures API route returns upcoming and past match data

**Given** the SportMonks database connection is active
**When** a GET request is made to `/api/sportmonks/fixtures`
**Then** the route returns HTTP 200 with a JSON array of fixture objects
**And** each fixture object includes at minimum: `id`, `startingAt` (ISO timestamp), `homeTeamId`, `awayTeamId`, `homeTeamName`, `awayTeamName`, `homeScore`, `awayScore`, `status`, `competitionName`

**Given** the query parameter `teamId` is provided (e.g., `?teamId=123`)
**When** the request is processed
**Then** only fixtures where the specified team is either the home or away team are returned

**Given** the query parameter `status` is provided (e.g., `?status=upcoming` or `?status=finished`)
**When** the request is processed
**Then** only fixtures matching that status filter are returned

**Given** the query parameter `limit` is provided (e.g., `?limit=5`)
**When** the request is processed
**Then** at most that many fixtures are returned

**Given** no query parameters are provided
**When** the request is processed
**Then** a default set of fixtures is returned (e.g., last 10 finished and next 10 upcoming)

### AC 4: Teams API route returns team information

**Given** the SportMonks database connection is active
**When** a GET request is made to `/api/sportmonks/teams`
**Then** the route returns HTTP 200 with a JSON array of team objects
**And** each team object includes at minimum: `id`, `name`, `shortCode`, `logoUrl`, `countryId`

**Given** the query parameter `teamId` is provided (e.g., `?teamId=123`)
**When** the request is processed
**Then** only the team with that ID is returned

### AC 5: Standings API route returns league table data

**Given** the SportMonks database connection is active
**When** a GET request is made to `/api/sportmonks/standings`
**Then** the route returns HTTP 200 with a JSON array of standing entries
**And** each standing entry includes at minimum: `position`, `teamId`, `teamName`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `goalDifference`, `points`

**Given** the query parameter `seasonId` is provided (e.g., `?seasonId=456`)
**When** the request is processed
**Then** standings for that specific season are returned

**Given** the query parameter `competitionId` is provided
**When** the request is processed
**Then** standings for that specific competition are returned

### AC 6: All API routes use parameterized SQL queries

**Given** any API route under `/api/sportmonks/` receives query parameters
**When** SQL queries are constructed
**Then** all user-provided values are passed as parameterized query arguments (`$1`, `$2`, etc.)
**And** no string concatenation or template literals are used to embed values into SQL strings

### AC 7: All API routes handle database errors

**Given** the SportMonks database connection is active
**When** a query fails due to a database error (timeout, syntax error, connection lost)
**Then** the route returns HTTP 500 with a JSON body `{ "error": "Failed to fetch [resource]" }`
**And** the actual error details are logged server-side (not exposed to the client)
**And** no unhandled promise rejections occur

### AC 8: All API routes are GET-only

**Given** a non-GET request (POST, PUT, DELETE, PATCH) is made to any `/api/sportmonks/*` route
**When** the request is processed
**Then** the route returns HTTP 405 with a JSON body `{ "error": "Method not allowed" }`

## Tasks / Subtasks

- [ ] **Task 1: Create shared SportMonks connection utility** (AC: #1, #2)
  - [ ] 1.1: Create `apps/admin/app/api/sportmonks/_lib/connection.ts` with a `getPool()` function that:
    - Creates a `pg.Pool` using `SPORTMONKS_DATABASE_URL`
    - Configures SSL with CA cert from `SPORTMONKS_DATABASE_SSL_CA` if provided
    - Uses lazy initialization (pool created on first call, reused thereafter)
    - Sets `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 10000`
  - [ ] 1.2: Export a helper `querySportMonks(text: string, params?: unknown[])` that:
    - Calls `getPool()` and runs `pool.query(text, params)`
    - Throws a typed error if pool is unavailable (env var missing)
  - [ ] 1.3: Export an `isSportMonksConfigured()` check that returns `false` if `SPORTMONKS_DATABASE_URL` is not set

- [ ] **Task 2: Create fixtures API route** (AC: #3, #6, #7, #8)
  - [ ] 2.1: Create `apps/admin/app/api/sportmonks/fixtures/route.ts`
  - [ ] 2.2: Implement `GET` handler that:
    - Validates `teamId`, `status`, `limit` query params (all optional)
    - Builds a parameterized SQL query joining fixtures with team names and competition names
    - Applies `WHERE` clauses based on provided filters
    - Orders by `starting_at` (descending for finished, ascending for upcoming)
    - Returns JSON array of fixture objects
  - [ ] 2.3: Return 405 for non-GET methods

- [ ] **Task 3: Create teams API route** (AC: #4, #6, #7, #8)
  - [ ] 3.1: Create `apps/admin/app/api/sportmonks/teams/route.ts`
  - [ ] 3.2: Implement `GET` handler that:
    - Accepts optional `teamId` query param
    - Queries team table for id, name, short_code, logo_path, country_id
    - Returns JSON array (or single object when `teamId` is provided)
  - [ ] 3.3: Return 405 for non-GET methods

- [ ] **Task 4: Create standings API route** (AC: #5, #6, #7, #8)
  - [ ] 4.1: Create `apps/admin/app/api/sportmonks/standings/route.ts`
  - [ ] 4.2: Implement `GET` handler that:
    - Accepts optional `seasonId` and `competitionId` query params
    - Queries standings table joining with team names
    - Orders by `position` ascending
    - Returns JSON array of standing entries
  - [ ] 4.3: Return 405 for non-GET methods

- [ ] **Task 5: Add environment variable documentation** (AC: #1, #2)
  - [ ] 5.1: Add `SPORTMONKS_DATABASE_URL` and `SPORTMONKS_DATABASE_SSL_CA` to `.env.example` in `apps/admin/` (if it exists) or document in this story's PR description
  - [ ] 5.2: Verify the env vars are listed in the project's environment variable documentation

- [ ] **Task 6: Verification** (AC: #1-#8)
  - [ ] 6.1: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 6.2: Run `pnpm lint` -- must pass with zero new errors
  - [ ] 6.3: Test each route manually with `curl` or API client:
    - `GET /api/sportmonks/fixtures` -- returns fixture data
    - `GET /api/sportmonks/fixtures?teamId=X&status=upcoming&limit=5` -- returns filtered data
    - `GET /api/sportmonks/teams` -- returns team data
    - `GET /api/sportmonks/teams?teamId=X` -- returns single team
    - `GET /api/sportmonks/standings?seasonId=X` -- returns standings
    - `POST /api/sportmonks/fixtures` -- returns 405
  - [ ] 6.4: Test with `SPORTMONKS_DATABASE_URL` unset -- all routes return 503
  - [ ] 6.5: Test with invalid connection string -- routes return 500 with logged error

## Dev Notes

### Architecture Context

This story follows the same pattern established in Story 8.1 (StatsBomb PostgreSQL Connection & API Routes). Both stories use direct PostgreSQL connections via `node-postgres` through Next.js API routes. Convex is not involved -- these are read-only external data sources.

**Source of truth for SQL queries and connection patterns:**
- `football-dashboard-2/src/lib/external-postgres.ts` -- shared connection pool utility (reference for connection setup pattern)
- `football-dashboard-2/src/lib/sportmonks.ts` -- SportMonks-specific query functions (reference for SQL queries)
- `football-dashboard-2/src/app/api/` -- existing API route handlers (reference for request/response patterns)

**Files to create:**
1. `apps/admin/app/api/sportmonks/_lib/connection.ts` -- SportMonks connection pool and query helper
2. `apps/admin/app/api/sportmonks/fixtures/route.ts` -- Fixtures API route
3. `apps/admin/app/api/sportmonks/teams/route.ts` -- Teams API route
4. `apps/admin/app/api/sportmonks/standings/route.ts` -- Standings API route

**Files NOT to modify:**
- Any Convex functions -- this story has zero Convex involvement
- `apps/web/` -- the web app is not affected
- StatsBomb connection/routes (Story 8.1) -- separate connection pool

### API Route Reference

| Route | Method | Query Params | Description |
|---|---|---|---|
| `/api/sportmonks/fixtures` | GET | `teamId`, `status` (upcoming/finished), `limit` | Match fixtures and results |
| `/api/sportmonks/teams` | GET | `teamId` | Team info and metadata |
| `/api/sportmonks/standings` | GET | `seasonId`, `competitionId` | League table / standings |

### Key Decisions

1. **Separate connection pool from StatsBomb** -- SportMonks and StatsBomb are different databases with different credentials. Each gets its own `pg.Pool` instance to avoid cross-contamination and allow independent configuration.

2. **Lazy pool initialization** -- The pool is created on first request, not at module load time. This avoids connection errors during build/deploy when env vars may not yet be available, and avoids holding open connections when the routes are not being used.

3. **SSL CA certificate is optional** -- Some environments (local dev, certain cloud providers) may not require a custom CA cert. The connection should work with or without it.

4. **Column naming convention** -- SQL queries return snake_case columns from PostgreSQL. The API route handlers transform results to camelCase for the JSON response (e.g., `starting_at` becomes `startingAt`). This matches the convention used in Story 8.1.

5. **No authentication on these routes for now** -- These are internal API routes consumed by the admin app's own frontend. Authentication will be enforced via middleware at the app level (Story 6.x). The routes themselves do not duplicate auth checks.

### Consumers

- **Story 11.3 (Enriched Homepage with SportMonks Data)** -- uses fixtures and standings routes for the homepage match countdown, recent results, and league table widgets
- **Story 9.3 (Post-Match Dashboard)** -- uses fixtures route for match context (fixture details for a given match)
- **Calendar feature** -- uses fixtures route to display match fixtures on the calendar view

### Dependencies

- **Builds on:** Story 8.1 (StatsBomb PostgreSQL Connection) -- same architectural pattern, may share utility types
- **Blocks:** Story 11.3 (Enriched Homepage), Story 9.3 (Post-Match Dashboard)
- **Requires:** `pg` package installed in `apps/admin/` (should already be present from Story 8.1)

### Testing Approach

Manual API testing via curl or an API client. No automated tests required for this story (read-only external database queries). Verify:
- Correct JSON responses with expected fields
- Parameterized queries prevent SQL injection (review code)
- Error responses for missing config, bad queries, wrong HTTP methods
- TypeScript compilation and linting pass
