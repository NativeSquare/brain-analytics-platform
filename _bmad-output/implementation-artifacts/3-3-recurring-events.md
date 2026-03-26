# Story 3.3: Recurring Events

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **Testing philosophy: Write tests where they matter — critical business logic, security rules, data integrity, and complex state management. Do NOT write tests for trivial getters, simple UI rendering, or obvious CRUD. Quality over quantity.**

> **IMPORTANT: Write unit tests and backend integration tests (using @convex-dev/test) for critical logic only. Do not write tests for trivial CRUD or simple UI rendering. Focus tests on: business rules, data validation, state transitions, and edge cases.**

## Story

As an admin,
I want to create recurring events (daily, weekly, bi-weekly, monthly) with an end date,
so that I can set up the regular training and meeting schedule once.

## Acceptance Criteria

1. **"Recurring" toggle appears on the event creation form** — When the admin opens the Create Event dialog (from Story 3.2), a "Recurring" toggle/switch is visible below the standard event fields. It defaults to OFF. Toggling it ON reveals the recurrence configuration options. Toggling it OFF hides them and clears any recurrence values.

2. **Recurrence options include frequency and end date** — When the Recurring toggle is ON, the form displays:
   - A `frequency` select dropdown with options: Daily, Weekly, Bi-Weekly, Monthly (values: `"daily"`, `"weekly"`, `"biweekly"`, `"monthly"`) — required when recurrence is enabled
   - An `endDate` date picker — required when recurrence is enabled, must be after the event's `startsAt` date
   - A preview label showing the number of occurrences that will be generated (e.g., "This will create 12 events")

3. **`createRecurringEvent` mutation generates a series and all occurrences** — A Convex mutation `calendar.mutations.createRecurringEvent` accepts the event form data plus recurrence fields (`frequency`, `endDate`). It:
   - Calls `requireRole(ctx, ["admin"])`
   - Validates all inputs (same as `createEvent` + recurrence-specific validation)
   - Inserts a `calendarEventSeries` record with `teamId`, `frequency`, `interval: 1`, `endDate`, `ownerId`, `createdAt`
   - Computes all occurrence dates from `startsAt` up to and including `endDate` based on the frequency
   - Inserts one `calendarEvents` document per occurrence, each with `isRecurring: true`, `seriesId` referencing the series, and `startsAt`/`endsAt` adjusted to the occurrence date while preserving the original time-of-day
   - Inserts `calendarEventUsers` records for individually invited users — one per occurrence per user
   - Sends notifications to all invited users (same deduplication logic as `createEvent`)
   - Returns `{ seriesId, eventCount }` — the series ID and number of occurrences created

4. **Occurrences appear on the calendar on their respective dates** — After creation, each individual occurrence appears on the month-view calendar via the existing Convex subscription. Navigating between months shows the correct occurrences for each month. Each occurrence displays identically to a one-off event (name, time, EventTypeBadge) with a small recurring icon indicator.

5. **Admin can edit a single occurrence without affecting others** — When the admin clicks on a recurring event occurrence and opens its detail panel:
   - An "Edit" button is visible (admin-only)
   - Editing and saving changes to name, eventType, startsAt, endsAt, location, description, rsvpEnabled, invitedRoles, or invitedUserIds modifies ONLY that specific occurrence document in `calendarEvents`
   - Other occurrences in the same series remain unchanged
   - The edited occurrence retains its `seriesId` reference but is now independently modified
   - An `isModified: true` flag is set on the edited occurrence (informational, no functional impact for Sprint 1)
   - Notifications are sent to invited users for the update (`type: "event_updated"`)

6. **Admin can cancel a single occurrence without deleting the series** — The event detail panel for a recurring occurrence shows a "Cancel This Occurrence" option (admin-only). When clicked:
   - A confirmation dialog appears: "Cancel this occurrence of {eventName} on {date}? Other occurrences will not be affected."
   - On confirm: the specific `calendarEvents` document has `isCancelled` set to `true`
   - The cancelled occurrence disappears from the calendar view (filtered out by existing `getMonthEvents` logic)
   - Other occurrences in the series are unaffected
   - Notifications are sent to invited users (`type: "event_cancelled"`)
   - The admin can still see cancelled occurrences via a "Show Cancelled" filter (nice-to-have, not required for this story)

7. **Admin can delete the entire series** — The event detail panel for any recurring occurrence shows a "Delete Entire Series" option (admin-only). When clicked:
   - A confirmation dialog appears: "Delete all {count} occurrences of {eventName}? This cannot be undone."
   - On confirm: the `calendarEventSeries` record is deleted, all `calendarEvents` with matching `seriesId` are deleted, and all `calendarEventUsers` records for those events are deleted
   - All occurrences disappear from the calendar in real time
   - Notifications are sent to all invited users for the cancellation (`type: "event_series_deleted"`)

