# Story 10.5: Team Trends Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 8

> **PROJECT SCOPE:** All components target `apps/web/src/app/(app)/dashboards/team-trends/`. Shared chart primitives from Story 7.3 (`apps/web/src/components/charts/`) and design tokens from Story 7.1 are reused. The XYScatterChart component from Story 7.3 is consumed as a dependency. Data is fetched client-side from StatsBomb Next.js API routes (Story 8.1). Convex is NOT involved in data fetching -- this is read-only external data rendered in interactive Recharts visualizations. The dashboard is registered in the gallery under slug `"team-trends"` (Story 9.1).

## Dependencies

| Dependency | What it provides |
|------------|-----------------|
| Story 9.1 | Dashboard gallery routing, slug-based navigation (`/dashboards/team-trends`), layout shell |
| Story 8.1 | StatsBomb API routes: `/api/statsbomb/teams`, `/seasons`, `/team-trends`, `/league-ranking-averages`, `/league-team-season-averages` |
| Story 7.3 | Recharts integration, `XYScatterChart` component, `FilterSelect`, `FilterBar` components |
| Story 7.1 | Design tokens (colors, typography, spacing) |

## Story

As a football analyst or club staff member,
I want a Team Trends dashboard that displays match-by-match metric progression, league ranking trajectory, and a scatter-plot comparison of team metrics against league averages,
so that I can identify performance trends over the season, track league position movement, and benchmark the team against competitors without navigating multiple screens.

## Acceptance Criteria (BDD)

### AC 1: Team Trends page renders at `/dashboards/team-trends`

**Given** the user navigates to `/dashboards/team-trends`
**When** the page loads
**Then** the Team Trends dashboard renders inside the dashboard layout shell (from Story 9.1)
**And** the page title is "Team Trends"
**And** the `TeamTrendsFiltersBar` appears at the top of the page
**And** below the filters, the dashboard sections render in a responsive layout: `TeamMetricProgressChart` spanning full width, then `LeagueRankingChart` and `TeamXYScatterChart` side by side on desktop
**And** loading skeletons are shown while data is being fetched
**And** the page is registered with slug `"team-trends"` in the dashboards registry

### AC 2: TeamTrendsFiltersBar provides team and season selection with sensible defaults

**Given** the `TeamTrendsFiltersBar` component mounts
**When** it fetches the initial data
**Then** it calls `/api/statsbomb/teams` to populate the team dropdown
**And** it calls `/api/statsbomb/seasons` to populate the season dropdown
**And** the team dropdown defaults to UC Sampdoria (or the first team in the list if Sampdoria is unavailable)
**And** the season dropdown defaults to the latest available season
**And** when the user selects a different team, the season dropdown refreshes to show seasons available for that team
**And** when the user changes either dropdown, all downstream components re-fetch their data with the new `team_id` and `season_id`
**And** both dropdowns use the `FilterSelect` component from Story 7.3 with search capability

**Given** the user selects a team from the dropdown
**When** the selection changes
**Then** the `onTeamChange` callback fires with the new `team_id`
**And** the season dropdown reloads to reflect seasons available for the newly selected team
**And** downstream components receive updated filter values and re-fetch data

**Given** the user selects a season from the dropdown
**When** the selection changes
**Then** the `onSeasonChange` callback fires with the new `season_id`
**And** downstream components receive the updated `season_id` and re-fetch data

### AC 3: TeamMetricProgressChart displays match-by-match metric line chart

**Given** the `TeamMetricProgressChart` component receives valid `team_id` and `season_id`
**When** it fetches data from `/api/statsbomb/team-trends?team_id={id}&season_id={id}`
**Then** it renders a Recharts `LineChart` inside a `ResponsiveContainer` (min-height 350px)
**And** the X-axis shows matchweek numbers (1, 2, 3, ...)
**And** the Y-axis shows the selected metric value
**And** a single line with stroke color `#1b5497` (Sampdoria blue) plots the metric value per match
**And** each data point has a visible dot marker on the line
**And** smooth curves are applied to the line (`type="monotone"`)
**And** a `CartesianGrid` with dashed stroke is rendered in the background
**And** a `Tooltip` on hover shows: matchweek number, metric name, metric value, and opponent name (if available)

### AC 4: TeamMetricProgressChart metric picker supports all required metrics

