# Story 10.4: Opposition Analysis Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 13

> **PROJECT SCOPE:** All components target `apps/admin/src/app/(app)/dashboards/opposition-analysis/`. Collocated components go in the `_components/` subdirectory. Data is fetched **server-side** via async data-fetching functions that query StatsBomb API routes (Story 8.1) -- the page is server-rendered with client hydration for interactive filters. Charts use Recharts components from Story 7.3. Design tokens from Story 7.1. Convex is NOT involved in data fetching -- this is read-only external data. The dashboard is registered in the gallery under slug `"opposition-analysis"` (Story 9.1).

## Story

As a football analyst, coach, or sporting director,
I want an Opposition Analysis dashboard that presents a comprehensive tactical profile of an upcoming or recent opponent -- including their form, style of play, phase-of-play strengths, formation tendencies, and player availability --
so that I can prepare match strategy and brief the coaching staff with data-driven insights about the opposition.

## Acceptance Criteria

### AC 1: Dashboard page renders at `/dashboards/opposition-analysis` with server-side data

**Given** the dashboard gallery (Story 9.1) is implemented with dynamic routing to `/dashboards/[slug]`
**When** a user navigates to `/dashboards/opposition-analysis`
**Then** the Opposition Analysis dashboard page renders inside the dashboard layout shell (from Story 9.1)
**And** the page title displays "Opposition Analysis"
**And** the page is registered in the dashboard gallery with title "Opposition Analysis", category "Advanced Analytics", and an appropriate icon
**And** the initial page load is server-rendered: the server calls `getOppositionTeams()` and `getManagers()` to populate the filter bar, and pre-fetches data for the default opponent
**And** client hydration enables interactive filter changes without full page reloads
**And** loading skeletons are shown in client components while data is being re-fetched after a filter change

### AC 2: OppositionFilterBar provides opponent team and manager selection

**Given** the OppositionFilterBar component is rendered
**When** the component mounts (server-rendered with initial data)
**Then** it displays two filter controls: Opponent Team and Manager
**And** the Opponent Team dropdown is populated by `getOppositionTeams()` which returns teams from recent and upcoming fixtures via `/api/statsbomb/matches` filtered to the current team's schedule
**And** opponent teams are grouped into two sections: "Upcoming Fixtures" (future matches) and "Recent Opponents" (past matches, most recent first)
**And** the Opponent Team dropdown defaults to the next upcoming opponent, or the most recent opponent if no upcoming fixtures exist
**And** the Manager dropdown is populated by `getManagers()` via `/api/statsbomb/teams` and shows managers who have managed the selected opponent team
**And** the Manager dropdown defaults to "All Managers" (no filter) and includes an option for each manager with their tenure dates
**And** when a manager is selected, all downstream data is filtered to matches played under that manager only (handles mid-season manager changes)
**And** when either dropdown value changes, all downstream components re-fetch their data client-side with the new parameters
**And** both dropdowns use the FilterSelect component from Story 7.3 with search capability

### AC 3: OppositionStatsBar displays summary performance metrics

**Given** an opponent team is selected in the OppositionFilterBar
**When** the OppositionStatsBar component receives data from `getTeamStats()` via `/api/statsbomb/league-team-season-averages`
**Then** it displays a horizontal bar of summary statistics containing exactly these 6 metrics:
  - **Recent Form**: displayed as a sequence of W/D/L badges (last 5 matches) with green (W), amber (D), red (L) backgrounds
  - **xG For**: average expected goals per match, formatted to 2 decimal places
  - **xG Against**: average expected goals conceded per match, formatted to 2 decimal places
  - **Goals For**: average goals scored per match, formatted to 1 decimal place
  - **Goals Against**: average goals conceded per match, formatted to 1 decimal place
  - **Possession %**: average possession percentage, formatted to 1 decimal place with "%" suffix
  - **PPDA**: Passes Per Defensive Action, formatted to 1 decimal place
**And** each metric is displayed with a label above and the value below
**And** the stats bar spans the full width of the dashboard content area
**And** when the manager filter is applied, metrics recalculate based only on matches under that manager

### AC 4: OppositionSummaryCard displays opponent identity and recent results

**Given** an opponent team is selected
**When** the OppositionSummaryCard component receives data from `getRecentMatches()` via `/api/statsbomb/matches`
**Then** it displays a card containing:
  - **Team name**: the opponent's full team name displayed as a heading
  - **Team logo/crest**: the opponent's crest image (fetched from team data, or a placeholder shield icon if unavailable)
  - **League position**: current league standing (e.g., "12th in Serie A") fetched from `/api/statsbomb/league-team-season-averages`
  - **Recent results streak**: the last 5 match results displayed as a compact list, each showing: opponent name, score, and W/D/L indicator
**And** the card uses the project's Card component styling (rounded-xl border shadow-sm)
**And** the recent results streak updates when the manager filter changes

