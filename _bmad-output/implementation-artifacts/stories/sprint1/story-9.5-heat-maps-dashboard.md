# Story 9.5: Heat Maps Dashboard

Status: draft
Story Type: frontend / dashboard
Points: 5

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. The dashboard page lives at `apps/web/src/app/(app)/dashboards/heat-maps/`. Reusable pitch/heatmap components from Story 7.2 live in `apps/web/src/components/dashboards/`. Data is fetched from StatsBomb API routes created in Story 8.1. Convex is NOT involved in data fetching -- these are read-only external data sources accessed via Next.js API routes.

## Story

As a football analyst or coach,
I want a heat maps dashboard that visualizes event density on a full pitch for different event types (pressures, build-up, under pressure, interceptions),
so that I can identify spatial patterns in team and individual player activity across matches and seasons.

## Acceptance Criteria (BDD)

### AC 1: Heat Maps page is routable at `/dashboards/heat-maps`

**Given** the dashboard gallery and routing infrastructure from Story 9.1 is in place
**When** a user navigates to `/dashboards/heat-maps` (via gallery card click or direct URL)
**Then** the heat maps dashboard page renders
**And** the page is registered with slug `"heat-maps"` in the dashboards registry
**And** the page uses server-rendered initial filter data with client hydration (server component wrapping a client component)

### AC 2: Server component fetches initial filter data

**Given** the heat maps page loads
**When** the server component renders
**Then** it fetches team and season data from `/api/statsbomb/teams` and `/api/statsbomb/seasons`
**And** passes the initial teams and seasons lists as props to `HeatMapClient`
**And** does NOT fetch event data server-side (events are fetched client-side after user selects filters)
**And** errors during server fetch display a user-friendly error state (not a raw error)

### AC 3: HeatMapClient renders filter controls and tab selection

**Given** the `HeatMapClient` component mounts with initial filter data
**When** the component renders
**Then** it displays a team dropdown populated with available teams
**And** it displays a season dropdown populated with available seasons
**And** it displays a match dropdown (populated after team + season are selected)
**And** it displays a player filter dropdown (populated from match lineup data, with an "All Players" default option)
**And** it displays four event type tabs: "Pressures", "Build-up", "Under Pressure", "Interceptions"
**And** the default selected tab is "Pressures"

### AC 4: Match dropdown populates based on team and season selection

**Given** the user has selected a team and a season from the dropdowns
**When** both values are set
**Then** the component fetches matches from `/api/statsbomb/matches?team_id={teamId}&season_id={seasonId}`
**And** the match dropdown is populated with the returned matches (displaying opponent name, date, and venue)
**And** while loading, the match dropdown shows a loading/disabled state
**And** if zero matches are returned, the dropdown displays "No matches found"

### AC 5: Event data is fetched when match and event type are selected

**Given** the user has selected a match from the dropdown
**When** the user selects an event type tab (or the default "Pressures" tab is active)
**Then** the component fetches events from `/api/statsbomb/events?match_id={matchId}&event_type={pressures|buildup|under_pressure|interceptions}`
**And** a loading indicator is displayed on the pitch while the fetch is in progress
**And** the fetched events are passed to the `HeatPitchMap` component for rendering
**And** if the fetch fails, an error message is displayed inline (not a full-page error)

### AC 6: Tab selection switches event type and re-fetches data

**Given** a match is selected and event data is displayed on the heatmap
**When** the user clicks a different event type tab
**Then** the event type parameter changes and a new fetch is triggered
**And** the heatmap re-renders with the new event data
**And** the previously displayed heatmap is cleared before the new one renders (no stale overlay)
**And** the active tab has a visually distinct selected state

### AC 7: HeatPitchMap renders canvas heatmap on FullPitchBase overlay

