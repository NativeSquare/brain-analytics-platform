# Story 5.4: Physical & Fitness Data Log

Status: done
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin or medical staff member,
I want to enter physical and fitness data for a player over time,
so that the club can track player fitness trends.

## Acceptance Criteria

1. **"Fitness" tab on the player profile is functional** — When an authenticated user navigates to `/players/[playerId]` and clicks the "Fitness" tab, the tab content renders a fitness data log (replacing the "Coming soon" placeholder from Story 5.1). The tab is visible to all authenticated users (not role-restricted).

2. **`getPlayerFitness` query returns fitness entries for a player** — A query `players.queries.getPlayerFitness` accepts `{ playerId: Id<"players"> }`, calls `requireAuth(ctx)`, validates the player belongs to the authenticated user's team, and returns an array of `playerFitness` documents for that player sorted by `date` descending (most recent entry first). Each entry includes: `_id`, `date`, `weightKg`, `bodyFatPercentage`, `notes`, `createdBy`, `createdAt`. Returns an empty array if no entries exist.

3. **Fitness log displays as a data table** — The Fitness tab renders a table (using shadcn `Table` or TanStack React Table) with columns: Date (formatted with `date-fns`, e.g. "15 Mar 2026"), Weight (kg) (formatted with 1 decimal, e.g. "82.5 kg"), Body Fat (%) (formatted with 1 decimal, e.g. "12.3%"), Notes (truncated to ~60 chars in the table row, with full text shown in a tooltip or on row expansion), and an Actions column (visible to admins and physio users only). The table is sorted by most recent entry first by default. An empty state is shown when no entries exist ("No fitness data recorded yet").

4. **"Add Entry" button visible to admins and physio/medical staff** — When the current user has the `admin` or `physio` role, an "Add Entry" button is displayed above the fitness table. Users with other roles (coach, analyst, player, staff) do not see this button. Clicking the button opens a dialog/sheet with the fitness entry form.

5. **Fitness entry form validates and submits correctly** — The "Add Entry" form contains fields: date (required — date picker, defaults to today), weight in kg (optional — number input, range 30-200, 1 decimal allowed), body fat percentage (optional — number input, range 1-60, 1 decimal allowed), notes/test results (optional — textarea, max 2000 characters). At least one data field (weight or body fat or notes) must be provided in addition to the date. The form uses `react-hook-form` with Zod validation. Submit is disabled until all validation passes.

6. **`addPlayerFitness` mutation creates a fitness entry** — A mutation `players.mutations.addPlayerFitness` accepts `{ playerId: Id<"players">, date: number, weightKg?: number, bodyFatPercentage?: number, notes?: string }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the player belongs to the user's team, validates at least one data field is provided (throw `VALIDATION_ERROR` if all three optional fields are missing), inserts a new `playerFitness` document with `teamId`, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new entry `_id`.

7. **Success feedback after adding an entry** — After successful form submission: a success toast is shown ("Fitness entry added"), the dialog/sheet closes, and the new entry appears in the fitness table in real time (Convex subscription).

8. **Existing entries can be edited by admins and physio staff** — Admins or physio users can click an edit action (pencil icon or "Edit" in a dropdown menu) on any fitness row. This opens the same form pre-populated with the existing values. On submit, the `updatePlayerFitness` mutation is called. Users without admin/physio role do not see edit actions.

9. **`updatePlayerFitness` mutation updates an existing fitness entry** — A mutation `players.mutations.updatePlayerFitness` accepts `{ fitnessId: Id<"playerFitness">, date: number, weightKg?: number, bodyFatPercentage?: number, notes?: string }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the entry exists and belongs to the user's team, validates at least one data field is provided, patches the document with the new values and `updatedAt: Date.now()`. Returns the updated entry `_id`.

10. **Existing entries can be deleted by admins and physio staff** — Admins or physio users can click a delete action (trash icon or "Delete" in a dropdown menu) on any fitness row. A confirmation dialog appears ("Delete fitness entry from [date]? This action cannot be undone."). On confirm, the `deletePlayerFitness` mutation is called. Users without admin/physio role do not see delete actions.

