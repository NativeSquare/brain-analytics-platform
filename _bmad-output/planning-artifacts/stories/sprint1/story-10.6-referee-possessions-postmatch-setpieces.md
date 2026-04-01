# Story 10.6: Referee Analysis, View Possessions & Post-Match Set Pieces

Status: draft
Story Type: frontend / dashboard
Points: 13

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. Dashboard pages live at `apps/web/src/app/(app)/dashboards/{slug}/`. Reusable components go in `apps/web/src/components/dashboards/{slug}/`. Data is fetched from StatsBomb API routes (Story 8.1) and Wyscout video routes (Story 8.3). Convex is NOT involved in data fetching -- these are read-only external data sources accessed via Next.js API routes. The post-match set pieces dashboard reuses components from Story 10.3.

## Story

As a football analyst or coach,
I want three supplementary analytics dashboards -- Referee Analysis, View Possessions, and Post-Match Set Pieces --
so that I can evaluate referee tendencies and bias, review possession chains with video evidence, and analyze set piece performance within the context of a specific match.

## Dependencies

| Dependency | What it provides |
|------------|-----------------|
| Story 9.1 | Dashboard gallery routing, slug-based navigation |
| Story 8.1 | StatsBomb API routes: `/api/statsbomb/teams`, `/seasons`, `/matches`, `/referee-analysis`, `/referee-summary`, `/possessions`, `/match-periods`, `/set-pieces` |
| Story 8.3 | Wyscout video integration: `/api/wyscout/match-id`, `/offsets`, `/urls` |
| Story 7.3 | Recharts components (bar charts for referee stats if needed) |
| Story 10.3 | Set Pieces reusable components: `SetPiecesPitchMap`, `SetPieceDetailsPane`, `SetPieceLegend`, zone polygon definitions |
| Story 7.2 | Pitch visualization components: `PitchBase`, `FullPitchBase` |

---

## Acceptance Criteria (BDD)

---

### DASHBOARD 1: Referee Analysis (`/dashboards/referee-analysis`)

---

### AC 1.1: Referee Analysis page is routable at `/dashboards/referee-analysis`

**Given** the dashboard gallery and routing infrastructure from Story 9.1 is in place
**When** a user navigates to `/dashboards/referee-analysis` (via gallery card click or direct URL)
**Then** the referee analysis dashboard page renders
**And** the page is registered with slug `"referee-analysis"` in the dashboards registry
**And** the page uses a server component that wraps a `RefereeAnalysisContent` client component

### AC 1.2: Server component fetches initial filter data

**Given** the referee analysis page loads
**When** the server component renders
**Then** it fetches competition data from `/api/statsbomb/competitions` (or equivalent)
**And** passes the initial competitions list as props to `RefereeAnalysisContent`
**And** errors during server fetch display a user-friendly error state (not a raw error)

### AC 1.3: RefereeFiltersBar provides referee and competition selection

**Given** the `RefereeAnalysisContent` client component mounts with initial filter data
**When** the component renders
**Then** it displays a Competition dropdown populated with available competitions
**And** it displays a Referee dropdown that populates after a competition is selected
**And** the referee list is fetched from `/api/statsbomb/referee-analysis?competition_id={id}` (extracting unique referees)
**And** while loading, dropdowns show a loading/disabled state
**And** if zero referees are found, the dropdown displays "No referees found"

### AC 1.4: RefereeSummaryCard displays referee profile and aggregate stats

**Given** a referee is selected from the dropdown
**When** the component fetches data from `/api/statsbomb/referee-summary?referee_id={id}`
**Then** a `RefereeSummaryCard` renders displaying:
  - Referee name
  - Total matches officiated
  - Average fouls per game
  - Average cards per game (yellow + red combined)
  - Home/away bias indicator (visual indicator showing if the referee tends to penalize home or away teams more)
**And** while loading, the card shows a skeleton/loading state
**And** if the fetch fails, an inline error message is displayed

### AC 1.5: RefereeStatsBar displays summary metrics

**Given** referee data has been loaded
**When** the `RefereeStatsBar` renders
**Then** it displays four summary metric tiles:
  - Total Fouls
  - Yellow Cards
  - Red Cards
  - Penalties Awarded
