# Story 7.3: Integrate Recharts & Port Reusable Chart Components

Status: done

## Story

As a developer building analytics dashboards,
I want reusable chart components, filter bars, and stats display primitives ported from the existing platform and adapted to our design tokens,
so that Epic 9 and Epic 10 dashboard stories can compose rich data visualizations without rebuilding common chart infrastructure.

## Acceptance Criteria

### AC1: Recharts integration verified

**Given** recharts 2.15.4 is already listed in `apps/web/package.json`
**When** a developer imports from `recharts` in any component under `apps/web/src/components/`
**Then** the import resolves without error
**And** the existing shadcn/ui `ChartContainer` component (`apps/web/src/components/ui/chart.tsx`) continues to work alongside the new chart components
**And** no duplicate or conflicting recharts versions exist in the dependency tree

### AC2: XYScatterChart component renders with dual-axis metric selection

**Given** the XYScatterChart component is mounted with a dataset and metric configuration
**When** the component renders
**Then** it displays a Recharts `ScatterChart` inside a `ResponsiveContainer` at 420px height
**And** it renders a `CartesianGrid` with stroke color `#d0d0d0`
**And** it renders an `XAxis` and `YAxis` with configurable metric labels
**And** two grouped dropdown selectors allow the user to pick X-axis and Y-axis metrics from categorized metric groups
**And** the metric category groups are expandable/collapsible

### AC3: XYScatterChart reference lines and domain calculation

**Given** the XYScatterChart receives league average values for both axes
**When** reference values are provided
**Then** red dashed `ReferenceLine` components render at the average values (stroke: `#991b1b`, strokeDasharray: `"5 5"`)
**And** the chart domain is dynamically calculated with padding (10% beyond min/max data values) so all points and reference lines are visible

### AC4: XYScatterChart player image badges

**Given** data points include optional player image URLs
**When** the chart renders scatter points
**Then** points with images display circular player photo badges (clipped to circle) as custom scatter shapes
**And** points without images display default circles with fill color `#9ca3af`
**And** the currently selected/hovered point uses fill color `#1b5497` (Sampdoria brand blue)
**And** a custom `Tooltip` component shows player name, X metric value, and Y metric value on hover

### AC5: FilterBar container component

**Given** the FilterBar component is mounted with children filter components
**When** it renders
**Then** it wraps its children in a `rounded-xl border shadow-sm` card container
**And** the container uses the project's Card component or equivalent styling from our design tokens
**And** filter children are laid out horizontally with consistent spacing, wrapping on smaller screens

### AC6: FilterSelect component with search

**Given** a FilterSelect component is mounted with an array of options
**When** the user opens the dropdown
**Then** it displays a searchable list of options
**And** typing in the search field filters options in real time (case-insensitive substring match)
**And** selecting an option calls the `onChange` callback with the selected value
**And** the component integrates with our existing shadcn/ui `Select` or `Combobox` component

### AC7: FilterCheckbox component

**Given** a FilterCheckbox component is mounted with a group of checkbox options
**When** the user toggles checkboxes
**Then** the component renders labeled checkboxes using our shadcn/ui `Checkbox` component
**And** toggling a checkbox calls the `onChange` callback with the updated set of selected values
**And** a "Select All" / "Clear" toggle is available when more than 3 options exist

### AC8: StatsItem display component

**Given** a StatsItem component is mounted with a label, value, and optional subValue
**When** it renders
**Then** it displays in a flex column layout, centered
**And** the label renders as `text-xs uppercase text-muted-foreground`
**And** the value renders as `text-lg font-semibold`
**And** the optional subValue renders below the value in `text-xs text-muted-foreground`
**And** the component is usable standalone or in a horizontal row of multiple StatsItems

### AC9: Design token alignment

**Given** all ported components are rendered in the admin app
**When** the app theme is applied (light and dark mode)
**Then** all components use CSS variables from our design tokens (not hardcoded colors except the explicitly specified brand colors: `#1b5497`, `#991b1b`, `#9ca3af`, `#d0d0d0`)
**And** font family, border-radius, and spacing match the project's Tailwind theme
**And** all components are responsive and functional at viewport widths from 768px to 1920px

## Tasks / Subtasks

