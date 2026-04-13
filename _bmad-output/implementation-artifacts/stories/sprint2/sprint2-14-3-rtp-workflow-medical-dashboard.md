# Story 14.3: Return-to-Play Workflow & Medical Dashboard

Status: draft
Sprint: 2
Epic: 14 (Injury Reporting)
Depends on: Story 5.5 (injury schema + CRUD), Story 14.1 (injury classification — extends schema), Story 14.2 (timeline + notes)
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a medical staff member or admin,
I want a structured Return-to-Play status workflow on each injury and a dedicated Medical Dashboard,
so that the medical team can manage injury recovery progression and see squad health at a glance, while non-medical users see only a simplified injury indicator.

## Background & Dependencies

The existing `playerInjuries` table (`packages/backend/convex/table/playerInjuries.ts`) has a `status` field (string) that currently supports `"current"` and `"recovered"`. This story extends the status field to a four-step Return-to-Play (RTP) workflow and adds a new Medical Dashboard registered in the dashboard-registry.

The existing dashboard infrastructure uses:
- `apps/web/src/lib/dashboard-registry.ts` — maps slug to lazy-loaded component
- `packages/backend/convex/dashboards/queries.ts` — `getDashboardsForRole` filters by role via `roleDashboards` table
- Dynamic route `apps/web/src/app/(app)/dashboards/[slug]/page.tsx` renders any registered dashboard

**Data approach: USE REAL CONVEX DATA** — The Medical Dashboard widgets must query real injury data from the Convex backend. Existing queries in `packages/backend/convex/injuries/queries.ts` (`getInjuryReportByPlayer`, `getInjuryReportByType`) provide aggregated data. A new query `getMedicalDashboardData` must be created to return squad availability, currently injured players, and upcoming returns in a single call. All mock data files must be removed and replaced with live Convex `useQuery` calls.

---

## Acceptance Criteria

### Part A — Return-to-Play Status Workflow

1. **RTP status values extended** — The `playerInjuries.status` field now supports four values: `"active"` (newly reported / active injury), `"rehab"` (in rehabilitation), `"rtp_assessment"` (undergoing return-to-play assessment), `"cleared"` (fully cleared to play). Existing entries with `status: "current"` are treated as `"active"` in the UI (backward-compatible mapping). Existing entries with `status: "recovered"` are treated as `"cleared"`.

2. **Status transition validation** — A new mutation `players.mutations.updateInjuryRtpStatus` accepts `{ injuryId: Id<"playerInjuries">, newStatus: string }`. It enforces:
   - Only `admin` and `physio` roles may call it (`requireRole(ctx, ["admin", "physio"])`).
   - Team-scoped access: injury must belong to the caller's team.
   - **Forward-only transitions**: `active` -> `rehab` -> `rtp_assessment` -> `cleared`. Each step can only advance to the next step.
   - **Re-injury exception**: `cleared` -> `active` is allowed (for re-injury of the same body area). This also clears `clearanceDate` and sets `updatedAt`.
   - Any other transition (e.g., `rehab` -> `active`, `cleared` -> `rehab`, skipping a step) throws a `VALIDATION_ERROR` with message "Invalid status transition from {current} to {new}".
   - On transition to `cleared`, auto-set `clearanceDate` to `Date.now()` if not already set.
   - Sets `updatedAt: Date.now()` on every transition.

3. **Status badge in Injury Log table** — In the `InjuryLog` component (`apps/web/src/components/players/InjuryLog.tsx`), the Status column badge is updated to show four states with distinct colors:
   - `active` — red/destructive badge, label "Active"
   - `rehab` — amber/warning badge, label "Rehab"
   - `rtp_assessment` — blue/info badge, label "RTP Assessment"
   - `cleared` — green/success badge, label "Cleared"
   - Backward-compat: `"current"` renders as `"active"`, `"recovered"` renders as `"cleared"`.