**And** each tile shows the aggregate count across all matches for the selected referee and competition
**And** values update when the referee or competition selection changes

### AC 1.6: FoulsTable displays sortable match-level foul data

**Given** referee data has been loaded from `/api/statsbomb/referee-analysis?referee_id={id}&competition_id={id}`
**When** the `FoulsTable` renders
**Then** it displays a data table with the following columns:
  - Match (home team vs away team)
  - Date
  - Fouls (Home) / Fouls (Away)
  - Yellow Cards
  - Red Cards
  - Penalties
**And** all columns are sortable (ascending/descending) by clicking the column header
**And** the default sort is by Date descending (most recent first)
**And** clicking a column header toggles sort direction with a visual indicator (arrow icon)

### AC 1.7: Empty and loading states are handled for Referee Analysis

**Given** no referee is selected yet
**When** the dashboard renders
**Then** the `RefereeSummaryCard`, `RefereeStatsBar`, and `FoulsTable` areas display placeholder messages (e.g., "Select a referee to view analysis")
**And** no API calls for referee detail data are made until a referee is selected

---

### DASHBOARD 2: View Possessions (`/dashboards/view-possessions`)

---

### AC 2.1: View Possessions page is routable at `/dashboards/view-possessions`

**Given** the dashboard gallery and routing infrastructure from Story 9.1 is in place
**When** a user navigates to `/dashboards/view-possessions` (via gallery card click or direct URL)
**Then** the view possessions dashboard page renders
**And** the page is registered with slug `"view-possessions"` in the dashboards registry
**And** the page uses a server component wrapping a client component with `"use client"` directive

### AC 2.2: Server component fetches initial filter data for possessions

**Given** the view possessions page loads
**When** the server component renders
**Then** it fetches team and season data from `/api/statsbomb/teams` and `/api/statsbomb/seasons`
**And** passes the initial teams and seasons lists as props to the client component
**And** errors during server fetch display a user-friendly error state

### AC 2.3: Match selection via cascading dropdowns

**Given** the client component mounts with initial filter data
**When** the user selects a team and a season
**Then** the component fetches matches from `/api/statsbomb/matches?team_id={teamId}&season_id={seasonId}`
**And** the match dropdown populates with the returned matches (displaying opponent name, date, venue)
**And** while loading, the match dropdown shows a loading/disabled state

### AC 2.4: Possession table renders with detailed breakdown

**Given** a match is selected
**When** possession data is fetched from `/api/statsbomb/possessions?match_id={id}`
**Then** a possession table renders with the following columns:
  - Possession # (sequential number)
  - Phase (Build-up / Transition / Set-piece)
  - Start Zone (pitch third or zone label)
  - End Zone (pitch third or zone label)
  - Duration (in seconds)
  - Outcome (Shot / Goal / Turnover / Corner)
  - Number of Passes
**And** the table is sortable by Duration, Number of Passes, and Phase columns
**And** the default sort is by Possession # ascending (chronological order)

### AC 2.5: Period filter toggles possession display by match period

**Given** possession data is loaded and period data is fetched from `/api/statsbomb/match-periods?match_id={id}`
**When** the user toggles period filter buttons (1H / 2H / ET1 / ET2)
**Then** only possessions from the selected period(s) are displayed in the table
**And** multiple periods can be selected simultaneously
**And** the default is all available periods selected
**And** period buttons that have no possessions are disabled or hidden

### AC 2.6: Phase and outcome filters narrow the possession list

**Given** possession data is loaded
**When** the user selects phase filters (Build-up / Transition / Set-piece)
**Then** only possessions matching the selected phase(s) are displayed
**When** the user selects outcome filters (Shot / Goal / Turnover / Corner)
**Then** only possessions matching the selected outcome(s) are displayed
**And** phase and outcome filters combine with period filter (all three are AND-combined)
**And** all filters default to "all selected" on initial load
**And** filtering is client-side (no additional API call)

### AC 2.7: Click possession row triggers Wyscout video playback

