# Story 7.2: Port Pitch Visualization Components (SVG + Canvas Heatmap)

Status: done

## Story

As a developer building analytics dashboards,
I want reusable pitch visualization components (half-pitch, full-pitch, goal mouth SVGs) and a canvas-based heatmap overlay,
so that all tactical and spatial analytics dashboards can render football pitch graphics with consistent styling and coordinate mapping.

## Acceptance Criteria (BDD)

### AC1: PitchBase Component (Half-Pitch SVG)
**Given** a consumer renders the `PitchBase` component
**When** the component mounts
**Then** it renders an SVG with viewBox `0 0 80 60` inside an `aspect-[4/3]` container
**And** the SVG contains: outer boundary rect, penalty area (18x44 at x=18 y=1, height=17), goal area (20x5 at x=30 y=1), penalty spot (circle at cx=40 cy=12 r=0.4), penalty arc (path from x=31 to x=49 at y=18), and a thicker goal line (x1=36 to x2=44 at y=1, strokeWidth=0.9)
**And** all strokes use `#1a1a1a` in light mode and `#e5e5e5` in dark mode (via CSS classes toggled by `.dark` parent)
**And** the component accepts `children`, `svgRef`, and `onClick` props
**And** the component is wrapped in a card container with `rounded-xl border bg-card shadow-sm` styling

### AC2: FullPitchBase Component (Full-Pitch SVG)
**Given** a consumer renders the `FullPitchBase` component
**When** the component mounts
**Then** it renders an SVG with viewBox `0 0 80 120` inside an `aspect-[2/3]` container
**And** the SVG contains: outer boundary, halfway line (y=60), center circle (cx=40 cy=60 r=9.15), center spot, top and bottom penalty areas (mirrored), top and bottom goal areas, penalty spots, penalty arcs, goal lines
**And** two dashed third lines at y=40 and y=80 (strokeDasharray="1,1" opacity=0.5)
**And** all strokes follow the same light/dark mode theming as PitchBase
**And** the component accepts `overlay` prop (React node rendered absolutely positioned over the SVG) for canvas-based overlays
**And** the component accepts `rightAdornment` prop (React node rendered in a border-left side panel) for stats panels
**And** the component accepts `children`, `svgRef`, and `onClick` props

### AC3: GoalBase Component (Goal Mouth SVG)
**Given** a consumer renders the `GoalBase` component
**When** the component mounts
**Then** it renders an SVG with viewBox `-2 -2 12 6.67` (GOAL_WIDTH=8 + 4 padding, GOAL_HEIGHT=2.67 + 4 padding) inside an `aspect-[4/3]` container
**And** the goal box (8 x 2.67) is filled with an SVG pattern (`#goal-net`) simulating a net grid (0.5x0.5 userSpaceOnUse pattern with 0.05 strokeWidth lines)
**And** goal net strokes use `#9ca3af` in light mode and `#6b7280` in dark mode
**And** goal frame strokes use `#1a1a1a` / `#e5e5e5` (same as pitch components)
**And** the component exports `GOAL_WIDTH` (8) and `GOAL_HEIGHT` (2.67) constants
**And** the component accepts `onScaleChange` callback that fires with pixel-to-SVG scale ratio on mount and resize (via ResizeObserver)
**And** the component supports dual refs: internal ref for ResizeObserver + forwarded `svgRef` prop

### AC4: Heatmap Overlay (Canvas-Based)
**Given** a consumer renders the `HeatPitchMap` component with an array of `PitchEvent` data
**When** events are provided
**Then** a `<canvas>` element is rendered as an absolute overlay on `FullPitchBase` via the `overlay` prop
**And** the canvas uses the `simpleheat` library (vendored at `src/lib/simpleheat.ts`)
**And** the gradient is Sampdoria-branded: `{ 0.4: '#1b5497', 0.6: 'cyan', 0.8: 'yellow', 1.0: 'red' }`
**And** the canvas has `mix-blend-multiply` blend mode and `opacity-80` (80%)
**And** canvas sizing responds to container resize via `ResizeObserver`

