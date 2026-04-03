# Story 8.1: StatsBomb PostgreSQL Connection & API Routes

Status: done
Story Type: backend / integration
Points: 8

> **PROJECT SCOPE:** All API routes target `apps/admin/src/app/api/statsbomb/`. Database connection utilities go in `apps/admin/src/lib/`. SQL query files go in `apps/admin/queries/statsbomb/`. Convex is NOT involved -- these are read-only external data sources accessed via Next.js API routes using node-postgres.

## Story

As a developer,
I want to establish a connection to the StatsBomb PostgreSQL database and create Next.js API routes that execute parameterized SQL queries,
so that the analytics dashboards (Epic 9) can fetch match, player, team, and event data from StatsBomb's silver/gold schemas.

## Acceptance Criteria

### AC 1: PostgreSQL connection pool is configured with environment variables

**Given** the environment variables `STATSBOMB_DATABASE_URL` and (optionally) `STATSBOMB_DATABASE_SSL_CA` are set
**When** the application starts or the first API route is called
**Then** a node-postgres `Pool` is created using the connection string from `STATSBOMB_DATABASE_URL`
**And** if `STATSBOMB_DATABASE_SSL_CA` is set, the pool is configured with `ssl.ca` pointing to that certificate
**And** the pool uses connection pooling (min 2, max 10 connections)
**And** idle connections are released after 30 seconds
**And** connection timeout is set to 10 seconds
**And** the pool is a module-level singleton (not re-created per request)

### AC 2: Connection utility provides a typed query helper

**Given** the connection pool is established
**When** a developer calls the query helper function
**Then** it accepts a SQL string and an optional array of parameters
**And** it returns typed rows from the query result
**And** it automatically acquires and releases connections from the pool
**And** it logs query execution time in development mode (`NODE_ENV === 'development'`)

### AC 3: All 37 SQL query files are ported

**Given** the source repository contains 37 SQL query files in `football-dashboard-2/queries/`
**When** the developer ports them to `apps/admin/queries/statsbomb/`
**Then** each SQL file is copied with its original filename preserved
**And** all table references use the correct schema prefix (`silver.` or `gold.`)
**And** all parameterized values use `$1`, `$2`, etc. (node-postgres parameterized query syntax)
**And** no SQL file contains string-interpolated user input (all dynamic values are parameterized)

### AC 4: SQL query loader reads .sql files at build time or runtime

**Given** the SQL files exist in `apps/admin/queries/statsbomb/`
**When** an API route needs to execute a query
**Then** a utility function loads the SQL file content by name
**And** the SQL content is cached in memory after first load (not re-read from disk on every request)
**And** the loader function is typed to accept known query filenames

### AC 5: All ~25 API routes are created and return valid JSON

**Given** the API routes exist under `apps/admin/src/app/api/statsbomb/`
**When** a GET request is made to any route with valid query parameters
**Then** the route executes the corresponding parameterized SQL query
**And** returns a JSON response with `{ data: [...] }` shape
**And** the response has `Content-Type: application/json`
**And** the response status is `200` for successful queries

### AC 6: API routes validate required query parameters

**Given** an API route requires specific query parameters (e.g., `teamId`, `seasonId`)
**When** a request is made without a required parameter
**Then** the route returns a `400` status with `{ error: "Missing required parameter: <name>" }`
**And** the SQL query is NOT executed

### AC 7: API routes handle database errors gracefully

**Given** the database connection fails or a query errors
**When** an API route attempts to execute a query
**Then** the route returns a `500` status with `{ error: "Internal server error" }`
**And** the actual error details are logged server-side (not exposed to the client)
**And** the connection is properly released back to the pool (no leaked connections)

### AC 8: API routes handle empty results

**Given** a query executes successfully but returns zero rows
**When** the API route processes the result
**Then** it returns a `200` status with `{ data: [] }`
**And** does NOT return a `404` (empty results are valid)

### AC 9: Environment variables are documented and validated at startup

**Given** the application starts
**When** `STATSBOMB_DATABASE_URL` is not set
**Then** the connection module throws a clear error message: `"Missing required environment variable: STATSBOMB_DATABASE_URL"`
**And** the error is thrown at module load time, not silently on the first request

### AC 10: TypeScript types pass and lint is clean

**Given** all files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all SQL files are excluded from TypeScript compilation

---

## API Routes Reference

Each route is a `GET` handler in `apps/admin/src/app/api/statsbomb/<route>/route.ts`. Parameters are passed as URL search params.