**Given** possessions are displayed in the table
**When** the user clicks a possession row
**Then** the system resolves the Wyscout match ID via `/api/wyscout/match-id?statsbomb_match_id={id}`
**And** fetches period offsets from `/api/wyscout/offsets?wyscout_match_id={id}` (if not already cached)
**And** computes the correct video timestamp using the possession start time and the period offset mapping:
  - For 1H: `video_time = possession_start_time`
  - For 2H: `video_time = possession_start_time + period_2_offset`
  - For ET periods: corresponding offset applied
**And** fetches the video clip URL from `/api/wyscout/urls` with the computed timestamp
**And** an embedded video player opens (inline or in a detail pane) playing the clip for that possession
**And** the selected row is visually highlighted

### AC 2.8: Empty and loading states for View Possessions

**Given** no match is selected yet
**When** the dashboard renders
**Then** a placeholder message is shown (e.g., "Select a match to view possessions")
**And** no possession data fetch is triggered

**Given** a match is selected but zero possessions are returned
**When** the table area renders
**Then** a message indicates "No possession data available for this match"

**Given** possession data is loading
**When** the fetch is in progress
**Then** a loading indicator (skeleton table or spinner) is displayed

---

### DASHBOARD 3: Post-Match Set Pieces (`/dashboards/post-match-set-pieces`)

---

### AC 3.1: Post-Match Set Pieces page is routable at `/dashboards/post-match-set-pieces`

**Given** the dashboard gallery and routing infrastructure from Story 9.1 is in place
**When** a user navigates to `/dashboards/post-match-set-pieces` (via gallery card click, direct URL, or the "Set Pieces" link on the post-match dashboard from Story 9.3)
**Then** the post-match set pieces dashboard page renders
**And** the page is registered with slug `"post-match-set-pieces"` in the dashboards registry
**And** the page accepts a `match_id` query parameter to pre-select a specific match

### AC 3.2: Navigation link from post-match dashboard

**Given** the post-match analysis dashboard (Story 9.3) is rendered for a specific match
**When** the user looks for set piece analysis
**Then** a "Set Pieces" link/tab is visible on the post-match dashboard
**And** clicking it navigates to `/dashboards/post-match-set-pieces?match_id={id}`
**And** the post-match set pieces dashboard loads with the match pre-selected

### AC 3.3: Back link returns to the post-match dashboard

**Given** the user arrived at the post-match set pieces dashboard from the post-match dashboard
**When** the user clicks the back link/button
**Then** the user is navigated back to the post-match analysis dashboard for the same match
**And** the back link is always visible at the top of the page

### AC 3.4: Match selection for standalone access

**Given** the user navigates to `/dashboards/post-match-set-pieces` without a `match_id` query parameter
**When** the page renders
**Then** team, season, and match dropdowns are displayed (same cascading pattern as other dashboards)
**And** the user can select a match to load set piece data
**When** a `match_id` query parameter is present
**Then** the match is auto-selected and set piece data loads immediately
**And** the match dropdowns still display (allowing the user to switch to a different match)

### AC 3.5: SetPiecePitchMap renders set piece locations on pitch

**Given** set piece data is loaded from `/api/statsbomb/set-pieces?match_id={id}`
**When** the `SetPiecePitchMap` renders
**Then** it reuses the pitch visualization components from Story 10.3 (and Story 7.2)
**And** set piece delivery/origin points are plotted on the half-pitch
**And** zone polygons from Story 10.3 are rendered when applicable
**And** clicking a set piece marker on the pitch selects it and updates the `SetPieceDetailsPane`

### AC 3.6: Attack/Defence toggle filter

**Given** set piece data is loaded for a match
**When** the user toggles between "Attack" and "Defence"
**Then** in "Attack" mode: only the user's team's set pieces are displayed (own corners, free kicks, throw-ins)
**And** in "Defence" mode: only the opponent's set pieces are displayed
**And** the default is "Attack"
**And** the toggle immediately updates the pitch map, table, and details pane (client-side filtering)

### AC 3.7: Set piece type and side filters

**Given** set piece data is loaded
**When** the user selects set piece type filters
**Then** the following type filters are available: Corners, Free Kicks, Throw-ins
**And** multiple types can be selected simultaneously
**And** the default is all types selected
**When** the user selects side filters
**Then** the following side filters are available: Left, Right
**And** multiple sides can be selected simultaneously
**And** the default is all sides selected
**And** type and side filters combine with the Attack/Defence toggle (all filters are AND-combined)
**And** filtering is client-side (no additional API call)

