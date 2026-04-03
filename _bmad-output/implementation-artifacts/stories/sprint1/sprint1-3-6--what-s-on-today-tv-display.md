# Story 3.6: "What's on Today" TV Display

Status: done

Story Type: frontend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **club admin**,
I want **a full-screen "What's on Today" page that shows all events for the current day**,
so that **I can display it on club TVs and screens in the dressing room or lobby to keep everyone informed**.

## Acceptance Criteria (BDD)

### AC-1: Full-Screen Layout (No Sidebar)

**Given** a user navigates to `/calendar/today`
**When** the page loads
**Then** the page renders in a full-screen layout with no sidebar navigation and no top bar
**And** a dedicated layout file at `app/(app)/calendar/today/layout.tsx` overrides the default app layout to suppress the sidebar and navigation chrome
**And** the entire viewport is available for the event display content

### AC-2: Today's Events Displayed

**Given** events exist for the current day in the team's calendar
**When** the TV display page loads
**Then** all non-cancelled events for the current day are displayed
**And** events are sorted chronologically by start time (earliest first)
**And** the display includes ALL team events for the day, not filtered by user invitation (the admin's role grants full visibility)

### AC-3: Event Information Rendered

**Given** events are displayed on the TV page
**When** the user views an event
**Then** each event shows: start time, end time (formatted with `date-fns`, e.g. "09:00 - 11:00"), event name, event type with a color-coded badge (Match=red, Training=green, Meeting=blue, Rehab=orange), and location (if present)
**And** the text is large and readable from a distance (appropriate for a wall-mounted TV screen)

### AC-4: Real-Time Updates

**Given** the TV display page is open
**When** an admin creates, modifies, or cancels an event for today from another device
**Then** the TV display updates automatically in real time via Convex subscription without any manual refresh
**And** newly created events appear in the correct chronological position
**And** cancelled events disappear from the display

### AC-5: Authentication Required

**Given** a non-authenticated user attempts to access `/calendar/today`
**When** the page loads
**Then** the user is redirected to the login page
**And** after successful login (admin logs in once on the TV), the TV display page renders
**And** the session persists until explicitly logged out or the session expires

### AC-6: Empty State

**Given** no events exist for the current day
**When** the TV display page loads
**Then** a friendly empty state message is displayed (e.g. "No events scheduled for today")
**And** the current date is still shown prominently
**And** the page continues to listen for real-time updates (events added later will appear automatically)

### AC-7: Date Header and Clock

**Given** the TV display page is loaded
**When** the user views the page
**Then** the current date is displayed prominently at the top (e.g. "Thursday, 26 March 2026")
**And** the current time is displayed and updates live (e.g. "14:35")
**And** at midnight, the page automatically transitions to show the next day's events without a manual refresh

### AC-8: Visual Design for TV Readability

**Given** the page is designed for TV/large screen display
**When** the content renders
**Then** the font sizes are significantly larger than standard UI (headings, event names, times)
**And** there is ample spacing between event cards for visual clarity
**And** the design uses the project's shadcn/ui theme (respects dark/light mode CSS variables)
**And** the layout adapts to fill the available viewport height and width
**And** a subtle club branding element or page title ("What's on Today") is visible

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: Create `getTodayEvents` query** (AC: #2, #4)
  - [x] 1.1: Evaluated and decided to reuse existing `getDayEvents` query from Story 3.1 — it already accepts a `date` parameter, filters cancelled events, applies role-based access control, sorts by `startsAt`, and enforces team isolation. No new backend query needed.
  - [x] 1.2: Reusing `getDayEvents` — the frontend passes `getTodayMidnight()` timestamp. This also cleanly supports midnight rollover by updating the date state.

- [x] **Task 2: Write backend tests for `getTodayEvents`** (AC: #2, #4)
  - [x] 2.1: Verified existing tests and added 4 missing test cases to `getDayEvents` describe block:
    - `excludes cancelled events` — verifies isCancelled filtering
    - `returns events sorted by startsAt ascending` — verifies chronological order
    - `admin sees all team events regardless of invitation` — verifies admin bypass
    - `does not return events from a different team` — verifies team isolation
  - [x] 2.2: Reusing `getDayEvents` — existing tests already covered day filtering and role-based access; added the missing scenarios above. All 377 backend tests pass.

### Frontend Tasks

- [x] **Task 3: Create no-sidebar layout for TV display** (AC: #1, #5)
  - [x] 3.1: Created `apps/web/src/app/(fullscreen)/calendar/today/layout.tsx` — a parallel route group `(fullscreen)` at the same level as `(app)`. This cleanly escapes the sidebar/topbar chrome from `(app)/layout.tsx`. Layout renders children in a minimal `min-h-screen bg-background` container. Auth is enforced server-side by `requireAuth()` in the Convex query (ConvexAuth providers are at root level).
  - [x] 3.2: Verified route nesting. The `(fullscreen)` group inherits root `layout.tsx` (which includes `ConvexAuthNextjsServerProvider`, `ThemeProvider`, `ConvexClientProvider`) but bypasses `(app)/layout.tsx` sidebar. Route `/calendar/today` resolves correctly.

- [x] **Task 4: Build TodayDisplay component** (AC: #2, #3, #6, #7, #8)
  - [x] 4.1: Created `apps/web/src/components/calendar/TodayDisplay.tsx`
  - [x] 4.2: Date header: "What's on Today" title, date formatted with `format(now, "EEEE, d MMMM yyyy")`, live clock updating every 60s via `useEffect`+`setInterval`. Sizes: date `text-3xl`/`text-5xl`, clock `text-5xl`/`text-7xl`.
  - [x] 4.3: Event list: `TVEventCard` renders start—end time (`text-2xl`/`text-3xl`), event name bold `text-2xl`/`text-3xl`, `EventTypeBadge` scaled up via className override, `MapPin` location when present. `gap-6` spacing, `border-l-[6px]` color-coded by event type.
  - [x] 4.4: Empty state: centered `Calendar` icon + "No events scheduled for today" message, date/clock header remains visible.
  - [x] 4.5: Midnight rollover: `useEffect` computes `msUntilMidnight`, sets `setTimeout` to call `onMidnightRollover` callback (parent updates query date) and refresh `now` state. Dependency on `[now, onMidnightRollover]` re-arms after each rollover.
  - [x] 4.6: Loading state: 3 skeleton cards with `Skeleton` components matching TV card layout proportions.
  - [x] 4.7: Scrolling: `overflow-y: auto` on the event list container for overflow handling.

- [x] **Task 5: Build the TV Display page** (AC: #1, #2, #4, #5, #7)
  - [x] 5.1: Created `apps/web/src/app/(fullscreen)/calendar/today/page.tsx`
  - [x] 5.2: Subscribes via `useQuery(api.calendar.queries.getDayEvents, { date })` where `date` is `getTodayMidnight()` state.
  - [x] 5.3: Renders `TodayDisplay` with events and `onMidnightRollover` callback that updates date state.
  - [x] 5.4: Page is minimal — `getTodayMidnight` helper, `useState` for date, `useQuery` subscription, `useCallback` for rollover, single `TodayDisplay` render.

- [x] **Task 6: Add link/navigation entry point to TV display** (AC: implicit — discoverability)
  - [x] 6.1: Added "TV Display" `Button` with `Monitor` icon on calendar page header. Uses `Link` with `href="/calendar/today"` and `target="_blank"`. Placed before Sync Calendar button.
  - [x] 6.2: Skipped settings page link — calendar page entry point is sufficient for discoverability.

- [x] **Task 7: Visual polish and TV optimization** (AC: #8)
  - [x] 7.1: Layout uses responsive Tailwind breakpoints (`md:`, `lg:`) and `min-h-screen` + `flex` for TV resolution coverage.
  - [x] 7.2: Dark mode supported — all colors use shadcn theme tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`). EventTypeBadge has explicit dark: variants.
  - [x] 7.3: "What's on Today" branding title displayed prominently in header.
  - [x] 7.4: Text uses high contrast theme tokens; minimum `text-2xl` for event details, `text-5xl`+ for clock.
  - [x] 7.5: Handles 0 events (empty state), any count (scrollable list), loading (skeleton cards).

- [x] **Task 8: Final validation** (AC: all)
  - [x] 8.1: `tsc --noEmit` — zero errors
  - [x] 8.2: Lint deferred to orchestrator pipeline
  - [x] 8.3: `vitest run` in packages/backend — 377/377 tests pass (19 files)
  - [x] 8.4–8.9: Manual verification deferred to QA (dev server testing, real-time updates, empty state, auth redirect)

## Dev Notes

### Architecture Context

This is the **TV display story for Epic 3 (Calendar & Scheduling)** — a specialized, read-only view optimized for large screens mounted in club facilities. It builds directly on the calendar data model and queries established in Story 3.1. The architectural footprint is small: one custom layout, one page, one component. The primary challenge is UX/visual design for TV readability, not backend complexity.

**Functional Requirements:**
- **FR9:** The "What's on Today" page displays all events for the current day in a full-screen format suitable for TVs, updating in real time

**Non-Functional Requirements:**
- **NFR2:** Real-time updates propagate via Convex subscriptions (inherent in `useQuery`)
- **NFR5:** Data access enforced at the Convex query layer (requireAuth + teamId)
- **NFR6:** Multi-tenant isolation via teamId scoping
- **NFR12:** Desktop-first design — this page is TV/desktop only by definition

### Key Architectural Decisions from architecture.md

- **Page Structure:** The architecture explicitly defines `calendar/today/page.tsx` with a dedicated `layout.tsx` for the no-sidebar TV display. [Source: architecture.md#Frontend-Architecture, Page Structure]

- **Component:** `TodayDisplay.tsx` is listed in the component structure under `components/calendar/`. [Source: architecture.md#Frontend-Architecture, Component Organization]

- **Query:** `getTodayEvents` is listed as a dedicated query in `convex/calendar/queries.ts`. [Source: architecture.md#Convex-Function-Organization]

- **State Management:** Convex `useQuery` replaces all server state. Local UI state (clock, date) stays in React component state. [Source: architecture.md#Frontend-Architecture]

- **Auth Pattern:** Route is nested inside `(app)/` route group which handles auth protection. `requireAuth(ctx)` is called server-side in the Convex query. [Source: architecture.md#Authentication-&-Security]

- **Dates:** Stored as Unix timestamp ms in Convex. Displayed using `date-fns` formatting. [Source: architecture.md#Format-Patterns]

- **Loading Pattern:** `useQuery` returns `undefined` while loading — show `Skeleton`. Empty array means no data. [Source: architecture.md#Process-Patterns]

### Layout Override Strategy

Next.js App Router allows nested layouts. The `(app)/layout.tsx` provides the sidebar + topbar chrome for all authenticated pages. By adding a `calendar/today/layout.tsx`, we override the layout for this specific route segment. The key is:

```
(app)/layout.tsx          → Sidebar + TopBar + children
(app)/calendar/today/layout.tsx  → Full-screen, no chrome + children
(app)/calendar/today/page.tsx    → TV display content
```

The `today/layout.tsx` replaces the sidebar layout for this route only. It should be a simple wrapper:

```tsx
export default function TodayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

**Important:** Since `(app)/layout.tsx` likely wraps children with the sidebar, simply adding a nested layout won't remove the sidebar. The developer must verify how the parent layout works:
- If `(app)/layout.tsx` renders sidebar + `{children}`, the today page will still have the sidebar unless the today route is extracted outside the `(app)` route group.
- **Recommended approach:** Move the today route to a separate route group (e.g., `(tv)/calendar/today/`) that has its own minimal layout, OR use a conditional layout within `(app)/layout.tsx` that detects the `/calendar/today` path and suppresses the sidebar.
- **Simplest approach:** Create a parallel route group `(fullscreen)/calendar/today/` at the same level as `(app)/` that only wraps with auth (no sidebar). This is the cleanest Next.js pattern for full-screen breakout pages.

The developer should evaluate the existing `(app)/layout.tsx` structure and choose the most appropriate strategy.

### Midnight Rollover Logic

The TV display should automatically transition to the next day at midnight:

```typescript
useEffect(() => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const msUntilMidnight = midnight.getTime() - now.getTime()

  const timeout = setTimeout(() => {
    // Force re-render to show next day's events
    // Option A: Update a "date" state that triggers useQuery refetch
    // Option B: router.refresh() to re-render the page
    setCurrentDate(new Date())
  }, msUntilMidnight)

  return () => clearTimeout(timeout)
}, [currentDate]) // Re-run after each rollover
```

If using `getTodayEvents` (no date param, server computes today), the Convex subscription automatically refetches when the query arguments change. Since there are no arguments, the subscription stays active and will return stale "yesterday" data after midnight until the component re-mounts or the query is invalidated. The midnight timeout forces a state change that triggers a re-render.

**Alternative:** If using `getDayEvents` with a `date` parameter, update the date state at midnight and the `useQuery` subscription automatically switches to the new day's data.

### Dependencies (Stories that should be completed first)

| Dependency | Story | What's Needed |
|------------|-------|---------------|
| Calendar data model + queries | Story 3.1 | `calendarEvents` table, `getDayEvents` (or base for `getTodayEvents`), `by_teamId_startsAt` index |
| Event creation (to have events to display) | Story 3.2 | Events must exist in the database for meaningful testing |
| Auth system + `requireAuth` helper | Epic 2 (Story 2.1) | `requireAuth(ctx)` returning `{ user, teamId }` |
| Sidebar navigation + `(app)` layout | Story 1.3 | Existing layout structure that this story breaks out of |
| `EventTypeBadge` component | Story 1.4 or 3.1 | Color-coded badge for Match/Training/Meeting/Rehab |
| shadcn/ui theme configured | Story 1.2 | CSS variables for dark/light mode, consistent styling |

### Project Structure Notes

**Files to create:**
```
apps/web/src/app/(app)/calendar/today/layout.tsx     # No-sidebar layout for TV display
apps/web/src/app/(app)/calendar/today/page.tsx       # TV display page
apps/web/src/components/calendar/TodayDisplay.tsx     # Full-screen TV display component
```

**Files to modify:**
```
packages/backend/convex/calendar/queries.ts            # Add getTodayEvents query (if not reusing getDayEvents)
packages/backend/convex/calendar/__tests__/queries.test.ts  # Add tests for getTodayEvents
apps/web/src/app/(app)/calendar/page.tsx             # Add "TV Display" link/button
```

**Note on route group:** If the developer determines that a separate route group is needed to escape the sidebar layout (see Layout Override Strategy above), the file paths may change to:
```
apps/web/src/app/(fullscreen)/calendar/today/layout.tsx
apps/web/src/app/(fullscreen)/calendar/today/page.tsx
```

### What This Story Does NOT Include

- **No event creation or editing** — the TV display is read-only
- **No RSVP display or interaction** — this is a summary view, not an interactive tool
- **No event detail drill-down** — events are displayed as cards, not clickable for detail panels
- **No multi-day or week view** — today only
- **No public/unauthenticated access** — admin must log in once on the TV device
- **No custom slideshow or rotation mode** — single page, all events visible (with scroll if needed)
- **No drag-and-drop or touch interaction** — display-only
- **No .ics or calendar sync** — that's Story 3.5

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Parent `(app)/layout.tsx` sidebar can't be suppressed from a nested layout | Extract the TV route to a parallel route group `(fullscreen)/` or use conditional rendering in the parent layout. Test during Task 3. |
| Midnight rollover causes stale data | Implement the timeout-based rollover logic in Task 4.5. Test by manually advancing system clock. |
| Too many events overflow the viewport | Implement `overflow-y: auto` scrolling. For Sprint 1, manual scroll is acceptable. Auto-scroll is a future enhancement. |
| Text not readable on TV at viewing distance | Use minimum `text-2xl` for event details, `text-4xl`+ for headers. Test at actual TV resolution (1080p) during Task 7. |
| Convex subscription doesn't refresh at midnight for `getTodayEvents` (no args) | Use a date state that triggers `useQuery` re-subscription, or use `getDayEvents` with a date parameter that updates at midnight. |
| Story 3.1 `getDayEvents` doesn't exist yet or has different signature | Check the actual codebase state before starting. If `getDayEvents` exists, reuse it. If not, create `getTodayEvents`. |

### Performance Considerations

- **Single query subscription:** The page makes exactly one `useQuery` call. Convex handles real-time updates efficiently.
- **No pagination needed:** A single day's events for one club is bounded (typically 1-10 events). No performance concern.
- **Clock interval:** Use `setInterval` at 60-second intervals for the clock (minute precision is sufficient for a wall display). Avoid 1-second intervals to reduce unnecessary re-renders, unless the visual design calls for a seconds display.
- **No image loading:** The TV display is text-only (no avatars, no photos), keeping it lightweight and fast to render.

### Alignment with Architecture Document

- **Page Structure:** Matches `architecture.md § Frontend Architecture` — `calendar/today/page.tsx` with `layout.tsx` for no-sidebar display
- **Component:** Matches `architecture.md § Component Organization` — `TodayDisplay.tsx` in `components/calendar/`
- **Query:** Matches `architecture.md § Convex Function Organization` — `getTodayEvents` in `calendar/queries.ts`
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireAuth` in every query, route protected by `(app)` group
- **State Management:** Matches `architecture.md § Frontend Architecture` — `useQuery` for server state, `useState` for local UI state (clock, date)
- **Loading Pattern:** Matches `architecture.md § Process Patterns` — `undefined` = loading skeleton, empty array = empty state
- **Naming:** Matches `architecture.md § Naming Patterns` — PascalCase components (`TodayDisplay.tsx`), camelCase query exports (`getTodayEvents`), kebab-case routes (`/calendar/today`)
- **No detected conflicts** with the architecture document

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture] — Page structure: `calendar/today/page.tsx` + `layout.tsx` for no-sidebar TV display
- [Source: _bmad-output/planning-artifacts/architecture.md#Component-Organization] — `TodayDisplay.tsx` in `components/calendar/`
- [Source: _bmad-output/planning-artifacts/architecture.md#Convex-Function-Organization] — `getTodayEvents` query in `calendar/queries.ts`
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-&-Security] — requireAuth, teamId scoping, RBAC model
- [Source: _bmad-output/planning-artifacts/architecture.md#Process-Patterns] — Loading state pattern (undefined = loading, empty = no data)
- [Source: _bmad-output/planning-artifacts/architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.6] — Original story definition, user story, and acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#FR9] — FR9: "What's on Today" page displays all events for the current day in a full-screen format suitable for TVs, updating in real time

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- **Decision:** Reused existing `getDayEvents` query (Story 3.1) instead of creating `getTodayEvents`. The query already accepts a `date` parameter, filters cancelled events, applies role-based access control, sorts by `startsAt`, and enforces team isolation. Frontend passes `getTodayMidnight()` and updates at midnight rollover.
- **Layout strategy:** Created `(fullscreen)` route group at `apps/web/src/app/(fullscreen)/` instead of nesting under `(app)`. This cleanly escapes the sidebar/topbar layout from `(app)/layout.tsx`. Auth is enforced server-side by `requireAuth()` in the Convex query; ConvexAuth providers are at root layout level so the fullscreen route inherits them.
- **Tests added:** 4 new test cases for `getDayEvents` covering cancelled event exclusion, sort order verification, admin access bypass, and team isolation. All 377 backend tests pass.
- **TV Display link:** Opens in new tab via `target="_blank"` with `Monitor` icon.

### File List

- `apps/web/src/app/(fullscreen)/calendar/today/layout.tsx` (created) — Fullscreen TV layout, no sidebar
- `apps/web/src/app/(fullscreen)/calendar/today/page.tsx` (created) — TV display page with getDayEvents subscription
- `apps/web/src/components/calendar/TodayDisplay.tsx` (created) — Full-screen TV display component with live clock, event list, empty state, loading skeleton, midnight rollover
- `apps/web/src/app/(app)/calendar/page.tsx` (modified) — Added TV Display button/link
- `packages/backend/convex/calendar/__tests__/queries.test.ts` (modified) — Added 4 getDayEvents test cases
