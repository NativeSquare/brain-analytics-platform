# Story 14.4: Injury Access Control & Reports

Status: ready
Story Type: fullstack
Sprint: 2
Epic: 14 — Injury Reporting

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a platform administrator,
I want injury details to be restricted to medical staff and admins while non-medical users see only an availability indicator, and I want access to aggregate injury reports,
so that clinical data remains confidential while coaches and analysts can still see who is available, and leadership can make data-driven decisions about player health trends.

## Acceptance Criteria (BDD)

### AC 1: `canViewInjuryDetails` query returns role-based boolean

**Given** the user is authenticated and belongs to a team,
**When** the `injuries.queries.canViewInjuryDetails` query is called,
**Then** it returns `true` if the user's role is `admin` or `physio`,
**And** returns `false` for all other roles (`coach`, `analyst`, `player`, `staff`),
**And** the query uses `requireAuth(ctx)` (not `requireRole`) so non-medical users do not receive an error — they receive `false`.

### AC 2: Injury detail queries return `null` (not error) for unauthorized reads

**Given** a user with a non-medical role (`coach`, `analyst`, `player`, `staff`) calls any injury detail query (`getInjuryById`, `getPlayerInjuryDetails`),
**When** the query executes,
**Then** it returns `null` instead of throwing a `NOT_AUTHORIZED` error,
**And** this follows the same pattern as `getContract` in `packages/backend/convex/contracts/queries.ts` (Story 6.2) — silent denial, no error leak.

### AC 3: Player profile Injuries tab omitted from DOM for non-medical users

**Given** a user with a non-medical role navigates to `/players/[playerId]`,
**When** the `PlayerProfileTabs` component renders,
**Then** the "Injuries" tab trigger and tab content panel are completely absent from the DOM (not hidden via CSS, not rendered at all),
**And** this uses the existing `tabAccess.showInjuries` boolean from `getPlayerTabAccess`,
**And** this matches the same pattern as the Contract tab (`tabAccess.showContract`).

### AC 4: Player cards show only a status dot for non-medical users

**Given** a user with any role views the player list (`/players`) or a player card,
**When** a player has a current injury,
**Then** non-medical users see only a colored dot indicator: red = injured, green = available,
**And** the dot has NO tooltip, NO popover, NO click handler that reveals injury details (body region, type, severity, notes),
**And** medical users (`admin`, `physio`) see the same dot PLUS a tooltip showing "Currently injured" (no clinical details on the card itself — details are in the Injuries tab).

### AC 5: `getInjuryReportByPlayer` query (admin only)

**Given** the user has the `admin` role,
**When** `injuries.queries.getInjuryReportByPlayer` is called,
**Then** it returns an array of objects: `{ playerId, playerName, totalInjuries, totalDaysLost, currentlyInjured: boolean }`,
**And** `totalDaysLost` is computed as the sum of days between each injury's `date` and its `clearanceDate` (or `Date.now()` if still current),
**And** results are sorted by `totalDaysLost` descending (most days lost first),
**And** the query is scoped to `teamId`,
**And** non-admin users calling this query receive `null` (not an error).

### AC 6: `getInjuryReportBySeason` query (admin only)

**Given** the user has the `admin` role,
**When** `injuries.queries.getInjuryReportBySeason` is called with optional `{ seasons?: string[] }`,
**Then** it returns an array of objects: `{ season: string, totalInjuries: number, totalDaysLost: number }`,
**And** season is derived from the injury `date` field using football season logic (Aug-Jul, e.g. injury in Oct 2025 = "2025/26"),
**And** results are sorted by season descending (most recent first),
**And** non-admin users calling this query receive `null`.

### AC 7: `getInjuryReportByType` query (admin only)

**Given** the user has the `admin` role,
**When** `injuries.queries.getInjuryReportByType` is called,
**Then** it returns an array of objects: `{ injuryType: string, count: number, totalDaysLost: number, avgDaysLost: number }`,
**And** results are grouped by `injuryType` (case-insensitive grouping),
**And** sorted by `count` descending,
**And** non-admin users calling this query receive `null`.

### AC 8: Injury Reports page (admin only)