**Given** the `TeamMetricProgressChart` component renders
**When** the user interacts with the metric picker dropdown
**Then** the dropdown displays the following metrics as selectable options:

| Metric Key | Display Label |
|------------|--------------|
| `possession_pct` | Possession % |
| `xg` | xG (Expected Goals) |
| `shots` | Shots |
| `ppda` | PPDA |
| `goals` | Goals |
| `passes` | Passes |
| `progressive_passes` | Progressive Passes |
| `pressures` | Pressures |
| `tackles` | Tackles |
| `interceptions` | Interceptions |
| `aerial_duels` | Aerial Duels |

**And** only one metric is selectable at a time (single-select dropdown)
**And** the default selected metric is `possession_pct` (Possession %)
**And** when the user selects a different metric, the chart re-renders with the new metric's data without re-fetching from the API (all metrics are included in the single API response)
**And** the Y-axis label updates to reflect the currently selected metric name
**And** the metric picker uses the `FilterSelect` component from Story 7.3

### AC 5: LeagueRankingChart displays team position over matchweeks with inverted Y-axis

**Given** the `LeagueRankingChart` component receives valid `season_id`
**When** it fetches data from `/api/statsbomb/league-ranking-averages?season_id={id}`
**Then** it renders a Recharts `LineChart` inside a `ResponsiveContainer` (min-height 300px)
**And** the X-axis shows matchweek numbers (1, 2, 3, ...)
**And** the Y-axis shows league position with an **inverted scale**: position 1 at the top, position 20 at the bottom
**And** the Y-axis domain is `[1, 20]` with `reversed={true}`
**And** a line with stroke color `#1b5497` (Sampdoria blue) plots the team's league position per matchweek
**And** each data point has a visible dot marker
**And** the most recent matchweek data point is visually highlighted (larger dot, `r={6}` vs `r={4}` for others, or a pulsing effect)
**And** a `CartesianGrid` with dashed stroke is rendered in the background
**And** a `Tooltip` on hover shows: matchweek number and league position
**And** a chart title or heading reads "League Position"

### AC 6: TeamXYScatterChart renders scatter plot comparing team vs league

**Given** the `TeamXYScatterChart` component receives valid `team_id` and `season_id`
**When** it fetches data from `/api/statsbomb/league-team-season-averages?season_id={id}`
**Then** it renders using the `XYScatterChart` component from Story 7.3
**And** the selected team's data point is rendered in Sampdoria blue (`#1b5497`) with a larger marker (`r={8}`)
**And** all other teams' data points are rendered in gray (`#9ca3af`) with a smaller marker (`r={5}`)
**And** red dashed reference lines (`stroke="#ef4444"`, `strokeDasharray="5 5"`) are drawn at the league average values for both X and Y axes
**And** a `Tooltip` on hover shows: team name, X-axis metric value, Y-axis metric value

### AC 7: TeamXYScatterChart supports dual-axis metric selection from grouped categories

**Given** the `TeamXYScatterChart` component renders
**When** the user interacts with the axis selection controls
**Then** two independent metric dropdowns are displayed: one for the X-axis and one for the Y-axis
**And** each dropdown offers metrics organized in the following category groups:

| Category | Metrics |
|----------|---------|
| Attack | xG, Shots, Goals, Shots on Target |
| Possession | Possession %, Passes, Progressive Passes, PPDA |
| Defense | Tackles, Interceptions, Pressures, Aerial Duels |

**And** the default X-axis metric is `xg` (xG)
**And** the default Y-axis metric is `possession_pct` (Possession %)
**And** when the user changes either axis metric, the scatter plot re-renders with the new metric mapping without re-fetching data
**And** the axis labels update to reflect the currently selected metric names
**And** the reference lines update to reflect the league average for the newly selected metrics

### AC 8: All chart tooltips display contextual data on hover

**Given** any of the three chart components is rendered with data
**When** the user hovers over a data point
**Then** a styled tooltip appears near the cursor

For `TeamMetricProgressChart`:
**And** the tooltip shows: "Matchweek {n}", "{Metric Name}: {value}", and opponent name if available

For `LeagueRankingChart`:
**And** the tooltip shows: "Matchweek {n}", "Position: {ordinal}" (e.g., "Position: 5th")

For `TeamXYScatterChart`:
**And** the tooltip shows: "{Team Name}", "{X-Metric}: {value}", "{Y-Metric}: {value}"