### AC 5: StrengthsWeaknesses displays auto-generated tactical analysis

**Given** an opponent team is selected and team stats plus league averages are loaded
**When** the StrengthsWeaknesses component renders
**Then** it displays two sections side by side on desktop (stacked on mobile): "Strengths" and "Weaknesses"
**And** strengths are auto-generated by identifying metrics where the opponent performs **above** the league average by more than 1 standard deviation, from the following metric pool:
  - Possession %
  - PPDA (pressing intensity)
  - xG per match
  - xG against per match (inverted: low is strong)
  - Set-piece goals scored
  - Aerial duel win %
  - Pass completion %
  - Counter-attack frequency
  - Clean sheet %
**And** weaknesses are auto-generated by identifying metrics where the opponent performs **below** the league average by more than 1 standard deviation (or above for inverted metrics like xG against)
**And** each strength/weakness is displayed as a text bullet point with the metric name, the opponent's value, and the league average for context (e.g., "Possession: 58.2% (league avg: 50.0%)")
**And** strengths are prefixed with a green indicator and weaknesses with a red indicator
**And** if fewer than 2 strengths or weaknesses are identified, the threshold is relaxed to 0.5 standard deviations and a note is displayed: "No extreme outliers found -- showing moderate differences"
**And** a maximum of 5 strengths and 5 weaknesses are displayed, ordered by magnitude of deviation

### AC 6: StyleOfPlayRadar displays normalized style metrics as a radar chart

**Given** an opponent team is selected and style-of-play data is loaded from `getStyleOfPlayRadar()` via `/api/statsbomb/league-team-season-averages`
**When** the StyleOfPlayRadar component renders
**Then** it displays a Recharts `RadarChart` inside a `ResponsiveContainer` (minimum height 350px)
**And** the radar has exactly 6 axes representing:
  - **Possession %**: from team's average possession per match
  - **Pressing Intensity**: derived from PPDA (inverted: lower PPDA = higher pressing intensity)
  - **Pace of Play**: derived from passes per minute or sequence speed
  - **Directness**: ratio of forward passes to total passes, or long balls per match
  - **Width of Play**: proportion of play in wide areas vs central areas
  - **Defensive Line Height**: average position of the defensive line (higher = more aggressive)
**And** each axis value is normalized to a league percentile (0-100 scale) using the formula: `percentile = ((teamValue - leagueMin) / (leagueMax - leagueMin)) * 100`, clamped to [0, 100]
**And** for inverted metrics (PPDA for pressing intensity), the normalization is reversed: lower raw values produce higher percentile scores
**And** the filled radar area uses the opponent team's primary color (or a default `#e74c3c` red) with 25% opacity
**And** the radar outline uses the opponent team's primary color at full opacity with 2px stroke width
**And** `PolarGrid` renders concentric rings at 20, 40, 60, 80, 100 percentile marks
**And** `PolarAngleAxis` labels are positioned outside the radar with `text-xs` font size and readable orientation
**And** a `Tooltip` displays the exact percentile value and raw metric value on hover for each axis
**And** a legend or note explains: "Values shown as league percentiles (100 = best in league)"

### AC 7: PhaseOfPlayRatings displays strength ratings for each phase of play

**Given** an opponent team is selected and team stats plus league averages are loaded from `getTeamStats()`
**When** the PhaseOfPlayRatings component renders
**Then** it displays exactly 3 phase-of-play sections: **Build-up**, **Transition**, and **Set-piece**
**And** each phase is rated as one of three levels based on comparison to league averages:
  - **Strong** (green): phase composite score is more than 0.5 standard deviations above the league mean
  - **Average** (amber): phase composite score is within 0.5 standard deviations of the league mean
  - **Weak** (red): phase composite score is more than 0.5 standard deviations below the league mean
**And** the composite score for each phase is calculated as:
  - **Build-up**: weighted average of possession %, pass completion %, progressive passes per match, and PPDA
  - **Transition**: weighted average of counter-attack frequency, fast break success %, transition speed, and high press recovery rate
  - **Set-piece**: weighted average of set-piece goals scored per match, set-piece goals conceded per match (inverted), corner conversion rate, and free-kick threat rating
**And** each phase section displays:
  - Phase name as a heading
  - A horizontal progress bar or gauge filled proportionally to the composite score (0-100% of max)
  - The rating label ("Strong", "Average", or "Weak") with corresponding color badge
  - 2-3 key contributing metrics shown as sub-text (e.g., "Pass completion: 87.3%, Progressive passes: 12.1/match")
**And** the three phases are arranged horizontally on desktop (3-column grid) and stacked vertically on mobile

### AC 8: UnavailablePlayers displays suspended and injured opponent players