8. **Client-side validation for recurrence fields** — When recurrence is enabled, the Zod schema validates:
   - `frequency` is one of the four valid values (required when `isRecurring` is true)
   - `endDate` is a valid timestamp (required when `isRecurring` is true)
   - `endDate` is after `startsAt` with message "Series end date must be after the event start date"
   - Maximum series length: endDate cannot be more than 365 days from startsAt (safety limit to prevent accidentally generating thousands of events) with message "Series cannot span more than 1 year"

9. **Server-side validation and authorization** — The `createRecurringEvent` mutation enforces:
   - Only users with `role === "admin"` can create recurring events (via `requireRole`)
   - All standard event validations apply (endsAt > startsAt, valid eventType, etc.)
   - `endDate > startsAt` (series must have at least one occurrence)
   - `endDate` is within 365 days of `startsAt`
   - Maximum 365 occurrences per series (safety cap)
   - `teamId` is set from the authenticated context
   - Non-admin users receive a `NOT_AUTHORIZED` error

10. **Recurring events display a series indicator** — Recurring event occurrences on the calendar and in the event detail panel display a small repeat/recurring icon (e.g., `Repeat` from `lucide-react`) next to the event name to visually distinguish them from one-off events.

11. **Series metadata visible in event detail** — When viewing a recurring event occurrence in the detail panel, additional metadata is displayed: "Part of a {frequency} series" (e.g., "Part of a weekly series"), the series end date, and a link/reference to view other occurrences in the series (display "X occurrences total").

12. **Team-scoped data access enforced** — All mutations and queries filter by `teamId` from `requireAuth`. The `calendarEventSeries` table includes `teamId`. No cross-team series or occurrences are ever returned or modified.

## Tasks / Subtasks

- [ ] **Task 1: Extend Zod validation schema for recurring events** (AC: #8)
  - [ ] 1.1: Open the shared calendar validation file (created in Story 3.2, e.g., `packages/shared/calendar.ts`). Add a new schema `createRecurringEventSchema` that extends `createEventSchema` with additional fields: `isRecurring: z.literal(true)`, `frequency: z.enum(["daily", "weekly", "biweekly", "monthly"])`, `endDate: z.number()` (Unix timestamp ms). Add `.refine()` to validate `endDate > startsAt` with message "Series end date must be after the event start date". Add `.refine()` to validate `endDate - startsAt <= 365 * 24 * 60 * 60 * 1000` with message "Series cannot span more than 1 year".
  - [ ] 1.2: Alternatively, extend the existing `createEventSchema` to support both one-off and recurring via a discriminated union: when `isRecurring` is `false`, frequency/endDate are absent; when `isRecurring` is `true`, they are required. Export the combined schema and inferred type `CreateEventFormData`.
  - [ ] 1.3: Export a helper function `computeOccurrenceDates(startsAt: number, endsAt: number, frequency: RecurrenceFrequency, seriesEndDate: number): Array<{ startsAt: number, endsAt: number }>` from the shared package or from a `convex/calendar/utils.ts` file. This function calculates all occurrence start/end timestamps. Logic:
    - Compute the event duration: `duration = endsAt - startsAt`
    - Starting from the original `startsAt`, increment by the frequency interval (1 day for daily, 7 days for weekly, 14 for bi-weekly, 1 month for monthly using `date-fns` `addDays`/`addWeeks`/`addMonths`)
    - For each increment, generate `{ startsAt: incrementedStart, endsAt: incrementedStart + duration }`
    - Stop when the generated `startsAt` exceeds `seriesEndDate`
    - Include the original date as the first occurrence
    - Cap at 365 occurrences maximum
  - [ ] 1.4: Write unit tests for `computeOccurrenceDates`: (a) daily frequency generates correct count, (b) weekly generates every 7 days, (c) bi-weekly generates every 14 days, (d) monthly handles month-end edge cases (e.g., Jan 31 -> Feb 28), (e) stops at endDate, (f) preserves event duration, (g) caps at 365 occurrences.

- [ ] **Task 2: Implement `createRecurringEvent` Convex mutation** (AC: #3, #9, #12)
  - [ ] 2.1: Add to `packages/backend/convex/calendar/mutations.ts` (created in Story 3.2) a new exported mutation `createRecurringEvent`.
  - [ ] 2.2: Arguments: same as `createEvent` PLUS `frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"))`, `endDate: v.number()`.
  - [ ] 2.3: Implementation flow:
    - Call `requireRole(ctx, ["admin"])` to get `{ user, teamId }`
    - Validate `endsAt > startsAt` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "End time must be after start time" })`
    - Validate `endDate > startsAt` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "Series end date must be after event start date" })`
    - Validate `endDate - startsAt <= 365 * 24 * 60 * 60 * 1000` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "Series cannot span more than 1 year" })`
    - Insert into `calendarEventSeries`: `{ teamId, frequency, interval: 1, endDate, ownerId: user._id, createdAt: Date.now() }`
    - Compute occurrence dates using `computeOccurrenceDates(startsAt, endsAt, frequency, endDate)`
    - Validate `occurrences.length <= 365` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "Too many occurrences" })` if exceeded
    - For each occurrence: insert into `calendarEvents` with `{ teamId, name, eventType, startsAt: occ.startsAt, endsAt: occ.endsAt, location, description, ownerId: user._id, rsvpEnabled, isRecurring: true, seriesId, isCancelled: false, invitedRoles, createdAt: Date.now() }`
    - For each occurrence and each `invitedUserId`: insert into `calendarEventUsers` `{ eventId, userId, teamId }`
    - Collect all invited user IDs (by role + individually, deduplicated, excluding admin), call `createNotification(ctx, { userIds, type: "event_created", title: "New Recurring Event: ${name}", message: "${frequency} ${eventType} — ${occurrences.length} occurrences", relatedEntityId: firstEventId })`
    - Return `{ seriesId, eventCount: occurrences.length }`

