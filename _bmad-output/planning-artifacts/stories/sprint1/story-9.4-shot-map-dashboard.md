# Story 9.4: Shot Map Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 13

> **PROJECT SCOPE:** All components go in `apps/web/src/components/dashboards/shot-map/`. The dashboard page goes in `apps/web/src/app/(dashboard)/dashboards/shot-map/page.tsx`. Data fetching uses existing API routes from Story 8.1 (`/api/statsbomb/*`) and Story 8.3 (`/api/wyscout/*`). Pitch components from Story 7.2 (`PitchBase`, `GoalBase`) and chart components from Story 7.3 are consumed as dependencies.

## Story

As a football analyst,
I want a Shot Map dashboard that visualizes all shots on a half-pitch with xG-sized markers color-coded by outcome, with filters for match/season/player/outcome, a goal map variant, a sortable shots table, and embedded Wyscout video clips for individual shots,
so that I can analyze shooting patterns, expected goals, and shot quality with full video evidence.

## Dependencies

| Dependency | What it provides |
|------------|-----------------|
| Story 9.1 | Dashboard gallery routing, slug-based navigation (`/dashboards/shot-map`) |
| Story 8.1 | StatsBomb API routes: `/api/statsbomb/teams`, `/seasons`, `/matches`, `/shots`, `/match-periods`, `/match-id-from-sportmonks` |
| Story 8.3 | Wyscout video integration: `/api/wyscout/match-id`, `/offsets`, `/urls` |
| Story 7.2 | `PitchBase` (half-pitch SVG, viewBox `0 0 80 60`), `GoalBase` (goal mouth SVG, viewBox `-2 -2 12 6.67`, exports `GOAL_WIDTH=8`, `GOAL_HEIGHT=2.67`) |
| Story 7.3 | Recharts components for any bar/distribution charts in the dashboard |

## Acceptance Criteria (BDD)

### AC 1: Dashboard page is accessible via gallery routing

**Given** the dashboard gallery from Story 9.1 is rendered
**When** the user navigates to `/dashboards/shot-map`
**Then** the Shot Map dashboard page loads with the slug `shot-map`
**And** the page contains: `MatchFiltersBar`, `ShotFiltersBar`, `ShotPitchMap`, `StatsBar`, `ShotsTable`, and `DetailsPane` (initially empty)
**And** the page has a `"use client"` directive (client-side interactivity required)

### AC 2: MatchFiltersBar provides match selection with fuzzy search

**Given** the Shot Map dashboard page is rendered
**When** the component mounts
**Then** it displays three dropdowns: Team, Season, and Match
**And** the Team dropdown fetches options from `GET /api/statsbomb/teams` and defaults to UC Sampdoria (team_id from app config)
**And** the Season dropdown fetches options from `GET /api/statsbomb/seasons?competitionId={id}` based on the selected team's competition
**And** the Match dropdown fetches options from `GET /api/statsbomb/matches?competitionId={id}&seasonId={id}&teamId={id}`
**And** the Match dropdown supports fuzzy text search (filtering match labels client-side as the user types)
**And** a "Season View" toggle is available to switch between single-match and full-season aggregation
**When** "Season View" is enabled
**Then** the Match dropdown is disabled and all shots for the selected team+season are loaded via `GET /api/statsbomb/shots?competitionId={id}&seasonId={id}&teamId={id}`
**When** a single match is selected
**Then** shots are loaded via `GET /api/statsbomb/shots?matchId={id}`

### AC 3: ShotFiltersBar provides multi-select filtering

**Given** shot data has been loaded (either single match or season)
**When** the `ShotFiltersBar` renders
**Then** it displays the following filter controls:

| Filter | Type | Options |
|--------|------|---------|
| Team | Toggle buttons | Home / Away (single match only; hidden in season view) |
| Period | Multi-select checkboxes | 1H, 2H, ET (periods fetched from `GET /api/statsbomb/match-periods?matchId={id}`) |
| Outcome | Multi-select checkboxes | Goal, On Target, Off Target, Blocked |
| Phase | Multi-select checkboxes | Open Play, Set Piece, Counter Attack |
| Player | Dropdown with search | Lists all players who have shots in the current dataset |
| Exclude Penalties | Toggle switch | On/Off (default: Off) |