**And** all tooltips use consistent styling with a white/dark background, rounded corners, and subtle shadow matching design tokens from Story 7.1

### AC 9: All components handle loading, empty, and error states

**Given** any of the 4 components is waiting for data, receives empty data, or encounters a fetch error
**When** the component renders
**Then** during loading: skeleton placeholders matching the component's layout are shown (using shadcn/ui `Skeleton`)
**And** when data is empty: a centered "No data available for the selected filters" message is shown with a muted icon
**And** on error: a centered error message is shown with a "Retry" button that re-triggers the data fetch
**And** error states do NOT crash the entire dashboard -- each component handles its own errors independently via error boundaries or try/catch

### AC 10: Dashboard layout is responsive across breakpoints

**Given** the Team Trends dashboard is viewed on different screen sizes
**When** the viewport changes
**Then** on mobile (<768px): all sections stack vertically in a single column with `TeamTrendsFiltersBar` at top, `TeamMetricProgressChart` below, then `LeagueRankingChart`, then `TeamXYScatterChart`
**And** on tablet (768px-1024px): `TeamMetricProgressChart` spans full width; `LeagueRankingChart` and `TeamXYScatterChart` share a 2-column row
**And** on desktop (>1024px): same as tablet with larger chart dimensions and more padding
**And** all Recharts components use `ResponsiveContainer` with `width="100%"` to fill their parent
**And** no horizontal scrolling occurs at any breakpoint

### AC 11: TypeScript types pass and lint is clean

**Given** all files for the Team Trends dashboard have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all component props are explicitly typed with TypeScript interfaces (no `any` types)

---

## API Routes Reference

All data is fetched client-side via `fetch()` or a shared fetcher utility. Routes are `GET` handlers created in Story 8.1.

| Route | Required Params | Used By Components | Description |
|-------|-----------------|-------------------|-------------|
| `/api/statsbomb/teams` | -- | TeamTrendsFiltersBar | List teams (defaults to Serie A) |
| `/api/statsbomb/seasons` | -- | TeamTrendsFiltersBar | List available seasons |
| `/api/statsbomb/team-trends?team_id={id}&season_id={id}` | `team_id`, `season_id` | TeamMetricProgressChart | Match-by-match metrics with phase splits. Returns all metric values per matchweek in a single response |
| `/api/statsbomb/league-ranking-averages?season_id={id}` | `season_id` | LeagueRankingChart | Per-matchday league standings / position data |
| `/api/statsbomb/league-team-season-averages?season_id={id}` | `season_id` | TeamXYScatterChart | Season averages per team for scatter plot normalization and league average reference lines |

---

## Data Flow Diagram

```
TeamTrendsFiltersBar
  |-- GET /api/statsbomb/teams
  |-- GET /api/statsbomb/seasons
  |
  |  (user selects team + season)
  |
  v  Passes { team_id, season_id } down via props or context
  |
  +---> team-trends API -----------------> TeamMetricProgressChart
  |     (match-by-match metrics)            (user picks metric from dropdown;
  |                                          chart re-renders without re-fetch)
  |
  +---> league-ranking-averages API ------> LeagueRankingChart
  |     (per-matchday standings)             (inverted Y-axis line chart)
  |
  +---> league-team-season-averages API --> TeamXYScatterChart
        (all teams season averages)          (scatter plot with axis selectors;
                                              reference lines from league avg)
```

---

## Metric Reference

### TeamMetricProgressChart Metrics

| Key | Label | Unit | Notes |
|-----|-------|------|-------|
| `possession_pct` | Possession % | % | Default selection |
| `xg` | xG (Expected Goals) | decimal | Match xG |
| `shots` | Shots | count | Total shots per match |
| `ppda` | PPDA | decimal | Passes Per Defensive Action |
| `goals` | Goals | count | Goals scored per match |
| `passes` | Passes | count | Total passes per match |
| `progressive_passes` | Progressive Passes | count | Passes advancing toward goal |
| `pressures` | Pressures | count | Pressing actions per match |
| `tackles` | Tackles | count | Tackles per match |
| `interceptions` | Interceptions | count | Interceptions per match |
| `aerial_duels` | Aerial Duels | count | Aerial duels per match |

### TeamXYScatterChart Metric Categories