### AC5: StatsBomb Coordinate Mapping
**Given** event data with StatsBomb coordinates (x: 0-120 horizontal, y: 0-80 vertical)
**When** the heatmap plots these points on the vertical-orientation SVG pitch
**Then** coordinates are transformed using: `svg_x = (statsbomb_y / 80) * canvas_width` and `svg_y = ((120 - statsbomb_x) / 120) * canvas_height`
**And** the mapping correctly rotates the horizontal StatsBomb pitch to the vertical SVG pitch orientation

### AC6: Dynamic Density Scaling by Event Type
**Given** a heatmap rendering with an `eventType` parameter
**When** the event type is `pressures`
**Then** `densityMultiplier = 0.02` (high-volume events need more data to reach peak heat)
**When** the event type is `buildup`
**Then** `densityMultiplier = 0.04`
**When** the event type is `underPressure`
**Then** `densityMultiplier = 0.2`, `baseOpacityMultiplier = 2`, `baseRadiusMultiplier = 1.3`
**When** the event type is `interceptions`
**Then** `densityMultiplier = 0.4`, `baseOpacityMultiplier = 4`, `baseRadiusMultiplier = 2`
**And** when `isPlayerFiltered` is true, the densityMultiplier is tripled (individual players have fewer data points)
**And** `maxDensity = Math.max(1, data.length * densityMultiplier)`

### AC7: Dark Mode Compatibility
**Given** the application is in dark mode (`.dark` class on a parent element)
**When** any pitch component renders
**Then** all pitch strokes switch from `#1a1a1a` to `#e5e5e5`
**And** goal net strokes switch from `#9ca3af` to `#6b7280`
**And** styling is achieved via CSS class selectors (`.dark .pitch-stroke`) embedded in SVG `<defs><style>` blocks

### AC8: Responsive Sizing
**Given** any pitch component is rendered in a responsive container
**When** the viewport or parent container resizes
**Then** all SVG components scale proportionally (SVG viewBox handles this natively)
**And** the heatmap canvas re-renders at the correct dimensions via ResizeObserver
**And** GoalBase fires `onScaleChange` with updated scale ratio

## Tasks / Subtasks

- [ ] **Task 1: Port simpleheat library** (AC: 4)
  - [ ] 1.1: Copy `football-dashboard-2/src/lib/simpleheat.ts` to `apps/web/src/lib/simpleheat.ts`
  - [ ] 1.2: Verify TypeScript compatibility with our tsconfig (strict mode)
  - [ ] 1.3: Add proper TypeScript types or a type declaration if the vendored file uses `any` casts (clean up as feasible without rewriting core logic)

- [ ] **Task 2: Create PitchBase component** (AC: 1, 7, 8)
  - [ ] 2.1: Create `apps/web/src/components/dashboards/PitchBase.tsx`
  - [ ] 2.2: Port from `football-dashboard-2/src/components/dashboard/pitch-base.tsx` -- preserve exact SVG geometry and class names
  - [ ] 2.3: Add `"use client"` directive
  - [ ] 2.4: Verify dark mode works with our `next-themes` setup (`.dark` class on `<html>`)

- [ ] **Task 3: Create FullPitchBase component** (AC: 2, 7, 8)
  - [ ] 3.1: Create `apps/web/src/components/dashboards/FullPitchBase.tsx`
  - [ ] 3.2: Port from `football-dashboard-2/src/components/dashboard/full-pitch-base.tsx` -- preserve all SVG elements including third lines
  - [ ] 3.3: Ensure `overlay` prop renders as absolute-positioned child inside the aspect-ratio container (above SVG in z-order)
  - [ ] 3.4: Ensure `rightAdornment` prop renders as flex sibling with `border-l`

- [ ] **Task 4: Create GoalBase component** (AC: 3, 7, 8)
  - [ ] 4.1: Create `apps/web/src/components/dashboards/GoalBase.tsx`
  - [ ] 4.2: Port from `football-dashboard-2/src/components/dashboard/goal-base.tsx` -- preserve SVG pattern, goal dimensions, ResizeObserver logic
  - [ ] 4.3: Export `GOAL_WIDTH` and `GOAL_HEIGHT` constants
  - [ ] 4.4: Handle dual-ref pattern (internal ref for ResizeObserver + forwarded svgRef)

