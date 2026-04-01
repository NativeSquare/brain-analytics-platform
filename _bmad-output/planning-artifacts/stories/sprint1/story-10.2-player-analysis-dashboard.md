# Story 10.2: Player Analysis Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 13

> **PROJECT SCOPE:** All components target `apps/admin/src/app/(app)/dashboards/player-analysis/`. Shared chart primitives from Story 7.3 (`apps/admin/src/components/charts/`, including `XYScatterChart`) and design tokens from Story 7.1 are reused. Data is fetched client-side from StatsBomb Next.js API routes (Story 8.1). Convex is NOT involved in data fetching -- this is read-only external data rendered in interactive Recharts visualizations. The dashboard is registered in the gallery under slug `"player-analysis"` (Story 9.1).

## Story

As a football analyst or club staff member,
I want a Player Analysis dashboard that lets me search for any player via cascading filters (competition, team, season, player name), view their season statistics with per-90 and percentile metrics, compare them against league averages using radar and scatter plots, and see position-appropriate metric templates,
so that I can evaluate individual player performance in league context, identify strengths and weaknesses relative to peers, and make data-driven recruitment or tactical decisions.

## Dependencies

| Dependency | What it provides |
|------------|-----------------|
| Story 9.1 | Dashboard gallery routing, slug-based navigation (`/dashboards/player-analysis`) |
| Story 8.1 | StatsBomb API routes: `/api/statsbomb/competitions`, `/seasons`, `/teams`, `/players`, `/player-season-stats`, `/league-player-season-stats` |
| Story 7.3 | Recharts integration, `XYScatterChart` component, `FilterSelect` component |
| Story 7.1 | Design tokens -- colors, typography, spacing |

## Acceptance Criteria (BDD)

### AC 1: Dashboard page is accessible via gallery routing

**Given** the dashboard gallery from Story 9.1 is rendered
**When** the user navigates to `/dashboards/player-analysis`
**Then** the Player Analysis dashboard page loads with the slug `player-analysis`
**And** the page contains: `PlayerFilters`, and below the filters an initially empty content area with a prompt message "Select a player to view their analysis"
**And** the page has a `"use client"` directive (client-side interactivity required)
**And** the page title is "Player Analysis"

### AC 2: PlayerFilters implements cascading filter dropdowns

**Given** the PlayerFilters component mounts
**When** it fetches initial data
**Then** it calls `GET /api/statsbomb/competitions` to populate the Competition dropdown

**Given** the Competition dropdown is populated
**When** the user selects a competition (e.g., Serie A)
**Then** the component calls `GET /api/statsbomb/teams?competition_id={id}` to populate the Team dropdown
**And** the Team, Season, and Player fields are reset to empty
**And** the Season and Player fields remain disabled until Team is selected

**Given** a competition and team are selected
**When** the user selects a team
**Then** the component calls `GET /api/statsbomb/seasons` (filtered by competition) to populate the Season dropdown
**And** the Season dropdown is enabled and the Player field remains disabled
**And** the Player field is reset to empty

**Given** a competition, team, and season are selected
**When** the user selects a season
**Then** the Player search field is enabled
**And** the Player search field placeholder reads "Search player name..."

**Given** the Player search field is enabled
**When** the user types at least 2 characters into the Player search field
**Then** the component calls `GET /api/statsbomb/players?search={query}` with the typed text
**And** results are displayed in a dropdown list showing player name and team
**And** the search uses fuzzy matching (case-insensitive, partial match) against the StatsBomb player database
**And** results update as the user continues typing (debounced at 300ms)

**Given** the player search dropdown is visible
**When** the user selects a player from the results
**Then** the component emits the selected `player_id`, `competition_id`, and `season_id` to the parent
**And** all downstream dashboard components load data for the selected player

**Given** a filter at any level is changed (e.g., the user changes the competition)
**When** the downstream filters become invalid
**Then** all child filters below the changed level are reset (e.g., changing competition resets team, season, and player)
**And** the dashboard content area returns to the empty prompt state

### AC 3: PlayerInfoCard displays player identity and position role selector

**Given** a player has been selected via PlayerFilters
**When** the PlayerInfoCard component receives the player data from `GET /api/statsbomb/player-season-stats?player_id={id}&competition_id={id}&season_id={id}`
**Then** it displays the player's photo (from the StatsBomb photo URL in the API response; fallback to a generic avatar silhouette if no photo is available)
**And** it displays the player's full name in bold text
**And** it displays the player's primary position (e.g., "Centre Forward", "Central Midfielder")
**And** it displays the player's age (calculated from date of birth)
**And** it displays the player's current team name