4. **Status transition controls in Injury Log** — Each injury row in the InjuryLog table has a "Change Status" action (in the existing Actions dropdown menu). Clicking it opens a dialog showing the current status and a button to advance to the next valid status (e.g., if current is `"rehab"`, button says "Move to RTP Assessment"). For `"cleared"` injuries, a "Report Re-injury" button is shown instead. The dialog calls the `updateInjuryRtpStatus` mutation. Success shows a toast; error shows the validation message.

5. **RTP status dot on player cards (medical users)** — In `PlayerTable.tsx` (`apps/web/src/components/players/PlayerTable.tsx`), when a player has a current injury (any status other than `"cleared"`), a small color-coded dot appears next to the player name:
   - Red dot: `active` injury
   - Amber dot: `rehab`
   - Blue dot: `rtp_assessment`
   - No dot: `cleared` or no injury
   - This dot is visible **only** to `admin` and `physio` roles. Non-medical users see only the existing `hasCurrentInjury` boolean icon (the commented-out injury icon from Story 5.5, now enabled for all authenticated users as a simple red icon with no status detail).

6. **`getPlayersRtpStatuses` query** — A new query `players.queries.getPlayersRtpStatuses` accepts `{ playerIds: Id<"players">[] }`, calls `requireRole(ctx, ["admin", "physio"])`, returns `Record<string, string | null>` mapping each playerId to its most severe current injury RTP status (priority: `active` > `rehab` > `rtp_assessment` > `cleared` > `null`). This is used by PlayerTable for the color-coded dots. Severity priority ensures the most urgent status shows if a player has multiple concurrent injuries.

7. **Backward-compatible status handling in `updateInjury` mutation** — The existing `updateInjury` mutation (`players.mutations.updateInjury`) is updated to accept the new status values. The validation changes from `["current", "recovered"]` to `["active", "rehab", "rtp_assessment", "cleared", "current", "recovered"]` (accepting legacy values for backward compatibility). New entries created via `logInjury` default to `status: "active"` (changed from `"current"`).

### Part B — Medical Dashboard

8. **Dashboard component created** — A new dashboard component is created at `apps/web/src/components/dashboards/medical-overview/index.tsx` that exports a default component accepting `{ slug: string }`. It renders a medical dashboard layout with the widgets described below. All data comes from **real Convex queries** — a new `getMedicalDashboardData` query returns squad availability, currently injured list, and upcoming returns. Existing queries `getInjuryReportByType` and injury data by body region provide chart data.

9. **Dashboard registered in registry** — The `medical-overview` slug is added to `apps/web/src/lib/dashboard-registry.ts`:
   ```
   "medical-overview": () => import("@/components/dashboards/medical-overview"),
   ```

10. **Dashboard seeded in Convex with role restrictions** — A seed entry is added for the `medical-overview` dashboard in the dashboards table (via seed script or documented manual Convex command). Role assignments are created in `roleDashboards` for `admin` and `physio` roles only. Non-medical roles (coach, analyst, player, staff) do NOT see this dashboard in the gallery.

11. **Squad Availability widget** — A prominent card at the top showing:
    - Big number: squad availability percentage (e.g., "87%") — computed as `(total players - currently injured) / total players * 100`.
    - Subtext: "X of Y players available"
    - Trend indicator: arrow up/down with percentage change from previous month (mock data).
    - Color: green if >= 85%, amber if 70-84%, red if < 70%.

12. **Currently Injured Players widget** — A table/list card showing all currently injured players (mock data). Columns: Player Name, Injury Type, RTP Status (color badge), Days Out (computed from injury date), Expected Return (date string). Sorted by days out descending (longest injury first). Clicking a row does NOT navigate (no routing in mock dashboard). Shows 6-8 mock entries.

13. **Upcoming Returns widget** — A card listing players expected to return within the next 14 days (mock data). Each entry shows: Player Name, Injury Type, Expected Return Date, Days Until Return. Sorted by nearest return date first. Shows 3-4 mock entries.