- [ ] **Task 5: Create PitchEvent type** (AC: 4, 5)
  - [ ] 5.1: Create `apps/web/src/components/dashboards/types.ts`
  - [ ] 5.2: Define `PitchEvent` type with fields: `event_id`, `period`, `timestamp`, `location_x`, `location_y`, `player_name`, `match_date`, `opponent_team_name`, optional `pass_end_location_x`, `pass_end_location_y`, `pass_recipient_name`
  - [ ] 5.3: Define `EventType = "pressures" | "buildup" | "underPressure" | "interceptions"`

- [ ] **Task 6: Create HeatPitchMap component** (AC: 4, 5, 6, 8)
  - [ ] 6.1: Create `apps/web/src/components/dashboards/HeatPitchMap.tsx`
  - [ ] 6.2: Port from `football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/(components)/HeatPitchMap.tsx`
  - [ ] 6.3: Implement coordinate mapping: `x = (ev.location_y / 80) * width`, `y = ((120 - ev.location_x) / 120) * height`
  - [ ] 6.4: Implement Sampdoria gradient: `{ 0.4: '#1b5497', 0.6: 'cyan', 0.8: 'yellow', 1.0: 'red' }`
  - [ ] 6.5: Implement density scaling table (pressures: 0.02, buildup: 0.04, underPressure: 0.2/2x/1.3x, interceptions: 0.4/4x/2x)
  - [ ] 6.6: Implement player-filtered mode (3x density multiplier, radius 40 vs 25, blur 25 vs 15, minOpacity 0.15 vs 0.05)
  - [ ] 6.7: Apply `mix-blend-multiply opacity-80 pointer-events-none z-10` to canvas container

- [ ] **Task 7: Create barrel export** (AC: all)
  - [ ] 7.1: Create `apps/web/src/components/dashboards/index.ts` with named exports for all components and types

## Dev Notes

### Project Scope
All frontend work targets `apps/web/`. Do NOT place components in `apps/admin/`. The dashboards folder (`components/dashboards/`) is a new directory -- create it.

### Source Files (Existing Platform)
| Our Target | Source to Port From |
|---|---|
| `apps/web/src/components/dashboards/PitchBase.tsx` | `football-dashboard-2/src/components/dashboard/pitch-base.tsx` |
| `apps/web/src/components/dashboards/FullPitchBase.tsx` | `football-dashboard-2/src/components/dashboard/full-pitch-base.tsx` |
| `apps/web/src/components/dashboards/GoalBase.tsx` | `football-dashboard-2/src/components/dashboard/goal-base.tsx` |
| `apps/web/src/components/dashboards/HeatPitchMap.tsx` | `football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/(components)/HeatPitchMap.tsx` |
| `apps/web/src/lib/simpleheat.ts` | `football-dashboard-2/src/lib/simpleheat.ts` |
| `apps/web/src/components/dashboards/types.ts` | `football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/types.ts` |

### Coordinate Mapping Formula (StatsBomb -> SVG)
StatsBomb uses a horizontal pitch: x=[0-120] (length), y=[0-80] (width).
Our SVG uses a vertical pitch: width=80, height=120.

```
svg_x = statsbomb_y          // StatsBomb width -> SVG horizontal
svg_y = 120 - statsbomb_x    // StatsBomb length -> SVG vertical (inverted)

// For canvas pixel coordinates:
canvas_x = (statsbomb_y / 80) * canvas_width
canvas_y = ((120 - statsbomb_x) / 120) * canvas_height
```

### Density Scaling Reference Table
| Event Type | densityMultiplier | baseOpacityMultiplier | baseRadiusMultiplier | Rationale |
|---|---|---|---|---|
| pressures | 0.02 | 1 | 1 | High-volume events |
| buildup | 0.04 | 1 | 1 | Medium-volume |
| underPressure | 0.2 | 2 | 1.3 | Rare events, need visual emphasis |
| interceptions | 0.4 | 4 | 2 | Very rare events, max emphasis |

Player-filtered mode: densityMultiplier x3, radius 40 (vs 25), blur 25 (vs 15), minOpacity 0.15 (vs 0.05).

### Dark Mode Implementation
These components use embedded CSS in SVG `<defs><style>` blocks with `.dark` parent selector. This is compatible with our `next-themes` setup which applies the `.dark` class to the `<html>` element. Do NOT convert to Tailwind dark: variants -- the SVG internal CSS approach is intentional and works correctly.

