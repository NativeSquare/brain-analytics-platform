# Story 9.1: Dashboard Gallery Page & Role-Based Access Control

Status: draft
Story Type: fullstack
Points: 13

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` -- that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **IMPORTANT: Before creating ANY custom component, check if a shadcn/ui component exists that can be used or extended. Use `npx shadcn@latest add <component>` to install missing shadcn components. Only create custom components when no suitable shadcn component exists.**

## Story

As an authenticated user,
I want to browse a gallery of analytics dashboards filtered by my role, search/filter by title or category, and navigate to individual dashboard pages via dynamic routing,
so that I can quickly find and access the dashboards relevant to my responsibilities.

As an admin,
I want to configure which roles can access which dashboards and manage dashboard metadata from an admin settings tab,
so that I can control dashboard visibility across the organization.

## Epic Context

**Epic 9 -- Analytics Dashboards -- Core:** Build the five core analytics dashboard pages. This story is the foundation: it creates the gallery page, the dashboard registry, role-based access control, and the dynamic routing infrastructure that all subsequent dashboard stories (9.2-9.5) depend on.

**Dependencies:**
- **Story 7.4** (Dashboard Cards, Gallery Grid & Pin/Recent Tracking) -- provides `<DashboardCardItem />`, `<DashboardGalleryGrid />`, `getDashboardIcon`, pin/recent Convex tables and mutations.
- **Epic 8** (Data Integrations) -- StatsBomb/Sportmonks connections that dashboard components will consume.

**Source files (reference implementation in `football-dashboard-2`):**
- `src/app/dashboards/page.tsx` -- gallery page with search, filter, role-filtered grid
- `src/app/dashboards/[slug]/page.tsx` -- dynamic dashboard routing
- Supabase tables: `dashboards`, `role_dashboards`
- Admin panel: dashboard management tab with role assignment checkboxes

**Architecture difference:** We use Convex tables instead of Supabase. Real-time subscriptions for all data. Dashboard component registry maps slugs to React components.

---

## Acceptance Criteria (BDD)

### AC-1: Convex Table -- dashboards

**Given** the Convex schema is defined
**When** the developer inspects the `dashboards` table definition
**Then** the table has the following schema:

```typescript
// packages/backend/convex/table/dashboards.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const dashboards = defineTable({
  teamId: v.id("teams"),
  title: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("Match Analysis"),
    v.literal("Season Analysis"),
    v.literal("Player Analysis"),
    v.literal("Tactical"),
    v.literal("Set Pieces"),
    v.literal("Opposition"),
    v.literal("Trends"),
    v.literal("Officials"),
    v.literal("Possession")
  ),
  icon: v.string(),          // key into getDashboardIcon mapping (e.g., "Activity", "BarChart3")
  slug: v.string(),           // URL-safe identifier, unique per team
  createdAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_slug", ["teamId", "slug"])
  .index("by_teamId_category", ["teamId", "category"]);
```

**And** the table is registered in `packages/backend/convex/schema.ts`

### AC-2: Convex Table -- roleDashboards

**Given** the Convex schema is defined
**When** the developer inspects the `roleDashboards` table definition
**Then** the table has the following schema:

```typescript
// packages/backend/convex/table/roleDashboards.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const roleDashboards = defineTable({
  teamId: v.id("teams"),
  role: v.union(
    v.literal("admin"),
    v.literal("coach"),
    v.literal("analyst"),
    v.literal("physio"),
    v.literal("player"),
    v.literal("staff")
  ),
  dashboardSlug: v.string(),  // references dashboards.slug (not v.id -- allows seed data without ID coupling)
  createdAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_role", ["teamId", "role"])
  .index("by_teamId_dashboardSlug", ["teamId", "dashboardSlug"])
  .index("by_teamId_role_dashboardSlug", ["teamId", "role", "dashboardSlug"]);
