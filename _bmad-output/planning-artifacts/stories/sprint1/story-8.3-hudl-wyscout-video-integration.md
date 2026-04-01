# Story 8.3: Hudl Mapping & Wyscout Video Clip Integration

Status: draft
Story Type: backend + API
Points: 8

> **PROJECT SCOPE:** API routes go in `apps/admin/app/api/wyscout/`. Caching tables and storage go in `packages/backend/convex/`. This is the only story in Epic 8 that touches Convex.

## Story

As a football analyst,
I want to click on a match event (shot, pass, set piece) in the pitch visualization and instantly see the corresponding video clip,
so that I can perform tactical analysis with synchronized video evidence without manually searching through footage.

## Video Integration Flow

The end-to-end flow when a user clicks an event on the pitch:

1. **User clicks an event** on a pitch visualization (Shot Map, Event Map, or Set Pieces dashboard). The frontend has the StatsBomb match ID, the event timestamp, and the period (1H, 2H, ET1, ET2).
2. **Map StatsBomb match ID to Wyscout match ID** via the Hudl GraphQL mapping API (`/api/wyscout/match-id`). Result is cached in Convex to avoid repeated Hudl lookups.
3. **Fetch period offsets** for the Wyscout match (`/api/wyscout/offsets`). These provide the absolute timestamp base for each period (1H, 2H, ET1, ET2).
4. **Calculate absolute timestamp**: `absolute_ts = event_timestamp + period_offset_for_period`.
5. **Fetch video clip URL** for the timestamp range (`/api/wyscout/urls`) with ~5 seconds padding before and after the event.
6. **Video plays** in an embedded player in the event details pane.

## Acceptance Criteria

### AC 1: Hudl GraphQL mapping resolves StatsBomb match ID to Wyscout match ID

**Given** a valid StatsBomb match ID
**When** the client calls `GET /api/wyscout/match-id?statsbomb_match_id={id}`
**Then** the API sends a GraphQL query to `HUDL_MAPPING_URL` with the `HUDL_MAPPING_TOKEN` bearer token
**And** returns a JSON response `{ wyscoutMatchId: string }` with HTTP 200
**And** the mapping is persisted in the `wyscoutMatchMappings` Convex table for future lookups

### AC 2: Cached Hudl mappings are returned without external API call

**Given** a StatsBomb match ID that has already been resolved and cached in Convex
**When** the client calls `GET /api/wyscout/match-id?statsbomb_match_id={id}`
**Then** the API returns the cached Wyscout match ID from Convex without calling the Hudl GraphQL endpoint
**And** the response includes `{ wyscoutMatchId: string, cached: true }` with HTTP 200

### AC 3: Wyscout OAuth2 client credentials flow obtains access token

**Given** the environment variables `WYSCOUT_CLIENT_ID` and `WYSCOUT_CLIENT_SECRET` are configured
**When** any Wyscout REST API call is made and no valid token exists (or the existing token has expired)
**Then** the API performs an OAuth2 client credentials grant to obtain an access token
**And** the token is stored in memory with its expiry time and reused for subsequent requests within the same server process
**And** expired tokens are automatically refreshed before use

### AC 4: Period offsets are retrieved for a Wyscout match

**Given** a valid Wyscout match ID
**When** the client calls `GET /api/wyscout/offsets?wyscout_match_id={id}`
**Then** the API calls the Wyscout REST API to retrieve period offset timestamps
**And** returns a JSON response with the structure:
```json
{
  "offsets": {
    "1H": { "start": <number>, "end": <number> },
    "2H": { "start": <number>, "end": <number> },
    "ET1": { "start": <number>, "end": <number> },
    "ET2": { "start": <number>, "end": <number> }
  }
}
```
**And** the HTTP status is 200

### AC 5: Video clip URL is retrieved for a timestamp range

**Given** a valid Wyscout match ID, a start timestamp, and an end timestamp
**When** the client calls `GET /api/wyscout/urls?wyscout_match_id={id}&start_timestamp={ts}&end_timestamp={ts}`
**Then** the API calls the Wyscout REST API to get the video URL for the specified time range
**And** the default quality is `HD` if no `quality` query parameter is provided
**And** returns a JSON response `{ url: string, quality: string, expiresAt: number }` with HTTP 200

### AC 6: Quality selection is supported for video URLs

**Given** a valid video URL request
**When** the client includes `quality=LQ|SD|HD|Full-HD` as a query parameter
**Then** the API requests the video URL at the specified quality from Wyscout
**And** if the requested quality is unavailable, falls back to the next lower available quality
**And** the response includes the actual quality served in the `quality` field

### AC 7: Video URLs are cached in Convex storage with signed URLs