### Administrative / Lookup

| Route | SQL File(s) | Required Params | Optional Params | Description |
|-------|-------------|-----------------|-----------------|-------------|
| `/api/statsbomb/teams` | `teams.sql` | -- | -- | List all teams |
| `/api/statsbomb/teams-by-competition` | `teams-by-competition.sql` | `competitionId` | `seasonId` | Teams in a competition |
| `/api/statsbomb/competitions` | `competitions.sql` | -- | -- | List all competitions |
| `/api/statsbomb/seasons` | `seasons.sql` | `competitionId` | -- | Seasons for a competition |
| `/api/statsbomb/default-season` | `default-season.sql` | `competitionId` | -- | Current/default season |
| `/api/statsbomb/matches` | `matches.sql` | `competitionId`, `seasonId` | `teamId` | Matches in a season |
| `/api/statsbomb/match-stats` | `match-stats.sql` | `matchId` | -- | Stats for a single match |
| `/api/statsbomb/match-periods` | `match-periods.sql` | `matchId` | -- | Match period breakdown |
| `/api/statsbomb/match-id-from-sportmonks` | `match-id-from-sportmonks.sql` | `sportmonksId` | -- | Map SportMonks ID to StatsBomb match ID |

### Match / Season Aggregates

| Route | SQL File(s) | Required Params | Optional Params | Description |
|-------|-------------|-----------------|-----------------|-------------|
| `/api/statsbomb/season-points` | `season-points.sql` | `competitionId`, `seasonId`, `teamId` | -- | Season points (joins gold.team_matches with match_expected_stats) |
| `/api/statsbomb/season-averages` | `season-averages.sql` | `competitionId`, `seasonId`, `teamId` | -- | Opponent and own team averages |
| `/api/statsbomb/team-trends` | `team-trends.sql` | `competitionId`, `seasonId`, `teamId` | -- | Match-by-match trends with phase splits |
| `/api/statsbomb/league-team-season-averages` | `league-team-season-averages.sql` | `competitionId`, `seasonId` | -- | Phase metrics across all league teams |
| `/api/statsbomb/league-ranking-averages` | `league-ranking-averages.sql` | `competitionId`, `seasonId` | -- | Per-matchday league stats |
| `/api/statsbomb/win-probabilities` | `win-probabilities.sql` | `matchId` | -- | Win probability data for a match |

### Events & Possessions

| Route | SQL File(s) | Required Params | Optional Params | Description |
|-------|-------------|-----------------|-----------------|-------------|
| `/api/statsbomb/events` | `events.sql` | `matchId` | `typeId` | Match events with optional type filtering |
| `/api/statsbomb/shots` | `shots-by-match.sql`, `shots-by-team.sql` | `matchId` OR (`competitionId`, `seasonId`, `teamId`) | -- | Shots by match (individual) or by team-season (aggregated). Use `matchId` for single-match, team params for season aggregate. |
| `/api/statsbomb/set-pieces` | `set-pieces-by-match.sql`, `set-pieces-by-season.sql` | `matchId` OR (`competitionId`, `seasonId`, `teamId`) | -- | Set pieces by match or season (with shot data) |
| `/api/statsbomb/possessions` | `possessions.sql` | `matchId` | `teamId` | Possession sequences for a match |
| `/api/statsbomb/possession-details` | `gk_possessions_metrics.sql` | `matchId`, `teamId` | -- | GK possession events/metrics |
| `/api/statsbomb/season-possession-details` | `build_up_metrics.sql`, `season_build_up_metrics.sql`, `transitions_metrics.sql`, `season_transitions_metrics.sql`, `set_pieces_metrics.sql` | `competitionId`, `seasonId`, `teamId` | `phase` | Phase-specific possession metrics. `phase` param selects: `build-up`, `transitions`, `set-pieces`. Defaults to all phases. |

### Player Data

| Route | SQL File(s) | Required Params | Optional Params | Description |
|-------|-------------|-----------------|-----------------|-------------|
| `/api/statsbomb/player-season-stats` | `player-season-stats.sql` | `playerId`, `competitionId`, `seasonId` | -- | Single player per-90 stats |
| `/api/statsbomb/league-player-season-stats` | `league-player-season-stats.sql` | `competitionId`, `seasonId` | `position` | All players' stats in a league season |
| `/api/statsbomb/players` | `players-search.sql` | `query` | `competitionId`, `seasonId` | Fuzzy player name search |
| `/api/statsbomb/lineups-processed` | `lineups-processed.sql` | `matchId` | -- | Match lineups with shift/sub data |