**And** all filters default to "all selected" (no filtering applied) on initial load
**And** changing any filter immediately updates `ShotPitchMap`, `GoalMap`, `StatsBar`, and `ShotsTable` without a new API call (client-side filtering of the already-fetched shot data)
**And** a "Reset Filters" button clears all filters back to their defaults

### AC 4: ShotPitchMap renders shots on a half-pitch with xG-sized color-coded markers

**Given** filtered shot data is available
**When** the `ShotPitchMap` renders
**Then** it uses `PitchBase` from Story 7.2 as the base SVG (viewBox `0 0 80 60`)
**And** each shot is rendered as an SVG `<circle>` element inside `PitchBase`'s children

**Shot circle sizing (xG-proportional):**
- Radius is linearly interpolated between `3` (min, for xG=0) and `15` (max, for xG=1)
- Formula: `radius = 3 + (xG * 12)`
- Shots with xG=0 (e.g., own goals) use `radius = 3`

**Shot circle colors (by outcome):**
| Outcome | Hex Color | Tailwind equivalent |
|---------|-----------|-------------------|
| Goal | `#22c55e` | green-500 |
| On Target | `#3b82f6` | blue-500 |
| Off Target | `#9ca3af` | gray-400 |
| Blocked | `#ef4444` | red-500 |

**Coordinate mapping (StatsBomb to SVG):**
- StatsBomb coordinates: x = 0-120 (horizontal, left-to-right), y = 0-80 (vertical, top-to-bottom)
- SVG coordinates (half-pitch, attacking half, rotated 90 degrees):
  - `svg_x = statsbomb_y` (scaled to 0-80 viewBox width, so `svg_x = sb_y`)
  - `svg_y = 60 - (statsbomb_x * 0.5)` (scaled to 0-60 viewBox height, inverted so goal is at top)
- Only shots where `statsbomb_x >= 60` are displayed (attacking half)

**And** each circle has `cursor: pointer` and an `opacity` of `0.85`
**And** circles have a `stroke` of `white` with `strokeWidth` of `0.5` for visibility against the pitch
**And** circles render with goals on top (highest z-index) to ensure goal markers are always visible

### AC 5: GoalMap renders a zoomed goal-area view

**Given** filtered shot data is available
**When** the user toggles to "Goal Map" view (toggle button switches between Pitch View and Goal Map)
**Then** the `GoalMap` component renders using `GoalBase` from Story 7.2 (viewBox `-2 -2 12 6.67`)
**And** only shots with outcome "Goal" or "On Target" are displayed (shots that reached the goal)
**And** each shot is rendered as a circle positioned at its end location (where the shot ended up relative to the goal frame)

**Goal map coordinate mapping:**
- Shot end_location from StatsBomb provides the y (horizontal across goal) and z (vertical height) coordinates
- `goal_x = (end_y - 36) * (GOAL_WIDTH / 8)` -- maps StatsBomb goal y-range (36-44) to GoalBase x-range (0-8)
- `goal_y = GOAL_HEIGHT - (end_z * (GOAL_HEIGHT / 2.67))` -- maps height (0-2.67m) to GoalBase y-range, inverted so ground is at bottom

**And** circle sizing follows the same xG formula as `ShotPitchMap`
**And** circle colors follow the same outcome color scheme
**And** the toggle button between Pitch View and Goal Map is styled as a segmented control

### AC 6: DetailsPane shows shot details with video integration

**Given** the pitch map or goal map is displayed
**When** the user clicks on a shot circle
**Then** the `DetailsPane` panel appears (slides in from the right or renders in a dedicated panel area)
**And** displays the following shot details:

| Field | Source |
|-------|--------|
| Player Name | `shot.player_name` |
| Minute | `shot.minute` (displayed as e.g., "34'" or "90+2'") |
| xG | `shot.xg` (formatted to 2 decimal places, e.g., "0.23") |
| Outcome | `shot.outcome` with the corresponding color badge |
| Body Part | `shot.body_part` (e.g., "Right Foot", "Left Foot", "Head") |
| Technique | `shot.technique` (e.g., "Normal", "Volley", "Half Volley", "Overhead Kick") |
| Phase | `shot.play_pattern` (e.g., "From Open Play", "From Set Piece", "From Counter") |

**And** a "Watch Video" button is displayed below the shot details
**When** the user clicks "Watch Video"
**Then** the system executes the Wyscout video flow from Story 8.3:
  1. Calls `GET /api/wyscout/match-id?statsbomb_match_id={match_id}` to get the Wyscout match ID
  2. Calls `GET /api/wyscout/offsets?wyscout_match_id={id}` to get period offsets
  3. Calculates `start_ts = period_offset + event_timestamp - 5` and `end_ts = period_offset + event_timestamp + 5` (5-second padding)
  4. Calls `GET /api/wyscout/urls?wyscout_match_id={id}&start_timestamp={start_ts}&end_timestamp={end_ts}`
  5. Renders the video in an HTML5 `<video>` player embedded within the DetailsPane
**And** while the video URL is loading, a skeleton/spinner is shown in the video area
**And** if video fetch fails, a "Video unavailable" message is shown (no crash)

**When** the user clicks on a different shot or clicks a close button on the DetailsPane
**Then** the DetailsPane updates with the new shot's details (or closes if the close button was clicked)
**And** any playing video is stopped and replaced

### AC 7: ShotsTable displays a sortable table of all filtered shots

**Given** filtered shot data is available
**When** the `ShotsTable` renders
**Then** it displays a table with the following columns:

| Column | Data | Sortable | Default Sort |
|--------|------|----------|-------------|
| Minute | `shot.minute` (formatted as "34'" or "90+2'") | Yes | Ascending (first sort) |
| Player | `shot.player_name` | Yes | -- |
| xG | `shot.xg` (2 decimal places) | Yes | -- |
| Outcome | `shot.outcome` (text with color dot indicator matching the outcome color scheme from AC 4) | Yes | -- |
| Body Part | `shot.body_part` | Yes | -- |
| Technique | `shot.technique` | Yes | -- |

**And** clicking a column header toggles sort direction (ascending -> descending -> ascending)
**And** clicking a row in the table selects that shot and opens/updates the `DetailsPane` (same behavior as clicking on the pitch)
**And** the currently selected shot row is highlighted with a distinct background color
**And** the table uses virtualization or pagination if more than 50 rows (season view can have 200+ shots)

### AC 8: StatsBar shows summary statistics

**Given** filtered shot data is available
**When** the `StatsBar` renders
**Then** it displays a horizontal bar of summary statistics:

| Stat | Calculation |
|------|-------------|
| Total Shots | Count of all filtered shots |
| On Target | Count where outcome = "On Target" OR outcome = "Goal" |
| Off Target | Count where outcome = "Off Target" |
| Blocked | Count where outcome = "Blocked" |
| Goals | Count where outcome = "Goal" |
| Total xG | Sum of `xG` for all filtered shots (formatted to 2 decimal places) |

**And** each stat is displayed in a card/badge format with a label and value
**And** the stats update in real-time as filters change (client-side recalculation)

### AC 9: Legend components explain visual encoding

**Given** the pitch map or goal map is rendered
**When** the user views the dashboard
**Then** an `OutcomeLegend` component displays a horizontal legend with four items:
  - Green circle + "Goal"
  - Blue circle + "On Target"
  - Gray circle + "Off Target"
  - Red circle + "Blocked"
**And** each legend circle uses the exact hex colors from AC 4

**And** an `XgSizeLegend` component displays a scale showing 3-4 circles of increasing size:
  - Small circle (radius ~3px equivalent) labeled "Low xG (0.02)"
  - Medium circle (radius ~8px equivalent) labeled "Medium xG (0.15)"
  - Large circle (radius ~15px equivalent) labeled "High xG (1.00)"
