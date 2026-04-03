# Story 9.2: Season Overview Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 13

> **PROJECT SCOPE:** All components target `apps/admin/src/app/(app)/dashboards/season-overview/`. Shared chart primitives from Story 7.3 (`apps/admin/src/components/charts/`) and design tokens from Story 7.1 are reused. Data is fetched client-side from StatsBomb Next.js API routes (Story 8.1). Convex is NOT involved in data fetching -- this is read-only external data rendered in interactive Recharts visualizations. The dashboard is registered in the gallery under slug `"season-overview"` (Story 9.1).

## Story

As a football analyst or club staff member,
I want a Season Overview dashboard that displays key performance indicators, points progression, phase strengths, possession analysis, form, and projections for any selected team and season,
so that I can quickly assess overall season performance, compare against expected metrics, and identify trends without navigating multiple screens.

## Acceptance Criteria

### AC 1: Season Overview page renders at `/dashboards/season-overview`

**Given** the user navigates to `/dashboards/season-overview`
**When** the page loads
**Then** the Season Overview dashboard renders inside the dashboard layout shell (from Story 9.1)
**And** the page title is "Season Overview"
**And** the SeasonFiltersBar appears at the top of the page
**And** below the filters, the dashboard sections render in a responsive grid layout
**And** loading skeletons are shown while data is being fetched

### AC 2: SeasonFiltersBar provides team and season selection with sensible defaults

**Given** the SeasonFiltersBar component mounts
**When** it fetches the initial data
**Then** it calls `/api/statsbomb/teams?competition_id=84` to populate the team dropdown
**And** it calls `/api/statsbomb/seasons` to populate the season dropdown
**And** the team dropdown defaults to the current team (UC Sampdoria, or the first team in the list)
**And** the season dropdown defaults to the latest available season (fetched from `/api/statsbomb/default-season?team_id={id}`)
**And** when the user selects a different team, the season dropdown refreshes to show seasons available for that team
**And** when the user changes either dropdown, all downstream components re-fetch their data with the new `team_id` and `season_id`
**And** both dropdowns use the FilterSelect component from Story 7.3 with search capability

### AC 3: PointsChart displays dual-axis line chart with actual points vs xPoints

**Given** the PointsChart component receives valid `team_id`, `season_id`, and `competition_id`
**When** it fetches data from `/api/statsbomb/season-points?team_id={id}&season_id={id}&competition_id={id}`
**Then** it renders a Recharts `LineChart` inside a `ResponsiveContainer` (min-height 350px)
**And** the X-axis shows matchday numbers (1, 2, 3, ...)
**And** the primary Y-axis shows cumulative points
**And** a line with stroke color matching the team's primary color (default: `#1b5497` Sampdoria blue) plots actual cumulative points
**And** a dashed line with stroke color `#9ca3af` plots expected points (xPoints)
**And** smooth curves are applied to both lines (`type="monotone"`)
**And** a `Tooltip` shows matchday, actual points, and xPoints on hover
**And** a `Legend` distinguishes the two lines

### AC 4: PointsChart supports season comparison mode

**Given** the PointsChart is rendered
**When** the user activates season comparison mode (toggle control)
**Then** the chart auto-selects the previous season (current season ID minus one) as the comparison
**And** a third line appears on the chart showing the previous season's actual points progression
**And** the comparison line uses a distinct color (e.g., `#6b7280` with lower opacity)
**And** the `Legend` updates to include the comparison season label
**And** if no previous season data exists, the toggle is disabled with a tooltip explaining why

### AC 5: SummaryCards display KPI metrics with delta indicators

**Given** the SummaryCards component receives season data from `/api/statsbomb/season-points` and `/api/statsbomb/league-team-season-averages`
**When** it renders
**Then** it displays the following KPI cards in a responsive grid (2 columns on mobile, 4 columns on desktop):
  - **Wins** -- total wins count
  - **Draws** -- total draws count
  - **Losses** -- total losses count
  - **Points per Game** -- average points per match (1 decimal)
  - **Goals For** -- total goals scored
  - **Goals Against** -- total goals conceded
  - **xG For** -- total expected goals for (1 decimal)
  - **xG Against** -- total expected goals against (1 decimal)
  - **Clean Sheets** -- total matches with zero goals conceded
