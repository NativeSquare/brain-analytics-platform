# Story 10.1: Event Map Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 8

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. The dashboard page lives at `apps/web/src/app/(app)/dashboards/event-map/`. Dashboard-specific components go in `apps/web/src/components/dashboards/event-map/`. Data is fetched from StatsBomb API routes created in Story 8.1 and Wyscout video routes from Story 8.3. Pitch components from Story 7.2 (`FullPitchBase`) and chart components from Story 7.3 are consumed as dependencies. Convex is NOT involved in data fetching -- these are read-only external data sources accessed via Next.js API routes.

## Story

As a football analyst or coach,
I want an Event Map dashboard that visualizes interceptions, fouls, and regains on a full pitch with zone statistics, clickable event details, and embedded Wyscout video clips,
so that I can analyze defensive and transitional event patterns with spatial context and video evidence.

## Dependencies

| Dependency | What it provides |
|------------|-----------------|
| Story 9.1 | Dashboard gallery routing, slug-based navigation (`/dashboards/event-map`) |
| Story 8.1 | StatsBomb API routes: `/api/statsbomb/teams`, `/seasons`, `/managers`, `/matches`, `/events` |
| Story 8.3 | Wyscout video integration: `/api/wyscout/match-id`, `/offsets`, `/urls` |
| Story 7.2 | `FullPitchBase` (full-pitch SVG, viewBox `0 0 80 120`, vertical orientation) |
| Story 7.3 | Recharts bar chart components for zone distribution chart |

## Acceptance Criteria (BDD)

### AC 1: Dashboard page is accessible via gallery routing

**Given** the dashboard gallery from Story 9.1 is rendered
**When** the user navigates to `/dashboards/event-map`
**Then** the Event Map dashboard page loads with the slug `event-map`
**And** the page uses a server component that pre-fetches initial filter data (teams, seasons, managers) and passes them to the client component
**And** the page renders five components: `EventMapFilterBar`, `EventMapClient` (with tabs), `EventPitchMap`, `EventDetailsPane` (initially hidden), and `PlayerStatsChart`

### AC 2: Server component pre-fetches initial filter data

**Given** the Event Map page loads
**When** the server component renders
**Then** it calls `getTeams()`, `getSeasons()`, and `getManagers()` server-side
**And** it pre-fetches the available matches for the default team/season/manager combination
**And** it passes the initial teams, seasons, managers, and matches lists as props to `EventMapClient`
**And** errors during server fetch display a user-friendly error state (not a raw error)

### AC 3: EventMapFilterBar provides cascading filter controls

**Given** the `EventMapFilterBar` component renders with initial filter data from the server
**When** the component mounts
**Then** it displays the following dropdowns pre-populated from server data:

| Filter | Source | Behavior |
|--------|--------|----------|
| Team | `getTeams()` (server-rendered) | Defaults to UC Sampdoria (from app config) |
| Season | `getSeasons()` (server-rendered) | Defaults to most recent season |
| Manager | `getManagers()` (server-rendered) | Defaults to current manager or "All" |
| Match | Pre-fetched for defaults, re-fetched on filter change | Displays opponent name, date, venue |
| Venue | Derived from match data | Home / Away / All (toggle or dropdown) |

**When** the user changes the Team, Season, or Manager dropdown
**Then** the Match dropdown re-fetches from `/api/statsbomb/matches` with the updated filter parameters
**And** the Match dropdown shows a loading/disabled state during the fetch
**And** if zero matches are returned, the dropdown displays "No matches found"

**When** a match is selected
**Then** event data is fetched client-side based on the active event type tab

### AC 4: EventMapClient manages tab selection and delegates to EventPitchMap

**Given** the `EventMapClient` component renders with filter data
**When** the component mounts
**Then** it displays three event type tabs: **Interceptions**, **Fouls**, **Regains**
**And** the default active tab is "Interceptions"
**And** the active tab has a visually distinct selected state (highlighted background or underline)

**When** the user clicks a different event type tab
**Then** the active tab state updates
**And** a new fetch is triggered to `/api/statsbomb/events?match_id={id}&event_type={interceptions|fouls|regains}`
**And** the previous event data is cleared before the new data renders (no stale overlay)
**And** the `EventPitchMap` re-renders with the new event data
**And** the `PlayerStatsChart` re-renders with the new zone distribution
**And** the `EventDetailsPane` closes if it was open (selected event is cleared)