**Given** the PlayerInfoCard is rendered
**When** the user views the position role selector dropdown
**Then** the dropdown contains four options: Forward, Midfielder, Defender, Goalkeeper
**And** the dropdown defaults to the role matching the player's primary position (e.g., a Centre Forward defaults to "Forward")
**And** when the user changes the role selection, all position-dependent components (PlayerOverview, SeasonStatistics, PlayerRadarChart, PlayerComparison) update their metric templates to match the selected role

### AC 4: PlayerOverview displays position-based quick stats

**Given** a player is selected and player-season-stats data is loaded
**When** the PlayerOverview component renders
**Then** it displays a row of 4-6 summary stat cards based on the selected position role:

| Role | Metrics Displayed |
|------|-------------------|
| Forward | Goals, xG, Shots, Assists, xA, Goals per 90 |
| Midfielder | Passes Completed, Progressive Passes, Tackles, Interceptions, Key Passes, Pass Accuracy % |
| Defender | Tackles, Interceptions, Aerial Duels Won, Clearances, Blocks, Tackles per 90 |
| Goalkeeper | Saves, Save %, Goals Conceded, xG Faced, Clean Sheets, Save % vs xG |

**And** each stat card shows the metric name as a label and the value in large bold text
**And** stat cards use a responsive grid layout (2 columns on mobile, 3 on tablet, 4-6 on desktop)
**And** when the position role changes in PlayerInfoCard, the metrics update immediately without a new API call (the data is already fetched, only the displayed metrics change)

### AC 5: SeasonStatistics displays a detailed stats table with per-90 metrics and percentiles

**Given** a player is selected and both player-season-stats and league-player-season-stats data are loaded
**When** the SeasonStatistics component renders
**Then** it displays a table with the following columns:

| Column | Description |
|--------|-------------|
| Metric Name | Human-readable metric label (e.g., "Goals", "Expected Goals (xG)") |
| Total | Raw season total for the metric |
| Per 90 | Value normalized to per-90-minutes (`total / (minutes_played / 90)`) |
| Percentile | Player's percentile rank vs all league players at same position with >= 300 minutes |

**And** the metrics displayed are filtered by the selected position role (same groupings as AC 4, but with the full expanded set of 10-15 metrics per role)
**And** the percentile column cells are color-coded according to the following scale:
  - 0-20th percentile: red background (`bg-red-100 text-red-800` / dark mode: `bg-red-900/30 text-red-300`)
  - 21-40th percentile: orange background (`bg-orange-100 text-orange-800` / dark mode: `bg-orange-900/30 text-orange-300`)
  - 41-60th percentile: yellow background (`bg-yellow-100 text-yellow-800` / dark mode: `bg-yellow-900/30 text-yellow-300`)
  - 61-80th percentile: light green background (`bg-green-100 text-green-800` / dark mode: `bg-green-900/30 text-green-300`)
  - 81-100th percentile: green background (`bg-emerald-100 text-emerald-800` / dark mode: `bg-emerald-900/30 text-emerald-300`)
**And** the table is scrollable on mobile if it exceeds the viewport width
**And** each percentile value is displayed as an integer followed by "%" (e.g., "87%")

### AC 6: PlayerRadarChart renders a position-specific radar chart with league percentiles

**Given** a player is selected and percentile data has been computed
**When** the PlayerRadarChart component renders
**Then** it displays a Recharts `RadarChart` inside a `ResponsiveContainer` (min-height 350px)
**And** the radar chart shows 5-10 metrics based on the selected position role:

| Role | Radar Metrics (5-10 axes) |
|------|---------------------------|
| Forward | Goals, xG, Shots, Shots on Target, Assists, xA, Dribbles, Aerial Duels |
| Midfielder | Passes, Progressive Passes, Key Passes, Tackles, Interceptions, Dribbles, Carries, Pass Accuracy |
| Defender | Tackles, Interceptions, Aerial Duels, Clearances, Blocks, Passes, Progressive Passes, Recoveries |
| Goalkeeper | Saves, Save %, xG Prevented, Crosses Claimed, Distribution Accuracy, Sweeper Actions |