**And** both legends are positioned near the pitch visualization (below or beside it)

### AC 10: Loading, empty, and error states are handled

**Given** the dashboard is loading shot data from the API
**When** the API request is in flight
**Then** the `ShotPitchMap` area shows a skeleton loader (pitch outline with no markers)
**And** the `ShotsTable` shows a table skeleton (gray animated rows)
**And** the `StatsBar` shows placeholder values ("--" or skeleton bars)

**Given** the API returns zero shots for the selected filters
**When** the dashboard renders
**Then** the `ShotPitchMap` shows the empty pitch with a centered message: "No shots found for the selected filters"
**And** the `ShotsTable` shows an empty state row: "No shots match the current filters"
**And** the `StatsBar` shows all zeroes

**Given** the API request fails
**When** the dashboard attempts to render
**Then** an error banner is displayed above the dashboard: "Failed to load shot data. Please try again."
**And** a "Retry" button is available that re-fetches the data
**And** the error is logged to the console with the full error details

### AC 11: TypeScript types and lint pass

**Given** all Shot Map dashboard files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all components use proper TypeScript types (no `any` casts)

---

## Components Inventory (15 total)

| # | Component | File | Description |
|---|-----------|------|-------------|
| 1 | `MatchFiltersBar` | `match-filters-bar.tsx` | Team/season/match dropdowns with fuzzy search + season view toggle |
| 2 | `ShotFiltersBar` | `shot-filters-bar.tsx` | Multi-select outcome/phase/period/player filters + penalties toggle |
| 3 | `ShotPitchMap` | `shot-pitch-map.tsx` | Half-pitch SVG with xG-sized shot circles |
| 4 | `GoalMap` | `goal-map.tsx` | Zoomed goal-area view showing shot end locations |
| 5 | `DetailsPane` | `details-pane.tsx` | Selected shot info panel with Wyscout video embed |
| 6 | `ShotsTable` | `shots-table.tsx` | Sortable table of all filtered shots |
| 7 | `StatsBar` | `stats-bar.tsx` | Summary stats: total shots, on target, off target, blocked, goals, xG |
| 8 | `OutcomeLegend` | `outcome-legend.tsx` | Color legend for shot outcome categories |
| 9 | `XgSizeLegend` | `xg-size-legend.tsx` | Circle size scale legend for xG values |
| 10 | `ViewToggle` | `view-toggle.tsx` | Segmented control: Pitch View / Goal Map toggle |
| 11 | `ShotCircle` | `shot-circle.tsx` | Individual shot SVG circle (reusable across pitch and goal map) |
| 12 | `VideoPlayer` | `video-player.tsx` | HTML5 video wrapper for Wyscout clips in DetailsPane |
| 13 | `FilterCheckboxGroup` | `filter-checkbox-group.tsx` | Reusable multi-select checkbox group for ShotFiltersBar |
| 14 | `StatCard` | `stat-card.tsx` | Individual stat display card for StatsBar |
| 15 | `ShotMapDashboard` | `shot-map-dashboard.tsx` | Root orchestrator: state management, data fetching, filter logic |

---

## Data Flow

### API Routes Used

| Route | When Called | Parameters |
|-------|-----------|------------|
| `GET /api/statsbomb/teams` | On mount (MatchFiltersBar) | -- |
| `GET /api/statsbomb/seasons` | When team selected (MatchFiltersBar) | `competitionId` |
| `GET /api/statsbomb/matches` | When season selected (MatchFiltersBar) | `competitionId`, `seasonId`, `teamId` |
| `GET /api/statsbomb/shots` | When match selected or season view enabled | `matchId` (single match) OR `competitionId`, `seasonId`, `teamId` (season) |
| `GET /api/statsbomb/match-periods` | When match selected (ShotFiltersBar) | `matchId` |
| `GET /api/wyscout/match-id` | When "Watch Video" clicked (DetailsPane) | `statsbomb_match_id` |
| `GET /api/wyscout/offsets` | After match-id resolved (DetailsPane) | `wyscout_match_id` |
| `GET /api/wyscout/urls` | After offsets resolved (DetailsPane) | `wyscout_match_id`, `start_timestamp`, `end_timestamp` |