14. **Injury Frequency by Body Region widget** — A horizontal bar chart (using Recharts `BarChart`) showing injury count by body region. Mock regions: Head/Neck, Shoulder, Knee, Ankle, Hamstring, Groin, Calf, Foot, Back, Hip. Uses the project's existing Recharts integration (see `apps/web/src/components/dashboards/season-overview/PointsChart.tsx` for pattern). Chart uses the team's primary color from the design system.

15. **Injury Frequency by Type widget** — A donut/pie chart (using Recharts `PieChart` with `innerRadius` for donut effect) showing injury distribution by type. Mock types: Muscle strain, Ligament sprain, Fracture, Contusion, Tendinitis, Concussion. Each slice has a distinct color from the design palette. Legend shown below the chart.

16. **Dashboard layout** — The dashboard uses a responsive grid layout:
    - Top row: Squad Availability card (spans 1/3 width on desktop), Upcoming Returns card (spans 2/3 width).
    - Middle row: Currently Injured Players table (full width).
    - Bottom row: Injury by Body Region bar chart (1/2 width), Injury by Type donut chart (1/2 width).
    - On mobile, all cards stack vertically at full width.

17. **Dashboard header** — The dashboard has a header with a medical icon (e.g., `IconActivityHeartbeat` from `@tabler/icons-react` or `Stethoscope` from `lucide-react`) and title "Medical Overview". Consistent with the `SeasonOverview` dashboard header pattern.

18. **Backend query `getMedicalDashboardData`** — A new query in `packages/backend/convex/injuries/queries.ts` returns all data needed by the Medical Dashboard in a single call. Restricted to admin/physio. Returns: `{ squadAvailability: { totalPlayers, injuredPlayers, availablePercentage }, currentlyInjured: [{ playerId, playerName, injuryType, rtpStatus, daysOut, expectedReturn }], upcomingReturns: [{ playerId, playerName, injuryType, expectedReturnDate, daysUntilReturn }], injuryByRegion: [{ region, count }], injuryByType: [{ type, count }] }`. Mock data files are removed.

---

## Tasks / Subtasks

### Part A — Return-to-Play Status Workflow