```

**And** the table is registered in `packages/backend/convex/schema.ts`

### AC-3: Seed Data -- 11 Dashboard Entries

**Given** the Convex seed function is executed for a team
**When** the dashboards table is populated
**Then** the following 11 dashboard entries exist:

| slug | title | category | icon |
|---|---|---|---|
| `season-overview` | Season Overview | Season Analysis | `ChartColumnIncreasing` |
| `post-match` | Post-Match Analysis | Match Analysis | `Activity` |
| `shot-map` | Shot Map | Match Analysis | `Target` |
| `heat-maps` | Heat Maps | Player Analysis | `Map` |
| `event-map` | Event Map | Match Analysis | `Waypoints` |
| `player-analysis` | Player Analysis | Player Analysis | `Users` |
| `set-pieces` | Set Pieces | Set Pieces | `Flag` |
| `opposition-analysis` | Opposition Analysis | Opposition | `Swords` |
| `team-trends` | Team Trends | Trends | `TrendingUp` |
| `referee-analysis` | Referee Analysis | Officials | `Shield` |
| `view-possessions` | Possession Analysis | Possession | `PieChart` |

**And** each entry includes a meaningful description (1-2 sentences)
**And** each entry has a `createdAt` timestamp set to `Date.now()` at seed time
**And** the seed function is idempotent -- running it again does not create duplicates (check by `teamId` + `slug`)

### AC-4: Seed Data -- Default Role-Dashboard Assignments

**Given** the seed function has populated the dashboards table
**When** the roleDashboards table is populated
**Then** the following default assignments exist:

- **admin**: all 11 dashboards
- **coach**: season-overview, post-match, shot-map, heat-maps, event-map, player-analysis, set-pieces, opposition-analysis, team-trends
- **analyst**: all 11 dashboards
- **physio**: player-analysis, heat-maps
- **player**: season-overview, post-match, player-analysis
- **staff**: season-overview, post-match

**And** the seed function is idempotent -- running it again does not create duplicate role assignments (check by `teamId` + `role` + `dashboardSlug`)

### AC-5: Dashboard Gallery Page -- Layout & Rendering

**Given** the user is authenticated and has a role assigned
**When** the user navigates to `/dashboards`
**Then** the page displays:
  - A page heading "Dashboards" with subtitle "Browse and access your analytics dashboards."
  - A search input (shadcn/ui `Input` with search icon) that filters dashboards by title (case-insensitive partial match)
  - A category filter dropdown (shadcn/ui `Select`) with options: "All Categories" (default) plus each unique category from the dashboards data
  - A `<DashboardGalleryGrid />` (from Story 7.4) rendering `<DashboardCardItem />` for each accessible dashboard
**And** the grid uses responsive columns: 1 col default, `md:grid-cols-2`, `xl:grid-cols-3`
**And** the page layout uses `px-4 lg:px-6` horizontal padding consistent with the team page

### AC-6: Dashboard Gallery -- Role-Based Filtering

**Given** the user is authenticated with role R and belongs to team T
**When** the gallery page loads
**Then** a Convex query `getDashboardsForRole` is called with the user's role and teamId
**And** the query:
  1. Fetches all `roleDashboards` entries where `teamId = T` and `role = R`
  2. Fetches all `dashboards` entries where `teamId = T`
  3. Returns only dashboards whose `slug` appears in the user's role assignments
  4. Includes the full dashboard data (title, description, category, icon, slug)
**And** only dashboards assigned to the user's role are displayed
**And** a user with no role assignments sees an empty state: "No dashboards available for your role."

### AC-7: Dashboard Gallery -- Pin Integration

**Given** the gallery page is loaded with role-filtered dashboards
**When** the dashboards are rendered
**Then** pinned dashboards (from `userPinnedDashboards` table, Story 7.4) appear first in the grid, sorted by `pinnedAt` descending
**And** unpinned dashboards appear after, sorted alphabetically by title
**And** each card's `isPinned` prop reflects the current pin state via real-time Convex subscription
**And** clicking the pin toggle on a card calls `togglePinDashboard` (Story 7.4 mutation) and the UI updates in real-time without page refresh

### AC-8: Dashboard Gallery -- Search & Filter

**Given** the gallery page displays dashboards
**When** the user types in the search input
**Then** the displayed dashboards are filtered to only those whose `title` contains the search text (case-insensitive)
**And** the filtering happens client-side with no debounce delay (the dataset is small)
**When** the user selects a category from the dropdown
**Then** only dashboards matching that category are shown
**And** search and category filter combine: both conditions must match for a dashboard to appear
**And** when the user clears the search or selects "All Categories", the full role-filtered list is restored

### AC-9: Dashboard Gallery -- Role Badges on Cards

**Given** a dashboard card is rendered in the gallery
**When** the user views the card
**Then** the card displays badges for each role that has access to that dashboard
**And** the badges use the role labels from `ROLE_LABELS` in `apps/web/src/utils/roles.ts` (e.g., "Coach" not "coach", "Physio / Medical" not "physio")
**And** a Convex query `getRolesForDashboard` returns all roles assigned to a given dashboard slug within the team

### AC-10: Dynamic Routing -- Dashboard Slug Page

**Given** the Next.js app router is configured
**When** the user navigates to `/dashboards/[slug]` (e.g., `/dashboards/season-overview`)
**Then** the page:
  1. Reads the `slug` param from the URL
  2. Calls a Convex query `getDashboardBySlug` with `{ slug, teamId }` to fetch the dashboard metadata
  3. Checks that the current user's role has access to this dashboard (via `roleDashboards`)
  4. If authorized, renders the matching dashboard component from the component registry
  5. Calls `trackDashboardOpen` (Story 7.4 mutation) to log the visit
**And** the page layout includes a breadcrumb: Dashboards > [Dashboard Title]
**And** the page file is located at `apps/web/src/app/(app)/dashboards/[slug]/page.tsx`

### AC-11: Dynamic Routing -- Component Registry

**Given** a dashboard component registry is defined
**When** the developer inspects the registry
**Then** it maps dashboard slugs to lazy-loaded React components:

```typescript
// apps/web/src/lib/dashboard-registry.ts
import { lazy, type ComponentType } from "react";

