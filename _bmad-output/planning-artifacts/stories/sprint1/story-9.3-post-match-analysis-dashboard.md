# Story 9.3: Post-Match Analysis Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 13

> **PROJECT SCOPE:** All components target `apps/admin/src/app/(admin)/dashboards/post-match/`. Reusable sub-components go in `apps/admin/src/components/dashboards/post-match/`. Data is fetched from StatsBomb API routes created in Story 8.1 -- no direct database access, no Convex involvement. Charts use Recharts components from Story 7.3. Design tokens from Story 7.1.

## Story

As a club analyst or coach,
I want a Post-Match Analysis dashboard that presents comprehensive match data including comparative stats, momentum graphs, xG progression, win probability, lineups, substitutions, and possession breakdowns,
so that I can evaluate team and player performance immediately after a match and identify tactical patterns.

## Acceptance Criteria

### AC 1: Dashboard page is routable via slug "post-match"

**Given** the dashboard gallery (Story 9.1) is implemented with dynamic routing to `/dashboards/[slug]`
**When** a user navigates to `/dashboards/post-match`
**Then** the Post-Match Analysis dashboard page renders
**And** the page title displays "Post-Match Analysis"
**And** the page is registered in the dashboard gallery with title, description, category ("Match Analysis"), and an appropriate icon

### AC 2: MatchFilterBar provides team, season, and match selection with fuzzy search

**Given** the MatchFilterBar component is mounted
**When** the component renders
**Then** it displays three filter dropdowns: Team, Season, and Match
**And** the Team dropdown fetches options from `/api/statsbomb/teams` and defaults to the club's team (UC Sampdoria)
**And** the Season dropdown fetches options from `/api/statsbomb/seasons` and updates when Team changes
**And** the Match dropdown fetches options from `/api/statsbomb/matches?team_id={id}&season_id={id}` when both Team and Season are selected
**And** the Match dropdown supports fuzzy text search (case-insensitive substring match on opponent name, date, and score)
**And** match options display in format: "{home_team} {home_score} - {away_score} {away_team} ({date})"
**And** selecting a match triggers data loading for all downstream components
**And** the filter bar uses the FilterBar container and FilterSelect components from Story 7.3

### AC 3: MatchStats displays comparative statistics side-by-side

**Given** a match is selected in the MatchFilterBar
**When** the MatchStats component receives data from `/api/statsbomb/match-stats?match_id={id}`
**Then** it displays a two-column comparative layout with home team on the left and away team on the right
**And** the following 10 metrics are displayed, each as a labeled row with values on both sides:
  - Goals
  - Expected Goals (xG) -- formatted to 2 decimal places
  - Shots
  - Shots on Target
  - Possession % -- displayed with a proportional bar between the two values
  - PPDA (Passes Per Defensive Action) -- formatted to 1 decimal place
  - Corners
  - Fouls
  - Offsides
  - Passes
**And** the higher value in each row is visually emphasized (bold or accent color)
**And** team names and crests/badges are displayed in the column headers
**And** the component displays a loading skeleton while data is being fetched

### AC 4: MomentumGraph renders possession percentage over match timeline

**Given** a match is selected and possession data is loaded from `/api/statsbomb/possessions?match_id={id}`
**When** the MomentumGraph component renders
**Then** it displays a Recharts `LineChart` inside a `ResponsiveContainer` (minimum height 300px)
**And** the X-axis represents match minutes (0 to 90+, extended for extra time if applicable)
**And** the Y-axis represents possession percentage (0% to 100%)
**And** two lines are plotted -- one for each team -- using distinct colors (home: project primary color, away: secondary/gray)
**And** a `CartesianGrid` is rendered with subtle stroke styling
**And** a vertical `ReferenceLine` marks halftime (minute 45)
**And** a `Tooltip` displays the exact possession % for both teams at the hovered minute
**And** a `Legend` identifies both team lines by name and color
**And** the GraphInfoBadge component can be attached to explain the chart's methodology

### AC 5: XgRaceChart displays cumulative xG progression

