# Story 3.2: Event Creation (One-Off)

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **Testing philosophy: Write tests where they matter — critical business logic, security rules, data integrity, and complex state management. Do NOT write tests for trivial getters, simple UI rendering, or obvious CRUD. Quality over quantity.**

> **IMPORTANT: Write unit tests and backend integration tests (using @convex-dev/test) for critical logic only. Do not write tests for trivial CRUD or simple UI rendering. Focus tests on: business rules, data validation, state transitions, and edge cases.**

## Story

As an admin,
I want to create calendar events with a name, type, start/end time, location, and description,
so that I can schedule club activities and communicate them to the team.

## Acceptance Criteria

1. **"Create Event" button visible to admins only** — When the admin is on the `/calendar` page, a "Create Event" button is visible (e.g., in the page header area). Non-admin roles do NOT see this button. The button's visibility is controlled by checking the user's role from `useQuery` — but the actual enforcement is server-side in the mutation.

2. **Event creation form opens in a dialog** — When the admin clicks "Create Event", a `Dialog` (shadcn/ui) opens containing the event creation form. The dialog has a clear title ("Create Event") and a close button.

3. **Form contains all required fields** — The form includes:
   - `name` (text input, required, max 200 characters)
   - `eventType` (select dropdown: Match, Training, Meeting, Rehab — required)
   - `startsAt` (date picker + time picker, required)
   - `endsAt` (date picker + time picker, required, must be after `startsAt`)
   - `location` (text input, optional, max 200 characters)
   - `description` (textarea, optional, max 2000 characters)
   - `rsvpEnabled` (toggle/switch, defaults to `true`)

4. **Role invitation selector** — The form includes a "Who to invite" section with checkboxes for each role: Admin, Coach, Analyst, Physio/Medical, Player, Staff. Multiple roles can be selected. At least one role OR one individual user must be selected before submission.

