# Story 10.3: Set Pieces Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 21

> **PROJECT SCOPE:** All components go in `apps/web/src/components/dashboards/set-pieces/`. The dashboard page goes in `apps/web/src/app/(dashboard)/dashboards/set-pieces/page.tsx`. Data fetching uses existing API routes from Story 8.1 (`/api/statsbomb/*`) and Story 8.3 (`/api/wyscout/*`). Pitch components from Story 7.2 (`PitchBase`, `GoalBase`) and chart components from Story 7.3 (Recharts) are consumed as dependencies. This is the most complex dashboard in the platform with 18 components, zone polygon definitions, and multiple visualization modes.

## Story

As a football analyst or set piece coach,
I want a Set Pieces dashboard that visualizes all set piece deliveries on a half-pitch with zone polygon overlays, individual dot markers colored by first-contact outcome or direct shot outcome, bar chart breakdowns of takers/techniques/outcomes/first contacts, and embedded Wyscout video clips,
so that I can analyze set piece patterns, delivery zones, first contact effectiveness, and direct set piece shooting quality with full video evidence across single matches or entire seasons.

## Dependencies

| Dependency | What it provides |
|------------|-----------------|
| Story 9.1 | Dashboard gallery routing, slug-based navigation (`/dashboards/set-pieces`) |
| Story 8.1 | StatsBomb API routes: `/api/statsbomb/teams`, `/seasons`, `/matches`, `/set-pieces`, `/default-season` |
| Story 8.3 | Wyscout video integration: `/api/wyscout/match-id`, `/offsets`, `/urls` |
| Story 7.2 | `PitchBase` (half-pitch SVG, viewBox `0 0 80 120`), `GoalBase` (goal mouth SVG) |
| Story 7.3 | Recharts components for bar charts (CornerTechniqueBar, TakersBarChart, etc.) |

## Acceptance Criteria (BDD)

### AC 1: Dashboard page is accessible via gallery routing

**Given** the dashboard gallery from Story 9.1 is rendered
**When** the user navigates to `/dashboards/set-pieces`
**Then** the Set Pieces dashboard page loads with the slug `set-pieces`
**And** the page contains: `SetPieceMatchFiltersBar`, direct/indirect tab toggle, `SetPieceFiltersBar`, `SetPieceStatsBar`, `SetPiecesPitchMap`, `SetPieceDetailsPane`, bar charts, and legend components
**And** the page has a `"use client"` directive (client-side interactivity required)

### AC 2: SetPieceMatchFiltersBar provides team, season, and match selection

**Given** the Set Pieces dashboard page is rendered
**When** the component mounts
**Then** it displays three filter controls: Team dropdown, Season dropdown, and Match search input
**And** the Team dropdown fetches options from `GET /api/statsbomb/teams` and defaults to UC Sampdoria (team_id `234`)
**And** the Season dropdown fetches options from `GET /api/statsbomb/seasons` and defaults to the result of `GET /api/statsbomb/default-season?team_id={id}`
**And** the Match input fetches options from `GET /api/statsbomb/matches?team_id={id}&season_id={id}`
**And** the Match input supports fuzzy text search (client-side filtering using `fuzzysort` on match labels, selected team name, and opposition team name)
**And** a match dropdown opens on focus showing filtered results, each displaying the match label and "Team vs Opponent" subtitle
**And** an "All set pieces in season" checkbox is available to toggle between single-match and full-season aggregation

**When** "All set pieces in season" is checked
**Then** the Match input is disabled and set pieces for the selected team+season are loaded via `GET /api/statsbomb/set-pieces?team_id={id}&season_id={id}&all_season_set_pieces=true`

**When** a single match is selected
**Then** set pieces are loaded via `GET /api/statsbomb/set-pieces?match_id={id}`

### AC 3: Direct/Indirect tab toggle controls the visualization mode

**Given** set piece data has been loaded
**When** the direct/indirect tab renders
**Then** it displays two tabs: "Indirect" (default) and "Direct"
**And** the tabs are styled as a full-width segmented control using `Tabs`/`TabsList`/`TabsTrigger`

**When** "Indirect" tab is active
**Then** set pieces where `is_direct_sp !== true` are shown
**And** the pitch map shows first-contact positions (using `first_phase_first_contact_x/y` or `second_ball_x/y` coordinates)
**And** dots are colored by first contact outcome: blue (`#1b5497`) for won, red (`#991b1b`) for lost
**And** the "Individual / Zones" view mode toggle is visible
**And** the filters bar shows attack/defense filter, half filter, technique filter, and target filter
**And** the FirstContactsBarChart is displayed instead of OutcomeBarChart

**When** "Direct" tab is active
**Then** set pieces where `is_direct_sp === true` are shown
**And** the pitch map shows shot origin positions (using `location_x/y` coordinates)
**And** dots are colored by shot outcome: blue (`#1b5497`) for goal, red (`#c21718`) for saved, gray (`#9ca3af`) for blocked, no fill for off target
**And** dot radius is proportional to xG: `radius = clamp(0.9 + xg * 3.2, 0.9, 3.2)`
**And** the "Individual / Zones" toggle is hidden (always individual view)
**And** the GoalMap is displayed below the pitch map
**And** the OutcomeBarChart is displayed instead of FirstContactsBarChart
**And** attack/defense, half, technique, and target filters are hidden; only type, zone, side, and taker filters are shown

### AC 4: SetPieceFiltersBar provides multi-select filtering

**Given** set piece data has been loaded (either single match or season)
**When** the `SetPieceFiltersBar` renders
**Then** it displays the following filter controls (visibility depends on direct/indirect mode):

| Filter | Type | Shown When | Options |
|--------|------|-----------|---------|
| Attacking / Defensive | Select dropdown | Indirect only | All, Attacking, Defensive |
| Half | Select dropdown | Indirect only | All, 1, 2, (plus ET periods if present) -- derived from unique `period` values in data |
| Type | Select dropdown | Always | Derived from unique `sp_type` values; in Direct mode limited to "Free Kick", "Penalty", "Corner" |
| Zone | Select dropdown | Always | All, plus unique `sp_zone` values from data |
| Side | Select dropdown | Always | All, Left, Right; when type is "Corner" only Left/Right (no All) |
| Technique | Select dropdown | Indirect only | All, plus unique `technique` values from data |
| Target | Select dropdown | Indirect only | All, plus unique `target` values from data |
| Taker | Select dropdown | Always | All, plus unique `taker` values from data (scoped by attack/defense filter) |