- [ ] **Task 1: Create `updateInjuryRtpStatus` mutation** (AC: #2, #7)
  - [ ] 1.1: In `packages/backend/convex/players/mutations.ts`, implement `updateInjuryRtpStatus` mutation. Args: `{ injuryId: v.id("playerInjuries"), newStatus: v.string() }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the injury via `ctx.db.get(injuryId)`, validates it exists and `teamId` matches (throw `NOT_FOUND`). Validates `newStatus` is one of `"active"`, `"rehab"`, `"rtp_assessment"`, `"cleared"` (throw `VALIDATION_ERROR` if not).
  - [ ] 1.2: Implement transition validation logic. Define allowed transitions map:
    ```
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      active: ["rehab"],
      rehab: ["rtp_assessment"],
      rtp_assessment: ["cleared"],
      cleared: ["active"],  // re-injury
      // Backward compat
      current: ["rehab"],
      recovered: ["active"],
    };
    ```
    Check that `newStatus` is in `ALLOWED_TRANSITIONS[currentStatus]`. If not, throw `ConvexError` with code `"VALIDATION_ERROR"` and message `"Invalid status transition from {currentStatus} to {newStatus}"`.
  - [ ] 1.3: On transition to `"cleared"`, auto-set `clearanceDate: Date.now()` if the existing `clearanceDate` is `undefined`. On transition from `"cleared"` to `"active"` (re-injury), clear `clearanceDate` to `undefined`.
  - [ ] 1.4: Patch the document with `{ status: newStatus, updatedAt: Date.now() }` (plus `clearanceDate` changes from 1.3). Return the `injuryId`.

- [ ] **Task 2: Update `logInjury` mutation default status** (AC: #7)
  - [ ] 2.1: In `packages/backend/convex/players/mutations.ts`, change the `logInjury` mutation to set `status: "active"` instead of `status: "current"` for new entries.

- [ ] **Task 3: Update `updateInjury` mutation validation** (AC: #7)
  - [ ] 3.1: In `packages/backend/convex/players/mutations.ts`, update the `updateInjury` mutation's status validation from `["current", "recovered"]` to `["active", "rehab", "rtp_assessment", "cleared", "current", "recovered"]`.

- [ ] **Task 4: Create `getPlayersRtpStatuses` query** (AC: #6)
  - [ ] 4.1: In `packages/backend/convex/players/queries.ts`, implement `getPlayersRtpStatuses` query. Args: `{ playerIds: v.array(v.id("players")) }`. Calls `requireRole(ctx, ["admin", "physio"])`. Queries `playerInjuries` using `by_teamId` index, filters for statuses NOT equal to `"cleared"` and NOT equal to `"recovered"`. Builds a map of playerId -> most severe status using priority: `active` (highest) > `rehab` > `rtp_assessment` > null. Returns `Record<string, string | null>`.
  - [ ] 4.2: Define severity priority as a constant:
    ```
    const RTP_PRIORITY: Record<string, number> = {
      active: 3,
      current: 3, // backward compat
      rehab: 2,
      rtp_assessment: 1,
    };
    ```
    For each player, keep the status with the highest priority number.

- [ ] **Task 5: Create RTP status constants and badge helper** (AC: #3, #5)
  - [ ] 5.1: Create `apps/web/src/components/players/rtp-status.ts` exporting:
    - `RTP_STATUS_CONFIG` — a record mapping each status string to `{ label: string, color: string, dotColor: string, badgeVariant: string }`:
      - `active` / `current`: label "Active", destructive/red
      - `rehab`: label "Rehab", amber/warning
      - `rtp_assessment`: label "RTP Assessment", blue/info
      - `cleared` / `recovered`: label "Cleared", green/success
    - `normalizeRtpStatus(status: string): string` — maps `"current"` -> `"active"`, `"recovered"` -> `"cleared"`, passes through other values unchanged.
    - `RtpStatusBadge` component: accepts `{ status: string }`, normalizes, renders a `Badge` with the appropriate color and label.

- [ ] **Task 6: Update InjuryLog Status column** (AC: #3)
  - [ ] 6.1: In `apps/web/src/components/players/InjuryLog.tsx`, replace the existing two-state status badge (current/recovered) with the `RtpStatusBadge` from Task 5. Import `RtpStatusBadge` and use it in the Status column.

- [ ] **Task 7: Add Status Transition dialog to InjuryLog** (AC: #4)
  - [ ] 7.1: Create `apps/web/src/components/players/RtpStatusDialog.tsx`. Props: `{ injuryId: Id<"playerInjuries">, currentStatus: string, open: boolean, onClose: () => void }`.
  - [ ] 7.2: Render a `Dialog` showing the current status as a badge and the next valid status as a button. Use the transition map to determine the next status:
    - `active` -> "Move to Rehab"
    - `rehab` -> "Move to RTP Assessment"
    - `rtp_assessment` -> "Clear Player"
    - `cleared` -> "Report Re-injury"
  - [ ] 7.3: On button click, call `updateInjuryRtpStatus` mutation. On success: toast (e.g., "Status updated to Rehab"), close dialog. On error: display the validation error message in a toast.
  - [ ] 7.4: In `InjuryLog.tsx`, add "Change Status" option to the existing Actions dropdown menu for each injury row. Clicking opens `RtpStatusDialog` with the row's injuryId and current status.

- [ ] **Task 8: Add RTP status dots to PlayerTable** (AC: #5, #6)
  - [ ] 8.1: In `apps/web/src/components/players/PlayerTable.tsx`, import `useQuery` for `getPlayersRtpStatuses` and the user's role from auth context. Conditionally call the query only for `admin` / `physio` users (use `"skip"` for other roles).
  - [ ] 8.2: In the `PlayerRow` component, accept an optional `rtpStatus?: string | null` prop. When `rtpStatus` is provided and not null, render a small colored dot (`<span>` with `rounded-full` and appropriate color class) next to the player name:
    - `active` / `current`: `bg-red-500`
    - `rehab`: `bg-amber-500`
    - `rtp_assessment`: `bg-blue-500`
  - [ ] 8.3: Enable the currently commented-out injury icon for ALL authenticated users (the `hasCurrentInjury` icon from Story 5.5). Non-medical users see this generic injury icon but NOT the color-coded RTP dot.
  - [ ] 8.4: Medical users see BOTH the RTP dot (color-coded) and the injury icon. The dot appears before the name; the injury icon appears after, as already positioned in the code.

### Part B — Medical Dashboard

- [ ] **Task 9: Create mock data file** (AC: #18)
  - [ ] 9.1: Create `apps/web/src/components/dashboards/medical-overview/mock-data.ts`. Export the following typed mock data:
    - `mockSquadAvailability`: `{ totalPlayers: 25, injuredPlayers: 4, availablePercentage: 84, previousMonthPercentage: 80, trend: "up" as const }`
    - `mockCurrentlyInjured`: array of 6-8 objects with `{ id: string, playerName: string, injuryType: string, rtpStatus: string, daysOut: number, expectedReturn: string }`. Use realistic names and injuries (e.g., "Marcus Johnson" with "Hamstring strain", status "rehab", 21 days out).
    - `mockUpcomingReturns`: array of 3-4 objects with `{ id: string, playerName: string, injuryType: string, expectedReturnDate: string, daysUntilReturn: number }`. Dates should be within 14 days of current date.
    - `mockInjuryByRegion`: array of objects `{ region: string, count: number }` for 10 body regions. E.g., Hamstring: 8, Knee: 6, Ankle: 5, Calf: 4, Groin: 3, etc.
    - `mockInjuryByType`: array of objects `{ type: string, count: number, color: string }` for 6 injury types with hex colors. E.g., Muscle strain: 12 (#ef4444), Ligament sprain: 7 (#f59e0b), etc.

- [ ] **Task 10: Create Squad Availability card** (AC: #11)
  - [ ] 10.1: Create `apps/web/src/components/dashboards/medical-overview/SquadAvailabilityCard.tsx`. Import mock data. Render a card with large percentage number, subtext, and trend arrow. Apply conditional color classes based on percentage thresholds (green >= 85, amber 70-84, red < 70).

- [ ] **Task 11: Create Currently Injured Players widget** (AC: #12)
  - [ ] 11.1: Create `apps/web/src/components/dashboards/medical-overview/CurrentlyInjuredTable.tsx`. Import mock data. Render a card with title "Currently Injured" and a table with columns: Player, Injury, Status (using `RtpStatusBadge` from Task 5), Days Out, Expected Return. Sort by days out descending.

- [ ] **Task 12: Create Upcoming Returns widget** (AC: #13)
  - [ ] 12.1: Create `apps/web/src/components/dashboards/medical-overview/UpcomingReturnsCard.tsx`. Import mock data. Render a card with title "Upcoming Returns (14 days)" listing each player with injury type, expected return date, and days-until-return countdown. Use a list layout (not a full table).

- [ ] **Task 13: Create Injury by Body Region bar chart** (AC: #14)
  - [ ] 13.1: Create `apps/web/src/components/dashboards/medical-overview/InjuryByRegionChart.tsx`. Import mock data. Render a card with title "Injuries by Body Region" containing a Recharts horizontal `BarChart`. Use `<Bar>` with the team's primary color. Include `<XAxis>`, `<YAxis>` (category axis with region names), `<Tooltip>`, and `<CartesianGrid>`. Set `layout="vertical"` for horizontal bars. Wrap in a `ResponsiveContainer` with height 350.

- [ ] **Task 14: Create Injury by Type donut chart** (AC: #15)
  - [ ] 14.1: Create `apps/web/src/components/dashboards/medical-overview/InjuryByTypeChart.tsx`. Import mock data. Render a card with title "Injuries by Type" containing a Recharts `PieChart` with a `<Pie>` using `innerRadius={60}` and `outerRadius={100}` for donut effect. Each `<Cell>` uses the color from mock data. Include a `<Legend>` below the chart and a `<Tooltip>`. Wrap in `ResponsiveContainer` with height 350.

- [ ] **Task 15: Create Medical Overview dashboard index** (AC: #8, #16, #17)
  - [ ] 15.1: Create `apps/web/src/components/dashboards/medical-overview/index.tsx`. Default export a `MedicalOverview` component that accepts `{ slug: string }`. Render:
    - Header: medical icon (`Stethoscope` from lucide-react) + "Medical Overview" title, matching the `SeasonOverview` header pattern.
    - Grid layout using Tailwind CSS grid:
      - Top row: `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">` with SquadAvailabilityCard (1 col) and UpcomingReturnsCard (2 cols via `md:col-span-2`).
      - Middle row: CurrentlyInjuredTable at full width.
      - Bottom row: `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` with InjuryByRegionChart and InjuryByTypeChart.
    - Wrap everything in `<div className="space-y-6">`.