**And** each axis is normalized to a 0-100 percentile scale (the player's percentile vs league is the plotted value)
**And** the filled radar area uses Sampdoria blue (`#1b5497`) with 30% opacity
**And** the radar outline uses Sampdoria blue (`#1b5497`) at full opacity with `strokeWidth={2}`
**And** a `PolarGrid` is rendered with grid lines at 20, 40, 60, 80, 100
**And** `PolarAngleAxis` labels display the metric names in `text-xs` positioned outside the radar
**And** a `Tooltip` on hover shows the metric name and the exact percentile value
**And** the chart title reads "Player Profile - [Position Role]"

### AC 7: PlayerScatterPlot renders an XY scatter with league context

**Given** a player is selected and league-player-season-stats data is loaded
**When** the PlayerScatterPlot component renders
**Then** it uses the `XYScatterChart` component from Story 7.3

**And** it displays a dual-axis metric selection UI above the chart with two grouped dropdowns:
  - X-axis metric selector (grouped by category: Shooting, Passing, Defending, Possession)
  - Y-axis metric selector (same grouped categories)
  - Default X-axis: "xG per 90", default Y-axis: "Goals per 90" (for Forwards); defaults vary by position

**And** each league player (>= 300 minutes) is rendered as a gray dot (`#9ca3af`) with `opacity={0.6}`
**And** the selected player is rendered as a larger Sampdoria blue dot (`#1b5497`) with `opacity={1}` and a white stroke border
**And** two red dashed reference lines are drawn:
  - Vertical red dashed line at the league average for the X-axis metric
  - Horizontal red dashed line at the league average for the Y-axis metric
  - Both lines use `stroke="#ef4444"`, `strokeDasharray="5 5"`, `strokeWidth={1}`
**And** a `Tooltip` on hover shows the player name, team, and both metric values
**And** the chart axes are labeled with the selected metric names
**And** the chart title reads "Player Comparison - [X Metric] vs [Y Metric]"

### AC 8: PlayerComparison displays a detailed comparison table

**Given** a player is selected and both player-season-stats and league-player-season-stats data are loaded
**When** the PlayerComparison component renders
**Then** it displays a comparison table with the following columns:

| Column | Description |
|--------|-------------|
| Metric | Human-readable metric name |
| Player Value | The selected player's per-90 value for the metric |
| League Average | The average per-90 value across all league players (>= 300 min) at the same position |
| Percentile | The player's percentile rank for this metric |
| Delta | The difference between the player's value and the league average (formatted with +/- sign) |

**And** the metrics displayed are filtered by the selected position role
**And** the Percentile column uses the same color-coding scale as SeasonStatistics (AC 5)
**And** the Delta column is color-coded: positive deltas in green text, negative deltas in red text, zero in neutral/gray
**And** metrics are sorted by percentile descending (best metrics first) by default
**And** the table heading reads "vs League Average ([Position Role]s, >= 300 min)"

### AC 9: Percentile calculation is correct and consistent

**Given** player-season-stats and league-player-season-stats data are both loaded
**When** percentiles are calculated for any metric
**Then** the calculation uses the following formula:
  - All league players at the same position with >= 300 minutes played are included
  - For each metric, all qualifying players' per-90 values are collected and sorted ascending
  - The selected player's rank is determined (how many players they are better than)
  - `percentile = (rank / totalPlayers) * 100`, rounded to the nearest integer
**And** the percentile is clamped to the range [0, 100]
**And** metrics where higher is NOT better (e.g., Goals Conceded for GK) are inverted: `percentile = 100 - percentile`
**And** the same percentile values are used consistently across SeasonStatistics, PlayerRadarChart, and PlayerComparison (calculated once, shared via hook or context)
**And** if league data is unavailable or insufficient (< 5 qualifying players), percentile columns display "--" instead of a number

### AC 10: All components handle loading, empty, and error states

**Given** any of the 7 components is waiting for data, receives empty data, or encounters a fetch error
**When** the component renders
**Then** during loading: skeleton placeholders matching the component's layout are shown (using shadcn/ui `Skeleton`)
**And** when data is empty or the player has no stats for the selected season: a centered "No data available for the selected player and season" message is shown with a muted icon
**And** on error: a centered error message is shown with a "Retry" button that re-triggers the data fetch
**And** error states do NOT crash the entire dashboard -- each component handles its own errors independently
**And** the PlayerFilters component shows loading spinners on each dropdown while its respective API call is in flight

### AC 11: Dashboard layout is responsive across breakpoints

**Given** the Player Analysis dashboard is viewed on different screen sizes
**When** the viewport changes
**Then** on mobile (<768px): all sections stack vertically in a single column; the scatter plot displays in a square aspect ratio
**And** on tablet (768px-1024px): PlayerInfoCard and PlayerOverview sit side by side; other sections stack
**And** on desktop (>1024px): the full layout renders with PlayerInfoCard + PlayerOverview in a top row, SeasonStatistics full width, radar and scatter side by side, and PlayerComparison full width
**And** all Recharts components use `ResponsiveContainer` with `width="100%"` to fill their parent
**And** no horizontal scrolling occurs at any breakpoint (tables are independently scrollable within their container)

### AC 12: TypeScript types and lint pass

**Given** all Player Analysis dashboard files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all components use proper TypeScript types (no `any` casts)
**And** all component props are explicitly typed with TypeScript interfaces

---

## Components Inventory (7 total)

| # | Component | File | Description |
|---|-----------|------|-------------|
| 1 | `PlayerFilters` | `player-filters.tsx` | Cascading filter dropdowns: Competition -> Team -> Season -> Player (fuzzy name search) |
| 2 | `PlayerInfoCard` | `player-info-card.tsx` | Player photo, name, position, age, team + position role selector dropdown |
| 3 | `PlayerOverview` | `player-overview.tsx` | Quick stat cards with position-based metric templates (4-6 stats) |
| 4 | `SeasonStatistics` | `season-statistics.tsx` | Detailed stats table: metric name, total, per 90, percentile (color-coded) |
| 5 | `PlayerRadarChart` | `player-radar-chart.tsx` | Radar chart showing 5-10 player metrics vs league percentiles |
| 6 | `PlayerScatterPlot` | `player-scatter-plot.tsx` | XY scatter: player (blue) vs league (gray) with average reference lines |
| 7 | `PlayerComparison` | `player-comparison.tsx` | Comparison table: player value vs league average, percentile, delta |

---

## API Routes Reference

All data is fetched client-side via `fetch()` or a shared fetcher utility. Routes are `GET` handlers created in Story 8.1.

| Route | Required Params | Used By Components | Description |
|-------|-----------------|-------------------|-------------|
| `/api/statsbomb/competitions` | -- | PlayerFilters | List all available competitions |
| `/api/statsbomb/teams?competition_id={id}` | `competition_id` | PlayerFilters | List teams in the selected competition |
| `/api/statsbomb/seasons` | `competition_id` | PlayerFilters | List available seasons for a competition |
| `/api/statsbomb/players?search={query}` | `search` | PlayerFilters | Fuzzy search players by name |
| `/api/statsbomb/player-season-stats?player_id={id}&competition_id={id}&season_id={id}` | `player_id`, `competition_id`, `season_id` | PlayerInfoCard, PlayerOverview, SeasonStatistics, PlayerComparison | Full season stats for a single player |
| `/api/statsbomb/league-player-season-stats?competition_id={id}&season_id={id}&min_minutes=300` | `competition_id`, `season_id`, `min_minutes` | SeasonStatistics, PlayerRadarChart, PlayerScatterPlot, PlayerComparison | All league players' season stats (for percentile calculation and scatter plot) |

---

## Data Flow

### Cascade Filter Sequence

```
1. Mount: GET /api/statsbomb/competitions
             |
2. User selects competition
             |
             v
   GET /api/statsbomb/teams?competition_id={id}
             |
3. User selects team
             |
             v
   GET /api/statsbomb/seasons (filtered by competition)
             |
4. User selects season
             |
             v
   Player search field becomes enabled
             |
5. User types player name (>= 2 chars, debounced 300ms)
             |
             v
   GET /api/statsbomb/players?search={query}
             |
6. User selects player
             |
             v
   GET /api/statsbomb/player-season-stats?player_id={id}&competition_id={id}&season_id={id}
   GET /api/statsbomb/league-player-season-stats?competition_id={id}&season_id={id}&min_minutes=300
             |
             v
   All dashboard components render with data
```

### State Architecture

```
PlayerAnalysisDashboard (root page)
  |
  |-- State: selectedCompetitionId, selectedTeamId, selectedSeasonId, selectedPlayerId
  |-- State: selectedPositionRole ("Forward" | "Midfielder" | "Defender" | "Goalkeeper")
  |-- Derived: playerStats (from player-season-stats API)
  |-- Derived: leagueStats (from league-player-season-stats API)
  |-- Derived: percentiles (computed from playerStats + leagueStats, memoized)
  |
  |-- PlayerFilters (reads/sets: competition, team, season, player)
  |-- PlayerInfoCard (reads: playerStats; reads/sets: selectedPositionRole)
  |-- PlayerOverview (reads: playerStats, selectedPositionRole)
  |-- SeasonStatistics (reads: playerStats, leagueStats, percentiles, selectedPositionRole)
  |-- PlayerRadarChart (reads: percentiles, selectedPositionRole)
  |-- PlayerScatterPlot (reads: playerStats, leagueStats, selectedPositionRole)
  |-- PlayerComparison (reads: playerStats, leagueStats, percentiles, selectedPositionRole)
```

### Percentile Calculation Detail

```typescript
function calculatePercentile(
  playerValue: number,
  allValues: number[],
  invertMetric: boolean = false,
): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v < playerValue).length;
  let percentile = Math.round((rank / sorted.length) * 100);
  if (invertMetric) percentile = 100 - percentile;
  return Math.max(0, Math.min(100, percentile));
}
```

**Inverted metrics** (lower is better): Goals Conceded (GK), Goals Conceded per 90 (GK), xG Faced per 90 (GK), Fouls Committed, Yellow Cards, Errors Leading to Shots.

---

## Tasks / Subtasks

- [ ] **Task 1: Create TypeScript types and constants** (AC: 2, 3, 4, 5, 9)
  - [ ] 1.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_lib/types.ts` with interfaces: `PlayerSeasonStats`, `LeaguePlayerStats`, `PositionRole`, `MetricDefinition`, `PercentileResult`
  - [ ] 1.2: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_lib/constants.ts` with:
    - Position role enum: `Forward`, `Midfielder`, `Defender`, `Goalkeeper`
    - Position-to-role mapping (e.g., "Centre Forward" -> Forward, "Central Midfielder" -> Midfielder)
    - Metric templates per role (overview metrics, radar metrics, full stat list)
    - Percentile color scale thresholds and Tailwind classes
    - Inverted metrics list
    - Scatter plot metric groups (Shooting, Passing, Defending, Possession) with labels and API field keys
  - [ ] 1.3: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_lib/percentiles.ts` with `calculatePercentile` function, `calculateAllPercentiles` (batch), and `getPercentileColor` helper

- [ ] **Task 2: Create shared data hooks** (AC: 2, 9, 10)
  - [ ] 2.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_hooks/use-player-stats.ts`
    - Fetches `/api/statsbomb/player-season-stats` when `player_id`, `competition_id`, `season_id` are all set
    - Returns `{ data: PlayerSeasonStats | null, isLoading, error, refetch }`
  - [ ] 2.2: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_hooks/use-league-stats.ts`
    - Fetches `/api/statsbomb/league-player-season-stats?competition_id={id}&season_id={id}&min_minutes=300`
    - Returns `{ data: LeaguePlayerStats[] | null, isLoading, error, refetch }`
  - [ ] 2.3: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_hooks/use-percentiles.ts`
    - Accepts `playerStats`, `leagueStats`, and `positionRole`
    - Computes all percentiles once via `useMemo` and returns a `Record<string, PercentileResult>`
    - Filters league players by position role before computing

- [ ] **Task 3: Implement PlayerFilters** (AC: 2, 10)
  - [ ] 3.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-filters.tsx`
  - [ ] 3.2: Implement Competition dropdown: fetch from `/api/statsbomb/competitions` on mount
  - [ ] 3.3: Implement Team dropdown: fetch from `/api/statsbomb/teams?competition_id={id}` when competition changes
  - [ ] 3.4: Implement Season dropdown: fetch from `/api/statsbomb/seasons` when team changes
  - [ ] 3.5: Implement Player search field: enabled only when competition, team, and season are all selected
  - [ ] 3.6: Implement fuzzy player search: call `/api/statsbomb/players?search={query}` with debounce (300ms), minimum 2 characters
  - [ ] 3.7: Implement cascade reset: changing a parent filter resets all child filters below it
  - [ ] 3.8: Use `FilterSelect` from Story 7.3 for competition/team/season dropdowns; use a custom combobox for player search with fuzzy results
  - [ ] 3.9: Show loading spinner on each dropdown while its API call is in flight
  - [ ] 3.10: Type the component props:
    ```typescript
    interface PlayerFiltersProps {
      onPlayerSelected: (params: {
        playerId: string;
        competitionId: string;
        seasonId: string;
      }) => void;
      onFiltersReset: () => void;
    }
    ```

- [ ] **Task 4: Implement PlayerInfoCard** (AC: 3)
  - [ ] 4.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-info-card.tsx`
  - [ ] 4.2: Display player photo from API response URL; use a generic avatar placeholder on error/missing via `onError` fallback on `<img>` or Next.js `Image`
  - [ ] 4.3: Display player name (bold), position, age (computed from DOB), team name
  - [ ] 4.4: Implement position role selector dropdown with four options: Forward, Midfielder, Defender, Goalkeeper
  - [ ] 4.5: Auto-detect default role from player's primary position using the position-to-role mapping from constants
  - [ ] 4.6: Emit role change via `onRoleChange` callback prop
  - [ ] 4.7: Type the component props:
    ```typescript
    interface PlayerInfoCardProps {
      playerStats: PlayerSeasonStats;
      selectedRole: PositionRole;
      onRoleChange: (role: PositionRole) => void;
      isLoading: boolean;
    }
    ```

- [ ] **Task 5: Implement PlayerOverview** (AC: 4)
  - [ ] 5.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-overview.tsx`
  - [ ] 5.2: Read the selected position role and pick the corresponding metric template from constants
  - [ ] 5.3: Render 4-6 stat cards in a responsive grid with metric label and value
  - [ ] 5.4: Use the StatsItem component (from Story 7.3) or a Card-based layout for each stat
  - [ ] 5.5: Handle role changes reactively (re-render with new metrics from the same data)

- [ ] **Task 6: Implement SeasonStatistics** (AC: 5, 9)
  - [ ] 6.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/season-statistics.tsx`
  - [ ] 6.2: Render a table with columns: Metric Name, Total, Per 90, Percentile
  - [ ] 6.3: Filter metrics by selected position role (10-15 metrics per role)
  - [ ] 6.4: Calculate per-90 values: `total / (minutes_played / 90)`
  - [ ] 6.5: Read percentile values from the shared `usePercentiles` hook
  - [ ] 6.6: Apply color-coded backgrounds to percentile cells using `getPercentileColor`
  - [ ] 6.7: Display "--" for percentile if league data is insufficient (< 5 qualifying players)
  - [ ] 6.8: Make the table horizontally scrollable on mobile (`overflow-x-auto`)

- [ ] **Task 7: Implement PlayerRadarChart** (AC: 6)
  - [ ] 7.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-radar-chart.tsx`
  - [ ] 7.2: Select 5-10 radar metrics based on the selected position role from constants
  - [ ] 7.3: Map each metric to its percentile value (0-100 scale) from the shared percentile data
  - [ ] 7.4: Render `ResponsiveContainer > RadarChart` with `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` (domain [0, 100], ticks at 20, 40, 60, 80, 100)
  - [ ] 7.5: Render `Radar` with fill `#1b5497`, `fillOpacity={0.3}`, stroke `#1b5497`, `strokeWidth={2}`
  - [ ] 7.6: Add a `Tooltip` showing metric name and percentile on hover
  - [ ] 7.7: Set chart title to "Player Profile - [Position Role]"

- [ ] **Task 8: Implement PlayerScatterPlot** (AC: 7)
  - [ ] 8.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-scatter-plot.tsx`
  - [ ] 8.2: Render dual metric selector dropdowns above the chart (X-axis and Y-axis), using grouped categories from constants
  - [ ] 8.3: Set position-specific default metrics (e.g., Forward: xG/90 vs Goals/90, Midfielder: Progressive Passes/90 vs Key Passes/90)
  - [ ] 8.4: Transform league-player-season-stats into scatter data: `{ x: metricX_per90, y: metricY_per90, playerName, teamName, isSelected }`
  - [ ] 8.5: Use `XYScatterChart` from Story 7.3, passing:
    - League players as gray dots (`#9ca3af`, `opacity={0.6}`)
    - Selected player as blue dot (`#1b5497`, larger radius, `opacity={1}`, white stroke)
  - [ ] 8.6: Add two `ReferenceLine` components: vertical at league X-axis average, horizontal at league Y-axis average; both `stroke="#ef4444"`, `strokeDasharray="5 5"`, `strokeWidth={1}`
  - [ ] 8.7: Add a `Tooltip` showing player name, team, and both metric values on hover
  - [ ] 8.8: Update chart when metric selectors change (no new API call, client-side re-render)

- [ ] **Task 9: Implement PlayerComparison** (AC: 8, 9)
  - [ ] 9.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-comparison.tsx`
  - [ ] 9.2: Render a table with columns: Metric, Player Value (per 90), League Average (per 90), Percentile, Delta
  - [ ] 9.3: Filter metrics by selected position role
  - [ ] 9.4: Calculate league average per metric: mean of all qualifying league players' per-90 values
  - [ ] 9.5: Calculate delta: `playerValue - leagueAverage` (formatted with +/- sign, 2 decimal places)
  - [ ] 9.6: Color-code delta: green for positive, red for negative, gray for zero/near-zero
  - [ ] 9.7: Color-code percentile cells same as SeasonStatistics
  - [ ] 9.8: Sort rows by percentile descending by default
  - [ ] 9.9: Display table heading: "vs League Average ([Position Role]s, >= 300 min)"

- [ ] **Task 10: Create the page route and layout** (AC: 1, 11)
  - [ ] 10.1: Create `apps/admin/src/app/(app)/dashboards/player-analysis/page.tsx` as a client component (`"use client"`)
  - [ ] 10.2: Set the page metadata/title to "Player Analysis"
  - [ ] 10.3: Render PlayerFilters at the top of the page
  - [ ] 10.4: Below filters, conditionally render either the empty prompt or the full dashboard content
  - [ ] 10.5: Manage top-level state: `selectedPlayerId`, `competitionId`, `seasonId`, `positionRole`
  - [ ] 10.6: Implement responsive layout grid:
    - Top row: PlayerInfoCard (left, ~1/3) + PlayerOverview (right, ~2/3)
    - Second row: SeasonStatistics (full width)
    - Third row: PlayerRadarChart (left, 1/2) + PlayerScatterPlot (right, 1/2)
    - Fourth row: PlayerComparison (full width)
  - [ ] 10.7: Pass shared data (playerStats, leagueStats, percentiles, positionRole) to all child components

- [ ] **Task 11: Loading, empty, and error states for all components** (AC: 10)
  - [ ] 11.1: Add skeleton loading states to each of the 7 components using shadcn/ui `Skeleton`
  - [ ] 11.2: Add empty state with "No data available for the selected player and season" message and muted icon
  - [ ] 11.3: Add error state with message and "Retry" button calling `refetch`
  - [ ] 11.4: Wrap each component in error handling to prevent cascading failures

- [ ] **Task 12: TypeScript and lint verification** (AC: 12)
  - [ ] 12.1: Define all component prop interfaces explicitly (no `any` types)
  - [ ] 12.2: Define response types for each API route's expected data shape
  - [ ] 12.3: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 12.4: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This story creates the **Player Analysis dashboard** -- a deep-dive analytics view for evaluating individual player performance within league context. It features a complex cascading filter pattern (4 levels) and heavy percentile calculation against league-wide data. All data comes from StatsBomb PostgreSQL via Next.js API routes (Story 8.1). No Convex mutations or queries are involved.

```
Browser (Player Analysis page)
  |
  | fetch() via custom hooks
  v
Next.js API Routes (Story 8.1)
  |
  v
StatsBomb PostgreSQL (read-only)
```

### Source Files (from football-dashboard-2)

- **Page:** `football-dashboard-2/src/app/(dashboard)/dashboards/player-analysis/page.tsx`
- **Components:** `football-dashboard-2/src/app/(dashboard)/dashboards/player-analysis/` (all component files in this directory)

### Files to Create

1. `apps/admin/src/app/(app)/dashboards/player-analysis/page.tsx` -- Dashboard page (client component)
2. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-filters.tsx`
3. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-info-card.tsx`
4. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-overview.tsx`
5. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/season-statistics.tsx`
6. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-radar-chart.tsx`
7. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-scatter-plot.tsx`
8. `apps/admin/src/app/(app)/dashboards/player-analysis/_components/player-comparison.tsx`
9. `apps/admin/src/app/(app)/dashboards/player-analysis/_hooks/use-player-stats.ts`
10. `apps/admin/src/app/(app)/dashboards/player-analysis/_hooks/use-league-stats.ts`
11. `apps/admin/src/app/(app)/dashboards/player-analysis/_hooks/use-percentiles.ts`
12. `apps/admin/src/app/(app)/dashboards/player-analysis/_lib/types.ts`
13. `apps/admin/src/app/(app)/dashboards/player-analysis/_lib/constants.ts`
14. `apps/admin/src/app/(app)/dashboards/player-analysis/_lib/percentiles.ts`

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement for data fetching
- Anything under `apps/web/` -- dashboard pages go in `apps/admin/`
- API routes from Story 8.1 -- consumed as-is, not modified
- Shared chart components from Story 7.3 -- imported and used, not changed (including `XYScatterChart`)

### Key Decisions

1. **Cascading filter state** -- Filter state is managed at the page level. Each filter level (competition, team, season, player) is dependent on the previous. Changing a parent resets all children. This is handled via `useEffect` chains or a reducer pattern.

2. **Percentile computation is centralized** -- The `usePercentiles` hook computes all percentiles once from `playerStats` + `leagueStats` + `positionRole`. The result is a memoized `Record<string, PercentileResult>` shared across SeasonStatistics, PlayerRadarChart, and PlayerComparison. This avoids redundant computation and ensures consistency.

3. **Position role drives metric selection** -- The `selectedPositionRole` state controls which metrics appear in PlayerOverview, SeasonStatistics, PlayerRadarChart, and PlayerComparison. Changing the role does NOT trigger new API calls -- it only changes which subset of the already-fetched data is displayed. League percentile filtering also respects position role (comparing Forwards to Forwards, etc.).

4. **Collocated components** -- All 7 components, 3 hooks, and lib files live under the `player-analysis/` directory. These are dashboard-specific and not reused elsewhere. Shared primitives (`FilterSelect`, `XYScatterChart`, `StatsItem`) are imported from Story 7.3.

5. **Player search is server-side fuzzy** -- Unlike client-side filtering, the player search calls the API with a search query. The API performs fuzzy matching (likely using PostgreSQL `ILIKE` or `ts_query`). The client debounces at 300ms to avoid excessive API calls.

6. **League stats minimum threshold** -- The `min_minutes=300` parameter ensures only players with meaningful sample sizes are included in percentile calculations. If fewer than 5 players qualify, percentile displays "--" to indicate insufficient data.

### Recharts Components Used

| Recharts Import | Used In |
|----------------|---------|
| `ResponsiveContainer` | PlayerRadarChart, PlayerScatterPlot |
| `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` | PlayerRadarChart |
| `Tooltip` | PlayerRadarChart, PlayerScatterPlot |
| `ReferenceLine` | PlayerScatterPlot |
| `XYScatterChart` (custom from Story 7.3) | PlayerScatterPlot |

### Color Reference

| Element | Color | Usage |
|---------|-------|-------|
| Sampdoria Blue | `#1b5497` | Selected player dot, radar fill/stroke |
| League Players (scatter) | `#9ca3af` | Gray dots for other league players |
| League Average Lines | `#ef4444` (red dashed) | Vertical and horizontal reference lines |
| Radar Fill | `#1b5497` at 30% opacity | Radar area fill |
| Percentile 0-20 | `bg-red-100` / `bg-red-900/30` | Lowest tier |
| Percentile 21-40 | `bg-orange-100` / `bg-orange-900/30` | Below average |
| Percentile 41-60 | `bg-yellow-100` / `bg-yellow-900/30` | Average |
| Percentile 61-80 | `bg-green-100` / `bg-green-900/30` | Above average |
| Percentile 81-100 | `bg-emerald-100` / `bg-emerald-900/30` | Top tier |
| Delta Positive | green text | Player above league average |
| Delta Negative | red text | Player below league average |

### Testing Approach

- **Cascade filter testing:** Step through each filter level (competition -> team -> season -> player) and verify each dropdown populates correctly and resets children on parent change
- **Fuzzy search:** Type partial player names and verify fuzzy results appear (e.g., "Qua" should find "Fabio Quagliarella")
- **Position role switching:** Change the role selector and verify all 4 dependent components update their metrics without new API calls
- **Percentile verification:** Manually check a few percentile values against the league data to confirm the calculation is correct
- **Scatter plot interaction:** Change X/Y axis metrics and verify the scatter plot re-renders with correct data
- **Empty player:** Select a player with very few minutes and verify empty/insufficient data states appear
- **Responsive:** Resize through breakpoints and verify layout adapts (stacking, side-by-side)
- **No automated tests required in this story** -- visual dashboard components are validated through manual QA

### Position-to-Role Mapping Reference

| StatsBomb Position | Mapped Role |
|-------------------|-------------|
| Goalkeeper | Goalkeeper |
| Right Back, Left Back, Right Wing Back, Left Wing Back, Right Center Back, Left Center Back, Center Back | Defender |
| Right Defensive Midfield, Left Defensive Midfield, Center Defensive Midfield, Right Center Midfield, Left Center Midfield, Center Midfield, Right Attacking Midfield, Left Attacking Midfield, Center Attacking Midfield | Midfielder |
| Right Wing, Left Wing, Right Center Forward, Left Center Forward, Center Forward, Striker, Secondary Striker | Forward |
