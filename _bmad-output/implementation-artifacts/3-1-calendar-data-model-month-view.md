# Story 3.1: Calendar Data Model & Month View

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **Testing philosophy: Write tests where they matter — critical business logic, security rules, data integrity, and complex state management. Do NOT write tests for trivial getters, simple UI rendering, or obvious CRUD. Quality over quantity.**

> **IMPORTANT: Write unit tests and backend integration tests (using @convex-dev/test) for critical logic only. Do not write tests for trivial CRUD or simple UI rendering. Focus tests on: business rules, data validation, state transitions, and edge cases.**

## Story

As a user,
I want to see all club events on a month-view calendar with color-coded event types,
so that I can quickly understand the club's schedule for any given month.

## Acceptance Criteria

1. **Convex schema for `calendarEvents` table exists** — A `calendarEvents` table is defined with fields: `teamId` (id reference to `teams`), `name` (string), `eventType` (union literal: `"match" | "training" | "meeting" | "rehab"`), `startsAt` (number, Unix timestamp ms), `endsAt` (number, Unix timestamp ms), `location` (optional string), `description` (optional string), `ownerId` (id reference to `users`), `rsvpEnabled` (boolean), `isRecurring` (boolean, default `false`), `seriesId` (optional id reference to `calendarEventSeries`), `isCancelled` (boolean, default `false`), `invitedRoles` (optional array of strings — role values that are invited), `createdAt` (number, Unix timestamp ms). The table has indexes: `by_teamId`, `by_teamId_startsAt` (for range queries), `by_seriesId`.

2. **Convex schema for `calendarEventSeries` table exists** — A `calendarEventSeries` table is defined with fields: `teamId` (id reference to `teams`), `frequency` (union literal: `"daily" | "weekly" | "biweekly" | "monthly"`), `interval` (number, default 1), `endDate` (number, Unix timestamp ms), `ownerId` (id reference to `users`), `createdAt` (number, Unix timestamp ms). The table has an index: `by_teamId`.

3. **Convex schema for `calendarEventUsers` junction table exists** — A `calendarEventUsers` table is defined with fields: `eventId` (id reference to `calendarEvents`), `userId` (id reference to `users`), `teamId` (id reference to `teams`). The table has indexes: `by_eventId`, `by_userId`, `by_userId_teamId`. This table tracks individual user invitations beyond role-based invitations.

4. **`getMonthEvents` query returns events for a given month** — A query `calendar.queries.getMonthEvents` accepts `{ year: number, month: number }` arguments, calls `requireAuth(ctx)`, computes the month's start and end timestamps, queries `calendarEvents` by `teamId` and `startsAt` range, filters out cancelled events, and returns events the user has access to (user's role is in `invitedRoles` OR user is individually invited via `calendarEventUsers` OR user is an admin). Returns array of event objects with all display fields.

5. **`getEventDetail` query returns a single event with full details** — A query `calendar.queries.getEventDetail` accepts `{ eventId }`, calls `requireAuth(ctx)`, fetches the event, validates team access, and returns the full event document including owner name. Returns `null` if not found or not authorized.

6. **Month-view calendar renders on `/calendar` page** — When the user navigates to `/calendar`, a full month-view calendar grid is displayed using Schedule-X with the shadcn theme. The grid shows all days of the current month with the correct day-of-week alignment. Events appear on their respective dates.

7. **Events display with color-coded badges** — Each event on the calendar shows its name, start time (formatted with `date-fns`), and a color-coded badge: Match = red, Training = green, Meeting = blue, Rehab = orange. The `EventTypeBadge` component from `components/shared/` is used (or created if not yet available from Story 1.4).

8. **Month navigation works** — The user can navigate to the previous and next month using navigation controls. The calendar header displays the current month and year. Navigating to a different month triggers a new `useQuery` subscription with the updated year/month arguments, loading that month's events.

9. **Event detail panel opens on click** — Clicking on an event in the calendar grid opens a side panel (Sheet) or modal (Dialog) showing the event's full details: name, event type badge, date/time range (formatted), location, description, and created-by user name. A close button returns to the calendar view.