- [ ] **Task 16: Register dashboard in registry** (AC: #9)
  - [ ] 16.1: In `apps/web/src/lib/dashboard-registry.ts`, add entry:
    ```typescript
    "medical-overview": () => import("@/components/dashboards/medical-overview"),
    ```

- [ ] **Task 17: Seed dashboard and role assignments in Convex** (AC: #10)
  - [ ] 17.1: Provide the Convex CLI commands (DO NOT auto-run them) for the developer to execute. The commands should:
    - Insert a new dashboard record: `{ teamId: <teamId>, slug: "medical-overview", name: "Medical Overview", description: "Squad injury status, recovery tracking, and injury analytics for medical staff", category: "medical", imageUrl: "/images/dashboards/medical-overview.png" }`.
    - Insert two `roleDashboards` records: one for `admin` role and one for `physio` role, both mapping to `dashboardSlug: "medical-overview"`.
  - [ ] 17.2: Document the exact Convex dashboard CLI commands in a code block within the PR description. Include both the dashboard insert and the role assignment inserts.

---

## Dev Notes

- **Backward compatibility**: The existing `"current"` and `"recovered"` status values must continue to work. The `normalizeRtpStatus` helper handles UI mapping. The backend mutations accept both old and new values. No data migration is needed — old entries display correctly through normalization.
- **No schema migration**: The `playerInjuries.status` field is already `v.string()`, so no schema change is required to support the new status values. The validation is purely at the mutation layer.
- **Real data for dashboard**: The Medical Dashboard (Part B) queries real Convex injury data via `getMedicalDashboardData` and existing injury report queries. Mock data files are removed.
- **Recharts**: Already installed and used across multiple dashboards. Import from `recharts` directly.
- **Role check for dots**: The RTP dots on PlayerTable require a role-aware conditional query. Use the existing auth hook to check the user's role before calling `getPlayersRtpStatuses`. If the user is not admin/physio, pass `"skip"` to the query and do not render dots.
- **Do NOT auto-run Convex CLI commands** — provide them to the developer to execute manually (per project rules).

## Testing / QA Notes

- Verify RTP status transitions: active -> rehab -> rtp_assessment -> cleared works. Verify skipping steps is rejected. Verify cleared -> active (re-injury) works. Verify other backward transitions are rejected.
- Verify PlayerTable dots: admin sees colored dots, coach sees only the generic injury icon, player sees only the generic injury icon.
- Verify Medical Dashboard is visible in gallery only for admin and physio roles. Coach/analyst/player/staff should NOT see it.
- Verify all dashboard widgets render with mock data. Charts should display without errors.
- Verify backward compatibility: existing injuries with status "current" display as "Active" and with status "recovered" display as "Cleared".