### AC 5: EventPitchMap renders events on full-pitch SVG with zone stats

**Given** event data has been fetched for the selected match and event type
**When** the `EventPitchMap` renders
**Then** it uses `FullPitchBase` from Story 7.2 as the base SVG (viewBox `0 0 80 120`)
**And** each event is rendered as an SVG `<circle>` element inside `FullPitchBase`'s children slot

**Event circle rendering:**
- Each event is plotted at its StatsBomb coordinates mapped to the vertical SVG
- Coordinate mapping:
  - `svg_x = statsbomb_y` (maps [0-80] to [0-80] viewBox width)
  - `svg_y = 120 - statsbomb_x` (maps [0-120] to [0-120] viewBox height, inverted so attacking goal is at top)
- Circle `r` (radius) varies by importance/value: base radius of `1.5`, scaled up to `3` for high-value events
- Circles have `cursor: pointer`, `opacity: 0.8`, `fill` based on event type tab color
- Circles have a `stroke` of `white` with `strokeWidth: 0.3` for visibility against the pitch

**Pitch zone division:**
- The pitch is divided into three horizontal thirds by dashed lines at `svg_y = 40` and `svg_y = 80`
- Top third (svg_y 0-40) = ATT (attacking third)
- Middle third (svg_y 40-80) = MID (midfield third)
- Bottom third (svg_y 80-120) = DEF (defensive third)
- Dashed lines use `stroke-dasharray="2,2"` with `stroke: rgba(255,255,255,0.4)`

**Right-side zone statistics panel (adornment slot):**
- A vertical panel is rendered to the right of the pitch visualization
- The panel displays three zone percentage rows:

| Zone | Calculation | Display |
|------|-------------|---------|
| ATT | `(events in ATT third / total events) * 100` | e.g., "ATT 32%" |
| MID | `(events in MID third / total events) * 100` | e.g., "MID 45%" |
| DEF | `(events in DEF third / total events) * 100` | e.g., "DEF 23%" |

- Zone classification uses StatsBomb x-coordinate:
  - ATT: `statsbomb_x >= 80` (attacking third)
  - MID: `statsbomb_x >= 40 AND statsbomb_x < 80` (midfield third)
  - DEF: `statsbomb_x < 40` (defensive third)
- Each zone row shows the zone label, percentage, and event count
- Percentages are formatted to 0 decimal places and must sum to 100% (round last zone to remainder)

### AC 6: Event hover and click interactions

**Given** events are plotted on the `EventPitchMap`
**When** the user hovers over an event circle
**Then** the circle scales up (e.g., `transform: scale(1.5)`) with a smooth CSS transition
**And** the circle opacity increases to `1.0`
**And** the circle gains a thicker stroke (e.g., `strokeWidth: 0.6`)

**When** the user clicks an event circle
**Then** the clicked event becomes the selected event
**And** the selected circle has a persistent highlight (thicker stroke `strokeWidth: 0.8`, `stroke: #fbbf24` amber)
**And** the `EventDetailsPane` opens/updates with the selected event's details
**And** clicking the same event again deselects it and closes the `EventDetailsPane`

### AC 7: EventDetailsPane shows event details with video integration

**Given** the user has clicked on an event circle on the pitch
**When** the `EventDetailsPane` renders
**Then** it displays the following event details:

| Field | Source | Display Format |
|-------|--------|---------------|
| Player Name | `event.player_name` | Full name |
| Minute | `event.minute` + optional `event.added_time` | e.g., "34'" or "90+2'" |
| Event Type | `event.type` | e.g., "Interception", "Foul", "Ball Recovery" |
| Location | Derived from StatsBomb coordinates + zone | e.g., "Midfield - Left Channel" |
| Outcome | `event.outcome` | e.g., "Won", "Lost", "Success" |

**And** a close button (X) is displayed in the top-right corner of the pane

