# Story 7.4: Port Dashboard Cards, Gallery Grid & Pin/Recent Tracking

Status: done
Story Type: fullstack
Points: 8

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` -- that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **IMPORTANT: Before creating ANY custom component, check if a shadcn/ui component exists that can be used or extended. Use `npx shadcn@latest add <component>` to install missing shadcn components. Only create custom components when no suitable shadcn component exists.**

## Story

As an authenticated user,
I want to see dashboards presented as visual cards in a responsive gallery grid, pin my favorite dashboards for quick access, and have my recently opened dashboards tracked automatically,
so that I can efficiently navigate to the analytics dashboards I use most often.

## Epic Context

**Epic 7 -- Design System Alignment:** Adapt our UI to match the visual identity of the existing BrainAnalytics platform. This story ports the dashboard card system, gallery grid layout, pin/recent tracking, and the Lucide icon mapping used across all dashboard cards.

**Downstream consumers:** Story 9.1 (Dashboard Gallery Page & Role-Based Access Control) depends on the card component, gallery grid, and pin/recent Convex tables built in this story.

**Source files (reference implementation in `football-dashboard-2`):**
- `src/components/dashboard/dashboard-card-item.tsx` -- card component with pin toggle, hover effects
- `src/lib/dashboard-icons.ts` -- 40+ Lucide icon mapping by slug/category
- Supabase tables: `user_pinned_dashboards`, `user_recent_dashboards`

**Architecture difference:** We use Convex, not Supabase. The pin/recent tables are Convex tables with real-time subscriptions. Pin toggle and recent tracking are Convex mutations.

---

## Acceptance Criteria (BDD)

### AC-1: Dashboard Card Component

**Given** the design system is configured (Story 7.1 complete) and the developer imports `<DashboardCardItem />`
**When** the component is rendered with props `{ title, description, icon, slug, allowedRoles, isPinned, onPinToggle }`
**Then** the card displays:
  - An icon badge in the top-left area with the mapped Lucide icon on a `primary/15` background
  - The dashboard title as a heading
  - The dashboard description as muted body text
  - Allowed roles rendered as shadcn/ui `Badge` components
  - A pin icon button (Lucide `Pin`) in the top-right corner, visually filled/highlighted when `isPinned` is true
**And** the card is wrapped in a `Link` component navigating to `/dashboards/[slug]`
**And** the component accepts all props as typed TypeScript interfaces (no `any`)

### AC-2: Card Hover Transition

**Given** a `<DashboardCardItem />` is rendered in its default state
**When** the user hovers over the card
**Then** the card applies these CSS transitions simultaneously:
  - `transform: translateY(-0.125rem)` (Tailwind `-translate-y-0.5`)
  - `border-color` shifts to `primary/50`
  - `box-shadow` transitions to `shadow-lg`
**And** all transitions use `transition-all duration-200` for smooth animation
**And** on mouse-out the card returns to its default state with the same transition timing

### AC-3: Pin Toggle Behavior

**Given** the user is viewing a dashboard card with a pin button
**When** the user clicks the pin icon button
**Then** the click event does NOT propagate to the card link (no navigation occurs)
**And** the `onPinToggle` callback is invoked with the dashboard ID
**And** the pin icon visually toggles between unpinned (outline) and pinned (filled) states

### AC-4: Convex Table -- userPinnedDashboards

**Given** the Convex schema is defined
**When** the developer inspects the `userPinnedDashboards` table definition
**Then** the table has the following schema:

```typescript
// packages/backend/convex/table/userPinnedDashboards.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userPinnedDashboards = defineTable({
  userId: v.id("users"),
  dashboardId: v.string(),   // slug or external ID (dashboards table does not exist yet)
  teamId: v.id("teams"),
  pinnedAt: v.number(),       // timestamp in ms
})
  .index("by_userId_teamId", ["userId", "teamId"])
  .index("by_userId_dashboardId", ["userId", "dashboardId"])
  .index("by_teamId", ["teamId"]);
```

**And** the table is registered in `packages/backend/convex/schema.ts`

### AC-5: Convex Table -- userRecentDashboards

**Given** the Convex schema is defined
**When** the developer inspects the `userRecentDashboards` table definition
**Then** the table has the following schema:

```typescript
// packages/backend/convex/table/userRecentDashboards.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userRecentDashboards = defineTable({
  userId: v.id("users"),
  dashboardId: v.string(),   // slug or external ID (dashboards table does not exist yet)
  teamId: v.id("teams"),
  openedAt: v.number(),       // timestamp in ms
})
  .index("by_userId_teamId", ["userId", "teamId"])
  .index("by_userId_dashboardId", ["userId", "dashboardId"])
  .index("by_teamId", ["teamId"]);
