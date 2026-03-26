# Story 3.4: RSVP Tracking

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **Testing philosophy: Write tests where they matter — critical business logic, security rules, data integrity, and complex state management. Do NOT write tests for trivial getters, simple UI rendering, or obvious CRUD. Quality over quantity.**

> **IMPORTANT: Write unit tests and backend integration tests (using @convex-dev/test) for critical logic only. Do not write tests for trivial CRUD or simple UI rendering. Focus tests on: business rules, data validation, state transitions, and edge cases.**

## Story

As a user,
I want to respond to calendar events with "Attending" or "Not Attending" and provide a reason if absent,
so that organizers know who will be present.

## Acceptance Criteria

1. **RSVP buttons visible on RSVP-enabled events** — When the user views an event detail panel (Sheet) for an event where `rsvpEnabled` is `true`, two clearly labeled buttons are displayed: "Attending" and "Not Attending". These buttons are visible to any authenticated user who is invited to the event (by role or individually). When `rsvpEnabled` is `false`, the RSVP section is entirely hidden — no buttons, no status, no prompt.

2. **User can submit "Attending" response** — When the user clicks "Attending":
   - A `submitRsvp` Convex mutation is called with `{ eventId, status: "attending" }`
   - The mutation creates or updates the user's RSVP record in the `eventRsvps` table with `status: "attending"`, `reason: undefined`, and `respondedAt: Date.now()`
   - The "Attending" button becomes visually selected (e.g., filled/primary variant) and "Not Attending" becomes unselected (outline variant)
   - A `toast.success("RSVP submitted — Attending")` is displayed
   - The response updates in real time for all connected clients via Convex subscription

3. **User can submit "Not Attending" response with optional reason** — When the user clicks "Not Attending":
   - An optional text input field appears (or expands) below the buttons with placeholder "Reason for absence (optional)"
   - The user can type a reason (max 500 characters) or leave it blank
   - A "Submit" button below the reason field finalizes the response
   - The `submitRsvp` mutation is called with `{ eventId, status: "not_attending", reason: "..." }` (reason is optional)
   - The "Not Attending" button becomes visually selected, "Attending" becomes unselected
   - A `toast.success("RSVP submitted — Not Attending")` is displayed

4. **User can change their RSVP response** — If the user has already responded, the buttons reflect their current response (selected state). Clicking the other button updates their response. Changing from "Not Attending" to "Attending" clears the reason. Changing from "Attending" to "Not Attending" prompts for the optional reason. The mutation upserts the `eventRsvps` record (updates if exists, inserts if new).

5. **Current user's RSVP status is displayed** — When the event detail panel loads, the user's current RSVP status is fetched and reflected in the button states. If the user has not yet responded, neither button is selected and a subtle label says "You haven't responded yet". If the user previously submitted "Not Attending" with a reason, the reason is displayed below the buttons.