5. **Individual user invitation selector** — Below the role checkboxes, a search/combobox field allows the admin to search users by name and select specific individual users to invite. Selected users appear as removable chips/badges. Users already covered by a selected role can still be individually added (no conflict — they'll just have access via both paths).

6. **Client-side form validation** — The form validates with Zod before submission:
   - `name` is required and non-empty
   - `eventType` is one of the four valid types
   - `startsAt` is a valid date/time
   - `endsAt` is a valid date/time AND is after `startsAt`
   - At least one role is selected OR at least one individual user is invited
   - Validation errors display inline under the respective field

7. **`createEvent` mutation creates the event** — A Convex mutation `calendar.mutations.createEvent` accepts the form data, calls `requireRole(ctx, ["admin"])`, validates inputs server-side, inserts a new document into `calendarEvents` with: `teamId` from auth context, `name`, `eventType`, `startsAt` (Unix timestamp ms), `endsAt` (Unix timestamp ms), `location`, `description`, `ownerId` (authenticated user's ID), `rsvpEnabled`, `isRecurring: false`, `seriesId: undefined`, `isCancelled: false`, `invitedRoles` (array of selected role strings), `createdAt: Date.now()`. Returns the new event's ID.

8. **Individual user invitations are stored** — If individual users were selected, the `createEvent` mutation also inserts one `calendarEventUsers` record per selected user with `eventId`, `userId`, and `teamId`.

9. **Notifications sent to all invited users** — After creating the event and user invitation records, the mutation calls `createNotification()` for each invited user. Invited users include: all users with a role in `invitedRoles` (queried from the users table) PLUS all individually invited users (deduplicated). The notification has `type: "event_created"`, `title: "New Event: {eventName}"`, `message` includes the event date/time and type, and `relatedEntityId` is the new event's ID. The creating admin does NOT receive a notification for their own action.

10. **Event appears on calendar in real time** — After successful creation, the event immediately appears on the month-view calendar for all invited users via Convex subscription (`useQuery` in `CalendarView` auto-updates). No manual refresh needed.

11. **Dialog closes and success toast on submit** — After successful mutation, the dialog closes, a success toast ("Event created") is displayed via `sonner`, and the form is reset to default values. If the mutation throws a `ConvexError`, the error message is displayed via `toast.error()` and the dialog stays open.

12. **Server-side validation and authorization** — The `createEvent` mutation enforces:
    - Only users with `role === "admin"` can create events (via `requireRole`)
    - `endsAt > startsAt` validation (throws `VALIDATION_ERROR` if violated)
    - `eventType` is one of the four valid types
    - `teamId` is set from the authenticated context (not from client input)
    - Non-admin users calling the mutation receive a `NOT_AUTHORIZED` error

13. **Team-scoped user queries** — The user search for individual invitations queries users within the same team only. The role invitation checkboxes use the fixed set of 6 role names. All data is scoped to `teamId`.

## Tasks / Subtasks

- [ ] **Task 1: Create Zod validation schema for event creation** (AC: #3, #6)
  - [ ] 1.1: Create or extend `packages/shared/calendar.ts` (or `constants.ts`) with a Zod schema `createEventSchema` that validates: `name: z.string().min(1).max(200)`, `eventType: z.enum(["match", "training", "meeting", "rehab"])`, `startsAt: z.number()` (Unix timestamp ms), `endsAt: z.number()` (Unix timestamp ms), `location: z.string().max(200).optional()`, `description: z.string().max(2000).optional()`, `rsvpEnabled: z.boolean()`, `invitedRoles: z.array(z.string())`, `invitedUserIds: z.array(z.string())`. Add a `.refine()` to validate `endsAt > startsAt` with message "End time must be after start time". Add a `.refine()` to validate `invitedRoles.length > 0 || invitedUserIds.length > 0` with message "At least one role or user must be invited".
  - [ ] 1.2: Export the schema and its inferred TypeScript type `CreateEventFormData` from the shared package.

- [ ] **Task 2: Implement `createEvent` Convex mutation** (AC: #7, #8, #9, #12, #13)
  - [ ] 2.1: Create `packages/backend/convex/calendar/mutations.ts` (if it doesn't exist).
  - [ ] 2.2: Implement the `createEvent` mutation:
    - Arguments: `{ name: v.string(), eventType: v.union(v.literal("match"), v.literal("training"), v.literal("meeting"), v.literal("rehab")), startsAt: v.number(), endsAt: v.number(), location: v.optional(v.string()), description: v.optional(v.string()), rsvpEnabled: v.boolean(), invitedRoles: v.array(v.string()), invitedUserIds: v.array(v.id("users")) }`
    - Call `requireRole(ctx, ["admin"])` to get `{ user, teamId }`
    - Validate `endsAt > startsAt` — throw `ConvexError({ code: "VALIDATION_ERROR", message: "End time must be after start time" })` if not
    - Insert into `calendarEvents` with all fields, `ownerId: user._id`, `isRecurring: false`, `seriesId: undefined`, `isCancelled: false`, `createdAt: Date.now()`
    - Return the new event ID
  - [ ] 2.3: After event insertion, if `invitedUserIds` is non-empty, batch insert into `calendarEventUsers` — one record per user with `{ eventId, userId, teamId }`.
  - [ ] 2.4: After event and user invitation inserts, collect all invited user IDs for notifications:
    - Query `users` table for users in this team whose `role` is in `invitedRoles` — collect their `_id` values
    - Merge with `invitedUserIds`
    - Deduplicate the combined set
    - Remove the creating admin's own `_id` from the set
    - Call `createNotification(ctx, { userIds, type: "event_created", title: "New Event: ${name}", message: "${eventType} on ${formatted date}", relatedEntityId: eventId })` — use the utility from `convex/lib/notifications.ts`

- [ ] **Task 3: Implement `searchTeamUsers` query for invitation selector** (AC: #5, #13)
  - [ ] 3.1: Create a query in `packages/backend/convex/users/queries.ts` (or add to existing file): `searchTeamUsers` — accepts `{ search: v.optional(v.string()) }`, calls `requireAuth(ctx)`, queries users by `teamId`, optionally filters by name containing the search string (case-insensitive). Returns array of `{ _id, fullName, email, role }`. Limit to 50 results.
  - [ ] 3.2: If a `searchTeamUsers` or similar query already exists from Story 2.x, verify it returns the needed fields and reuse it. Do not duplicate.

- [ ] **Task 4: Build InvitationSelector component** (AC: #4, #5)
  - [ ] 4.1: Create `apps/admin/src/components/calendar/InvitationSelector.tsx`. This component renders:
    - A "Roles" section with checkboxes for each of the 6 roles: Admin, Coach, Analyst, Physio/Medical, Player, Staff. Uses shadcn `Checkbox` components.
    - A "Specific Users" section with a shadcn `Combobox` (or `Command` + `Popover`) for searching users. The combobox calls `useQuery(api.users.queries.searchTeamUsers, { search: debouncedInputValue })`.
    - Selected individual users display as `Badge` components with an X remove button.
  - [ ] 4.2: The component exposes props: `selectedRoles: string[]`, `onRolesChange: (roles: string[]) => void`, `selectedUsers: Array<{ _id: string, fullName: string }>`, `onUsersChange: (users: Array<...>) => void`. It is a controlled component.
  - [ ] 4.3: Debounce the user search input (300ms) to avoid excessive queries.

- [ ] **Task 5: Build EventForm component** (AC: #2, #3, #4, #5, #6, #11)
  - [ ] 5.1: Create `apps/admin/src/components/calendar/EventForm.tsx`. Uses `react-hook-form` with `zodResolver(createEventSchema)`.
  - [ ] 5.2: Form fields layout (all using shadcn/ui form components):
    - **Event Name**: `Input` with `FormField` wrapper, placeholder "Event name"
    - **Event Type**: `Select` with options: Match, Training, Meeting, Rehab. Each option displays with its color-coded `EventTypeBadge` for visual clarity.
    - **Start Date/Time**: Side-by-side date picker (`react-day-picker` via shadcn Calendar/Popover) + time input. Convert to Unix timestamp ms on submit.
    - **End Date/Time**: Same layout as start. Auto-default to 1 hour after start when start is set and end is empty.
    - **Location**: `Input`, optional, placeholder "Location (optional)"
    - **Description**: `Textarea`, optional, placeholder "Description (optional)"
    - **RSVP Toggle**: `Switch` component with label "Enable RSVP", defaulting to `true`
    - **Invitations**: Embedded `InvitationSelector` component
  - [ ] 5.3: On form submit:
    - Convert date/time picker values to Unix timestamps (ms)
    - Extract `invitedUserIds` as array of user `_id` strings
    - Call `useMutation(api.calendar.mutations.createEvent)` with the validated data
    - On success: call `onSuccess()` callback (parent closes dialog, shows toast)
    - On `ConvexError`: display error via `toast.error(error.data.message)`
  - [ ] 5.4: Add a "Cancel" button that calls `onCancel()` prop and resets the form.
  - [ ] 5.5: Add a "Create Event" submit button. Disable it while the mutation is in-flight (use mutation's loading state or local `isPending` state).

- [ ] **Task 6: Build CreateEventDialog component** (AC: #1, #2, #10, #11)
  - [ ] 6.1: Create `apps/admin/src/components/calendar/CreateEventDialog.tsx`. Uses shadcn `Dialog` component. Accepts `open: boolean` and `onOpenChange: (open: boolean) => void` props.
  - [ ] 6.2: Dialog content: title "Create Event", scrollable body containing `EventForm`, no footer (buttons are inside the form).
  - [ ] 6.3: On successful event creation (form's `onSuccess`): close dialog, show `toast.success("Event created")`, reset form state.
  - [ ] 6.4: Dialog width should accommodate the form comfortably (e.g. `max-w-2xl`).

- [ ] **Task 7: Integrate CreateEventDialog into Calendar page** (AC: #1, #10)
  - [ ] 7.1: Modify `apps/admin/src/app/(app)/calendar/page.tsx` to:
    - Add a "Create Event" button in the page header area (e.g., top-right, using shadcn `Button` with a `Plus` icon from `lucide-react`).
    - Conditionally render the button: only visible when the current user's role is `"admin"`. Use `useQuery(api.users.queries.currentUser)` or equivalent to check role.
    - Manage `isCreateDialogOpen` state. Button click sets it to `true`.
    - Render `<CreateEventDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />`.
  - [ ] 7.2: After dialog success, the calendar view auto-updates via Convex subscription — no additional code needed for real-time display.

- [ ] **Task 8: Ensure notification utility is ready** (AC: #9)
  - [ ] 8.1: Verify `packages/backend/convex/lib/notifications.ts` exists and exports `createNotification()`. If it exists (from Story 3.7 or earlier), use it directly.
  - [ ] 8.2: If `createNotification` does NOT exist yet, create a minimal implementation: a function that accepts `(ctx, { userIds: Id<"users">[], type: string, title: string, message: string, relatedEntityId: Id<any> })` and inserts one `notifications` record per userId. If the `notifications` table doesn't exist in the schema yet, create it with fields: `userId: v.id("users")`, `teamId: v.id("teams")`, `type: v.string()`, `title: v.string()`, `message: v.string()`, `read: v.boolean()` (default `false`), `createdAt: v.number()`, `relatedEntityId: v.optional(v.string())`. Add index `by_userId_read` on `["userId", "read"]`.
  - [ ] 8.3: Register the `notifications` table in `schema.ts` if newly created.

- [ ] **Task 9: Write backend unit tests** (AC: #7, #8, #9, #12, #13)
  - [ ] 9.1: Create `packages/backend/convex/calendar/__tests__/mutations.test.ts` using `@convex-dev/test` + `vitest`.
  - [ ] 9.2: Test `createEvent` — success case: admin creates event, verify event document exists in `calendarEvents` with correct fields, verify `isRecurring` is `false`, verify `ownerId` matches admin.
  - [ ] 9.3: Test `createEvent` — individual invitations: when `invitedUserIds` includes 2 users, verify 2 records exist in `calendarEventUsers`.
  - [ ] 9.4: Test `createEvent` — authorization: non-admin user calling `createEvent` receives `NOT_AUTHORIZED` error.
  - [ ] 9.5: Test `createEvent` — validation: `endsAt <= startsAt` throws `VALIDATION_ERROR`.
  - [ ] 9.6: Test `createEvent` — notification creation: verify notifications are created for invited users (by role and by individual), and the creating admin does NOT receive a notification.
  - [ ] 9.7: Test `createEvent` — team isolation: created event has the correct `teamId` from auth context.

- [ ] **Task 10: Final validation** (AC: all)
  - [ ] 10.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 10.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 10.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 10.4: Start the dev server — navigate to `/calendar`, verify:
    - "Create Event" button is visible for admin users
    - "Create Event" button is NOT visible for non-admin users
    - Clicking "Create Event" opens the dialog with all form fields
    - Filling in and submitting the form creates the event
    - The event appears on the calendar immediately after creation
    - A success toast is shown
    - Dialog closes after successful creation
  - [ ] 10.5: Verify error handling: submit form with `endsAt` before `startsAt`, verify validation error is shown inline.
  - [ ] 10.6: Verify RSVP toggle: create an event with RSVP enabled, verify the event detail (from Story 3.1) shows RSVP as enabled. Create another with RSVP disabled, verify it shows as disabled.

## Dev Notes

### Architecture Context

This is the **event creation story for Epic 3 (Calendar & Scheduling)**. It builds directly on Story 3.1's data model and calendar UI, adding the write path: a form-driven mutation that creates one-off events, handles invitations, and triggers notifications. This story directly implements:

- **FR1:** Admin can create one-off calendar events with name, type, start time, end time, location, and description
- **FR4:** Admin can invite entire roles or specific individual users to an event
- **FR5:** Admin can enable or disable RSVP on a per-event basis
- **FR10 (partial):** The system sends in-app notifications when events are created

This story does NOT handle recurring events (FR2/FR3 — Story 3.3), RSVP responses (FR7 — Story 3.4), or event updates/cancellations (notifications for those are in Story 3.7).

### Key Architectural Decisions

- **Form Pattern**: `react-hook-form` + `zodResolver` + `useMutation`. Matches architecture.md § Process Patterns. Zod schema shared between frontend validation and backend validation reference.

- **Authorization**: `requireRole(ctx, ["admin"])` — only admins can create events. Enforced server-side. UI conditionally hides the button but the mutation is the actual gate. [Source: architecture.md#Authentication-&-Security]

- **Notification Pattern**: Direct insert via `createNotification()` utility. No event bus or pub/sub. Called within the mutation after successful event creation. Supports batch creation (multiple userIds). [Source: architecture.md#API-&-Communication-Patterns]

- **Hybrid Invitations**: Roles stored as `invitedRoles: string[]` on the event document. Individual users stored in `calendarEventUsers` junction table. Both paths are processed in a single mutation. [Source: architecture.md#Data-Architecture]

- **Error Handling**: `ConvexError` with codes `NOT_AUTHORIZED`, `VALIDATION_ERROR`. Frontend catches and displays via `sonner` toasts. [Source: architecture.md#Format-Patterns]

- **Date Handling**: Form uses date pickers that produce Date objects. Converted to Unix timestamp ms (`Date.getTime()`) before calling the mutation. Stored as `number` in Convex. [Source: architecture.md#Format-Patterns]

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `calendarEvents` table schema | Story 3.1 | `packages/backend/convex/table/calendarEvents.ts` must exist |
| `calendarEventUsers` junction table | Story 3.1 | `packages/backend/convex/table/calendarEventUsers.ts` must exist |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export both |
| Calendar page (`/calendar`) | Story 3.1 | `apps/admin/src/app/(app)/calendar/page.tsx` must exist |
| `EventTypeBadge` component | Story 1.4 or 3.1 | `apps/admin/src/components/shared/EventTypeBadge.tsx` should exist |
| Users table with `role` field | Story 2.1 | Users must have the 6-role enum field |
| shadcn/ui Dialog, Switch, Select, Checkbox, Badge, Command/Combobox | Story 1.2 | Components must be installed in the admin app |

### Current State (Baseline)

**`convex/calendar/mutations.ts`:** Does NOT exist. Must be created in this story.

**`convex/lib/notifications.ts`:** May or may not exist depending on whether Story 3.7 has been completed. If not, a minimal version is created in Task 8.

**`notifications` table:** May or may not exist in the schema. If not, a minimal version is created in Task 8.

**Calendar page:** Exists from Story 3.1 — currently read-only with month view. This story adds the "Create Event" button and dialog.

**User search query:** May or may not exist. Story 2.2 (User Invitation & Onboarding) may have created a team-scoped user search. Reuse if available.

### Component Architecture

```
Calendar Page (page.tsx)
├── "Create Event" Button (admin-only, conditionally rendered)
├── CalendarView (from Story 3.1 — unchanged)
└── CreateEventDialog
    └── EventForm
        ├── Name Input
        ├── EventType Select (with EventTypeBadge in options)
        ├── Start Date/Time Picker
        ├── End Date/Time Picker
        ├── Location Input
        ├── Description Textarea
        ├── RSVP Switch
        ├── InvitationSelector
        │   ├── Role Checkboxes (6 roles)
        │   └── User Search Combobox + Selected Users Badges
        ├── Cancel Button
        └── Create Event Button
```

### Date/Time Picker Implementation Notes

shadcn/ui does not have a built-in combined date-time picker. Recommended approach:
- Use the existing shadcn `Calendar` component (react-day-picker) in a `Popover` for date selection
- Add a separate time input (HTML `<input type="time">` or a custom shadcn-styled time select with hour/minute dropdowns)
- Combine date + time into a single `Date` object, then convert to Unix timestamp ms: `combinedDate.getTime()`
- Auto-set end time to 1 hour after start time when start is first set and end is still empty

### Mutation Flow

```
Admin clicks "Create Event"
→ Dialog opens with EventForm
→ Admin fills fields, selects roles/users
→ Zod validates client-side
→ useMutation(api.calendar.mutations.createEvent) called
→ Server: requireRole(ctx, ["admin"]) → validates auth + admin role
→ Server: Validates endsAt > startsAt
→ Server: db.insert("calendarEvents", { ...fields, isRecurring: false })
→ Server: For each invitedUserId → db.insert("calendarEventUsers", { eventId, userId, teamId })
→ Server: Query users by team + role ∈ invitedRoles → collect userIds
→ Server: Merge + deduplicate all invited userIds, exclude admin
→ Server: createNotification(ctx, { userIds, type: "event_created", ... })
→ Server: Return eventId
→ Client: toast.success("Event created"), close dialog
→ Convex subscription: CalendarView auto-updates with new event
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/shared/calendar.ts` (or `constants.ts`) | Modified | Add `createEventSchema` Zod validation schema and `CreateEventFormData` type |
| `packages/backend/convex/calendar/mutations.ts` | Created | `createEvent` mutation with auth, validation, insert, invitations, notifications |
| `packages/backend/convex/users/queries.ts` | Modified/Created | `searchTeamUsers` query (if not already existing) |
| `packages/backend/convex/lib/notifications.ts` | Created (conditional) | `createNotification` utility (only if not already created by Story 3.7) |
| `packages/backend/convex/table/notifications.ts` | Created (conditional) | Notifications table definition (only if not already created) |
| `packages/backend/convex/schema.ts` | Modified (conditional) | Register notifications table (only if newly created) |
| `apps/admin/src/components/calendar/InvitationSelector.tsx` | Created | Role checkboxes + user search combobox component |
| `apps/admin/src/components/calendar/EventForm.tsx` | Created | Full event creation form with react-hook-form + zod |
| `apps/admin/src/components/calendar/CreateEventDialog.tsx` | Created | Dialog wrapper around EventForm |
| `apps/admin/src/app/(app)/calendar/page.tsx` | Modified | Add "Create Event" button (admin-only) + dialog integration |
| `packages/backend/convex/calendar/__tests__/mutations.test.ts` | Created | Unit tests for createEvent mutation |

### What This Story Does NOT Include

- **No event editing/updating** — future story (admin can edit events, pending Story definition)
- **No recurring event creation** — that's Story 3.3 (the form excludes the "Recurring" toggle)
- **No RSVP submission UI** — that's Story 3.4 (form only has the RSVP enable/disable toggle)
- **No event cancellation/deletion** — future story
- **No drag-and-drop event creation** — post-Sprint 1 enhancement
- **No file/image attachments on events** — not in Sprint 1 scope
- **No notification rendering/display** — that's Story 3.7 (this story only creates the notification records)

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `createNotification` utility doesn't exist yet | Task 8 creates a minimal version. Designed to match the architecture.md spec so Story 3.7 can extend it later. |
| `notifications` table doesn't exist in schema | Task 8 creates it with the full schema from architecture.md. Idempotent — if it already exists, skip. |
| User search query may not exist | Task 3 creates it if needed. Check existing user queries first to avoid duplication. |
| Date/time picker UX complexity | Use a simple pattern: separate date (react-day-picker popover) + time (input type="time") fields. Avoid over-engineering a custom datetime picker. |
| Large number of users in team slows user search combobox | Debounce search input (300ms). Limit query results to 50. Convex's built-in query performance is sufficient for Sprint 1 scale. |
| Notification fan-out for many invited users | For Sprint 1 (single team, ~30-50 users max), direct insert in a loop is fine. No batch optimization needed yet. |

### Alignment with Architecture Document

- **Mutation Pattern:** Matches `architecture.md § Process Patterns` — `useForm` + `zodResolver` + `useMutation` + `toast.success/error`
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireRole(ctx, ["admin"])` for admin-only mutations
- **Notification Pattern:** Matches `architecture.md § API & Communication Patterns` — `createNotification()` called directly in mutation, batch userIds, no pub/sub
- **Data Model:** Matches `architecture.md § Data Architecture` — `invitedRoles: string[]` on event, junction table for individual users
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — components in `components/calendar/`, shared components in `components/shared/`
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with `VALIDATION_ERROR`, `NOT_AUTHORIZED` codes
- **Naming:** Matches `architecture.md § Naming Patterns` — `createEvent` (camelCase mutation), `EventForm.tsx` (PascalCase component), `InvitationSelector.tsx`
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/calendar/__tests__/mutations.test.ts`
- **No detected conflicts** with the architecture document

### Project Structure Notes

- All new frontend components go in `apps/admin/src/components/calendar/` — consistent with the feature-based organization
- The `InvitationSelector` could arguably go in `components/shared/` since documents also use role+user permissions. For now, keep it in `calendar/` for simplicity. If Story 4.3 (Document Permissions) needs the same pattern, refactor to shared at that point.
- Mutation file `convex/calendar/mutations.ts` follows the one-file-per-type pattern established in architecture.md

### References

- [Source: architecture.md#Data-Architecture] — Hybrid normalization, invitedRoles array, calendarEventUsers junction table
- [Source: architecture.md#Authentication-&-Security] — requireRole for admin-only operations, RBAC model
- [Source: architecture.md#API-&-Communication-Patterns] — createNotification utility pattern, batch userIds, direct insert
- [Source: architecture.md#Frontend-Architecture] — Component organization (components/calendar/), page structure
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, ConvexError codes (VALIDATION_ERROR, NOT_AUTHORIZED), toast feedback
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Form pattern (useForm + zodResolver + useMutation), naming conventions, enforcement guidelines
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: epics.md#Story-3.2] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR1, FR4, FR5, FR10 mapped to Epic 3
- [Source: 3-1-calendar-data-model-month-view.md] — Predecessor story establishing data model and calendar UI

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