**Given** a match is selected and match stats data is available
**When** the XgRaceChart component renders
**Then** it displays a Recharts `LineChart` showing cumulative xG for both teams over match duration
**And** the X-axis represents match minutes (0 to 90+)
**And** the Y-axis represents cumulative xG (starting at 0, auto-scaled)
**And** each shot event creates a step increase in the cumulative line for the shooting team
**And** goal events are marked with a distinct marker (filled circle or EventIcons goal icon) on the line
**And** two lines are plotted -- one per team -- with distinct colors matching the MomentumGraph color scheme
**And** a `Tooltip` shows both teams' cumulative xG values and any event at the hovered minute
**And** a `Legend` identifies both team lines
**And** the chart handles matches with extra time by extending the X-axis domain accordingly

### AC 6: WinProbabilityBar displays final win probability as a horizontal stacked bar

**Given** a match is selected and data is loaded from `/api/statsbomb/win-probabilities?match_id={id}`
**When** the WinProbabilityBar component renders
**Then** it displays a single horizontal stacked bar chart showing three segments: Home Win, Draw, Away Win
**And** each segment is sized proportionally to its probability percentage
**And** each segment displays its percentage value as a label (e.g., "62%")
**And** the segments use distinct colors: Home Win (green/primary), Draw (neutral/gray), Away Win (red/accent)
**And** team names are displayed at the ends of the bar (home left, away right)
**And** the component handles edge cases where one probability is 0% (segment is hidden, not rendered as a sliver)

### AC 7: LineupTable displays starting XI with match stats

**Given** a match is selected and lineup data is loaded from `/api/statsbomb/lineups-processed?match_id={id}`
**When** the LineupTable component renders
**Then** it displays two tables (one per team) showing the starting XI (11 players each)
**And** each row contains: jersey number, player name, position abbreviation, and key match stats (minutes played, goals, assists, yellow cards, red cards)
**And** rows are ordered by position group (GK, DEF, MID, FWD) then by jersey number within each group
**And** position groups are visually separated by subtle row background alternation or dividers
**And** players who were substituted off have their substitution minute displayed (e.g., "Sub 65'")
**And** event icons (yellow card, red card, goal) are rendered inline using the EventIcons component
**And** the table is responsive -- on smaller screens it stacks vertically (home team above away team)

### AC 8: SubstitutesTable displays bench players and substitution timeline

**Given** a match is selected and lineup data is loaded from `/api/statsbomb/lineups-processed?match_id={id}`
**When** the SubstitutesTable component renders
**Then** it displays two tables (one per team) showing substitute players
**And** each row contains: jersey number, player name, position, minute substituted in, minute substituted out (if applicable)
**And** players who entered the match are visually distinguished from unused substitutes (e.g., bold text or highlight)
**And** the substitution minute is formatted as "In: {minute}'" and "Out: {minute}'" if applicable
**And** event icons for goals, cards scored by substitutes are rendered inline using EventIcons
**And** unused substitutes are listed at the bottom with a muted/dimmed visual treatment

### AC 9: PossessionMetricCard displays a single possession phase metric

**Given** possession data is available from `/api/statsbomb/possessions?match_id={id}`
**When** the PossessionMetricCard component is mounted with a phase name, metric label, and metric value
**Then** it renders a compact card with the phase name as a header
**And** the metric value is displayed prominently (large font size)
**And** the metric label is displayed below the value (smaller, muted text)
**And** the card uses the project's Card component styling (rounded-xl border shadow-sm)
**And** the card is clickable -- clicking triggers the deep-dive detail view for that possession phase

### AC 10: PostMatchPossessionDetails displays possession phase breakdown

**Given** a match is selected and possession data is loaded from `/api/statsbomb/possessions?match_id={id}`
**When** the PostMatchPossessionDetails component renders
**Then** it displays a breakdown of possession into three phases: Build-Up, Transition, and Set-Piece
**And** each phase shows: count of possession sequences, average duration, success rate, and key metrics specific to the phase
**And** each phase row is rendered as a PossessionMetricCard or expandable row
**And** clicking a phase row expands an inline detail panel showing per-possession-sequence data for that phase
**And** the detail panel includes a scrollable table of individual possession sequences with: start minute, end minute, duration, outcome, and zone progression
**And** the component handles the case where a phase has zero possessions (displays "No data" with muted styling)