**And** each card uses the StatsItem component or an equivalent card layout from Story 7.3
**And** each card shows a delta indicator (up arrow green / down arrow red) comparing the value to the league average when league average data is available

### AC 6: SeasonInsightsPanels display text-based key takeaways

**Given** the SeasonInsightsPanels component receives season and league average data
**When** it renders
**Then** it displays 2-4 insight cards with auto-generated text-based observations
**And** each insight card has a title, a short description paragraph, and an icon or emoji indicator
**And** insights are derived from the data (e.g., "Outperforming xG by +3.2 goals", "Home record: 8W 2D 1L", "Set-piece goals account for 28% of total")
**And** the cards use a muted background (`bg-muted/50`) with rounded corners and padding consistent with design tokens

### AC 7: PhaseStrengthsAndProjection combines phase analysis with projected finish

**Given** the PhaseStrengthsAndProjection component mounts
**When** it renders
**Then** it displays two sub-components side by side on desktop (stacked on mobile):
  - **PhaseStrengthsCard** (left/top)
  - **ProjectedFinishCard** (right/bottom)
**And** both sub-components share the same data context (team_id, season_id)

### AC 8: PhaseStrengthsCard renders a radar chart for phase metrics

**Given** the PhaseStrengthsCard component receives data from `/api/statsbomb/season-possession-details?team_id={id}&season_id={id}&competition_id={id}`
**When** it renders
**Then** it displays a Recharts `RadarChart` inside a `ResponsiveContainer` (min-height 300px)
**And** the radar has 5 axes representing: Build-up Quality, Transition Attack, Transition Defense, Set-Piece Attack, Set-Piece Defense
**And** each axis uses a 1-5 scale (5 = best in league, 1 = worst in league) normalized against league averages from `/api/statsbomb/league-team-season-averages`
**And** the filled radar area uses the team primary color (`#1b5497`) with 30% opacity
**And** the radar outline uses the team primary color at full opacity
**And** grid lines are rendered at each scale point (1 through 5)
**And** axis labels are positioned outside the radar with `text-xs` font size

### AC 9: PossessionRadars display dual radar charts for build-up vs transitions

**Given** the PossessionRadars component receives data from `/api/statsbomb/season-possession-details` with `phase=build-up` and `phase=transitions`
**When** it renders
**Then** it displays two radar charts side by side (stacked on mobile):
  - **Build-up Radar** (left/top) -- metrics: Possession %, Pass Accuracy, Progressive Passes, Carries into Final Third, PPDA
  - **Transitions Radar** (right/bottom) -- metrics: Counter-Attack Frequency, Fast Break Success %, Transition Speed, High Press Recovery, Defensive Transition
**And** each radar uses the same 5-point scale as PhaseStrengthsCard
**And** a heading above each radar clearly labels which phase it represents
**And** both radars use consistent styling (same colors, same scale, same grid)

### AC 10: CurrentFormCard displays the last 5 matches with W/D/L badges

**Given** the CurrentFormCard component receives season points data (which includes match results)
**When** it renders
**Then** it shows the last 5 completed matches in chronological order (most recent on the right)
**And** each match displays a circular badge:
  - **W** (win): green background (`bg-green-600 text-white`)
  - **D** (draw): yellow/amber background (`bg-amber-500 text-white`)
  - **L** (loss): red background (`bg-red-600 text-white`)
**And** below each badge, the opponent name is shown in `text-xs`
**And** below the opponent name, the score is shown (e.g., "2-1")
**And** a "Form:" label or heading precedes the badges
**And** the component displays an overall points-from-last-5 summary (e.g., "10/15 pts")

### AC 11: HomeVsAwayCard displays home vs away performance comparison