**Location description derivation:**
- Zone (vertical): ATT / MID / DEF based on `statsbomb_x` thresholds (same as AC 5)
- Channel (horizontal): Left (`statsbomb_y < 26.67`), Central (`26.67 <= statsbomb_y < 53.33`), Right (`statsbomb_y >= 53.33`)
- Combined: e.g., "Attacking Third - Right Channel", "Defensive Third - Central"

**Video clip button (Wyscout integration):**

**Given** the `EventDetailsPane` is displaying event details
**When** the pane renders
**Then** a "Watch Video" button is displayed below the event details

**When** the user clicks "Watch Video"
**Then** the system executes the Wyscout video flow:
  1. Calls `GET /api/wyscout/match-id?statsbomb_match_id={match_id}` to get the Wyscout match ID
  2. Calls `GET /api/wyscout/offsets?wyscout_match_id={id}` to get period start offsets
  3. Calculates `start_ts = period_offset + event_timestamp_seconds - 5` and `end_ts = period_offset + event_timestamp_seconds + 5` (approximately 5-second padding before and after the event)
  4. Calls `GET /api/wyscout/urls?wyscout_match_id={id}&start_timestamp={start_ts}&end_timestamp={end_ts}`
  5. Renders the video in an HTML5 `<video>` player embedded within the `EventDetailsPane`
**And** while the video URL is loading, a spinner/skeleton is shown in the video area
**And** if the video fetch fails at any step, a "Video unavailable" message is shown (no crash, no unhandled errors)
**And** the video player has `controls` and `autoPlay` attributes

**When** the user clicks on a different event
**Then** the `EventDetailsPane` updates with the new event's details
**And** any currently playing video is stopped and the video area resets (ready for a new "Watch Video" click)

**When** the user clicks the close button
**Then** the `EventDetailsPane` closes
**And** the selected event is deselected on the pitch
**And** any playing video is stopped

### AC 8: PlayerStatsChart shows zone distribution bar chart

**Given** event data has been fetched for the selected match and event type
**When** the `PlayerStatsChart` renders
**Then** it displays a horizontal or vertical bar chart showing event count distribution by pitch zone
**And** the chart has three bars: ATT, MID, DEF
**And** each bar's value is the count of events in that zone (using the same zone classification as AC 5)
**And** each bar is labeled with the zone name and count value
**And** the chart uses Recharts `BarChart` component from Story 7.3
**And** the chart title reflects the active event type (e.g., "Interceptions by Zone", "Fouls by Zone", "Regains by Zone")

**When** the user switches event type tabs
**Then** the chart re-renders with the new event data's zone distribution
**And** the chart title updates to reflect the new event type

### AC 9: Loading, empty, and error states are handled

**Given** the dashboard is loading event data from the API
**When** the API request is in flight
**Then** the `EventPitchMap` area shows a skeleton loader (pitch outline with no event markers)
**And** the zone stats panel shows placeholder values ("--")
**And** the `PlayerStatsChart` shows a skeleton bar chart

**Given** the API returns zero events for the selected match and event type
**When** the dashboard renders
**Then** the `EventPitchMap` shows the empty pitch with a centered message: "No {event type} found for this match"
**And** the zone stats panel shows "0%" for all zones
**And** the `PlayerStatsChart` shows empty bars with zero values

**Given** the API request fails
**When** the dashboard attempts to render
**Then** an error banner is displayed above the dashboard: "Failed to load event data. Please try again."
**And** a "Retry" button is available that re-fetches the data
**And** the error is logged to the console with the full error details

### AC 10: TypeScript types and lint pass

**Given** all Event Map dashboard files have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors
**And** all components use proper TypeScript types (no `any` casts)

---

## Components Inventory (5 total)

| # | Component | File | Description |
|---|-----------|------|-------------|
| 1 | `EventMapFilterBar` | `event-map-filter-bar.tsx` | Team/Season/Manager/Match/Venue cascading dropdowns (server-rendered initial data) |
| 2 | `EventMapClient` | `event-map-client.tsx` | Client wrapper with event type tab selection (Interceptions/Fouls/Regains), manages active tab state, orchestrates data fetching and delegates to child components |
| 3 | `EventPitchMap` | `event-pitch-map.tsx` | Full-pitch SVG (FullPitchBase) with event circles plotted at StatsBomb coordinates, pitch zone dividers, right-side zone stats panel |
| 4 | `EventDetailsPane` | `event-details-pane.tsx` | Selected event detail panel with player name, minute, event type, location description, outcome, and Wyscout video clip button |
| 5 | `PlayerStatsChart` | `player-stats-chart.tsx` | Recharts bar chart showing event count distribution by pitch zone (ATT/MID/DEF thirds) |