11. **`deletePlayerFitness` mutation removes a fitness entry** — A mutation `players.mutations.deletePlayerFitness` accepts `{ fitnessId: Id<"playerFitness"> }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the entry exists and belongs to the user's team, deletes the document. The entry disappears from the table in real time.

12. **Players can view their own fitness data (read-only)** — When a player navigates to their own profile and clicks the "Fitness" tab, they see the fitness table (read-only, no add/edit/delete actions). The data is accessible because `getPlayerFitness` uses `requireAuth` (not `requireRole`), so any authenticated team member can read fitness data.

13. **Latest metrics summary display** — Above the fitness table, a summary section displays: latest recorded weight (with date), latest recorded body fat % (with date), total number of entries, and date range (earliest to most recent entry). If enough entries exist (3+), show the weight trend direction indicator (up/down/stable arrow comparing the last two weight entries). Computed from the query results on the frontend.

14. **Team-scoped data access enforced** — All queries and mutations filter/validate by `teamId` from `requireAuth`/`requireRole`. No cross-team fitness data access is possible. Access control is enforced at the Convex mutation/query layer, not just the UI.

15. **Real-time updates** — Because the fitness table uses Convex `useQuery`, fitness entries added, edited, or deleted by another admin/physio appear/update/disappear in real time for all connected clients without manual refresh.

## Tasks / Subtasks

- [x] **Task 1: Create `getPlayerFitness` query** (AC: #2, #14)
  - [x] 1.1: In `packages/backend/convex/players/queries.ts`, implement `getPlayerFitness` query: accepts `{ playerId: v.id("players") }`, calls `requireAuth(ctx)`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches the authenticated user's team (throw `NOT_FOUND` if not). Queries `playerFitness` table using the `by_playerId` index filtering by `playerId`. Sorts results by `date` descending. Returns the array of fitness entry objects.
  - [x] 1.2: Verify query returns an empty array (not `null`) when no fitness entries exist for the player.

- [x] **Task 2: Create `addPlayerFitness` mutation** (AC: #6, #14)
  - [x] 2.1: In `packages/backend/convex/players/mutations.ts`, implement `addPlayerFitness` mutation: accepts `{ playerId: v.id("players"), date: v.number(), weightKg: v.optional(v.number()), bodyFatPercentage: v.optional(v.number()), notes: v.optional(v.string()) }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches (throw `NOT_FOUND` if not). Validates at least one data field (`weightKg`, `bodyFatPercentage`, or `notes`) is provided (throw `VALIDATION_ERROR` with message "At least one data field (weight, body fat, or notes) is required"). Validates `weightKg` (if provided) is between 30 and 200 (throw `VALIDATION_ERROR`). Validates `bodyFatPercentage` (if provided) is between 1 and 60 (throw `VALIDATION_ERROR`). Validates `notes` (if provided) does not exceed 2000 characters (throw `VALIDATION_ERROR`). Inserts into `playerFitness` with `teamId`, `playerId`, `date`, optional fields, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new `_id`.