10. **Day click shows day's events** — Clicking on a day cell (not on a specific event) opens a panel listing all events for that day with their time, name, and type badge. Each event in the list is clickable to open the full event detail.

11. **Loading and empty states** — While events are loading (`useQuery` returns `undefined`), a skeleton/loading indicator is shown in the calendar area. When no events exist for the displayed month, the calendar grid still renders with empty day cells (no error state).

12. **Real-time updates** — Because the calendar uses Convex `useQuery`, any event created, updated, or cancelled by another user appears/updates/disappears on the calendar in real time without manual refresh.

13. **Team-scoped data access enforced** — All queries filter by `teamId` from `requireAuth`. No cross-team events are ever returned. Access checks ensure users only see events they are invited to (by role or individually) or that they are admin.

## Tasks / Subtasks

- [ ] **Task 1: Install Schedule-X and framer-motion** (AC: #6)
  - [ ] 1.1: Install Schedule-X packages in the admin app: `pnpm add @schedule-x/react @schedule-x/calendar @schedule-x/theme-shadcn @schedule-x/calendar-controls @schedule-x/current-time` in `apps/admin`
  - [ ] 1.2: Install framer-motion in the admin app: `pnpm add framer-motion` in `apps/admin` (if not already installed)
  - [ ] 1.3: Verify the packages install without peer dependency conflicts. Run `pnpm typecheck` to confirm no type errors.

- [ ] **Task 2: Define calendar Convex schema tables** (AC: #1, #2, #3)
  - [ ] 2.1: Create `packages/backend/convex/table/calendarEventSeries.ts` defining the series table with fields: `teamId: v.id("teams")`, `frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"))`, `interval: v.number()`, `endDate: v.number()`, `ownerId: v.id("users")`, `createdAt: v.number()`. Add index `by_teamId` on `["teamId"]`.
  - [ ] 2.2: Create `packages/backend/convex/table/calendarEvents.ts` defining the events table with fields: `teamId: v.id("teams")`, `name: v.string()`, `eventType: v.union(v.literal("match"), v.literal("training"), v.literal("meeting"), v.literal("rehab"))`, `startsAt: v.number()`, `endsAt: v.number()`, `location: v.optional(v.string())`, `description: v.optional(v.string())`, `ownerId: v.id("users")`, `rsvpEnabled: v.boolean()`, `isRecurring: v.boolean()`, `seriesId: v.optional(v.id("calendarEventSeries"))`, `isCancelled: v.boolean()`, `invitedRoles: v.optional(v.array(v.string()))`, `createdAt: v.number()`. Add indexes: `by_teamId` on `["teamId"]`, `by_teamId_startsAt` on `["teamId", "startsAt"]`, `by_seriesId` on `["seriesId"]`.
  - [ ] 2.3: Create `packages/backend/convex/table/calendarEventUsers.ts` defining the junction table with fields: `eventId: v.id("calendarEvents")`, `userId: v.id("users")`, `teamId: v.id("teams")`. Add indexes: `by_eventId` on `["eventId"]`, `by_userId` on `["userId"]`, `by_userId_teamId` on `["userId", "teamId"]`.
  - [ ] 2.4: Import and register all three new tables in `packages/backend/convex/schema.ts`.
  - [ ] 2.5: Run `npx convex dev` to verify schema deploys without errors.

- [ ] **Task 3: Export shared calendar constants and types** (AC: #7)
  - [ ] 3.1: Add to `packages/shared/constants.ts` (or create `packages/shared/calendar.ts`): `export const EVENT_TYPES = ["match", "training", "meeting", "rehab"] as const` and `export type EventType = (typeof EVENT_TYPES)[number]`
  - [ ] 3.2: Add event type color mapping constant: `export const EVENT_TYPE_COLORS: Record<EventType, string> = { match: "red", training: "green", meeting: "blue", rehab: "orange" }` — These are semantic keys; the actual Tailwind classes are in the component.
  - [ ] 3.3: Add recurrence frequency constants: `export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "biweekly", "monthly"] as const` and `export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number]`

- [ ] **Task 4: Create calendar queries** (AC: #4, #5, #13)
  - [ ] 4.1: Create `packages/backend/convex/calendar/queries.ts`
  - [ ] 4.2: Implement `getMonthEvents` query: accepts `{ year: v.number(), month: v.number() }`, calls `requireAuth(ctx)`, computes month start/end timestamps using `new Date(year, month - 1, 1)` and `new Date(year, month, 1)` (month is 1-indexed from client), queries `calendarEvents` using `by_teamId_startsAt` index with range filter `q.gte(startsAt, monthStart) && q.lt(startsAt, monthEnd)`, filters `isCancelled !== true`, then filters for access: event `invitedRoles` includes user's role, OR user is individually invited in `calendarEventUsers`, OR user role is `"admin"`. Returns the filtered events array.
  - [ ] 4.3: Implement `getEventDetail` query: accepts `{ eventId: v.id("calendarEvents") }`, calls `requireAuth(ctx)`, fetches the event by ID, validates `event.teamId === teamId`, fetches the owner user's name, returns the event with `ownerName` field. Returns `null` if event doesn't exist or team mismatch.
  - [ ] 4.4: Implement `getDayEvents` query: accepts `{ date: v.number() }` (Unix timestamp ms for the start of the target day), calls `requireAuth(ctx)`, computes day start/end, queries events in that 24-hour range. Applies same access filtering as `getMonthEvents`. Returns events sorted by `startsAt`.

- [ ] **Task 5: Create EventTypeBadge shared component (if not already created in Story 1.4)** (AC: #7)
  - [ ] 5.1: Check if `apps/admin/src/components/shared/EventTypeBadge.tsx` exists from Story 1.4. If yes, skip this task.
  - [ ] 5.2: If not, create `apps/admin/src/components/shared/EventTypeBadge.tsx`: a component that accepts `eventType: EventType` prop and renders a shadcn `Badge` with the appropriate color variant: Match = red (`bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`), Training = green (`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`), Meeting = blue (`bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`), Rehab = orange (`bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`). Capitalize the label text.

- [ ] **Task 6: Build CalendarView component with Schedule-X** (AC: #6, #8, #12)
  - [ ] 6.1: Create `apps/admin/src/components/calendar/CalendarView.tsx`. Initialize Schedule-X calendar with the shadcn theme (`@schedule-x/theme-shadcn`), calendar-controls plugin, and current-time plugin.
  - [ ] 6.2: Configure Schedule-X for month view as the default view. Map Convex event data to Schedule-X event format: `{ id, title: event.name, start: new Date(event.startsAt).toISOString(), end: new Date(event.endsAt).toISOString(), ...metadata }`.
  - [ ] 6.3: Implement custom event rendering to display the event name, formatted start time (using `date-fns` `format()`), and the `EventTypeBadge` component within each calendar cell.
  - [ ] 6.4: Wire up month navigation: when the user navigates to a different month via Schedule-X controls, update the `year` and `month` state that feeds the `useQuery(api.calendar.queries.getMonthEvents, { year, month })` subscription.
  - [ ] 6.5: Handle the loading state: when `useQuery` returns `undefined`, show a Skeleton placeholder over the calendar grid. When events array is empty, show the normal empty calendar grid.

- [ ] **Task 7: Build EventCard component** (AC: #7, #9)
  - [ ] 7.1: Create `apps/admin/src/components/calendar/EventCard.tsx`. This component renders a single event within the calendar grid cell. Displays: event name (truncated if too long), start time (e.g. "09:00"), and `EventTypeBadge`. The entire card is clickable.
  - [ ] 7.2: Style the card with appropriate padding, hover state, and the event type color as a left border or background tint for quick visual identification.

- [ ] **Task 8: Build EventDetail panel** (AC: #9, #10)
  - [ ] 8.1: Create `apps/admin/src/components/calendar/EventDetail.tsx`. Uses a shadcn `Sheet` (side panel) component. Accepts `eventId` and `onClose` props.
  - [ ] 8.2: Inside the sheet, use `useQuery(api.calendar.queries.getEventDetail, { eventId })` to fetch full event details.
  - [ ] 8.3: Display: event name as title, `EventTypeBadge`, date range formatted with `date-fns` (e.g. "Monday, 15 April 2026 — 09:00 to 11:00"), location (with map pin icon), description (markdown or plain text), created by (owner name), RSVP status indicator (enabled/disabled label — actual RSVP functionality is Story 3.4).
  - [ ] 8.4: Show a loading skeleton while the event detail query is pending.
  - [ ] 8.5: Add a close button (X icon) in the sheet header.

- [ ] **Task 9: Build DayEventsPanel** (AC: #10)
  - [ ] 9.1: Create `apps/admin/src/components/calendar/DayEventsPanel.tsx`. Uses a shadcn `Sheet` or `Dialog`. Accepts `date: number` (timestamp) and `onClose` props.
  - [ ] 9.2: Use `useQuery(api.calendar.queries.getDayEvents, { date })` to fetch that day's events.
  - [ ] 9.3: Display the day's date as a header (formatted with `date-fns`), then a list of events with time, name, and `EventTypeBadge`. Each event item is clickable to open the full `EventDetail` panel.
  - [ ] 9.4: Show an empty state message ("No events scheduled") when the list is empty.

- [ ] **Task 10: Build the Calendar page** (AC: #6, #8, #9, #10, #11, #12)
  - [ ] 10.1: Create `apps/admin/src/app/(app)/calendar/page.tsx`.
  - [ ] 10.2: Manage state: `selectedMonth` (year, month) initialized to current month, `selectedEventId` (for detail panel), `selectedDate` (for day panel).
  - [ ] 10.3: Call `useQuery(api.calendar.queries.getMonthEvents, { year: selectedMonth.year, month: selectedMonth.month })` for the primary data subscription.
  - [ ] 10.4: Render the page layout: page header ("Calendar" title), the `CalendarView` component taking up the main content area.
  - [ ] 10.5: Wire event click to set `selectedEventId` and open `EventDetail` sheet. Wire day click to set `selectedDate` and open `DayEventsPanel` sheet.
  - [ ] 10.6: Conditionally render the `EventDetail` sheet when `selectedEventId` is set, and the `DayEventsPanel` sheet when `selectedDate` is set. Only one panel open at a time.

- [ ] **Task 11: Add Calendar to sidebar navigation** (AC: #6)
  - [ ] 11.1: Verify that the sidebar navigation already has a "Calendar" link pointing to `/calendar` (from Story 1.3). If it exists, confirm the link works. If not, add it with a `Calendar` icon from `lucide-react`.

- [ ] **Task 12: Write backend unit tests** (AC: #4, #5, #13)
  - [ ] 12.1: Create `packages/backend/convex/calendar/__tests__/queries.test.ts` using `@convex-dev/test` + `vitest`.
  - [ ] 12.2: Test `getMonthEvents`: (a) returns events within the specified month only, (b) excludes cancelled events, (c) returns events where user's role is in `invitedRoles`, (d) returns events where user is individually invited, (e) admin sees all team events regardless of invitation, (f) does not return events from a different team.
  - [ ] 12.3: Test `getEventDetail`: (a) returns full event details for authorized user, (b) returns null for event from a different team, (c) returns owner name.
  - [ ] 12.4: Test `getDayEvents`: (a) returns events for the specified day only, (b) applies same access filtering.

- [ ] **Task 13: Final validation** (AC: all)
  - [ ] 13.1: Run `pnpm typecheck` — must pass with zero errors
  - [ ] 13.2: Run `pnpm lint` — must pass with zero errors
  - [ ] 13.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass
  - [ ] 13.4: Start the dev server — navigate to `/calendar`, verify the month grid renders
  - [ ] 13.5: Verify empty state (no events) renders a clean calendar grid without errors
  - [ ] 13.6: If test events exist (from seed or manual creation), verify they display with correct color-coded badges and time formatting

## Dev Notes

### Architecture Context

This is the **foundational fullstack story for Epic 3 (Calendar & Scheduling)**. It establishes the calendar data model that all subsequent calendar stories (3.2 Event Creation, 3.3 Recurring Events, 3.4 RSVP, 3.5 .ics Sync, 3.6 TV Display) build upon, and delivers the primary calendar UI — the month view. This story directly implements:

- **FR1 (partial):** Calendar event data structure — the creation form itself is Story 3.2, but the data model must support all FR1 fields
- **FR6:** Users with access can view events on a month-view calendar with color-coded event types
- **NFR2:** Real-time updates propagate via Convex subscriptions (inherent in `useQuery`)
- **NFR5:** Data access enforced at the Convex query layer (requireAuth + access filtering)
- **NFR6:** Multi-tenant isolation via teamId scoping on all calendar tables

### Key Architectural Decisions from architecture.md

- **Data Modeling — Hybrid Normalization:** `invitedRoles: string[]` array field on events for role-based invitations (small, bounded list). `calendarEventUsers` junction table for individual user invitations (dynamic, queryable from both sides). [Source: architecture.md#Data-Architecture]

- **Recurring Events — Materialized Occurrences:** A `calendarEventSeries` table stores the rrule definition. Individual `calendarEvents` are generated as separate documents with a `seriesId` reference. This story creates the schema structure; the occurrence generation logic is Story 3.3. [Source: architecture.md#Data-Architecture]

- **Calendar UI — Schedule-X:** Selected over alternatives (shadcn-event-calendar, react-big-calendar, FullCalendar) for: built-in rrule recurrence, free drag-and-drop, dedicated shadcn theme package respecting CSS variables, npm distribution with active maintenance, and custom event rendering for color-coded event types. Free/MIT plugins only. [Source: architecture.md#Additional-Dependencies]

- **Authorization Pattern:** `requireAuth(ctx)` returns `{ user, teamId }`. Every query starts with this check. No middleware — explicit function calls. [Source: architecture.md#Authentication-&-Security]

- **State Management:** Convex `useQuery` replaces all server state. Local UI state (selected month, selected event) stays in React component state. [Source: architecture.md#Frontend-Architecture]

- **Dates:** Stored as Unix timestamp ms (`number`) in Convex. Displayed using `date-fns` formatting. Never stored as strings. [Source: architecture.md#Format-Patterns]

- **Error Handling:** `ConvexError` with standardized codes: `NOT_AUTHENTICATED`, `NOT_AUTHORIZED`, `NOT_FOUND`. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 3.1) reference:

> calendarEventRoles and calendarEventUsers junction tables exist

**This story uses `invitedRoles: string[]` on the event document** instead of a separate `calendarEventRoles` junction table. This follows the architecture decision for hybrid normalization: arrays for small, bounded, static lists (roles are 6 fixed values). The `calendarEventUsers` junction table is still used for individual user invitations since that relationship carries dynamic membership. This is consistent with Story 2.1's approach of putting roles directly on records rather than in junction tables.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export `requireAuth(ctx)` returning `{ user, teamId }` |
| `teams` table in schema | Story 2.1 | `packages/backend/convex/table/teams.ts` must exist and be registered in `schema.ts` |
| Users table with `teamId` and 6-role `role` field | Story 2.1 | `packages/backend/convex/table/users.ts` must have `teamId` and the expanded role union |
| Sidebar navigation with Calendar link | Story 1.3 | `apps/admin/src/` sidebar should include `/calendar` route |
| shadcn/ui theme configured | Story 1.2 | shadcn preset applied, CSS variables active |

### Current State (Baseline)

**`convex/schema.ts`:** Imports `authTables`, `adminInvites`, `feedback`, `users`. **No calendar tables exist.**

**`apps/admin/src/components/ui/calendar.tsx`:** A basic `react-day-picker` date picker component. **This is NOT the calendar view** — it's a form input component. The Schedule-X month view is a completely separate concern.

**`apps/admin/src/app/(app)/`:** Contains existing routes for `/team`, `/users`. **No `/calendar` route exists.**

**Schedule-X:** **Not installed.** Must be added as a dependency in Task 1.

**framer-motion:** **Not installed.** Architecture specifies it for calendar transitions. Must be added in Task 1.

**EventTypeBadge:** **Does not exist.** Story 1.4 is responsible for this component. If not yet complete when this story starts, Task 5 creates a local version.

### Schedule-X Integration Notes

Schedule-X with the shadcn theme provides a calendar component that respects the project's CSS variables. Key integration points:

```typescript
import { createCalendar, viewMonthGrid } from '@schedule-x/calendar'
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls'
import { createCurrentTimePlugin } from '@schedule-x/current-time'
import { ScheduleXCalendar } from '@schedule-x/react'
import '@schedule-x/theme-shadcn/dist/index.css'

const calendarControls = createCalendarControlsPlugin()
const calendar = createCalendar({
  views: [viewMonthGrid],
  defaultView: viewMonthGrid.name,
  events: [], // populated from useQuery
  plugins: [calendarControls, createCurrentTimePlugin()],
  callbacks: {
    onEventClick: (event) => { /* open EventDetail */ },
    onClickDate: (date) => { /* open DayEventsPanel */ },
  },
})
```

**Custom Event Rendering:** Schedule-X supports custom event components. Use this to inject the `EventTypeBadge` and custom styling into each event cell. Refer to the Schedule-X docs for `customComponents.eventModal` and `customComponents.timeGridEvent` / `customComponents.monthGridEvent`.

**Reactivity with Convex:** When `useQuery` returns new event data, update the Schedule-X calendar instance's events using `calendar.events.set(mappedEvents)`. Use a `useEffect` to sync Convex data into Schedule-X's internal state.

### Access Control Logic for Calendar Events

A user can see an event if ANY of these conditions are true:
1. User's role is `"admin"` (admins see all team events)
2. User's role is included in the event's `invitedRoles` array
3. User's `_id` exists in the `calendarEventUsers` junction table for that event

This logic must be implemented in every calendar query. Consider extracting it into a helper function `canUserAccessEvent(user, event, individualInvites)` within the calendar queries file for reuse.

### Month Boundary Query Logic

The `getMonthEvents` query computes month boundaries server-side:

```typescript
// month is 1-indexed (1 = January, 12 = December)
const monthStart = new Date(year, month - 1, 1).getTime()  // First day of month, 00:00:00
const monthEnd = new Date(year, month, 1).getTime()          // First day of next month, 00:00:00
// Query: startsAt >= monthStart AND startsAt < monthEnd
```

Events that span midnight or cross month boundaries are included if their `startsAt` falls within the range. Multi-day events with `startsAt` in a previous month and `endsAt` in the displayed month will NOT appear — this is acceptable for Sprint 1. A future enhancement could query by `endsAt >= monthStart AND startsAt < monthEnd` for full overlap detection.

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/admin/package.json` | Modified | Add Schedule-X packages and framer-motion dependencies |
| `packages/backend/convex/table/calendarEvents.ts` | Created | Calendar events table definition |
| `packages/backend/convex/table/calendarEventSeries.ts` | Created | Recurring event series table definition |
| `packages/backend/convex/table/calendarEventUsers.ts` | Created | Individual user invitations junction table |
| `packages/backend/convex/schema.ts` | Modified | Register three new calendar tables |
| `packages/shared/constants.ts` (or `calendar.ts`) | Modified/Created | EVENT_TYPES, EventType, EVENT_TYPE_COLORS, RECURRENCE_FREQUENCIES |
| `packages/backend/convex/calendar/queries.ts` | Created | getMonthEvents, getEventDetail, getDayEvents queries |
| `apps/admin/src/components/shared/EventTypeBadge.tsx` | Created (conditional) | Only if not already created by Story 1.4 |
| `apps/admin/src/components/calendar/CalendarView.tsx` | Created | Schedule-X month view wrapper component |
| `apps/admin/src/components/calendar/EventCard.tsx` | Created | Event display in calendar grid cell |
| `apps/admin/src/components/calendar/EventDetail.tsx` | Created | Event detail side panel (Sheet) |
| `apps/admin/src/components/calendar/DayEventsPanel.tsx` | Created | Day events list panel |
| `apps/admin/src/app/(app)/calendar/page.tsx` | Created | Calendar page with month view |
| `packages/backend/convex/calendar/__tests__/queries.test.ts` | Created | Unit tests for calendar queries |

### What This Story Does NOT Include

- **No event creation UI or mutation** — that's Story 3.2
- **No recurring event generation logic** — that's Story 3.3 (schema is ready, generation is separate)
- **No RSVP mutations or UI** — that's Story 3.4 (EventDetail shows RSVP enabled/disabled label only)
- **No .ics feed endpoint** — that's Story 3.5
- **No "What's on Today" TV display** — that's Story 3.6
- **No notification creation** — that's Story 3.7
- **No drag-and-drop event editing** — post-Sprint 1 enhancement
- **No week or day view** — month view only for Sprint 1
- **No event mutations at all** — this story is read-only (data model + read queries + UI)

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 2.1 (auth helpers) not complete yet | Check for `convex/lib/auth.ts` before starting. If missing, this story is blocked. |
| Schedule-X version incompatibility with React 19 | Check Schedule-X release notes and React compatibility. If issues arise, fall back to a custom CSS Grid-based calendar component (month grid is structurally simple). |
| Schedule-X shadcn theme doesn't match project's CSS variables | The `@schedule-x/theme-shadcn` package reads standard shadcn CSS variables. Verify after installation. Minor CSS overrides may be needed. |
| Large number of events in a month causes performance issues | Convex index `by_teamId_startsAt` ensures efficient range queries. Schedule-X handles rendering. For Sprint 1 with a single team, this is not a real concern. |
| Custom event rendering in Schedule-X is limited | Schedule-X supports custom components via its plugin system. If `monthGridEvent` customization is insufficient, wrap the default event with a React portal or use CSS-based approach. |
| `calendarEventUsers` junction table queries for access checking may be slow | For each event, we need to check if the user is individually invited. Batch query all user's invitations for the month once, then filter in-memory. Avoid N+1 queries. |

### Performance Considerations

For the access filtering in `getMonthEvents`, avoid N+1 queries:

```typescript
// GOOD: Batch approach
const { user, teamId } = await requireAuth(ctx)
const events = await ctx.db.query("calendarEvents")
  .withIndex("by_teamId_startsAt", q => q.eq("teamId", teamId).gte("startsAt", monthStart).lt("startsAt", monthEnd))
  .collect()

// Get all individual invitations for this user in one query
const userInvites = await ctx.db.query("calendarEventUsers")
  .withIndex("by_userId_teamId", q => q.eq("userId", user._id).eq("teamId", teamId))
  .collect()
const invitedEventIds = new Set(userInvites.map(i => i.eventId))

// Filter in-memory
return events.filter(e =>
  !e.isCancelled && (
    user.role === "admin" ||
    e.invitedRoles?.includes(user.role) ||
    invitedEventIds.has(e._id)
  )
)
```

### Alignment with Architecture Document

- **Data Model:** Matches `architecture.md § Data Architecture` — hybrid normalization (arrays for roles, junction for users), materialized occurrences for recurring events
- **Calendar UI:** Matches `architecture.md § Additional Dependencies` — Schedule-X with shadcn theme, specified free plugins
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — requireAuth in every query, teamId filtering
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — components in `components/calendar/`, page in `app/(app)/calendar/`
- **Convex Organization:** Matches `architecture.md § Convex Function Organization` — `convex/calendar/queries.ts` for read operations
- **Naming:** Matches `architecture.md § Naming Patterns` — camelCase tables (`calendarEvents`), PascalCase components (`CalendarView.tsx`), camelCase exports (`getMonthEvents`)
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/calendar/__tests__/`
- **Dates:** Matches `architecture.md § Format Patterns` — timestamps as numbers, `date-fns` for display
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Data-Architecture] — Hybrid normalization, materialized occurrences, calendarEventSeries schema
- [Source: architecture.md#Additional-Dependencies] — Schedule-X package selection, free plugins, shadcn theme
- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, teamId scoping, RBAC model
- [Source: architecture.md#Frontend-Architecture] — Page structure (`app/(app)/calendar/page.tsx`), component organization (`components/calendar/`), state management (useQuery only)
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting, ConvexError codes
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, loading state pattern, form pattern, enforcement guidelines
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries, requirements to structure mapping
- [Source: epics.md#Story-3.1] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR1 (partial), FR6 mapped to Epic 3

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