**Given** an opponent team is selected and unavailability data is loaded from `getUnavailablePlayers()` via custom opposition analysis SQL queries
**When** the UnavailablePlayers component renders
**Then** it displays a list of players who are currently unavailable for the opponent team
**And** each player entry shows:
  - **Player name**: full name
  - **Position**: abbreviated position (GK, DEF, MID, FWD)
  - **Reason**: either "Suspended" (with a red card icon) or "Injured" (with a medical cross icon)
  - **Expected return**: estimated return date or "Unknown" if not available, formatted as a relative date (e.g., "~2 weeks") or absolute date
**And** the list is sorted with suspended players first, then injured players, each group sorted alphabetically by name
**And** a count badge in the section header shows the total number of unavailable players (e.g., "Unavailable Players (4)")
**And** if no players are unavailable, the component displays: "No known unavailable players" with a green checkmark icon
**And** the component uses a compact list layout with alternating row backgrounds for readability

### AC 9: FormationUsageCard displays formation frequency data

**Given** an opponent team is selected and formation data is loaded from `getFormationUsage()` via `/api/statsbomb/matches`
**When** the FormationUsageCard component renders
**Then** it displays a card showing which formations the opponent has used this season and how frequently
**And** formation data is extracted from match-level formation fields, aggregated by frequency
**And** the card displays formations as a horizontal bar chart (Recharts `BarChart`) where:
  - The Y-axis lists formation names (e.g., "4-3-3", "4-4-2", "3-5-2")
  - The X-axis shows usage percentage (0% to 100%)
  - Each bar is labeled with both the percentage and the absolute match count (e.g., "60% (18 matches)")
  - Bars are sorted by frequency in descending order (most used formation at the top)
  - The most-used formation's bar uses the accent color; remaining formations use a muted color
**And** a heading displays "Formation Usage" with a sub-heading showing total matches analyzed (e.g., "Based on 30 matches this season")
**And** when the manager filter is applied, formation data recalculates to show only formations used under that manager
**And** the chart uses `ResponsiveContainer` with minimum height 200px
**And** a `Tooltip` on hover shows the formation name, percentage, and match count
**And** if only one formation is used, the chart still renders with a single bar and a note: "Single formation used across all matches"

### AC 10: All components handle loading, empty, and error states

**Given** any of the 8 components is waiting for data, receives empty data, or encounters a fetch error
**When** the component renders

**Then** during initial server render: data is pre-fetched so no loading state is needed for the default opponent
**And** during client-side re-fetch (after filter change): skeleton placeholders matching the component's layout are shown (using shadcn/ui `Skeleton`)
**And** when data is empty: a centered "No data available for the selected opponent" message is shown with a muted icon
**And** on error: a centered error message is shown with a "Retry" button that re-triggers the client-side data fetch
**And** error states do NOT crash the entire dashboard -- each component handles its own errors independently via error boundaries or try/catch

### AC 11: Dashboard layout is responsive across breakpoints

**Given** the Opposition Analysis dashboard is viewed on different screen sizes
**When** the viewport changes
**Then** on mobile (<768px): all sections stack vertically in a single column
**And** on tablet (768px-1024px): sections use a 2-column grid where appropriate (StrengthsWeaknesses two columns, PhaseOfPlayRatings stacks)
**And** on desktop (>1024px): the full layout renders with OppositionStatsBar spanning full width, OppositionSummaryCard and StyleOfPlayRadar side by side, StrengthsWeaknesses in two columns, PhaseOfPlayRatings in a 3-column row, and FormationUsageCard and UnavailablePlayers side by side
**And** all Recharts components use `ResponsiveContainer` with `width="100%"` to fill their parent
**And** no horizontal scrolling occurs at any breakpoint

### AC 12: Server-rendered data flow with client hydration

**Given** the Opposition Analysis page uses server-side rendering
**When** a user first navigates to the page
**Then** the server executes the following data-fetching functions before rendering:
  - `getOppositionTeams()` -- returns opponent teams from recent/upcoming fixtures
  - `getManagers()` -- returns managers for the default opponent
  - `getRecentMatches()` -- returns the default opponent's recent results
  - `getTeamStats()` -- returns aggregated stats with form splits for the default opponent
  - `getStyleOfPlayRadar()` -- returns radar metrics normalized to league percentiles
  - `getUnavailablePlayers()` -- returns suspension and injury data
  - `getFormationUsage()` -- returns formation frequency data
**And** the server passes this data as props to the page component
**And** the page renders with real data on the first paint (no loading spinners on initial load)
**And** client components (`"use client"`) hydrate and attach event handlers for the filter dropdowns
**And** when the user changes the opponent or manager filter, client-side `fetch()` calls update only the affected data without a full page reload
**And** the URL does NOT change when filters are adjusted (filter state is local, not URL-synced)

### AC 13: TypeScript types pass and lint is clean

**Given** all files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all component props are explicitly typed with TypeScript interfaces (no `any` types)
**And** all server-side data-fetching functions have explicit return types
**And** all API response shapes are typed with dedicated interfaces