**And** all filters default to "All" (no filtering applied) except:
  - Type defaults to the first available option (or "Free Kick" in direct mode if available)
  - Side defaults to "Left" when type is "Corner"
**And** changing any filter immediately updates all visualizations without a new API call (client-side filtering)
**And** a "Reset Filters" button clears all filters back to their defaults

### AC 5: Automatic filter adjustments on context changes

**Given** filters are displayed and the user changes the active tab or type selection
**When** the user switches from indirect to direct tab
**Then** the type filter options update to only show direct-eligible types ("Free Kick", "Penalty", "Corner")
**And** the type filter auto-selects "Free Kick" if available, otherwise the first available option

**When** the type filter changes to "Corner"
**Then** the side filter auto-switches to "Left" (default for corner analysis)

**When** the type filter changes away from "Corner"
**Then** the side filter auto-resets to "All"

**When** a match is selected and the team is the home team
**Then** the attack/defense filter auto-sets to "Attacking"

**When** a match is selected and the team is the away team
**Then** the attack/defense filter auto-sets to "Defensive"

**When** the selected player is no longer in the available options (due to other filter changes)
**Then** the player filter auto-resets to "All"

### AC 6: SetPiecesPitchMap renders set pieces on a half-pitch

**Given** filtered set piece data is available
**When** the `SetPiecesPitchMap` renders in "individual" view mode
**Then** it uses `PitchBase` from Story 7.2 as the base SVG
**And** each set piece is rendered as an SVG `<circle>` element

**Coordinate mapping (StatsBomb to SVG):**
- StatsBomb coordinates: x = 0-120 (horizontal, left-to-right), y = 0-80 (vertical, top-to-bottom)
- SVG coordinates (half-pitch, vertical orientation):
  - `svg_x = statsbomb_y`
  - `svg_y = 120 - statsbomb_x`
- For indirect set pieces: position is `first_phase_first_contact_x/y` or fallback to `second_ball_x/y`; only shown if `x >= 60` (attacking half)
- For direct set pieces: position is `location_x/y`

**Indirect mode circle rendering:**
- Radius: fixed at `1.2` SVG units
- Color: blue (`#1b5497`) if `first_contact_won === true` for attacking set pieces (or `false` for defensive), red (`#991b1b`) otherwise
- No fill if `first_contact_won` is null

**Direct mode circle rendering:**
- Radius: proportional to xG via `clamp(0.9 + (shot_statsbomb_xg * 3.2), 0.9, 3.2)`
- Color by shot outcome: Goal = `#1b5497`, Saved = `#c21718`, Blocked = `#9ca3af`, Off target = no fill (CSS class `shot-off-target`)

**And** each circle has `cursor: pointer`, `stroke: #9ca3af`, `strokeWidth: 0.2`
**And** hovering a circle dims all other circles to `opacity: 0.6`
**And** selecting a circle dims all other circles to `opacity: 0.25`
**And** clicking a selected circle deselects it
**And** clicking the pitch background deselects the current selection
**And** a `CornerDotsLayer` renders small marker dots at corner kick origin positions

### AC 7: Zone view mode renders aggregated zone polygons

**Given** filtered set piece data is available and the view mode is "zones" (indirect tab only)
**When** the `SetPiecesPitchMap` renders in "zones" view mode
**Then** the pitch displays zone polygons from `ZONE_POLYGONS` instead of individual dots
**And** each zone is an SVG `<polygon>` element filled with a blue shade proportional to the number of set pieces in that zone
  - Color formula: `rgba(27, 84, 151, opacity)` where `opacity = 0.2 + (count / maxCount) * 0.8`
  - Minimum opacity: `0.15` for zones with zero set pieces
**And** each non-empty zone displays text at its centroid showing the average xG formatted to 2 decimal places
**And** zone text uses `fontSize: 2.2`, `fontWeight: 600`, `fill: white`, `textAnchor: middle`
**And** zones are filtered by the active side filter (Left, Right, or All)
**And** `CornerDotsLayer` is still rendered on top of zone polygons

### AC 8: Zone polygon definitions (set-piece-zones.ts)

**Given** the zone polygon data is defined
**Then** the `set-piece-zones.ts` file exports the following:

**Zone definitions (8 zones, each with Left and Right variants = 16 polygons total):**

| Zone ID | Zone Name | Description |
|---------|-----------|-------------|
| 1 | 6 yard Back | Back portion of the 6-yard box |
| 2 | 6 yard Middle | Central portion of the 6-yard box |
| 3 | 6 yard Front | Front portion of the 6-yard box |
| 4 | Back Long | Extended zone behind the penalty area |
| 5 | Front Short | Extended zone in front of the penalty area |
| 6 | Back | Between 6-yard box and penalty area (back) |
| 7 | Penalty Spot | Central zone around the penalty spot |
| 8 | Front | Between 6-yard box and penalty area (front) |

**And** zones are defined as `RAW_ZONES` in StatsBomb coordinates (x: 0-120, y: 0-80) with 4 vertices per polygon
**And** the `mapToPitch` function converts StatsBomb coordinates to pitch SVG: `(x, y) -> (y, 120 - x)`
**And** `ZONE_POLYGONS` is computed at module load time by grouping `RAW_ZONES` by `{id}-{side}`, sorting vertices by `shapeNum`, and mapping through `mapToPitch`
**And** each `ZonePolygon` has: `id: number`, `zoneName: string`, `side: "Left" | "Right"`, `points: Array<[number, number]>`

**And** the file exports a `pointInPolygon` function using ray-casting algorithm
**And** the file exports an `assignToZone(x, y, side)` function that returns the matching `ZoneAssignment` or null
**And** the file exports a `getSetPieceZone(sp)` function that:
  - For direct set pieces: uses `location_x/y`
  - For indirect set pieces: uses `first_phase_first_contact_x/y` or `second_ball_x/y`; skips if `x < 60`
  - Resolves side from `sp.side` string or infers from `y` coordinate (`y < 40` = Right)

### AC 9: SetPiecesGoalMap renders direct set piece shot end locations