**Given** a video URL has been fetched from Wyscout for a specific match, timestamp range, and quality
**When** the same video clip is requested again
**Then** the API checks the `wyscoutVideoCache` Convex table for an existing entry matching (wyscoutMatchId, startTimestamp, endTimestamp, quality)
**And** if a valid (non-expired) cached entry exists, returns a Convex storage signed URL without calling Wyscout
**And** if the cached entry has expired, fetches a fresh URL from Wyscout and updates the cache

### AC 8: Missing or invalid environment variables return clear errors

**Given** any of the required environment variables are missing or empty (`HUDL_MAPPING_URL`, `HUDL_MAPPING_TOKEN`, `WYSCOUT_BASE_URL`, `WYSCOUT_CLIENT_ID`, `WYSCOUT_CLIENT_SECRET`)
**When** an API route that depends on the missing variable is called
**Then** the API returns HTTP 500 with `{ error: "Configuration error: <VARIABLE_NAME> is not set" }`
**And** the error is logged server-side with sufficient detail for debugging

### AC 9: External API errors are handled gracefully

**Given** the Hudl GraphQL API or Wyscout REST API returns an error (network failure, 4xx, 5xx)
**When** any `/api/wyscout/*` route encounters the error
**Then** the API returns an appropriate HTTP status (502 for upstream errors, 400 for bad client input)
**And** the response body includes `{ error: string, upstream?: string }` with a human-readable message
**And** the error is logged server-side with the upstream response details
**And** partial failures do not corrupt the cache (failed lookups are not cached)

### AC 10: Invalid or missing query parameters return 400

**Given** a client calls any `/api/wyscout/*` endpoint
**When** required query parameters are missing or not valid (e.g., non-numeric timestamps, empty match ID)
**Then** the API returns HTTP 400 with `{ error: "Missing or invalid parameter: <param_name>" }`

### AC 11: Convex tables for caching are defined with proper schema

**Given** the Convex schema is deployed
**When** the developer inspects the schema
**Then** a `wyscoutMatchMappings` table exists with fields: `statsbombMatchId` (string, indexed), `wyscoutMatchId` (string), `teamId` (id to teams), `createdAt` (number)
**And** a `wyscoutVideoCache` table exists with fields: `wyscoutMatchId` (string), `startTimestamp` (number), `endTimestamp` (number), `quality` (string), `storageId` (optional, id to _storage), `videoUrl` (string), `expiresAt` (number), `teamId` (id to teams), `createdAt` (number)
**And** `wyscoutMatchMappings` has an index on `statsbombMatchId`
**And** `wyscoutVideoCache` has a compound index on `[wyscoutMatchId, startTimestamp, endTimestamp, quality]`

## Tasks / Subtasks