---

## API Routes Reference

Data is fetched server-side on initial load and client-side on filter changes. All routes are `GET` handlers created in Story 8.1 or custom opposition analysis queries.

| Data Need | API Route / Query | Required Params | Used By Components |
|-----------|-------------------|-----------------|-------------------|
| Opponent teams from fixtures | `/api/statsbomb/matches` (filtered to current team) | `team_id`, `season_id` | OppositionFilterBar |
| Team metadata and managers | `/api/statsbomb/teams` | `team_id` | OppositionFilterBar, OppositionSummaryCard |
| Season list | `/api/statsbomb/seasons` | -- | OppositionFilterBar |
| Opponent's recent match results | `/api/statsbomb/matches` | `team_id`, `season_id` | OppositionSummaryCard, OppositionStatsBar |
| Aggregated team stats (form splits) | `/api/statsbomb/league-team-season-averages` | `team_id`, `season_id` | OppositionStatsBar, StrengthsWeaknesses, PhaseOfPlayRatings |
| League-wide averages (normalization) | `/api/statsbomb/league-team-season-averages` | `season_id` (all teams) | StyleOfPlayRadar, StrengthsWeaknesses, PhaseOfPlayRatings |
| Player unavailability (injuries/suspensions) | Custom SQL query on opposition analysis tables | `team_id` | UnavailablePlayers |
| Formation usage per match | `/api/statsbomb/matches` (formation field) | `team_id`, `season_id` | FormationUsageCard |

---

## Data Flow Diagram

```
Server (page.tsx -- async server component)
  |
  | Parallel server-side fetches (before render):
  |-- getOppositionTeams()  --> /api/statsbomb/matches (current team fixtures)
  |-- getManagers()         --> /api/statsbomb/teams
  |-- getRecentMatches()    --> /api/statsbomb/matches (opponent matches)
  |-- getTeamStats()        --> /api/statsbomb/league-team-season-averages
  |-- getStyleOfPlayRadar() --> /api/statsbomb/league-team-season-averages (all teams for normalization)
  |-- getUnavailablePlayers() --> Custom opposition SQL query
  |-- getFormationUsage()   --> /api/statsbomb/matches (formation fields)
  |
  v  Server renders full HTML with data
  |
  v  Client hydrates interactive components
  |
OppositionFilterBar ("use client")
  |
  |  (user changes opponent or manager)
  |
  v  Client-side fetch() calls to update data
  |
  +---> getRecentMatches()    --> OppositionSummaryCard
  +---> getTeamStats()        --> OppositionStatsBar
  |                               StrengthsWeaknesses
  |                               PhaseOfPlayRatings
  +---> getStyleOfPlayRadar() --> StyleOfPlayRadar
  +---> getUnavailablePlayers()--> UnavailablePlayers
  +---> getFormationUsage()   --> FormationUsageCard
  +---> getManagers()         --> OppositionFilterBar (manager list refresh)
```

---

## Tasks / Subtasks