| Category | Metrics |
|----------|---------|
| Attack | xG, Shots, Goals, Shots on Target |
| Possession | Possession %, Passes, Progressive Passes, PPDA |
| Defense | Tackles, Interceptions, Pressures, Aerial Duels |

---

## Tasks / Subtasks

- [ ] **Task 1: Create the page route and layout** (AC: #1, #10)
  - [ ] 1.1: Create `apps/web/src/app/(app)/dashboards/team-trends/page.tsx` as a client component (`"use client"`)
  - [ ] 1.2: Set the page metadata/title to "Team Trends"
  - [ ] 1.3: Implement the top-level layout with `TeamTrendsFiltersBar` at top and a responsive grid below
  - [ ] 1.4: Use CSS grid or Tailwind grid classes: `grid grid-cols-1 lg:grid-cols-2 gap-4` for the lower two charts, with `TeamMetricProgressChart` spanning full width above
  - [ ] 1.5: Implement a shared filter state (React `useState` or context) that passes `teamId` and `seasonId` to all child components

- [ ] **Task 2: Implement TeamTrendsFiltersBar** (AC: #2)
  - [ ] 2.1: Create `apps/web/src/app/(app)/dashboards/team-trends/_components/team-trends-filters-bar.tsx`
  - [ ] 2.2: Fetch teams on mount from `/api/statsbomb/teams`
  - [ ] 2.3: Fetch seasons from `/api/statsbomb/seasons`
  - [ ] 2.4: Use `FilterSelect` (from Story 7.3) for both dropdowns with search capability
  - [ ] 2.5: Set default team to UC Sampdoria (or first in list) and default season to latest available
  - [ ] 2.6: Wire `onChange` callbacks to update the parent state and trigger downstream re-fetches
  - [ ] 2.7: Type the component props:
    ```typescript
    interface TeamTrendsFiltersBarProps {
      teamId: string;
      seasonId: string;
      onTeamChange: (teamId: string) => void;
      onSeasonChange: (seasonId: string) => void;
    }
    ```

- [ ] **Task 3: Implement TeamMetricProgressChart** (AC: #3, #4, #8)
  - [ ] 3.1: Create `apps/web/src/app/(app)/dashboards/team-trends/_components/team-metric-progress-chart.tsx`
  - [ ] 3.2: Fetch data from `/api/statsbomb/team-trends?team_id={id}&season_id={id}`
  - [ ] 3.3: Transform API response into Recharts-compatible data array: `{ matchweek: number, [metricKey]: number, opponent?: string }`
  - [ ] 3.4: Implement metric picker dropdown using `FilterSelect` with the 11 metrics listed in AC #4
  - [ ] 3.5: Default the picker to `possession_pct`
  - [ ] 3.6: Render `ResponsiveContainer > LineChart` with a single `Line` component using `dataKey` set to the selected metric key
  - [ ] 3.7: Add `CartesianGrid` (dashed), `XAxis` (matchweek), `YAxis` (metric value with dynamic label), `Tooltip`, `Legend`
  - [ ] 3.8: Style the line: `stroke="#1b5497"`, `type="monotone"`, `dot={true}` with `r={4}`
  - [ ] 3.9: On metric picker change, update the `dataKey` without triggering a new API fetch
  - [ ] 3.10: Type the component props:
    ```typescript
    interface TeamMetricProgressChartProps {
      teamId: string;
      seasonId: string;
    }
    ```

- [ ] **Task 4: Implement LeagueRankingChart** (AC: #5, #8)
  - [ ] 4.1: Create `apps/web/src/app/(app)/dashboards/team-trends/_components/league-ranking-chart.tsx`
  - [ ] 4.2: Fetch data from `/api/statsbomb/league-ranking-averages?season_id={id}`
  - [ ] 4.3: Transform API response into Recharts-compatible data array: `{ matchweek: number, position: number }`
  - [ ] 4.4: Render `ResponsiveContainer > LineChart` with inverted Y-axis: `<YAxis domain={[1, 20]} reversed={true} />`
  - [ ] 4.5: Style the line: `stroke="#1b5497"`, `type="monotone"`, `dot` with conditional radius (last point `r={6}`, others `r={4}`)
  - [ ] 4.6: Add `CartesianGrid` (dashed), `XAxis` (matchweek), `Tooltip`
  - [ ] 4.7: Add chart heading "League Position"
  - [ ] 4.8: Custom tooltip formatter to display ordinal position (e.g., "1st", "2nd", "3rd", "5th")
  - [ ] 4.9: Type the component props:
    ```typescript
    interface LeagueRankingChartProps {
      teamId: string;
      seasonId: string;
    }
    ```

- [ ] **Task 5: Implement TeamXYScatterChart** (AC: #6, #7, #8)
  - [ ] 5.1: Create `apps/web/src/app/(app)/dashboards/team-trends/_components/team-xy-scatter-chart.tsx`
  - [ ] 5.2: Fetch data from `/api/statsbomb/league-team-season-averages?season_id={id}`
  - [ ] 5.3: Implement two metric picker dropdowns (X-axis and Y-axis) with grouped categories (Attack, Possession, Defense) as defined in AC #7
  - [ ] 5.4: Default X-axis to `xg`, Y-axis to `possession_pct`
  - [ ] 5.5: Render the `XYScatterChart` component from Story 7.3, passing:
    - `data`: array of team data points with `{ teamName, [xMetric], [yMetric], isHighlighted }` shape
    - `xKey`: selected X-axis metric key
    - `yKey`: selected Y-axis metric key
    - `highlightColor`: `#1b5497` (Sampdoria blue)
    - `defaultColor`: `#9ca3af` (gray)
  - [ ] 5.6: Compute league averages for selected X and Y metrics and pass as reference line values
  - [ ] 5.7: Render red dashed reference lines: `stroke="#ef4444"`, `strokeDasharray="5 5"` at computed averages
  - [ ] 5.8: Highlight the selected team with `r={8}`, render other teams with `r={5}`
  - [ ] 5.9: On axis metric change, re-map data keys and update reference lines without re-fetching
  - [ ] 5.10: Type the component props:
    ```typescript
    interface TeamXYScatterChartProps {
      teamId: string;
      seasonId: string;
    }
    ```

- [ ] **Task 6: Implement shared data hooks** (AC: #2, #9)
  - [ ] 6.1: Create `apps/web/src/app/(app)/dashboards/team-trends/_hooks/use-team-trends-data.ts`
  - [ ] 6.2: Implement `useTeamTrends(teamId, seasonId)` hook that fetches and caches team-trends data
  - [ ] 6.3: Implement `useLeagueRanking(seasonId)` hook that fetches league-ranking-averages data
  - [ ] 6.4: Implement `useLeagueTeamAverages(seasonId)` hook that fetches league-team-season-averages data
  - [ ] 6.5: Each hook returns `{ data, isLoading, error, refetch }` shape
  - [ ] 6.6: Hooks should abort in-flight requests when parameters change (AbortController)

- [ ] **Task 7: Loading, empty, and error states for all components** (AC: #9)
  - [ ] 7.1: Add skeleton loading states to each of the 4 components using shadcn/ui `Skeleton`
  - [ ] 7.2: Add empty state with "No data available for the selected filters" message and muted icon
  - [ ] 7.3: Add error state with message and "Retry" button calling `refetch`
  - [ ] 7.4: Wrap each component in an error boundary or try/catch to prevent cascading failures

- [ ] **Task 8: TypeScript and lint verification** (AC: #11)
  - [ ] 8.1: Define all component prop interfaces explicitly (no `any` types)
  - [ ] 8.2: Define response types for each API route's expected data shape
  - [ ] 8.3: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 8.4: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This story creates the **Team Trends dashboard** -- a time-series analysis view that tracks team performance metrics match-by-match over the season. It complements the Season Overview dashboard (Story 9.2) by providing granular trend visibility rather than aggregated KPIs. All data comes from StatsBomb PostgreSQL via Next.js API routes (Story 8.1). No Convex mutations or queries are involved in the data layer.

```
Browser (Team Trends page)
  |
  | fetch() via custom hooks
  v
Next.js API Routes (Story 8.1)
  |
  v
StatsBomb PostgreSQL (read-only)
```

### Source Files (from football-dashboard-2)

- **Page:** `football-dashboard-2/src/app/(dashboard)/dashboards/team-trends/page.tsx`
- **Components:** `football-dashboard-2/src/app/(dashboard)/dashboards/team-trends/` (collocated)
  - `TeamTrendsFiltersBar`
  - `TeamMetricProgressChart`
  - `LeagueRankingChart`
  - `TeamXYScatterChart`

### Files to Create

1. `apps/web/src/app/(app)/dashboards/team-trends/page.tsx` -- Dashboard page (client component)
2. `apps/web/src/app/(app)/dashboards/team-trends/_components/team-trends-filters-bar.tsx`
3. `apps/web/src/app/(app)/dashboards/team-trends/_components/team-metric-progress-chart.tsx`
4. `apps/web/src/app/(app)/dashboards/team-trends/_components/league-ranking-chart.tsx`
5. `apps/web/src/app/(app)/dashboards/team-trends/_components/team-xy-scatter-chart.tsx`
6. `apps/web/src/app/(app)/dashboards/team-trends/_hooks/use-team-trends-data.ts`

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement for data fetching
- API routes from Story 8.1 -- consumed as-is, not modified
- Shared chart components from Story 7.3 (including `XYScatterChart`) -- imported and used, not changed
- Design tokens from Story 7.1 -- consumed, not modified

### Key Decisions

1. **Client-side data fetching** -- All API calls happen in the browser via `fetch()` or a hook abstraction. Filter changes trigger new requests without full page reloads. Consider SWR or React Query for caching, deduplication, and retry logic.

2. **Single API response for all metrics** -- The `/api/statsbomb/team-trends` endpoint returns all metric values per matchweek in one response. The metric picker switches the displayed `dataKey` in the chart without triggering additional network requests. This keeps the UX snappy when switching between metrics.

3. **Collocated components** -- All 4 components live under `team-trends/_components/`, not in the shared `components/` folder. These are dashboard-specific and not reused elsewhere. Shared primitives (`FilterSelect`, `XYScatterChart`) are imported from Story 7.3.

4. **XYScatterChart reuse** -- The scatter plot component built in Story 7.3 is consumed with team-trends-specific configuration (highlight color, reference lines, grouped metric categories). No modification of the base component is needed.

5. **Inverted Y-axis for league position** -- The `LeagueRankingChart` uses `reversed={true}` on the Y-axis so position 1 appears at the top (best) and position 20 at the bottom (worst). This is the standard convention for league standings visualization.

6. **League average reference lines** -- The scatter plot computes league averages dynamically from the `league-team-season-averages` data by averaging all teams' values for the selected X and Y metrics. These are rendered as red dashed lines creating four quadrants.

### Recharts Components Used

| Recharts Import | Used In |
|----------------|---------|
| `ResponsiveContainer` | TeamMetricProgressChart, LeagueRankingChart |
| `LineChart`, `Line` | TeamMetricProgressChart, LeagueRankingChart |
| `CartesianGrid` | TeamMetricProgressChart, LeagueRankingChart |
| `XAxis`, `YAxis` | TeamMetricProgressChart, LeagueRankingChart |
| `Tooltip`, `Legend` | TeamMetricProgressChart |
| `Tooltip` | LeagueRankingChart |
| `ReferenceLine` | TeamXYScatterChart (via XYScatterChart) |
| `ScatterChart`, `Scatter` | TeamXYScatterChart (via XYScatterChart from Story 7.3) |

### Color Reference

| Element | Color | Usage |
|---------|-------|-------|
| Sampdoria Blue | `#1b5497` | Line stroke, highlighted scatter dot |
| Other Teams (scatter) | `#9ca3af` | Non-highlighted scatter dots |
| League Average Lines | `#ef4444` | Red dashed reference lines on scatter plot |
| Chart Grid | dashed gray | CartesianGrid background on line charts |

### Testing Approach

- **Manual testing:** Load the dashboard with different team/season combinations and verify all 4 components render correctly
- **Filter interaction:** Change team and season dropdowns and verify all components re-fetch and update
- **Metric picker:** Switch between all 11 metrics in the progress chart and verify the line updates correctly
- **Axis selection:** Change X and Y axis metrics on the scatter plot and verify dots and reference lines reposition
- **Tooltips:** Hover over data points on all three charts and verify tooltip content matches AC #8
- **Inverted axis:** Verify league ranking chart shows position 1 at top, 20 at bottom
- **Responsive:** Resize browser through mobile/tablet/desktop breakpoints and verify layout adapts
- **Empty state:** Select a season with no data and verify empty state messages appear
- **Error state:** Disconnect network and verify error states with retry buttons appear
- **No automated tests required in this story** -- visual dashboard components are validated through manual QA

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