**Given** the user has the `admin` role,
**When** they navigate to `/injuries/reports` (or the "Reports" tab within the injury/medical section),
**Then** three report sections are displayed:
1. **Injuries per Player** — data table with columns: Player Name, Total Injuries, Total Days Lost, Currently Injured (badge). Sortable by any column.
2. **Injuries per Season** — bar chart (Recharts `BarChart`) showing total injuries per football season. X-axis = season, Y-axis = injury count.
3. **Time Lost per Injury Type** — data table with columns: Injury Type, Count, Total Days Lost, Avg Days Lost. Sortable by any column.

**And** each section uses Convex `useQuery` for real-time data,
**And** loading states render `Skeleton` components,
**And** empty states show a meaningful message ("No injury data available").

### AC 9: Reports page inaccessible to non-admin users

**Given** a user with any non-admin role navigates to `/injuries/reports`,
**When** the page loads,
**Then** they are redirected to the homepage (or shown "Access denied"),
**And** the "Reports" navigation link is not visible in the sidebar for non-admin roles.

### AC 10: Cross-team isolation enforced on all report queries

**Given** an admin user from Team A calls any report query,
**When** the query executes,
**Then** it returns data only for Team A's players and injuries,
**And** no data from Team B is ever included,
**And** this is enforced at the Convex query layer via `teamId` filtering.

### AC 11: Unit tests cover the full RBAC matrix

**Given** the test suite runs,
**When** all access control tests execute,
**Then** at least 10 unit tests pass covering:
- `canViewInjuryDetails`: admin=true, physio=true, coach=false, analyst=false, player=false, staff=false
- `getInjuryReportByPlayer`: admin=data, physio=null, coach=null, player=null
- `getInjuryReportBySeason`: admin=data, non-admin=null
- `getInjuryReportByType`: admin=data, non-admin=null
- Cross-team isolation: admin from Team B gets empty results (not Team A data)
- `getPlayerInjuryDetails`: admin=data, physio=data, coach=null, player=null (for non-self)

## Tasks / Subtasks