---

## Data Flow

### Server/Client Split

```
/dashboards/event-map/page.tsx (server component)
  |
  |-- fetches teams, seasons, managers server-side
  |-- pre-fetches matches for default filters
  |-- renders EventMapClient (client component)
        |
        |-- EventMapFilterBar (reads server-provided filter data, manages filter state)
        |-- Tab selection (Interceptions / Fouls / Regains)
        |-- fetches events client-side (on match + event type change)
        |-- EventPitchMap (FullPitchBase + event circles + zone stats panel)
        |-- EventDetailsPane (selected event info + Wyscout video on demand)
        |-- PlayerStatsChart (zone distribution bar chart)
```

### API Routes Used

| Route | When Called | Parameters |
|-------|-----------|------------|
| `GET /api/statsbomb/teams` | Server-side on page load | -- |
| `GET /api/statsbomb/seasons` | Server-side on page load | `competitionId` |
| `GET /api/statsbomb/managers` | Server-side on page load | -- |
| `GET /api/statsbomb/matches` | Server-side (default) + client-side (on filter change) | `competitionId`, `seasonId`, `teamId`, optionally `managerId` |
| `GET /api/statsbomb/events` | Client-side on match + event type selection | `match_id`, `event_type` (interceptions\|fouls\|regains) |
| `GET /api/wyscout/match-id` | Client-side when "Watch Video" clicked | `statsbomb_match_id` |
| `GET /api/wyscout/offsets` | Client-side after match-id resolved | `wyscout_match_id` |
| `GET /api/wyscout/urls` | Client-side after offsets resolved | `wyscout_match_id`, `start_timestamp`, `end_timestamp` |

### State Architecture

```
EventMapClient (root client component)
  |
  |-- State: selectedTeamId, selectedSeasonId, selectedManagerId, selectedMatchId, venueFilter
  |-- State: activeTab ("interceptions" | "fouls" | "regains")
  |-- State: selectedEventId (string | null)
  |-- State: events (fetched event array for current match + event type)
  |-- State: isLoading, error
  |-- Derived: zoneStats (useMemo -- ATT/MID/DEF counts and percentages)
  |-- Derived: zoneCounts (useMemo -- { att: number, mid: number, def: number })
  |
  |-- EventMapFilterBar (reads/sets: team, season, manager, match, venue)
  |-- EventPitchMap (reads: events, selectedEventId, zoneStats; sets: selectedEventId)
  |-- EventDetailsPane (reads: selectedEvent, matchId; manages: video fetch state)
  |-- PlayerStatsChart (reads: zoneCounts, activeTab)
```

### Event Data Shape (from API)

```typescript
interface PitchEvent {
  id: string;
  match_id: number;
  minute: number;
  second: number;
  added_time?: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  type: string;           // "Interception", "Foul Committed", "Ball Recovery", etc.
  outcome?: string;       // "Won", "Lost", "Success", etc.
  location_x: number;     // StatsBomb x (0-120)
  location_y: number;     // StatsBomb y (0-80)
  period: number;         // 1=1H, 2=2H, 3=ET1, 4=ET2
  timestamp: string;      // Event timestamp within period (e.g., "00:34:12.345")
}
```

### Zone Classification

```typescript
function classifyZone(statsbomb_x: number): "ATT" | "MID" | "DEF" {
  if (statsbomb_x >= 80) return "ATT";
  if (statsbomb_x >= 40) return "MID";
  return "DEF";
}

function classifyChannel(statsbomb_y: number): "Left" | "Central" | "Right" {
  if (statsbomb_y < 26.67) return "Left";
  if (statsbomb_y < 53.33) return "Central";
  return "Right";
}

function describeLocation(statsbomb_x: number, statsbomb_y: number): string {
  const zoneLabels = { ATT: "Attacking Third", MID: "Midfield", DEF: "Defensive Third" };
  return `${zoneLabels[classifyZone(statsbomb_x)]} - ${classifyChannel(statsbomb_y)} Channel`;
}
```