type DashboardComponent = ComponentType<{ slug: string }>;

const registry: Record<string, () => Promise<{ default: DashboardComponent }>> = {
  "season-overview": () => import("@/components/dashboards/season-overview"),
  "post-match": () => import("@/components/dashboards/post-match"),
  "shot-map": () => import("@/components/dashboards/shot-map"),
  "heat-maps": () => import("@/components/dashboards/heat-maps"),
  "event-map": () => import("@/components/dashboards/event-map"),
  "player-analysis": () => import("@/components/dashboards/player-analysis"),
  "set-pieces": () => import("@/components/dashboards/set-pieces"),
  "opposition-analysis": () => import("@/components/dashboards/opposition-analysis"),
  "team-trends": () => import("@/components/dashboards/team-trends"),
  "referee-analysis": () => import("@/components/dashboards/referee-analysis"),
  "view-possessions": () => import("@/components/dashboards/view-possessions"),
};

export function getDashboardComponent(slug: string): ComponentType<{ slug: string }> | null {
  const loader = registry[slug];
  if (!loader) return null;
  return lazy(loader);
}
```

**And** each dashboard component file exports a default component that accepts `{ slug: string }` props
**And** for this story, each component renders a placeholder: the dashboard title + "Coming soon" message (actual implementations come in Stories 9.2-9.5)

### AC-12: Dynamic Routing -- Access Denied & 404

**Given** the user navigates to `/dashboards/[slug]`
**When** the slug does not match any dashboard in the `dashboards` table for the user's team
**Then** a 404 page is displayed (use Next.js `notFound()`)
**When** the slug matches a dashboard but the user's role does not have access
**Then** an "Access Denied" message is displayed: "You don't have permission to view this dashboard. Contact your admin to request access."
**And** the access denied page includes a "Back to Dashboards" link

### AC-13: Admin Tab -- Dashboard Management

**Given** the user has the "admin" role and navigates to the `/team` page
**When** the admin views the page
**Then** a new "Dashboards" tab is available (using shadcn/ui `Tabs` if not already tabbed, or adding to existing tabs)
**And** the tab displays a table of all dashboards for the team with columns:
  - Icon (rendered Lucide icon)
  - Title
  - Category
  - Slug
  - Role checkboxes (one column per role: Admin, Coach, Analyst, Physio / Medical, Player, Staff)
**And** each role checkbox reflects the current `roleDashboards` assignment state

### AC-14: Admin Tab -- Toggle Role Access

**Given** the admin is viewing the Dashboards management tab
**When** the admin checks or unchecks a role checkbox for a dashboard
**Then** a Convex mutation `toggleRoleDashboardAccess` is called with `{ dashboardSlug, role }`
**And** if the role-dashboard assignment exists, it is deleted
**And** if the role-dashboard assignment does not exist, it is created with `createdAt = Date.now()`
**And** the mutation validates:
  - The caller is authenticated
  - The caller has the "admin" role
  - The caller's `teamId` is used for tenant scoping (never trust client-provided teamId)
**And** the UI updates in real-time via Convex subscription

### AC-15: Admin Tab -- Create Dashboard Entry

**Given** the admin is viewing the Dashboards management tab
**When** the admin clicks "Add Dashboard"
**Then** a dialog (shadcn/ui `Dialog`) opens with a form containing:
  - Title (required, text input)
  - Description (required, textarea)
  - Category (required, select dropdown with the category union values)
  - Icon (required, select dropdown or searchable combobox listing available icon keys from `getDashboardIcon`)
**And** the slug is auto-generated from the title (lowercase, spaces replaced with hyphens, special characters removed)
**And** the slug is displayed as a read-only preview below the title input
**When** the admin submits the form
**Then** a Convex mutation `createDashboard` is called with `{ title, description, category, icon }`
**And** the mutation validates:
  - The caller is authenticated and has the "admin" role
  - The slug is unique within the team (error if duplicate)
  - The caller's `teamId` is used for tenant scoping
**And** the new dashboard appears in the table immediately via real-time subscription

### AC-16: Admin Tab -- Edit Dashboard Metadata

**Given** the admin is viewing the Dashboards management tab
**When** the admin clicks an edit button on a dashboard row
**Then** a dialog opens pre-filled with the dashboard's current title, description, category, and icon
**And** the admin can modify any field
**And** the slug is re-generated if the title changes (displayed as preview)
**When** the admin submits the edit form
**Then** a Convex mutation `updateDashboard` is called with the updated fields
**And** the mutation validates:
  - The caller is authenticated and has the "admin" role
  - If the slug changed, the new slug is unique within the team
  - The caller's `teamId` is used for tenant scoping
**And** the table updates in real-time

---

## Implementation Notes

### File Locations

| Artifact | Path |
|---|---|
| Convex Table: dashboards | `packages/backend/convex/table/dashboards.ts` |
| Convex Table: roleDashboards | `packages/backend/convex/table/roleDashboards.ts` |
| Dashboard Queries | `packages/backend/convex/dashboards/queries.ts` |
| Dashboard Mutations | `packages/backend/convex/dashboards/mutations.ts` |
| Seed Data | `packages/backend/convex/seed.ts` (add dashboard + roleDashboard seeding) |
| Schema Registration | `packages/backend/convex/schema.ts` (add imports) |
| Gallery Page | `apps/web/src/app/(app)/dashboards/page.tsx` (replace placeholder) |
| Dynamic Route Page | `apps/web/src/app/(app)/dashboards/[slug]/page.tsx` |
| Dashboard Registry | `apps/web/src/lib/dashboard-registry.ts` |
| Placeholder Components | `apps/web/src/components/dashboards/[slug].tsx` (11 files) |
| Admin Dashboards Tab | `apps/web/src/components/app/dashboard/admin-dashboards-tab.tsx` |
| Team Page (add tab) | `apps/web/src/app/(app)/team/page.tsx` |

### Convex Patterns to Follow

- Follow the existing table definition pattern in `packages/backend/convex/table/documentReads.ts` -- simple `defineTable` with indexes.
- Follow the existing mutation pattern in `packages/backend/convex/contracts/mutations.ts` for admin-only mutations with auth + role checks.
- Mutations must use `getAuthUserId` from `@convex-dev/auth/server` for authentication.
- Mutations must look up the user's `teamId` and `role` from their user record -- never trust client-provided values.
- Use `ctx.db.query("tableName").withIndex("indexName", ...)` for efficient lookups.
- Role type must match the `UserRole` union defined on the users table: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`.