### State Architecture

```
ShotMapDashboard (root)
  |
  |-- State: selectedTeamId, selectedSeasonId, selectedMatchId, isSeasonView
  |-- State: filters { teams, periods, outcomes, phases, playerId, excludePenalties }
  |-- State: selectedShotId, viewMode ("pitch" | "goal")
  |-- Derived: filteredShots (useMemo over raw shots + filters)
  |-- Derived: summaryStats (useMemo over filteredShots)
  |
  |-- MatchFiltersBar (reads/sets: team, season, match, isSeasonView)
  |-- ShotFiltersBar (reads/sets: filters; reads: raw shots for player list)
  |-- StatsBar (reads: summaryStats)
  |-- ViewToggle (reads/sets: viewMode)
  |-- ShotPitchMap (reads: filteredShots, selectedShotId; sets: selectedShotId)
  |-- GoalMap (reads: filteredShots, selectedShotId; sets: selectedShotId)
  |-- OutcomeLegend (static)
  |-- XgSizeLegend (static)
  |-- ShotsTable (reads: filteredShots, selectedShotId; sets: selectedShotId)
  |-- DetailsPane (reads: selectedShot, matchId; manages: video fetch state)
```

### Shot Data Shape (from API)

```typescript
interface Shot {
  id: string;
  match_id: number;
  minute: number;
  second: number;
  added_time?: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  xg: number;
  outcome: "Goal" | "Saved" | "Off T" | "Blocked" | "Wayward" | "Post";
  body_part: string;
  technique: string;
  play_pattern: string;
  location_x: number;  // StatsBomb x (0-120)
  location_y: number;  // StatsBomb y (0-80)
  end_location_x?: number;
  end_location_y?: number;
  end_location_z?: number;  // Height (for goal map)
  period: number;  // 1=1H, 2=2H, 3=ET1, 4=ET2
  is_penalty: boolean;
  timestamp: string;  // Event timestamp within period (e.g., "00:34:12.345")
}
```

**Outcome mapping (StatsBomb raw to display categories):**
| StatsBomb outcome | Display category | Color |
|-------------------|-----------------|-------|
| `Goal` | Goal | `#22c55e` |
| `Saved` | On Target | `#3b82f6` |
| `Off T`, `Wayward`, `Post` | Off Target | `#9ca3af` |
| `Blocked` | Blocked | `#ef4444` |

---

## Tasks / Subtasks

- [ ] **Task 1: Create TypeScript types and constants** (AC: 4, 9)
  - [ ] 1.1: Create `apps/web/src/components/dashboards/shot-map/types.ts` with `Shot`, `ShotFilters`, `ShotOutcomeCategory`, `ViewMode` interfaces
  - [ ] 1.2: Create `apps/web/src/components/dashboards/shot-map/constants.ts` with outcome color map, xG radius formula, coordinate mapping functions, outcome category mapping
  - [ ] 1.3: Export coordinate mapping functions:
    ```typescript
    export function sbToPitchSvg(sbX: number, sbY: number): { x: number; y: number } {
      return { x: sbY, y: 60 - sbX * 0.5 };
    }

    export function sbToGoalSvg(
      endY: number,
      endZ: number,
      goalWidth: number,
      goalHeight: number,
    ): { x: number; y: number } {
      return {
        x: (endY - 36) * (goalWidth / 8),
        y: goalHeight - endZ * (goalHeight / 2.67),
      };
    }

    export function xgToRadius(xg: number): number {
      return 3 + Math.min(xg, 1) * 12;
    }

    export const OUTCOME_COLORS = {
      Goal: "#22c55e",
      "On Target": "#3b82f6",
      "Off Target": "#9ca3af",
      Blocked: "#ef4444",
    } as const;
    ```