### AC 11: EventIcons renders visual icons for match event types

**Given** the EventIcons component is imported in any dashboard component
**When** it receives an event type string
**Then** it renders the correct icon for the following event types:
  - `"goal"` -- football/soccer ball icon or net icon
  - `"yellow_card"` -- yellow rectangle
  - `"red_card"` -- red rectangle
  - `"substitution"` -- double arrow (in/out) icon
**And** each icon has a consistent size (default 16px, configurable via prop)
**And** icons include an accessible `aria-label` describing the event type
**And** unknown event types render a neutral fallback icon (circle or question mark)
**And** the component supports an optional `minute` prop that appends the minute as text (e.g., goal icon + "23'")

### AC 12: GraphInfoBadge renders tooltip/info badges for chart explanations

**Given** the GraphInfoBadge component is mounted with a label and description
**When** the user hovers over or clicks the info badge icon
**Then** a popover or tooltip displays the description text explaining the chart's data or methodology
**And** the badge renders as a small "i" icon (info circle) positioned relative to its parent chart
**And** the tooltip/popover dismisses on click-outside or mouse-leave
**And** the component uses the project's Tooltip or Popover component from shadcn/ui

### AC 13: All components handle loading, empty, and error states

**Given** any component on the Post-Match dashboard is waiting for data
**When** the API request is in progress
**Then** the component displays a skeleton loader matching its layout dimensions

**Given** any API request returns an empty dataset (`{ data: [] }`)
**When** the component processes the response
**Then** it displays a contextual empty state message (e.g., "No match data available. Select a match to begin.")

**Given** any API request fails with a 4xx or 5xx error
**When** the component processes the error
**Then** it displays an inline error message with a "Retry" button
**And** the error is logged to the browser console with the route path and status code
**And** the error does NOT crash the entire dashboard (error boundary or try/catch per component)

### AC 14: Dashboard layout composes all components in a structured grid

**Given** a match is selected and all data is loaded
**When** the Post-Match Analysis dashboard renders fully
**Then** the layout follows this structure (top to bottom):
  1. **MatchFilterBar** -- full width, pinned at top
  2. **MatchStats** -- full width, comparative stats panel
  3. **Charts row** -- two-column grid: MomentumGraph (left), XgRaceChart (right)
  4. **WinProbabilityBar** -- full width, single horizontal bar
  5. **Lineups section** -- two-column grid: home LineupTable (left), away LineupTable (right)
  6. **Substitutes section** -- two-column grid: home SubstitutesTable (left), away SubstitutesTable (right)
  7. **Possession section** -- PostMatchPossessionDetails (full width) with PossessionMetricCards in a row above it
**And** on viewports below 1024px, two-column sections stack to single column
**And** each section has consistent vertical spacing using the project's spacing tokens
**And** the page is scrollable with no horizontal overflow

### AC 15: TypeScript types pass and lint is clean

**Given** all component files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all components use proper TypeScript interfaces for their props (no `any` types)

---

## API Routes Reference

All data is fetched client-side using the StatsBomb API routes created in Story 8.1. No new API routes are created in this story.