6. **Admin can see RSVP overview for the event** — When an admin views the event detail panel for an RSVP-enabled event, an additional "RSVP Responses" section is displayed below the user's own RSVP buttons. This section shows:
   - A summary count: "X Attending, Y Not Attending, Z Pending" (where Z = total invited users who haven't responded)
   - A list of all responses grouped by status: Attending users listed first, then Not Attending (with their reason if provided), then Pending (users who haven't responded)
   - Each entry shows the user's full name and avatar
   - Non-admin users do NOT see other users' responses — they only see their own RSVP status and the summary count

7. **`submitRsvp` mutation enforces authorization and validation** — The Convex mutation:
   - Calls `requireAuth(ctx)` to get `{ user, teamId }`
   - Validates the event exists and belongs to the user's team
   - Validates `rsvpEnabled` is `true` on the event — throws `ConvexError({ code: "VALIDATION_ERROR", message: "RSVP is not enabled for this event" })` if false
   - Validates the user is invited to the event (user's role is in `invitedRoles` OR user has a `calendarEventUsers` record)
   - Validates `status` is either `"attending"` or `"not_attending"`
   - Validates `reason` is max 500 characters if provided
   - Upserts the `eventRsvps` record: if an existing record for this user+event exists, update it; otherwise, insert a new one
   - Returns the RSVP record ID

8. **`getEventRsvps` query returns all responses for an event** — A Convex query `calendar.queries.getEventRsvps` accepts `{ eventId }`, calls `requireAuth(ctx)`, validates the event's `teamId`, and returns:
   - For admin users: full list of RSVP records joined with user data (fullName, avatarUrl), plus a list of invited users who haven't responded yet (pending), plus summary counts
   - For non-admin users: only the current user's own RSVP record, plus summary counts (attending count, not_attending count, pending count — no individual names)

9. **`getUserEventRsvp` query returns the current user's RSVP for a specific event** — A Convex query `calendar.queries.getUserEventRsvp` accepts `{ eventId }`, calls `requireAuth(ctx)`, and returns the current user's RSVP record for this event (status, reason, respondedAt) or `null` if they haven't responded.

10. **`eventRsvps` table schema** — The `eventRsvps` table is created with fields: `eventId: v.id("calendarEvents")`, `userId: v.id("users")`, `teamId: v.id("teams")`, `status: v.union(v.literal("attending"), v.literal("not_attending"))`, `reason: v.optional(v.string())`, `respondedAt: v.number()`. Indexes: `by_eventId` on `["eventId"]`, `by_userId_eventId` on `["userId", "eventId"]` (unique lookup), `by_teamId` on `["teamId"]`.

11. **Real-time updates** — RSVP responses propagate in real time via Convex subscriptions. When a user submits their RSVP, the admin's RSVP overview updates immediately without manual refresh. The summary counts update for all users viewing the event.

12. **Team-scoped data access enforced** — All RSVP mutations and queries filter by `teamId` from `requireAuth`. No cross-team RSVP data is ever returned or modified.

## Tasks / Subtasks

- [ ] **Task 1: Create `eventRsvps` table definition** (AC: #10, #12)
  - [ ] 1.1: Create `packages/backend/convex/table/eventRsvps.ts` (or add to the existing schema pattern used by the project). Define the table with fields:
    - `eventId: v.id("calendarEvents")`
    - `userId: v.id("users")`
    - `teamId: v.id("teams")`
    - `status: v.union(v.literal("attending"), v.literal("not_attending"))`
    - `reason: v.optional(v.string())`
    - `respondedAt: v.number()`
  - [ ] 1.2: Add indexes: `by_eventId` on `["eventId"]`, `by_userId_eventId` on `["userId", "eventId"]`, `by_teamId` on `["teamId"]`.
  - [ ] 1.3: Register the `eventRsvps` table in `packages/backend/convex/schema.ts`.
  - [ ] 1.4: Run `npx convex dev` to verify the schema deploys without errors.

- [ ] **Task 2: Implement `submitRsvp` Convex mutation** (AC: #2, #3, #4, #7, #12)
  - [ ] 2.1: Add to `packages/backend/convex/calendar/mutations.ts` a new exported mutation `submitRsvp`.
  - [ ] 2.2: Arguments: `{ eventId: v.id("calendarEvents"), status: v.union(v.literal("attending"), v.literal("not_attending")), reason: v.optional(v.string()) }`
  - [ ] 2.3: Implementation flow:
    - Call `requireAuth(ctx)` to get `{ user, teamId }`
    - Fetch the event by `eventId` — throw `ConvexError({ code: "NOT_FOUND", message: "Event not found" })` if it doesn't exist
    - Validate `event.teamId === teamId` — throw `NOT_AUTHORIZED` if mismatch
    - Validate `event.rsvpEnabled === true` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "RSVP is not enabled for this event" })`
    - Validate `event.isCancelled !== true` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "Cannot RSVP to a cancelled event" })`
    - Validate the user is invited: check if `user.role` is in `event.invitedRoles` OR a `calendarEventUsers` record exists for this `userId`+`eventId` — throw `ConvexError({ code: "NOT_AUTHORIZED", message: "You are not invited to this event" })` if neither
    - Validate `reason` is max 500 characters if provided — throw `VALIDATION_ERROR` if exceeded
    - If `status === "attending"`, set `reason = undefined` (clear any previous reason)
    - Query `eventRsvps` by `by_userId_eventId` index to check for existing RSVP
    - If existing record found: patch it with `{ status, reason: status === "attending" ? undefined : reason, respondedAt: Date.now() }`
    - If no existing record: insert `{ eventId, userId: user._id, teamId, status, reason: status === "attending" ? undefined : reason, respondedAt: Date.now() }`
    - Return the RSVP record ID

- [ ] **Task 3: Implement `getUserEventRsvp` Convex query** (AC: #5, #9, #12)
  - [ ] 3.1: Add to `packages/backend/convex/calendar/queries.ts` a new exported query `getUserEventRsvp`.
  - [ ] 3.2: Arguments: `{ eventId: v.id("calendarEvents") }`
  - [ ] 3.3: Implementation:
    - Call `requireAuth(ctx)` to get `{ user, teamId }`
    - Fetch the event by `eventId` — return `null` if not found or `teamId` mismatch
    - Query `eventRsvps` using `by_userId_eventId` index with `userId: user._id` and `eventId`
    - Return the RSVP record `{ status, reason, respondedAt }` or `null` if no record exists

- [ ] **Task 4: Implement `getEventRsvps` Convex query** (AC: #6, #8, #11, #12)
  - [ ] 4.1: Add to `packages/backend/convex/calendar/queries.ts` a new exported query `getEventRsvps`.
  - [ ] 4.2: Arguments: `{ eventId: v.id("calendarEvents") }`
  - [ ] 4.3: Implementation:
    - Call `requireAuth(ctx)` to get `{ user, teamId }`
    - Fetch the event by `eventId` — throw `NOT_FOUND` if not found, validate `teamId`
    - Query all `eventRsvps` records for this `eventId` using the `by_eventId` index
    - Compute summary counts: `attendingCount`, `notAttendingCount`
    - Compute the total invited users:
      - Query users whose `role` is in `event.invitedRoles` and `teamId` matches
      - Query `calendarEventUsers` for individually invited users
      - Deduplicate the combined set
      - `pendingCount = totalInvited - attendingCount - notAttendingCount`
    - If user's role is `"admin"`:
      - Join each RSVP record with user data (`fullName`, `avatarUrl`) via `ctx.db.get(rsvp.userId)`
      - Build a list of pending users (invited but no RSVP record) with their `fullName` and `avatarUrl`
      - Return `{ responses: [...], pending: [...], summary: { attending: X, notAttending: Y, pending: Z, total: T } }`
    - If user's role is NOT admin:
      - Return ONLY `{ myRsvp: { status, reason, respondedAt } | null, summary: { attending: X, notAttending: Y, pending: Z, total: T } }`
      - Do NOT return individual user names or response details

- [ ] **Task 5: Build RSVPPanel component** (AC: #1, #2, #3, #4, #5, #6, #11)
  - [ ] 5.1: Create `apps/admin/src/components/calendar/RSVPPanel.tsx`. This component renders the user-facing RSVP interaction and admin overview. Props: `eventId: Id<"calendarEvents">`, `rsvpEnabled: boolean`.
  - [ ] 5.2: If `rsvpEnabled` is `false`, render nothing (return `null`).
  - [ ] 5.3: Subscribe to the current user's RSVP status: `useQuery(api.calendar.queries.getUserEventRsvp, { eventId })`. While loading (`=== undefined`), show a `Skeleton`.
  - [ ] 5.4: Render two buttons side by side:
    - "Attending" button: uses shadcn `Button`. Selected state (`variant="default"`, filled) when `myRsvp?.status === "attending"`, unselected state (`variant="outline"`) otherwise. Icon: `CheckCircle` from `lucide-react`.
    - "Not Attending" button: uses shadcn `Button`. Selected state (`variant="destructive"`) when `myRsvp?.status === "not_attending"`, unselected state (`variant="outline"`) otherwise. Icon: `XCircle` from `lucide-react`.
  - [ ] 5.5: If no RSVP response exists (`myRsvp === null`), display a subtle label: "You haven't responded yet" above or below the buttons (muted text color).
  - [ ] 5.6: "Attending" click handler:
    - Call `useMutation(api.calendar.mutations.submitRsvp)` with `{ eventId, status: "attending" }`
    - On success: `toast.success("RSVP submitted — Attending")`
    - On error: `toast.error(error.data.message)`
  - [ ] 5.7: "Not Attending" click handler:
    - Set local state `showReasonInput = true` to reveal the reason field
    - Render a `Textarea` (shadcn/ui) with placeholder "Reason for absence (optional)", max 500 characters, with a character count indicator
    - Render a "Submit" `Button` below the textarea
    - On "Submit" click: call `submitRsvp` with `{ eventId, status: "not_attending", reason: reasonValue || undefined }`
    - On success: `toast.success("RSVP submitted — Not Attending")`, hide the reason input
    - On error: `toast.error(error.data.message)`
  - [ ] 5.8: If user's current status is `"not_attending"` and they had a reason, display the reason below the buttons in a muted text block: "Reason: {reason}".
  - [ ] 5.9: When changing from "Not Attending" to "Attending": directly call `submitRsvp` with `status: "attending"` (no reason prompt needed, reason is cleared server-side).

- [ ] **Task 6: Build RSVPOverview component (admin-only)** (AC: #6, #8, #11)
  - [ ] 6.1: Create `apps/admin/src/components/calendar/RSVPOverview.tsx`. Props: `eventId: Id<"calendarEvents">`.
  - [ ] 6.2: Subscribe to `useQuery(api.calendar.queries.getEventRsvps, { eventId })`. While loading, show `Skeleton`.
  - [ ] 6.3: Render summary counts as badges or chips: "X Attending" (green badge), "Y Not Attending" (red badge), "Z Pending" (gray badge).
  - [ ] 6.4: Below the summary, render a collapsible section (shadcn `Collapsible` or `Accordion`) with three groups:
    - **Attending**: List of users with their `Avatar` and `fullName`
    - **Not Attending**: List of users with `Avatar`, `fullName`, and reason (if provided, in muted text below the name)
    - **Pending**: List of users with `Avatar` and `fullName` (no status)
  - [ ] 6.5: This component is conditionally rendered — only visible when the current user has `role === "admin"`. Use `useQuery(api.users.queries.currentUser)` or equivalent to check role.
  - [ ] 6.6: If the query returns no `responses` array (non-admin fallback), render only the summary counts without the detailed user list.

- [ ] **Task 7: Integrate RSVPPanel and RSVPOverview into EventDetail** (AC: #1, #5, #6)
  - [ ] 7.1: Modify `apps/admin/src/components/calendar/EventDetail.tsx` (created in Story 3.1, extended in Story 3.3):
    - Below the existing event information (name, type, date, location, description), add a new section:
    - If `event.rsvpEnabled === true`: render `<RSVPPanel eventId={event._id} rsvpEnabled={event.rsvpEnabled} />`
    - Below RSVPPanel (if admin): render `<RSVPOverview eventId={event._id} />`
    - If `event.rsvpEnabled === false`: render nothing in the RSVP area (or optionally a muted "RSVP is disabled for this event" label for admins)
  - [ ] 7.2: Ensure the EventDetail panel has enough vertical space for the RSVP sections. If using a Sheet, ensure `ScrollArea` wraps the content to handle overflow.

- [ ] **Task 8: Add RSVP summary indicator to EventCard (optional enhancement)** (AC: #1, #11)
  - [ ] 8.1: Modify `apps/admin/src/components/calendar/EventCard.tsx` (created in Story 3.1):
    - If the event has `rsvpEnabled: true`, display a small RSVP indicator showing the user's current status: a small check icon (green) if attending, X icon (red) if not attending, or no icon if not yet responded.
    - This requires calling `useQuery(api.calendar.queries.getUserEventRsvp, { eventId })` — however, this would be one query per event on the calendar view, which may be expensive. **Alternative approach**: Create a batch query `getUserRsvpsForMonth` that returns all of the current user's RSVPs for events in the displayed month, and pass the status down to EventCard via props.
  - [ ] 8.2: If the batch approach is used, add a query `getUserRsvpsByEventIds` to `packages/backend/convex/calendar/queries.ts`:
    - Arguments: `{ eventIds: v.array(v.id("calendarEvents")) }`
    - Returns a map of `eventId -> status` for the current user's RSVPs
    - The CalendarView component calls this once with all visible event IDs and passes statuses to EventCard components

- [ ] **Task 9: Write backend unit tests** (AC: #2, #3, #4, #7, #8, #9, #10, #12)
  - [ ] 9.1: Add tests to `packages/backend/convex/calendar/__tests__/mutations.test.ts`:
  - [ ] 9.2: Test `submitRsvp` — success case: invited user submits "attending". Verify: (a) `eventRsvps` record is created with `status: "attending"`, `reason: undefined`, correct `respondedAt`, (b) record has correct `teamId`, `userId`, `eventId`.
  - [ ] 9.3: Test `submitRsvp` — "not_attending" with reason: verify record has `status: "not_attending"` and `reason` field populated.
  - [ ] 9.4: Test `submitRsvp` — "not_attending" without reason: verify record has `status: "not_attending"` and `reason: undefined`.
  - [ ] 9.5: Test `submitRsvp` — upsert: user submits "attending", then changes to "not_attending". Verify only one `eventRsvps` record exists with the updated status and updated `respondedAt`.
  - [ ] 9.6: Test `submitRsvp` — change from "not_attending" to "attending" clears reason: verify `reason` is `undefined` after switching to "attending".
  - [ ] 9.7: Test `submitRsvp` — RSVP disabled: calling `submitRsvp` on an event with `rsvpEnabled: false` throws `VALIDATION_ERROR`.
  - [ ] 9.8: Test `submitRsvp` — cancelled event: calling `submitRsvp` on a cancelled event throws `VALIDATION_ERROR`.
  - [ ] 9.9: Test `submitRsvp` — not invited: user whose role is NOT in `invitedRoles` and has no `calendarEventUsers` record receives `NOT_AUTHORIZED`.
  - [ ] 9.10: Test `submitRsvp` — team isolation: user from team A cannot RSVP to an event in team B.
  - [ ] 9.11: Test `submitRsvp` — reason max length: reason exceeding 500 characters throws `VALIDATION_ERROR`.
  - [ ] 9.12: Add tests to `packages/backend/convex/calendar/__tests__/queries.test.ts`:
  - [ ] 9.13: Test `getUserEventRsvp` — returns the current user's RSVP record for an event.
  - [ ] 9.14: Test `getUserEventRsvp` — returns `null` when user has not responded.
  - [ ] 9.15: Test `getEventRsvps` — admin sees full response list with user details, summary counts, and pending users.
  - [ ] 9.16: Test `getEventRsvps` — non-admin sees only their own RSVP and summary counts (no individual user data in response list).
  - [ ] 9.17: Test `getEventRsvps` — summary counts are accurate: create 5 invited users, 2 respond attending, 1 not attending, verify counts (2 attending, 1 not attending, 2 pending).

- [ ] **Task 10: Final validation** (AC: all)
  - [ ] 10.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 10.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 10.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 10.4: Start the dev server — navigate to `/calendar`, verify:
    - Click on an event with RSVP enabled — EventDetail panel shows RSVP buttons
    - Click "Attending" — button becomes selected, toast confirms
    - Click "Not Attending" — reason field appears, submit with/without reason
    - Change response from "Not Attending" to "Attending" — status updates, reason cleared
    - Reload the page — RSVP status is persisted and correctly displayed
  - [ ] 10.5: Verify admin RSVP overview:
    - As admin, view an event with multiple invited users
    - Verify attending/not-attending/pending counts are correct
    - Verify individual user names and avatars are displayed
    - Verify reasons for absence are shown for "Not Attending" responses
  - [ ] 10.6: Verify non-admin cannot see other users' details:
    - As a non-admin (e.g., coach), view the same event
    - Verify RSVP buttons are visible and functional
    - Verify summary counts are visible
    - Verify individual user names/responses are NOT visible
  - [ ] 10.7: Verify RSVP-disabled events:
    - View an event with `rsvpEnabled: false`
    - Verify no RSVP buttons or section is displayed
  - [ ] 10.8: Verify real-time updates:
    - Open the same event in two browser tabs (one admin, one regular user)
    - Submit RSVP in the regular user tab
    - Verify the admin tab's RSVP overview updates without refresh

## Dev Notes

### Architecture Context

This is the **RSVP tracking story for Epic 3 (Calendar & Scheduling)**. It builds on Story 3.1's data model and event detail panel, Story 3.2's event creation (which introduced the `rsvpEnabled` toggle), and Story 3.3's recurring events (which share the same RSVP mechanism per-occurrence). This story directly implements:

- **FR7:** Users can submit RSVP responses (Attending / Not Attending) with an optional reason for absence
- **FR5 (read path):** RSVP buttons are hidden when RSVP is disabled on the event (write path was Story 3.2)

### Key Architectural Decisions

- **Junction Table for RSVPs (architecture.md § Data Architecture):** `eventRsvps` is a junction table with its own metadata (`status`, `reason`, `respondedAt`). This follows the architecture doc's hybrid normalization: "Junction tables for dynamic relations with metadata: `eventRsvps` (userId, eventId, status, reason, respondedAt)." The table is queried from both sides (by event for overview, by user for personal status).

- **Upsert Pattern for RSVP Responses:** The `submitRsvp` mutation uses a query-then-insert-or-patch pattern instead of a dedicated upsert. Query `eventRsvps` by `by_userId_eventId` index. If found, patch. If not found, insert. This is the standard Convex pattern since Convex doesn't have a native upsert operation.

- **Role-Based Response Visibility:** Admin users see the full RSVP response list with user details. Non-admin users see only their own response and aggregate counts. This follows the principle of minimal data exposure while still giving all users useful summary information.

- **Authorization:** `requireAuth(ctx)` for RSVP submission (any authenticated, invited user can respond). NOT `requireRole(ctx, ["admin"])` — RSVP is a user-facing action, not admin-only. The invitation check (role-based or individual) is the access gate.

- **Per-Occurrence RSVPs for Recurring Events:** Each recurring event occurrence is a separate `calendarEvents` document (materialized occurrences pattern from Story 3.3). RSVPs are submitted per-occurrence, not per-series. A user must respond to each occurrence individually. This is correct per the architecture — each occurrence has its own RSVP state.

- **No Notification on RSVP Submission:** The current story does NOT send notifications when a user RSVPs. Story 3.7 (In-App Notification Center) handles notification infrastructure. If the product later requires notifying the event creator when users RSVP, it can be added as an enhancement.

- **Error Handling:** `ConvexError` with `VALIDATION_ERROR`, `NOT_AUTHORIZED`, `NOT_FOUND` codes. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `calendarEvents` table with `rsvpEnabled`, `invitedRoles`, `isCancelled` fields | Story 3.1 | `packages/backend/convex/schema.ts` must define `calendarEvents` with these fields |
| `calendarEventUsers` junction table | Story 3.1 | Table must exist for individual invitation lookups |
| `EventDetail` panel component | Story 3.1 | `apps/admin/src/components/calendar/EventDetail.tsx` must exist |
| `EventCard` component | Story 3.1 | `apps/admin/src/components/calendar/EventCard.tsx` must exist |
| `createEvent` mutation with `rsvpEnabled` field | Story 3.2 | `packages/backend/convex/calendar/mutations.ts` must export `createEvent` |
| `requireAuth` helper | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export `requireAuth` |
| `requireRole` helper (for admin check in queries) | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export `requireRole` |
| Users table with `role` field | Story 2.1 | Users must have the 6-role enum field |
| Calendar page with month view | Story 3.1 | `apps/admin/src/app/(app)/calendar/page.tsx` must exist |
| shadcn/ui Button, Textarea, Skeleton, Avatar, Badge, Collapsible | Story 1.2 | Components must be installed in the admin app |

### Current State (Baseline)

**`convex/calendar/mutations.ts`:** Exists from Stories 3.2/3.3 with `createEvent`, `createRecurringEvent`, `updateEvent`, `cancelEvent`, `deleteEventSeries`. This story adds `submitRsvp`.

**`convex/calendar/queries.ts`:** Exists from Stories 3.1/3.3 with `getMonthEvents`, `getEventDetail`, `getDayEvents`, `getSeriesInfo`. This story adds `getUserEventRsvp`, `getEventRsvps`, and optionally `getUserRsvpsByEventIds`.

**`eventRsvps` table:** Does NOT exist. Must be created in this story (Task 1).

**`EventDetail.tsx`:** Exists from Stories 3.1/3.3 as a detail panel with event information, series metadata, and admin action buttons (edit, cancel, delete series). This story extends it with the RSVPPanel and RSVPOverview sections.

**`EventCard.tsx`:** Exists from Stories 3.1/3.3 with event name, time, EventTypeBadge, and recurring icon. This story optionally adds a small RSVP status indicator.

### Component Architecture

```
Calendar Page (page.tsx)
├── "Create Event" Button (admin-only, from Story 3.2)
├── CalendarView (from Story 3.1)
│   └── EventCard (modified: optional RSVP status indicator)
├── CreateEventDialog (from Story 3.2)
│   └── EventForm (from Story 3.2, extended in Story 3.3)
└── EventDetail (modified: RSVP sections added)
    ├── Event Info (name, type, date, location, description — existing)
    ├── Series Info (from Story 3.3 — existing)
    ├── Admin Action Buttons (edit, cancel, delete — from Story 3.3)
    ├── RSVPPanel (NEW)
    │   ├── "You haven't responded yet" label (conditional)
    │   ├── "Attending" Button (with CheckCircle icon)
    │   ├── "Not Attending" Button (with XCircle icon)
    │   ├── Reason Textarea (conditional, shown on "Not Attending")
    │   ├── Submit Button (for "Not Attending" with reason)
    │   └── Current Reason Display (if previously submitted)
    └── RSVPOverview (NEW, admin-only)
        ├── Summary Badges ("X Attending", "Y Not Attending", "Z Pending")
        └── Collapsible Response Groups
            ├── Attending Group (Avatar + fullName per user)
            ├── Not Attending Group (Avatar + fullName + reason per user)
            └── Pending Group (Avatar + fullName per user)
```

### Mutation Flow — Submitting RSVP

```
User views EventDetail for an RSVP-enabled event
→ RSVPPanel loads, queries getUserEventRsvp for current status
→ Buttons render: "Attending" (outline) / "Not Attending" (outline) if no prior response
→ User clicks "Attending"
→ Client: useMutation(api.calendar.mutations.submitRsvp, { eventId, status: "attending" })
→ Server: requireAuth(ctx) → { user, teamId }
→ Server: Fetch event, validate teamId, rsvpEnabled, not cancelled
→ Server: Check user is invited (role in invitedRoles OR calendarEventUsers record)
→ Server: Query eventRsvps by_userId_eventId → no existing record
→ Server: db.insert("eventRsvps", { eventId, userId, teamId, status: "attending", respondedAt })
→ Client: toast.success("RSVP submitted — Attending")
→ Convex subscription: RSVPPanel auto-updates button state
→ Convex subscription: Admin's RSVPOverview auto-updates counts + user list
```

```
User changes response to "Not Attending"
→ User clicks "Not Attending" button
→ Reason textarea appears
→ User types "Family commitment" (optional)
→ User clicks "Submit"
→ Client: useMutation(api.calendar.mutations.submitRsvp, { eventId, status: "not_attending", reason: "Family commitment" })
→ Server: Query eventRsvps by_userId_eventId → existing "attending" record found
→ Server: db.patch(existingRsvpId, { status: "not_attending", reason: "Family commitment", respondedAt })
→ Client: toast.success("RSVP submitted — Not Attending")
→ Both panels update in real time
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/table/eventRsvps.ts` (or in `schema.ts`) | Created | `eventRsvps` table definition with indexes |
| `packages/backend/convex/schema.ts` | Modified | Register `eventRsvps` table |
| `packages/backend/convex/calendar/mutations.ts` | Modified | Add `submitRsvp` mutation |
| `packages/backend/convex/calendar/queries.ts` | Modified | Add `getUserEventRsvp`, `getEventRsvps`, optionally `getUserRsvpsByEventIds` queries |
| `apps/admin/src/components/calendar/RSVPPanel.tsx` | Created | User-facing RSVP interaction component (buttons, reason field) |
| `apps/admin/src/components/calendar/RSVPOverview.tsx` | Created | Admin-only RSVP responses list with summary counts |
| `apps/admin/src/components/calendar/EventDetail.tsx` | Modified | Integrate RSVPPanel and RSVPOverview sections |
| `apps/admin/src/components/calendar/EventCard.tsx` | Modified (optional) | Small RSVP status indicator for calendar grid |
| `packages/backend/convex/calendar/__tests__/mutations.test.ts` | Modified | Add tests for `submitRsvp` mutation |
| `packages/backend/convex/calendar/__tests__/queries.test.ts` | Modified | Add tests for `getUserEventRsvp` and `getEventRsvps` queries |

### What This Story Does NOT Include

- **No RSVP-triggered notifications** — No notification is sent to the event creator when a user RSVPs. This could be added as an enhancement after Story 3.7 establishes the notification infrastructure.
- **No RSVP deadlines** — No cutoff date after which RSVPs can no longer be submitted. All RSVP-enabled events accept responses at any time.
- **No "Maybe" / "Tentative" status** — Only "Attending" and "Not Attending" per the PRD (FR7). A third status could be added later.
- **No RSVP for past events restriction** — Users can technically RSVP to past events. A future enhancement could restrict this.
- **No RSVP export/report** — No CSV or PDF export of RSVP responses. Admin can view in the UI only.
- **No batch RSVP** — Users cannot RSVP to multiple events at once (e.g., entire recurring series). Each occurrence requires individual response.
- **No RSVP reminder notifications** — No automated reminders sent to users who haven't responded.
- **No RSVP from calendar grid** — RSVPs can only be submitted from the EventDetail panel, not directly from the calendar month view.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Individual queries per EventCard for RSVP status could be expensive on the calendar grid | Task 8 proposes a batch query `getUserRsvpsByEventIds` that fetches all RSVPs for visible events in one query. EventCard receives status via props, not per-card queries. |
| Admin RSVP overview with many invited users (50+) could be slow to render | Use `Collapsible` sections that are collapsed by default. Only expand when clicked. Convex query performance for 50 users is well within limits. |
| Upsert pattern (query then insert/patch) has a theoretical race condition | For Sprint 1 scale (single user clicking a button), this is not a real concern. Convex mutations are serialized per document, and the by_userId_eventId index ensures correctness. |
| Non-invited users could attempt to RSVP via direct API call | Server-side invitation validation (role check + calendarEventUsers lookup) prevents this. UI hides RSVP for non-invited users, but enforcement is server-side. |
| Cancelled events could accumulate stale RSVP records | The `submitRsvp` mutation validates `isCancelled !== true`. Existing RSVPs on later-cancelled events remain in the database but are not displayed (EventDetail for cancelled events doesn't show RSVPPanel). |

### Alignment with Architecture Document

- **Data Architecture:** Matches `architecture.md § Data Architecture` — `eventRsvps` as a junction table with metadata (status, reason, respondedAt). Hybrid normalization with arrays for `invitedRoles` on events and junction tables for per-user RSVP state.
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireAuth(ctx)` for user-facing mutations/queries, admin role check for detailed response visibility.
- **Notification Pattern:** No notifications generated in this story. Pattern available via `createNotification()` for future enhancement.
- **Real-time:** Matches `architecture.md § API & Communication Patterns` — All RSVP data is fetched via `useQuery` (Convex subscriptions). Updates propagate to all connected clients automatically.
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with `VALIDATION_ERROR`, `NOT_AUTHORIZED`, `NOT_FOUND` codes, sonner toasts on frontend.
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — RSVPPanel and RSVPOverview in `components/calendar/`, following feature-based organization.
- **Naming:** Matches `architecture.md § Naming Patterns` — `submitRsvp` (camelCase mutation), `RSVPPanel.tsx` (PascalCase component), `getEventRsvps` (camelCase query), `eventRsvps` (camelCase table).
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/calendar/__tests__/`, vitest + @convex-dev/test.
- **No detected conflicts** with the architecture document.

### Project Structure Notes

- `RSVPPanel.tsx` and `RSVPOverview.tsx` are placed in `components/calendar/` — not in `components/shared/` — because RSVPs are specific to the calendar module. If another module needed RSVP-like functionality, the components could be generalized at that time.
- The `eventRsvps` table follows the same pattern as other junction tables (`calendarEventUsers`, `documentReads`) — entity-scoped with `teamId` for multi-tenant isolation.
- The admin-only response visibility is enforced at the query layer in Convex, not in the UI. The `getEventRsvps` query returns different data shapes based on user role.

### References

- [Source: architecture.md#Data-Architecture] — eventRsvps junction table with metadata, hybrid normalization pattern
- [Source: architecture.md#Authentication-&-Security] — requireAuth for user-facing operations, role-based data visibility
- [Source: architecture.md#API-&-Communication-Patterns] — Convex subscriptions for real-time, useQuery for all reads
- [Source: architecture.md#Frontend-Architecture] — Component organization (components/calendar/), RSVPPanel listed in component structure
- [Source: architecture.md#Format-Patterns] — ConvexError codes, sonner toasts, dates as timestamps
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Module boundaries, backend-frontend separation
- [Source: epics.md#Story-3.4] — Original story definition, user story, and BDD acceptance criteria (FR7)
- [Source: epics.md#FR-Coverage-Map] — FR7 mapped to Epic 3
- [Source: 3-1-calendar-data-model-month-view.md] — Predecessor: data model, schema, EventDetail, EventCard
- [Source: 3-2-event-creation-one-off.md] — Predecessor: createEvent mutation with rsvpEnabled toggle, InvitationSelector, notification setup
- [Source: 3-3-recurring-events.md] — Predecessor: recurring events with per-occurrence RSVP, EventDetail extensions

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