**Given** the `HeatPitchMap` component receives an array of `PitchEvent` data and an `eventType`
**When** events are provided
**Then** a `<canvas>` element is rendered as an absolute overlay on `FullPitchBase` via the `overlay` prop
**And** the canvas uses the `simpleheat` library (vendored at `src/lib/simpleheat.ts`, from Story 7.2)
**And** the gradient is: `{ 0.4: '#1b5497', 0.6: 'cyan', 0.8: 'yellow', 1.0: 'red' }`
**And** the canvas has `mix-blend-multiply` blend mode and `opacity-80` (80%)
**And** the canvas has `pointer-events-none` and `z-10` so it does not block pitch interaction
**And** the `FullPitchBase` SVG viewBox is `0 0 80 120` (vertical orientation)

### AC 8: StatsBomb coordinates are correctly mapped to vertical pitch canvas

**Given** event data contains StatsBomb coordinates (x: 0-120 horizontal pitch length, y: 0-80 horizontal pitch width)
**When** the heatmap plots these points on the vertical-orientation canvas
**Then** coordinates are transformed using:
  - `canvas_x = (statsbomb_y / 80) * canvas_width`
  - `canvas_y = ((120 - statsbomb_x) / 120) * canvas_height`
**And** the mapping correctly rotates the horizontal StatsBomb pitch to the vertical SVG pitch orientation
**And** events near the attacking goal (high statsbomb_x) appear at the top of the vertical pitch
**And** events near the defending goal (low statsbomb_x) appear at the bottom

### AC 9: Density scaling is applied correctly per event type

**Given** the heatmap renders with a specific `eventType`
**When** the event type is `pressures`
**Then** `densityMultiplier = 0.02`, `baseOpacityMultiplier = 1`, `baseRadiusMultiplier = 1`
**When** the event type is `buildup`
**Then** `densityMultiplier = 0.04`, `baseOpacityMultiplier = 1`, `baseRadiusMultiplier = 1`
**When** the event type is `underPressure`
**Then** `densityMultiplier = 0.2`, `baseOpacityMultiplier = 2`, `baseRadiusMultiplier = 1.3`
**When** the event type is `interceptions`
**Then** `densityMultiplier = 0.4`, `baseOpacityMultiplier = 4`, `baseRadiusMultiplier = 2`
**And** `maxDensity = Math.max(1, data.length * densityMultiplier)`
**And** the simpleheat `max()` is set to this computed maxDensity value

### AC 10: Player filter adjusts heatmap density

**Given** the heatmap is displaying event data for a match
**When** the user selects a specific player from the player filter dropdown
**Then** the event data is filtered to only include events by that player
**And** the `densityMultiplier` is tripled (x3) to compensate for fewer data points
**And** the simpleheat `radius` is set to 40 (instead of default 25)
**And** the simpleheat `blur` is set to 25 (instead of default 15)
**And** `minOpacity` is set to 0.15 (instead of default 0.05)
**When** the user selects "All Players" from the dropdown
**Then** the filter is removed and default density settings are restored

### AC 11: Canvas resizes responsively via ResizeObserver

**Given** the heatmap canvas is rendered inside the `FullPitchBase` container
**When** the browser viewport or parent container resizes
**Then** the canvas element width and height are updated to match the container dimensions
**And** the heatmap is re-rendered at the new canvas size with correct coordinate scaling
**And** the ResizeObserver is cleaned up on component unmount (no memory leak)

### AC 12: Empty and loading states are handled

**Given** no match is selected yet
**When** the heatmap area renders
**Then** the `FullPitchBase` is displayed without a canvas overlay
**And** a placeholder message (e.g., "Select a match to view heatmap") is shown

**Given** event data has been fetched but contains zero events for the selected type
**When** the heatmap renders
**Then** the `FullPitchBase` is displayed without a canvas overlay
**And** a message indicates no events of that type were found for the match

### AC 13: TypeScript types pass and lint is clean

**Given** all files for the heat maps dashboard have been created
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new files
**And** `pnpm lint` passes with zero new errors

---

## API Routes Used

All routes are from Story 8.1. No new API routes are needed.