- [ ] **Task 1: Create `canViewInjuryDetails` query** (AC: #1)
  - [ ] 1.1: In `packages/backend/convex/injuries/queries.ts` (create file if module `injuries/` does not exist — otherwise add to existing `players/queries.ts`), implement `canViewInjuryDetails` query. Accepts no args. Calls `requireAuth(ctx)` (NOT `requireRole`). Returns `true` if `user.role === "admin" || user.role === "physio"`, else returns `false`. Never throws for valid authenticated users.
  - [ ] 1.2: Export as part of the injuries module API.

- [ ] **Task 2: Create `getPlayerInjuryDetails` query with null-return pattern** (AC: #2)
  - [ ] 2.1: In the same queries file, implement `getPlayerInjuryDetails` query. Accepts `{ playerId: v.id("players") }`. Calls `requireAuth(ctx)`. If `user.role` is NOT `admin` or `physio`, return `null` (no error). Validates player belongs to same team (return `null` if not). Fetches all `playerInjuries` for that player via `by_playerId` index. Returns the full injury array with all clinical fields (injuryType, severity, bodyRegion, mechanism, notes, rehabNotes, timeline data). Sorted by `date` descending.
  - [ ] 2.2: This mirrors the `getContract` null-return pattern from `contracts/queries.ts`.

- [ ] **Task 3: Update player card injury indicator for non-medical users** (AC: #4)
  - [ ] 3.1: In `apps/web/src/components/players/PlayerTable.tsx`, modify the existing injury status indicator. For non-medical users: render a simple colored dot (`<span>` with `rounded-full` classes, `bg-destructive` for injured, `bg-green-500` for available). No `Tooltip` wrapper for non-medical users.
  - [ ] 3.2: Use `useQuery(api.injuries.queries.canViewInjuryDetails)` (or the existing `canViewInjuryDetails` check) to determine whether to show the tooltip. Medical users keep the existing `Tooltip` with "Currently injured" text.
  - [ ] 3.3: In `apps/web/src/components/players/PlayerProfileHeader.tsx`, apply the same logic: dot only for non-medical, dot + tooltip for medical.

- [ ] **Task 4: Create `getInjuryReportByPlayer` query** (AC: #5, #10)
  - [ ] 4.1: In the injuries queries file, implement `getInjuryReportByPlayer`. Calls `requireAuth(ctx)`. If `user.role !== "admin"`, return `null`. Queries all `playerInjuries` for the team using `by_teamId` index. Queries all `players` for the team. Groups injuries by `playerId`. For each player: computes `totalInjuries` (count), `totalDaysLost` (sum of `(clearanceDate ?? Date.now()) - date` converted to days via `Math.ceil(diff / 86400000)`), `currentlyInjured` (any entry with `status === "current"`). Joins with player `firstName + lastName` for `playerName`. Returns array sorted by `totalDaysLost` desc.
  - [ ] 4.2: Players with zero injuries are excluded from the report (only players who have injury records appear).

- [ ] **Task 5: Create `getInjuryReportBySeason` query** (AC: #6, #10)
  - [ ] 5.1: Implement `getInjuryReportBySeason`. Calls `requireAuth(ctx)`. If `user.role !== "admin"`, return `null`. Queries all `playerInjuries` for the team. Derives season from each injury `date`: if month >= 8 (August), season = `"{year}/{year+1 last 2 digits}"` (e.g. Oct 2025 = "2025/26"); if month < 8, season = `"{year-1}/{year last 2 digits}"` (e.g. Mar 2026 = "2025/26"). Groups by season. Computes `totalInjuries` and `totalDaysLost` per season. Returns array sorted by season desc.
  - [ ] 5.2: Create a helper function `getFootballSeason(dateMs: number): string` for the season derivation logic, exported for reuse and testability.

- [ ] **Task 6: Create `getInjuryReportByType` query** (AC: #7, #10)
  - [ ] 6.1: Implement `getInjuryReportByType`. Calls `requireAuth(ctx)`. If `user.role !== "admin"`, return `null`. Queries all `playerInjuries` for the team. Groups by `injuryType` (lowercase-normalized for grouping, original case preserved for display — use the first occurrence's casing). Computes `count`, `totalDaysLost`, `avgDaysLost` (rounded to 1 decimal). Returns array sorted by `count` desc.

- [ ] **Task 7: Build Injury Reports page** (AC: #8, #9)
  - [ ] 7.1: Create `apps/web/src/app/(app)/injuries/reports/page.tsx`. Wrap in role guard: use `canViewInjuryDetails` or a direct admin role check. If non-admin, redirect to `/` or render "Access denied" message.
  - [ ] 7.2: Create `apps/web/src/components/injuries/InjuryReportByPlayer.tsx`. Calls `useQuery(api.injuries.queries.getInjuryReportByPlayer)`. Renders a sortable data table with columns: Player Name, Total Injuries (number), Total Days Lost (number), Currently Injured (badge — red "Injured" or green "Available"). Loading state with `Skeleton`. Empty state with message.
  - [ ] 7.3: Create `apps/web/src/components/injuries/InjuryReportBySeason.tsx`. Calls `useQuery(api.injuries.queries.getInjuryReportBySeason)`. Renders a Recharts `BarChart` with `XAxis` = season label, `YAxis` = injury count, `Bar` fill using the design system's primary color. Responsive container. Loading state with `Skeleton`. Empty state with message.
  - [ ] 7.4: Create `apps/web/src/components/injuries/InjuryReportByType.tsx`. Calls `useQuery(api.injuries.queries.getInjuryReportByType)`. Renders a sortable data table with columns: Injury Type, Count, Total Days Lost, Avg Days Lost (1 decimal). Loading state with `Skeleton`. Empty state with message.
  - [ ] 7.5: Compose all three components in the page with section headings ("Injuries per Player", "Injuries per Season", "Time Lost per Injury Type") inside `Card` components.

- [ ] **Task 8: Add Reports navigation link (admin only)** (AC: #9)
  - [ ] 8.1: In the sidebar navigation configuration, add an "Injury Reports" link pointing to `/injuries/reports`. Conditionally render it only for users with `admin` role. Use an appropriate Tabler icon (e.g. `IconReportMedical` or `IconChartBar`).

- [ ] **Task 9: Write backend unit tests** (AC: #11)
  - [ ] 9.1: Create `packages/backend/convex/injuries/__tests__/access-control.test.ts` (or add to existing injury test file) using `@convex-dev/test` + `vitest`.
  - [ ] 9.2: Test `canViewInjuryDetails`:
    - (a) admin user returns `true`
    - (b) physio user returns `true`
    - (c) coach user returns `false`
    - (d) analyst user returns `false`
    - (e) player user returns `false`
    - (f) staff user returns `false`
  - [ ] 9.3: Test `getPlayerInjuryDetails`:
    - (a) admin can retrieve full injury details for a player on their team
    - (b) physio can retrieve full injury details
    - (c) coach receives `null` (not error)
    - (d) player receives `null` for another player's injuries
    - (e) cross-team admin receives `null` (player not on their team)
  - [ ] 9.4: Test `getInjuryReportByPlayer`:
    - (a) admin receives data array with correct aggregations
    - (b) physio receives `null`
    - (c) coach receives `null`
    - (d) admin from different team receives empty array (no cross-team data)
    - (e) `totalDaysLost` calculation is correct (uses `clearanceDate` for recovered, `Date.now()` for current)
  - [ ] 9.5: Test `getInjuryReportBySeason`:
    - (a) admin receives correctly grouped season data
    - (b) non-admin receives `null`
    - (c) season derivation: Oct 2025 injury = "2025/26", Mar 2026 injury = "2025/26", Aug 2025 = "2025/26", Jul 2025 = "2024/25"
  - [ ] 9.6: Test `getInjuryReportByType`:
    - (a) admin receives correctly grouped type data
    - (b) non-admin receives `null`
    - (c) case-insensitive grouping: "Hamstring strain" and "hamstring strain" are grouped together
    - (d) `avgDaysLost` is computed correctly
  - [ ] 9.7: Test cross-team isolation:
    - (a) admin from Team A sees only Team A injuries in all report queries
    - (b) admin from Team B sees only Team B injuries

- [ ] **Task 10: Final validation** (AC: all)
  - [ ] 10.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 10.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 10.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [ ] 10.4: Start the dev server — log in as admin. Navigate to `/injuries/reports`. Verify all three report sections render with mock injury data.
  - [ ] 10.5: Verify the "Injuries per Player" table shows correct player names, injury counts, and days lost.
  - [ ] 10.6: Verify the "Injuries per Season" bar chart renders seasons correctly.
  - [ ] 10.7: Verify the "Time Lost per Injury Type" table shows grouped types with correct aggregations.
  - [ ] 10.8: Log in as physio — verify `/injuries/reports` is NOT accessible (redirect or access denied). Verify injury details are still visible on player profiles (Injuries tab present).
  - [ ] 10.9: Log in as coach — verify Injuries tab is NOT visible on player profiles. Verify player cards show only a colored dot (no tooltip with details). Verify `/injuries/reports` is NOT accessible.
  - [ ] 10.10: Log in as player — verify same restrictions as coach. Verify no injury details leak through any query.
  - [ ] 10.11: Verify the sidebar "Injury Reports" link is visible only to admin users.
  - [ ] 10.12: Verify real-time updates: log a new injury as physio in one tab, verify admin's report page updates without refresh.

## Dev Notes

### Architecture Context

This story completes Epic 14 (Injury Reporting) by adding two critical layers:

1. **Access Control Hardening** — While Story 5.5 already gates injury detail queries behind `requireRole(["admin", "physio"])`, this story adds the null-return pattern (from Story 6.2) for graceful denial, the `canViewInjuryDetails` boolean query for frontend conditional rendering, and ensures player cards leak zero clinical data to non-medical users.

2. **Aggregate Reporting** — Admin-only summary reports that provide strategic insight without exposing individual clinical records to non-admin roles. Even physio users (who can see individual injuries) cannot access the aggregate reports — those are admin-only for leadership decision-making.

This story directly implements:

- **FR24:** Medical/injury data visible only to medical staff; non-medical roles see status indicator only
- **NFR7:** Medical/injury data accessible only to users with medical staff role
- **NFR5:** Data access enforced at the Convex mutation/query layer
- **NFR6:** Multi-tenant isolation via `teamId` scoping

### Critical Security Pattern: null-Return (Story 6.2)

The contract security pattern established in Story 6.2 (`packages/backend/convex/contracts/queries.ts`) returns `null` instead of throwing errors for unauthorized reads. This prevents:

- **Information leakage:** An error message like "NOT_AUTHORIZED" confirms the resource exists. Returning `null` is indistinguishable from "resource not found."
- **Client-side error handling complexity:** The frontend can simply check `if (!data) return null` instead of catching errors.

All injury detail queries and report queries in this story MUST follow this pattern:

```typescript
// CORRECT — null-return pattern:
export const getPlayerInjuryDetails = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Role check — return null, not error
    if (user.role !== "admin" && user.role !== "physio") {
      return null;
    }

    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return null;
    }

    // ... fetch and return injury data
  },
});
```

```typescript
// WRONG — do NOT do this for read queries:
const { user, teamId } = await requireRole(ctx, ["admin", "physio"]);
// This throws NOT_AUTHORIZED for non-medical users
```

**Note:** The existing `getPlayerInjuries` query from Story 5.5 uses `requireRole` (throws on denial). That is acceptable for queries called only from medical-gated UI (the Injuries tab, which is already hidden from non-medical users). The NEW queries in this story (`canViewInjuryDetails`, `getPlayerInjuryDetails`, report queries) use the null-return pattern because they may be called from contexts visible to all roles (e.g., player cards).

### Key Architectural Decisions

- **`canViewInjuryDetails` as a standalone query:** This is the frontend's single source of truth for "should I render injury-related UI?" Same pattern as `canViewContract` in `contracts/queries.ts`. Called once per page load, result drives conditional rendering.

- **Reports are admin-only (not physio):** Physio users have clinical access to individual injury records (CRUD via Story 5.5). Aggregate reports (injuries per player, per season, time lost) are strategic/management data — restricted to admins. This separation prevents scope creep of the physio role.

- **Player card dot indicator:** The simplest possible UI for non-medical users. A `<span>` with `rounded-full w-2 h-2` classes. No interactivity, no tooltip, no details. This ensures zero clinical data leakage even through UI affordances.

- **Season derivation uses football calendar (Aug-Jul):** A season runs from August to July. An injury in October 2025 belongs to season "2025/26". An injury in March 2026 also belongs to "2025/26". An injury in July 2025 belongs to "2024/25". The `getFootballSeason` helper encapsulates this logic.

- **`totalDaysLost` computation:** For recovered injuries: `clearanceDate - date` in days. For current (ongoing) injuries: `Date.now() - date` in days. This means the "per player" and "per type" reports show live-updating totals for ongoing injuries.

### Existing Patterns to Follow

**canViewContract pattern (from `contracts/queries.ts`):**

```typescript
export const canViewContract = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) return false;
    if (user.role === "admin") return true;
    if (user.role === "player") {
      return await isPlayerSelf(ctx, playerId, user._id, teamId);
    }
    return false;
  },
});
```

**canViewInjuryDetails is simpler — no player context needed:**

```typescript
export const canViewInjuryDetails = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return user.role === "admin" || user.role === "physio";
  },
});
```

**Tab omission pattern (from `PlayerProfileTabs.tsx`):**

```typescript
// Existing pattern — Contract tab conditionally rendered:
{tabAccess.showContract && (
  <TabsTrigger value="contract">
    <IconFileText className="mr-2 h-4 w-4" />
    Contract
  </TabsTrigger>
)}

// Injuries tab already follows this pattern via tabAccess.showInjuries
// No changes needed to PlayerProfileTabs — this is already implemented in Story 5.5
```

**Report query pattern (admin null-return):**

```typescript
export const getInjuryReportByPlayer = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);
    if (user.role !== "admin") return null;

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    const players = await ctx.db
      .query("players")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Group, aggregate, join, return
  },
});
```

**Bar chart pattern (from existing dashboards, e.g. Story 9.2):**

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={seasonData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="season" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="totalInjuries" fill="hsl(var(--primary))" />
  </BarChart>
</ResponsiveContainer>
```

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `playerInjuries` table with full schema | Story 5.5 / 14.1 | `packages/backend/convex/table/playerInjuries.ts` must exist |
| `getPlayerInjuries` query (medical-gated) | Story 5.5 | Must exist in `players/queries.ts` |
| `getPlayerInjuryStatus` query (boolean-only) | Story 5.5 | Must exist in `players/queries.ts` |
| `getPlayerTabAccess` with `showInjuries` | Story 5.1 | Must return `showInjuries: true` for admin/physio |
| `PlayerProfileTabs` with conditional Injuries tab | Story 5.5 | Tab already conditionally rendered |
| `PlayerTable` with injury indicator | Story 5.5 | Indicator already exists — this story modifies it |
| `canViewContract` pattern | Story 6.2 | `contracts/queries.ts` must exist as reference |
| `requireAuth`, `requireRole`, `requireMedical` | Story 2.1 / 11.4 | `packages/backend/convex/lib/auth.ts` must export these |
| Injury clinical classification (body region, mechanism) | Story 14.1 | Schema must include these fields |
| Injury timeline (days out, return dates) | Story 14.2 | Timeline data must exist |
| Return-to-play workflow (status badges) | Story 14.3 | Color-coded status badges must exist |
| Recharts installed and configured | Story 7.3 | `recharts` must be in `apps/web` dependencies |

### Current State (Baseline)

**`canViewInjuryDetails`:** Does NOT exist. Must be created.

**Player card injury indicator:** Exists from Story 5.5 — currently renders `IconActivityHeartbeat` with a `Tooltip` saying "Currently injured" for ALL users. Must be modified: non-medical users get a plain dot with no tooltip; medical users keep the tooltip.

**Injuries tab on player profile:** Already conditionally rendered via `tabAccess.showInjuries` (Story 5.5). No changes needed — AC 3 is already satisfied. Verify during final validation.

**Report queries:** Do NOT exist. Must be created.

**Report page:** Does NOT exist. Must be created.

**Sidebar link for reports:** Does NOT exist. Must be added with admin-only visibility.

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/injuries/queries.ts` | Created | `canViewInjuryDetails`, `getPlayerInjuryDetails`, `getInjuryReportByPlayer`, `getInjuryReportBySeason`, `getInjuryReportByType` queries |
| `packages/backend/convex/injuries/index.ts` | Created (if needed) | Module barrel export |
| `apps/web/src/components/players/PlayerTable.tsx` | Modified | Injury indicator: dot-only for non-medical, dot+tooltip for medical |
| `apps/web/src/components/players/PlayerProfileHeader.tsx` | Modified | Same indicator change as PlayerTable |
| `apps/web/src/app/(app)/injuries/reports/page.tsx` | Created | Admin-only injury reports page |
| `apps/web/src/components/injuries/InjuryReportByPlayer.tsx` | Created | Injuries-per-player data table |
| `apps/web/src/components/injuries/InjuryReportBySeason.tsx` | Created | Injuries-per-season bar chart |
| `apps/web/src/components/injuries/InjuryReportByType.tsx` | Created | Time-lost-per-type data table |
| Sidebar navigation config | Modified | Add "Injury Reports" link for admin role |
| `packages/backend/convex/injuries/__tests__/access-control.test.ts` | Created | 10+ unit tests for RBAC matrix |

### What This Story Does NOT Include

- **No changes to existing injury CRUD mutations** — `logInjury`, `updateInjury`, `deleteInjury` remain as-is from Story 5.5
- **No changes to `getPlayerInjuries` query** — it continues to use `requireRole` (throws on denial) since it is only called from medical-gated UI
- **No PDF/CSV export of reports** — out of scope, potential future enhancement
- **No drill-down from report rows to individual injuries** — reports show aggregate data only
- **No date range filtering on reports** — the season report provides temporal segmentation; custom date ranges are a future enhancement
- **No physio access to reports** — reports are admin-only strategic views
- **No notification when injuries affect squad availability thresholds** — potential future feature
- **No player self-view of own injury history** — per FR24, injury details are medical-only

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Stories 14.1-14.3 not complete (missing body region, mechanism, timeline fields) | Check `playerInjuries` schema before starting. If fields are missing, report queries can still work with the Story 5.5 baseline fields (injuryType, severity, date, clearanceDate, status). |
| `getFootballSeason` edge case at August boundary | Unit test all boundary cases: Aug 1 (new season), Jul 31 (previous season), Jan 1 (mid-season). |
| `totalDaysLost` for current injuries changes on every query call | This is by design — live-updating. Document that report values for current injuries are approximate and change daily. |
| Performance with large injury datasets | Injuries are team-scoped and typically < 500 records per team per season. Index-based queries and in-memory aggregation are sufficient. No pagination needed for MVP. |
| Case-insensitive grouping may merge unintended injury types | Use `.toLowerCase()` for grouping key, display the first occurrence's original casing. This is acceptable for MVP; a structured injury taxonomy (Epic future) would resolve this. |

### Performance Considerations

- **Report queries aggregate in memory:** All three report queries fetch the full team's injury records (indexed by `by_teamId`) and aggregate in the query handler. For typical datasets (< 500 injuries per team), this is fast (< 50ms).
- **`canViewInjuryDetails` is a cheap query:** No DB reads beyond the auth user lookup. Results are cached by Convex's reactive system.
- **Player card indicators:** Already optimized in Story 5.5 via batch query `getPlayersInjuryStatuses`. No change needed.

### Alignment with Architecture Document

- **Auth Pattern:** `requireAuth` + manual role check + null return for read queries — matches architecture.md "silent denial" principle and Story 6.2 contract pattern
- **Medical Data Guard:** Clinical data never returned to non-medical users — satisfies NFR7
- **Admin Reports:** Admin-only aggregate views — no individual clinical data exposure
- **Data Model:** Leverages existing `playerInjuries` table with `by_teamId` index
- **Component Structure:** Report components in `components/injuries/` — feature-grouped per architecture.md
- **Convex Organization:** Queries in `convex/injuries/queries.ts` — module-grouped per architecture.md
- **Charting:** Recharts `BarChart` — same library used across all dashboards
- **Testing:** Co-located in `convex/injuries/__tests__/`
- **No detected conflicts** with the architecture document

### RBAC Matrix Summary

| Query | admin | physio | coach | analyst | player | staff |
|-------|-------|--------|-------|---------|--------|-------|
| `canViewInjuryDetails` | `true` | `true` | `false` | `false` | `false` | `false` |
| `getPlayerInjuryDetails` | data | data | `null` | `null` | `null` | `null` |
| `getPlayerInjuries` (Story 5.5) | data | data | throws | throws | throws | throws |
| `getPlayerInjuryStatus` (Story 5.5) | data | data | data | data | data | data |
| `getInjuryReportByPlayer` | data | `null` | `null` | `null` | `null` | `null` |
| `getInjuryReportBySeason` | data | `null` | `null` | `null` | `null` | `null` |
| `getInjuryReportByType` | data | `null` | `null` | `null` | `null` | `null` |
| Injuries tab (UI) | visible | visible | hidden | hidden | hidden | hidden |
| Reports page (UI) | accessible | denied | denied | denied | denied | denied |
| Player card indicator | dot+tooltip | dot+tooltip | dot only | dot only | dot only | dot only |

### References

- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, requireMedical, RBAC model, teamId scoping
- [Source: contracts/queries.ts] — canViewContract pattern, getContract null-return pattern (Story 6.2)
- [Source: lib/auth.ts] — requireAuth, requireRole, requireMedical, requireAdmin, getTeamResource, requireAdminOrRole
- [Source: epics.md#Epic-14] — Story 14.4 definition: access control + admin reports
- [Source: Story 5.5] — Injury CRUD, getPlayerInjuries (requireRole), getPlayerInjuryStatus (boolean-only), PlayerTable indicator, Injuries tab visibility
- [Source: Story 6.2] — Contract security pattern (null-return for unauthorized reads)
- [Source: Story 14.1] — Injury schema with clinical classification fields
- [Source: Story 14.2] — Injury timeline and rehab notes
- [Source: Story 14.3] — Return-to-play workflow and medical dashboard