**Given** the HomeVsAwayCard component receives season data split by venue
**When** it renders
**Then** it shows two columns or sections: "Home" and "Away"
**And** each section displays: Wins, Draws, Losses, Goals For, Goals Against, Points Per Game
**And** comparison bars visually indicate which venue has stronger performance (horizontal bar chart or progress bars)
**And** the home section uses the team primary color and the away section uses a secondary/muted color
**And** a heading "Home vs Away" is displayed at the top

### AC 12: ProjectedFinishCard displays league position projection

**Given** the ProjectedFinishCard component receives season points data and league averages
**When** it renders
**Then** it calculates the projected final points based on current points-per-game rate extrapolated to the full season (typically 38 matches in Serie A)
**And** it displays the projected total points as a large number
**And** it displays the projected league finish position range (e.g., "Projected: 8th - 12th")
**And** the projection range is calculated by comparing projected points against historical league table data or league averages
**And** a progress bar or visual indicator shows how far through the season the team is (e.g., "Matchday 22 of 38")
**And** the card includes a caveat text in `text-xs text-muted-foreground` (e.g., "Based on current rate. Projections update after each matchday.")

### AC 13: XPointsOverUnderCard displays xPoints over/under comparison

**Given** the XPointsOverUnderCard component receives season points data
**When** it renders
**Then** it displays a bar chart or diverging chart showing the difference between actual points and xPoints per matchday
**And** positive differences (actual > xPoints, i.e., "over-performing") are colored green
**And** negative differences (actual < xPoints, i.e., "under-performing") are colored red
**And** the X-axis shows matchday numbers
**And** the Y-axis shows the cumulative difference (actual minus xPoints)
**And** a horizontal reference line at 0 separates over/under performance
**And** a `Tooltip` on hover shows the matchday, actual points, xPoints, and difference
**And** a summary line at the top shows the current total difference (e.g., "+4 points above expected")

### AC 14: All components handle loading, empty, and error states

**Given** any of the 11 components is waiting for data, receives empty data, or encounters a fetch error
**When** the component renders
**Then** during loading: skeleton placeholders matching the component's layout are shown (using shadcn/ui `Skeleton`)
**And** when data is empty: a centered "No data available for the selected filters" message is shown with a muted icon
**And** on error: a centered error message is shown with a "Retry" button that re-triggers the data fetch
**And** error states do NOT crash the entire dashboard -- each component handles its own errors independently

### AC 15: Dashboard layout is responsive across breakpoints

**Given** the Season Overview dashboard is viewed on different screen sizes
**When** the viewport changes
**Then** on mobile (<768px): all sections stack vertically in a single column
**And** on tablet (768px-1024px): sections use a 2-column grid where appropriate
**And** on desktop (>1024px): the full layout renders with SummaryCards in a 4-column row, charts at full width, and side-by-side panels where specified
**And** all Recharts components use `ResponsiveContainer` with `width="100%"` to fill their parent
**And** no horizontal scrolling occurs at any breakpoint

### AC 16: TypeScript types pass and lint is clean

**Given** all files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all component props are explicitly typed with TypeScript interfaces (no `any` types)

---

## API Routes Reference

All data is fetched client-side via `fetch()` or a shared fetcher utility (e.g., SWR or a custom hook). Routes are `GET` handlers created in Story 8.1.

| Route | Required Params | Used By Components | Description |
|-------|-----------------|-------------------|-------------|
| `/api/statsbomb/teams?competition_id=84` | `competition_id` | SeasonFiltersBar | List teams in Serie A |
| `/api/statsbomb/seasons` | `competition_id` | SeasonFiltersBar | List available seasons |
| `/api/statsbomb/default-season?team_id={id}` | `team_id` | SeasonFiltersBar | Get latest/default season for a team |
| `/api/statsbomb/season-points?team_id={id}&season_id={id}&competition_id={id}` | `team_id`, `season_id`, `competition_id` | PointsChart, SummaryCards, CurrentFormCard, HomeVsAwayCard, ProjectedFinishCard, XPointsOverUnderCard | Season points with match-by-match results and xPoints |
| `/api/statsbomb/season-possession-details?team_id={id}&season_id={id}&competition_id={id}` | `team_id`, `season_id`, `competition_id` | PhaseStrengthsCard, PossessionRadars | Phase-specific possession metrics (build-up, transitions, set-pieces) |
| `/api/statsbomb/league-team-season-averages?team_id={id}&season_id={id}` | `team_id`, `season_id` | SummaryCards, PhaseStrengthsCard, PossessionRadars, ProjectedFinishCard, SeasonInsightsPanels | League-wide averages for normalization and comparison |