**Given** direct tab is active and filtered set piece data is available
**When** the `SetPiecesGoalMap` renders
**Then** it uses `GoalBase` from Story 7.2 as the base SVG
**And** only direct set pieces with `shot_end_location_y` and `shot_end_location_z` present are displayed
**And** each shot is rendered via a `DirectSetPiecesGoalLayer` component as a circle at its end location (where the shot ended relative to the goal frame)
**And** circle sizing and coloring follow the same rules as direct mode in AC 6
**And** hover/select interactions match the pitch map behavior (shared `hoveredId`/`selectedId` state)
**And** clicking the goal background deselects the current selection

### AC 10: SetPieceDetailsPane shows set piece details with video integration

**Given** the pitch map or goal map is displayed
**When** the user clicks on a set piece circle
**Then** the `SetPieceDetailsPane` panel updates to show the selected set piece details via a `SetPieceDetailsList` sub-component
**And** the details include all relevant fields from the `SetPiece` type (taker, technique, zone, target, outcome, xG, etc.)
**And** a "Set piece video" button is displayed below the details

**When** no set piece is selected
**Then** the details pane shows "Select a set piece to view details"

**When** the user clicks "Set piece video"
**Then** the system executes the Wyscout video flow from Story 8.3:
  1. Calls `GET /api/wyscout/match-id?statsbomb_match_id={match_id}` to get the Wyscout match ID
  2. Calls `GET /api/wyscout/offsets?wyscout_match_id={id}` to get period offsets
  3. Parses `start_time` and `end_time` timestamps using `parseTimestamp()` (HH:MM:SS.fff -> seconds)
  4. Adjusts timestamps by adding the period offset: period 2 uses `offsets["2H"].start`, period 3 uses `offsets["E1"].start`, period 4 uses `offsets["E2"].start`
  5. Applies padding: `start_timestamp = floor(adjusted_start - 3)`, `end_timestamp = ceil(adjusted_end + 5)`
  6. Calls `GET /api/wyscout/urls?wyscout_match_id={id}&start_timestamp={start_ts}&end_timestamp={end_ts}`
  7. Renders the video in a full-screen overlay with an HTML5 `<video>` player (autoPlay, controls)
  8. A "Close" button dismisses the overlay
**And** while the video URL is loading, the button shows "Loading..."
**And** if video fetch fails, a destructive-styled error message is shown below the button (no crash)

**When** the user selects a different set piece
**Then** the video URL is reset and the details update to the new selection

### AC 11: Legend components explain visual encoding

**Given** the details pane is rendered
**Then** a "Legend" section is displayed at the bottom of the details pane

**When** direct tab is active
**Then** `LegendOutcome` displays outcome color indicators:
  - Blue circle + "Goal"
  - Red circle + "Saved"
  - Gray circle + "Blocked"
  - Empty/dashed circle + "Off Target"
**And** `LegendXgSize` displays a circle size scale showing xG-to-radius mapping (using the pitch scale factor for accurate sizing)

**When** indirect tab is active
**Then** the legend displays:
  - Blue circle (`#1b5497`) + "First contact won"
  - Red circle (`#991b1b`) + "First contact lost"

### AC 12: SetPieceStatsBar shows summary statistics

**Given** filtered set piece data is available
**When** the `SetPieceStatsBar` renders
**Then** it displays a horizontal bar of summary statistics computed from `baseFilteredSetPieces`:

| Stat | Calculation |
|------|-------------|
| Total Set Pieces | Count of all filtered set pieces |
| Goals | Count where `goal` is truthy and > 0 |
| Total xG | Sum of `xg` for all filtered set pieces (formatted to 2 decimal places) |
| First Contact Won | Count where `first_contact_won === true` |
| First Phase Shots | Count where `first_phase_first_contact_shot === true` |
| First Phase Goals | Count where `first_phase_first_contact_goal === true` |
| Short % | `(short_count / total) * 100` where short_count is where `is_short === true` |
| Goals/SP | `goals / total` |
| xG/SP | `totalXg / total` |

**And** each stat is displayed in a card/badge format with a label and value
**And** the stats update in real-time as filters change (client-side recalculation via `useMemo`)

### AC 13: CornerTechniqueBar shows corner delivery technique distribution

**Given** filtered set piece data contains corners (set pieces where `sp_type` includes "corner")
**When** the `CornerTechniqueBar` renders
**Then** it displays a Recharts bar chart showing the distribution of corner techniques
**And** each bar shows: technique name, count, and percentage of total corners
**And** data is sorted by count descending
**And** the chart is only visible when the type filter is "All" or a corner type is selected
**And** the chart is hidden when there are no corners in the filtered data

### AC 14: TakersBarChart shows top set piece takers by frequency