### Architecture Compliance
- **"use client"** directive required on all components (they use refs, effects, ResizeObserver)
- **PascalCase** file names for components per project convention
- **No Convex dependency** -- these are pure presentation components. Data fetching happens in parent page components via Next.js API routes to StatsBomb (Story 8.1)
- **shadcn card styling** -- wrapper divs use `rounded-xl border bg-card shadow-sm` which maps to our existing shadcn/ui design tokens
- **No business logic** in components. They receive data as props and render

### simpleheat Library
The simpleheat library is a vendored file (not an npm package). It is a canvas-based heatmap renderer. It uses constructor-style JS with prototype methods. The file uses `any` casts. Keep it as-is -- do not rewrite the library internals. Just ensure the import path is correct.

### Dependencies
- **Story 7.1** (Align Color Palette) should be done first so design tokens are available, but pitch components use hardcoded stroke colors (not CSS variables) so they can technically be built in parallel
- **Story 8.1** (StatsBomb API Routes) will provide the actual data -- these components work with mock data until then
- **Recharts** is NOT needed for this story (that is Story 7.3)

### Testing Approach
These are visual SVG components. Testing approach:
- Unit test that components render without crashing
- Verify SVG elements are present (viewBox, key rects/circles/lines)
- Verify exported constants (GOAL_WIDTH, GOAL_HEIGHT)
- Verify coordinate mapping function produces correct output for known inputs
- No Convex testing needed (pure frontend components)

### Project Structure Notes
- New directory: `apps/web/src/components/dashboards/` -- follows the module-per-folder convention (calendar/, documents/, players/ already exist)
- Vendored lib: `apps/web/src/lib/simpleheat.ts` -- follows existing pattern of `apps/web/src/lib/utils.ts`
- The `dashboards/` folder name aligns with the route `app/(app)/dashboards/` that will be created in Epic 9

### References
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 7, Story 7.2]
- [Source: _bmad-output/planning-artifacts/architecture.md - Code Organization, Module Boundaries]
- [Source: football-dashboard-2/src/components/dashboard/pitch-base.tsx]
- [Source: football-dashboard-2/src/components/dashboard/full-pitch-base.tsx]
- [Source: football-dashboard-2/src/components/dashboard/goal-base.tsx]
- [Source: football-dashboard-2/src/app/(dashboard)/dashboards/heat-maps/(components)/HeatPitchMap.tsx]
- [Source: football-dashboard-2/src/lib/simpleheat.ts]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None required -- clean implementation with zero TypeScript errors and zero lint issues.

### Completion Notes List
- All 7 tasks completed: simpleheat lib, PitchBase, FullPitchBase, GoalBase, types, HeatPitchMap, barrel export
- simpleheat vendored with exported `SimpleHeatInstance` interface for type safety; core logic unchanged per story instructions
- GoalBase dual-ref pattern adapted to use `Object.assign` instead of `MutableRefObject` cast to satisfy strict TypeScript lint rules
- All components use `"use client"` directive, PascalCase filenames, and embedded SVG CSS for dark mode theming
- Coordinate mapping formula preserved: `svg_x = statsbomb_y / 80 * width`, `svg_y = (120 - statsbomb_x) / 120 * height`
- Density scaling table implemented exactly as specified (pressures: 0.02, buildup: 0.04, underPressure: 0.2/2x/1.3x, interceptions: 0.4/4x/2x)
- Player-filtered mode: 3x density multiplier, radius 40, blur 25, minOpacity 0.15

### File List
- `apps/web/src/lib/simpleheat.ts` -- vendored heatmap canvas library with TypeScript interface
- `apps/web/src/components/dashboards/types.ts` -- PitchEvent and EventType type definitions
- `apps/web/src/components/dashboards/PitchBase.tsx` -- half-pitch SVG component (viewBox 0 0 80 60)
- `apps/web/src/components/dashboards/FullPitchBase.tsx` -- full-pitch SVG component (viewBox 0 0 80 120) with overlay and rightAdornment props
- `apps/web/src/components/dashboards/GoalBase.tsx` -- goal mouth SVG component with net pattern and ResizeObserver scale tracking
- `apps/web/src/components/dashboards/HeatPitchMap.tsx` -- canvas-based heatmap overlay using simpleheat with StatsBomb coordinate mapping
- `apps/web/src/components/dashboards/index.ts` -- barrel export for all components and types