### Coordinate Mapping

```
StatsBomb pitch (120x80, horizontal):       SVG full pitch (80x120, vertical):
  0,0 ──────────────── 120,0                 0,0 ──────── 80,0
  |                        |                  |  (ATT goal) |
  |   ← defending  attacking →               |             |
  |                        |                  |  (DEF goal) |
  0,80 ─────────────── 120,80                0,120 ────── 80,120

  Mapping:
    svg_x = statsbomb_y                      // [0-80] preserved
    svg_y = 120 - statsbomb_x                // [0-120] flipped (attacking at top)
```

```typescript
function sbToFullPitchSvg(sbX: number, sbY: number): { x: number; y: number } {
  return { x: sbY, y: 120 - sbX };
}
```

---

## Tasks / Subtasks

- [ ] **Task 1: Create TypeScript types and constants** (AC: 5, 8, 10)
  - [ ] 1.1: Create `apps/web/src/components/dashboards/event-map/types.ts` with `PitchEvent`, `EventType`, `Zone`, `ZoneStats`, `Channel` interfaces
  - [ ] 1.2: Create `apps/web/src/components/dashboards/event-map/constants.ts` with:
    - Event type tab definitions (`INTERCEPTIONS`, `FOULS`, `REGAINS`)
    - Zone thresholds and classification functions (`classifyZone`, `classifyChannel`, `describeLocation`)
    - Coordinate mapping function (`sbToFullPitchSvg`)
    - Zone divider line positions (svg_y = 40 and svg_y = 80)

- [ ] **Task 2: Create EventMapFilterBar component** (AC: 3)
  - [ ] 2.1: Create `apps/web/src/components/dashboards/event-map/event-map-filter-bar.tsx`
  - [ ] 2.2: Implement Team dropdown (pre-populated from server props, defaults to UC Sampdoria)
  - [ ] 2.3: Implement Season dropdown (pre-populated from server props, defaults to most recent)
  - [ ] 2.4: Implement Manager dropdown (pre-populated from server props)
  - [ ] 2.5: Implement Match dropdown (re-fetches on team/season/manager change)
  - [ ] 2.6: Implement Venue filter (Home / Away / All toggle)
  - [ ] 2.7: Add `"use client"` directive

- [ ] **Task 3: Create EventMapClient orchestrator component** (AC: 1, 4, 9)
  - [ ] 3.1: Create `apps/web/src/components/dashboards/event-map/event-map-client.tsx`
  - [ ] 3.2: Add `"use client"` directive
  - [ ] 3.3: Implement event type tab selection UI (Interceptions / Fouls / Regains)
  - [ ] 3.4: Manage state: activeTab, selectedEventId, events, isLoading, error
  - [ ] 3.5: Fetch events from `/api/statsbomb/events?match_id={id}&event_type={type}` on match or tab change
  - [ ] 3.6: Use AbortController to cancel in-flight requests when parameters change
  - [ ] 3.7: Compute `zoneStats` and `zoneCounts` via `useMemo` from fetched events
  - [ ] 3.8: Wire child components: `EventMapFilterBar`, `EventPitchMap`, `EventDetailsPane`, `PlayerStatsChart`
  - [ ] 3.9: Clear selectedEventId when tab changes
  - [ ] 3.10: Handle loading, empty, and error states per AC 9