### Referee Analysis

| Route | SQL File(s) | Required Params | Optional Params | Description |
|-------|-------------|-----------------|-----------------|-------------|
| `/api/statsbomb/referee-analysis` | `referee-analysis-*.sql` (detail files) | `competitionId`, `seasonId` | `refereeId` | Detailed referee analysis |
| `/api/statsbomb/referee-summary` | `referee-analysis-*.sql` (summary file) | `competitionId`, `seasonId` | -- | Referee summary/overview |

---

## Tasks / Subtasks

- [ ] **Task 1: Install node-postgres dependency** (AC: #1)
  - [ ] 1.1: Run `pnpm add pg` in the `apps/admin` workspace
  - [ ] 1.2: Run `pnpm add -D @types/pg` in the `apps/admin` workspace

- [ ] **Task 2: Create the database connection module** (AC: #1, #2, #9)
  - [ ] 2.1: Create `apps/admin/src/lib/statsbomb-db.ts`
  - [ ] 2.2: Validate `STATSBOMB_DATABASE_URL` at module load time -- throw a clear error if missing
  - [ ] 2.3: Create a singleton `Pool` instance with configuration:
    ```typescript
    import { Pool } from "pg";

    const connectionString = process.env.STATSBOMB_DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing required environment variable: STATSBOMB_DATABASE_URL");
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.STATSBOMB_DATABASE_SSL_CA
        ? { ca: process.env.STATSBOMB_DATABASE_SSL_CA }
        : undefined,
    });
    ```
  - [ ] 2.4: Export a typed `query` helper function:
    ```typescript
    export async function query<T extends Record<string, unknown>>(
      sql: string,
      params?: unknown[],
    ): Promise<T[]> {
      const start = Date.now();
      const result = await pool.query<T>(sql, params);
      if (process.env.NODE_ENV === "development") {
        console.log(`[StatsBomb] Query executed in ${Date.now() - start}ms`);
      }
      return result.rows;
    }
    ```
  - [ ] 2.5: Export a `getPool` function for health checks or shutdown hooks if needed

- [ ] **Task 3: Create the SQL query loader utility** (AC: #4)
  - [ ] 3.1: Create `apps/admin/src/lib/load-query.ts`
  - [ ] 3.2: Implement a function that reads `.sql` files from `apps/admin/queries/statsbomb/` using `fs.readFileSync`
  - [ ] 3.3: Cache loaded SQL in a `Map<string, string>` so each file is read only once
  - [ ] 3.4: Type the function parameter to accept known query filenames:
    ```typescript
    const queryCache = new Map<string, string>();

    export function loadQuery(filename: string): string {
      const cached = queryCache.get(filename);
      if (cached) return cached;

      const filePath = path.join(process.cwd(), "queries", "statsbomb", filename);
      const sql = fs.readFileSync(filePath, "utf-8");
      queryCache.set(filename, sql);
      return sql;
    }
    ```

- [ ] **Task 4: Create the `queries/statsbomb/` directory and port all 37 SQL files** (AC: #3)
  - [ ] 4.1: Create directory `apps/admin/queries/statsbomb/`
  - [ ] 4.2: Port the following SQL files from `football-dashboard-2/queries/`:

  **Administrative (9 files):**
  - [ ] `teams.sql`
  - [ ] `teams-by-competition.sql`
  - [ ] `competitions.sql`
  - [ ] `seasons.sql`
  - [ ] `default-season.sql`
  - [ ] `matches.sql`
  - [ ] `match-stats.sql`
  - [ ] `match-periods.sql`
  - [ ] `match-id-from-sportmonks.sql`

  **Match/Season Aggregates (5 files):**
  - [ ] `season-points.sql`
  - [ ] `season-averages.sql`
  - [ ] `team-trends.sql`
  - [ ] `league-team-season-averages.sql`
  - [ ] `league-ranking-averages.sql`

  **Events & Possessions (6 files):**
  - [ ] `events.sql`
  - [ ] `shots-by-match.sql`
  - [ ] `shots-by-team.sql`
  - [ ] `set-pieces-by-match.sql`
  - [ ] `set-pieces-by-season.sql`
  - [ ] `possessions.sql`
  - [ ] `gk_possessions_metrics.sql`

  **Phase-Specific (5 files):**
  - [ ] `build_up_metrics.sql`
  - [ ] `season_build_up_metrics.sql`
  - [ ] `transitions_metrics.sql`
  - [ ] `season_transitions_metrics.sql`
  - [ ] `set_pieces_metrics.sql`

  **Player Data (4 files):**
  - [ ] `player-season-stats.sql`
  - [ ] `league-player-season-stats.sql`
  - [ ] `players-search.sql`
  - [ ] `lineups-processed.sql`

  **Referee (3 files):**
  - [ ] `referee-analysis-detail.sql` (or matching original name)
  - [ ] `referee-analysis-summary.sql` (or matching original name)
  - [ ] `referee-analysis-cards.sql` (or matching original name)

  **Other (1 file):**
  - [ ] `win-probabilities.sql`

  - [ ] 4.3: Verify all SQL files use `$1`, `$2`, etc. for parameterized values -- no string interpolation
  - [ ] 4.4: Verify all table references include the correct schema prefix (`silver.` or `gold.`)

- [ ] **Task 5: Create a shared API route helper** (AC: #5, #6, #7, #8)
  - [ ] 5.1: Create `apps/admin/src/lib/api-handler.ts` with a reusable handler wrapper:
    ```typescript
    import { NextRequest, NextResponse } from "next/server";
    import { query } from "./statsbomb-db";
    import { loadQuery } from "./load-query";

    interface RouteConfig {
      queryFile: string;
      requiredParams: string[];
      optionalParams?: string[];
      buildParams: (params: Record<string, string>) => unknown[];
    }

    export function createStatsBombHandler(config: RouteConfig) {
      return async function GET(request: NextRequest) {
        try {
          const searchParams = request.nextUrl.searchParams;
          const params: Record<string, string> = {};

          // Validate required params
          for (const name of config.requiredParams) {
            const value = searchParams.get(name);
            if (!value) {
              return NextResponse.json(
                { error: `Missing required parameter: ${name}` },
                { status: 400 },
              );
            }
            params[name] = value;
          }

          // Collect optional params
          for (const name of config.optionalParams ?? []) {
            const value = searchParams.get(name);
            if (value) params[name] = value;
          }

          const sql = loadQuery(config.queryFile);
          const data = await query(sql, config.buildParams(params));

          return NextResponse.json({ data });
        } catch (error) {
          console.error("[StatsBomb API Error]", error);
          return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      };
    }
    ```
  - [ ] 5.2: For routes that use multiple SQL files (e.g., `/shots`, `/set-pieces`, `/season-possession-details`), the handler should select the query file based on which parameters are provided

- [ ] **Task 6: Create all API route files** (AC: #5, #6)
  - [ ] 6.1: Create each route as `apps/admin/src/app/api/statsbomb/<name>/route.ts` exporting a `GET` function
  - [ ] 6.2: Each route file should be minimal -- import `createStatsBombHandler` and configure it:
    ```typescript
    // Example: apps/admin/src/app/api/statsbomb/teams/route.ts
    import { createStatsBombHandler } from "@/lib/api-handler";

    export const GET = createStatsBombHandler({
      queryFile: "teams.sql",
      requiredParams: [],
      buildParams: () => [],
    });
    ```
  - [ ] 6.3: Create the following route files (25 total):
    - [ ] `teams/route.ts`
    - [ ] `teams-by-competition/route.ts`
    - [ ] `competitions/route.ts`
    - [ ] `seasons/route.ts`
    - [ ] `default-season/route.ts`
    - [ ] `matches/route.ts`
    - [ ] `match-stats/route.ts`
    - [ ] `match-periods/route.ts`
    - [ ] `match-id-from-sportmonks/route.ts`
    - [ ] `season-points/route.ts`
    - [ ] `season-averages/route.ts`
    - [ ] `team-trends/route.ts`
    - [ ] `league-team-season-averages/route.ts`
    - [ ] `league-ranking-averages/route.ts`
    - [ ] `events/route.ts`
    - [ ] `shots/route.ts`
    - [ ] `set-pieces/route.ts`
    - [ ] `possessions/route.ts`
    - [ ] `possession-details/route.ts`
    - [ ] `season-possession-details/route.ts`
    - [ ] `player-season-stats/route.ts`
    - [ ] `league-player-season-stats/route.ts`
    - [ ] `players/route.ts`
    - [ ] `lineups-processed/route.ts`
    - [ ] `referee-analysis/route.ts`
    - [ ] `referee-summary/route.ts`
    - [ ] `win-probabilities/route.ts`

- [ ] **Task 7: Add environment variables to `.env.example`** (AC: #9)
  - [ ] 7.1: Add `STATSBOMB_DATABASE_URL=` to `apps/admin/.env.example` (or project root `.env.example`)
  - [ ] 7.2: Add `STATSBOMB_DATABASE_SSL_CA=` (commented out, marked optional)
  - [ ] 7.3: Add a comment block explaining the expected format

- [ ] **Task 8: TypeScript and lint verification** (AC: #10)
  - [ ] 8.1: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 8.2: Run `pnpm lint` -- must pass with zero new errors
  - [ ] 8.3: Verify `.sql` files are excluded from TypeScript compilation (check `tsconfig.json` excludes)

---

## Dev Notes

### Architecture Context

This story creates the **read-only external data layer** for StatsBomb analytics. The architecture is deliberately simple: Next.js API routes execute SQL against an external PostgreSQL database. There is no ORM, no Convex involvement, and no write operations.

```
Client (dashboard pages)
  |
  v
Next.js API Route (GET handler)
  |
  v
SQL Query Loader (cached .sql files)
  |
  v
node-postgres Pool (connection pooling)
  |
  v
StatsBomb PostgreSQL (silver/gold schemas, read-only)
```

### Source Files (from football-dashboard-2)

- **Connection:** `football-dashboard-2/src/lib/external-postgres.ts` -- the original connection module using node-postgres with SSL support
- **SQL Queries:** `football-dashboard-2/queries/*.sql` -- 37 SQL files with parameterized queries against silver/gold schemas
- **API Routes:** `football-dashboard-2/src/app/api/statsbomb/*/route.ts` -- original Next.js route handlers

### Files to Create

1. `apps/admin/src/lib/statsbomb-db.ts` -- PostgreSQL connection pool singleton
2. `apps/admin/src/lib/load-query.ts` -- SQL file loader with caching
3. `apps/admin/src/lib/api-handler.ts` -- Shared API route handler factory
4. `apps/admin/queries/statsbomb/*.sql` -- 37 SQL query files
5. `apps/admin/src/app/api/statsbomb/*/route.ts` -- 25-27 API route files

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement
- Anything under `apps/web/` -- API routes go in `apps/admin/`
- Any existing API routes or middleware

### Key Decisions

1. **Singleton pool pattern** -- The `Pool` is created once at module level and reused across all requests. Next.js hot reloading in dev can cause multiple pool instances; consider using `globalThis` caching in development:
   ```typescript
   const globalForPg = globalThis as unknown as { statsbombPool: Pool };
   const pool = globalForPg.statsbombPool ?? new Pool({ ... });
   if (process.env.NODE_ENV !== "production") globalForPg.statsbombPool = pool;
   ```

2. **SQL files on disk (not inline)** -- Keeping SQL in `.sql` files preserves syntax highlighting, makes diffs readable, and matches the source project structure. The loader caches them in memory.

3. **Handler factory pattern** -- `createStatsBombHandler` reduces each route file to a ~10-line configuration object. Routes that need custom logic (multi-query routes like `/shots` and `/set-pieces`) can use a custom handler instead.

4. **No authentication on these routes yet** -- Authentication/authorization for API routes is a cross-cutting concern handled separately. These routes are internal (admin app) and will be protected by the app's auth layer.

5. **Parameter types are always strings from URL search params** -- The `buildParams` function is responsible for casting to the correct type (e.g., `parseInt(params.teamId)`) before passing to the SQL query.

### StatsBomb Schema Notes

- **`silver` schema:** Contains raw/cleaned event data (events, possessions, shots, set pieces)
- **`gold` schema:** Contains aggregated/computed data (team_matches, match_expected_stats, season averages, player stats)
- All queries are SELECT-only (read-only access)

### Testing Approach

- **Manual testing:** Hit each API route with valid/invalid parameters using curl or browser and verify JSON responses
- **Connection test:** Create a simple health-check route at `/api/statsbomb/health` that runs `SELECT 1` to verify connectivity (optional, helpful during development)
- **Error scenarios:** Test with missing env var, invalid params, and unreachable database
- **No unit tests required in this story** -- SQL queries are ported verbatim and validated against the live database

### Dependencies

- **Builds on:** None (first story in Epic 8)
- **Blocks:** Story 8.2 (SportMonks -- similar pattern, can share connection utilities), Epic 9 (Analytics Dashboards -- consumes these API routes)
- **External dependency:** Access to the StatsBomb PostgreSQL database (connection string and credentials)