---

## Data Flow Diagram

```
SeasonFiltersBar
  |-- GET /api/statsbomb/teams?competition_id=84
  |-- GET /api/statsbomb/seasons
  |-- GET /api/statsbomb/default-season?team_id={id}
  |
  |  (user selects team + season)
  |
  v  Passes { team_id, season_id, competition_id } down via props or context
  |
  +---> season-points API ------------> PointsChart
  |                                     SummaryCards
  |                                     CurrentFormCard
  |                                     HomeVsAwayCard
  |                                     ProjectedFinishCard
  |                                     XPointsOverUnderCard
  |                                     SeasonInsightsPanels
  |
  +---> season-possession-details ----> PhaseStrengthsCard
  |     API                             PossessionRadars
  |
  +---> league-team-season-averages --> SummaryCards (deltas)
        API                             PhaseStrengthsCard (normalization)
                                        PossessionRadars (normalization)
                                        ProjectedFinishCard (league context)
                                        SeasonInsightsPanels (comparisons)
```

---

## Tasks / Subtasks

- [ ] **Task 1: Create the page route and layout** (AC: #1, #15)
  - [ ] 1.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/page.tsx` as a client component (`"use client"`)
  - [ ] 1.2: Set the page metadata/title to "Season Overview"
  - [ ] 1.3: Implement the top-level layout with SeasonFiltersBar at top and a responsive grid below
  - [ ] 1.4: Use CSS grid or Tailwind grid classes: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4`
  - [ ] 1.5: Implement a shared filter state (React `useState` or context) that passes `teamId`, `seasonId`, `competitionId` to all child components

- [ ] **Task 2: Implement SeasonFiltersBar** (AC: #2)
  - [ ] 2.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/season-filters-bar.tsx`
  - [ ] 2.2: Fetch teams on mount from `/api/statsbomb/teams?competition_id=84`
  - [ ] 2.3: Fetch seasons from `/api/statsbomb/seasons`
  - [ ] 2.4: Fetch default season from `/api/statsbomb/default-season?team_id={id}` when team changes
  - [ ] 2.5: Use FilterSelect (from Story 7.3) for both dropdowns with search capability
  - [ ] 2.6: Wire `onChange` callbacks to update the parent state and trigger downstream re-fetches
  - [ ] 2.7: Type the component props:
    ```typescript
    interface SeasonFiltersBarProps {
      teamId: string;
      seasonId: string;
      competitionId: string;
      onTeamChange: (teamId: string) => void;
      onSeasonChange: (seasonId: string) => void;
    }
    ```

- [ ] **Task 3: Implement PointsChart** (AC: #3, #4)
  - [ ] 3.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/points-chart.tsx`
  - [ ] 3.2: Fetch data from `/api/statsbomb/season-points` with current filters
  - [ ] 3.3: Transform API response into Recharts-compatible data array: `{ matchday: number, actualPoints: number, xPoints: number }`
  - [ ] 3.4: Render `ResponsiveContainer > LineChart` with two `Line` components (actual + xPoints)
  - [ ] 3.5: Add `CartesianGrid`, `XAxis` (matchday), `YAxis` (points), `Tooltip`, `Legend`
  - [ ] 3.6: Implement season comparison toggle using a `Switch` or `Checkbox` control
  - [ ] 3.7: When comparison is active, fetch previous season data and add a third `Line`
  - [ ] 3.8: Disable comparison toggle when no previous season is available

- [ ] **Task 4: Implement SummaryCards** (AC: #5)
  - [ ] 4.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/summary-cards.tsx`
  - [ ] 4.2: Compute KPI values from season-points API response (wins, draws, losses, PPG, GF, GA, xG, xGA, clean sheets)
  - [ ] 4.3: Fetch league averages from `/api/statsbomb/league-team-season-averages` for delta computation
  - [ ] 4.4: Render 9 cards in a responsive grid using StatsItem or Card components
  - [ ] 4.5: Implement delta indicators: green up-arrow when above league average, red down-arrow when below

- [ ] **Task 5: Implement SeasonInsightsPanels** (AC: #6)
  - [ ] 5.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/season-insights-panels.tsx`
  - [ ] 5.2: Implement insight generation logic that compares team stats to league averages
  - [ ] 5.3: Generate 2-4 insight objects with `{ title: string, description: string, type: 'positive' | 'negative' | 'neutral' }`
  - [ ] 5.4: Render insight cards with consistent styling (`bg-muted/50 rounded-lg p-4`)

- [ ] **Task 6: Implement PhaseStrengthsAndProjection container** (AC: #7)
  - [ ] 6.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/phase-strengths-and-projection.tsx`
  - [ ] 6.2: Layout PhaseStrengthsCard and ProjectedFinishCard side by side on desktop (`grid grid-cols-1 lg:grid-cols-2 gap-4`)

- [ ] **Task 7: Implement PhaseStrengthsCard** (AC: #8)
  - [ ] 7.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/phase-strengths-card.tsx`
  - [ ] 7.2: Fetch data from `/api/statsbomb/season-possession-details`
  - [ ] 7.3: Normalize metrics to 1-5 scale based on league averages
  - [ ] 7.4: Render `ResponsiveContainer > RadarChart` with 5 `PolarAngleAxis` labels
  - [ ] 7.5: Use `PolarGrid`, `PolarRadiusAxis` (domain [0, 5]), `Radar` (fill `#1b5497`, fillOpacity 0.3)

- [ ] **Task 8: Implement PossessionRadars** (AC: #9)
  - [ ] 8.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/possession-radars.tsx`
  - [ ] 8.2: Fetch build-up data with `phase=build-up` and transitions data with `phase=transitions`
  - [ ] 8.3: Render two radar charts with consistent scale and styling
  - [ ] 8.4: Add section headings ("Build-up Phase", "Transition Phase")

- [ ] **Task 9: Implement CurrentFormCard** (AC: #10)
  - [ ] 9.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/current-form-card.tsx`
  - [ ] 9.2: Extract last 5 match results from season-points data
  - [ ] 9.3: Render W/D/L circular badges with correct color coding
  - [ ] 9.4: Show opponent name and score below each badge
  - [ ] 9.5: Calculate and display total points from last 5 matches

- [ ] **Task 10: Implement HomeVsAwayCard** (AC: #11)
  - [ ] 10.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/home-vs-away-card.tsx`
  - [ ] 10.2: Split season data by home/away venue
  - [ ] 10.3: Compute per-venue stats: W, D, L, GF, GA, PPG
  - [ ] 10.4: Render comparison bars or progress bars for each metric

- [ ] **Task 11: Implement ProjectedFinishCard** (AC: #12)
  - [ ] 11.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/projected-finish-card.tsx`
  - [ ] 11.2: Calculate projected points: `(currentPoints / matchesPlayed) * totalSeasonMatches`
  - [ ] 11.3: Estimate finish position range using league averages
  - [ ] 11.4: Render projected points, position range, season progress indicator, and caveat text

- [ ] **Task 12: Implement XPointsOverUnderCard** (AC: #13)
  - [ ] 12.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_components/xpoints-over-under-card.tsx`
  - [ ] 12.2: Calculate per-matchday difference: `actualPoints - xPoints`
  - [ ] 12.3: Render a Recharts `BarChart` with green (positive) and red (negative) fills
  - [ ] 12.4: Add `ReferenceLine` at y=0, `Tooltip`, and summary text

- [ ] **Task 13: Implement shared data hooks** (AC: #2, #14)
  - [ ] 13.1: Create `apps/admin/src/app/(app)/dashboards/season-overview/_hooks/use-season-data.ts`
  - [ ] 13.2: Implement a custom hook (or SWR/React Query hook) that fetches and caches season-points data
  - [ ] 13.3: Implement `useLeagueAverages` hook for league-team-season-averages data
  - [ ] 13.4: Implement `usePossessionDetails` hook for season-possession-details data
  - [ ] 13.5: Each hook returns `{ data, isLoading, error, refetch }` shape

- [ ] **Task 14: Loading, empty, and error states for all components** (AC: #14)
  - [ ] 14.1: Add skeleton loading states to each of the 11 components using shadcn/ui `Skeleton`
  - [ ] 14.2: Add empty state with "No data available" message and muted icon
  - [ ] 14.3: Add error state with message and "Retry" button calling `refetch`
  - [ ] 14.4: Wrap each component in an error boundary or try/catch to prevent cascading failures

- [ ] **Task 15: TypeScript and lint verification** (AC: #16)
  - [ ] 15.1: Define all component prop interfaces explicitly (no `any` types)
  - [ ] 15.2: Define response types for each API route's expected data shape
  - [ ] 15.3: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 15.4: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This story creates the **Season Overview dashboard** -- the primary high-level analytics view for club staff. It aggregates season-wide data into an interactive, filterable single-page dashboard. All data comes from StatsBomb PostgreSQL via Next.js API routes (Story 8.1). No Convex mutations or queries are involved in the data layer.

```
Browser (Season Overview page)
  |
  | fetch() via custom hooks
  v
Next.js API Routes (Story 8.1)
  |
  v
StatsBomb PostgreSQL (read-only)
```

### Source Files (from football-dashboard-2)

- **Page:** `football-dashboard-2/src/app/(dashboard)/dashboards/season-overview/page.tsx`
- **Components:** `football-dashboard-2/src/app/(dashboard)/dashboards/season-overview/_components/`
  - `season-filters-bar.tsx`
  - `points-chart.tsx`
  - `summary-cards.tsx`
  - `season-insights-panels.tsx`
  - `phase-strengths-and-projection.tsx`
  - `phase-strengths-card.tsx`
  - `possession-radars.tsx`
  - `current-form-card.tsx`
  - `home-vs-away-card.tsx`
  - `projected-finish-card.tsx`
  - `xpoints-over-under-card.tsx`

### Files to Create

1. `apps/admin/src/app/(app)/dashboards/season-overview/page.tsx` -- Dashboard page (client component)
2. `apps/admin/src/app/(app)/dashboards/season-overview/_components/season-filters-bar.tsx`
3. `apps/admin/src/app/(app)/dashboards/season-overview/_components/points-chart.tsx`
4. `apps/admin/src/app/(app)/dashboards/season-overview/_components/summary-cards.tsx`
5. `apps/admin/src/app/(app)/dashboards/season-overview/_components/season-insights-panels.tsx`
6. `apps/admin/src/app/(app)/dashboards/season-overview/_components/phase-strengths-and-projection.tsx`
7. `apps/admin/src/app/(app)/dashboards/season-overview/_components/phase-strengths-card.tsx`
8. `apps/admin/src/app/(app)/dashboards/season-overview/_components/possession-radars.tsx`
9. `apps/admin/src/app/(app)/dashboards/season-overview/_components/current-form-card.tsx`
10. `apps/admin/src/app/(app)/dashboards/season-overview/_components/home-vs-away-card.tsx`
11. `apps/admin/src/app/(app)/dashboards/season-overview/_components/projected-finish-card.tsx`
12. `apps/admin/src/app/(app)/dashboards/season-overview/_components/xpoints-over-under-card.tsx`
13. `apps/admin/src/app/(app)/dashboards/season-overview/_hooks/use-season-data.ts`

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement for data fetching
- Anything under `apps/web/` -- dashboard pages go in `apps/admin/`
- API routes from Story 8.1 -- consumed as-is, not modified
- Shared chart components from Story 7.3 -- imported and used, not changed

### Key Decisions

1. **Client-side data fetching** -- All API calls happen in the browser via `fetch()` or a hook abstraction. This keeps the dashboard interactive with filter changes triggering new requests without full page reloads. Consider SWR or React Query for caching, deduplication, and retry logic.

2. **Collocated components** -- All 11 components live under the `season-overview/_components/` directory, not in the shared `components/` folder. These are dashboard-specific and not reused elsewhere. Shared primitives (FilterSelect, StatsItem, chart wrappers) are imported from Story 7.3.

3. **Custom hooks for data** -- Shared data hooks (`_hooks/use-season-data.ts`) prevent duplicate fetches when multiple components need the same API response (e.g., `season-points` is used by 6+ components). The hook fetches once and components consume the same cached data.

4. **5-point radar normalization** -- PhaseStrengthsCard and PossessionRadars normalize raw metrics to a 1-5 scale. The normalization formula: `score = 1 + 4 * ((teamValue - leagueMin) / (leagueMax - leagueMin))`, clamped to [1, 5]. This requires league min/max from the `league-team-season-averages` API.

5. **Projection calculation** -- ProjectedFinishCard uses a simple linear projection: `projectedPoints = (currentPoints / matchesPlayed) * 38`. The finish position range uses +/- 1 standard deviation from historical data or a fixed margin of error.

6. **Competition ID default** -- Serie A competition_id is hardcoded as `84` for the initial implementation. This aligns with the StatsBomb data model and the team's primary competition.

### Recharts Components Used

| Recharts Import | Used In |
|----------------|---------|
| `ResponsiveContainer` | All chart components |
| `LineChart`, `Line` | PointsChart |
| `BarChart`, `Bar` | XPointsOverUnderCard |
| `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` | PhaseStrengthsCard, PossessionRadars |
| `CartesianGrid` | PointsChart, XPointsOverUnderCard |
| `XAxis`, `YAxis` | PointsChart, XPointsOverUnderCard |
| `Tooltip`, `Legend` | PointsChart, XPointsOverUnderCard |
| `ReferenceLine` | XPointsOverUnderCard |

### Color Reference

| Element | Color | Usage |
|---------|-------|-------|
| Sampdoria Blue | `#1b5497` | Primary line, radar fill, home stats |
| xPoints Line | `#9ca3af` | Dashed expected-points line |
| Comparison Season | `#6b7280` | Third line in comparison mode |
| Win Badge | `bg-green-600` | Form card W badges |
| Draw Badge | `bg-amber-500` | Form card D badges |
| Loss Badge | `bg-red-600` | Form card L badges |
| Over-performing | green fill | XPoints positive difference bars |
| Under-performing | red fill | XPoints negative difference bars |
| Radar Fill | `#1b5497` at 30% opacity | Phase strengths area |
| Delta Up | green arrow | Summary card above average |
| Delta Down | red arrow | Summary card below average |

### Testing Approach

- **Manual testing:** Load the dashboard with different team/season combinations and verify all components render correctly
- **Filter interaction:** Change team and season dropdowns and verify all components re-fetch and update
- **Season comparison:** Toggle comparison mode on/off, verify third line appears and disappears
- **Responsive:** Resize browser through mobile/tablet/desktop breakpoints and verify layout adapts
- **Empty state:** Select a season with no data and verify empty state messages appear
- **Error state:** Disconnect network and verify error states with retry buttons appear
- **No automated tests required in this story** -- visual dashboard components are validated through manual QA

### Dependencies

- **Depends on:**
  - Story 9.1 (Dashboard gallery, routing, `[slug]` dynamic page shell)
  - Story 8.1 (StatsBomb API routes -- all 6 endpoints used by this dashboard)
  - Story 7.1 (Design tokens -- colors, typography, spacing)
  - Story 7.3 (Recharts integration, FilterSelect, FilterBar, StatsItem components)
- **Blocks:** Nothing directly -- this is a leaf dashboard page
- **External dependency:** StatsBomb PostgreSQL database must be accessible and populated with Serie A season data