- [ ] **Task 4: Create EventPitchMap component** (AC: 5, 6)
  - [ ] 4.1: Create `apps/web/src/components/dashboards/event-map/event-pitch-map.tsx`
  - [ ] 4.2: Import `FullPitchBase` from Story 7.2 components
  - [ ] 4.3: Add `"use client"` directive
  - [ ] 4.4: Map each event through `sbToFullPitchSvg` and render as SVG `<circle>` elements inside `FullPitchBase` children
  - [ ] 4.5: Circle styling: `r` between 1.5-3 (varying by importance), `opacity: 0.8`, `fill` based on event type color, `stroke: white`, `strokeWidth: 0.3`, `cursor: pointer`
  - [ ] 4.6: Render two horizontal dashed lines at svg_y=40 and svg_y=80 for zone dividers (`stroke-dasharray="2,2"`, `stroke: rgba(255,255,255,0.4)`)
  - [ ] 4.7: Implement hover effect: `transform: scale(1.5)`, `opacity: 1.0`, `strokeWidth: 0.6` with CSS transition
  - [ ] 4.8: Implement click handler: set selectedEventId, highlight selected circle (`strokeWidth: 0.8`, `stroke: #fbbf24`)
  - [ ] 4.9: Implement right-side zone statistics panel showing ATT/MID/DEF percentages and counts
  - [ ] 4.10: Zone percentage calculation: count events per zone, compute percentage, format to 0 decimal places, ensure percentages sum to 100%

- [ ] **Task 5: Create EventDetailsPane component with video integration** (AC: 7)
  - [ ] 5.1: Create `apps/web/src/components/dashboards/event-map/event-details-pane.tsx`
  - [ ] 5.2: Add `"use client"` directive
  - [ ] 5.3: Display event details: player name, minute (formatted as "34'" or "90+2'"), event type, location description, outcome
  - [ ] 5.4: Compute location description using `describeLocation(location_x, location_y)` from constants
  - [ ] 5.5: Implement close button (X) that clears selected event
  - [ ] 5.6: Implement "Watch Video" button that triggers the Wyscout video flow:
    - Step 1: `GET /api/wyscout/match-id?statsbomb_match_id={match_id}` to resolve Wyscout match ID
    - Step 2: `GET /api/wyscout/offsets?wyscout_match_id={id}` to get period start offsets
    - Step 3: Parse `event.timestamp` to seconds, add period offset, apply +/-5s padding
    - Step 4: `GET /api/wyscout/urls?wyscout_match_id={id}&start_timestamp={start_ts}&end_timestamp={end_ts}`
    - Step 5: Render `<video>` element with fetched URL, `controls`, and `autoPlay`
  - [ ] 5.7: Show spinner/skeleton while video URL is loading
  - [ ] 5.8: Show "Video unavailable" message if any step in the video flow fails
  - [ ] 5.9: Stop and reset video when a different event is selected or pane is closed

- [ ] **Task 6: Create PlayerStatsChart component** (AC: 8)
  - [ ] 6.1: Create `apps/web/src/components/dashboards/event-map/player-stats-chart.tsx`
  - [ ] 6.2: Add `"use client"` directive
  - [ ] 6.3: Implement bar chart using Recharts `BarChart` from Story 7.3 with three bars: ATT, MID, DEF
  - [ ] 6.4: Each bar value = count of events in that zone
  - [ ] 6.5: Each bar labeled with zone name and count value
  - [ ] 6.6: Chart title reflects the active event type (e.g., "Interceptions by Zone")
  - [ ] 6.7: Chart re-renders when event data or active tab changes

- [ ] **Task 7: Create server component page** (AC: 1, 2)
  - [ ] 7.1: Create `apps/web/src/app/(app)/dashboards/event-map/page.tsx` as a server component (no `"use client"` directive)
  - [ ] 7.2: Fetch teams, seasons, and managers server-side using internal API route calls
  - [ ] 7.3: Pre-fetch matches for default filter combination
  - [ ] 7.4: Render `EventMapClient` as a child, passing all initial filter data as props
  - [ ] 7.5: Add try-catch for server-side fetching with user-friendly error fallback

- [ ] **Task 8: Create barrel export and verify build** (AC: 10)
  - [ ] 8.1: Create `apps/web/src/components/dashboards/event-map/index.ts` exporting all public components
  - [ ] 8.2: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 8.3: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This dashboard follows the **server-rendered with client hydration** pattern established in Epic 9. Filter dropdown data (teams, seasons, managers) is fetched server-side to avoid loading spinners on first render. Event data is fetched client-side on demand when the user selects a match and event type tab. Video fetching is lazy -- Wyscout API calls only happen when the user clicks "Watch Video", not when an event is selected.

### Server/Client Split

- `page.tsx` is a **server component** that fetches initial dropdown data
- `EventMapClient` is the **client component** (`"use client"`) that handles all interactivity
- Event data is fetched **client-side only** to avoid large payloads on initial page load
- This matches the pattern used in Story 9.5 (Heat Maps) and other Epic 9/10 dashboards

