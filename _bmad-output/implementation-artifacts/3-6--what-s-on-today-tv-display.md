# Story 3.6: "What's on Today" TV Display

Status: ready-for-dev

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

- [ ] **Task 1: Create `getTodayEvents` query** (AC: #2, #4)
  - [ ] 1.1: Add `getTodayEvents` query to `packages/backend/convex/calendar/queries.ts`
    - Calls `requireAuth(ctx)` to verify authenticated user and extract `teamId`
    - Computes today's date boundaries server-side: `dayStart = new Date().setHours(0,0,0,0)` and `dayEnd = dayStart + 86400000` (24 hours in ms)
    - Queries `calendarEvents` using `by_teamId_startsAt` index with range filter `q.gte("startsAt", dayStart).lt("startsAt", dayEnd)` scoped to `teamId`
    - Filters out events where `isCancelled === true`
    - Returns ALL team events for the day (admin sees everything; for non-admin, apply the same access logic as `getDayEvents` from Story 3.1 — role check on `invitedRoles` or individual invitation via `calendarEventUsers`)
    - Returns events sorted by `startsAt` ascending
    - **Note:** This query intentionally computes "today" server-side. The client passes no date argument — the server determines the current day. This ensures all TVs display the same day regardless of client timezone discrepancies. Alternative: accept an optional `date` parameter for testability, defaulting to `Date.now()`.
  - [ ] 1.2: Consider whether to reuse `getDayEvents` from Story 3.1 instead of creating a new query. If `getDayEvents` already exists and accepts a date parameter, the frontend can simply call it with `Date.now()`. If a dedicated `getTodayEvents` (no params) is cleaner for the TV use case, create it. The developer should evaluate based on current codebase state.

- [ ] **Task 2: Write backend tests for `getTodayEvents`** (AC: #2, #4)
  - [ ] 2.1: Add tests to `packages/backend/convex/calendar/__tests__/queries.test.ts`:
    - Returns only events for the current day (not yesterday's, not tomorrow's)
    - Excludes cancelled events (`isCancelled: true`)
    - Returns events sorted by `startsAt` ascending
    - Enforces team isolation (no events from other teams)
    - Admin user sees all team events regardless of invitation
  - [ ] 2.2: If reusing `getDayEvents`, verify existing tests cover these scenarios and add any missing cases

### Frontend Tasks

- [ ] **Task 3: Create no-sidebar layout for TV display** (AC: #1, #5)
  - [ ] 3.1: Create `apps/web/src/app/(app)/calendar/today/layout.tsx`
    - This layout must override the parent `(app)/layout.tsx` which includes the sidebar and top bar
    - The layout should render only its `children` wrapped in a minimal container (no `Sidebar`, no `TopBar`, no `NotificationCenter`)
    - Preserve the `ConvexProvider` and `ThemeProvider` from the root layout (these are at the root level and don't need re-wrapping)
    - Ensure the layout still respects the auth guard — the user must be authenticated to reach this route. If the parent `(app)/layout.tsx` handles auth protection (e.g., via `AdminGuard` or `AuthGuard`), the today layout inherits it. If not, add an auth check.
    - Apply `min-h-screen` and appropriate background to fill the TV viewport
  - [ ] 3.2: Verify the route nesting: `(app)/calendar/today/page.tsx` is nested inside `(app)/layout.tsx` by default. The `today/layout.tsx` intercepts and provides a clean full-screen wrapper while still being a child of the auth-protected `(app)` route group.

- [ ] **Task 4: Build TodayDisplay component** (AC: #2, #3, #6, #7, #8)
  - [ ] 4.1: Create `apps/web/src/components/calendar/TodayDisplay.tsx`
  - [ ] 4.2: **Date header section:**
    - Display the current date formatted with `date-fns` using `format(new Date(), "EEEE, d MMMM yyyy")` (e.g., "Thursday, 26 March 2026")
    - Display a live clock that updates every minute (or every second) using a `useEffect` + `setInterval` with `format(new Date(), "HH:mm")`
    - Display a page title: "What's on Today"
    - Use large font sizes: date in `text-3xl` or `text-4xl`, clock in `text-5xl` or `text-6xl`
  - [ ] 4.3: **Event list section:**
    - Accept an `events` array prop (from the parent page's `useQuery`)
    - Render each event as a card/row with:
      - Start time — end time (e.g., "09:00 — 11:00") in `text-2xl` or larger
      - Event name in `text-2xl` or `text-3xl`, bold
      - `EventTypeBadge` component (from `components/shared/EventTypeBadge.tsx`) — ensure the badge is scaled up for TV readability (larger padding and font size via className override)
      - Location with a map-pin icon (from `lucide-react`) if present, otherwise omitted
    - Use generous spacing between event cards (`gap-6` or `space-y-6` minimum)
    - Style event cards with a visible left border colored by event type for quick scanning
  - [ ] 4.4: **Empty state:**
    - When the events array is empty, display a centered message: "No events scheduled for today"
    - Include a calendar icon (from `lucide-react`) and keep the date/clock header visible
    - The empty state should still look intentional and polished on a TV
  - [ ] 4.5: **Midnight rollover:**
    - Implement a `useEffect` that calculates the time remaining until midnight (`new Date().setHours(24,0,0,0) - Date.now()`)
    - Set a `setTimeout` for that duration to trigger a state update (or page reload via `router.refresh()`) so the display switches to the next day's events
    - After rollover, the live clock and date header update to the new day
  - [ ] 4.6: **Loading state:**
    - When `events === undefined` (Convex `useQuery` loading), show a skeleton or spinner appropriate for the TV display
    - Use `Skeleton` components from shadcn/ui scaled to match the large TV layout
  - [ ] 4.7: **Scrolling for overflow:**
    - If the number of events exceeds the viewport height, implement auto-scrolling (marquee-style) or a scrollable container
    - Alternatively, use CSS `overflow-y: auto` with a visible scrollbar for manual scrolling on touch-screen TVs
    - For Sprint 1, `overflow-y: auto` is acceptable; auto-scrolling is a nice-to-have

- [ ] **Task 5: Build the TV Display page** (AC: #1, #2, #4, #5, #7)
  - [ ] 5.1: Create `apps/web/src/app/(app)/calendar/today/page.tsx`
  - [ ] 5.2: Subscribe to events: `const events = useQuery(api.calendar.queries.getTodayEvents)` (or `getDayEvents` with today's timestamp if reusing the existing query)
  - [ ] 5.3: Render the `TodayDisplay` component, passing the events data
  - [ ] 5.4: The page component should be minimal — just the data subscription and the `TodayDisplay` render. All presentation logic lives in the component.

- [ ] **Task 6: Add link/navigation entry point to TV display** (AC: implicit — discoverability)
  - [ ] 6.1: Add a "TV Display" or "What's on Today" button/link on the main calendar page (`apps/web/src/app/(app)/calendar/page.tsx`)
    - Use a `Monitor` or `Tv` icon from `lucide-react`
    - Link opens `/calendar/today` (ideally in a new tab via `target="_blank"` since the TV display is meant to run full-screen)
  - [ ] 6.2: Optionally add the link to the settings page for easy access

- [ ] **Task 7: Visual polish and TV optimization** (AC: #8)
  - [ ] 7.1: Test the layout at common TV resolutions (1920x1080, 3840x2160)
  - [ ] 7.2: Ensure the design respects dark mode (TV displays in dark rooms benefit from dark theme)
  - [ ] 7.3: Consider adding a subtle background gradient or the team/club name as a watermark for branding
  - [ ] 7.4: Verify text contrast ratios meet readability at distance (WCAG AA minimum, though TV viewing distance is more forgiving)
  - [ ] 7.5: Test with 0, 1, 5, 10, and 20+ events to verify layout handles all cases gracefully

- [ ] **Task 8: Final validation** (AC: all)
  - [ ] 8.1: Run `pnpm typecheck` — must pass with zero errors
  - [ ] 8.2: Run `pnpm lint` — must pass with zero errors
  - [ ] 8.3: Run backend tests (`vitest run` in packages/backend) — all existing + new tests pass
  - [ ] 8.4: Start the dev server — navigate to `/calendar/today`, verify the full-screen display renders without sidebar
  - [ ] 8.5: Verify the date header shows today's date and the clock is ticking
  - [ ] 8.6: Verify events display with correct times, names, type badges, and locations
  - [ ] 8.7: Create/modify an event from the main calendar page and verify it appears/updates on the TV display in real time
  - [ ] 8.8: Verify the empty state displays correctly when no events exist
  - [ ] 8.9: Verify unauthenticated access redirects to login

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
