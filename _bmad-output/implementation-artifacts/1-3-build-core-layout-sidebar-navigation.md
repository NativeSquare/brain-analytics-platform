# Story 1.3: Build Core Layout & Sidebar Navigation

Status: ready-for-dev
Story Type: frontend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **IMPORTANT: Leverage the existing sidebar components from the monorepo template. Do NOT create a sidebar from scratch. Inspect the existing template code first and extend/customize it.**

## Story

As a user,
I want a consistent sidebar navigation with links to all main sections,
so that I can move between Calendar, Documents, Players, Dashboards, and Settings from any page.

## Acceptance Criteria

1. **Sidebar displays all required navigation items** — The sidebar contains navigation links for: Calendar, Documents, Players, Dashboards, and Settings. Each item has an appropriate icon from `@tabler/icons-react` and a visible label. The existing "Users" and "Team" links are preserved under a separate group (e.g., "Admin" or "Management").

2. **Active page is visually highlighted** — The navigation item corresponding to the current route is visually highlighted using the existing `isActive` prop on `SidebarMenuButton`. Highlight works for both exact matches (e.g., `/calendar`) and nested routes (e.g., `/calendar/today`, `/players/abc123`).

3. **Navigation links route correctly** — Clicking each navigation item navigates to the corresponding route: `/calendar`, `/documents`, `/players`, `/dashboards`, `/settings`. Each route has a placeholder page that renders without errors.

4. **Top bar includes notification bell placeholder** — The `SiteHeader` component is updated to include a notification bell icon button (placeholder — no functionality yet) positioned on the right side of the top bar. This reserves the layout space for the `NotificationCenter` component built in Story 1.4. A `ThemeToggle` button is also present in the top bar (if created in Story 1.2).

5. **Sidebar header displays BrainAnalytics branding** — The sidebar header shows the BrainAnalytics brand name (or "BrainAnalytics" text) with a logo icon, replacing the current "Admin Panel" label. The brand links to the homepage (`/`).

6. **Sidebar collapses gracefully on smaller screens** — On viewports below the `md` breakpoint (768px), the sidebar renders as an offcanvas drawer triggered by the `SidebarTrigger` button. On desktop, the sidebar supports icon-only collapsed mode via the existing `collapsible="icon"` behavior with keyboard shortcut (Ctrl+B / Cmd+B).

7. **Breadcrumb navigation updates dynamically** — The `SiteHeader` breadcrumb component generates breadcrumbs based on the current route for all new pages: Calendar, Documents, Players, Dashboards, Settings, plus nested sub-pages.

8. **Placeholder pages exist for all nav targets** — Each navigation destination has a placeholder `page.tsx` inside `apps/admin/src/app/(app)/` that renders a heading and "Coming Soon" message. Pages: `calendar/page.tsx`, `documents/page.tsx`, `players/page.tsx`, `dashboards/page.tsx`, `settings/page.tsx`.

9. **No regressions** — `pnpm typecheck` and `pnpm lint` pass with zero errors. The dev server starts without errors. Existing auth flow, protected routes, and theme toggle continue to work.

## Tasks / Subtasks