### Slug Generation

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
```

### Query Design

- `getDashboardsForRole({ teamId, role })` -- returns dashboards the role can see. Joins `roleDashboards` with `dashboards` via slug matching. This is the primary query for the gallery page.
- `getDashboardBySlug({ teamId, slug })` -- returns a single dashboard by slug. Used by the `[slug]` page.
- `getRolesForDashboard({ teamId, dashboardSlug })` -- returns all roles assigned to a dashboard. Used to render role badges on cards.
- `getAllDashboards({ teamId })` -- returns all dashboards for the team. Used by the admin tab.
- `getRoleDashboardAssignments({ teamId })` -- returns all role-dashboard assignments. Used by the admin tab to populate checkboxes.

### Admin Tab Integration

The `/team` page currently renders `AdminTable`, `PendingInvites`, and `InviteDialog` directly. To add the Dashboards tab:
1. Wrap the existing team member content and the new dashboards content in shadcn/ui `Tabs`.
2. Tab 1: "Members" (existing content).
3. Tab 2: "Dashboards" (new `AdminDashboardsTab` component).
4. Only show the "Dashboards" tab if the user's role is "admin".

### Placeholder Dashboard Components

For this story, create 11 minimal placeholder components at `apps/web/src/components/dashboards/[slug].tsx`. Each exports a default component:

```tsx
export default function SeasonOverview({ slug }: { slug: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <h2 className="text-xl font-semibold">Season Overview</h2>
      <p className="mt-2 text-muted-foreground">Dashboard coming soon.</p>
    </div>
  );
}
```

### Testing Considerations

- Convex queries must be tested to verify role filtering returns only authorized dashboards.
- `toggleRoleDashboardAccess` mutation must be tested to verify it is admin-only (non-admin callers get an error).
- `createDashboard` mutation must be tested to verify slug uniqueness enforcement.
- Seed function must be tested for idempotency (run twice, assert no duplicates).
- Gallery page should be testable with mock Convex data.
- Access denied and 404 cases on `[slug]` page must be verified.

---

## Dependencies

- **Story 7.4** (Dashboard Cards, Gallery Grid & Pin/Recent) -- provides `<DashboardCardItem />`, `<DashboardGalleryGrid />`, `getDashboardIcon`, pin/recent tables and mutations. Must be complete before this story.
- **Epic 8** (Data Integrations) -- not a blocker for this story (placeholder components don't need data), but dashboard components in Stories 9.2-9.5 will consume the data routes.

## Definition of Done

1. `dashboards` Convex table is defined with all fields, indexes, and registered in the schema.
2. `roleDashboards` Convex table is defined with all fields, indexes, and registered in the schema.
3. Seed function populates 11 dashboard entries and default role assignments idempotently.
4. Gallery page at `/dashboards` renders role-filtered dashboards in a responsive grid.
5. Search by title and filter by category work correctly and combine.
6. Pinned dashboards appear first; pin toggle works via real-time subscription.
7. Role badges display on each card showing which roles have access.
8. `/dashboards/[slug]` renders the correct dashboard component from the registry.
9. `trackDashboardOpen` is called when a dashboard page loads.
10. 404 is shown for unknown slugs; access denied is shown for unauthorized roles.
11. Admin "Dashboards" tab on `/team` page lists all dashboards with role checkboxes.
12. Admin can toggle role access, create new dashboards, and edit dashboard metadata.
13. All mutations enforce authentication, admin-role authorization (where applicable), and tenant scoping.
14. All TypeScript types are explicit -- no `any` casts.
15. 11 placeholder dashboard components exist and are lazy-loaded via the component registry.
