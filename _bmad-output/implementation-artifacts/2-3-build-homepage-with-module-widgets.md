# Story 2.3: Build Homepage with Module Widgets

Status: dev-complete
Story Type: frontend

> **PROJECT SCOPE:** This story targets the admin app at `apps/admin/`. All UI components, pages, layouts, and routes for this story go in `apps/admin/`.

## Story

As a user,
I want a homepage that shows me today's events, the next upcoming match, and quick access to all modules,
so that I can see what's relevant at a glance without navigating to each module separately.

## Acceptance Criteria (BDD)

### AC-1: Homepage route exists and renders within the app shell

**Given** the user is authenticated and navigates to `/` (the root app route)
**When** the page loads
**Then** the homepage renders inside the `ApplicationShell` layout (sidebar + top bar visible)
**And** the page displays a welcome heading with the user's first name (e.g., "Welcome back, Alex")
**And** the page loads within 2 seconds (NFR1)

### AC-2: "Today's Events" widget

**Given** the user is on the homepage
**When** the page loads
**Then** a "Today's Events" card widget is displayed
**And** if no calendar data is available yet (Epic 3 not implemented), the widget displays "No events today" with an empty state illustration or icon
**And** the widget shows the current date in a human-readable format (e.g., "Wednesday, 26 March 2026") using `date-fns` `format()`
**And** the widget has a "View Calendar" link that navigates to `/calendar`
**And** when calendar data becomes available (post-Epic 3), the widget will display events for the current day with time, name, and event type badge

### AC-3: "Next Match" widget

**Given** the user is on the homepage
**When** the page loads
**Then** a "Next Match" card widget is displayed
**And** if no match data is available yet (Epic 3 not implemented), the widget displays a placeholder state: "No upcoming matches" with a subtle icon
**And** the widget has a visual treatment that makes it stand out (e.g., slightly larger card, accent border, or distinct background)
**And** when match data becomes available (post-Epic 3), the widget will display: match date/time, opponent name, and location

### AC-4: Quick access module cards

**Given** the user is on the homepage
**When** the page loads
**Then** quick access cards are displayed for: Calendar, Documents, Players
**And** each card has: an icon, a title, a brief description, and a link to the corresponding module page
**And** clicking "Calendar" navigates to `/calendar`
**And** clicking "Documents" navigates to `/documents`
**And** clicking "Players" navigates to `/players`
**And** each card has a hover state with subtle elevation or border change

### AC-5: Analytics dashboard placeholder cards

**Given** the user is on the homepage
**When** the page loads
**Then** analytics dashboard cards are displayed with placeholder content
**And** each placeholder card has a "Coming Soon" badge (using shadcn/ui Badge with "secondary" or "outline" variant)
**And** placeholder cards include at minimum: "Team Performance", "Player Analytics"
**And** placeholder cards are visually distinct from active cards (muted/desaturated treatment)
**And** placeholder cards are not clickable (no navigation, `pointer-events-none` or similar)

### AC-6: Responsive layout

**Given** the user is on the homepage
**When** the viewport is desktop width (>= 1024px)
**Then** widgets are arranged in a grid layout (e.g., 2-3 columns for the main widgets, full-width rows for sections)
**When** the viewport is tablet width (768px - 1023px)
**Then** widgets reflow into a 2-column grid
**When** the viewport is mobile width (< 768px)
**Then** widgets stack vertically in a single column
**And** no horizontal scroll appears at any viewport width

### AC-7: Design system consistency

**Given** the homepage is rendered
**When** visually inspecting the page
**Then** all cards use the shadcn/ui `Card` component (Card, CardHeader, CardTitle, CardDescription, CardContent)
**And** typography follows the project's design tokens (no custom font sizes or colors outside the system)
**And** spacing between widgets is consistent (using Tailwind gap utilities)
**And** the color palette matches the configured shadcn/ui theme
**And** icons are from the `@tabler/icons-react` library (consistent with existing sidebar navigation)

## Tasks / Subtasks

