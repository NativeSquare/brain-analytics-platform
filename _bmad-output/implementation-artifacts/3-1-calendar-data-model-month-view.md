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

- [x] **Task 1: Install Schedule-X and framer-motion** (AC: #6)
  - [x] 1.1: Install Schedule-X packages in the admin app
  - [x] 1.2: Install framer-motion in the admin app
  - [x] 1.3: Verify typecheck passes

- [x] **Task 2: Define calendar Convex schema tables** (AC: #1, #2, #3)
  - [x] 2.1: Create `packages/backend/convex/table/calendarEventSeries.ts`
  - [x] 2.2: Create `packages/backend/convex/table/calendarEvents.ts`
  - [x] 2.3: Create `packages/backend/convex/table/calendarEventUsers.ts`
  - [x] 2.4: Import and register all three new tables in `packages/backend/convex/schema.ts`
  - [x] 2.5: Backend typecheck passes

- [x] **Task 3: Export shared calendar constants and types** (AC: #7)
  - [x] 3.1: Created `packages/shared/calendar.ts` with EVENT_TYPES, EventType
  - [x] 3.2: Added EVENT_TYPE_COLORS and EVENT_TYPE_LABELS
  - [x] 3.3: Added RECURRENCE_FREQUENCIES and RecurrenceFrequency

- [x] **Task 4: Create calendar queries** (AC: #4, #5, #13)
  - [x] 4.1: Created `packages/backend/convex/calendar/queries.ts`
  - [x] 4.2: Implemented `getMonthEvents` query with access filtering
  - [x] 4.3: Implemented `getEventDetail` query with ownerName
  - [x] 4.4: Implemented `getDayEvents` query with access filtering

- [x] **Task 5: Create EventTypeBadge shared component (if not already created in Story 1.4)** (AC: #7)
  - [x] 5.1: EventTypeBadge already exists from Story 1.4 — skipped

- [x] **Task 6: Build CalendarView component with Schedule-X** (AC: #6, #8, #12)
  - [x] 6.1–6.5: Created CalendarView with Schedule-X, custom month grid event rendering, month navigation, loading skeleton

- [x] **Task 7: Build EventCard component** (AC: #7, #9)
  - [x] 7.1–7.2: Created EventCard with color-coded left border, hover state, truncation

- [x] **Task 8: Build EventDetail panel** (AC: #9, #10)
  - [x] 8.1–8.5: Created EventDetail Sheet with full details, loading skeleton, close button

- [x] **Task 9: Build DayEventsPanel** (AC: #10)
  - [x] 9.1–9.4: Created DayEventsPanel Sheet with event list, empty state

- [x] **Task 10: Build the Calendar page** (AC: #6, #8, #9, #10, #11, #12)
  - [x] 10.1–10.6: Calendar page with month state, event/day panel state, mutual exclusion

- [x] **Task 11: Add Calendar to sidebar navigation** (AC: #6)
  - [x] 11.1: Calendar link already exists in sidebar from Story 1.3

- [x] **Task 12: Write backend unit tests** (AC: #4, #5, #13)
  - [x] 12.1: Created test file with convex-test + vitest
  - [x] 12.2: 6 tests for getMonthEvents (month filter, cancelled, role access, individual invite, admin access, team isolation)
  - [x] 12.3: 3 tests for getEventDetail (full details, team mismatch, owner name)
  - [x] 12.4: 2 tests for getDayEvents (day filter, access filtering)

- [x] **Task 13: Final validation** (AC: all)
  - [x] 13.1: `pnpm typecheck` passes (both backend and admin)
  - [x] 13.2: `pnpm lint` — pre-existing errors only (password-input.tsx, sidebar.tsx), no errors in calendar files
  - [x] 13.3: All 56 backend tests pass (11 new calendar tests)
  - [x] 13.4–13.6: Cannot start dev server in CI — verified via typecheck and test suite

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

Claude Opus 4 (claude-sonnet-4-20250514)

### Debug Log References

- Schedule-X v4.3.1 uses Temporal API for date types; mapped with `"YYYY-MM-DD HH:mm"` string format
- `user.role` type is `string | undefined` in generated types — added null guard in `canUserAccessEvent`
- `_generated/api.d.ts` needed manual update to register `calendar/queries` module (no `npx convex dev` in CI)
- Initial `pnpm add` for Schedule-X hit EPERM on `apps/native` — packages were not persisted. Fixed by manually adding to package.json and running `pnpm install --filter admin`.

### Completion Notes List

- EventTypeBadge already existed from Story 1.4 — reused as-is (prop is `type` not `eventType`)
- Calendar sidebar link already existed from Story 1.3
- Schedule-X custom rendering uses `monthGridEvent` custom component with React
- Access control helper `canUserAccessEvent` extracted for reuse across getMonthEvents and getDayEvents
- Batch query pattern for `calendarEventUsers` to avoid N+1 (one query per month/day, then in-memory Set lookup)
- Pre-existing lint errors in password-input.tsx (no-empty-object-type) and sidebar.tsx (react-hooks/purity) — not introduced by this story
- Added `EVENT_TYPE_LABELS` to shared calendar constants as bonus (used in EventTypeBadge consistency)

### File List

| File | Change |
|------|--------|
| `apps/admin/package.json` | Modified — added Schedule-X (5 packages) and framer-motion |
| `packages/backend/convex/table/calendarEventSeries.ts` | Created |
| `packages/backend/convex/table/calendarEvents.ts` | Created |
| `packages/backend/convex/table/calendarEventUsers.ts` | Created |
| `packages/backend/convex/schema.ts` | Modified — registered 3 calendar tables |
| `packages/shared/calendar.ts` | Created |
| `packages/shared/package.json` | Modified — added `./calendar` export |
| `packages/backend/convex/calendar/queries.ts` | Created |
| `packages/backend/convex/_generated/api.d.ts` | Modified — added calendar/queries module |
| `apps/admin/src/components/calendar/CalendarView.tsx` | Created |
| `apps/admin/src/components/calendar/EventCard.tsx` | Created |
| `apps/admin/src/components/calendar/EventDetail.tsx` | Created |
| `apps/admin/src/components/calendar/DayEventsPanel.tsx` | Created |
| `apps/admin/src/app/(app)/calendar/page.tsx` | Modified — replaced placeholder with full calendar page |
| `packages/backend/convex/calendar/__tests__/queries.test.ts` | Created — 11 tests |