- [ ] **Task 2: Create ShotCircle component** (AC: 4, 5)
  - [ ] 2.1: Create `apps/web/src/components/dashboards/shot-map/shot-circle.tsx`
  - [ ] 2.2: Render an SVG `<circle>` with: `cx`, `cy` (from coordinate mapping), `r` (from `xgToRadius`), `fill` (from `OUTCOME_COLORS`), `opacity={0.85}`, `stroke="white"`, `strokeWidth={0.5}`, `cursor="pointer"`
  - [ ] 2.3: Accept `onClick` callback and `isSelected` prop (adds a thicker highlight stroke when selected)
  - [ ] 2.4: Add `"use client"` directive

- [ ] **Task 3: Create ShotPitchMap component** (AC: 4)
  - [ ] 3.1: Create `apps/web/src/components/dashboards/shot-map/shot-pitch-map.tsx`
  - [ ] 3.2: Import `PitchBase` from Story 7.2 components
  - [ ] 3.3: Filter shots to attacking half (`statsbomb_x >= 60`) before rendering
  - [ ] 3.4: Map each shot through `sbToPitchSvg` and render `ShotCircle` components as PitchBase children
  - [ ] 3.5: Sort circles so goals render last (on top): `[...shots].sort((a, b) => (a.outcome === "Goal" ? 1 : -1))`
  - [ ] 3.6: Add `"use client"` directive

- [ ] **Task 4: Create GoalMap component** (AC: 5)
  - [ ] 4.1: Create `apps/web/src/components/dashboards/shot-map/goal-map.tsx`
  - [ ] 4.2: Import `GoalBase`, `GOAL_WIDTH`, `GOAL_HEIGHT` from Story 7.2 components
  - [ ] 4.3: Filter to shots with outcome "Goal" or "On Target" (shots that reached the goal)
  - [ ] 4.4: Map each shot through `sbToGoalSvg` using `end_location_y` and `end_location_z`
  - [ ] 4.5: Render `ShotCircle` components as GoalBase children
  - [ ] 4.6: Add `"use client"` directive

- [ ] **Task 5: Create MatchFiltersBar component** (AC: 2)
  - [ ] 5.1: Create `apps/web/src/components/dashboards/shot-map/match-filters-bar.tsx`
  - [ ] 5.2: Implement team dropdown fetching from `/api/statsbomb/teams`
  - [ ] 5.3: Implement season dropdown fetching from `/api/statsbomb/seasons`
  - [ ] 5.4: Implement match dropdown with fuzzy search (client-side `filter` on match labels using `toLowerCase().includes()`)
  - [ ] 5.5: Implement "Season View" toggle switch
  - [ ] 5.6: Use SWR or React Query (if already in project) for data fetching with caching; otherwise use `useEffect` + `fetch`
  - [ ] 5.7: Add `"use client"` directive

- [ ] **Task 6: Create ShotFiltersBar component** (AC: 3)
  - [ ] 6.1: Create `apps/web/src/components/dashboards/shot-map/shot-filters-bar.tsx`
  - [ ] 6.2: Create `apps/web/src/components/dashboards/shot-map/filter-checkbox-group.tsx` (reusable multi-select)
  - [ ] 6.3: Implement team toggle (Home/Away), period checkboxes, outcome checkboxes, phase checkboxes
  - [ ] 6.4: Implement player dropdown (populated from unique players in current shot dataset)
  - [ ] 6.5: Implement "Exclude Penalties" toggle switch
  - [ ] 6.6: Implement "Reset Filters" button
  - [ ] 6.7: Add `"use client"` directive

- [ ] **Task 7: Create DetailsPane with video integration** (AC: 6)
  - [ ] 7.1: Create `apps/web/src/components/dashboards/shot-map/details-pane.tsx`
  - [ ] 7.2: Create `apps/web/src/components/dashboards/shot-map/video-player.tsx`
  - [ ] 7.3: Display shot details (player, minute, xG, outcome, body part, technique, phase)
  - [ ] 7.4: Implement "Watch Video" button that triggers the Wyscout flow (match-id -> offsets -> calculate timestamps -> urls)
  - [ ] 7.5: Calculate video timestamps: parse `shot.timestamp` to seconds, add period offset, apply +/- 5s padding
  - [ ] 7.6: Render `<video>` element with the fetched URL, `controls`, and `autoPlay` attributes
  - [ ] 7.7: Handle loading (spinner), error ("Video unavailable"), and close states
  - [ ] 7.8: Add `"use client"` directive