| Data Need | API Route | Required Params | Response Shape |
|-----------|-----------|-----------------|----------------|
| Team list for filter | `/api/statsbomb/teams` | -- | `{ data: [{ team_id, team_name }] }` |
| Season list for filter | `/api/statsbomb/seasons` | `competitionId` | `{ data: [{ season_id, season_name }] }` |
| Match list for filter | `/api/statsbomb/matches` | `competitionId`, `seasonId` | `{ data: [{ match_id, home_team, away_team, home_score, away_score, match_date, ... }] }` |
| Comparative match stats | `/api/statsbomb/match-stats` | `matchId` | `{ data: [{ metric_name, home_value, away_value }] }` |
| Lineups and substitutions | `/api/statsbomb/lineups-processed` | `matchId` | `{ data: [{ player_id, player_name, jersey_number, position, is_starter, minutes_played, sub_in, sub_out, goals, assists, yellow_cards, red_cards, team_id }] }` |
| Possession sequences | `/api/statsbomb/possessions` | `matchId` | `{ data: [{ possession_id, team_id, phase, start_minute, end_minute, duration, outcome, ... }] }` |
| Win probability | `/api/statsbomb/win-probabilities` | `matchId` | `{ data: [{ home_win_prob, draw_prob, away_win_prob }] }` |

---

## Tasks / Subtasks