- [x] **Task 1: Create homepage route file** (AC: #1)
  - [x] 1.1: Create `apps/admin/src/app/(app)/page.tsx` as a client component (`"use client"`) — this is the root route for the app, rendered inside the existing `(app)/layout.tsx` which provides `AdminGuard` + `ApplicationShell`
  - [x] 1.2: Import `useQuery` from `convex/react` and query the current user via `api.table.admin.currentAdmin` (matching the existing pattern in `application-shell2.tsx`)
  - [x] 1.3: Extract the user's first name from the user object for the welcome heading
  - [x] 1.4: Render a loading skeleton while the user query is loading (`user === undefined`)
  - [x] 1.5: Compose the page with the widget components from Task 2-5 in a responsive grid layout

- [x] **Task 2: Create the TodayEventsWidget component** (AC: #2)
  - [x] 2.1: Create `apps/admin/src/components/homepage/TodayEventsWidget.tsx`
  - [x] 2.2: Render a shadcn `Card` with `CardHeader` showing "Today's Events" title and the current date formatted with `date-fns` `format(new Date(), "EEEE, d MMMM yyyy")`
  - [x] 2.3: In `CardContent`, render an empty state: a calendar icon (from `@tabler/icons-react`, `IconCalendarEvent`) centered with the text "No events today" in muted foreground color
  - [x] 2.4: Add a "View Calendar" link/button in the card footer that navigates to `/calendar` using Next.js `Link`
  - [x] 2.5: Export an `events` prop typed as an optional array (`CalendarEventSummary[] | undefined`) so the component can be data-driven once Epic 3 delivers calendar queries. When events are passed in, render them as a list with time + name + event type badge. For now, the parent passes nothing (empty state).
  - [x] 2.6: Define the `CalendarEventSummary` type locally as: `{ _id: string; name: string; eventType: "match" | "training" | "meeting" | "rehab"; startsAt: number; endsAt: number; location?: string }`

- [x] **Task 3: Create the NextMatchWidget component** (AC: #3)
  - [x] 3.1: Create `apps/admin/src/components/homepage/NextMatchWidget.tsx`
  - [x] 3.2: Render a shadcn `Card` with a visually prominent treatment — accent-colored left border (`border-l-4 border-l-primary`)
  - [x] 3.3: `CardHeader` shows "Next Match" title with a trophy icon (`IconTrophy`)
  - [x] 3.4: In `CardContent`, render a placeholder state: "No upcoming matches" with a muted calendar icon
  - [x] 3.5: Export a `match` prop typed as optional (`NextMatchData | undefined`). When data is provided, render: match date/time (formatted with `date-fns`), opponent/event name, location, and a countdown using `formatDistanceToNow`
  - [x] 3.6: Define the `NextMatchData` type locally: `{ _id: string; name: string; startsAt: number; location?: string }`

- [x] **Task 4: Create the QuickAccessCards component** (AC: #4)
  - [x] 4.1: Create `apps/admin/src/components/homepage/QuickAccessCards.tsx`
  - [x] 4.2: Define a static array of module entries: `{ title: string; description: string; href: string; icon: TablerIcon }`
  - [x] 4.3: Module entries:
    - Calendar: icon `IconCalendar`, description "View and manage club events", href `/calendar`
    - Documents: icon `IconFolderOpen`, description "Access club documents and files", href `/documents`
    - Players: icon `IconUsers`, description "Manage player profiles and data", href `/players`
  - [x] 4.4: Render each entry as a shadcn `Card` wrapped in a Next.js `Link`, with hover state: `hover:border-primary/50 transition-colors`
  - [x] 4.5: Each card shows the icon (sized `size-8`, muted foreground), title in `CardTitle`, and description in `CardDescription`

- [x] **Task 5: Create the DashboardPlaceholderCards component** (AC: #5)
  - [x] 5.1: Create `apps/admin/src/components/homepage/DashboardPlaceholderCards.tsx`
  - [x] 5.2: Define a static array of placeholder dashboard entries: `{ title: string; description: string; icon: TablerIcon }`
  - [x] 5.3: Placeholder entries:
    - "Team Performance": icon `IconChartBar`, description "Season statistics and trends"
    - "Player Analytics": icon `IconChartDots`, description "Individual player performance insights"
  - [x] 5.4: Render each entry as a shadcn `Card` with `opacity-60` and `pointer-events-none cursor-default`
  - [x] 5.5: Each card includes a `Badge` with variant `"secondary"` displaying "Coming Soon" in the top-right area of the card header
  - [x] 5.6: Cards have a dashed border (`border-dashed`) to indicate they're not yet active

- [x] **Task 6: Compose homepage layout** (AC: #1, #6, #7)
  - [x] 6.1: In `apps/admin/src/app/(app)/page.tsx`, arrange the widgets in a responsive grid:
    - Section 1: Welcome heading + subtitle (full width)
    - Section 2: "Today's Events" widget + "Next Match" widget (2-column on desktop, stacked on mobile). Uses `grid grid-cols-1 md:grid-cols-2 gap-4`
    - Section 3: "Quick Access" heading + module cards (3-column on desktop, 2-column on tablet, stacked on mobile). Uses `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
    - Section 4: "Dashboards" heading + placeholder cards (same grid as Section 3)
  - [x] 6.2: Add section headings using appropriate typography: `<h1>` for welcome, `<h2>` for section titles "Quick Access" and "Dashboards"
  - [x] 6.3: Wrap the entire page content in a container with consistent padding: `p-4 md:p-6`
  - [x] 6.4: Page scrolls vertically via default overflow behavior

- [x] **Task 7: Update sidebar navigation** (AC: #4)
  - [x] 7.1: Sidebar header logo/title already links to `/` (verified in existing code). No update needed.
  - [x] 7.2: Added "Home" nav item at the top of the Platform nav group, using `IconHome` icon, linking to `/`
  - [x] 7.3: Fixed `isRouteActive` to handle `href="/"` with exact match (`pathname === "/"`) to prevent all routes showing as active

- [x] **Task 8: Verify design consistency** (AC: #7)
  - [x] 8.1: Visual verification deferred to dev server (no programmatic test for visual layout)
  - [x] 8.2: All cards use shadcn/ui Card components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - [x] 8.3: All icons are from `@tabler/icons-react` (IconCalendarEvent, IconTrophy, IconCalendar, IconFolderOpen, IconUsers, IconChartBar, IconChartDots, IconMapPin, IconHome)
  - [x] 8.4: Typography uses Tailwind utility classes only (text-2xl, text-lg, text-sm, text-xs, font-semibold, font-medium, tracking-tight, text-muted-foreground)

- [x] **Task 9: Final validation** (AC: all)
  - [x] 9.1: `pnpm typecheck` — passes with zero errors (all 5 packages pass)
  - [x] 9.2: `pnpm lint` — admin app lint passes for new files (pre-existing warnings in other files unrelated to this story)
  - [x] 9.3: Dev server verification deferred (requires Convex backend running)
  - [x] 9.4: Navigation links implemented to `/calendar`, `/documents`, `/players` (all routes exist as placeholder pages)
  - [x] 9.5: Welcome message uses `user?.name?.split(" ")[0]` with fallback
  - [x] 9.6: TodayEventsWidget shows formatted date via `date-fns format()` and "No events today" empty state
  - [x] 9.7: NextMatchWidget shows "No upcoming matches" placeholder with muted icon
  - [x] 9.8: DashboardPlaceholderCards have `Badge variant="secondary"` with "Coming Soon" text, `pointer-events-none`, `opacity-60`, `border-dashed`

## Dev Notes

### Architecture Context

This story creates the platform's landing experience — the first thing users see after login. It directly implements:

- **FR38:** The homepage displays quick access to dashboards, the next upcoming match, today's events, and recent results
- **FR39:** Analytics dashboards not yet implemented display with placeholder content
- **FR37:** (Partial) Quick access cards serve as an alternative navigation path to the sidebar
- **UX-DR4:** Design and implement homepage layout with dashboard cards, upcoming match widget, today's events widget, and recent results

**Key architectural decisions from architecture.md:**

- **Page Structure:** Homepage is at `src/app/(app)/page.tsx` — the root route inside the authenticated app layout. [Source: architecture.md#Frontend-Architecture]
- **Component Location:** Homepage widgets live in `src/components/homepage/` (deviation from architecture.md which suggested `components/shared/HomepageWidgets.tsx` as a single file — splitting into individual widget components is more maintainable and follows the pattern of other module folders like `components/calendar/`, `components/documents/`). [Source: architecture.md#Component-Organization]
- **State Management:** No state management library. Convex `useQuery` for server data, React `useState` for local UI state. [Source: architecture.md#Frontend-Architecture]
- **Loading States:** `useQuery` returns `undefined` while loading — render `<Skeleton />` during this state. [Source: architecture.md#Process-Patterns]
- **Date Formatting:** Always use `date-fns` — never native `toLocaleDateString()`. [Source: architecture.md#Enforcement-Guidelines]
- **Icons:** Use `@tabler/icons-react` (existing in the project, used by the sidebar). [Source: application-shell2.tsx baseline]
- **UI Components:** Use existing shadcn/ui components: Card, Badge, Skeleton, Button. [Source: architecture.md#Enforcement-Guidelines]

### Variance from Epic AC

The original epic AC (epics.md, Story 2.3) mentions "recent results" as a homepage element. This story defers the "Recent Results" widget because:

1. Results are a subset of calendar events (past Match-type events with scores) — the calendar data model (Epic 3) doesn't exist yet
2. There is no mechanism to store match scores in the current schema — this would need a `matchResults` table or score fields on calendar events, which is out of scope for Sprint 1
3. The "Next Match" widget provides the match-related value. "Recent Results" can be added as a fast-follow once Epic 3 is complete

The story also splits `HomepageWidgets.tsx` (referenced in architecture.md as a single file) into multiple focused components in a `components/homepage/` directory. This is a structural improvement — one component per widget is easier to maintain, test, and extend.

### Current State (Baseline)

**Homepage page (`apps/admin/src/app/(app)/page.tsx`):** Does NOT exist yet. Currently, navigating to `/` after login likely renders a blank page or a 404 within the app shell. This story creates this file.

**App layout (`apps/admin/src/app/(app)/layout.tsx`):** Exists and wraps children in `AdminGuard` + `ApplicationShell`. The homepage will be rendered inside this layout automatically.

**Application Shell (`application-shell2.tsx`):** Exists with sidebar navigation containing "Users" and "Team" items. The sidebar header links to `/team` — this should be updated to link to `/` (homepage). Navigation items for Calendar, Documents, Players, Dashboards, Settings may or may not exist yet (depends on Story 1.3 completion).

**Shared components (`components/shared/`):** Directory does NOT exist yet. Story 1.4 (Build Reusable UI Components) defines `EventTypeBadge.tsx`, `StatusBadge.tsx`, etc. — if Story 1.4 is complete, `EventTypeBadge` can be used inside the TodayEventsWidget. If not yet complete, the homepage widgets should render event type as plain text and the badge can be integrated later.

**Convex calendar schema:** Does NOT exist yet. No `calendarEvents` table in the schema. This means:
- **No Convex queries for today's events or next match can be created in this story.**
- The widgets MUST render with empty/placeholder state.
- The component props are typed to accept data, but the parent page passes `undefined` for now.
- When Epic 3 (Story 3.1) creates the calendar data model, the homepage page can be updated to wire real queries to these widget components.

### Frontend Component Organization

```
apps/admin/src/
  app/(app)/
    page.tsx                         -- Homepage (NEW, this story)
  components/
    homepage/                        -- NEW directory
      TodayEventsWidget.tsx          -- Today's events card widget
      NextMatchWidget.tsx            -- Next match card widget
      QuickAccessCards.tsx           -- Module quick access cards
      DashboardPlaceholderCards.tsx  -- Analytics placeholder cards
```

### Data Flow (Current — Empty State)

```
Homepage page.tsx
  → useQuery(api.table.admin.currentAdmin)  → get user name for welcome heading
  → <TodayEventsWidget />                   → no events prop → renders empty state
  → <NextMatchWidget />                     → no match prop → renders placeholder
  → <QuickAccessCards />                    → static data → renders navigation cards
  → <DashboardPlaceholderCards />           → static data → renders placeholders
```

### Data Flow (Future — After Epic 3)

```
Homepage page.tsx
  → useQuery(api.table.admin.currentAdmin)            → user name
  → useQuery(api.calendar.queries.getTodayEvents)    → CalendarEventSummary[]
  → useQuery(api.calendar.queries.getNextMatch)      → NextMatchData | null
  → <TodayEventsWidget events={todayEvents} />       → renders event list
  → <NextMatchWidget match={nextMatch} />             → renders match details
  → <QuickAccessCards />                              → static navigation
  → <DashboardPlaceholderCards />                     → static placeholders
```

### Design Reference

**Grid Layout (Desktop):**
```
┌─────────────────────────────────────────────┐
│  Welcome back, Alex                          │
│  Wednesday, 26 March 2026                    │
├──────────────────────┬──────────────────────┤
│  Today's Events      │  Next Match           │
│  ────────────────    │  ────────────────     │
│  No events today     │  No upcoming matches  │
│  [View Calendar →]   │                       │
├──────────┬───────────┼──────────────────────┤
│ Quick Access                                 │
├──────────┬───────────┬──────────────────────┤
│ 📅       │ 📁        │ 👥                    │
│ Calendar │ Documents │ Players               │
│ View...  │ Access... │ Manage...             │
├──────────┼───────────┼──────────────────────┤
│ Dashboards                                   │
├──────────┬───────────┼──────────────────────┤
│ 📊 Soon  │ 📈 Soon  │                       │
│ Team     │ Player   │                       │
│ Perf.    │ Analytics│                       │
└──────────┴───────────┴──────────────────────┘
```

### Dependencies

- **Story 1.2** (Design System) — shadcn/ui theme must be configured. Cards, Badges, Skeleton must be available. These are pre-installed in the template.
- **Story 1.3** (Core Layout & Sidebar) — `ApplicationShell` must exist and render the sidebar. **This is complete** (the `application-shell2.tsx` file exists and is functional).
- **Story 1.4** (Reusable UI Components) — `EventTypeBadge` is a nice-to-have for the TodayEventsWidget when data exists. If Story 1.4 is not yet complete, the homepage still works — widgets show empty state. Wire in badges when available.
- **Story 2.1** (Auth & Roles) — The current user query must return the user's name. The existing `currentUser` / `currentAdmin` query handles this.

### What This Story Does NOT Include

- **No Convex queries for calendar data** — the `calendarEvents` table doesn't exist yet (Epic 3). Widget components are designed to accept data via props but render empty state when no data is passed.
- **No real-time event subscriptions** — those come with Epic 3 when `useQuery(api.calendar.queries.getTodayEvents)` is wired up.
- **No "Recent Results" widget** — deferred (see Variance from Epic AC above).
- **No notification center integration** — that's Story 3.7 (separate concern, lives in the app shell header).
- **No settings page** — that's a separate story.
- **No dark mode toggle on homepage** — dark/light mode is handled globally by `next-themes` in the root layout.
- **No E2E tests** — Playwright E2E tests for the homepage will be added in Epic 3 when real data flows through the widgets.

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/admin/src/app/(app)/page.tsx` | Created | Homepage route — composes all widget components in a grid |
| `apps/admin/src/components/homepage/TodayEventsWidget.tsx` | Created | Today's events card with empty state |
| `apps/admin/src/components/homepage/NextMatchWidget.tsx` | Created | Next match card with placeholder state |
| `apps/admin/src/components/homepage/QuickAccessCards.tsx` | Created | Module navigation cards (Calendar, Documents, Players) |
| `apps/admin/src/components/homepage/DashboardPlaceholderCards.tsx` | Created | Analytics placeholder cards with "Coming Soon" badges |
| `apps/admin/src/components/application-shell2.tsx` | Modified | Update sidebar header link from `/team` to `/`, optionally add Home nav item |

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 1.4 (Reusable Components) not yet complete — no EventTypeBadge available | Widget components render plain text event types. Badge integration is trivial to add later — the component prop already accepts the `eventType` string. |
| Calendar/Documents/Players routes don't exist yet — quick access links navigate to missing pages | Next.js will render the app shell with empty content for undefined routes (no hard crash). These routes will be created in subsequent epics. Alternatively, show a toast or "Coming Soon" page for missing routes. |
| User query returns undefined name | Fallback to "Welcome back" without a name. Use optional chaining: `user?.name?.split(" ")[0] ?? ""`. |
| Sidebar header currently links to `/team` — changing it might break existing workflows | The change from `/team` to `/` is intentional (homepage is the landing page). The `/team` page remains accessible via the sidebar nav item "Team". |
| Grid layout breaks on specific viewport widths | Use standard Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`) with `grid-cols-*`. Test at 375px, 768px, 1024px, 1440px. No custom breakpoints needed. |

### Alignment with Architecture Document

- **Page Route:** Matches `architecture.md § Frontend Architecture` — homepage at `src/app/(app)/page.tsx`
- **Component Location:** Deviates slightly — `components/homepage/` instead of `components/shared/HomepageWidgets.tsx`. This is a structural improvement (one file per widget) aligned with the pattern used by other modules (`components/calendar/`, `components/documents/`). The architecture document lists `HomepageWidgets.tsx` but the component naming pattern favors individual files.
- **UI Components:** Uses shadcn/ui Card, Badge, Skeleton, Button — all pre-installed. [architecture.md#Pre-installed-UI-Components]
- **State Management:** `useQuery` for server data (user info). No state management library. [architecture.md#Frontend-Architecture]
- **Loading Pattern:** `useQuery` returns `undefined` while loading — render Skeleton. [architecture.md#Process-Patterns]
- **Date Formatting:** `date-fns` for all date formatting. [architecture.md#Format-Patterns]
- **Naming:** PascalCase for components, kebab-case for routes. [architecture.md#Naming-Patterns]
- **Anti-patterns avoided:** No `fetch()` for backend communication, no global state for server data, no native `toLocaleDateString()`.
- **No detected conflicts** with the architecture document.

### References

- [Source: architecture.md#Frontend-Architecture] — Page structure, component organization, state management
- [Source: architecture.md#Process-Patterns] — Loading states, mutation feedback
- [Source: architecture.md#Format-Patterns] — Date formatting with date-fns
- [Source: architecture.md#Naming-Patterns] — PascalCase components, kebab-case routes
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, requirements mapping
- [Source: architecture.md#Pre-installed-UI-Components] — Card, Badge, Skeleton, Button available
- [Source: epics.md#Story-2.3] — Original story definition and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR37, FR38, FR39 mapped to Epic 2
- [Source: story-2.1] — Dependency: User query, auth helpers
- [Source: story-1.3] — Dependency: ApplicationShell, sidebar navigation
- [Source: story-1.4] — Optional dependency: EventTypeBadge, StatusBadge for widget enrichment

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `pnpm typecheck`: 5/5 packages pass, 0 errors
- `pnpm lint` (admin): 0 new errors/warnings from this story; pre-existing issues in `password-input.tsx`, `sidebar.tsx`, `StatusBadge.tsx`, `user-table.tsx` unrelated to homepage

### Completion Notes List

- Removed `apps/admin/src/app/page.tsx` (root redirect to `/team`) to avoid Next.js route conflict with the new `(app)/page.tsx`. The `/` route now renders inside the authenticated `(app)` layout with `AdminGuard` + `ApplicationShell`.
- Used `api.table.admin.currentAdmin` for user query (matching existing pattern in `application-shell2.tsx` and `admin-guard.tsx`).
- Sidebar header already linked to `/` — no change needed (story assumed it linked to `/team`).
- Added `IconHome` import and "Home" nav item to `navGroups` in `application-shell2.tsx`.
- Fixed `isRouteActive` to handle `href="/"` with exact match to prevent all nav items appearing active.
- All widget components accept optional data props for future Epic 3 integration while rendering empty/placeholder states now.
- Used `border-l-4 border-l-primary` on NextMatchWidget for visual prominence per AC-3.
- Used `border-dashed opacity-60 pointer-events-none cursor-default` on DashboardPlaceholderCards per AC-5.
- No E2E tests per story spec ("No E2E tests" in What This Story Does NOT Include section).

### File List

| File | Change Type |
|------|-------------|
| `apps/admin/src/app/(app)/page.tsx` | Created |
| `apps/admin/src/app/page.tsx` | Deleted |
| `apps/admin/src/components/homepage/TodayEventsWidget.tsx` | Created |
| `apps/admin/src/components/homepage/NextMatchWidget.tsx` | Created |
| `apps/admin/src/components/homepage/QuickAccessCards.tsx` | Created |
| `apps/admin/src/components/homepage/DashboardPlaceholderCards.tsx` | Created |
| `apps/admin/src/components/application-shell2.tsx` | Modified |
| `_bmad-output/implementation-artifacts/2-3-build-homepage-with-module-widgets.md` | Modified |