| Route | Purpose | Required Params |
|-------|---------|-----------------|
| `/api/statsbomb/teams` | Populate team dropdown | -- |
| `/api/statsbomb/seasons` | Populate season dropdown | `competitionId` |
| `/api/statsbomb/matches` | Populate match dropdown | `competitionId`, `seasonId`, optionally `teamId` |
| `/api/statsbomb/events` | Fetch event locations for heatmap | `matchId`, optionally `typeId` |

---

## Tasks / Subtasks

- [ ] **Task 1: Create the heat maps page route** (AC: #1, #2)
  - [ ] 1.1: Create directory `apps/web/src/app/(app)/dashboards/heat-maps/`
  - [ ] 1.2: Create `apps/web/src/app/(app)/dashboards/heat-maps/page.tsx` as a server component
  - [ ] 1.3: Fetch initial teams and seasons data server-side using internal API route calls (or direct SQL via shared utilities)
  - [ ] 1.4: Render `HeatMapClient` as a child, passing initial filter data as props
  - [ ] 1.5: Add error boundary / try-catch for server-side data fetching with user-friendly fallback

- [ ] **Task 2: Create the HeatMapClient component** (AC: #3, #4, #5, #6, #10, #12)
  - [ ] 2.1: Create `apps/web/src/app/(app)/dashboards/heat-maps/HeatMapClient.tsx` with `"use client"` directive
  - [ ] 2.2: Implement team dropdown (controlled, populated from server props)
  - [ ] 2.3: Implement season dropdown (controlled, populated from server props)
  - [ ] 2.4: Implement match dropdown with client-side fetch triggered by team + season selection
    ```typescript
    // Fetch matches when team and season are both selected
    const matchesUrl = `/api/statsbomb/matches?competitionId=${competitionId}&seasonId=${seasonId}&teamId=${teamId}`;
    ```
  - [ ] 2.5: Implement event type tabs using a tab component or button group:
    ```typescript
    const EVENT_TYPES = [
      { key: "pressures", label: "Pressures" },
      { key: "buildup", label: "Build-up" },
      { key: "under_pressure", label: "Under Pressure" },
      { key: "interceptions", label: "Interceptions" },
    ] as const;
    ```
  - [ ] 2.6: Implement player filter dropdown, populated from match event data (extract unique player names)
  - [ ] 2.7: Implement client-side event data fetching:
    ```typescript
    const eventsUrl = `/api/statsbomb/events?matchId=${matchId}&typeId=${eventType}`;
    ```
  - [ ] 2.8: Implement loading state (spinner/skeleton on pitch area while fetching)
  - [ ] 2.9: Implement empty state ("Select a match to view heatmap" / "No events found")
  - [ ] 2.10: Pass filtered events, eventType, and isPlayerFiltered flag to `HeatPitchMap`

- [ ] **Task 3: Wire up HeatPitchMap from Story 7.2** (AC: #7, #8, #9, #10, #11)
  - [ ] 3.1: Import `HeatPitchMap` from `@/components/dashboards/HeatPitchMap` (created in Story 7.2)
  - [ ] 3.2: Import `FullPitchBase` from `@/components/dashboards/FullPitchBase` (created in Story 7.2)
  - [ ] 3.3: Render `HeatPitchMap` inside `FullPitchBase` via the `overlay` prop
  - [ ] 3.4: Pass the following props to `HeatPitchMap`:
    - `data: PitchEvent[]` -- filtered event array
    - `eventType: EventType` -- current tab selection
    - `isPlayerFiltered: boolean` -- whether a specific player is selected
  - [ ] 3.5: Verify coordinate mapping produces correct output:
    - StatsBomb (120, 40) -> canvas center-top
    - StatsBomb (0, 40) -> canvas center-bottom
    - StatsBomb (60, 0) -> canvas left-middle
    - StatsBomb (60, 80) -> canvas right-middle
  - [ ] 3.6: Verify density scaling values match AC #9 exactly
  - [ ] 3.7: Verify player-filtered mode applies 3x density, radius 40, blur 25, minOpacity 0.15

- [ ] **Task 4: Implement data fetching hooks** (AC: #4, #5)
  - [ ] 4.1: Create a `useMatches` hook (or inline fetch logic) that fetches matches when team + season change
  - [ ] 4.2: Create a `useEvents` hook (or inline fetch logic) that fetches events when match + eventType change
  - [ ] 4.3: Both hooks should handle loading, error, and empty states
  - [ ] 4.4: Both hooks should abort in-flight requests when parameters change (AbortController)

- [ ] **Task 5: TypeScript types** (AC: #13)
  - [ ] 5.1: Reuse `PitchEvent` and `EventType` types from `@/components/dashboards/types.ts` (Story 7.2)
  - [ ] 5.2: Define local types for match dropdown items, filter state, and API response shapes
  - [ ] 5.3: Ensure all props and state are fully typed -- no `any` casts

- [ ] **Task 6: TypeScript and lint verification** (AC: #13)
  - [ ] 6.1: Run `pnpm typecheck` -- must pass with zero errors
  - [ ] 6.2: Run `pnpm lint` -- must pass with zero new errors

---

## Dev Notes

### Architecture Context

This story creates the **Heat Maps dashboard page** -- a page-level composition that connects the reusable pitch/heatmap components (Story 7.2) with StatsBomb event data (Story 8.1). The components themselves are already built; this story wires them together with filters and data fetching.

```
/dashboards/heat-maps/page.tsx (server component)
  |
  |-- fetches teams, seasons server-side
  |-- renders HeatMapClient (client component)
        |
        |-- manages filter state (team, season, match, player, event type)
        |-- fetches matches client-side (on team+season change)
        |-- fetches events client-side (on match+eventType change)
        |-- renders FullPitchBase + HeatPitchMap overlay
        |-- renders filter dropdowns + event type tabs
```

### Server/Client Split

The page follows the **server-rendered with client hydration** pattern:
- `page.tsx` is a **server component** that fetches initial dropdown data (teams, seasons)
- `HeatMapClient.tsx` is a **client component** (`"use client"`) that handles all interactivity
- Event data is fetched **client-side only** to avoid large payloads on initial page load
- This matches the pattern used across all Epic 9 dashboards

### Coordinate Mapping Reference

StatsBomb uses a horizontal pitch: x=[0-120] (length), y=[0-80] (width).
Our SVG/canvas uses a vertical pitch: width=80, height=120.

```
StatsBomb (horizontal)          Our Pitch (vertical)
  0,0 ──────── 120,0           0,0
   |              |              |
   |   pitch      |              |   pitch
   |              |              |
  0,80 ──────── 120,80         0,120

Mapping:
  svg_x = statsbomb_y                           // [0-80] preserved
  svg_y = 120 - statsbomb_x                     // [0-120] flipped

Canvas pixel coordinates:
  canvas_x = (statsbomb_y / 80) * canvas_width
  canvas_y = ((120 - statsbomb_x) / 120) * canvas_height
```

### Density Scaling Reference Table

| Event Type | densityMultiplier | baseOpacityMultiplier | baseRadiusMultiplier | Rationale |
|---|---|---|---|---|
| pressures | 0.02 | 1 | 1 | High-volume events (~300-500 per match) |
| buildup | 0.04 | 1 | 1 | Medium-volume (~150-300) |
| underPressure | 0.2 | 2 | 1.3 | Lower volume, needs visual emphasis |
| interceptions | 0.4 | 4 | 2 | Lowest volume (~20-50), max emphasis |

**Player-filtered mode:** densityMultiplier x3, radius 40 (vs 25), blur 25 (vs 15), minOpacity 0.15 (vs 0.05).

**Formula:** `maxDensity = Math.max(1, data.length * densityMultiplier)`

### Heatmap Canvas Rendering (simpleheat)

```typescript
// Initialization (inside useEffect with ResizeObserver)
const heat = simpleheat(canvasRef.current);
heat.gradient({
  0.4: '#1b5497',  // Sampdoria blue (cool zone)
  0.6: 'cyan',     // transition
  0.8: 'yellow',   // warm zone
  1.0: 'red',      // hot zone
});
heat.max(maxDensity);
heat.radius(isPlayerFiltered ? 40 : 25, isPlayerFiltered ? 25 : 15);

// Add data points
data.forEach(ev => {
  const x = (ev.location_y / 80) * canvas.width;
  const y = ((120 - ev.location_x) / 120) * canvas.height;
  heat.add([x, y, 1]);
});

heat.draw(isPlayerFiltered ? 0.15 : 0.05);
```

### Source Files (Existing Platform)

| Our Target | Source to Port From |
|---|---|
| `apps/web/src/app/(app)/dashboards/heat-maps/page.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/page.tsx` |
| `apps/web/src/app/(app)/dashboards/heat-maps/HeatMapClient.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/(components)/HeatMapClient.tsx` |

Components already ported in Story 7.2 (reuse, do not re-create):
| Already Created | Source |
|---|---|
| `apps/web/src/components/dashboards/HeatPitchMap.tsx` | Story 7.2 |
| `apps/web/src/components/dashboards/FullPitchBase.tsx` | Story 7.2 |
| `apps/web/src/components/dashboards/types.ts` | Story 7.2 |
| `apps/web/src/lib/simpleheat.ts` | Story 7.2 |

### Files to Create

1. `apps/web/src/app/(app)/dashboards/heat-maps/page.tsx` -- Server component (page route)
2. `apps/web/src/app/(app)/dashboards/heat-maps/HeatMapClient.tsx` -- Client component (interactive dashboard)

### Files NOT to Modify

- Anything under `convex/` -- this story has zero Convex involvement
- Anything under `apps/admin/` -- dashboard pages go in `apps/web/`
- `apps/web/src/components/dashboards/HeatPitchMap.tsx` -- already created in Story 7.2, reuse as-is
- `apps/web/src/components/dashboards/FullPitchBase.tsx` -- already created in Story 7.2, reuse as-is

### Key Decisions

1. **Server/client split** -- Teams and seasons are fetched server-side (small payloads, needed immediately). Events are fetched client-side (large payloads, conditional on user interaction). This avoids shipping hundreds of KB of event data on initial page load.

2. **Reuse Story 7.2 components** -- `HeatPitchMap` and `FullPitchBase` are reusable components already built. This story only creates the page-level wrapper and data-fetching logic.

3. **Event type filtering via API parameter** -- The API route `/api/statsbomb/events` supports `typeId` filtering. Filtering happens server-side in the SQL query, not by fetching all events and filtering client-side.

4. **Player filtering is client-side** -- Player filtering is applied by filtering the already-fetched event array by `player_name`. No additional API call is needed.

5. **AbortController for request cancellation** -- When the user rapidly switches tabs or changes filters, in-flight requests are aborted to prevent stale data from overwriting fresh data.

### Dependencies

- **Story 9.1** (Dashboard Gallery & Routing) -- provides the `/dashboards/[slug]` routing infrastructure and gallery registration
- **Story 8.1** (StatsBomb API Routes) -- provides `/api/statsbomb/events`, `/api/statsbomb/teams`, `/api/statsbomb/seasons`, `/api/statsbomb/matches`
- **Story 7.2** (Pitch Visualization Components) -- provides `HeatPitchMap`, `FullPitchBase`, `PitchEvent` type, `simpleheat` library
- **Blocks:** Nothing -- this is a leaf dashboard page

### Testing Approach

- **Manual testing:** Select team, season, match, verify heatmap renders for each event type tab
- **Coordinate verification:** Manually check that known event positions (e.g., penalty spot pressure) appear in the correct pitch location
- **Player filter:** Select individual player, verify heatmap density increases and data is filtered
- **Responsive:** Resize browser and verify canvas re-renders without distortion
- **Error handling:** Disconnect network and verify error states display correctly
- **No unit tests required in this story** -- visual dashboard page tested via manual QA

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 9, Story 9.5]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-7.2-port-pitch-visualization-components.md]
- [Source: _bmad-output/planning-artifacts/stories/sprint1/story-8.1-statsbomb-postgresql-connection-api-routes.md]
- [Source: football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