- [ ] **Task 1: Create the dashboard page and route registration** (AC: #1)
  - [ ] 1.1: Create `apps/admin/src/app/(admin)/dashboards/post-match/page.tsx` exporting the PostMatchDashboard page component
  - [ ] 1.2: Register the dashboard in the gallery data (slug: `"post-match"`, title: `"Post-Match Analysis"`, category: `"Match Analysis"`, description: `"Comprehensive analysis of individual matches with comparative stats, xG progression, lineups, and possession breakdown"`)
  - [ ] 1.3: Create the component directory `apps/admin/src/components/dashboards/post-match/`

- [ ] **Task 2: Implement shared types and data-fetching hooks** (AC: #2, #13)
  - [ ] 2.1: Create `apps/admin/src/components/dashboards/post-match/types.ts` with TypeScript interfaces for all API response shapes (MatchStats, LineupPlayer, PossessionSequence, WinProbability, etc.)
  - [ ] 2.2: Create custom hooks for data fetching with SWR or React Query (or plain fetch + useState):
    - `useTeams()` -- fetches `/api/statsbomb/teams`
    - `useSeasons(competitionId)` -- fetches `/api/statsbomb/seasons`
    - `useMatches(teamId, seasonId)` -- fetches `/api/statsbomb/matches`
    - `useMatchStats(matchId)` -- fetches `/api/statsbomb/match-stats`
    - `useLineups(matchId)` -- fetches `/api/statsbomb/lineups-processed`
    - `usePossessions(matchId)` -- fetches `/api/statsbomb/possessions`
    - `useWinProbabilities(matchId)` -- fetches `/api/statsbomb/win-probabilities`
  - [ ] 2.3: Each hook returns `{ data, isLoading, error, refetch }` with proper TypeScript generics
  - [ ] 2.4: Hooks skip fetching when required params are null/undefined (no match selected yet)

- [ ] **Task 3: Implement EventIcons component** (AC: #11)
  - [ ] 3.1: Create `apps/admin/src/components/dashboards/post-match/EventIcons.tsx`
  - [ ] 3.2: Implement icon rendering for goal, yellow_card, red_card, substitution event types
  - [ ] 3.3: Add configurable `size` prop (default 16px) and optional `minute` prop
  - [ ] 3.4: Add `aria-label` attributes for accessibility
  - [ ] 3.5: Add fallback icon for unknown event types

- [ ] **Task 4: Implement GraphInfoBadge component** (AC: #12)
  - [ ] 4.1: Create `apps/admin/src/components/dashboards/post-match/GraphInfoBadge.tsx`
  - [ ] 4.2: Implement info circle icon that triggers a shadcn/ui Tooltip or Popover with description text
  - [ ] 4.3: Support both hover (tooltip) and click (popover) interaction patterns
  - [ ] 4.4: Style using project design tokens

- [ ] **Task 5: Implement MatchFilterBar component** (AC: #2)
  - [ ] 5.1: Create `apps/admin/src/components/dashboards/post-match/MatchFilterBar.tsx`
  - [ ] 5.2: Compose using FilterBar container and FilterSelect components from Story 7.3
  - [ ] 5.3: Implement cascading filter logic: Team -> Season -> Match
  - [ ] 5.4: Implement fuzzy search on Match dropdown (case-insensitive substring match on opponent, date, score)
  - [ ] 5.5: Emit selected `matchId`, `teamId`, and `seasonId` via callback props or shared state
  - [ ] 5.6: Set default team to UC Sampdoria if available in the team list

- [ ] **Task 6: Implement MatchStats component** (AC: #3)
  - [ ] 6.1: Create `apps/admin/src/components/dashboards/post-match/MatchStats.tsx`
  - [ ] 6.2: Implement two-column comparative layout with team headers (name + crest)
  - [ ] 6.3: Render all 10 metric rows with correct formatting (xG 2dp, PPDA 1dp, possession % with bar)
  - [ ] 6.4: Highlight the higher value in each metric row
  - [ ] 6.5: Add loading skeleton state

- [ ] **Task 7: Implement MomentumGraph component** (AC: #4)
  - [ ] 7.1: Create `apps/admin/src/components/dashboards/post-match/MomentumGraph.tsx`
  - [ ] 7.2: Implement Recharts `LineChart` with `ResponsiveContainer` (min-height 300px)
  - [ ] 7.3: Plot two possession % lines (one per team) with CartesianGrid, Tooltip, Legend
  - [ ] 7.4: Add halftime ReferenceLine at minute 45
  - [ ] 7.5: Attach GraphInfoBadge with explanation text
  - [ ] 7.6: Handle extra time by extending X-axis domain

- [ ] **Task 8: Implement XgRaceChart component** (AC: #5)
  - [ ] 8.1: Create `apps/admin/src/components/dashboards/post-match/XgRaceChart.tsx`
  - [ ] 8.2: Implement Recharts `LineChart` with cumulative xG step lines for both teams
  - [ ] 8.3: Mark goal events on the line with distinct markers (filled circle or EventIcons goal icon)
  - [ ] 8.4: Add Tooltip showing cumulative xG values and events at hovered minute
  - [ ] 8.5: Add Legend for team identification
  - [ ] 8.6: Handle extra time by extending X-axis domain

- [ ] **Task 9: Implement WinProbabilityBar component** (AC: #6)
  - [ ] 9.1: Create `apps/admin/src/components/dashboards/post-match/WinProbabilityBar.tsx`
  - [ ] 9.2: Implement horizontal stacked bar with three segments (Home Win, Draw, Away Win)
  - [ ] 9.3: Apply distinct colors per segment (green/primary, gray, red/accent)
  - [ ] 9.4: Display percentage labels inside segments and team names at ends
  - [ ] 9.5: Handle 0% edge case by hiding the segment entirely

- [ ] **Task 10: Implement LineupTable component** (AC: #7)
  - [ ] 10.1: Create `apps/admin/src/components/dashboards/post-match/LineupTable.tsx`
  - [ ] 10.2: Filter lineup data to starters only (is_starter === true), split by team
  - [ ] 10.3: Order rows by position group (GK, DEF, MID, FWD) then jersey number
  - [ ] 10.4: Render jersey number, player name, position, minutes, goals, assists, cards columns
  - [ ] 10.5: Show substitution minute inline for players who were subbed off
  - [ ] 10.6: Render event icons inline using EventIcons component
  - [ ] 10.7: Implement responsive stacking (two-column > single-column at 1024px)

- [ ] **Task 11: Implement SubstitutesTable component** (AC: #8)
  - [ ] 11.1: Create `apps/admin/src/components/dashboards/post-match/SubstitutesTable.tsx`
  - [ ] 11.2: Filter lineup data to non-starters, split by team
  - [ ] 11.3: Render jersey number, player name, position, sub-in minute, sub-out minute
  - [ ] 11.4: Visually distinguish used vs unused substitutes (bold vs muted)
  - [ ] 11.5: Render event icons for sub goals/cards using EventIcons
  - [ ] 11.6: List unused substitutes at bottom with dimmed styling

- [ ] **Task 12: Implement PossessionMetricCard component** (AC: #9)
  - [ ] 12.1: Create `apps/admin/src/components/dashboards/post-match/PossessionMetricCard.tsx`
  - [ ] 12.2: Render compact card with phase name header, large metric value, and muted label
  - [ ] 12.3: Use project Card component styling (rounded-xl border shadow-sm)
  - [ ] 12.4: Make card clickable with onClick callback for deep-dive navigation

- [ ] **Task 13: Implement PostMatchPossessionDetails component** (AC: #10)
  - [ ] 13.1: Create `apps/admin/src/components/dashboards/post-match/PostMatchPossessionDetails.tsx`
  - [ ] 13.2: Display three-phase breakdown (Build-Up, Transition, Set-Piece) with summary metrics
  - [ ] 13.3: Implement expandable detail panel per phase showing individual possession sequences
  - [ ] 13.4: Detail panel contains scrollable table with start minute, end minute, duration, outcome, zone progression
  - [ ] 13.5: Handle zero-possession phases with "No data" empty state

- [ ] **Task 14: Compose the dashboard page layout** (AC: #14)
  - [ ] 14.1: In `page.tsx`, compose all 11 components in the specified layout order
  - [ ] 14.2: Implement two-column grid for charts row, lineups section, and substitutes section
  - [ ] 14.3: Apply responsive breakpoint at 1024px for single-column stacking
  - [ ] 14.4: Apply consistent vertical spacing using project spacing tokens
  - [ ] 14.5: Wire shared state: matchId from MatchFilterBar flows to all data-consuming components
  - [ ] 14.6: Ensure no horizontal overflow on any viewport width

- [ ] **Task 15: TypeScript and lint verification** (AC: #15)
  - [ ] 15.1: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 15.2: Run `pnpm lint` -- must pass with zero new errors
  - [ ] 15.3: Verify no `any` types are used in component props or hook return types

---

## Dev Notes

### Architecture Context

This story creates the **Post-Match Analysis** dashboard page -- one of the five core analytics dashboards in Epic 9. It is a client-side interactive page that fetches data from the StatsBomb API routes created in Story 8.1. There is no server-side rendering requirement for the data; the page shell can be SSR'd but all match data is loaded client-side after the user selects a match.

```
User selects match in MatchFilterBar
  |
  v
matchId propagated to all child components (via props or context)
  |
  v
Each component calls its respective API route:
  MatchStats     -> /api/statsbomb/match-stats?matchId={id}
  MomentumGraph  -> /api/statsbomb/possessions?matchId={id}
  XgRaceChart    -> /api/statsbomb/match-stats?matchId={id}  (xG events)
  WinProbability -> /api/statsbomb/win-probabilities?matchId={id}
  LineupTable    -> /api/statsbomb/lineups-processed?matchId={id}
  SubstitutesTab -> /api/statsbomb/lineups-processed?matchId={id}  (shared data)
  PossessionDtl  -> /api/statsbomb/possessions?matchId={id}  (shared data)
  |
  v
Recharts renders charts, tables render lineup/substitution data
```

### Component Dependency Graph

```
PostMatchDashboard (page.tsx)
  +-- MatchFilterBar
  |     +-- FilterBar (from Story 7.3)
  |     +-- FilterSelect (from Story 7.3)
  +-- MatchStats
  +-- MomentumGraph
  |     +-- GraphInfoBadge
  +-- XgRaceChart
  |     +-- GraphInfoBadge
  |     +-- EventIcons (goal markers)
  +-- WinProbabilityBar
  +-- LineupTable
  |     +-- EventIcons
  +-- SubstitutesTable
  |     +-- EventIcons
  +-- PossessionMetricCard (x3)
  +-- PostMatchPossessionDetails
```

### Source Files (from football-dashboard-2)

- **Page:** `football-dashboard-2/src/app/(dashboard)/dashboards/post-match/page.tsx`
- **Components:** `football-dashboard-2/src/app/(dashboard)/dashboards/post-match/components/` -- 11 component files to port
- **Hooks/data:** Check the source page for existing data-fetching patterns (likely inline fetch or custom hooks)

### Files to Create

1. `apps/admin/src/app/(admin)/dashboards/post-match/page.tsx` -- dashboard page
2. `apps/admin/src/components/dashboards/post-match/types.ts` -- shared TypeScript interfaces
3. `apps/admin/src/components/dashboards/post-match/hooks.ts` -- data-fetching hooks
4. `apps/admin/src/components/dashboards/post-match/MatchFilterBar.tsx`
5. `apps/admin/src/components/dashboards/post-match/MatchStats.tsx`
6. `apps/admin/src/components/dashboards/post-match/MomentumGraph.tsx`
7. `apps/admin/src/components/dashboards/post-match/XgRaceChart.tsx`
8. `apps/admin/src/components/dashboards/post-match/WinProbabilityBar.tsx`
9. `apps/admin/src/components/dashboards/post-match/LineupTable.tsx`
10. `apps/admin/src/components/dashboards/post-match/SubstitutesTable.tsx`
11. `apps/admin/src/components/dashboards/post-match/PossessionMetricCard.tsx`
12. `apps/admin/src/components/dashboards/post-match/PostMatchPossessionDetails.tsx`
13. `apps/admin/src/components/dashboards/post-match/EventIcons.tsx`
14. `apps/admin/src/components/dashboards/post-match/GraphInfoBadge.tsx`
15. `apps/admin/src/components/dashboards/post-match/index.ts` -- barrel export

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement
- Anything under `apps/web/` -- dashboard pages go in `apps/admin/`
- API routes under `apps/admin/src/app/api/statsbomb/` -- created in Story 8.1, consumed here read-only
- Shared chart components in `apps/admin/src/components/ui/` -- use them, do not modify

### Key Decisions

1. **Client-side data fetching** -- All match data is fetched after the user selects a match. The page renders a filter bar immediately; downstream components show skeletons until data arrives. This avoids SSR complexity and matches the interactive nature of the dashboard.

2. **Shared matchId state** -- Use React context or prop drilling from the page component. Context is preferred if the component tree is deep, but prop drilling is acceptable for this relatively flat layout. Avoid global state libraries.

3. **Data deduplication** -- LineupTable and SubstitutesTable both consume `/api/statsbomb/lineups-processed`. Fetch once in the parent and pass filtered data down, rather than making two identical API calls.

4. **Possession data reuse** -- MomentumGraph, PossessionMetricCard, and PostMatchPossessionDetails all consume `/api/statsbomb/possessions`. Fetch once in the parent and distribute.

5. **Chart color consistency** -- Home team uses the project's primary color (Sampdoria blue `#1b5497`). Away team uses a neutral gray or secondary color. These colors must be consistent across MomentumGraph, XgRaceChart, and WinProbabilityBar.

6. **Fuzzy search implementation** -- Use simple case-insensitive substring matching (`.toLowerCase().includes()`) for the match dropdown filter. No external fuzzy search library needed for this scope.

### Dependencies

- **Depends on:**
  - Story 9.1 (Dashboard gallery page and dynamic routing)
  - Story 8.1 (StatsBomb API routes -- all 7 endpoints this dashboard consumes)
  - Story 7.1 (Design tokens -- colors, spacing, typography)
  - Story 7.3 (Recharts integration, FilterBar, FilterSelect components)
- **Blocks:** Nothing directly; this is a leaf dashboard page
- **Parallel with:** Story 9.2 (Season Overview), Story 9.4 (Shot Map), Story 9.5 (Heat Maps) -- all can be developed in parallel once dependencies are met

### Testing Approach

- **Manual testing:** Select various matches and verify all 11 components render correctly with real data
- **Edge cases to test:**
  - Match with extra time (charts should extend X-axis)
  - Match with no substitutions made (SubstitutesTable shows all as unused)
  - Match with red card (lineup should reflect player sent off)
  - Win probability where one outcome is 0%
  - Possession phase with zero sequences
  - Empty match list for a season (MatchFilterBar shows empty state)
- **Responsive testing:** Verify layout at 1440px, 1024px, 768px viewports
- **No automated tests required in this story** -- visual dashboard components are validated manually against source platform output