- [ ] **Task 8: Create ShotsTable component** (AC: 7)
  - [ ] 8.1: Create `apps/web/src/components/dashboards/shot-map/shots-table.tsx`
  - [ ] 8.2: Implement sortable columns: Minute, Player, xG, Outcome, Body Part, Technique
  - [ ] 8.3: Format minute display: `minute` + optional `added_time` (e.g., "90+2'")
  - [ ] 8.4: Add color dot indicator next to outcome text using `OUTCOME_COLORS`
  - [ ] 8.5: Implement row click -> select shot (same as clicking on pitch)
  - [ ] 8.6: Highlight selected row with `bg-accent` or equivalent
  - [ ] 8.7: Add pagination or virtualization for datasets > 50 rows

- [ ] **Task 9: Create StatsBar and StatCard components** (AC: 8)
  - [ ] 9.1: Create `apps/web/src/components/dashboards/shot-map/stats-bar.tsx`
  - [ ] 9.2: Create `apps/web/src/components/dashboards/shot-map/stat-card.tsx`
  - [ ] 9.3: Calculate and display: Total Shots, On Target, Off Target, Blocked, Goals, Total xG
  - [ ] 9.4: "On Target" count includes goals (outcome = "Goal" or "On Target")

- [ ] **Task 10: Create legend and toggle components** (AC: 5, 9)
  - [ ] 10.1: Create `apps/web/src/components/dashboards/shot-map/outcome-legend.tsx`
  - [ ] 10.2: Create `apps/web/src/components/dashboards/shot-map/xg-size-legend.tsx`
  - [ ] 10.3: Create `apps/web/src/components/dashboards/shot-map/view-toggle.tsx` (segmented control: "Pitch View" | "Goal Map")

- [ ] **Task 11: Create ShotMapDashboard orchestrator** (AC: 1, 2, 3, 10)
  - [ ] 11.1: Create `apps/web/src/components/dashboards/shot-map/shot-map-dashboard.tsx`
  - [ ] 11.2: Manage all state: selected team/season/match, filters, selected shot, view mode
  - [ ] 11.3: Fetch shot data on match/season selection change
  - [ ] 11.4: Implement `filteredShots` with `useMemo`: apply all active filters to raw shot data
  - [ ] 11.5: Implement `summaryStats` with `useMemo`: compute counts and xG sum from `filteredShots`
  - [ ] 11.6: Wire all child components with props and callbacks
  - [ ] 11.7: Handle loading, empty, and error states (AC 10)

- [ ] **Task 12: Create dashboard page** (AC: 1)
  - [ ] 12.1: Create `apps/web/src/app/(dashboard)/dashboards/shot-map/page.tsx`
  - [ ] 12.2: Add `"use client"` directive
  - [ ] 12.3: Import and render `ShotMapDashboard`
  - [ ] 12.4: Verify the page is accessible via gallery navigation from Story 9.1

- [ ] **Task 13: Create barrel export** (AC: 11)
  - [ ] 13.1: Create `apps/web/src/components/dashboards/shot-map/index.ts` exporting all public components
  - [ ] 13.2: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 13.3: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This is a client-heavy dashboard. All shot data is fetched once per match/season selection, then filtered client-side. The state lives in `ShotMapDashboard` and flows down as props. Video fetching is the only secondary API interaction (triggered on demand per shot).

```
Page (/dashboards/shot-map)
  |
  v
ShotMapDashboard (state + data fetching)
  |
  |-- MatchFiltersBar --> fetches teams/seasons/matches
  |-- ShotFiltersBar  --> client-side filter controls
  |-- StatsBar        --> computed from filteredShots
  |-- ViewToggle      --> switches pitch/goal view
  |-- ShotPitchMap    --> PitchBase + ShotCircle children
  |-- GoalMap         --> GoalBase + ShotCircle children
  |-- Legends         --> static visual reference
  |-- ShotsTable      --> sortable, row-clickable
  |-- DetailsPane     --> shot info + VideoPlayer
       |
       |-- VideoPlayer --> fetches Wyscout URLs on demand
```