- [ ] **Task 1: Create Convex cache tables** (AC: #11)
  - [ ] 1.1: Create `packages/backend/convex/table/wyscoutMatchMappings.ts` with `defineTable`:
    - `statsbombMatchId: v.string()`
    - `wyscoutMatchId: v.string()`
    - `teamId: v.id("teams")`
    - `createdAt: v.number()`
    - Index: `by_statsbombMatchId` on `["statsbombMatchId"]`
  - [ ] 1.2: Create `packages/backend/convex/table/wyscoutVideoCache.ts` with `defineTable`:
    - `wyscoutMatchId: v.string()`
    - `startTimestamp: v.number()`
    - `endTimestamp: v.number()`
    - `quality: v.string()`
    - `storageId: v.optional(v.id("_storage"))`
    - `videoUrl: v.string()`
    - `expiresAt: v.number()`
    - `teamId: v.id("teams")`
    - `createdAt: v.number()`
    - Index: `by_lookup` on `["wyscoutMatchId", "startTimestamp", "endTimestamp", "quality"]`
  - [ ] 1.3: Register both tables in `packages/backend/convex/schema.ts`

- [ ] **Task 2: Create Convex query and mutation functions for caching** (AC: #2, #7)
  - [ ] 2.1: Create `packages/backend/convex/wyscoutCache.ts` with:
    - `getMatchMapping` query: look up cached mapping by `statsbombMatchId`
    - `saveMatchMapping` mutation: insert a new mapping row
    - `getCachedVideo` query: look up cached video by (wyscoutMatchId, startTimestamp, endTimestamp, quality) where `expiresAt > Date.now()`
    - `saveVideoCache` mutation: upsert a video cache entry
  - [ ] 2.2: All functions must enforce team-scoped access (the caller must provide a `teamId`)

- [ ] **Task 3: Create Wyscout OAuth2 token helper** (AC: #3, #8)
  - [ ] 3.1: Create `apps/admin/src/lib/wyscout-auth.ts`:
    - Validate `WYSCOUT_CLIENT_ID`, `WYSCOUT_CLIENT_SECRET`, `WYSCOUT_BASE_URL` are set
    - Implement `getAccessToken()` that performs client credentials OAuth2 flow
    - Cache the token in a module-level variable with its `expires_at` timestamp
    - Auto-refresh when token is expired or within 60 seconds of expiry

- [ ] **Task 4: Create Hudl GraphQL mapping helper** (AC: #1, #8)
  - [ ] 4.1: Create `apps/admin/src/lib/hudl-mapping.ts`:
    - Validate `HUDL_MAPPING_URL` and `HUDL_MAPPING_TOKEN` are set
    - Implement `getWyscoutMatchId(statsbombMatchId: string)` that sends a GraphQL query to the Hudl endpoint
    - Use `Authorization: Bearer <HUDL_MAPPING_TOKEN>` header
    - Parse and return the Wyscout match ID from the GraphQL response
    - Reference: `football-dashboard-2/src/lib/hudl.ts` for the GraphQL query structure

- [ ] **Task 5: Create Wyscout REST API helper** (AC: #4, #5, #6)
  - [ ] 5.1: Create `apps/admin/src/lib/wyscout-api.ts`:
    - `getMatchOffsets(wyscoutMatchId: string)`: fetch period offsets (1H, 2H, ET1, ET2 start/end timestamps)
    - `getVideoUrl(wyscoutMatchId: string, startTs: number, endTs: number, quality: string)`: fetch video clip URL for a time range at the given quality
    - All functions use `getAccessToken()` from `wyscout-auth.ts`
    - Handle quality fallback logic: if requested quality unavailable, try next lower (Full-HD -> HD -> SD -> LQ)
    - Reference: `football-dashboard-2/src/lib/statsbomb.ts` for Wyscout-related function patterns

- [ ] **Task 6: Create API route `/api/wyscout/match-id`** (AC: #1, #2, #9, #10)
  - [ ] 6.1: Create `apps/admin/app/api/wyscout/match-id/route.ts` with GET handler:
    - Validate `statsbomb_match_id` query parameter (required, non-empty string)
    - Check Convex cache first via `getMatchMapping` query
    - If cached, return `{ wyscoutMatchId, cached: true }`
    - If not cached, call Hudl GraphQL mapping, save to Convex via `saveMatchMapping`, return `{ wyscoutMatchId, cached: false }`
    - Handle errors per AC #9

- [ ] **Task 7: Create API route `/api/wyscout/offsets`** (AC: #4, #9, #10)
  - [ ] 7.1: Create `apps/admin/app/api/wyscout/offsets/route.ts` with GET handler:
    - Validate `wyscout_match_id` query parameter (required, non-empty string)
    - Call `getMatchOffsets()` from `wyscout-api.ts`
    - Return offsets object
    - Handle errors per AC #9

- [ ] **Task 8: Create API route `/api/wyscout/urls`** (AC: #5, #6, #7, #9, #10)
  - [ ] 8.1: Create `apps/admin/app/api/wyscout/urls/route.ts` with GET handler:
    - Validate `wyscout_match_id` (required, non-empty), `start_timestamp` (required, numeric), `end_timestamp` (required, numeric) query parameters
    - Accept optional `quality` parameter (default: `HD`, valid values: `LQ`, `SD`, `HD`, `Full-HD`)
    - Check Convex video cache first via `getCachedVideo` query
    - If valid cached entry exists, return signed URL from Convex storage
    - If not cached or expired, call `getVideoUrl()` from `wyscout-api.ts`, save to Convex via `saveVideoCache`, return URL
    - Handle errors per AC #9

- [ ] **Task 9: Environment variable validation** (AC: #8)
  - [ ] 9.1: Add all five environment variables to the project's `.env.example` (or equivalent):
    - `HUDL_MAPPING_URL`
    - `HUDL_MAPPING_TOKEN`
    - `WYSCOUT_BASE_URL`
    - `WYSCOUT_CLIENT_ID`
    - `WYSCOUT_CLIENT_SECRET`
  - [ ] 9.2: Each API route validates its required env vars at the top of the handler and returns a 500 with a clear message if any are missing

- [ ] **Task 10: Error handling and logging** (AC: #9, #10)
  - [ ] 10.1: All API routes use try/catch with structured error responses
  - [ ] 10.2: Upstream errors (Hudl/Wyscout) return HTTP 502 with `{ error, upstream }` shape
  - [ ] 10.3: Client input errors return HTTP 400 with `{ error }` shape
  - [ ] 10.4: Failed lookups are never written to cache

- [ ] **Task 11: Manual integration testing** (AC: all)
  - [ ] 11.1: Verify `/api/wyscout/match-id` returns a Wyscout match ID for a known StatsBomb match ID
  - [ ] 11.2: Verify the same call returns `cached: true` on the second request
  - [ ] 11.3: Verify `/api/wyscout/offsets` returns period offsets for the resolved Wyscout match ID
  - [ ] 11.4: Verify `/api/wyscout/urls` returns a playable video URL for a known timestamp range
  - [ ] 11.5: Verify missing parameters return 400 errors with clear messages
  - [ ] 11.6: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 11.7: Run `pnpm lint` -- must pass with zero new errors

## Dev Notes

### Architecture Context

This story creates the backend integration layer for video clip playback in the analytics dashboards. The API routes live in `apps/admin/` because they handle external service credentials that should not be exposed to the client-facing `apps/web/` app. The `apps/web/` frontend will call these API routes when a user clicks an event on a pitch visualization.

**Why Convex for caching (not just in-memory)?**
- Match ID mappings are stable and should persist across server restarts and deployments.
- Video cache needs to be team-scoped for multi-tenant correctness.
- Convex storage provides built-in signed URL generation, removing the need for a separate file storage service (the legacy platform used Supabase storage).

### Source Files (Legacy Platform Reference)

- `football-dashboard-2/src/lib/hudl.ts` -- Hudl GraphQL query structure and response parsing
- `football-dashboard-2/src/lib/statsbomb.ts` -- Wyscout-related functions: OAuth2 flow, period offsets, video URL fetching
- `football-dashboard-2/src/app/api/wyscout/*/route.ts` -- Legacy Next.js API route handlers (patterns to follow)

### Files to Create

1. `packages/backend/convex/table/wyscoutMatchMappings.ts` -- Convex table definition
2. `packages/backend/convex/table/wyscoutVideoCache.ts` -- Convex table definition
3. `packages/backend/convex/wyscoutCache.ts` -- Convex queries and mutations
4. `apps/admin/src/lib/wyscout-auth.ts` -- OAuth2 token management
5. `apps/admin/src/lib/hudl-mapping.ts` -- Hudl GraphQL client
6. `apps/admin/src/lib/wyscout-api.ts` -- Wyscout REST API client
7. `apps/admin/app/api/wyscout/match-id/route.ts` -- API route
8. `apps/admin/app/api/wyscout/offsets/route.ts` -- API route
9. `apps/admin/app/api/wyscout/urls/route.ts` -- API route

### Files to Modify

1. `packages/backend/convex/schema.ts` -- Register new tables

### Key Decisions

1. **API routes in `apps/admin/` not `apps/web/`** -- External API credentials (Hudl, Wyscout) are server-side secrets. The admin app handles server-side integrations. The web app calls these routes as a proxy.

2. **Convex storage replaces Supabase storage** -- The legacy platform cached video URLs in Supabase storage with signed URLs. In the rebuild, we use Convex storage which has native signed URL support via `storage.getUrl()`.

3. **OAuth2 token cached in-memory per server process** -- The Wyscout access token is cached in a module-level variable. This is sufficient because Next.js API routes run in a long-lived server process. If the token expires, it is automatically refreshed.

4. **Quality fallback chain: Full-HD -> HD -> SD -> LQ** -- If the requested quality is not available for a match, the API falls back to the next lower quality. This prevents failures when premium qualities are not available for all matches.

5. **~5 second padding on video clips** -- When the frontend requests a clip for a specific event timestamp, it should add ~5 seconds before and after to give the analyst context. This padding is applied client-side before calling the `/urls` endpoint, not server-side.

### Environment Variables

| Variable | Description | Example |
|---|---|---|
| `HUDL_MAPPING_URL` | Hudl GraphQL mapping API endpoint | `https://mapping.hudl.com/graphql` |
| `HUDL_MAPPING_TOKEN` | Bearer token for Hudl API authentication | `hm_xxxxxxxxxxxx` |
| `WYSCOUT_BASE_URL` | Wyscout REST API base URL | `https://apirest.wyscout.com/v3` |
| `WYSCOUT_CLIENT_ID` | Wyscout OAuth2 client ID | `ws_xxxxxxxx` |
| `WYSCOUT_CLIENT_SECRET` | Wyscout OAuth2 client secret | `ws_secret_xxxxxxxx` |

### Testing Approach

- Manual integration testing with real credentials (test environment)
- Verify caching by checking Convex dashboard for cached entries after first call
- Verify cache hit by confirming no external API call on second request (check server logs)
- No unit tests in this story (external API integration); unit tests for the helper functions can be added in a follow-up story with mocked responses

### Dependencies

- **Requires:** Convex backend deployed and accessible (`packages/backend/convex/`)
- **Requires:** Valid Hudl and Wyscout API credentials in environment
- **Consumed by:** Story 7.2 (Pitch Visualizations), Shot Map dashboard, Event Map dashboard, Set Pieces dashboard -- any feature that shows event-level video clips
- **Related:** Story 8.1/8.2 (other external data integrations in Epic 8) -- follows the same API route pattern
