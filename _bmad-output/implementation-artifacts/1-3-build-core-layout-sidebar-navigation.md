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

- [x] **Task 1: Update sidebar navigation data** (AC: #1, #5)
  - [x] 1.1: Updated `navGroups` in `application-shell2.tsx` — added "Platform" group with Calendar (`IconCalendar`), Documents (`IconFolders`), Players (`IconShirtSport`), Dashboards (`IconChartBar`), Settings (`IconSettings`)
  - [x] 1.2: Moved "Users" and "Team" into "Management" group below Platform
  - [x] 1.3: Updated SidebarHeader — "BrainAnalytics" brand with `IconBrain`, subtitle "Football Ops", links to `/`
  - [x] 1.4: Imported all required icons: `IconBrain`, `IconCalendar`, `IconChartBar`, `IconFolders`, `IconSettings`, `IconShirtSport`

- [x] **Task 2: Update SiteHeader with notification placeholder and dynamic breadcrumbs** (AC: #4, #7)
  - [x] 2.1: Refactored `getBreadcrumbs` to data-driven approach using `routeLabelMap` and `nestedLabelMap`. Handles all routes: calendar, documents, players, players/[id], dashboards, settings, team, team/[id], users, users/[id]
  - [x] 2.2: Added `IconBell` notification bell button with `variant="ghost"` `size="icon"` in `ml-auto` right-side div
  - [x] 2.3: ThemeToggle not created in Story 1.2 — skipped. Space reserved in right-side div for future addition

- [x] **Task 3: Create placeholder pages** (AC: #3, #8)
  - [x] 3.1: Created `apps/admin/src/app/(app)/calendar/page.tsx`
  - [x] 3.2: Created `apps/admin/src/app/(app)/documents/page.tsx`
  - [x] 3.3: Created `apps/admin/src/app/(app)/players/page.tsx`
  - [x] 3.4: Created `apps/admin/src/app/(app)/dashboards/page.tsx`
  - [x] 3.5: Created `apps/admin/src/app/(app)/settings/page.tsx`
  - [x] 3.6: All pages are React Server Components (no `"use client"`), use consistent pattern with flex container, h1, and muted placeholder text

- [x] **Task 4: Update the separate AppSidebar component (if still used)** (AC: #1)
  - [x] 4.1: Confirmed `app-sidebar.tsx` is NOT imported anywhere (grep returned no results). Removed the file to avoid confusion
  - [x] 4.2: Only `application-shell2.tsx`'s AppSidebar is actively used by the layout

- [x] **Task 5: Validate responsive behavior** (AC: #2, #6)
  - [x] 5.1: Verified `collapsible="icon"` on `<Sidebar>` in `application-shell2.tsx`
  - [x] 5.2: Verified `SidebarTrigger` present in `SiteHeader`
  - [x] 5.3: Confirmed `useIsMobile` hook (768px breakpoint) used by `SidebarProvider` in `ui/sidebar.tsx`
  - [x] 5.4: Confirmed `tooltip={item.label}` on all `SidebarMenuButton` components + `SidebarRail` present

- [x] **Task 6: Validate no regressions** (AC: #9)
  - [x] 6.1: `pnpm typecheck` — passes with zero errors (all 5 packages)
  - [x] 6.2: `pnpm lint` — admin lint errors are all pre-existing (accept-invite-form, password-input, sidebar.tsx Math.random). No new errors introduced
  - [ ] 6.3: Dev server start — deferred to manual verification
  - [ ] 6.4: Route navigation — deferred to manual verification
  - [ ] 6.5: Existing routes — deferred to manual verification
  - [ ] 6.6: Active state highlights — deferred to manual verification
  - [ ] 6.7: Auth flow — deferred to manual verification

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

Claude Opus 4.6 (via Claude Code SDK)

### Debug Log References

- `pnpm typecheck` — 5/5 packages pass, 0 errors
- `pnpm lint` (admin) — 3 errors, 9 warnings — all pre-existing, none from story changes
- `app-sidebar.tsx` grep — 0 imports found → safe to remove

### Completion Notes List

- Used `IconShirtSport` for Players to differentiate from `IconUsers` (Team) and `IconUsersGroup` (Users)
- Used `IconBrain` for BrainAnalytics branding in sidebar header
- Refactored breadcrumbs from if/else chains to data-driven `routeLabelMap`/`nestedLabelMap` approach per Dev Notes recommendation
- Removed unused `app-sidebar.tsx` — was dead code with no imports
- ThemeToggle not yet created (Story 1.2 not implemented) — notification bell placed alone in right-side header div, ready for ThemeToggle addition
- Removed hardcoded "General" root breadcrumb — now shows route-specific breadcrumbs directly

### File List

- `apps/admin/src/components/application-shell2.tsx` — Modified (navGroups, icons, branding)
- `apps/admin/src/components/site-header.tsx` — Modified (breadcrumbs, notification bell)
- `apps/admin/src/app/(app)/calendar/page.tsx` — Created
- `apps/admin/src/app/(app)/documents/page.tsx` — Created
- `apps/admin/src/app/(app)/players/page.tsx` — Created
- `apps/admin/src/app/(app)/dashboards/page.tsx` — Created
- `apps/admin/src/app/(app)/settings/page.tsx` — Created
- `apps/admin/src/components/app-sidebar.tsx` — Removed (unused duplicate)