**Given** filtered set piece data is available
**When** the `TakersBarChart` renders
**Then** it displays a Recharts bar chart with taker name on the y-axis and count on the x-axis
**And** clicking a bar highlights that taker on the pitch map (dims all other set pieces to `opacity: 0.25`)
**And** clicking the same bar again deselects the taker
**And** the chart is hidden when the attack/defense filter is "Defensive" (defensive set pieces don't show own takers)

### AC 15: FirstContactsBarChart shows first contact player distribution (indirect only)

**Given** filtered set piece data is available and indirect tab is active
**When** the `FirstContactsBarChart` renders
**Then** it displays a Recharts bar chart with first contact player name on the y-axis and count on the x-axis
**And** only first contacts by the selected team's players are counted (filtered by `first_phase_first_contact_team_id`)
**And** clicking a bar highlights that player's first contacts on the pitch map
**And** clicking the same bar again deselects the player

### AC 16: OutcomeBarChart shows shot outcome distribution (direct only)

**Given** filtered set piece data is available and direct tab is active
**When** the `OutcomeBarChart` renders
**Then** it displays a Recharts bar chart with shot outcome name on the y-axis and count on the x-axis
**And** only direct set pieces (`is_direct_sp === true`) are counted
**And** outcomes are derived from `shot_outcome_name`

### AC 17: Loading, empty, and error states are handled

**Given** the dashboard is loading set piece data from the API
**When** the API request is in flight
**Then** the pitch map area shows a `Skeleton` placeholder (height ~420px)
**And** all bar charts and stats show empty/placeholder states

**Given** the API request fails
**When** the dashboard attempts to render
**Then** an error card is displayed in the pitch map area: "Unable to load set pieces" (destructive text on card background)
**And** the error is logged to the console

**Given** matches are loading
**When** the match dropdown is open
**Then** it shows "Loading matches..." placeholder text

**Given** match loading fails
**When** the match dropdown is open
**Then** it shows the error message in destructive text

### AC 18: TypeScript types and lint pass

**Given** all Set Pieces dashboard files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all components use proper TypeScript types (no `any` casts)

---

## Components Inventory (22 files total)

| # | Component | File | Description |
|---|-----------|------|-------------|
| 1 | `SetPieceMatchFiltersBar` | `set-piece-match-filters-bar.tsx` | Team/season/match selection with fuzzy search + all-season toggle |
| 2 | `SetPieceFiltersBar` | `set-piece-filters-bar.tsx` | Multi-select dropdowns: attack/defense, half, type, zone, side, technique, target, taker + reset button |
| 3 | `SetPieceStatsBar` | `set-piece-stats-bar.tsx` | Summary stats: total, goals, xG, first contact won, first phase shots/goals, short%, goals/SP, xG/SP |
| 4 | `SetPiecesPitchMap` | `set-pieces-pitch-map.tsx` | Half-pitch SVG rendering set pieces in individual or zones view mode |
| 5 | `SetPiecesLayer` | `set-pieces-layer.tsx` | SVG layer rendering individual set piece circles on the pitch |
| 6 | `CornerDotsLayer` | `corner-dots-layer.tsx` | SVG layer rendering small dots at corner kick origin positions |
| 7 | `ZonePitchLayer` | `zone-pitch-layer.tsx` | SVG layer rendering zone polygons with count-based opacity and avgXg text labels |
| 8 | `SetPiecesGoalMap` | `set-pieces-goal-map.tsx` | Goal-area visualization for direct set piece shot end locations |
| 9 | `DirectSetPiecesGoalLayer` | `direct-set-pieces-goal-layer.tsx` | SVG layer rendering shot end-location circles inside goal frame |
| 10 | `SetPieceDetailsPane` | `set-piece-details-pane.tsx` | Selected set piece details panel with video button, overlay player, and legend |
| 11 | `SetPieceDetailsList` | `set-piece-details-list.tsx` | Formatted detail fields for the active set piece |
| 12 | `LegendOutcome` | `legend-outcome.tsx` | Direct mode: outcome color key (Goal/Saved/Blocked/Off Target) |
| 13 | `LegendXgSize` | `legend-xg-size.tsx` | Direct mode: xG value to circle size mapping legend |
| 14 | `CornerTechniqueBar` | `corner-technique-bar.tsx` | Recharts bar chart: corner technique distribution |
| 15 | `FirstContactsBarChart` | `first-contacts-bar-chart.tsx` | Recharts bar chart: first contact player distribution (indirect) |
| 16 | `OutcomeBarChart` | `outcome-bar-chart.tsx` | Recharts bar chart: shot outcome distribution (direct) |
| 17 | `TakersBarChart` | `takers-bar-chart.tsx` | Recharts bar chart: top set piece takers by frequency |
| 18 | `set-piece-zones.ts` | `set-piece-zones.ts` | Zone polygon definitions, `ZONE_POLYGONS`, `assignToZone`, `getSetPieceZone`, `pointInPolygon` |
| 19 | `types.ts` | `types.ts` | `SetPiece`, `MatchRow`, `MatchOption`, `SetPieceSummaryStats`, `ZoneStats` types |
| 20 | `utils.ts` | `utils.ts` | `parseTimestamp`, `getMatchMinute` utility functions |
| 21 | `SetPiecesDashboard` | `set-pieces-dashboard.tsx` | Root orchestrator: all state management, data fetching, filter logic, layout |
| 22 | `index.ts` | `index.ts` | Barrel export of all public components |

---

## Data Flow

### API Routes Used

| Route | When Called | Parameters |
|-------|-----------|------------|
| `GET /api/statsbomb/teams` | On mount (SetPieceMatchFiltersBar) | -- |
| `GET /api/statsbomb/seasons` | On mount (SetPieceMatchFiltersBar) | -- |
| `GET /api/statsbomb/default-season` | On mount, after team loaded | `team_id` |
| `GET /api/statsbomb/matches` | When team+season selected | `team_id`, `season_id`, optionally `match_id` |
| `GET /api/statsbomb/set-pieces` | When match selected (single) | `match_id` |
| `GET /api/statsbomb/set-pieces` | When all-season toggled on | `team_id`, `season_id`, `all_season_set_pieces=true` |
| `GET /api/wyscout/match-id` | When "Set piece video" clicked | `statsbomb_match_id` |
| `GET /api/wyscout/offsets` | After match-id resolved | `wyscout_match_id` |
| `GET /api/wyscout/urls` | After offsets resolved | `wyscout_match_id`, `start_timestamp`, `end_timestamp` |

### State Architecture

```
SetPiecesDashboard (root)
  |
  |-- State: selectedTeamId (default 234), selectedSeasonId, selectedMatch
  |-- State: allSeasonSetPieces (boolean), matchQuery, matchDropdownOpen
  |-- State: teams[], seasons[], matches[], setPieces[]
  |-- State: loading/error flags for matches and set pieces
  |-- State: hoveredId, selectedId
  |-- State: directIndirectTab ("direct" | "indirect")
  |-- State: pitchViewMode ("zones" | "individual")
  |-- State: pitchScale, goalScale (from ResizeObserver)
  |-- State: selectedTaker, selectedFirstContact (for bar chart cross-highlighting)
  |-- State: filters { attackDefense, period, spType, spZone, side, technique, target, player }
  |-- State: requestedMatchId, requestedSeasonId (from URL search params)
  |-- Derived: filteredMatches (fuzzysort over matches using matchQuery)
  |-- Derived: baseFilteredSetPieces (useMemo: all active filters applied)
  |-- Derived: pitchMapSetPieces (useMemo: baseFiltered + coordinate validity check)
  |-- Derived: directGoalMapSetPieces (useMemo: direct + has end location)
  |-- Derived: zoneStats (useMemo: aggregated count/avgXg/firstContactWinRate per zone)
  |-- Derived: summaryStats (useMemo: totals computed from baseFilteredSetPieces)
  |-- Derived: takersData, firstContactsData, outcomesData, cornerTechniqueData (useMemo)
  |-- Derived: filter option lists (periodOptions, spTypeOptions, sideOptions, etc.)
  |
  |-- SetPieceMatchFiltersBar (reads/sets: team, season, match, allSeason)
  |-- Tabs (reads/sets: directIndirectTab)
  |-- SetPieceFiltersBar (reads/sets: all filter values; reads: option lists)
  |-- SetPieceStatsBar (reads: summaryStats)
  |-- SetPiecesPitchMap (reads: pitchMapSetPieces, hoveredId, selectedId, viewMode, zoneStats)
  |   |-- SetPiecesLayer (individual mode)
  |   |   |-- CornerDotsLayer
  |   |-- ZonePitchLayer (zone mode)
  |   |   |-- CornerDotsLayer
  |-- SetPiecesGoalMap (reads: directGoalMapSetPieces; direct tab only)
  |   |-- DirectSetPiecesGoalLayer
  |-- CornerTechniqueBar (reads: cornerTechniqueData; conditional)
  |-- SetPieceDetailsPane (reads: activeSetPiece, matchId, isDirect)
  |   |-- SetPieceDetailsList
  |   |-- LegendOutcome / LegendXgSize (direct) or inline legend (indirect)
  |   |-- Video overlay (on demand)
  |-- TakersBarChart (reads: takersData; hidden when defensive)
  |-- FirstContactsBarChart (reads: firstContactsData; indirect only)
  |-- OutcomeBarChart (reads: outcomesData; direct only)
```

### SetPiece Data Shape (from API)

```typescript
type SetPiece = {
  match_id: number;
  start_event_id: number;
  team_id: number;
  team_name: string | null;
  period: number | null;
  start_time: string | null;      // "HH:MM:SS.fff" timestamp
  end_time: string | null;        // "HH:MM:SS.fff" timestamp
  location_x: number | null;      // StatsBomb x (0-120) - delivery origin
  location_y: number | null;      // StatsBomb y (0-80) - delivery origin
  shot_outcome_name: string | null; // "Goal", "Saved", "Blocked", "Off T", etc.
  shot_statsbomb_xg: number | null;
  shot_shot_execution_xg: number | null;
  shot_end_location_x: number | null;
  shot_end_location_y: number | null;
  shot_end_location_z: number | null;  // Height (for goal map)
  sp_type: string | null;         // "Corner", "Free Kick", "Throw-in", "Penalty", etc.
  sp_zone: string | null;         // Zone name from StatsBomb
  side: string | null;            // "Left", "Right"
  technique: string | null;       // "Inswing", "Outswing", "Short", "Driven", etc.
  taker_id: number | null;
  taker: string | null;           // Taker player name
  delivered_first_phase: boolean | null;
  is_short: boolean | null;
  is_long_throw: boolean | null;
  is_direct_sp: boolean | null;   // true = direct (shot from set piece), false = indirect (delivery)
  target: string | null;          // Target player name
  shots: number | null;
  goal: boolean | number | null;
  xg: number | null;              // Possession-level xG
  delivered_first_phase_player_id: number | null;
  delivered_first_phase_player: string | null;
  delivered_first_phase_event_id: number | null;
  first_phase_first_contact_player_id: number | null;
  first_phase_first_contact_player: string | null;
  first_contact_won: boolean | null;
  first_phase_first_contact_event_id: number | null;
  first_phase_first_contact_x: number | null;  // Position of first contact
  first_phase_first_contact_y: number | null;
  first_phase_first_contact_team_id: number | null;
  first_phase_first_contact_shot: boolean | null;
  first_phase_first_contact_goal: boolean | null;
  first_phase_first_contact_xg: number | null;
  second_ball_won: boolean | null;
  second_ball_event_id: number | null;
  second_ball_x: number | null;
  second_ball_y: number | null;
  penalty_event_id: number | null;
};

type MatchRow = {
  match_id: number;
  season_id: number | null;
  match_label: string;
  selected_team_name: string;
  opposition_team_name: string;
  selected_team_id: number | null;
  opposition_team_id: number | null;
};

type MatchOption = MatchRow & { label: string };

type SetPieceSummaryStats = {
  totalSetPieces: number;
  goals: number;
  totalXg: number;
  firstContactWon: number;
  firstPhaseShots: number;
  firstPhaseGoals: number;
  shortPct: number;
  goalsPerSp: number;
  xgPerSp: number;
};
```

---

## Tasks / Subtasks

- [ ] **Task 1: Create TypeScript types and utility files** (AC: 8, 18)
  - [ ] 1.1: Create `apps/web/src/components/dashboards/set-pieces/types.ts` with `SetPiece`, `MatchRow`, `MatchOption`, `SetPieceSummaryStats` types (exact shapes above)
  - [ ] 1.2: Create `apps/web/src/components/dashboards/set-pieces/utils.ts` with `parseTimestamp(timestamp)` and `getMatchMinute(timestamp, period)` functions
  - [ ] 1.3: Create `apps/web/src/components/dashboards/set-pieces/set-piece-zones.ts` with:
    - `ZoneVertex`, `ZonePolygon`, `ZoneAssignment` types
    - `RAW_ZONES` constant (8 zones x 2 sides x 4 vertices = 64 raw entries with exact StatsBomb coordinates as specified in AC 8)
    - `mapToPitch(x, y)` function: `[y, 120 - x]`
    - `ZONE_POLYGONS` computed constant (grouped by `{id}-{side}`, vertices sorted by `shapeNum`, mapped through `mapToPitch`)
    - `pointInPolygon(px, py, points)` using ray-casting algorithm
    - `resolveSide(sp)` to determine Left/Right from set piece data
    - `assignToZone(x, y, side)` to find matching zone polygon
    - `getSetPieceZone(sp)` to resolve zone for a set piece (direct uses `location_x/y`, indirect uses `first_phase_first_contact_x/y` or `second_ball_x/y`)

- [ ] **Task 2: Create SetPiecesLayer and CornerDotsLayer** (AC: 6)
  - [ ] 2.1: Create `apps/web/src/components/dashboards/set-pieces/set-pieces-layer.tsx`
  - [ ] 2.2: Implement `mapToHalfPitch(x, y)` helper: `{ sx: y, sy: 120 - x }`
  - [ ] 2.3: Implement `getFirstContactColor(firstContactWon, isAttacking)`: blue for good outcome, red for bad, null if unknown
  - [ ] 2.4: Implement `getOutcomeColor(outcome)`: map goal/saved/blocked/off-target to colors
  - [ ] 2.5: Implement `getShotRadius(xg)`: `clamp(0.9 + xg * 3.2, 0.9, 3.2)`
  - [ ] 2.6: Render each set piece as `<circle>` with coordinate mapping, conditional fill, radius, opacity logic (dim on hover/select/taker/firstContact), click/hover handlers
  - [ ] 2.7: Create `apps/web/src/components/dashboards/set-pieces/corner-dots-layer.tsx` for corner origin markers
  - [ ] 2.8: Add `"use client"` directive to both files

- [ ] **Task 3: Create ZonePitchLayer** (AC: 7)
  - [ ] 3.1: Create `apps/web/src/components/dashboards/set-pieces/zone-pitch-layer.tsx`
  - [ ] 3.2: Export `ZoneStats` type: `{ zoneId, zoneName, side, count, avgXg, firstContactWinRate, isAttacking }`
  - [ ] 3.3: Implement `getColorByCount(count, maxCount)`: `rgba(27, 84, 151, 0.2 + (count/maxCount) * 0.8)`
  - [ ] 3.4: Render zone polygons from `ZONE_POLYGONS` filtered by `sideFilter`, with count-based fill color
  - [ ] 3.5: Render zone centroid text showing `avgXg.toFixed(2)` for non-empty zones
  - [ ] 3.6: Add `"use client"` directive

- [ ] **Task 4: Create SetPiecesPitchMap** (AC: 6, 7)
  - [ ] 4.1: Create `apps/web/src/components/dashboards/set-pieces/set-pieces-pitch-map.tsx`
  - [ ] 4.2: Import `PitchBase` from Story 7.2 components
  - [ ] 4.3: Switch between `SetPiecesLayer` (individual mode) and `ZonePitchLayer` + `CornerDotsLayer` (zone mode) based on `viewMode` prop
  - [ ] 4.4: Track pitch scale via `ResizeObserver` on the SVG element (`rect.width / 80`)
  - [ ] 4.5: Add `"use client"` directive

- [ ] **Task 5: Create DirectSetPiecesGoalLayer and SetPiecesGoalMap** (AC: 9)
  - [ ] 5.1: Create `apps/web/src/components/dashboards/set-pieces/direct-set-pieces-goal-layer.tsx`
  - [ ] 5.2: Create `apps/web/src/components/dashboards/set-pieces/set-pieces-goal-map.tsx`
  - [ ] 5.3: Import `GoalBase` from Story 7.2 components
  - [ ] 5.4: Render direct set pieces with shot end locations mapped to goal frame coordinates
  - [ ] 5.5: Apply same color/radius/opacity rules as direct mode pitch map
  - [ ] 5.6: Track goal scale via `GoalBase` `onScaleChange` callback
  - [ ] 5.7: Add `"use client"` directive to both files

- [ ] **Task 6: Create SetPieceMatchFiltersBar** (AC: 2)
  - [ ] 6.1: Create `apps/web/src/components/dashboards/set-pieces/set-piece-match-filters-bar.tsx`
  - [ ] 6.2: Implement team dropdown (`Select` from shadcn/ui)
  - [ ] 6.3: Implement season dropdown with "All Seasons" option
  - [ ] 6.4: Implement match search input with fuzzy dropdown (custom dropdown div, `fuzzysort` matching on `label`, `selected_team_name`, `opposition_team_name`)
  - [ ] 6.5: Implement "All set pieces in season" checkbox toggle (disables match input when checked)
  - [ ] 6.6: Handle match dropdown open/close with blur timeout (150ms)
  - [ ] 6.7: Add `"use client"` directive

- [ ] **Task 7: Create SetPieceFiltersBar** (AC: 4, 5)
  - [ ] 7.1: Create `apps/web/src/components/dashboards/set-pieces/set-piece-filters-bar.tsx`
  - [ ] 7.2: Implement all filter dropdowns as `Select` components with dynamic options
  - [ ] 7.3: Conditionally hide attack/defense, half, technique, and target filters in direct mode
  - [ ] 7.4: Implement "Reset Filters" button
  - [ ] 7.5: Responsive grid layout: 2 columns mobile, 4 columns tablet, 9 columns desktop (indirect) or 5 columns (direct)
  - [ ] 7.6: Add `"use client"` directive

- [ ] **Task 8: Create SetPieceDetailsPane with video integration** (AC: 10, 11)
  - [ ] 8.1: Create `apps/web/src/components/dashboards/set-pieces/set-piece-details-pane.tsx`
  - [ ] 8.2: Create `apps/web/src/components/dashboards/set-pieces/set-piece-details-list.tsx`
  - [ ] 8.3: Display set piece details (all relevant fields from `SetPiece` type)
  - [ ] 8.4: Implement "Set piece video" button triggering the Wyscout flow (match-id -> offsets -> timestamp calc -> urls)
  - [ ] 8.5: Parse timestamps using `parseTimestamp()`, add period offsets, apply -3s/+5s padding
  - [ ] 8.6: Render full-screen overlay with `<video>` element (`controls`, `autoPlay`, `maxHeight: 80vh`)
  - [ ] 8.7: Handle loading ("Loading..."), error (destructive text), and video display states
  - [ ] 8.8: Create `apps/web/src/components/dashboards/set-pieces/legend-outcome.tsx`
  - [ ] 8.9: Create `apps/web/src/components/dashboards/set-pieces/legend-xg-size.tsx`
  - [ ] 8.10: Switch between direct legend (LegendOutcome + LegendXgSize) and indirect legend (inline first-contact won/lost)
  - [ ] 8.11: Add `"use client"` directive to all files

- [ ] **Task 9: Create SetPieceStatsBar** (AC: 12)
  - [ ] 9.1: Create `apps/web/src/components/dashboards/set-pieces/set-piece-stats-bar.tsx`
  - [ ] 9.2: Accept `SetPieceSummaryStats` as props
  - [ ] 9.3: Display all 9 stats in card/badge format
  - [ ] 9.4: Format percentages and ratios appropriately

- [ ] **Task 10: Create bar chart components** (AC: 13, 14, 15, 16)
  - [ ] 10.1: Create `apps/web/src/components/dashboards/set-pieces/corner-technique-bar.tsx` (Recharts bar chart: technique x count with percentage)
  - [ ] 10.2: Create `apps/web/src/components/dashboards/set-pieces/takers-bar-chart.tsx` (Recharts horizontal bar chart: taker name x count, with click-to-highlight interaction)
  - [ ] 10.3: Create `apps/web/src/components/dashboards/set-pieces/first-contacts-bar-chart.tsx` (Recharts horizontal bar chart: first contact player x count, with click-to-highlight)
  - [ ] 10.4: Create `apps/web/src/components/dashboards/set-pieces/outcome-bar-chart.tsx` (Recharts horizontal bar chart: outcome x count)
  - [ ] 10.5: Add `"use client"` directive to all chart files

- [ ] **Task 11: Create SetPiecesDashboard orchestrator** (AC: 1, 2, 3, 4, 5, 17)
  - [ ] 11.1: Create `apps/web/src/components/dashboards/set-pieces/set-pieces-dashboard.tsx`
  - [ ] 11.2: Manage all state (~25 state variables as listed in State Architecture above)
  - [ ] 11.3: Implement URL search params parsing (`team_id`, `season_id`, `match_id`, `return_to`, `post_match_match_id`)
  - [ ] 11.4: Implement data fetching effects: teams+seasons on mount, default season on team change, matches on team+season change, set pieces on match or all-season change
  - [ ] 11.5: Implement `filteredMatches` with `fuzzysort` (threshold 0.3, keys: label, selected_team_name, opposition_team_name)
  - [ ] 11.6: Implement filter option derivation (useMemo for each: periodOptions, spTypeOptions, sideOptions, techniqueOptions, targetOptions, playerOptions)
  - [ ] 11.7: Implement auto-filter adjustment effects (type defaults, corner side, player reset, attack/defense on match select)
  - [ ] 11.8: Implement `baseFilteredSetPieces` with `useMemo`: apply all active filters (attack/defense, period, type, zone, side, technique, target, player, direct/indirect)
  - [ ] 11.9: Implement `pitchMapSetPieces` with `useMemo`: baseFiltered + coordinate validity + attacking half check for indirect
  - [ ] 11.10: Implement `directGoalMapSetPieces` with `useMemo`: direct + has end location
  - [ ] 11.11: Implement `zoneStats` with `useMemo`: aggregate by zone (count, totalXg, firstContactWon per zone-side key)
  - [ ] 11.12: Implement `summaryStats` with `useMemo`: compute all 9 stats from baseFilteredSetPieces
  - [ ] 11.13: Implement chart data derivations: `takersData`, `firstContactsData`, `outcomesData`, `cornerTechniqueData`
  - [ ] 11.14: Implement `handleSetPieceSelect` callback that also auto-sets attack/defense filter based on selected set piece's team
  - [ ] 11.15: Implement `handleResetFilters` callback
  - [ ] 11.16: Wire all child components with props and callbacks
  - [ ] 11.17: Handle loading (Skeleton), error (destructive card), and empty states
  - [ ] 11.18: Layout: two-column grid (2fr pitch + charts left, 1fr details + bar charts right) with responsive fallback
  - [ ] 11.19: Implement "Back to Post Match" button when `return_to=post-match` search param is present

- [ ] **Task 12: Create dashboard page** (AC: 1)
  - [ ] 12.1: Create `apps/web/src/app/(dashboard)/dashboards/set-pieces/page.tsx`
  - [ ] 12.2: Add `"use client"` directive
  - [ ] 12.3: Import and render `SetPiecesDashboard`
  - [ ] 12.4: Verify the page is accessible via gallery navigation from Story 9.1

- [ ] **Task 13: Create barrel export and verify** (AC: 18)
  - [ ] 13.1: Create `apps/web/src/components/dashboards/set-pieces/index.ts` exporting all public components
  - [ ] 13.2: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 13.3: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This is the most complex dashboard in the platform. All set piece data is fetched once per match or season selection, then filtered client-side through ~8 combinable filter dimensions. The state lives in `SetPiecesDashboard` and flows down as props. The dashboard has two primary modes (direct/indirect) that fundamentally change the visualization and available filters. Video fetching is lazy (triggered on demand per set piece).

```
Page (/dashboards/set-pieces)
  |
  v
SetPiecesDashboard (state + data fetching + ~25 state vars + ~12 useMemo derivations)
  |
  |-- SetPieceMatchFiltersBar --> fetches teams/seasons/matches, fuzzy search
  |-- Tabs                    --> direct/indirect toggle
  |-- SetPieceFiltersBar      --> 8 filter dropdowns (conditional visibility)
  |-- SetPieceStatsBar        --> 9 computed stats
  |-- SetPiecesPitchMap        --> PitchBase + SetPiecesLayer OR ZonePitchLayer
  |   |-- SetPiecesLayer      --> individual circles with outcome/first-contact colors
  |   |   |-- CornerDotsLayer --> corner origin markers
  |   |-- ZonePitchLayer      --> zone polygons (zone mode only)
  |   |   |-- CornerDotsLayer
  |-- SetPiecesGoalMap        --> GoalBase + DirectSetPiecesGoalLayer (direct only)
  |-- CornerTechniqueBar      --> corner technique distribution (conditional)
  |-- SetPieceDetailsPane     --> details + video + legends
  |   |-- SetPieceDetailsList
  |   |-- LegendOutcome / LegendXgSize (direct)
  |   |-- Video overlay
  |-- TakersBarChart          --> taker frequency (hidden when defensive)
  |-- FirstContactsBarChart   --> first contact distribution (indirect only)
  |-- OutcomeBarChart         --> shot outcome distribution (direct only)
```

### Source Files (from football-dashboard-2)

| Source File | Maps To |
|---|---|
| `football-dashboard-2/src/app/(dashboard)/dashboards/set-pieces/page-content.tsx` | `set-pieces-dashboard.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPieceMatchFiltersBar.tsx` | `set-piece-match-filters-bar.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPieceFiltersBar.tsx` | `set-piece-filters-bar.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPieceStatsBar.tsx` | `set-piece-stats-bar.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPiecesPitchMap.tsx` | `set-pieces-pitch-map.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPiecesLayer.tsx` | `set-pieces-layer.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/CornerDotsLayer.tsx` | `corner-dots-layer.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/ZonePitchLayer.tsx` | `zone-pitch-layer.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPiecesGoalMap.tsx` | `set-pieces-goal-map.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/DirectSetPiecesGoalLayer.tsx` | `direct-set-pieces-goal-layer.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPieceDetailsPane.tsx` | `set-piece-details-pane.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/SetPieceDetailsList.tsx` | `set-piece-details-list.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/LegendOutcome.tsx` | `legend-outcome.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/LegendXgSize.tsx` | `legend-xg-size.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/CornerTechniqueBar.tsx` | `corner-technique-bar.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/FirstContactsBarChart.tsx` | `first-contacts-bar-chart.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/OutcomeBarChart.tsx` | `outcome-bar-chart.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/TakersBarChart.tsx` | `takers-bar-chart.tsx` |
| `football-dashboard-2/.../set-pieces/(components)/set-piece-zones.ts` | `set-piece-zones.ts` |
| `football-dashboard-2/.../set-pieces/(components)/types.ts` | `types.ts` |
| `football-dashboard-2/.../set-pieces/(components)/utils.ts` | `utils.ts` |
| `football-dashboard-2/queries/set-pieces-by-match.sql` | Reference only (API route in Story 8.1) |
| `football-dashboard-2/queries/set-pieces-by-season.sql` | Reference only (API route in Story 8.1) |

### Files to Create

All files under `apps/web/src/components/dashboards/set-pieces/`:
1. `types.ts`
2. `utils.ts`
3. `set-piece-zones.ts`
4. `corner-dots-layer.tsx`
5. `set-pieces-layer.tsx`
6. `zone-pitch-layer.tsx`
7. `set-pieces-pitch-map.tsx`
8. `direct-set-pieces-goal-layer.tsx`
9. `set-pieces-goal-map.tsx`
10. `set-piece-match-filters-bar.tsx`
11. `set-piece-filters-bar.tsx`
12. `set-piece-stats-bar.tsx`
13. `set-piece-details-list.tsx`
14. `set-piece-details-pane.tsx`
15. `legend-outcome.tsx`
16. `legend-xg-size.tsx`
17. `corner-technique-bar.tsx`
18. `first-contacts-bar-chart.tsx`
19. `outcome-bar-chart.tsx`
20. `takers-bar-chart.tsx`
21. `set-pieces-dashboard.tsx`
22. `index.ts`

Plus the page file:
23. `apps/web/src/app/(dashboard)/dashboards/set-pieces/page.tsx`

### Files NOT to Modify

- Anything under `packages/backend/convex/` -- this dashboard has no Convex writes
- Existing API routes in `apps/admin/` -- consumed as-is from Stories 8.1 and 8.3
- Pitch components from Story 7.2 -- consumed as dependencies, not modified
- Any global layout or navigation files (gallery routing is Story 9.1's responsibility)

### Key Decisions

1. **Client-side filtering** -- Set piece data is fetched once and filtered in-memory via `useMemo` through ~8 filter dimensions. This avoids redundant API calls when toggling filters. Season view can return hundreds of set pieces which is well within client-side filtering performance.

2. **Direct vs Indirect as primary mode split** -- The dashboard fundamentally operates in two modes. Direct set pieces (Free Kicks, Corners, Penalties taken as shots) use `location_x/y` for position and show shot outcomes. Indirect set pieces show first-contact positions and first-contact-won outcomes. The mode changes available filters, chart types, legends, and visualization.

3. **Zone polygon definitions are static** -- The 16 zone polygons (8 zones x 2 sides) are computed once at module load from `RAW_ZONES` using `mapToPitch`. They are used for both the zone overlay visualization and the `getSetPieceZone` assignment function.

4. **Video fetching is lazy** -- Wyscout API calls only happen when the user clicks "Set piece video", not when a set piece is selected. This respects Wyscout rate limits and avoids unnecessary load.

5. **Cross-highlighting between bar charts and pitch** -- Clicking a bar in TakersBarChart or FirstContactsBarChart sets `selectedTaker`/`selectedFirstContact`, which dims non-matching dots on the pitch to `opacity: 0.25`. This provides drill-down analysis without changing the filter state.

6. **Fuzzy match search** -- Uses `fuzzysort` library (already in the old project) with threshold 0.3 and multi-key matching on `label`, `selected_team_name`, and `opposition_team_name`.

7. **URL search params for deep linking** -- The dashboard reads `team_id`, `season_id`, `match_id`, `return_to`, and `post_match_match_id` from URL search params to support navigation from the Post-Match dashboard and direct links.

### Coordinate System Reference

```
StatsBomb pitch (120x80, horizontal):         SVG half-pitch (80x120, vertical):
  0,0 ──────────────── 120,0                   0,0 ──────── 80,0
  |                        |                   |  (goal)       |
  |   ← defending  attacking →                |               |
  |                        |                   |               |
  0,80 ─────────────── 120,80                  0,120 ─────── 80,120

  Mapping: svg_x = sb_y                        For indirect: only set pieces
           svg_y = 120 - sb_x                  with sb_x >= 60 are shown
```

### Testing Approach

- **Visual testing:** Render the dashboard with known set piece data and verify circle positions, zone polygons, colors, and sizes match expected values
- **Filter testing:** Toggle each of the 8 filters and verify the pitch, charts, stats, and details all update correctly
- **Mode testing:** Switch between direct/indirect tabs and verify the UI reconfigures (filters, charts, legends, pitch rendering)
- **Zone view testing:** Toggle between individual and zone view modes and verify polygons render with correct opacity and centroid text
- **Video flow:** Click "Set piece video" on a set piece and verify the Wyscout API chain executes and video overlay plays
- **Cross-highlight:** Click taker/first-contact bars and verify pitch dots dim accordingly
- **Edge cases:** Empty match (no set pieces), season view with hundreds of set pieces, set pieces with null coordinates, all-season toggle
- **Deep linking:** Navigate with `?match_id=X&team_id=Y` params and verify correct auto-selection
- **Responsive:** Verify pitch, filters, and layout render correctly at different viewport widths
- **No automated tests required in this story** -- visual/interactive testing is primary validation method

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10, Story 10.3]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-7.2-port-pitch-visualization-components.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.1-statsbomb-postgresql-connection-api-routes.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.3-hudl-wyscout-video-integration.md]
- [Source: football-dashboard-2/src/app/(dashboard)/dashboards/set-pieces/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