- [ ] **Task 1: Update sidebar navigation data** (AC: #1, #5)
  - [ ] 1.1: Open `apps/admin/src/components/application-shell2.tsx` and update the `navGroups` array to add a "Platform" navigation group with items: Calendar (`/calendar`, `IconCalendar`), Documents (`/documents`, `IconFolders`), Players (`/players`, `IconUsers`), Dashboards (`/dashboards`, `IconChartBar`), Settings (`/settings`, `IconSettings`)
  - [ ] 1.2: Move the existing "Users" and "Team" items into an "Admin" or "Management" group that appears below the Platform group
  - [ ] 1.3: Update the `SidebarHeader` to display "BrainAnalytics" instead of "Admin Panel", with subtitle "Football Ops" or similar, and link to `/` (homepage) instead of `/team`
  - [ ] 1.4: Import the required icons from `@tabler/icons-react`: `IconCalendar`, `IconFolders`, `IconUsers`, `IconChartBar`, `IconSettings`

- [ ] **Task 2: Update SiteHeader with notification placeholder and dynamic breadcrumbs** (AC: #4, #7)
  - [ ] 2.1: Open `apps/admin/src/components/site-header.tsx` and update the `getBreadcrumbs` function to handle all new routes: `/calendar` ("Calendar"), `/documents` ("Documents"), `/players` ("Players"), `/players/[id]` ("Players" > "Player Profile"), `/dashboards` ("Dashboards"), `/settings` ("Settings")
  - [ ] 2.2: Add a notification bell icon button (`IconBell` from `@tabler/icons-react`) to the right side of the header bar. This is a non-functional placeholder — no dropdown, no badge, just the icon button with `variant="ghost"` and `size="icon"`. Wrap in a `<div>` with `className="ml-auto flex items-center gap-2"` to push it to the right side
  - [ ] 2.3: If `ThemeToggle` was created in Story 1.2, place it next to the notification bell in the top bar right section

- [ ] **Task 3: Create placeholder pages** (AC: #3, #8)
  - [ ] 3.1: Create `apps/admin/src/app/(app)/calendar/page.tsx` — a simple page component rendering an `<h1>Calendar</h1>` heading and a placeholder message (e.g., "Calendar module coming soon.")
  - [ ] 3.2: Create `apps/admin/src/app/(app)/documents/page.tsx` — same pattern, heading "Documents"
  - [ ] 3.3: Create `apps/admin/src/app/(app)/players/page.tsx` — same pattern, heading "Players"
  - [ ] 3.4: Create `apps/admin/src/app/(app)/dashboards/page.tsx` — same pattern, heading "Dashboards"
  - [ ] 3.5: Create `apps/admin/src/app/(app)/settings/page.tsx` — same pattern, heading "Settings"
  - [ ] 3.6: Each placeholder page should use the existing layout structure (shadcn `Card` or simple container with padding) and be a valid React Server Component (no `"use client"` unless needed)

- [ ] **Task 4: Update the separate AppSidebar component (if still used)** (AC: #1)
  - [ ] 4.1: Check if `apps/admin/src/components/app-sidebar.tsx` is still imported anywhere. If yes, update it with the same navigation items as `application-shell2.tsx` for consistency. If it's unused, leave it or remove it to avoid confusion
  - [ ] 4.2: Ensure only one sidebar component is actively used by the layout

- [ ] **Task 5: Validate responsive behavior** (AC: #2, #6)
  - [ ] 5.1: Verify the sidebar uses `collapsible="icon"` for desktop collapse behavior (already configured in `application-shell2.tsx`)
  - [ ] 5.2: Verify the `SidebarTrigger` in `SiteHeader` toggles the sidebar on mobile viewports
  - [ ] 5.3: Confirm the `useMobile` hook (breakpoint: 768px) is used correctly by the sidebar provider for responsive switching
  - [ ] 5.4: Ensure all nav items show tooltips when the sidebar is in icon-only collapsed mode

- [ ] **Task 6: Validate no regressions** (AC: #9)
  - [ ] 6.1: Run `pnpm typecheck` — must pass with zero errors
  - [ ] 6.2: Run `pnpm lint` — must pass with zero errors
  - [ ] 6.3: Start the dev server with `pnpm dev` — must start without errors
  - [ ] 6.4: Navigate through all new routes (`/calendar`, `/documents`, `/players`, `/dashboards`, `/settings`) and confirm each renders its placeholder content
  - [ ] 6.5: Navigate to existing routes (`/team`, `/users`) and confirm they still work
  - [ ] 6.6: Confirm the sidebar active state highlights correctly when navigating between pages
  - [ ] 6.7: Confirm the auth flow still works (log out, log back in, land on protected route)

## Dev Notes

### Architecture Context

This story builds the **application shell** — the persistent layout wrapper that every authenticated page lives inside. It directly implements FR37 (sidebar navigation) and UX-DR2 (consistent sidebar navigation component). It also prepares the top bar layout for the notification center (UX-DR3, Story 1.4) and sets the stage for all module pages built in Epics 2-6.

**Key architectural decisions from architecture.md:**

- **Page structure:** All protected pages live under `apps/admin/src/app/(app)/` — the `(app)` route group applies the `ApplicationShell` layout via its `layout.tsx`
- **Component organization:** Sidebar and header are in `apps/admin/src/components/` (app-level components, not feature-specific)
- **Navigation items per FR37:** Calendar, Documents, Players, Dashboards, Settings
- **Sidebar UI:** Uses shadcn/ui `Sidebar` component system (already installed, 441+ lines in `ui/sidebar.tsx`)
- **Icon library:** `@tabler/icons-react` (already installed and used in existing sidebar)
- **Responsive behavior:** `useMobile` hook at 768px breakpoint; sidebar renders as offcanvas drawer on mobile

**What this story delivers:**
- Complete sidebar navigation with all platform sections
- Updated site header with notification bell placeholder
- BrainAnalytics branding in the sidebar header
- Placeholder pages for all navigation targets
- Dynamic breadcrumb navigation for all routes

**What this story does NOT include (deferred to later stories):**
- Notification center dropdown functionality (Story 1.4 / Epic 3)
- Actual page content for Calendar, Documents, Players, etc. (Epics 3-6)
- Backend data models or queries — this is purely frontend layout
- Role-based nav item visibility (deferred; all items visible to all roles for now)

### Current State (Baseline)

**`application-shell2.tsx`** is the active layout shell, containing:
- `AppSidebar` (local component) with `variant="inset"` and `collapsible="icon"`
- Navigation: Only 2 items — "Users" (`/users`) and "Team" (`/team`) in a "General" group
- `NavUser` (local component) in the sidebar footer with avatar, name, email, logout dropdown
- `SiteHeader` with breadcrumbs and `SidebarTrigger`
- `SidebarRail` for hover-to-expand in icon mode

**`app-sidebar.tsx`** is a separate, simpler sidebar component with the same 2 nav items. It uses `collapsible="offcanvas"` instead. It's imported by `nav-user.tsx` but the active layout uses `application-shell2.tsx`.

**`site-header.tsx`** handles breadcrumbs for `/team` and `/users` only. No right-side content (no notification bell, no theme toggle). Breadcrumb root links to `/team` labeled "General".

**`(app)/layout.tsx`** wraps children with `AdminGuard` > `ApplicationShell`.

### Navigation Structure to Implement

```
Sidebar Header: "BrainAnalytics" + icon → links to /

Platform (group)
├── Calendar     → /calendar     (IconCalendar)
├── Documents    → /documents    (IconFolders)
├── Players      → /players      (IconUsers or IconShirtSport)
├── Dashboards   → /dashboards   (IconChartBar)
└── Settings     → /settings     (IconSettings)

Management (group)
├── Users        → /users        (IconUsersGroup)
└── Team         → /team         (IconUsers)

Footer: NavUser (avatar + name + email + logout)
```

### Placeholder Page Pattern

Each placeholder page follows this minimal pattern:

```tsx
// apps/admin/src/app/(app)/calendar/page.tsx
export default function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="mt-2 text-muted-foreground">Calendar module coming soon.</p>
    </div>
  )
}
```

No `"use client"` directive — these are React Server Components. No Convex queries, no state. Just a heading and placeholder text.

### SiteHeader Update Pattern

```tsx
// Updated header with right-side actions
<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b ...">
  <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mx-2 ..." />
    <Breadcrumb>...</Breadcrumb>

    {/* Right-side actions — pushed right with ml-auto */}
    <div className="ml-auto flex items-center gap-2">
      {/* ThemeToggle if exists */}
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <IconBell className="h-4 w-4" />
      </Button>
    </div>
  </div>
</header>
```

### Breadcrumb Route Map

The `getBreadcrumbs` function should handle these routes:

| Route | Breadcrumb Trail |
|-------|-----------------|
| `/` | Home |
| `/calendar` | Calendar |
| `/calendar/today` | Calendar > Today |
| `/documents` | Documents |
| `/players` | Players |
| `/players/[id]` | Players > Player Profile |
| `/dashboards` | Dashboards |
| `/settings` | Settings |
| `/team` | Team |
| `/team/[id]` | Team > Member Details |
| `/users` | Users |
| `/users/[id]` | Users > User Details |

Consider refactoring `getBreadcrumbs` to be data-driven rather than if/else chains — a simple map from route segments to labels is more maintainable as pages grow.

### Icon Selection Guide

Use `@tabler/icons-react` (already installed). Recommended icons:

| Nav Item | Icon | Import |
|----------|------|--------|
| Calendar | `IconCalendar` | `@tabler/icons-react` |
| Documents | `IconFolders` | `@tabler/icons-react` |
| Players | `IconUsersGroup` or `IconShirtSport` | `@tabler/icons-react` |
| Dashboards | `IconChartBar` or `IconLayoutDashboard` | `@tabler/icons-react` |
| Settings | `IconSettings` | `@tabler/icons-react` |
| Notifications | `IconBell` | `@tabler/icons-react` |

Note: `IconUsers` is already used for "Team" and `IconUsersGroup` for "Users". For Players, consider `IconShirtSport` or `IconPlayFootball` to differentiate from the admin user management items. If those aren't available, `IconUser` (singular) or another distinct icon works.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Icon name doesn't exist in `@tabler/icons-react` | Check available icons at [tabler-icons.io](https://tabler-icons.io) before importing. Fallback to a similar icon if preferred name isn't available. |
| Two sidebar components create confusion | Task 4 explicitly resolves this — ensure only `application-shell2.tsx`'s sidebar is active. Remove or deprecate `app-sidebar.tsx` if unused. |
| Breadcrumb function becomes unwieldy | Use a data-driven approach (segment-to-label map) instead of nested if/else. |
| Placeholder pages don't work with `AdminGuard` | All pages under `(app)/` are wrapped by `AdminGuard` automatically via the layout. No extra auth needed on individual pages. |

### Alignment with Architecture Document

- **FR37:** "The sidebar navigation includes Calendar, Documents, Players, Dashboards, and Settings as main items" — directly implemented by this story [Source: epics.md#FR37]
- **UX-DR2:** "Implement consistent sidebar navigation component with Calendar, Documents, Players, Dashboards, Settings items" — directly implemented [Source: epics.md#UX-Design-Requirements]
- **Page structure:** Matches `architecture.md § Page Structure (apps/admin)` — `/calendar`, `/documents`, `/players`, `/settings` routes under `(app)/` [Source: architecture.md#Frontend-Architecture]
- **Component organization:** Sidebar lives in `components/` (app-level), not in a feature folder [Source: architecture.md#Component-Organization]
- **No detected conflicts or variances** with the architecture document

### References

- [Source: architecture.md#Frontend-Architecture] — Page structure, component organization, state management approach
- [Source: architecture.md#Selected-Starter-NativeSquare-Monorepo-Template] — Pre-installed UI components (Sidebar, Breadcrumb), icon library (@tabler/icons-react)
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions (PascalCase components, kebab-case routes), anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Complete directory structure showing page locations
- [Source: epics.md#Story-1.3] — Original story definition and BDD acceptance criteria
- [Source: epics.md#UX-Design-Requirements] — UX-DR2 (sidebar navigation), UX-DR3 (notification center — placeholder only here)

### Testing Notes

- **No automated tests required for this story.** This is a UI layout and navigation story.
- **Manual verification checklist:**
  - All 5 nav items visible in sidebar: Calendar, Documents, Players, Dashboards, Settings
  - Admin nav items visible: Users, Team
  - Clicking each nav item navigates to the correct route
  - Active nav item is visually highlighted (different background/color)
  - Sidebar header shows "BrainAnalytics" and links to `/`
  - Notification bell icon visible in the top bar (right side)
  - Breadcrumbs update correctly for each route
  - Sidebar collapses to icon-only mode on desktop (Ctrl+B)
  - Sidebar renders as offcanvas drawer on mobile (< 768px)
  - Tooltips appear on nav items in icon-only collapsed mode
  - `pnpm typecheck` passes
  - `pnpm lint` passes

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/admin/src/components/application-shell2.tsx` | Modified | Update navGroups with platform nav items, update sidebar header branding, add new icon imports |
| `apps/admin/src/components/site-header.tsx` | Modified | Add notification bell placeholder, expand breadcrumb route handling, add right-side action area |
| `apps/admin/src/app/(app)/calendar/page.tsx` | Created | Placeholder page for Calendar |
| `apps/admin/src/app/(app)/documents/page.tsx` | Created | Placeholder page for Documents |
| `apps/admin/src/app/(app)/players/page.tsx` | Created | Placeholder page for Players |
| `apps/admin/src/app/(app)/dashboards/page.tsx` | Created | Placeholder page for Dashboards |
| `apps/admin/src/app/(app)/settings/page.tsx` | Created | Placeholder page for Settings |
| `apps/admin/src/components/app-sidebar.tsx` | Modified/Removed | Resolve duplicate sidebar — update for consistency or remove if unused |

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