- [ ] Task 1: Verify Recharts dependency (AC: #1)
  - [ ] Confirm `recharts` 2.15.4 is installed in `apps/web/package.json` (already present)
  - [ ] Run `pnpm install` to ensure lockfile is current
  - [ ] Create a smoke-test import to verify Recharts + existing `chart.tsx` coexistence

- [ ] Task 2: Create XYScatterChart component (AC: #2, #3, #4)
  - [ ] Create `apps/web/src/components/charts/XYScatterChart.tsx`
  - [ ] Implement TypeScript interfaces: `ScatterDataPoint`, `MetricOption`, `MetricGroup`, `XYScatterChartProps`
  - [ ] Implement dual-axis metric selector with grouped dropdowns (expandable/collapsible categories)
  - [ ] Implement `ResponsiveContainer` wrapper at 420px height
  - [ ] Implement `ScatterChart` with `CartesianGrid` (stroke: `#d0d0d0`)
  - [ ] Implement dynamic domain calculation with 10% padding
  - [ ] Implement optional `ReferenceLine` components (stroke: `#991b1b`, dashed)
  - [ ] Implement custom scatter shape renderer for player image badges (circle clip-path)
  - [ ] Implement selected point highlighting (`#1b5497`) and default point color (`#9ca3af`)
  - [ ] Implement custom Tooltip component showing player name + metric values
  - [ ] Create `apps/web/src/components/charts/index.ts` barrel export

- [ ] Task 3: Create FilterBar component (AC: #5)
  - [ ] Create `apps/web/src/components/dashboard/FilterBar.tsx`
  - [ ] Use shadcn/ui Card or equivalent `rounded-xl border shadow-sm` container
  - [ ] Implement horizontal layout with responsive wrapping

- [ ] Task 4: Create FilterSelect component (AC: #6)
  - [ ] Create `apps/web/src/components/dashboard/FilterSelect.tsx`
  - [ ] Build on top of existing shadcn/ui `Combobox` or `Command` + `Popover` pattern
  - [ ] Implement search filtering (case-insensitive substring)
  - [ ] Define typed props: `options`, `value`, `onChange`, `placeholder`, `label`

- [ ] Task 5: Create FilterCheckbox component (AC: #7)
  - [ ] Create `apps/web/src/components/dashboard/FilterCheckbox.tsx`
  - [ ] Use existing shadcn/ui `Checkbox` component
  - [ ] Implement group toggle (Select All / Clear) for groups with > 3 options
  - [ ] Define typed props: `options`, `selectedValues`, `onChange`, `label`

- [ ] Task 6: Create StatsItem component (AC: #8)
  - [ ] Create `apps/web/src/components/dashboard/StatsItem.tsx`
  - [ ] Implement flex column centered layout
  - [ ] Apply Tailwind classes: label `text-xs uppercase text-muted-foreground`, value `text-lg font-semibold`
  - [ ] Support optional `subValue` prop

- [ ] Task 7: Create barrel exports (AC: all)
  - [ ] Create `apps/web/src/components/dashboard/index.ts` barrel exporting FilterBar, FilterSelect, FilterCheckbox, StatsItem
  - [ ] Ensure `apps/web/src/components/charts/index.ts` exports XYScatterChart

- [ ] Task 8: Design token and responsive verification (AC: #9)
  - [ ] Verify all components render correctly in light and dark mode
  - [ ] Verify responsive behavior at 768px, 1024px, 1440px, 1920px viewport widths
  - [ ] Ensure no hardcoded colors beyond the four specified brand values

## Dev Notes

### Architecture Constraints

- **Recharts is already installed**: `recharts` 2.15.4 is in `apps/web/package.json`. Do NOT install it again or change the version.
- **shadcn/ui chart.tsx exists**: `apps/web/src/components/ui/chart.tsx` provides `ChartContainer`, `ChartConfig`, `ChartTooltip`, `ChartTooltipContent`, and `ChartStyle`. These are the shadcn wrappers around Recharts. The new chart components in this story are higher-level, domain-specific components that use Recharts directly (not through shadcn `ChartContainer`). Both patterns coexist.
- **No Convex involvement**: This story is purely frontend UI components. No backend queries, mutations, or schema changes.
- **No state management libraries**: Use React `useState`/`useReducer` for local state (metric selection, filter state). No Zustand or Context for server data.
- **TypeScript strict mode**: No `any` types. Define explicit interfaces for all props and data structures.

### Component API Specifications

#### XYScatterChart

```typescript
interface ScatterDataPoint {
  id: string;
  name: string;
  imageUrl?: string;
  [metricKey: string]: number | string | undefined;
}

interface MetricOption {
  key: string;
  label: string;
}

interface MetricGroup {
  label: string;
  metrics: MetricOption[];
}

interface XYScatterChartProps {
  data: ScatterDataPoint[];
  metricGroups: MetricGroup[];
  defaultXMetric: string;
  defaultYMetric: string;
  xReferenceValue?: number;
  yReferenceValue?: number;
  referenceLabel?: string;
  onPointClick?: (point: ScatterDataPoint) => void;
  selectedPointId?: string;
  height?: number; // default: 420
  className?: string;
}
```

#### FilterBar

```typescript
interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}
```

#### FilterSelect

```typescript
interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  options: FilterSelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean; // default: true
  className?: string;
}
```

#### FilterCheckbox

```typescript
interface FilterCheckboxProps {
  options: FilterSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label?: string;
  className?: string;
}
```

#### StatsItem

```typescript
interface StatsItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}
```

### Source Reference (existing platform)

These components are ported from the existing BrainAnalytics platform (`football-dashboard-2` repo). The source files are reference only -- adapt to our conventions, do not copy verbatim.

| Source File | Our Component | Key Adaptations |
|---|---|---|
| `football-dashboard-2/src/components/charts/XYScatterChart.tsx` | `components/charts/XYScatterChart.tsx` | Use our design tokens, TypeScript strict types, PascalCase file |
| `football-dashboard-2/src/components/dashboard/filter-bar.tsx` | `components/dashboard/FilterBar.tsx` | PascalCase filename, use shadcn Card for container |
| `football-dashboard-2/src/components/dashboard/filter-select.tsx` | `components/dashboard/FilterSelect.tsx` | Build on shadcn Combobox/Command, PascalCase |
| `football-dashboard-2/src/components/dashboard/filter-checkbox.tsx` | `components/dashboard/FilterCheckbox.tsx` | Use shadcn Checkbox, PascalCase |
| `football-dashboard-2/src/components/dashboard/stats-item.tsx` | `components/dashboard/StatsItem.tsx` | PascalCase, use Tailwind design token classes |

### Color Reference (hardcoded brand values)

| Color | Hex | Usage |
|---|---|---|
| Sampdoria brand blue | `#1b5497` | Selected scatter point |
| League average reference | `#991b1b` | Reference line stroke |
| Default point | `#9ca3af` | Unselected scatter point fill |
| CartesianGrid | `#d0d0d0` | Grid line stroke |

All other colors must use CSS variables / Tailwind theme tokens.

### File Placement (project structure compliance)

```
apps/web/src/components/
  charts/                    # New directory [Epic 7]
    XYScatterChart.tsx       # Scatter chart with dual-axis metric selection
    index.ts                 # Barrel export
  dashboard/                 # New directory [Epic 7]
    FilterBar.tsx            # Filter container card
    FilterSelect.tsx         # Searchable dropdown select
    FilterCheckbox.tsx       # Checkbox filter group
    StatsItem.tsx            # Metric display primitive
    index.ts                 # Barrel export
```

This follows the project convention of organizing components by feature domain (not by type). The `charts/` and `dashboard/` directories are new and will be used by Epic 9 and Epic 10 dashboard stories.

### Testing Standards

- No Convex tests needed (purely frontend components).
- Visual verification in light/dark mode is sufficient for this story.
- Dashboard stories (Epic 9/10) will exercise these components with real data and are the appropriate place for integration/E2E tests.

### Dependencies

- **Depends on:** Story 7.1 (color palette and typography alignment) -- design tokens must be in place for theme consistency.
- **Blocks:** Stories 9.2-9.6, 10.1-10.6 (all analytics dashboards consume these components).
- **No dependency on:** Story 7.2 (pitch components) or Story 7.4 (dashboard cards) -- these are independent.

### Anti-Patterns to Avoid

- Do NOT wrap these components in shadcn `ChartContainer` -- they use Recharts directly for full control over scatter chart rendering. `ChartContainer` is for simpler bar/line charts.
- Do NOT create a new design system or custom theme provider -- use existing Tailwind classes and CSS variables.
- Do NOT add `"use client"` unless the component uses hooks or browser APIs (StatsItem and FilterBar are likely server-compatible).
- Do NOT import from `football-dashboard-2` -- these are new files adapted from reference, not symlinks or copies.
- Do NOT use kebab-case filenames -- project convention is PascalCase for component files.

### Project Structure Notes

- Alignment with unified project structure: new `charts/` and `dashboard/` directories under `apps/web/src/components/` match the feature-based organization pattern established by `calendar/`, `documents/`, `players/`, and `shared/`.
- The `dashboard/` directory name is chosen to match the source platform's organization and will house all dashboard-specific primitives (filters, stats displays, card layouts from Story 7.4).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7 -- Story 7.3 scope definition]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Organization -- feature-based component structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pre-installed Libraries -- recharts 2.15.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns -- PascalCase for components]
- [Source: _bmad-output/planning-artifacts/architecture.md#Anti-patterns to avoid -- no any types, use existing shadcn components]
- [Source: apps/web/src/components/ui/chart.tsx -- existing shadcn Recharts wrapper]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