### AC 3.8: SetPieceTable lists set pieces in the match

**Given** set piece data is loaded and filtered
**When** the `SetPieceTable` renders
**Then** it displays a list/table of set pieces with key columns (type, side, taker, outcome, zone)
**And** clicking a row in the table selects that set piece
**And** the selected set piece is highlighted in both the table and the pitch map
**And** the `SetPieceDetailsPane` updates to show the selected set piece's details

### AC 3.9: SetPieceDetailsPane shows selected set piece details with video

**Given** a set piece is selected (via pitch map click or table row click)
**When** the `SetPieceDetailsPane` renders
**Then** it reuses the `SetPieceDetailsPane` component from Story 10.3
**And** it displays: set piece type, side, taker, first contact, outcome, zone
**And** if Wyscout video is available, an embedded video clip plays for the selected set piece
**And** video is fetched via `/api/wyscout/*` routes with period offset mapping

### AC 3.10: SetPieceLegend explains pitch map symbols

**Given** the post-match set pieces dashboard is rendered
**When** the `SetPieceLegend` component renders
**Then** it reuses the `SetPieceLegend` component from Story 10.3
**And** it explains the color coding and symbols used on the pitch map

### AC 3.11: Differences from Story 10.3 Set Pieces dashboard are enforced

**Given** the post-match set pieces dashboard is rendered
**When** compared to the full Set Pieces dashboard (Story 10.3)
**Then** the post-match variant does NOT show a season-wide view (single match context only)
**And** the post-match variant includes the Attack/Defence toggle (not present in Story 10.3)
**And** the post-match variant includes the Side filter (Left/Right)
**And** the post-match variant includes a back link to the post-match dashboard
**And** the post-match variant does NOT include the all-season vs single-match toggle (always single match)

### AC 3.12: Empty and loading states for Post-Match Set Pieces

**Given** no match is selected or provided via query parameter
**When** the dashboard renders
**Then** a placeholder message is shown (e.g., "Select a match to view set pieces")

**Given** a match is selected but zero set pieces are returned
**When** the dashboard renders
**Then** a message indicates "No set piece data available for this match"

**Given** set piece data is loading
**When** the fetch is in progress
**Then** a loading indicator is displayed on the pitch map and table areas

---

### CROSS-CUTTING ACCEPTANCE CRITERIA

---

### AC 4.1: TypeScript types pass and lint is clean

**Given** all files for the three dashboards have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** no `any` casts are used in the new code

### AC 4.2: All three dashboards are registered in the gallery

**Given** the dashboard gallery registry exists (Story 9.1)
**When** the three new dashboards are added
**Then** `"referee-analysis"`, `"view-possessions"`, and `"post-match-set-pieces"` are registered with appropriate titles, descriptions, and icons
**And** they appear in the dashboard gallery for users with appropriate role access

---

## API Routes Used

All routes are from Story 8.1 and Story 8.3. No new API routes are needed.

### Referee Analysis

| Route | Purpose | Required Params |
|-------|---------|-----------------|
| `/api/statsbomb/referee-analysis` | Fetch referee foul/card data per match | `referee_id`, `competition_id` |
| `/api/statsbomb/referee-summary` | Fetch referee aggregate stats | `referee_id` |

### View Possessions

| Route | Purpose | Required Params |
|-------|---------|-----------------|
| `/api/statsbomb/teams` | Populate team dropdown | -- |
| `/api/statsbomb/seasons` | Populate season dropdown | `competitionId` |
| `/api/statsbomb/matches` | Populate match dropdown | `competitionId`, `seasonId`, optionally `teamId` |
| `/api/statsbomb/possessions` | Fetch possession chain data | `match_id` |
| `/api/statsbomb/match-periods` | Fetch period offset data for video sync | `match_id` |
| `/api/wyscout/match-id` | Resolve Wyscout match ID | `statsbomb_match_id` |
| `/api/wyscout/offsets` | Fetch video period offsets | `wyscout_match_id` |
| `/api/wyscout/urls` | Fetch video clip URL | match ID, timestamp, duration |