### Source Files (from football-dashboard-2)

- **Dashboard page:** `football-dashboard-2/src/app/(dashboard)/dashboards/shot-map/page.tsx`
- **Components:** `football-dashboard-2/src/components/dashboard/shot-map/` (all component files)
- **Hooks/utilities:** any shot-map-specific hooks in the source

### Files to Create

All files under `apps/web/src/components/dashboards/shot-map/`:
1. `types.ts`
2. `constants.ts`
3. `shot-circle.tsx`
4. `shot-pitch-map.tsx`
5. `goal-map.tsx`
6. `match-filters-bar.tsx`
7. `shot-filters-bar.tsx`
8. `filter-checkbox-group.tsx`
9. `details-pane.tsx`
10. `video-player.tsx`
11. `shots-table.tsx`
12. `stats-bar.tsx`
13. `stat-card.tsx`
14. `outcome-legend.tsx`
15. `xg-size-legend.tsx`
16. `view-toggle.tsx`
17. `shot-map-dashboard.tsx`
18. `index.ts`

Plus the page file:
19. `apps/web/src/app/(dashboard)/dashboards/shot-map/page.tsx`

### Files NOT to Modify

- Anything under `packages/backend/convex/` -- this dashboard has no Convex writes
- Existing API routes in `apps/admin/` -- consumed as-is from Stories 8.1 and 8.3
- Pitch components from Story 7.2 -- consumed as dependencies, not modified
- Any global layout or navigation files (gallery routing is Story 9.1's responsibility)

### Key Decisions

1. **Client-side filtering** -- Shot data is fetched once and filtered in-memory via `useMemo`. This avoids redundant API calls when toggling outcome/player/period filters. Season view may return 200+ shots which is well within client-side filtering performance.

2. **ShotCircle as reusable component** -- Both `ShotPitchMap` and `GoalMap` render `ShotCircle` with different coordinate systems. The circle component handles visual concerns (color, size, selection highlight) while the parent handles coordinate mapping.

3. **Video fetching is lazy** -- Wyscout API calls only happen when the user clicks "Watch Video", not when a shot is selected. This avoids unnecessary API load and respects Wyscout rate limits.

4. **Outcome normalization** -- StatsBomb uses granular outcomes (`Saved`, `Off T`, `Wayward`, `Post`). These are mapped to four display categories (Goal, On Target, Off Target, Blocked) at the data normalization layer in `constants.ts`.

5. **Z-ordering of shot circles** -- Goals are rendered last so their green circles always appear on top of other shots at similar positions. This is critical for match views where multiple shots cluster near the penalty area.

### Coordinate System Reference

```
StatsBomb pitch (120x80, horizontal):        SVG half-pitch (80x60, vertical):
  0,0 ──────────────── 120,0                   0,0 ──────── 80,0
  |                        |                   |  (goal)       |
  |   ← defending  attacking →                |               |
  |                        |                   |               |
  0,80 ─────────────── 120,80                  0,60 ─────── 80,60

  Mapping: svg_x = sb_y                        Only shots with sb_x >= 60
           svg_y = 60 - (sb_x * 0.5)           (attacking half) are shown
```

### Testing Approach

- **Visual testing:** Render the dashboard with known shot data and verify circle positions, colors, and sizes match expected values
- **Filter testing:** Toggle each filter and verify the pitch, table, and stats all update correctly
- **Video flow:** Click "Watch Video" on a shot and verify the Wyscout API chain executes and video plays
- **Edge cases:** Empty match (no shots), season view with 200+ shots, shots at boundary coordinates, shots with xG=0 and xG=1
- **Responsive:** Verify pitch and table render correctly at different viewport widths
- **No automated tests required in this story** -- visual/interactive testing is primary validation method