```

**And** the table is registered in `packages/backend/convex/schema.ts`

### AC-6: Pin Toggle Mutation

**Given** the user is authenticated and belongs to a team
**When** the `togglePinDashboard` Convex mutation is called with `{ dashboardId }`
**Then** if the dashboard is NOT currently pinned by this user, a new `userPinnedDashboards` record is inserted with `pinnedAt = Date.now()`
**And** if the dashboard IS currently pinned by this user, the existing record is deleted
**And** the mutation validates that the caller is authenticated (via `getAuthUserId`)
**And** the mutation uses the caller's `teamId` from their user record for tenant scoping

### AC-7: Recent Dashboard Tracking Mutation

**Given** the user is authenticated and belongs to a team
**When** the `trackDashboardOpen` Convex mutation is called with `{ dashboardId }`
**Then** if no `userRecentDashboards` record exists for this user + dashboardId, a new record is inserted with `openedAt = Date.now()`
**And** if a record already exists for this user + dashboardId, its `openedAt` field is updated to `Date.now()`
**And** the mutation validates that the caller is authenticated (via `getAuthUserId`)
**And** the mutation uses the caller's `teamId` from their user record for tenant scoping

### AC-8: Pin and Recent Query Functions

**Given** the user is authenticated
**When** the `getUserPinnedDashboards` Convex query is called
**Then** it returns all pinned dashboard IDs for the current user scoped to their team, sorted by `pinnedAt` descending
**And** when the `getUserRecentDashboards` Convex query is called with `{ limit?: number }`
**Then** it returns the most recent dashboard IDs for the current user scoped to their team, sorted by `openedAt` descending, limited to `limit` (default 10)
**And** both queries use real-time Convex subscriptions (no manual polling)

### AC-9: Dashboard Icon Mapping

**Given** the developer imports the `getDashboardIcon` utility
**When** called with a string key (slug or category name)
**Then** it returns the corresponding Lucide icon component from a mapping of 40+ icons including at minimum:
  - `Activity`, `BarChart3`, `Trophy`, `Medal`, `Dumbbell`, `Goal`, `MonitorPlay`, `ChartColumnIncreasing`
  - `TrendingUp`, `Users`, `Shield`, `Target`, `Crosshair`, `Timer`, `Calendar`, `Map`
  - `Zap`, `Heart`, `Star`, `Flag`, `Radar`, `PieChart`, `LineChart`, `BarChart`
  - `Gauge`, `Eye`, `Swords`, `Footprints`, `Waypoints`, `LayoutGrid`, `GitCompare`, `Layers`
  - `ArrowUpDown`, `Percent`, `Hash`, `ListChecks`, `Table`, `Columns`, `CircleDot`, `Maximize`
**And** if the key is not found in the mapping, the function returns `ChartColumnIncreasing` as the default fallback
**And** the mapping is exported from `apps/web/src/lib/dashboard-icons.ts`

### AC-10: Gallery Grid Layout

**Given** multiple `<DashboardCardItem />` components are rendered inside a `<DashboardGalleryGrid />` wrapper
**When** the viewport is at different breakpoints
**Then** the grid renders:
  - 1 column on small screens (default)
  - 2 columns at the `md` breakpoint (`md:grid-cols-2`)
  - 3 columns at the `xl` breakpoint (`xl:grid-cols-3`)
**And** grid items have consistent gap spacing (using `gap-4` or `gap-6`)
**And** the grid component is a simple wrapper that applies the responsive grid CSS classes

---

## Implementation Notes

### File Locations

| Artifact | Path |
|---|---|
| Dashboard Card Component | `apps/web/src/components/dashboard/dashboard-card-item.tsx` |
| Gallery Grid Component | `apps/web/src/components/dashboard/dashboard-gallery-grid.tsx` |
| Dashboard Icon Mapping | `apps/web/src/lib/dashboard-icons.ts` |
| Convex Table: userPinnedDashboards | `packages/backend/convex/table/userPinnedDashboards.ts` |
| Convex Table: userRecentDashboards | `packages/backend/convex/table/userRecentDashboards.ts` |
| Convex Mutations & Queries | `packages/backend/convex/userDashboards.ts` |
| Schema Registration | `packages/backend/convex/schema.ts` (add imports) |

### Convex Patterns to Follow

- Follow the existing table definition pattern in `packages/backend/convex/table/documentReads.ts` -- simple `defineTable` with indexes, no `generateFunctions` helper needed for these tables.
- Mutations must use `getAuthUserId` from `@convex-dev/auth/server` for authentication.
- Mutations must look up the user's `teamId` from their user record for tenant scoping -- never trust client-provided teamId.
- Use `ctx.db.query("tableName").withIndex("indexName", ...)` for efficient lookups.

### Card Component Notes

- The pin button must call `e.preventDefault()` and `e.stopPropagation()` to prevent the parent `Link` from navigating when the pin is clicked.
- Use shadcn/ui `Button` with `variant="ghost"` and `size="icon"` for the pin toggle.
- Use shadcn/ui `Badge` for role labels.
- The icon badge area should use a `div` with `bg-primary/15 rounded-md p-2` to match the reference implementation.

### dashboardId Field Type

The `dashboardId` field is typed as `v.string()` (not `v.id("dashboards")`) because the `dashboards` table does not yet exist. It will be created in Story 9.1. When Story 9.1 creates the `dashboards` table, a migration may update this field to use `v.id("dashboards")`. For now, use the dashboard slug as the identifier.

### Testing Considerations

- The card component should be testable in isolation with mock props (no Convex dependency in the component itself).
- Pin/recent mutations should be tested with Convex test helpers to verify insert/update/delete behavior.
- Verify that the pin toggle mutation is idempotent (toggling twice returns to original state).
- Verify that `trackDashboardOpen` upserts correctly (does not create duplicates).

---

## Dependencies

- **Story 7.1** (Align Color Palette, Typography & Spacing) -- the card uses design tokens from the aligned theme.
- **No blocking dependencies** for the Convex tables -- they are self-contained.

## Definition of Done

1. `DashboardCardItem` component renders with all specified props, hover transitions, and pin toggle.
2. `DashboardGalleryGrid` component renders responsive 1/2/3 column grid.
3. `getDashboardIcon` returns correct Lucide icons for 40+ keys with fallback.
4. `userPinnedDashboards` and `userRecentDashboards` Convex tables are defined and registered in the schema.
5. `togglePinDashboard` mutation correctly inserts/deletes pin records.
6. `trackDashboardOpen` mutation correctly inserts/upserts recent records.
7. `getUserPinnedDashboards` and `getUserRecentDashboards` queries return correctly sorted, team-scoped results.
8. All TypeScript types are explicit -- no `any` casts.
9. All mutations enforce authentication and tenant scoping server-side.