- [ ] **Task 1: Create the page route, server data fetching, and layout** (AC: #1, #11, #12)
  - [ ] 1.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/page.tsx` as an **async server component** (NOT `"use client"`)
  - [ ] 1.2: Implement 7 server-side data-fetching functions (`getOppositionTeams`, `getManagers`, `getRecentMatches`, `getTeamStats`, `getStyleOfPlayRadar`, `getUnavailablePlayers`, `getFormationUsage`) that call the StatsBomb API routes using `fetch()` with the server's base URL
  - [ ] 1.3: Call all 7 functions in parallel using `Promise.all()` for optimal server-side performance
  - [ ] 1.4: Pass fetched data as props to the client-rendered `OppositionAnalysisDashboard` wrapper component
  - [ ] 1.5: Register the dashboard in the gallery data (slug: `"opposition-analysis"`, title: `"Opposition Analysis"`, category: `"Advanced Analytics"`)
  - [ ] 1.6: Implement the top-level responsive layout grid:
    - Full width: OppositionFilterBar
    - Full width: OppositionStatsBar
    - 2-column (desktop): OppositionSummaryCard (left) + StyleOfPlayRadar (right)
    - 2-column (desktop): StrengthsWeaknesses (full width, internally 2-col)
    - 3-column (desktop): PhaseOfPlayRatings
    - 2-column (desktop): FormationUsageCard (left) + UnavailablePlayers (right)

- [ ] **Task 2: Create shared types and client-side data-fetching utilities** (AC: #2, #10, #12, #13)
  - [ ] 2.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_lib/types.ts` with TypeScript interfaces:
    ```typescript
    interface OppositionTeam {
      team_id: string;
      team_name: string;
      fixture_date: string;
      fixture_type: "upcoming" | "recent";
      competition: string;
    }

    interface Manager {
      manager_id: string;
      manager_name: string;
      tenure_start: string;
      tenure_end: string | null;
    }

    interface OppositionStats {
      recent_form: Array<{ result: "W" | "D" | "L"; opponent: string; score: string }>;
      xg_for: number;
      xg_against: number;
      goals_for: number;
      goals_against: number;
      possession_pct: number;
      ppda: number;
    }

    interface StyleOfPlayMetric {
      metric: string;
      raw_value: number;
      percentile: number;
    }

    interface PhaseRating {
      phase: "build-up" | "transition" | "set-piece";
      composite_score: number;
      rating: "Strong" | "Average" | "Weak";
      contributing_metrics: Array<{ name: string; value: number; league_avg: number }>;
    }

    interface UnavailablePlayer {
      player_name: string;
      position: "GK" | "DEF" | "MID" | "FWD";
      reason: "suspended" | "injured";
      expected_return: string | null;
    }

    interface FormationUsage {
      formation: string;
      match_count: number;
      percentage: number;
    }

    interface StrengthWeakness {
      metric_name: string;
      team_value: number;
      league_avg: number;
      std_dev: number;
      deviation: number;
      type: "strength" | "weakness";
    }
    ```
  - [ ] 2.2: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_lib/fetch-opposition-data.ts` with client-side fetch wrapper functions that mirror the server-side fetchers but use relative API URLs
  - [ ] 2.3: Each client-side fetch function accepts `opponentTeamId` and optional `managerId` parameters
  - [ ] 2.4: Functions return typed results and handle errors by throwing with descriptive messages

- [ ] **Task 3: Implement OppositionFilterBar** (AC: #2)
  - [ ] 3.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-filter-bar.tsx` as a `"use client"` component
  - [ ] 3.2: Accept initial `teams` and `managers` data as props (server-rendered)
  - [ ] 3.3: Render Opponent Team dropdown using FilterSelect (Story 7.3) with grouped options: "Upcoming Fixtures" and "Recent Opponents"
  - [ ] 3.4: Render Manager dropdown using FilterSelect with "All Managers" as default option and tenure dates in labels
  - [ ] 3.5: Wire `onChange` callbacks to emit selected `opponentTeamId` and `managerId` to parent via callback props
  - [ ] 3.6: When opponent team changes, refresh the manager list via client-side fetch
  - [ ] 3.7: Type the component props:
    ```typescript
    interface OppositionFilterBarProps {
      initialTeams: OppositionTeam[];
      initialManagers: Manager[];
      defaultOpponentId: string;
      onOpponentChange: (teamId: string) => void;
      onManagerChange: (managerId: string | null) => void;
    }
    ```

- [ ] **Task 4: Implement OppositionStatsBar** (AC: #3)
  - [ ] 4.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-stats-bar.tsx` as a `"use client"` component
  - [ ] 4.2: Accept initial `stats` as props; re-fetch client-side when filters change
  - [ ] 4.3: Render a horizontal bar with 7 metrics: Recent Form (W/D/L badges), xG For, xG Against, Goals For, Goals Against, Possession %, PPDA
  - [ ] 4.4: Format numbers correctly: xG to 2dp, goals/possession/PPDA to 1dp
  - [ ] 4.5: Render W/D/L badges using colored circles: green (`bg-green-600`), amber (`bg-amber-500`), red (`bg-red-600`)
  - [ ] 4.6: Use a responsive flex/grid layout that wraps metrics to multiple rows on smaller screens

- [ ] **Task 5: Implement OppositionSummaryCard** (AC: #4)
  - [ ] 5.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-summary-card.tsx`
  - [ ] 5.2: Display team name, logo (with fallback shield icon), league position, and last 5 results
  - [ ] 5.3: Format league position as ordinal (e.g., "12th in Serie A")
  - [ ] 5.4: Render recent results as compact rows: opponent name, score, W/D/L badge
  - [ ] 5.5: Use the project's Card component with `rounded-xl border shadow-sm`

- [ ] **Task 6: Implement StrengthsWeaknesses** (AC: #5)
  - [ ] 6.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/strengths-weaknesses.tsx`
  - [ ] 6.2: Implement auto-generation logic:
    - Fetch team stats and league averages (mean + standard deviation for each metric)
    - For each metric in the pool, calculate deviation: `(teamValue - leagueMean) / leagueStdDev`
    - Classify as strength if deviation > 1.0, weakness if deviation < -1.0 (or reversed for inverted metrics)
    - If fewer than 2 in either category, relax threshold to 0.5 and add explanatory note
  - [ ] 6.3: Display two side-by-side sections (stacked on mobile): "Strengths" (left, green accent) and "Weaknesses" (right, red accent)
  - [ ] 6.4: Each item displays: green/red dot indicator, metric name, team value, league average in parentheses
  - [ ] 6.5: Limit to 5 items per section, sorted by absolute deviation magnitude (descending)

- [ ] **Task 7: Implement StyleOfPlayRadar** (AC: #6)
  - [ ] 7.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/style-of-play-radar.tsx` as a `"use client"` component
  - [ ] 7.2: Implement league percentile normalization for all 6 axes:
    - Standard: `percentile = ((teamValue - leagueMin) / (leagueMax - leagueMin)) * 100`
    - Inverted (PPDA for pressing): `percentile = ((leagueMax - teamValue) / (leagueMax - leagueMin)) * 100`
    - Clamp all values to [0, 100]
  - [ ] 7.3: Render `ResponsiveContainer > RadarChart` with 6 `PolarAngleAxis` labels
  - [ ] 7.4: Use `PolarGrid` with gridlines at 20, 40, 60, 80, 100
  - [ ] 7.5: Use `PolarRadiusAxis` with domain `[0, 100]`, hide tick labels
  - [ ] 7.6: Render `Radar` with opponent color fill at 25% opacity, 2px stroke
  - [ ] 7.7: Add `Tooltip` showing percentile and raw value for each axis
  - [ ] 7.8: Add footnote text: "Values shown as league percentiles (100 = best in league)"

- [ ] **Task 8: Implement PhaseOfPlayRatings** (AC: #7)
  - [ ] 8.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/phase-of-play-ratings.tsx`
  - [ ] 8.2: Implement composite score calculation for each phase:
    - **Build-up**: `0.3 * possessionPct + 0.25 * passCompletionPct + 0.25 * progressivePassesPM + 0.2 * ppdaScore` (all normalized 0-100)
    - **Transition**: `0.3 * counterAttackFreq + 0.25 * fastBreakSuccess + 0.25 * transitionSpeed + 0.2 * highPressRecovery` (all normalized 0-100)
    - **Set-piece**: `0.3 * setPieceGoalsScored + 0.3 * setPieceGoalsConcededInv + 0.2 * cornerConversion + 0.2 * freeKickThreat` (all normalized 0-100)
  - [ ] 8.3: Determine rating by comparing composite score to league mean:
    - Strong: `compositeScore > leagueMean + 0.5 * leagueStdDev`
    - Weak: `compositeScore < leagueMean - 0.5 * leagueStdDev`
    - Average: otherwise
  - [ ] 8.4: Render 3-column grid (stacked on mobile) with each phase showing:
    - Phase name heading
    - Horizontal progress bar filled to composite score percentage, colored by rating (green/amber/red)
    - Rating badge ("Strong"/"Average"/"Weak") with matching color
    - 2-3 contributing metric values as sub-text
  - [ ] 8.5: Use Tailwind color classes: Strong = `bg-green-600`, Average = `bg-amber-500`, Weak = `bg-red-600`

- [ ] **Task 9: Implement UnavailablePlayers** (AC: #8)
  - [ ] 9.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/unavailable-players.tsx`
  - [ ] 9.2: Render a sorted list: suspended players first (red card icon), then injured (medical cross icon)
  - [ ] 9.3: Each row: player name, position abbreviation, reason icon + label, expected return date
  - [ ] 9.4: Format expected return as relative date (e.g., "~2 weeks") or "Unknown"
  - [ ] 9.5: Show count badge in header: "Unavailable Players (N)"
  - [ ] 9.6: Empty state: "No known unavailable players" with green checkmark
  - [ ] 9.7: Apply alternating row backgrounds for readability

- [ ] **Task 10: Implement FormationUsageCard** (AC: #9)
  - [ ] 10.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/formation-usage-card.tsx` as a `"use client"` component
  - [ ] 10.2: Aggregate formation data from match records, calculate percentage per formation
  - [ ] 10.3: Render Recharts horizontal `BarChart` (`layout="vertical"`):
    - `YAxis` with formation names (dataKey="formation", type="category")
    - `XAxis` with percentage scale (0-100, type="number")
    - Bars sorted descending by frequency
    - Most-used formation bar in accent color, others in muted color
    - Labels showing "percentage (N matches)"
  - [ ] 10.4: Use `ResponsiveContainer` with minimum height 200px
  - [ ] 10.5: Add `Tooltip` with formation name, percentage, and match count
  - [ ] 10.6: Header: "Formation Usage" with sub-heading "Based on N matches this season"
  - [ ] 10.7: Handle single-formation edge case with note text

- [ ] **Task 11: Implement the client-side dashboard wrapper** (AC: #1, #10, #11, #12)
  - [ ] 11.1: Create `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-analysis-dashboard.tsx` as a `"use client"` component
  - [ ] 11.2: Accept all server-fetched data as props for initial render
  - [ ] 11.3: Manage local state: `opponentTeamId`, `managerId`, and per-component data states
  - [ ] 11.4: When filters change, call client-side fetch functions and update component data
  - [ ] 11.5: Pass `isLoading` flags to child components during client-side re-fetches
  - [ ] 11.6: Compose all 8 components in the responsive grid layout defined in Task 1.6
  - [ ] 11.7: Wrap each component section in an error boundary to isolate failures

- [ ] **Task 12: Loading, empty, and error states for all components** (AC: #10)
  - [ ] 12.1: Add skeleton loading states to each of the 8 components using shadcn/ui `Skeleton`
  - [ ] 12.2: Skeleton for OppositionStatsBar: 7 rectangular placeholders in a row
  - [ ] 12.3: Skeleton for StyleOfPlayRadar: circular placeholder (aspect-square)
  - [ ] 12.4: Skeleton for FormationUsageCard: 3-4 horizontal bar placeholders
  - [ ] 12.5: Add empty state with "No data available for the selected opponent" message and muted icon
  - [ ] 12.6: Add error state with message and "Retry" button calling the relevant re-fetch function
  - [ ] 12.7: Error boundaries or try/catch per component to prevent cascading failures

- [ ] **Task 13: TypeScript and lint verification** (AC: #13)
  - [ ] 13.1: Define all component prop interfaces explicitly (no `any` types)
  - [ ] 13.2: Define return types for all 7 server-side data-fetching functions
  - [ ] 13.3: Define response types for all API route response shapes
  - [ ] 13.4: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 13.5: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This story creates the **Opposition Analysis** dashboard -- an advanced analytics dashboard for scouting upcoming opponents. It is the first dashboard in Epic 10 to use **server-side rendering with client hydration**, a pattern chosen to reduce initial load time for this data-heavy page. All data comes from StatsBomb PostgreSQL via Next.js API routes (Story 8.1). No Convex mutations or queries are involved.

```
Browser (initial request)
  |
  v
Next.js Server Component (page.tsx)
  |
  | await Promise.all([
  |   getOppositionTeams(),
  |   getManagers(),
  |   getRecentMatches(),
  |   getTeamStats(),
  |   getStyleOfPlayRadar(),
  |   getUnavailablePlayers(),
  |   getFormationUsage()
  | ])
  |
  v
Server renders HTML with data --> Sent to browser (fast first paint)
  |
  v
Client hydrates "use client" components (filter interactions enabled)
  |
  v
User changes opponent/manager filter --> Client-side fetch() --> Re-render affected components
```

### Component Dependency Graph

```
page.tsx (async server component)
  +-- OppositionAnalysisDashboard ("use client" wrapper)
        +-- OppositionFilterBar ("use client")
        |     +-- FilterSelect (from Story 7.3)
        +-- OppositionStatsBar ("use client")
        +-- OppositionSummaryCard
        +-- StrengthsWeaknesses
        +-- StyleOfPlayRadar ("use client")
        |     +-- RadarChart (Recharts, from Story 7.3)
        +-- PhaseOfPlayRatings
        +-- UnavailablePlayers
        +-- FormationUsageCard ("use client")
              +-- BarChart (Recharts, from Story 7.3)
```

### Source Files (from football-dashboard-2)

- **Page:** `football-dashboard-2/src/app/(dashboard)/dashboards/opposition-analysis/page.tsx`
- **Components:** `football-dashboard-2/src/app/(dashboard)/dashboards/opposition-analysis/` -- 8 component files to port

### Files to Create

1. `apps/admin/src/app/(app)/dashboards/opposition-analysis/page.tsx` -- async server component (page)
2. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_lib/types.ts` -- shared TypeScript interfaces
3. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_lib/fetch-opposition-data.ts` -- client-side fetch utilities
4. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-analysis-dashboard.tsx` -- client wrapper
5. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-filter-bar.tsx`
6. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-stats-bar.tsx`
7. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/opposition-summary-card.tsx`
8. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/strengths-weaknesses.tsx`
9. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/style-of-play-radar.tsx`
10. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/phase-of-play-ratings.tsx`
11. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/unavailable-players.tsx`
12. `apps/admin/src/app/(app)/dashboards/opposition-analysis/_components/formation-usage-card.tsx`

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement for data fetching
- Anything under `apps/web/` -- dashboard pages go in `apps/admin/`
- API routes from Story 8.1 -- consumed as-is, not modified
- Shared chart components from Story 7.3 -- imported and used, not changed

### Key Decisions

1. **Server-side rendering with client hydration** -- Unlike the Epic 9 dashboards which are fully client-rendered, this dashboard uses an async server component for the page. The server pre-fetches all data for the default opponent, resulting in a fast first paint with no loading spinners. Client components hydrate for interactive filter changes. This pattern was chosen because the opposition analysis page is frequently loaded before matches when time is critical.

2. **Collocated components** -- All 8 components and supporting utilities live under the `opposition-analysis/` directory in `_components/` and `_lib/` subdirectories. These are dashboard-specific and not reused elsewhere.

3. **Strengths/weaknesses auto-generation** -- The StrengthsWeaknesses component uses statistical analysis (standard deviation comparison) rather than hardcoded thresholds. This means the strengths and weaknesses automatically adapt as league norms shift across seasons. The 1-standard-deviation default threshold with 0.5 fallback ensures useful output even for teams close to the average.

4. **Radar percentile normalization** -- The StyleOfPlayRadar normalizes all metrics to league percentiles (0-100). This makes different metrics (with different units and scales) visually comparable on the same radar chart. Inverted metrics (like PPDA, where lower is more aggressive) are explicitly handled in the normalization formula.

5. **Phase composite scores** -- PhaseOfPlayRatings uses weighted averages of contributing metrics to produce a single composite score per phase. Weights are intentionally opinionated (specified in Task 8.2) to prioritize the most impactful metrics per phase. All contributing metrics are normalized to 0-100 before weighting.

6. **Manager filter for mid-season changes** -- The Manager filter handles the common Serie A scenario where a team changes managers mid-season. When a manager is selected, all data is recalculated using only matches played under that manager. This prevents mixing tactical profiles from different coaching regimes.

### Recharts Components Used

| Recharts Import | Used In |
|----------------|---------|
| `ResponsiveContainer` | StyleOfPlayRadar, FormationUsageCard |
| `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` | StyleOfPlayRadar |
| `BarChart`, `Bar`, `XAxis`, `YAxis` | FormationUsageCard |
| `Tooltip` | StyleOfPlayRadar, FormationUsageCard |
| `Cell` | FormationUsageCard (bar coloring) |

### Color Reference

| Element | Color | Usage |
|---------|-------|-------|
| Opponent team color | Dynamic or `#e74c3c` default | Radar fill, accents |
| Radar fill | Opponent color at 25% opacity | StyleOfPlayRadar area |
| Radar stroke | Opponent color at 100% | StyleOfPlayRadar outline |
| Win badge | `bg-green-600 text-white` | OppositionStatsBar, OppositionSummaryCard |
| Draw badge | `bg-amber-500 text-white` | OppositionStatsBar, OppositionSummaryCard |
| Loss badge | `bg-red-600 text-white` | OppositionStatsBar, OppositionSummaryCard |
| Strong rating | `bg-green-600` | PhaseOfPlayRatings bar and badge |
| Average rating | `bg-amber-500` | PhaseOfPlayRatings bar and badge |
| Weak rating | `bg-red-600` | PhaseOfPlayRatings bar and badge |
| Strength indicator | green dot | StrengthsWeaknesses |
| Weakness indicator | red dot | StrengthsWeaknesses |
| Most-used formation | Accent color | FormationUsageCard primary bar |
| Other formations | Muted color | FormationUsageCard secondary bars |
| Suspended icon | red | UnavailablePlayers |
| Injured icon | amber/orange | UnavailablePlayers |

### Testing Approach

- **Manual testing:** Load the dashboard with different opponent selections and verify all 8 components render correctly with real data
- **Server rendering:** Verify the initial page load shows data immediately (no loading spinners) by checking the page source HTML
- **Filter interaction:** Change opponent team and manager dropdowns, verify all components re-fetch and update without full page reload
- **Manager filter:** Select a manager who took over mid-season, verify stats only include matches under that manager
- **Radar chart:** Verify all 6 axes render, percentiles are in [0, 100] range, and tooltip shows both percentile and raw value
- **Phase ratings:** Verify Strong/Average/Weak classifications are consistent with the underlying data when manually cross-checked
- **Strengths/weaknesses:** Verify the auto-generation correctly identifies metrics above/below 1 standard deviation
- **Formation usage:** Verify bar chart sums to 100% (within rounding), matches count matches total
- **Unavailable players:** Test with a team that has both suspended and injured players, and with a team that has none
- **Responsive:** Resize browser through mobile/tablet/desktop breakpoints and verify layout adapts correctly
- **Empty state:** Select a team with minimal data and verify graceful handling
- **Error state:** Disconnect network after initial load, change filters, and verify error states with retry buttons appear
- **No automated tests required in this story** -- visual dashboard components are validated through manual QA

### Dependencies

- **Depends on:**
  - Story 9.1 (Dashboard gallery, routing, `[slug]` dynamic page shell)
  - Story 8.1 (StatsBomb API routes -- all endpoints this dashboard consumes)
  - Story 7.1 (Design tokens -- colors, typography, spacing)
  - Story 7.3 (Recharts integration, FilterSelect, FilterBar components)
- **Blocks:** Nothing directly -- this is a leaf dashboard page
- **Parallel with:** Story 10.1, 10.2, 10.3, 10.5, 10.6 -- all Epic 10 dashboards can be developed in parallel once dependencies are met
- **External dependency:** StatsBomb PostgreSQL database must be accessible and populated with Serie A data including team stats, match data, and league averages