- [ ] **Task 3: Implement `updateEvent` Convex mutation (single occurrence edit)** (AC: #5)
  - [ ] 3.1: Add to `packages/backend/convex/calendar/mutations.ts` a new exported mutation `updateEvent`.
  - [ ] 3.2: Arguments: `{ eventId: v.id("calendarEvents"), name: v.optional(v.string()), eventType: v.optional(v.union(...)), startsAt: v.optional(v.number()), endsAt: v.optional(v.number()), location: v.optional(v.string()), description: v.optional(v.string()), rsvpEnabled: v.optional(v.boolean()), invitedRoles: v.optional(v.array(v.string())), invitedUserIds: v.optional(v.array(v.id("users"))) }`
  - [ ] 3.3: Implementation:
    - Call `requireRole(ctx, ["admin"])`
    - Fetch the event by `eventId`, validate it exists and `teamId` matches
    - If both `startsAt` and `endsAt` are provided, validate `endsAt > startsAt`
    - If only `endsAt` is provided, validate against existing `startsAt`
    - If only `startsAt` is provided, validate against existing `endsAt`
    - Patch the `calendarEvents` document with the provided fields
    - If the event is recurring (`isRecurring: true`), also set `isModified: true` on the document
    - If `invitedUserIds` is provided, delete existing `calendarEventUsers` for this event and re-insert the new set
    - Collect all invited user IDs (new invitees), call `createNotification(ctx, { userIds, type: "event_updated", title: "Event Updated: ${event.name}", message: "...", relatedEntityId: eventId })`
    - Return the updated event ID
  - [ ] 3.4: Note: The `isModified` field may need to be added to the `calendarEvents` schema. Add `isModified: v.optional(v.boolean())` to the table definition in `packages/backend/convex/table/calendarEvents.ts` if it does not already exist.

- [ ] **Task 4: Implement `cancelEvent` Convex mutation (single occurrence cancel)** (AC: #6)
  - [ ] 4.1: Add to `packages/backend/convex/calendar/mutations.ts` a new exported mutation `cancelEvent`.
  - [ ] 4.2: Arguments: `{ eventId: v.id("calendarEvents") }`
  - [ ] 4.3: Implementation:
    - Call `requireRole(ctx, ["admin"])`
    - Fetch the event by `eventId`, validate it exists and `teamId` matches
    - Validate the event is not already cancelled — throw `ConvexError({ code: "VALIDATION_ERROR", message: "Event is already cancelled" })` if `isCancelled` is `true`
    - Patch the event: `{ isCancelled: true }`
    - Collect all invited user IDs (by role + individually, deduplicated, excluding admin)
    - Call `createNotification(ctx, { userIds, type: "event_cancelled", title: "Event Cancelled: ${event.name}", message: "The ${eventType} on ${formatted date} has been cancelled", relatedEntityId: eventId })`
    - Return the event ID

- [ ] **Task 5: Implement `deleteEventSeries` Convex mutation** (AC: #7)
  - [ ] 5.1: Add to `packages/backend/convex/calendar/mutations.ts` a new exported mutation `deleteEventSeries`.
  - [ ] 5.2: Arguments: `{ seriesId: v.id("calendarEventSeries") }`
  - [ ] 5.3: Implementation:
    - Call `requireRole(ctx, ["admin"])`
    - Fetch the series by `seriesId`, validate it exists and `teamId` matches
    - Query all `calendarEvents` with `seriesId` using the `by_seriesId` index
    - For each event: query and delete all `calendarEventUsers` records (using `by_eventId` index), then delete the event
    - Collect all unique invited user IDs across all occurrences (deduplicated, excluding admin)
    - Call `createNotification(ctx, { userIds, type: "event_series_deleted", title: "Event Series Deleted: ${firstEvent.name}", message: "All ${eventCount} occurrences have been deleted", relatedEntityId: seriesId })`
    - Delete the `calendarEventSeries` record
    - Return `{ deletedCount: events.length }`

- [ ] **Task 6: Implement `getSeriesInfo` query** (AC: #11)
  - [ ] 6.1: Add to `packages/backend/convex/calendar/queries.ts` a new exported query `getSeriesInfo`.
  - [ ] 6.2: Arguments: `{ seriesId: v.id("calendarEventSeries") }`
  - [ ] 6.3: Implementation:
    - Call `requireAuth(ctx)`
    - Fetch the series by `seriesId`, validate `teamId` matches
    - Count all events in the series (query `calendarEvents` by `seriesId` index)
    - Count non-cancelled events
    - Return `{ series: { frequency, endDate, createdAt }, totalOccurrences, activeOccurrences }`

- [ ] **Task 7: Update schema if needed** (AC: #5)
  - [ ] 7.1: Check if `calendarEvents` table already has `isModified: v.optional(v.boolean())` field. If not, add it to `packages/backend/convex/table/calendarEvents.ts`.
  - [ ] 7.2: Run `npx convex dev` to verify schema deploys without errors.

- [ ] **Task 8: Build RecurrenceOptions component** (AC: #1, #2)
  - [ ] 8.1: Create `apps/admin/src/components/calendar/RecurrenceOptions.tsx`. This is a controlled component that renders:
    - A `Switch` (shadcn/ui) labeled "Recurring event" — controls visibility of the recurrence fields
    - When ON: a frequency `Select` dropdown with options: Daily, Weekly, Bi-Weekly, Monthly
    - When ON: a series end date picker (shadcn `Calendar` in a `Popover`, same pattern as the event date picker from Story 3.2)
    - A computed occurrence count preview: "This will create X events" — calculated client-side using the `computeOccurrenceDates` function
  - [ ] 8.2: Props: `isRecurring: boolean`, `onRecurringChange: (val: boolean) => void`, `frequency: RecurrenceFrequency | undefined`, `onFrequencyChange: (val: RecurrenceFrequency) => void`, `endDate: number | undefined`, `onEndDateChange: (val: number) => void`, `startsAt: number | undefined`, `endsAt: number | undefined` (needed to compute occurrence count).
  - [ ] 8.3: When `isRecurring` is toggled OFF, call `onFrequencyChange(undefined)` and `onEndDateChange(undefined)` to clear recurrence values.
  - [ ] 8.4: The occurrence count preview should handle edge cases gracefully: show nothing if startsAt or endDate is not set, show "Invalid: end date must be after start date" if endDate <= startsAt.

- [ ] **Task 9: Integrate RecurrenceOptions into EventForm** (AC: #1, #2, #3)
  - [ ] 9.1: Modify `apps/admin/src/components/calendar/EventForm.tsx` (created in Story 3.2):
    - Add `isRecurring`, `frequency`, and `endDate` fields to the form's react-hook-form configuration
    - Update the Zod resolver to use the extended/discriminated schema from Task 1
    - Insert the `RecurrenceOptions` component below the RSVP Switch and above the InvitationSelector
    - Wire the RecurrenceOptions props to the form's field state (register/setValue/watch)
  - [ ] 9.2: On form submit:
    - If `isRecurring` is `false`: call `createEvent` mutation (existing, unchanged)
    - If `isRecurring` is `true`: call `createRecurringEvent` mutation with all fields including `frequency` and `endDate`
    - On success for recurring: show `toast.success("Recurring event created — {eventCount} occurrences")`, close dialog
  - [ ] 9.3: Ensure form reset clears recurrence fields when dialog is closed or after successful submission.

- [ ] **Task 10: Add recurring event indicator to EventCard** (AC: #4, #10)
  - [ ] 10.1: Modify `apps/admin/src/components/calendar/EventCard.tsx` (created in Story 3.1):
    - Check if the event has `isRecurring: true`
    - If recurring, render a small `Repeat` icon (from `lucide-react`) next to the event name or badge
    - Keep the icon subtle (small size, muted color) so it doesn't compete with the EventTypeBadge

- [ ] **Task 11: Add series info and actions to EventDetail** (AC: #5, #6, #7, #10, #11)
  - [ ] 11.1: Modify `apps/admin/src/components/calendar/EventDetail.tsx` (created in Story 3.1):
    - If the event is recurring (`isRecurring: true` and `seriesId` is present):
      - Display a "Recurring" badge with `Repeat` icon
      - Call `useQuery(api.calendar.queries.getSeriesInfo, { seriesId })` to get series metadata
      - Display: "Part of a {frequency} series", "{activeOccurrences} of {totalOccurrences} occurrences", "Series ends {formatted endDate}"
    - Add an "Edit" button (admin-only, visible for both one-off and recurring events)
    - Add a "Cancel This Event" button (admin-only) — for recurring, label it "Cancel This Occurrence"
    - Add a "Delete Entire Series" button (admin-only, visible ONLY for recurring events)
  - [ ] 11.2: Build the edit flow:
    - "Edit" button opens the `EventForm` in edit mode (pre-populated with current event data)
    - On save: calls `updateEvent` mutation with the changed fields
    - On success: `toast.success("Event updated")`, close edit form
    - Note: Edit form for a recurring occurrence does NOT show recurrence options — editing applies to this occurrence only
  - [ ] 11.3: Build the "Cancel This Occurrence" flow:
    - "Cancel This Occurrence" button opens a shadcn `AlertDialog` confirmation
    - Confirmation message: "Cancel this occurrence of {eventName} on {formatted date}? Other occurrences will not be affected."
    - On confirm: calls `cancelEvent` mutation
    - On success: `toast.success("Occurrence cancelled")`, close detail panel
    - On error: `toast.error(error.data.message)`
  - [ ] 11.4: Build the "Delete Entire Series" flow:
    - "Delete Entire Series" button opens a shadcn `AlertDialog` confirmation
    - Confirmation message: "Delete all {totalOccurrences} occurrences of {eventName}? This cannot be undone."
    - On confirm: calls `deleteEventSeries` mutation with the `seriesId`
    - On success: `toast.success("Series deleted — {deletedCount} occurrences removed")`, close detail panel
    - On error: `toast.error(error.data.message)`

- [ ] **Task 12: Write backend unit tests** (AC: #3, #5, #6, #7, #9, #12)
  - [ ] 12.1: Add tests to `packages/backend/convex/calendar/__tests__/mutations.test.ts`:
  - [ ] 12.2: Test `createRecurringEvent` — success case: admin creates a weekly recurring event for 4 weeks. Verify: (a) one `calendarEventSeries` record is created with correct frequency and endDate, (b) correct number of `calendarEvents` are created (e.g., 4 or 5 depending on date math), (c) each event has `isRecurring: true` and the correct `seriesId`, (d) each event's `startsAt` is exactly 7 days apart, (e) event duration is preserved across all occurrences.
  - [ ] 12.3: Test `createRecurringEvent` — authorization: non-admin calling the mutation receives `NOT_AUTHORIZED` error.
  - [ ] 12.4: Test `createRecurringEvent` — validation: (a) `endDate <= startsAt` throws `VALIDATION_ERROR`, (b) `endDate` more than 365 days from `startsAt` throws `VALIDATION_ERROR`, (c) `endsAt <= startsAt` throws `VALIDATION_ERROR`.
  - [ ] 12.5: Test `createRecurringEvent` — notifications: verify notifications are created for invited users and the creating admin does NOT receive one.
  - [ ] 12.6: Test `createRecurringEvent` — team isolation: verify the series and all events have the correct `teamId`.
  - [ ] 12.7: Test `updateEvent` — success case: admin edits a recurring occurrence's name and time. Verify the specific event is updated, other events in the series are unchanged, `isModified` is set to `true`.
  - [ ] 12.8: Test `updateEvent` — authorization: non-admin receives `NOT_AUTHORIZED`.
  - [ ] 12.9: Test `cancelEvent` — success case: admin cancels one occurrence. Verify `isCancelled: true` on that event, other series events unchanged.
  - [ ] 12.10: Test `cancelEvent` — already cancelled: calling on an already-cancelled event throws `VALIDATION_ERROR`.
  - [ ] 12.11: Test `deleteEventSeries` — success case: admin deletes a series with 4 events. Verify all 4 `calendarEvents` are deleted, the `calendarEventSeries` record is deleted, all `calendarEventUsers` for those events are deleted.
  - [ ] 12.12: Test `deleteEventSeries` — authorization: non-admin receives `NOT_AUTHORIZED`.
  - [ ] 12.13: Test `getSeriesInfo` — returns correct occurrence count and series metadata.

- [ ] **Task 13: Final validation** (AC: all)
  - [ ] 13.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 13.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 13.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 13.4: Start the dev server — navigate to `/calendar`, verify:
    - Create Event dialog shows the "Recurring" toggle
    - Toggling "Recurring" ON reveals frequency select and end date picker
    - Occurrence count preview displays correct numbers
    - Submitting a recurring event creates all occurrences
    - Occurrences appear on their correct dates across multiple months
    - Each occurrence shows the recurring icon
  - [ ] 13.5: Verify single occurrence edit:
    - Click a recurring occurrence, click "Edit"
    - Change the name, save — verify only that occurrence is renamed
    - Other occurrences in the series retain the original name
  - [ ] 13.6: Verify single occurrence cancel:
    - Click a recurring occurrence, click "Cancel This Occurrence"
    - Confirm — verify the occurrence disappears from the calendar
    - Other occurrences in the series remain visible
  - [ ] 13.7: Verify series deletion:
    - Click any recurring occurrence, click "Delete Entire Series"
    - Confirm — verify ALL occurrences disappear from the calendar
  - [ ] 13.8: Verify edge cases:
    - Create a monthly recurring event starting Jan 31 — verify February occurrence lands on Feb 28 (or 29 in leap year)
    - Create a daily recurring event for 1 week — verify exactly 7 or 8 occurrences (depending on inclusivity)
    - Attempt to create a recurring event with end date > 1 year from start — verify validation error

## Dev Notes

### Architecture Context

This is the **recurring events story for Epic 3 (Calendar & Scheduling)**. It extends Story 3.2's event creation with recurrence support, and adds the ability to edit, cancel, and delete recurring event occurrences. This story directly implements:

- **FR2:** Admin can create recurring events (daily, weekly, bi-weekly, monthly) with a series end date
- **FR3:** Admin can modify or cancel individual occurrences of a recurring series without affecting other occurrences
- **FR10 (partial):** The system sends in-app notifications when events are created, updated, or cancelled

### Key Architectural Decisions

- **Materialized Occurrences (architecture.md § Data Architecture):** This is the most critical decision for this story. Rather than storing a single event with an rrule and computing occurrences on every read, each occurrence is generated as a separate `calendarEvents` document at creation time. A `calendarEventSeries` table stores the recurrence definition. Rationale from architecture.md: "Convex queries work best with flat documents. Each occurrence needs its own RSVPs, its own modifications, and its own notification triggers. Generating at creation time is simpler than computing on every read."

- **Per-occurrence editing** modifies the individual `calendarEvents` document directly. The edited occurrence retains its `seriesId` reference. No "edit all future" or "edit all in series" is needed for Sprint 1. [Source: architecture.md#Data-Architecture]

- **Per-occurrence cancellation** sets `isCancelled: true` on the individual document. The existing `getMonthEvents` query already filters out cancelled events. [Source: architecture.md#Data-Architecture]

- **Series deletion** deletes all `calendarEvents` with matching `seriesId`, all related `calendarEventUsers`, and the `calendarEventSeries` record. [Source: architecture.md#Data-Architecture]

- **Notification Pattern:** Same as Story 3.2 — `createNotification()` called directly within mutations. Supports different `type` values for created, updated, cancelled, and series-deleted scenarios. [Source: architecture.md#API-&-Communication-Patterns]

- **Date Computation:** Use `date-fns` (`addDays`, `addWeeks`, `addMonths`) for computing occurrence dates. This correctly handles month-end edge cases (e.g., adding 1 month to Jan 31 yields Feb 28/29). Dates stored as Unix timestamp ms. [Source: architecture.md#Format-Patterns]

- **Authorization:** `requireRole(ctx, ["admin"])` for all create/update/cancel/delete mutations. `requireAuth(ctx)` for queries. [Source: architecture.md#Authentication-&-Security]

- **Error Handling:** `ConvexError` with `VALIDATION_ERROR`, `NOT_AUTHORIZED`, `NOT_FOUND` codes. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `calendarEvents` table with `isRecurring`, `seriesId`, `isCancelled` fields | Story 3.1 | `packages/backend/convex/table/calendarEvents.ts` must exist with these fields |
| `calendarEventSeries` table | Story 3.1 | `packages/backend/convex/table/calendarEventSeries.ts` must exist |
| `calendarEventUsers` junction table | Story 3.1 | `packages/backend/convex/table/calendarEventUsers.ts` must exist |
| `createEvent` mutation | Story 3.2 | `packages/backend/convex/calendar/mutations.ts` must export `createEvent` |
| `EventForm` component | Story 3.2 | `apps/admin/src/components/calendar/EventForm.tsx` must exist |
| `CreateEventDialog` component | Story 3.2 | `apps/admin/src/components/calendar/CreateEventDialog.tsx` must exist |
| `EventDetail` panel | Story 3.1 | `apps/admin/src/components/calendar/EventDetail.tsx` must exist |
| `EventCard` component | Story 3.1 | `apps/admin/src/components/calendar/EventCard.tsx` must exist |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export both |
| `createNotification` utility | Story 3.2 (Task 8) or 3.7 | `packages/backend/convex/lib/notifications.ts` must export `createNotification` |
| `createEventSchema` Zod schema | Story 3.2 | Shared calendar validation schema must exist |
| Calendar page with month view | Story 3.1 | `apps/admin/src/app/(app)/calendar/page.tsx` must exist |
| Schedule-X installed and configured | Story 3.1 | `@schedule-x/react` and related packages installed in admin app |
| `date-fns` installed | Story 3.1 (template) | `date-fns` 4.1.0 available in admin app |

### Current State (Baseline)

**`convex/calendar/mutations.ts`:** Exists from Story 3.2 with `createEvent` mutation. This story adds `createRecurringEvent`, `updateEvent`, `cancelEvent`, `deleteEventSeries`.

**`convex/calendar/queries.ts`:** Exists from Story 3.1 with `getMonthEvents`, `getEventDetail`, `getDayEvents`. This story adds `getSeriesInfo`.

**`calendarEventSeries` table:** Schema exists from Story 3.1 but no records exist yet. This story is the first to insert into this table.

**`EventForm.tsx`:** Exists from Story 3.2 for one-off event creation. This story extends it with RecurrenceOptions integration and conditional mutation dispatch.

**`EventDetail.tsx`:** Exists from Story 3.1 as a read-only detail panel. This story adds edit, cancel, and delete series action buttons.

**`EventCard.tsx`:** Exists from Story 3.1. This story adds the recurring icon indicator.

### Component Architecture

```
Calendar Page (page.tsx)
├── "Create Event" Button (admin-only, from Story 3.2)
├── CalendarView (from Story 3.1)
│   └── EventCard (modified: recurring icon)
├── CreateEventDialog (from Story 3.2)
│   └── EventForm (modified: RecurrenceOptions integration)
│       ├── ... (existing fields from Story 3.2)
│       ├── RecurrenceOptions (NEW)
│       │   ├── Recurring Switch
│       │   ├── Frequency Select
│       │   ├── End Date Picker
│       │   └── Occurrence Count Preview
│       └── InvitationSelector (existing from Story 3.2)
└── EventDetail (modified: series info + action buttons)
    ├── Series Info Badge ("Part of a weekly series")
    ├── Edit Button → EventForm (edit mode)
    ├── Cancel This Occurrence Button → AlertDialog
    └── Delete Entire Series Button → AlertDialog
```

### Occurrence Generation Algorithm

```typescript
import { addDays, addWeeks, addMonths } from 'date-fns'

function computeOccurrenceDates(
  startsAt: number,
  endsAt: number,
  frequency: RecurrenceFrequency,
  seriesEndDate: number,
  maxOccurrences = 365
): Array<{ startsAt: number; endsAt: number }> {
  const duration = endsAt - startsAt
  const occurrences: Array<{ startsAt: number; endsAt: number }> = []
  let currentStart = new Date(startsAt)

  while (currentStart.getTime() <= seriesEndDate && occurrences.length < maxOccurrences) {
    const occStartMs = currentStart.getTime()
    occurrences.push({ startsAt: occStartMs, endsAt: occStartMs + duration })

    switch (frequency) {
      case 'daily':   currentStart = addDays(currentStart, 1); break
      case 'weekly':  currentStart = addWeeks(currentStart, 1); break
      case 'biweekly': currentStart = addWeeks(currentStart, 2); break
      case 'monthly': currentStart = addMonths(currentStart, 1); break
    }
  }

  return occurrences
}
```

Key edge case: `addMonths(new Date(2026, 0, 31), 1)` yields Feb 28, 2026 (or Feb 29 in leap years). `date-fns` handles this correctly by clamping to the last day of the target month.

### Mutation Flow — Creating Recurring Events

```
Admin toggles "Recurring" ON in Create Event form
→ Selects frequency (e.g., "weekly")
→ Sets series end date
→ Occurrence preview shows "This will create 12 events"
→ Admin clicks "Create Event"
→ Client: Zod validates all fields including recurrence
→ Client: Calls useMutation(api.calendar.mutations.createRecurringEvent)
→ Server: requireRole(ctx, ["admin"])
→ Server: Validates all inputs
→ Server: db.insert("calendarEventSeries", { frequency, endDate, ... })
→ Server: computeOccurrenceDates(startsAt, endsAt, frequency, endDate)
→ Server: For each occurrence → db.insert("calendarEvents", { isRecurring: true, seriesId, ... })
→ Server: For each occurrence × invitedUser → db.insert("calendarEventUsers", ...)
→ Server: createNotification(ctx, { userIds, type: "event_created", ... })
→ Server: Return { seriesId, eventCount }
→ Client: toast.success("Recurring event created — 12 occurrences"), close dialog
→ Convex subscription: CalendarView auto-updates with new events across months
```

### Mutation Flow — Editing Single Occurrence

```
Admin clicks a recurring occurrence in calendar
→ EventDetail panel opens (shows series info + action buttons)
→ Admin clicks "Edit"
→ EventForm opens in edit mode (pre-populated, NO recurrence options)
→ Admin changes name/time/etc., clicks "Save"
→ Client: Calls useMutation(api.calendar.mutations.updateEvent, { eventId, ...changes })
→ Server: requireRole(ctx, ["admin"])
→ Server: Fetch event, validate teamId
→ Server: Patch event document + set isModified: true
→ Server: createNotification (event_updated)
→ Client: toast.success("Event updated"), close edit form
→ Only that single occurrence is modified — all others unchanged
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/shared/calendar.ts` (or `constants.ts`) | Modified | Extended Zod schema with recurrence fields, discriminated union or conditional validation |
| `packages/backend/convex/calendar/mutations.ts` | Modified | Add `createRecurringEvent`, `updateEvent`, `cancelEvent`, `deleteEventSeries` mutations |
| `packages/backend/convex/calendar/queries.ts` | Modified | Add `getSeriesInfo` query |
| `packages/backend/convex/calendar/utils.ts` | Created | `computeOccurrenceDates` utility function (or place in shared package) |
| `packages/backend/convex/table/calendarEvents.ts` | Modified (conditional) | Add `isModified: v.optional(v.boolean())` field if not present |
| `apps/admin/src/components/calendar/RecurrenceOptions.tsx` | Created | Recurring event toggle, frequency select, end date picker, occurrence preview |
| `apps/admin/src/components/calendar/EventForm.tsx` | Modified | Integrate RecurrenceOptions, conditional mutation dispatch (createEvent vs createRecurringEvent) |
| `apps/admin/src/components/calendar/EventCard.tsx` | Modified | Add recurring icon indicator for events with `isRecurring: true` |
| `apps/admin/src/components/calendar/EventDetail.tsx` | Modified | Add series info display, Edit button, Cancel Occurrence button, Delete Series button with confirmation dialogs |
| `packages/backend/convex/calendar/__tests__/mutations.test.ts` | Modified | Add tests for createRecurringEvent, updateEvent, cancelEvent, deleteEventSeries |
| `packages/backend/convex/calendar/__tests__/utils.test.ts` | Created | Unit tests for computeOccurrenceDates |

### What This Story Does NOT Include

- **No "Edit All Future" option** — Only single-occurrence editing for Sprint 1. No "apply to all future occurrences" or "apply to entire series" cascade.
- **No "Edit All in Series"** — Same as above. Editing only applies to the clicked occurrence.
- **No recurrence rule modification** — Once a series is created, the frequency and end date cannot be changed. Admin must delete the series and recreate to change recurrence pattern.
- **No RSVP submission UI** — That's Story 3.4 (RSVP tracking)
- **No "Show Cancelled" filter** — Cancelled occurrences are simply hidden. No toggle to view them in Sprint 1.
- **No rrule/iCal rrule format** — Occurrences are materialized; no rrule string is stored or parsed. .ics feed (Story 3.5) will generate individual VEVENT entries per occurrence.
- **No infinite recurrence** — An end date is always required. No "repeat forever" option.
- **No custom day-of-week selection** — e.g., "every Monday and Wednesday". Only fixed frequencies (daily, weekly, bi-weekly, monthly).
- **No exception dates** — Cannot skip specific dates (e.g., "weekly except Christmas"). Admin cancels individual occurrences instead.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large number of occurrences causes slow mutation | 365-occurrence cap enforced. Convex mutations have a 10s timeout — inserting 365 simple documents should be well within limit. If performance is a concern, batch inserts or scheduled tasks can be explored. |
| `computeOccurrenceDates` month-end edge cases | Use `date-fns` `addMonths` which handles month-end clamping correctly. Comprehensive unit tests cover edge cases. |
| EventForm complexity increases with recurrence options | RecurrenceOptions is a separate, self-contained component. Form conditional logic is clean: `isRecurring ? callRecurringMutation : callOneOffMutation`. |
| Deleting a large series is slow (many DB operations) | Convex handles cascading deletes in a single mutation. For Sprint 1 scale (max 365 events per series, single team), this is not a real concern. |
| Series deletion is irreversible | Confirmation dialog with clear warning message. No soft-delete for series — individual occurrences use `isCancelled` for soft cancel, but full series delete is hard delete. |
| `isModified` field doesn't exist in schema | Task 7 adds it. Schema migration is seamless in Convex (additive field with `v.optional`). |
| Notification spam for large recurring event creation | A single notification is sent per user for the entire series creation (not one per occurrence). Message includes occurrence count. |

### Alignment with Architecture Document

- **Data Architecture:** Matches `architecture.md § Data Architecture` — Materialized occurrences, `calendarEventSeries` for rrule definition, per-occurrence edits via direct document patch, `isCancelled` for soft cancel, hard delete for series.
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireRole(ctx, ["admin"])` for all mutations, `requireAuth(ctx)` for queries.
- **Notification Pattern:** Matches `architecture.md § API & Communication Patterns` — `createNotification()` called directly in mutations, batch userIds, no pub/sub.
- **Date Handling:** Matches `architecture.md § Format Patterns` — `date-fns` for occurrence computation, timestamps as numbers in Convex.
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with `VALIDATION_ERROR`, `NOT_AUTHORIZED` codes, sonner toasts on frontend.
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — components in `components/calendar/`, RecurrenceOptions as a new component in the calendar module.
- **Naming:** Matches `architecture.md § Naming Patterns` — `createRecurringEvent` (camelCase mutation), `RecurrenceOptions.tsx` (PascalCase component), `getSeriesInfo` (camelCase query).
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/calendar/__tests__/`, vitest + @convex-dev/test.
- **No detected conflicts** with the architecture document.

### References

- [Source: architecture.md#Data-Architecture] — Materialized occurrences, calendarEventSeries schema, per-occurrence editing/cancellation, series deletion
- [Source: architecture.md#Authentication-&-Security] — requireRole for admin-only mutations, requireAuth for queries, RBAC model
- [Source: architecture.md#API-&-Communication-Patterns] — createNotification utility, batch userIds, direct insert
- [Source: architecture.md#Frontend-Architecture] — Component organization (components/calendar/), state management (useQuery)
- [Source: architecture.md#Format-Patterns] — date-fns for dates, timestamps as numbers, ConvexError codes
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Form pattern, naming conventions, enforcement guidelines
- [Source: architecture.md#Additional-Dependencies] — date-fns 4.1.0 for date computation
- [Source: epics.md#Story-3.3] — Original story definition, user story, and BDD acceptance criteria (FR2, FR3)
- [Source: epics.md#FR-Coverage-Map] — FR2, FR3 mapped to Epic 3
- [Source: 3-1-calendar-data-model-month-view.md] — Predecessor: data model, schema, calendar UI, EventDetail, EventCard
- [Source: 3-2-event-creation-one-off.md] — Predecessor: EventForm, CreateEventDialog, createEvent mutation, InvitationSelector, createNotification setup

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