### Source Files (from football-dashboard-2)

| Our Target | Source to Port From |
|---|---|
| `apps/web/src/app/(app)/dashboards/event-map/page.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/event-map/page.tsx` |
| `apps/web/src/components/dashboards/event-map/event-map-client.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/event-map/(components)/EventMapClient.tsx` |
| `apps/web/src/components/dashboards/event-map/event-map-filter-bar.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/event-map/(components)/EventMapFilterBar.tsx` |
| `apps/web/src/components/dashboards/event-map/event-pitch-map.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/event-map/(components)/EventPitchMap.tsx` |
| `apps/web/src/components/dashboards/event-map/event-details-pane.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/event-map/(components)/EventDetailsPane.tsx` |
| `apps/web/src/components/dashboards/event-map/player-stats-chart.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/event-map/(components)/PlayerStatsChart.tsx` |

Components already ported in previous stories (reuse, do not re-create):
| Already Created | Source |
|---|---|
| `apps/web/src/components/dashboards/FullPitchBase.tsx` | Story 7.2 |
| Recharts chart components | Story 7.3 |

### Files to Create

All files under `apps/web/src/components/dashboards/event-map/`:
1. `types.ts`
2. `constants.ts`
3. `event-map-filter-bar.tsx`
4. `event-map-client.tsx`
5. `event-pitch-map.tsx`
6. `event-details-pane.tsx`
7. `player-stats-chart.tsx`
8. `index.ts`

Plus the page file:
9. `apps/web/src/app/(app)/dashboards/event-map/page.tsx`

### Files NOT to Modify

- Anything under `packages/backend/convex/` -- this dashboard has no Convex writes
- Existing API routes in `apps/admin/` -- consumed as-is from Stories 8.1 and 8.3
- Pitch components from Story 7.2 -- consumed as dependencies, not modified
- Chart components from Story 7.3 -- consumed as dependencies, not modified
- Any global layout or navigation files (gallery routing is Story 9.1's responsibility)

### Key Decisions

1. **Server-rendered filters** -- Teams, seasons, and managers are pre-fetched server-side. This eliminates loading spinners on first render and improves perceived performance. Matches are also pre-fetched for default filter values.

2. **Client-side event fetching** -- Event data for the selected match and event type is fetched client-side only. This keeps the initial page payload small and allows dynamic tab switching without full page reloads.

3. **Video fetching is lazy** -- Wyscout API calls only happen when the user clicks "Watch Video", not when an event is selected. This avoids unnecessary API load and respects Wyscout rate limits.

4. **Zone classification thresholds** -- The pitch is divided into thirds using StatsBomb x-coordinate: DEF (0-40), MID (40-80), ATT (80-120). These are the standard StatsBomb pitch thirds.

5. **AbortController for request cancellation** -- When the user rapidly switches tabs or changes filters, in-flight requests are aborted to prevent stale data from overwriting fresh data.

6. **Five components, not more** -- This story ports exactly 5 components as specified in the epic scope. Sub-elements (zone stats panel, video player area) are implemented inline within their parent components rather than as separate components.

### Testing Approach

- **Manual testing:** Select team, season, match, verify events render on pitch for each tab
- **Coordinate verification:** Manually check that known event positions appear in the correct pitch location
- **Zone stats:** Verify ATT/MID/DEF percentages sum to 100% and match visual distribution of dots
- **Video flow:** Click event, click "Watch Video", verify Wyscout API chain executes and video plays
- **Tab switching:** Switch between Interceptions/Fouls/Regains and verify data clears and re-renders correctly
- **Edge cases:** Empty match (no events of selected type), match with events clustered in one zone
- **Error handling:** Disconnect network and verify error states display correctly
- **No automated tests required in this story** -- visual/interactive dashboard tested via manual QA

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10, Story 10.1]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-7.2-port-pitch-visualization-components.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.1-statsbomb-postgresql-connection-api-routes.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.3-hudl-wyscout-video-integration.md]
- [Source: football-dashboard-2/src/app/(dashboard)/dashboards/event-map/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