### Post-Match Set Pieces

| Route | Purpose | Required Params |
|-------|---------|-----------------|
| `/api/statsbomb/teams` | Populate team dropdown | -- |
| `/api/statsbomb/seasons` | Populate season dropdown | `competitionId` |
| `/api/statsbomb/matches` | Populate match dropdown | `competitionId`, `seasonId`, optionally `teamId` |
| `/api/statsbomb/set-pieces` | Fetch set piece data for a match | `match_id` |
| `/api/wyscout/*` | Video clip URLs for set piece playback | varies |

---

## Tasks / Subtasks

### Part A: Referee Analysis Dashboard

- [ ] **Task 1: Create the referee analysis page route** (AC: #1.1, #1.2)
  - [ ] 1.1: Create directory `apps/web/src/app/(app)/dashboards/referee-analysis/`
  - [ ] 1.2: Create `page.tsx` as a server component that fetches initial competition data
  - [ ] 1.3: Render `RefereeAnalysisContent` as a child client component
  - [ ] 1.4: Add error boundary / try-catch for server-side data fetching

- [ ] **Task 2: Create RefereeAnalysisContent client component** (AC: #1.3, #1.7)
  - [ ] 2.1: Create `apps/web/src/app/(app)/dashboards/referee-analysis/RefereeAnalysisContent.tsx` with `"use client"` directive
  - [ ] 2.2: Implement competition dropdown (controlled, populated from server props)
  - [ ] 2.3: Implement referee dropdown with client-side fetch triggered by competition selection

- [ ] **Task 3: Create RefereeFiltersBar component** (AC: #1.3)
  - [ ] 3.1: Create `apps/web/src/components/dashboards/referee-analysis/RefereeFiltersBar.tsx`
  - [ ] 3.2: Accept competition list and referee list as props
  - [ ] 3.3: Emit `onCompetitionChange` and `onRefereeChange` callbacks

- [ ] **Task 4: Create RefereeSummaryCard component** (AC: #1.4)
  - [ ] 4.1: Create `apps/web/src/components/dashboards/referee-analysis/RefereeSummaryCard.tsx`
  - [ ] 4.2: Display referee name, total matches, average fouls/game, average cards/game
  - [ ] 4.3: Implement home/away bias indicator (visual bar or arrow showing tendency)
  - [ ] 4.4: Handle loading (skeleton) and error states

- [ ] **Task 5: Create RefereeStatsBar component** (AC: #1.5)
  - [ ] 5.1: Create `apps/web/src/components/dashboards/referee-analysis/RefereeStatsBar.tsx`
  - [ ] 5.2: Display four metric tiles: Total Fouls, Yellow Cards, Red Cards, Penalties Awarded

- [ ] **Task 6: Create FoulsTable component** (AC: #1.6)
  - [ ] 6.1: Create `apps/web/src/components/dashboards/referee-analysis/FoulsTable.tsx`
  - [ ] 6.2: Implement sortable columns: Match, Date, Fouls (Home/Away), Yellows, Reds, Penalties
  - [ ] 6.3: Implement sort toggle on column header click with ascending/descending visual indicator
  - [ ] 6.4: Default sort by Date descending

- [ ] **Task 7: Register referee-analysis in dashboard gallery** (AC: #4.2)
  - [ ] 7.1: Add `"referee-analysis"` entry to the dashboards registry with title, description, icon

### Part B: View Possessions Dashboard

- [ ] **Task 8: Create the view possessions page route** (AC: #2.1, #2.2)
  - [ ] 8.1: Create directory `apps/web/src/app/(app)/dashboards/view-possessions/`
  - [ ] 8.2: Create `page.tsx` as a server component that fetches initial team/season data
  - [ ] 8.3: Render client component as a child, passing initial data as props
  - [ ] 8.4: Add error boundary / try-catch for server-side data fetching

- [ ] **Task 9: Create ViewPossessionsContent client component** (AC: #2.3, #2.4, #2.5, #2.6, #2.7, #2.8)
  - [ ] 9.1: Create `apps/web/src/app/(app)/dashboards/view-possessions/ViewPossessionsContent.tsx` with `"use client"` directive
  - [ ] 9.2: Implement cascading team -> season -> match dropdowns
  - [ ] 9.3: Implement possession data fetching when match is selected (with AbortController)
  - [ ] 9.4: Implement period filter toggle buttons (1H/2H/ET1/ET2)
  - [ ] 9.5: Implement phase filter (Build-up/Transition/Set-piece)
  - [ ] 9.6: Implement outcome filter (Shot/Goal/Turnover/Corner)
  - [ ] 9.7: Implement possession table with sortable columns (Possession #, Phase, Start Zone, End Zone, Duration, Outcome, Passes)
  - [ ] 9.8: Implement row click handler for Wyscout video playback
  - [ ] 9.9: Implement period offset mapping for accurate video timestamps:
    ```typescript
    // Period offset mapping for Wyscout video sync
    // 1H: video_time = possession_start_time
    // 2H: video_time = possession_start_time + period_2_offset
    // ET1/ET2: corresponding offsets from match-periods API
    ```
  - [ ] 9.10: Implement embedded video player (inline or detail pane)
  - [ ] 9.11: Implement loading, empty, and placeholder states
  - [ ] 9.12: Cache Wyscout match ID and offsets to avoid redundant fetches

- [ ] **Task 10: Register view-possessions in dashboard gallery** (AC: #4.2)
  - [ ] 10.1: Add `"view-possessions"` entry to the dashboards registry with title, description, icon

### Part C: Post-Match Set Pieces Dashboard

- [ ] **Task 11: Create the post-match set pieces page route** (AC: #3.1, #3.2, #3.3, #3.4)
  - [ ] 11.1: Create directory `apps/web/src/app/(app)/dashboards/post-match-set-pieces/`
  - [ ] 11.2: Create `page.tsx` as a server component
  - [ ] 11.3: Read `match_id` from `searchParams` and pass to client component
  - [ ] 11.4: Fetch initial team/season data server-side
  - [ ] 11.5: Render client component with initial data and optional `match_id` prop

- [ ] **Task 12: Create PostMatchSetPiecesContent client component** (AC: #3.4, #3.5, #3.6, #3.7, #3.8, #3.9, #3.12)
  - [ ] 12.1: Create `apps/web/src/app/(app)/dashboards/post-match-set-pieces/PostMatchSetPiecesContent.tsx` with `"use client"` directive
  - [ ] 12.2: Implement cascading match selection dropdowns (team -> season -> match)
  - [ ] 12.3: Auto-select match when `match_id` prop is provided
  - [ ] 12.4: Implement Attack/Defence toggle filter (default: Attack)
  - [ ] 12.5: Implement set piece type filter (Corners, Free Kicks, Throw-ins -- multi-select)
  - [ ] 12.6: Implement side filter (Left, Right -- multi-select)
  - [ ] 12.7: Implement back link to post-match dashboard (`/dashboards/post-match?match_id={id}`)
  - [ ] 12.8: Implement set piece data fetching from `/api/statsbomb/set-pieces?match_id={id}`
  - [ ] 12.9: Wire up `SetPiecePitchMap` using pitch components from Story 10.3/7.2
  - [ ] 12.10: Wire up `SetPieceTable` for listing set pieces with row selection
  - [ ] 12.11: Wire up `SetPieceDetailsPane` (reused from Story 10.3) for selected set piece details + video
  - [ ] 12.12: Wire up `SetPieceLegend` (reused from Story 10.3)
  - [ ] 12.13: Implement loading, empty, and placeholder states

- [ ] **Task 13: Add "Set Pieces" link on post-match dashboard** (AC: #3.2)
  - [ ] 13.1: Add a "Set Pieces" link/tab on the post-match analysis dashboard (Story 9.3 page)
  - [ ] 13.2: Link navigates to `/dashboards/post-match-set-pieces?match_id={currentMatchId}`

- [ ] **Task 14: Register post-match-set-pieces in dashboard gallery** (AC: #4.2)
  - [ ] 14.1: Add `"post-match-set-pieces"` entry to the dashboards registry with title, description, icon

### Part D: Cross-Cutting

- [ ] **Task 15: TypeScript types** (AC: #4.1)
  - [ ] 15.1: Define types for referee data structures (RefereeSummary, FoulRecord, RefereeStats)
  - [ ] 15.2: Define types for possession data structures (PossessionChain, PossessionPhase, PossessionOutcome)
  - [ ] 15.3: Reuse set piece types from Story 10.3
  - [ ] 15.4: Ensure all props and state are fully typed -- no `any` casts

- [ ] **Task 16: TypeScript and lint verification** (AC: #4.1)
  - [ ] 16.1: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 16.2: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This story creates three lighter-weight dashboard pages. Each follows the same server-rendered with client hydration pattern used across all Epic 9/10 dashboards.

```
/dashboards/referee-analysis/page.tsx (server component)
  |-- fetches competitions server-side
  |-- renders RefereeAnalysisContent (client component)
        |-- RefereeFiltersBar (competition + referee dropdowns)
        |-- RefereeSummaryCard (aggregate stats)
        |-- RefereeStatsBar (metric tiles)
        |-- FoulsTable (sortable match-level data)

/dashboards/view-possessions/page.tsx (server component)
  |-- fetches teams, seasons server-side
  |-- renders ViewPossessionsContent (client component)
        |-- Cascading dropdowns (team -> season -> match)
        |-- Period/Phase/Outcome filters
        |-- Possession table (sortable)
        |-- Video player (Wyscout integration)

/dashboards/post-match-set-pieces/page.tsx (server component)
  |-- reads match_id from searchParams
  |-- fetches teams, seasons server-side
  |-- renders PostMatchSetPiecesContent (client component)
        |-- Back link to post-match dashboard
        |-- Attack/Defence toggle + Type/Side filters
        |-- SetPiecePitchMap (reused from Story 10.3)
        |-- SetPieceTable
        |-- SetPieceDetailsPane (reused from Story 10.3)
        |-- SetPieceLegend (reused from Story 10.3)
```

### Server/Client Split

All three pages follow the same pattern:
- `page.tsx` is a **server component** that fetches initial dropdown data (teams, seasons, competitions)
- The main content component is a **client component** (`"use client"`) that handles all interactivity
- Event/possession/set-piece data is fetched **client-side only** (conditional on user interaction)
- This matches the pattern used across all Epic 9/10 dashboards

### Component Reuse from Story 10.3

The post-match set pieces dashboard reuses the following components from Story 10.3:

| Component | Source Location (Story 10.3) | Reuse Notes |
|-----------|------------------------------|-------------|
| `SetPiecesPitchMap` | `apps/web/src/components/dashboards/set-pieces/SetPiecesPitchMap.tsx` | Reuse as-is, pass match-filtered data |
| `SetPieceDetailsPane` | `apps/web/src/components/dashboards/set-pieces/SetPieceDetailsPane.tsx` | Reuse as-is |
| `SetPieceLegend` | `apps/web/src/components/dashboards/set-pieces/SetPieceLegend.tsx` | Reuse as-is |
| Zone polygon definitions | `apps/web/src/components/dashboards/set-pieces/zones.ts` | Reuse as-is |
| Set piece types | `apps/web/src/components/dashboards/set-pieces/types.ts` | Reuse/extend |

If Story 10.3 components need modifications to support the post-match context (e.g., accepting an `attackDefenceMode` prop), those modifications should be backwards-compatible and not break the Story 10.3 dashboard.

### Wyscout Video Integration (View Possessions)

The View Possessions dashboard requires period offset mapping for accurate video timestamps. The flow:

```
1. User selects a match
2. Fetch Wyscout match ID: GET /api/wyscout/match-id?statsbomb_match_id={id}
3. Fetch period offsets: GET /api/wyscout/offsets?wyscout_match_id={id}
4. Cache both values for the session (they don't change per match)
5. User clicks a possession row
6. Compute video timestamp:
   - 1H: timestamp = possession.start_time_seconds
   - 2H: timestamp = possession.start_time_seconds + offsets.period_2
   - ET1: timestamp = possession.start_time_seconds + offsets.extra_time_1
   - ET2: timestamp = possession.start_time_seconds + offsets.extra_time_2
7. Fetch video URL: GET /api/wyscout/urls with computed timestamp
8. Play video in embedded player
```

### Key Differences: Post-Match Set Pieces vs Story 10.3 Set Pieces

| Feature | Story 10.3 (Full) | Story 10.6 (Post-Match) |
|---------|-------------------|------------------------|
| Season-wide view | Yes (toggle) | No (single match only) |
| Match selection | Full cascading filters | Via query param or cascading |
| Attack/Defence toggle | No | Yes |
| Side filter (L/R) | No (part of broader filters) | Yes (dedicated filter) |
| Back link | No | Yes (to post-match dashboard) |
| Components | 18 components | 4 components (reuses from 10.3) |
| Navigation entry | Gallery card | Gallery card + post-match link |

### Source Files (Existing Platform)

| Our Target | Source Reference |
|---|---|
| `apps/web/src/app/(app)/dashboards/referee-analysis/` | `football-dashboard-2/src/app/(dashboard)/dashboards/referee-analysis/` |
| `apps/web/src/app/(app)/dashboards/view-possessions/` | `football-dashboard-2/src/app/(dashboard)/dashboards/view-possessions/` |
| `apps/web/src/app/(app)/dashboards/post-match-set-pieces/` | `football-dashboard-2/src/app/(dashboard)/dashboards/post-match-set-pieces/` |

### Files to Create

**Referee Analysis:**
1. `apps/web/src/app/(app)/dashboards/referee-analysis/page.tsx` -- Server component (page route)
2. `apps/web/src/app/(app)/dashboards/referee-analysis/RefereeAnalysisContent.tsx` -- Client component
3. `apps/web/src/components/dashboards/referee-analysis/RefereeFiltersBar.tsx`
4. `apps/web/src/components/dashboards/referee-analysis/RefereeSummaryCard.tsx`
5. `apps/web/src/components/dashboards/referee-analysis/RefereeStatsBar.tsx`
6. `apps/web/src/components/dashboards/referee-analysis/FoulsTable.tsx`

**View Possessions:**
7. `apps/web/src/app/(app)/dashboards/view-possessions/page.tsx` -- Server component (page route)
8. `apps/web/src/app/(app)/dashboards/view-possessions/ViewPossessionsContent.tsx` -- Client component

**Post-Match Set Pieces:**
9. `apps/web/src/app/(app)/dashboards/post-match-set-pieces/page.tsx` -- Server component (page route)
10. `apps/web/src/app/(app)/dashboards/post-match-set-pieces/PostMatchSetPiecesContent.tsx` -- Client component

### Files to Modify

- Dashboard gallery registry (Story 9.1) -- add three new entries
- Post-match analysis dashboard page (Story 9.3) -- add "Set Pieces" navigation link

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement
- Anything under `apps/admin/` -- dashboard pages go in `apps/web/`
- Story 10.3 set piece components -- reuse as-is (unless backwards-compatible changes are needed)
- API route files (Story 8.1/8.3) -- these should already exist

### Testing Approach

- **Manual testing:** Navigate to each of the three dashboards, verify all filters and interactions work
- **Referee Analysis:** Select competition, select referee, verify summary card, stats bar, and fouls table populate correctly. Test column sorting.
- **View Possessions:** Select match, verify possession table loads. Test period/phase/outcome filters. Click a possession row and verify video playback starts at the correct timestamp.
- **Post-Match Set Pieces:** Navigate from post-match dashboard link, verify match pre-selection. Test Attack/Defence toggle, type and side filters. Click set piece on pitch and in table, verify details pane updates.
- **Cross-dashboard:** Verify all three appear in the gallery. Verify back link from post-match set pieces.
- **Error handling:** Disconnect network and verify error states display correctly for each dashboard.
- **No unit tests required in this story** -- visual dashboard pages tested via manual QA

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10, Story 10.6]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-10.3 (Set Pieces -- component reuse)]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.1-statsbomb-postgresql-connection-api-routes.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.3-hudl-wyscout-video-integration.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-9.1-dashboard-gallery-role-access-control.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-9.3-post-match-analysis-dashboard.md]

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