- [x]**Task 3: Create `updatePlayerFitness` mutation** (AC: #9, #14)
  - [x]3.1: In `packages/backend/convex/players/mutations.ts`, implement `updatePlayerFitness` mutation: accepts `{ fitnessId: v.id("playerFitness"), date: v.number(), weightKg: v.optional(v.number()), bodyFatPercentage: v.optional(v.number()), notes: v.optional(v.string()) }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the fitness entry via `ctx.db.get(fitnessId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Applies same field-level validations as `addPlayerFitness`. Patches the document with all provided fields plus `updatedAt: Date.now()`. Returns the `fitnessId`.

- [x]**Task 4: Create `deletePlayerFitness` mutation** (AC: #11, #14)
  - [x]4.1: In `packages/backend/convex/players/mutations.ts`, implement `deletePlayerFitness` mutation: accepts `{ fitnessId: v.id("playerFitness") }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the fitness entry via `ctx.db.get(fitnessId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Calls `ctx.db.delete(fitnessId)`.

- [x]**Task 5: Create Zod validation schema for fitness form** (AC: #5)
  - [x]5.1: Create a shared Zod schema for the fitness entry form (co-located with the `FitnessLog` component or in a shared location). Schema: `date: z.number({ required_error: "Date is required" })`, `weightKg: z.number().min(30, "Weight must be at least 30 kg").max(200, "Weight cannot exceed 200 kg").optional().or(z.literal("")).transform(v => v === "" ? undefined : v)`, `bodyFatPercentage: z.number().min(1, "Body fat must be at least 1%").max(60, "Body fat cannot exceed 60%").optional().or(z.literal("")).transform(v => v === "" ? undefined : v)`, `notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional()`. Add a `.refine()` to validate that at least one of `weightKg`, `bodyFatPercentage`, or `notes` is provided (error message: "At least one data field is required").

- [x]**Task 6: Build FitnessLog component** (AC: #1, #3, #4, #12, #13)
  - [x]6.1: Create `apps/web/src/components/players/FitnessLog.tsx`. Accepts `playerId: Id<"players">` and `canEdit: boolean` props.
  - [x]6.2: Call `useQuery(api.players.queries.getPlayerFitness, { playerId })`. Handle loading state with `Skeleton` components. Handle empty state with a centered message ("No fitness data recorded yet") and an icon (e.g., activity/heart icon).
  - [x]6.3: Render the latest metrics summary section above the table: a row of stat cards showing: "Latest Weight: {value} kg" (with date), "Latest Body Fat: {value}%" (with date), "Entries: {count}", "Date Range: {earliest} — {latest}". If 2+ weight entries exist, show a trend indicator arrow (up if latest weight > previous weight, down if less, stable/dash if equal). Compute using `useMemo`.
  - [x]6.4: Render the data table with columns: Date (formatted via `date-fns` `format(new Date(date), "dd MMM yyyy")`), Weight (formatted as `{value} kg` with 1 decimal, or "—" if null), Body Fat (formatted as `{value}%` with 1 decimal, or "—" if null), Notes (truncated with ellipsis, full text in a `Tooltip`). If `canEdit` is true, add an Actions column.
  - [x]6.5: The Actions column renders a `DropdownMenu` with "Edit" and "Delete" options for each row (admin/physio only).
  - [x]6.6: If `canEdit`, render an "Add Entry" button above the table (aligned right, next to or above the summary section).

- [x]**Task 7: Build FitnessFormDialog component** (AC: #5, #7, #8)
  - [x]7.1: Create `apps/web/src/components/players/FitnessFormDialog.tsx`. Accepts props: `playerId: Id<"players">`, `existingEntry?: PlayerFitness` (for edit mode), `open: boolean`, `onClose: () => void`.
  - [x]7.2: Use `react-hook-form` with `zodResolver` and the Zod schema from Task 5. In edit mode, pre-populate `defaultValues` from `existingEntry`. In create mode, default `date` to today's timestamp and leave optional fields empty.
  - [x]7.3: Render the form inside a shadcn `Dialog` (or `Sheet`) with title "Add Fitness Entry" (create mode) or "Edit Fitness Entry" (edit mode).
  - [x]7.4: Form fields: Date picker for `date` (using `react-day-picker` calendar inside a `Popover`, matching existing date picker patterns from Story 5.3), `Input` (type=number, step=0.1) for weight (kg), `Input` (type=number, step=0.1) for body fat (%), `Textarea` for notes/test results. Display inline validation errors below each field. Show helper text: "At least one measurement or note is required."
  - [x]7.5: Submit button calls `addPlayerFitness` mutation (create mode) or `updatePlayerFitness` mutation (edit mode). On success: show toast ("Fitness entry added" or "Fitness entry updated"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [x]7.6: "Cancel" button closes the dialog without saving.

- [x]**Task 8: Build DeleteFitnessDialog component** (AC: #10)
  - [x]8.1: Create `apps/web/src/components/players/DeleteFitnessDialog.tsx`. Accepts props: `fitnessId: Id<"playerFitness">`, `date: number`, `open: boolean`, `onClose: () => void`.
  - [x]8.2: Render a shadcn `AlertDialog` with title "Delete Fitness Entry" and description "Delete fitness entry from {formatted date}? This action cannot be undone."
  - [x]8.3: "Delete" button (destructive variant) calls `deletePlayerFitness` mutation. On success: show toast ("Fitness entry deleted"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [x]8.4: "Cancel" button closes the dialog.

- [x]**Task 9: Integrate FitnessLog into the Player Profile page** (AC: #1)
  - [x]9.1: In `apps/web/src/components/players/PlayerProfileTabs.tsx` (or wherever the "Fitness" tab content is rendered), replace the placeholder content with the `FitnessLog` component. Pass `playerId` from the profile context and `canEdit` derived from the current user's role (check `user.role === "admin" || user.role === "physio"` from the current user query or from `tabAccess` data).
  - [x]9.2: Ensure the Fitness tab correctly receives the player ID from the parent page component and passes it down.

- [x]**Task 10: Write backend unit tests** (AC: #2, #6, #9, #11, #14)
  - [x]10.1: Create `packages/backend/convex/players/__tests__/fitness.test.ts` using `@convex-dev/test` + `vitest`.
  - [x]10.2: Test `getPlayerFitness`: (a) returns all fitness entries for a player within the same team sorted by date descending, (b) returns empty array when no entries exist, (c) does not return entries for a player from a different team (throws or returns empty), (d) unauthenticated user throws error.
  - [x]10.3: Test `addPlayerFitness`: (a) admin can add fitness entry for a player on their team, returns a valid ID, (b) physio can add fitness entry for a player on their team, returns a valid ID, (c) non-admin/non-physio user (e.g., coach) gets `NOT_AUTHORIZED` error, (d) adding entry for a player on a different team throws `NOT_FOUND`, (e) all three optional fields missing throws `VALIDATION_ERROR` ("At least one data field is required"), (f) `weightKg` < 30 throws `VALIDATION_ERROR`, (g) `weightKg` > 200 throws `VALIDATION_ERROR`, (h) `bodyFatPercentage` < 1 throws `VALIDATION_ERROR`, (i) `bodyFatPercentage` > 60 throws `VALIDATION_ERROR`, (j) `notes` exceeding 2000 chars throws `VALIDATION_ERROR`, (k) entry with only `notes` (no weight/bodyFat) succeeds, (l) created entry has correct `createdBy`, `createdAt`, `teamId` fields.
  - [x]10.4: Test `updatePlayerFitness`: (a) admin can update an existing fitness entry, (b) physio can update an existing fitness entry, (c) non-admin/non-physio user gets `NOT_AUTHORIZED` error, (d) updating an entry from a different team throws `NOT_FOUND`, (e) `updatedAt` is refreshed on update, (f) all fields are updated correctly, (g) non-existent fitnessId throws `NOT_FOUND`, (h) removing all optional data fields throws `VALIDATION_ERROR`.
  - [x]10.5: Test `deletePlayerFitness`: (a) admin can delete a fitness entry, (b) physio can delete a fitness entry, (c) non-admin/non-physio user gets `NOT_AUTHORIZED` error, (d) deleting an entry from a different team throws `NOT_FOUND`, (e) deleted entry no longer appears in `getPlayerFitness` results, (f) non-existent fitnessId throws `NOT_FOUND`.

- [x]**Task 11: Final validation** (AC: all)
  - [x]11.1: Run `pnpm typecheck` — must pass with zero errors.
  - [x]11.2: Run `pnpm lint` — must pass with zero errors.
  - [x]11.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [x]11.4: Start the dev server — navigate to `/players/[playerId]`, click the "Fitness" tab. Verify the empty state is displayed ("No fitness data recorded yet").
  - [x]11.5: As admin, verify the "Add Entry" button is visible. Click it — verify the form dialog opens with all fields and correct defaults.
  - [x]11.6: Submit the form with valid data (e.g., weight=82.5, bodyFat=12.3, notes="Pre-season fitness test") — verify the entry appears in the fitness table, sorted correctly. Verify the success toast appears.
  - [x]11.7: Add a second entry with different weight — verify the summary section shows the latest weight, entry count updates, and the trend indicator arrow appears.
  - [x]11.8: Submit a form with only notes (no weight, no body fat) — verify it succeeds.
  - [x]11.9: Submit a form with no data fields (only date) — verify validation error ("At least one data field is required").
  - [x]11.10: Click edit on a fitness row — verify the form pre-populates with existing values. Update a field and submit — verify the table updates in real time.
  - [x]11.11: Click delete on a fitness row — verify the confirmation dialog appears. Confirm — verify the entry disappears from the table.
  - [x]11.12: Log in as a physio user — navigate to a player's Fitness tab. Verify the "Add Entry" button is visible and functional (physio has write access).
  - [x]11.13: Log in as a non-admin/non-physio user (e.g., coach) — navigate to a player's Fitness tab. Verify fitness data is visible (read-only) but add/edit/delete actions are NOT visible.
  - [x]11.14: Log in as a player — navigate to own profile Fitness tab. Verify data is visible (read-only), no edit actions shown.
  - [x]11.15: Verify real-time updates: open two browser tabs, add a fitness entry in one tab — verify it appears in the other tab without refresh.
  - [x]11.16: Test form validation: enter weight < 30 — verify validation error. Enter body fat > 60 — verify validation error. Enter notes exceeding 2000 chars — verify validation error.

## Dev Notes

### Architecture Context

This is the **physical & fitness data CRUD story for Epic 5**. It builds directly on Story 5.1 (which defines the `playerFitness` table schema and the "Fitness" tab placeholder) and follows the exact same CRUD pattern established in Story 5.3 (Performance Stats Log). The key difference is **role access**: both admins AND physio/medical staff can write fitness data (not admin-only like performance stats).

This story directly implements:

- **FR23:** Admin or medical staff can enter physical/fitness data entries for a player (date, weight, body fat %, notes)
- **FR31:** Players can view their own profile (bio, stats, fitness data, contract) — the fitness portion
- **NFR2:** Real-time updates propagate via Convex subscriptions (entries appear/update/disappear for all connected clients)
- **NFR5:** Data access enforced at the Convex mutation layer (`requireRole(ctx, ["admin", "physio"])` for all write operations)
- **NFR6:** Multi-tenant isolation via `teamId` scoping on `playerFitness` table

Subsequent stories that build on or relate to this:

- **Story 5.5 (Injury History):** Follows the same CRUD pattern but with medical-only role restriction and additional status management
- **Story 5.6 (Player Status Management & Self-Service):** Players viewing their own fitness data is established here (read-only access)

### Key Architectural Decisions from architecture.md

- **Authorization Pattern:** `requireAuth(ctx)` returns `{ user, teamId }` for read operations (any authenticated team member can view fitness data). `requireRole(ctx, ["admin", "physio"])` for write operations (admins and physio/medical staff can add/edit/delete entries). Every mutation starts with the appropriate auth check. No middleware — explicit function calls. [Source: architecture.md#Authentication-&-Security]

- **RBAC Model:** Single role enum on user record: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. Admins and physio users can write fitness data. All authenticated team members can read it. [Source: architecture.md#Authentication-&-Security]

- **Multi-tenant Isolation:** Every table includes `teamId`. Every query/mutation filters by the authenticated user's team. Enforced at the auth helper level. [Source: architecture.md#Authentication-&-Security]

- **Data Model:** `playerFitness` table is a separate table (not an array on `players`) because each entry has independent lifecycle, metadata (`createdBy`, `createdAt`), and needs to be queried by `playerId`. [Source: architecture.md#Data-Architecture]

- **Form Pattern:** `react-hook-form` + Zod schema + `zodResolver` + `useMutation`. [Source: architecture.md#Process-Patterns]

- **Error Handling:** `ConvexError` with standardized codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

- **Dates:** Stored as Unix timestamp ms (`number`) in Convex. Displayed using `date-fns` formatting (e.g., `format(new Date(date), "dd MMM yyyy")`). Never stored as strings. [Source: architecture.md#Format-Patterns]

- **Loading States:** Convex `useQuery` returns `undefined` while loading — render `Skeleton` components. Empty array renders empty state. [Source: architecture.md#Process-Patterns]

- **Component Organization:** Feature-grouped at `components/players/`. [Source: architecture.md#Structure-Patterns]

- **Convex Organization:** `convex/players/queries.ts` for reads, `convex/players/mutations.ts` for writes. Tests co-located in `convex/players/__tests__/`. [Source: architecture.md#Structure-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 5.4) state:

> **Given** the user has admin or medical/physio role
> **When** they view a player's profile and navigate to the "Fitness" tab
> **Then** they can click "Add Entry" and fill in: date, weight (kg), body fat (%), notes/test results
> **When** the entry is submitted
> **Then** it appears in a chronological log sorted by most recent first
> **And** existing entries can be edited or deleted
> **And** players can view their own fitness data (read-only) from their profile

**This story extends and decomposes the AC as follows:**

- **Latest metrics summary section:** Not in the original AC but adds significant value — physio and coaching staff can see at-a-glance latest weight, body fat %, and trend direction without scrolling through the table. Computed on the frontend from query results (no separate backend endpoint needed).
- **"At least one field" validation:** The original AC lists all fields together. This story clarifies that weight, body fat, and notes are all optional individually but at least one must be provided per entry. This prevents empty entries that carry no information.
- **Field validation ranges:** The original AC doesn't specify ranges. This story adds: `weightKg` 30-200 (reasonable range for professional footballers), `bodyFatPercentage` 1-60 (practical range), `notes` max 2000 chars. Validated both client-side (Zod) and server-side (mutation).
- **Delete confirmation dialog:** Not in the original AC but a standard UX pattern to prevent accidental data loss. Follows destructive action best practices.
- **Read-only access for all team members:** The original AC says players can view their own fitness data. This story extends to allow all authenticated team members (coaches, analysts, etc.) to view fitness data for any player on their team. This aligns with coaching/analytics needs and is consistent with how performance stats work (Story 5.3).
- **`createdBy` tracking:** Each entry records which user created it, enabling audit trail visibility. Defined in the schema (Story 5.1) but utilized and enforced here.
- **Decimal support for weight/body fat:** The original AC says "weight (kg)" and "body fat (%)". This story explicitly supports 1 decimal place precision (e.g., 82.5 kg, 12.3%) which is standard in professional sports fitness tracking.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `playerFitness` table defined in schema | Story 5.1 | `packages/backend/convex/table/playerFitness.ts` must exist with all fields and indexes (`by_playerId`, `by_teamId`) |
| `players` table defined in schema | Story 5.1 | `packages/backend/convex/table/players.ts` must exist |
| `getPlayerById` query | Story 5.1 | `packages/backend/convex/players/queries.ts` must export `getPlayerById` |
| `getPlayerTabAccess` query | Story 5.1 | Must exist to determine if user is admin/physio for conditional UI rendering |
| Player profile page at `/players/[playerId]` | Story 5.1 | `apps/web/src/app/(app)/players/[playerId]/page.tsx` must exist with tabbed layout |
| `PlayerProfileTabs` component with "Fitness" tab placeholder | Story 5.1 | Must exist and render tab shell |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export these |
| shadcn/ui components: Dialog, AlertDialog, Table, Button, Input, Textarea, Form, Popover, DropdownMenu, Badge, Card, Tooltip | Story 1.2 | All must be available in `components/ui/` |
| StatsLog pattern reference | Story 5.3 | Story 5.3 establishes the CRUD + table + form dialog pattern. While not a hard blocker, following its implementation patterns ensures UI consistency. |
| `react-day-picker` (date picker) | Template | Already installed (v9.13.0) |
| `date-fns` (date formatting) | Template | Already installed (v4.1.0) |

### Current State (Baseline)

**`convex/table/playerFitness.ts`:** Exists from Story 5.1. Defines the `playerFitness` table with fields: `teamId`, `playerId`, `date`, `weightKg` (optional), `bodyFatPercentage` (optional), `notes` (optional), `createdBy`, `createdAt`, `updatedAt`. Indexes: `by_playerId`, `by_teamId`.

**`convex/players/queries.ts`:** Exists from Story 5.1 with `getPlayers`, `getPlayerById`, `getPlayerTabAccess` queries. Likely also has `getPlayerStats` from Story 5.3. **No `getPlayerFitness` query** — must be added.

**`convex/players/mutations.ts`:** Exists from Story 5.2 with player-related mutations and from Story 5.3 with `addPlayerStats`, `updatePlayerStats`, `deletePlayerStats`. **No fitness-related mutations** — must be added.

**`apps/web/src/components/players/FitnessLog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/FitnessFormDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/DeleteFitnessDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/PlayerProfileTabs.tsx`:** Exists from Story 5.1. The "Fitness" tab currently renders a placeholder ("Coming soon"). Must be updated to render `FitnessLog`.

**Auth utilities:** `requireAuth(ctx)` and `requireRole(ctx, roles)` exist in `packages/backend/convex/lib/auth.ts` from Story 2.1. `requireRole(ctx, ["admin"])` is used in Stories 5.2/5.3. `requireRole(ctx, ["admin", "physio"])` is used for the first time in this story.

**UI components available:** `Dialog`, `AlertDialog`, `Table`, `Button`, `Input`, `Textarea`, `Form`, `Popover`, `DropdownMenu`, `Badge`, `Card`, `Skeleton`, `Spinner`, `Tooltip` — all present in `components/ui/`.

### Existing Patterns to Follow

**Fitness CRUD follows the same pattern as Story 5.3 (Performance Stats), with role changes:**

```typescript
// Query pattern (read):
export const getPlayerFitness = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx)
    const player = await ctx.db.get(playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    const entries = await ctx.db
      .query("playerFitness")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect()

    // Sort by date descending (most recent first)
    return entries.sort((a, b) => b.date - a.date)
  },
})
```

```typescript
// Mutation pattern (write — note ["admin", "physio"] role access):
export const addPlayerFitness = mutation({
  args: {
    playerId: v.id("players"),
    date: v.number(),
    weightKg: v.optional(v.number()),
    bodyFatPercentage: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"])
    const player = await ctx.db.get(args.playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    // Validate at least one data field
    if (args.weightKg === undefined && args.bodyFatPercentage === undefined && !args.notes) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "At least one data field (weight, body fat, or notes) is required",
      })
    }

    // Validate ranges
    if (args.weightKg !== undefined && (args.weightKg < 30 || args.weightKg > 200)) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Weight must be between 30 and 200 kg" })
    }
    if (args.bodyFatPercentage !== undefined && (args.bodyFatPercentage < 1 || args.bodyFatPercentage > 60)) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Body fat must be between 1% and 60%" })
    }
    if (args.notes !== undefined && args.notes.length > 2000) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Notes cannot exceed 2000 characters" })
    }

    return await ctx.db.insert("playerFitness", {
      teamId,
      playerId: args.playerId,
      date: args.date,
      weightKg: args.weightKg,
      bodyFatPercentage: args.bodyFatPercentage,
      notes: args.notes,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

**Form Dialog Pattern (matching Story 5.3 StatsFormDialog):**

```typescript
const form = useForm<FitnessFormData>({
  resolver: zodResolver(fitnessSchema),
  defaultValues: existingEntry
    ? {
        date: existingEntry.date,
        weightKg: existingEntry.weightKg,
        bodyFatPercentage: existingEntry.bodyFatPercentage,
        notes: existingEntry.notes ?? "",
      }
    : {
        date: Date.now(),
        weightKg: undefined,
        bodyFatPercentage: undefined,
        notes: "",
      },
})

const addFitness = useMutation(api.players.mutations.addPlayerFitness)
const updateFitness = useMutation(api.players.mutations.updatePlayerFitness)

const onSubmit = async (data: FitnessFormData) => {
  try {
    if (existingEntry) {
      await updateFitness({ fitnessId: existingEntry._id, ...data })
      toast.success("Fitness entry updated")
    } else {
      await addFitness({ playerId, ...data })
      toast.success("Fitness entry added")
    }
    onClose()
  } catch (error) {
    if (error instanceof ConvexError) {
      toast.error(error.data.message)
    }
  }
}
```

**Latest Metrics Summary Computation:**

```typescript
const latestMetrics = useMemo(() => {
  if (!entries || entries.length === 0) return null

  const withWeight = entries.filter((e) => e.weightKg !== undefined)
  const withBodyFat = entries.filter((e) => e.bodyFatPercentage !== undefined)

  const latestWeight = withWeight.length > 0 ? withWeight[0] : null
  const latestBodyFat = withBodyFat.length > 0 ? withBodyFat[0] : null

  // Weight trend: compare last two weight entries
  let weightTrend: "up" | "down" | "stable" | null = null
  if (withWeight.length >= 2) {
    const diff = withWeight[0].weightKg! - withWeight[1].weightKg!
    weightTrend = diff > 0 ? "up" : diff < 0 ? "down" : "stable"
  }

  return {
    latestWeight: latestWeight ? { value: latestWeight.weightKg!, date: latestWeight.date } : null,
    latestBodyFat: latestBodyFat ? { value: latestBodyFat.bodyFatPercentage!, date: latestBodyFat.date } : null,
    totalEntries: entries.length,
    dateRange: { earliest: entries[entries.length - 1].date, latest: entries[0].date },
    weightTrend,
  }
}, [entries])
```

**Date Picker Pattern (same as Story 5.3):**

```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
      <CalendarIcon className="mr-2 h-4 w-4" />
      {field.value ? format(new Date(field.value), "dd MMM yyyy") : "Pick a date"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={field.value ? new Date(field.value) : undefined}
      onSelect={(date) => field.onChange(date?.getTime())}
      initialFocus
    />
  </PopoverContent>
</Popover>
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/players/queries.ts` | Modified | Add `getPlayerFitness` query |
| `packages/backend/convex/players/mutations.ts` | Modified | Add `addPlayerFitness`, `updatePlayerFitness`, `deletePlayerFitness` mutations |
| `apps/web/src/components/players/FitnessLog.tsx` | Created | Fitness data table + latest metrics summary section |
| `apps/web/src/components/players/FitnessFormDialog.tsx` | Created | Add/edit fitness entry form in a dialog |
| `apps/web/src/components/players/DeleteFitnessDialog.tsx` | Created | Confirmation dialog for fitness entry deletion |
| `apps/web/src/components/players/PlayerProfileTabs.tsx` | Modified | Replace "Fitness" tab placeholder with `FitnessLog` component |
| `packages/backend/convex/players/__tests__/fitness.test.ts` | Created | Unit tests for fitness queries and mutations |

### What This Story Does NOT Include

- **No fitness charts or graphs** — only the table and latest metrics summary (trend visualization via charts can be a future enhancement)
- **No batch import of fitness data** — only manual per-entry via form
- **No fitness data export (CSV/PDF)** — out of Sprint 1 scope
- **No fitness data comparison between players** — single player view only
- **No automatic fitness data import from wearables/devices** — that's post-Sprint 1 (requires Story 5.7 external provider integrations)
- **No injury data** — that's Story 5.5
- **No performance stats** — that's Story 5.3
- **No coach/analyst write access** — only admins and physio can add/edit/delete in Sprint 1. Role expansion can be considered in future sprints.
- **No BMI calculation** — while weight and height data are both available, automatic BMI is not in scope. Can be added as a computed field later.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 5.1 not complete (no `playerFitness` schema, no player profile page) | This story is fully blocked until Story 5.1 is done. Check for `convex/table/playerFitness.ts` and `app/(app)/players/[playerId]/page.tsx` before starting. |
| Story 5.3 not complete (no CRUD pattern reference) | Story 5.3 is not a hard blocker but establishes the UI pattern. If 5.3 is not done, build the same pattern independently following the architecture.md conventions. |
| `requireRole(ctx, ["admin", "physio"])` not tested with multiple roles | Verify that the `requireRole` helper in `convex/lib/auth.ts` correctly handles an array of allowed roles (any-of semantics). This is the first story to require multi-role write access. |
| Number input precision for decimals (0.1 step) | HTML number inputs with `step=0.1` can have floating-point precision issues. Use `Math.round(value * 10) / 10` to normalize to 1 decimal before sending to the mutation. Alternatively, handle in the Zod transform. |
| Optional field handling in Convex mutations | Convex `v.optional()` fields can be `undefined`. Ensure the mutation correctly handles the distinction between "field not provided" and "field explicitly set to undefined". Use `args.weightKg !== undefined` checks (not falsy checks, since 0 could be a valid value for body fat). |
| Empty string vs undefined for optional number fields in forms | HTML number inputs return empty string `""` when cleared. The Zod schema must transform `""` to `undefined` before sending to the mutation. Use `.or(z.literal("")).transform(...)` or `z.coerce.number().optional()` pattern. |

### Performance Considerations

- **Index usage:** `by_playerId` index on `playerFitness` ensures fast lookup per player. No full table scan needed.
- **Sorting:** In-memory sort by `date` descending is O(n log n) but n is small (typical: 50-100 entries per player per season for weekly measurements).
- **Summary computation:** Frontend `useMemo` for latest metrics is O(n) single pass. Negligible cost for typical dataset sizes.
- **Real-time updates:** Convex subscription on `getPlayerFitness` triggers re-render only when that player's fitness data changes. No unnecessary updates from other players' data.

### Alignment with Architecture Document

- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireAuth` for reads, `requireRole(ctx, ["admin", "physio"])` for writes, `teamId` scoping
- **Data Model:** Matches `architecture.md § Data Architecture` — `playerFitness` as a separate table (Story 5.1 defined schema, this story adds CRUD)
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — `FitnessLog.tsx` in `components/players/`, profile page at `app/(app)/players/[playerId]/page.tsx`
- **Convex Organization:** Matches `architecture.md § Convex Function Organization` — queries in `convex/players/queries.ts`, mutations in `convex/players/mutations.ts`
- **Naming:** Matches `architecture.md § Naming Patterns` — camelCase Convex functions (`getPlayerFitness`, `addPlayerFitness`), PascalCase components (`FitnessLog.tsx`, `FitnessFormDialog.tsx`)
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/players/__tests__/`
- **Dates:** Matches `architecture.md § Format Patterns` — timestamps as numbers, `date-fns` for display
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with `NOT_FOUND`, `NOT_AUTHORIZED`, `VALIDATION_ERROR` codes
- **Form Pattern:** Matches `architecture.md § Process Patterns` — `react-hook-form` + `zodResolver` + `useMutation` + `toast`
- **Loading States:** Matches `architecture.md § Process Patterns` — `Skeleton` for loading, empty state for no data
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, RBAC model (6 roles), teamId scoping
- [Source: architecture.md#Data-Architecture] — Separate `playerFitness` table for data with metadata and independent lifecycle
- [Source: architecture.md#Frontend-Architecture] — Page structure (`app/(app)/players/[playerId]/page.tsx`), component organization (`components/players/`), state management (useQuery)
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, error handling, no REST
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting, ConvexError codes, mutation feedback via toast
- [Source: architecture.md#Process-Patterns] — Form pattern (react-hook-form + Zod + zodResolver), loading states, mutation feedback
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: epics.md#Story-5.4] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR23 mapped to Epic 5
- [Source: Story-5.1] — `playerFitness` table schema definition, `PlayerProfileTabs` component with placeholder tabs, `getPlayerTabAccess` query
- [Source: Story-5.3] — Performance Stats CRUD pattern reference (identical CRUD pattern, admin-only role access)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed Zod v4 schema: `required_error` → `message`, removed `z.union([z.number(), z.literal("")])` pattern (incompatible with react-hook-form v5 resolver types). Used simple `z.number().optional()` with undefined conversion in onChange handlers instead.
- Pre-existing lint errors in `apps/native/` — not related to this story.

### Completion Notes List

- All 30 fitness backend tests pass (getPlayerFitness: 4, addPlayerFitness: 12, updatePlayerFitness: 8, deletePlayerFitness: 6)
- Full backend suite: 373 tests pass across 19 files (no regressions)
- Web typecheck: 0 errors
- Fitness validation helper extracted into `validateFitnessFields()` for reuse in add/update mutations
- `canEditFitness` prop added to PlayerProfileTabs to support admin || physio write access (distinct from `isAdmin` which is admin-only for performance stats)
- Summary section uses `useMemo` for weight trend computation (AC #13), triggers at 2+ weight entries per story spec
- Notes truncation at 60 chars with Tooltip for full text (AC #3)

### File List

| File | Change Type |
|------|-------------|
| `packages/backend/convex/players/queries.ts` | Modified — added `getPlayerFitness` query |
| `packages/backend/convex/players/mutations.ts` | Modified — added `addPlayerFitness`, `updatePlayerFitness`, `deletePlayerFitness` mutations + `validateFitnessFields` helper |
| `apps/web/src/components/players/fitnessFormSchema.ts` | Created — Zod validation schema for fitness form |
| `apps/web/src/components/players/FitnessLog.tsx` | Created — fitness data table + latest metrics summary |
| `apps/web/src/components/players/FitnessFormDialog.tsx` | Created — add/edit fitness entry form dialog |
| `apps/web/src/components/players/DeleteFitnessDialog.tsx` | Created — confirmation dialog for deletion |
| `apps/web/src/components/players/PlayerProfileTabs.tsx` | Modified — replaced Fitness placeholder with FitnessLog, added `canEditFitness` prop |
| `apps/web/src/app/(app)/players/[playerId]/page.tsx` | Modified — passes `canEditFitness` prop to PlayerProfileTabs |
| `packages/backend/convex/players/__tests__/fitness.test.ts` | Created — 30 unit tests for fitness CRUD |
