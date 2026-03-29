# Story 5.5: Injury History (Medical Staff Only)

Status: done
Sprint: 2
Epic: 8 (Injury Reporting)
Note: This story provides the foundation for Epic 8. Stories 8.1–8.4 extend this with clinical classification, timeline tracking, color-coded statuses, and a medical dashboard.
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a medical staff member,
I want to log and track player injuries with full history,
so that the medical team has a complete record of each player's injury history and non-medical staff see only a status indicator.

## Acceptance Criteria

1. **"Injuries" tab on the player profile is visible only to medical/admin roles** — When an authenticated user with `physio` or `admin` role navigates to `/players/[playerId]`, the "Injuries" tab is visible and functional (replacing the "Coming soon" placeholder from Story 5.1). Users with any other role (`coach`, `analyst`, `player`, `staff`) do NOT see the "Injuries" tab at all. Tab visibility is controlled by `getPlayerTabAccess` (which returns `showInjuries: true` for `admin`/`physio` roles).

2. **`getPlayerInjuries` query returns injury entries for medical/admin users only** — A query `players.queries.getPlayerInjuries` accepts `{ playerId: Id<"players"> }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the player belongs to the authenticated user's team, and returns an array of `playerInjuries` documents for that player sorted by `date` descending (most recent first). Each entry includes: `_id`, `date`, `injuryType`, `severity`, `estimatedRecovery`, `notes`, `status`, `clearanceDate`, `createdBy`, `createdAt`, `updatedAt`. Returns an empty array if no entries exist. Non-medical users calling this query receive a `NOT_AUTHORIZED` error.

3. **Injury log displays as a data table** — The Injuries tab renders a table (using shadcn `Table` or TanStack React Table) with columns: Date (formatted with `date-fns`, e.g. "15 Mar 2026"), Injury Type (string), Severity (badge — `minor` = yellow, `moderate` = orange, `severe` = red), Status (badge — `current` = red, `recovered` = green), Est. Recovery (string or "—" if null), Clearance Date (formatted date or "—" if null), and an Actions column. The table is sorted by most recent date first. An empty state is shown when no entries exist ("No injury records").

4. **"Log Injury" button visible to admin and physio users** — An "Log Injury" button is displayed above the injury table. Clicking the button opens a dialog/sheet with the injury entry form.

5. **Injury entry form validates and submits correctly** — The "Log Injury" form contains fields: date (required — date picker, defaults to today), injury type (required — text input, max 200 characters, e.g. "Hamstring strain", "ACL tear", "Ankle sprain"), severity (required — select with options: "Minor", "Moderate", "Severe"), estimated recovery time (optional — text input, max 200 characters, e.g. "4-6 weeks", "3 months"), notes (optional — textarea, max 2000 characters, for clinical details). The form uses `react-hook-form` with Zod validation. Submit is disabled until all required validation passes.

6. **`logInjury` mutation creates an injury entry** — A mutation `players.mutations.logInjury` accepts `{ playerId: Id<"players">, date: number, injuryType: string, severity: string, estimatedRecovery?: string, notes?: string }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the player belongs to the user's team, validates `severity` is one of `"minor"`, `"moderate"`, `"severe"` (throw `VALIDATION_ERROR` if not), validates `injuryType` is non-empty and ≤ 200 characters, validates `estimatedRecovery` ≤ 200 characters if provided, validates `notes` ≤ 2000 characters if provided. Inserts a new `playerInjuries` document with `teamId`, `playerId`, all fields, `status: "current"`, `clearanceDate: undefined`, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new entry `_id`.

7. **Success feedback after logging an injury** — After successful form submission: a success toast is shown ("Injury logged"), the dialog/sheet closes, and the new entry appears in the injury table in real time (Convex subscription).

8. **Existing injuries can be updated by medical/admin staff** — Medical/admin users can click an edit action (pencil icon or "Edit" in a dropdown menu) on any injury row. This opens the edit form pre-populated with existing values, with additional fields available during editing: status (select — "Current" / "Recovered"), clearance date (optional date picker — enabled only when status is "Recovered"), rehab notes (appended to existing notes). On submit, the `updateInjury` mutation is called.

9. **`updateInjury` mutation updates an existing injury entry** — A mutation `players.mutations.updateInjury` accepts `{ injuryId: Id<"playerInjuries">, date: number, injuryType: string, severity: string, estimatedRecovery?: string, notes?: string, status: string, clearanceDate?: number }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the entry exists and belongs to the user's team, validates `severity` is one of the allowed values, validates `status` is one of `"current"`, `"recovered"` (throw `VALIDATION_ERROR` if not), validates that if `status` is `"recovered"` and `clearanceDate` is provided it is a valid timestamp, validates field length limits. Patches the document with all provided fields plus `updatedAt: Date.now()`. Returns the `injuryId`.

10. **Existing injuries can be deleted by medical/admin staff** — Medical/admin users can click a delete action (trash icon or "Delete" in a dropdown menu) on any injury row. A confirmation dialog appears ("Delete injury record from [date]? This action cannot be undone."). On confirm, the `deleteInjury` mutation is called.

11. **`deleteInjury` mutation removes an injury entry** — A mutation `players.mutations.deleteInjury` accepts `{ injuryId: Id<"playerInjuries"> }`, calls `requireRole(ctx, ["admin", "physio"])`, validates the entry exists and belongs to the user's team, deletes the document. The entry disappears from the table in real time.

12. **Non-medical users see only a status indicator on the player list** — A query `players.queries.getPlayerInjuryStatus` accepts `{ playerId: Id<"players"> }`, calls `requireAuth(ctx)` (NOT `requireRole` — any authenticated user can call it), validates team match, and returns `{ hasCurrentInjury: boolean }` — `true` if any `playerInjuries` entry with `status: "current"` exists for this player, `false` otherwise. This query does NOT return any injury details (no type, severity, notes, etc.). The `PlayerTable` component on the `/players` page and the `PlayerProfileHeader` component display a small injury indicator icon (e.g., a red medical cross or bandage icon from Lucide) when `hasCurrentInjury` is `true`. Non-medical users can see the indicator but cannot access injury details.

13. **Current injury summary displayed above the injury table** — Above the injury table, a summary section displays: count of current injuries, count of recovered injuries, total injury records, and a list of current injuries showing injury type and date. Computed from the query results on the frontend.

14. **Team-scoped data access enforced** — All queries and mutations filter/validate by `teamId` from `requireAuth`/`requireRole`. No cross-team injury data access is possible. Access control is enforced at the Convex mutation/query layer, not just the UI.

15. **Medical role enforcement at data layer** — Injury detail data (type, severity, notes, recovery timeline) is NEVER returned by any Convex query to non-medical users. The `getPlayerInjuries` query enforces `requireRole(ctx, ["admin", "physio"])`. The `getPlayerInjuryStatus` query returns ONLY a boolean flag, not injury details. This satisfies NFR7 (Medical/injury data accessible only to users with medical staff role).

16. **Real-time updates** — Because the injury table uses Convex `useQuery`, injuries logged, updated, or deleted by another medical staff member appear/update/disappear in real time for all connected clients without manual refresh. The injury status indicator on the player list also updates in real time.

## Tasks / Subtasks

- [x] **Task 1: Create `getPlayerInjuries` query** (AC: #2, #14, #15)
  - [x] 1.1: In `packages/backend/convex/players/queries.ts`, implement `getPlayerInjuries` query: accepts `{ playerId: v.id("players") }`, calls `requireRole(ctx, ["admin", "physio"])`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches the authenticated user's team (throw `NOT_FOUND` if not). Queries `playerInjuries` table using the `by_playerId` index filtering by `playerId`. Sorts results by `date` descending. Returns the array of injury entry objects.
  - [x] 1.2: Verify query returns an empty array (not `null`) when no injury entries exist for the player.
  - [x] 1.3: Verify query throws `NOT_AUTHORIZED` when called by a non-admin/non-physio user.

- [x] **Task 2: Create `getPlayerInjuryStatus` query** (AC: #12, #14, #15)
  - [x] 2.1: In `packages/backend/convex/players/queries.ts`, implement `getPlayerInjuryStatus` query: accepts `{ playerId: v.id("players") }`, calls `requireAuth(ctx)` (any authenticated user). Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches (throw `NOT_FOUND` if not). Queries `playerInjuries` using `by_playerId` index. Checks if any entry has `status === "current"`. Returns `{ hasCurrentInjury: boolean }`.
  - [x] 2.2: This query MUST NOT return any injury detail fields — only the boolean flag. This is the boundary between medical and non-medical data access.

- [x] **Task 3: Create `logInjury` mutation** (AC: #6, #14, #15)
  - [x] 3.1: In `packages/backend/convex/players/mutations.ts`, implement `logInjury` mutation: accepts `{ playerId: v.id("players"), date: v.number(), injuryType: v.string(), severity: v.string(), estimatedRecovery: v.optional(v.string()), notes: v.optional(v.string()) }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches (throw `NOT_FOUND` if not). Validates `severity` is one of `"minor"`, `"moderate"`, `"severe"` (throw `VALIDATION_ERROR` with message "Severity must be minor, moderate, or severe"). Validates `injuryType` is non-empty and ≤ 200 chars. Validates `estimatedRecovery` ≤ 200 chars if provided. Validates `notes` ≤ 2000 chars if provided. Inserts into `playerInjuries` with `teamId`, `playerId`, all fields, `status: "current"`, `clearanceDate: undefined`, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new `_id`.

- [x] **Task 4: Create `updateInjury` mutation** (AC: #9, #14, #15)
  - [x] 4.1: In `packages/backend/convex/players/mutations.ts`, implement `updateInjury` mutation: accepts `{ injuryId: v.id("playerInjuries"), date: v.number(), injuryType: v.string(), severity: v.string(), estimatedRecovery: v.optional(v.string()), notes: v.optional(v.string()), status: v.string(), clearanceDate: v.optional(v.number()) }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the injury entry via `ctx.db.get(injuryId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Validates `severity` is one of `"minor"`, `"moderate"`, `"severe"`. Validates `status` is one of `"current"`, `"recovered"` (throw `VALIDATION_ERROR` if not). Validates field length limits. Patches the document with all provided fields plus `updatedAt: Date.now()`. Returns the `injuryId`.

- [x] **Task 5: Create `deleteInjury` mutation** (AC: #11, #14, #15)
  - [x] 5.1: In `packages/backend/convex/players/mutations.ts`, implement `deleteInjury` mutation: accepts `{ injuryId: v.id("playerInjuries") }`. Calls `requireRole(ctx, ["admin", "physio"])`. Fetches the injury entry via `ctx.db.get(injuryId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Calls `ctx.db.delete(injuryId)`.

- [x] **Task 6: Create Zod validation schema for injury form** (AC: #5)
  - [x] 6.1: Create a shared Zod schema for the injury entry form (co-located with the `InjuryLog` component or in a dedicated file). Schema for create mode: `date: z.number({ required_error: "Date is required" })`, `injuryType: z.string().min(1, "Injury type is required").max(200, "Injury type cannot exceed 200 characters")`, `severity: z.enum(["minor", "moderate", "severe"], { required_error: "Severity is required" })`, `estimatedRecovery: z.string().max(200, "Estimated recovery cannot exceed 200 characters").optional().or(z.literal(""))`, `notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional()`.
  - [x] 6.2: Create an extended schema for edit mode that adds: `status: z.enum(["current", "recovered"])`, `clearanceDate: z.number().optional()`. Add a `.refine()` that warns (not blocks) if status is "recovered" but no clearance date is provided.

- [x] **Task 7: Build InjuryLog component** (AC: #1, #3, #4, #13, #16)
  - [x] 7.1: Create `apps/web/src/components/players/InjuryLog.tsx`. Accepts `playerId: Id<"players">` prop. (No `canEdit` prop needed — only medical/admin users can even see this component, so all viewers can edit.)
  - [x] 7.2: Call `useQuery(api.players.queries.getPlayerInjuries, { playerId })`. Handle loading state with `Skeleton` components. Handle empty state with a centered message ("No injury records") and a medical icon.
  - [x] 7.3: Render the current injury summary section above the table: stat cards showing "Current Injuries: {count}" (with red accent if > 0), "Recovered: {count}", "Total Records: {count}". Below the stat cards, if any current injuries exist, list them as compact items: "{injuryType} — {date}". Compute using `useMemo`.
  - [x] 7.4: Render the data table with columns: Date (formatted via `date-fns` `format(new Date(date), "dd MMM yyyy")`), Injury Type, Severity (badge — `minor` = yellow variant, `moderate` = orange variant, `severe` = red/destructive variant), Status (badge — `current` = red/destructive, `recovered` = green/success), Est. Recovery (string or "—"), Clearance Date (formatted date or "—"), Actions column with a `DropdownMenu` containing "Edit" and "Delete" options.
  - [x] 7.5: Render a "Log Injury" button above the table (aligned right, next to or above the summary section).

- [x] **Task 8: Build InjuryFormDialog component** (AC: #5, #7, #8)
  - [x] 8.1: Create `apps/web/src/components/players/InjuryFormDialog.tsx`. Accepts props: `playerId: Id<"players">`, `existingEntry?: PlayerInjury` (for edit mode), `open: boolean`, `onClose: () => void`.
  - [x] 8.2: Use `react-hook-form` with `zodResolver` and the appropriate Zod schema (create schema for new entries, edit schema for existing). In edit mode, pre-populate `defaultValues` from `existingEntry`. In create mode, default `date` to today's timestamp.
  - [x] 8.3: Render the form inside a shadcn `Dialog` (or `Sheet`) with title "Log Injury" (create mode) or "Update Injury" (edit mode).
  - [x] 8.4: Create mode form fields: Date picker for `date` (using `react-day-picker` calendar inside a `Popover`, matching date picker patterns from Story 5.3/5.4), `Input` for injury type (text, required), `Select` for severity (options: "Minor", "Moderate", "Severe" — values: "minor", "moderate", "severe"), `Input` for estimated recovery (optional, text), `Textarea` for notes (optional). Display inline validation errors.
  - [x] 8.5: Edit mode form fields: Same as create mode PLUS `Select` for status (options: "Current", "Recovered" — values: "current", "recovered"), Date picker for clearance date (optional — visually enabled/highlighted when status is "Recovered"). When status changes to "recovered", prompt or auto-suggest today's date for clearance if not already set.
  - [x] 8.6: Submit button calls `logInjury` mutation (create mode) or `updateInjury` mutation (edit mode). On success: show toast ("Injury logged" or "Injury updated"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [x] 8.7: "Cancel" button closes the dialog without saving.

- [x] **Task 9: Build DeleteInjuryDialog component** (AC: #10)
  - [x] 9.1: Create `apps/web/src/components/players/DeleteInjuryDialog.tsx`. Accepts props: `injuryId: Id<"playerInjuries">`, `date: number`, `open: boolean`, `onClose: () => void`.
  - [x] 9.2: Render a shadcn `AlertDialog` with title "Delete Injury Record" and description "Delete injury record from {formatted date}? This action cannot be undone."
  - [x] 9.3: "Delete" button (destructive variant) calls `deleteInjury` mutation. On success: show toast ("Injury record deleted"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [x] 9.4: "Cancel" button closes the dialog.

- [x] **Task 10: Integrate InjuryLog into the Player Profile page** (AC: #1)
  - [x] 10.1: In `apps/web/src/components/players/PlayerProfileTabs.tsx`, replace the "Injuries" tab placeholder content with the `InjuryLog` component. Pass `playerId` from the profile context. The Injuries tab is already conditionally rendered based on `tabAccess.showInjuries` (from Story 5.1).
  - [x] 10.2: Ensure the Injuries tab correctly receives the player ID from the parent page component and passes it down.

- [x] **Task 11: Add injury status indicator to PlayerTable and PlayerProfileHeader** (AC: #12)
  - [x] 11.1: In `apps/web/src/components/players/PlayerTable.tsx`, for each player row call `useQuery(api.players.queries.getPlayerInjuryStatus, { playerId: player._id })`. If `hasCurrentInjury` is `true`, render a small injury indicator icon next to the player name or status badge. Use a Lucide icon such as `HeartPulse`, `Cross`, or `Activity` in red/destructive color. Wrap in a `Tooltip` with text "Currently injured".
  - [x] 11.2: **Performance consideration:** If the player list can have many rows and per-row queries are a concern, consider an alternative: create a batch query `getPlayersInjuryStatuses` that accepts `{ playerIds: Id<"players">[] }` and returns a map of `{ [playerId]: boolean }`. Call it once from the PlayerTable with all visible player IDs. This avoids N+1 queries. Choose whichever approach fits the current codebase pattern.
  - [x] 11.3: In `apps/web/src/components/players/PlayerProfileHeader.tsx`, also call `getPlayerInjuryStatus` and display the injury indicator icon next to the player name if currently injured. This is visible to all roles as a non-detailed status signal.

- [x] **Task 12: Write backend unit tests** (AC: #2, #6, #9, #11, #12, #14, #15)
  - [x] 12.1: Create `packages/backend/convex/players/__tests__/injuries.test.ts` using `@convex-dev/test` + `vitest`.
  - [x] 12.2: Test `getPlayerInjuries`: (a) admin can retrieve injury entries for a player on their team sorted by date descending, (b) physio can retrieve injury entries, (c) coach gets `NOT_AUTHORIZED` error, (d) player gets `NOT_AUTHORIZED` error, (e) analyst gets `NOT_AUTHORIZED` error, (f) returns empty array when no entries exist, (g) does not return entries for a player on a different team (throws `NOT_FOUND`), (h) unauthenticated user throws error.
  - [x] 12.3: Test `getPlayerInjuryStatus`: (a) any authenticated team member can call it and gets `{ hasCurrentInjury: boolean }`, (b) returns `true` when a "current" injury exists, (c) returns `false` when only "recovered" injuries exist, (d) returns `false` when no injuries exist, (e) does not return any injury detail fields (response shape is exactly `{ hasCurrentInjury: boolean }`), (f) wrong team player throws `NOT_FOUND`.
  - [x] 12.4: Test `logInjury`: (a) admin can log injury for a player on their team — returns a valid ID, (b) physio can log injury — returns a valid ID, (c) coach gets `NOT_AUTHORIZED`, (d) player gets `NOT_AUTHORIZED`, (e) wrong team player throws `NOT_FOUND`, (f) invalid severity value throws `VALIDATION_ERROR`, (g) empty injuryType throws `VALIDATION_ERROR`, (h) injuryType > 200 chars throws `VALIDATION_ERROR`, (i) notes > 2000 chars throws `VALIDATION_ERROR`, (j) estimatedRecovery > 200 chars throws `VALIDATION_ERROR`, (k) created entry has `status: "current"`, `clearanceDate: undefined`, correct `createdBy`, `createdAt`, `teamId`.
  - [x] 12.5: Test `updateInjury`: (a) admin can update an existing injury entry, (b) physio can update an existing injury entry, (c) coach gets `NOT_AUTHORIZED`, (d) updating entry from different team throws `NOT_FOUND`, (e) can change status from "current" to "recovered" with clearanceDate, (f) can change status from "recovered" back to "current" (clearanceDate cleared or kept), (g) invalid status value throws `VALIDATION_ERROR`, (h) `updatedAt` is refreshed on update, (i) non-existent injuryId throws `NOT_FOUND`, (j) invalid severity throws `VALIDATION_ERROR`.
  - [x] 12.6: Test `deleteInjury`: (a) admin can delete an injury entry, (b) physio can delete an injury entry, (c) coach gets `NOT_AUTHORIZED`, (d) deleting entry from different team throws `NOT_FOUND`, (e) deleted entry no longer appears in `getPlayerInjuries` results, (f) deleted entry makes `getPlayerInjuryStatus` return `false` if it was the only "current" injury, (g) non-existent injuryId throws `NOT_FOUND`.

- [x] **Task 13: Final validation** (AC: all)
  - [x] 13.1: Run `pnpm typecheck` — must pass with zero errors.
  - [x] 13.2: Run `pnpm lint` — must pass with zero errors.
  - [x] 13.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [ ] 13.4: Start the dev server — log in as admin. Navigate to `/players/[playerId]`, verify "Injuries" tab is visible. Click it — verify the empty state ("No injury records").
  - [ ] 13.5: Click "Log Injury" — verify the form dialog opens with all fields and correct defaults (date = today, severity select, etc.).
  - [ ] 13.6: Submit with valid data (injuryType="Hamstring strain", severity="moderate", estimatedRecovery="4-6 weeks", notes="Occurred during training") — verify entry appears in the table with correct formatting and severity/status badges. Verify success toast.
  - [ ] 13.7: Submit with missing required field (empty injury type) — verify validation error appears inline.
  - [ ] 13.8: Submit with invalid severity — verify validation error.
  - [ ] 13.9: Click edit on the injury row — verify form pre-populates. Change status to "Recovered", set clearance date — verify update succeeds and badges change.
  - [ ] 13.10: Click delete on the injury row — verify confirmation dialog. Confirm — verify entry disappears.
  - [ ] 13.11: Log in as physio user — navigate to same player's Injuries tab. Verify full CRUD access (log, edit, delete all work).
  - [ ] 13.12: Log in as coach — navigate to same player's profile. Verify "Injuries" tab is NOT visible. Verify no injury details are accessible.
  - [ ] 13.13: As coach, verify the player list shows an injury indicator icon for the injured player (status indicator only, no details).
  - [ ] 13.14: Log in as player — navigate to own profile. Verify "Injuries" tab is NOT visible.
  - [ ] 13.15: Verify real-time updates: open two browser tabs as admin/physio, log an injury in one tab — verify it appears in the other tab without refresh.
  - [ ] 13.16: Verify the injury status indicator on the player list updates in real time when an injury is logged or resolved.
  - [ ] 13.17: Verify the current injury summary section above the table shows correct counts and current injury list.

## Dev Notes

### Architecture Context

This is the **injury history CRUD story for Epic 5** with a critical security dimension: injury data is restricted to medical staff (physio) and admin roles for BOTH read and write access. This is fundamentally different from Stories 5.3 (Performance Stats — admin-only writes, all can read) and 5.4 (Fitness Data — admin/physio writes, all can read). Injury data requires role-gating on queries too, not just mutations.

This story directly implements:

- **FR24:** Medical staff can create and update injury history entries for a player (visible only to medical staff; non-medical roles see a status indicator only)
- **NFR7:** Medical/injury data accessible only to users with medical staff role
- **NFR2:** Real-time updates propagate via Convex subscriptions
- **NFR5:** Data access enforced at the Convex mutation/query layer (`requireRole(ctx, ["admin", "physio"])` for all injury data operations)
- **NFR6:** Multi-tenant isolation via `teamId` scoping on `playerInjuries` table

### Critical Security Distinction from Stories 5.3 and 5.4

| Aspect | Story 5.3 (Stats) | Story 5.4 (Fitness) | Story 5.5 (Injuries) |
|--------|-------------------|---------------------|----------------------|
| **Read access** | `requireAuth` (all team members) | `requireAuth` (all team members) | `requireRole(["admin", "physio"])` |
| **Write access** | `requireRole(["admin"])` | `requireRole(["admin", "physio"])` | `requireRole(["admin", "physio"])` |
| **Tab visibility** | All users | All users | Admin + Physio ONLY |
| **Status indicator** | N/A | N/A | All users see boolean flag only |

**This means the `getPlayerInjuries` query MUST use `requireRole`, not `requireAuth`.** The separate `getPlayerInjuryStatus` query provides a safe boolean-only signal to non-medical users.

### Key Architectural Decisions from architecture.md

- **Authorization Pattern:** `requireRole(ctx, ["admin", "physio"])` for ALL injury data queries and mutations. `requireAuth(ctx)` ONLY for the `getPlayerInjuryStatus` boolean query. Every function starts with the appropriate auth check. [Source: architecture.md#Authentication-&-Security]

- **RBAC Model:** Single role enum on user record: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. Only `admin` and `physio` can access injury details. The architecture also mentions `requireMedical(ctx)` as a shorthand — check if it exists in `convex/lib/auth.ts`; if not, use `requireRole(ctx, ["admin", "physio"])` directly. [Source: architecture.md#Authentication-&-Security]

- **Multi-tenant Isolation:** Every table includes `teamId`. Every query/mutation filters by the authenticated user's team. [Source: architecture.md#Authentication-&-Security]

- **Data Model:** `playerInjuries` table defined in Story 5.1 AC #4 as a separate table with: `teamId`, `playerId`, `date`, `injuryType`, `severity`, `estimatedRecovery`, `notes`, `status` ("current"/"recovered"), `clearanceDate`, `createdBy`, `createdAt`, `updatedAt`. Indexes: `by_playerId`, `by_teamId`. [Source: Story 5.1 AC #4]

- **Form Pattern:** `react-hook-form` + Zod schema + `zodResolver` + `useMutation`. [Source: architecture.md#Process-Patterns]

- **Error Handling:** `ConvexError` with codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

- **Dates:** Stored as Unix timestamp ms (`number`) in Convex. Displayed using `date-fns`. [Source: architecture.md#Format-Patterns]

- **Loading States:** `useQuery` returns `undefined` → render `Skeleton`. Empty array → empty state. [Source: architecture.md#Process-Patterns]

- **Component Organization:** Feature-grouped at `components/players/`. [Source: architecture.md#Structure-Patterns]

- **Convex Organization:** Queries in `convex/players/queries.ts`, mutations in `convex/players/mutations.ts`. Tests in `convex/players/__tests__/`. [Source: architecture.md#Structure-Patterns]

### Shared Constants from Story 5.1

Story 5.1 Task 2 exports constants to `packages/shared/`:
- `INJURY_SEVERITIES = ["minor", "moderate", "severe"] as const`
- `INJURY_STATUSES = ["current", "recovered"] as const`

**Use these constants** in both backend validation and frontend select options. Do NOT hardcode the values.

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 5.5) state:

> **Given** the user has the medical/physio role
> **When** they view a player's profile
> **Then** an "Injuries" tab is visible (hidden for non-medical roles)
> **And** clicking "Log Injury" shows a form: date, injury type, severity, estimated recovery, notes
> **When** the injury is submitted
> **Then** it appears in the injury history log with status (Current/Recovered)
> **And** the medical staff can update existing injuries (add rehab notes, change status, set clearance date)
> **And** non-medical users see only a status indicator on the player list (e.g. injury icon) but cannot access injury details
> **And** access control is enforced at the Convex query layer (medical role check)

**This story extends and decomposes the AC as follows:**

- **Delete capability:** Original AC mentions create and update but not delete. Added for completeness — medical staff should be able to remove erroneous records. Follows the same destructive action pattern (confirmation dialog) from Stories 5.3 and 5.4.
- **Severity badge visualization:** Original AC says "severity" but doesn't specify visual treatment. Added color-coded badges (minor=yellow, moderate=orange, severe=red) for at-a-glance triage.
- **Status badge visualization:** Added color-coded status badges (current=red, recovered=green) for the injury table.
- **Current injury summary section:** Not in the original AC but provides high-value at-a-glance context for the medical team about a player's current injury situation.
- **Injury status indicator query (`getPlayerInjuryStatus`):** The original AC says "non-medical users see only a status indicator." This story creates a dedicated query that returns ONLY a boolean flag, ensuring no medical data leaks through the API.
- **Clearance date behavior:** The original AC mentions "set clearance date" during updates. This story specifies it's available only during editing (not creation) and auto-suggests today when status changes to "recovered."
- **Field validation ranges:** Added `injuryType` max 200 chars, `estimatedRecovery` max 200 chars, `notes` max 2000 chars, `severity` enum validation.
- **Admin access to injuries:** The original AC says "medical/physio role." This story includes `admin` users too, consistent with admin having full platform access. Architecture confirms admin has access to everything.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `playerInjuries` table defined in schema | Story 5.1 | `packages/backend/convex/table/playerInjuries.ts` must exist with all fields and indexes (`by_playerId`, `by_teamId`) |
| `players` table defined in schema | Story 5.1 | `packages/backend/convex/table/players.ts` must exist |
| `getPlayerById` query | Story 5.1 | `packages/backend/convex/players/queries.ts` must export `getPlayerById` |
| `getPlayerTabAccess` query | Story 5.1 | Must exist and return `showInjuries: true` for admin/physio roles |
| Player profile page at `/players/[playerId]` | Story 5.1 | `apps/web/src/app/(app)/players/[playerId]/page.tsx` must exist with tabbed layout |
| `PlayerProfileTabs` with "Injuries" tab placeholder | Story 5.1 | Must exist, Injuries tab conditionally visible for admin/physio |
| `PlayerTable` component | Story 5.1 | Must exist at `components/players/PlayerTable.tsx` |
| `PlayerProfileHeader` component | Story 5.1 | Must exist at `components/players/PlayerProfileHeader.tsx` |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export these |
| `INJURY_SEVERITIES`, `INJURY_STATUSES` constants | Story 5.1 | Must be exported from `packages/shared/` |
| shadcn/ui components: Dialog, AlertDialog, Table, Button, Input, Textarea, Select, Form, Popover, DropdownMenu, Badge, Card, Tooltip, Skeleton | Story 1.2 | All must be available in `components/ui/` |
| CRUD pattern reference from Story 5.3/5.4 | Story 5.3/5.4 | Not a hard blocker but establishes the UI pattern to follow |

### Current State (Baseline)

**`convex/table/playerInjuries.ts`:** Exists from Story 5.1. Defines the `playerInjuries` table with fields: `teamId`, `playerId`, `date`, `injuryType`, `severity`, `estimatedRecovery` (optional), `notes` (optional), `status`, `clearanceDate` (optional), `createdBy`, `createdAt`, `updatedAt`. Indexes: `by_playerId`, `by_teamId`.

**`convex/players/queries.ts`:** Exists from Story 5.1 with `getPlayers`, `getPlayerById`, `getPlayerTabAccess`. Also has `getPlayerStats` (Story 5.3) and `getPlayerFitness` (Story 5.4). **No `getPlayerInjuries` or `getPlayerInjuryStatus` queries** — must be added.

**`convex/players/mutations.ts`:** Exists from Story 5.2+ with player-related mutations and fitness/stats CRUD mutations. **No injury-related mutations** — must be added.

**`apps/web/src/components/players/InjuryLog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/InjuryFormDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/DeleteInjuryDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/PlayerProfileTabs.tsx`:** Exists from Story 5.1. The "Injuries" tab currently renders a placeholder. Must be updated to render `InjuryLog`. The tab is already conditionally visible based on `tabAccess.showInjuries`.

**`apps/web/src/components/players/PlayerTable.tsx`:** Exists from Story 5.1. Currently shows player rows without injury indicators. Must be updated to show injury status indicator.

**`apps/web/src/components/players/PlayerProfileHeader.tsx`:** Exists from Story 5.1. Must be updated to show injury indicator icon.

**Auth utilities:** `requireAuth(ctx)` and `requireRole(ctx, roles)` exist in `packages/backend/convex/lib/auth.ts`. Multi-role access with `["admin", "physio"]` was first used in Story 5.4 and should be verified working.

### Existing Patterns to Follow

**Injury CRUD follows the same mutation pattern as Story 5.4 (Fitness), with the critical difference of role-gated reads:**

```typescript
// Query pattern — NOTE: requireRole, NOT requireAuth (unlike fitness/stats):
export const getPlayerInjuries = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"])
    const player = await ctx.db.get(playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    const entries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect()

    return entries.sort((a, b) => b.date - a.date)
  },
})
```

```typescript
// Status indicator query — safe for all authenticated users:
export const getPlayerInjuryStatus = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx)
    const player = await ctx.db.get(playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    const currentInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .filter((q) => q.eq(q.field("status"), "current"))
      .collect()

    return { hasCurrentInjury: currentInjuries.length > 0 }
  },
})
```

```typescript
// Mutation pattern — same role guard as fitness writes:
export const logInjury = mutation({
  args: {
    playerId: v.id("players"),
    date: v.number(),
    injuryType: v.string(),
    severity: v.string(),
    estimatedRecovery: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "physio"])
    const player = await ctx.db.get(args.playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    // Validate severity
    if (!["minor", "moderate", "severe"].includes(args.severity)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Severity must be minor, moderate, or severe",
      })
    }

    // Validate field lengths
    if (!args.injuryType || args.injuryType.trim().length === 0) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Injury type is required" })
    }
    if (args.injuryType.length > 200) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Injury type cannot exceed 200 characters" })
    }
    if (args.estimatedRecovery && args.estimatedRecovery.length > 200) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Estimated recovery cannot exceed 200 characters" })
    }
    if (args.notes && args.notes.length > 2000) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Notes cannot exceed 2000 characters" })
    }

    return await ctx.db.insert("playerInjuries", {
      teamId,
      playerId: args.playerId,
      date: args.date,
      injuryType: args.injuryType,
      severity: args.severity,
      estimatedRecovery: args.estimatedRecovery,
      notes: args.notes,
      status: "current",
      clearanceDate: undefined,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

**Severity Badge Pattern:**

```typescript
const severityVariant: Record<string, string> = {
  minor: "outline",      // yellow-tinted
  moderate: "secondary",  // orange-tinted
  severe: "destructive",  // red
}

const statusVariant: Record<string, string> = {
  current: "destructive",   // red — active injury
  recovered: "default",     // green — resolved
}
```

**Injury Status Indicator (for non-medical users):**

```typescript
// In PlayerTable.tsx — per-row or batch query
const injuryStatus = useQuery(api.players.queries.getPlayerInjuryStatus, { playerId: player._id })

{injuryStatus?.hasCurrentInjury && (
  <Tooltip>
    <TooltipTrigger>
      <HeartPulse className="h-4 w-4 text-destructive" />
    </TooltipTrigger>
    <TooltipContent>Currently injured</TooltipContent>
  </Tooltip>
)}
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/players/queries.ts` | Modified | Add `getPlayerInjuries` and `getPlayerInjuryStatus` queries |
| `packages/backend/convex/players/mutations.ts` | Modified | Add `logInjury`, `updateInjury`, `deleteInjury` mutations |
| `apps/web/src/components/players/InjuryLog.tsx` | Created | Injury data table + current injury summary section |
| `apps/web/src/components/players/InjuryFormDialog.tsx` | Created | Log/edit injury form in a dialog |
| `apps/web/src/components/players/DeleteInjuryDialog.tsx` | Created | Confirmation dialog for injury record deletion |
| `apps/web/src/components/players/PlayerProfileTabs.tsx` | Modified | Replace "Injuries" tab placeholder with `InjuryLog` component |
| `apps/web/src/components/players/PlayerTable.tsx` | Modified | Add injury status indicator icon per player row |
| `apps/web/src/components/players/PlayerProfileHeader.tsx` | Modified | Add injury status indicator icon |
| `packages/backend/convex/players/__tests__/injuries.test.ts` | Created | Unit tests for injury queries and mutations |

### What This Story Does NOT Include

- **No injury analytics or trends** — only the log table and current injury summary
- **No injury notification system** — medical staff are not notified when injuries are logged (notification system could be a future enhancement)
- **No injury PDF/report export** — out of Sprint 1 scope
- **No injury categories/taxonomy dropdown** — injury type is free text in Sprint 1 (structured categories can be added later)
- **No rehab program tracking** — just notes; dedicated rehab management is a future feature
- **No player self-view of injuries** — players cannot see their own injury history (per FR24, only medical staff)
- **No body map/anatomical diagram** — text-based injury location only
- **No return-to-play protocol workflow** — just clearance date field
- **No coach/analyst read access to injuries** — per FR24, injury details are medical-only. They see only the boolean status indicator.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 5.1 not complete (no `playerInjuries` schema, no profile page) | Hard blocker. Check for `convex/table/playerInjuries.ts` and profile page before starting. |
| N+1 query problem with `getPlayerInjuryStatus` called per player row | Consider batch query `getPlayersInjuryStatuses` (Task 11.2). Alternatively, Convex's reactive query model may handle this efficiently with its internal caching. Profile before optimizing. |
| `requireRole` rejecting admin users who should have access to injuries | Verify that `requireRole(ctx, ["admin", "physio"])` correctly implements any-of semantics (admin OR physio). This was first used in Story 5.4 — check if it works correctly. |
| Medical data leaking through `getPlayerInjuryStatus` | The query MUST return only `{ hasCurrentInjury: boolean }`. Add a test (Task 12.3e) that verifies the response shape contains no injury detail fields. |
| Status transition edge cases (recovered → current) | Allow status to change in either direction. Medical staff may need to reopen a recovered injury if it recurs. Clearance date is optional regardless of status. |
| Free-text injury type leading to inconsistency | Acceptable for Sprint 1. Future enhancement: add an autocomplete/combobox with common injury types while still allowing free text input. |

### Performance Considerations

- **Index usage:** `by_playerId` index on `playerInjuries` ensures fast lookup per player. No full table scan.
- **Sorting:** In-memory sort by `date` descending. Dataset size is small (typical: 5-20 injuries per player career).
- **Status indicator queries:** If using per-row `getPlayerInjuryStatus`, each is a small indexed query. Convex subscription model handles deduplication. For player lists > 30 rows, the batch query alternative is recommended.
- **Summary computation:** Frontend `useMemo` for current injury counts. Negligible cost.

### Alignment with Architecture Document

- **Auth Pattern:** `requireRole(ctx, ["admin", "physio"])` for injury detail access — matches architecture.md § Authentication & Security
- **Medical Data Guard:** Role-gated query (not just mutation) — satisfies NFR7
- **Data Model:** `playerInjuries` table with all fields from Story 5.1 AC #4
- **Component Structure:** `InjuryLog.tsx` in `components/players/` — matches architecture.md § Frontend Architecture
- **Convex Organization:** Queries/mutations in `convex/players/` — matches architecture.md § Convex Function Organization
- **Naming:** camelCase Convex functions (`getPlayerInjuries`, `logInjury`), PascalCase components (`InjuryLog.tsx`)
- **Testing:** Co-located in `convex/players/__tests__/`
- **Dates:** Timestamps as numbers, `date-fns` for display
- **Error Handling:** `ConvexError` with `NOT_FOUND`, `NOT_AUTHORIZED`, `VALIDATION_ERROR` codes
- **Form Pattern:** `react-hook-form` + `zodResolver` + `useMutation` + `toast`
- **No detected conflicts** with the architecture document

### Project Structure Notes

- All files align with the unified project structure from architecture.md
- New components are placed in `apps/web/src/components/players/` (feature-grouped)
- New Convex functions are placed in `packages/backend/convex/players/` (module-grouped)
- Tests are co-located in `packages/backend/convex/players/__tests__/`
- No new directories are created — all files fit into existing structure
- Shared constants (`INJURY_SEVERITIES`, `INJURY_STATUSES`) are consumed from `packages/shared/`

### References

- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, requireMedical, RBAC model (6 roles), teamId scoping
- [Source: architecture.md#Data-Architecture] — Separate `playerInjuries` table, hybrid normalization approach
- [Source: architecture.md#Frontend-Architecture] — Page structure (`app/(app)/players/[playerId]/page.tsx`), component organization (`components/players/`)
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, error handling, no REST
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting, ConvexError codes
- [Source: architecture.md#Process-Patterns] — Form pattern (react-hook-form + Zod + zodResolver), loading states, mutation feedback
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: epics.md#Story-5.5] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR24 mapped to Epic 5
- [Source: Story-5.1] — `playerInjuries` table schema definition (AC #4), `PlayerProfileTabs` with conditional Injuries tab, `getPlayerTabAccess` query, shared constants (INJURY_SEVERITIES, INJURY_STATUSES)
- [Source: Story-5.4] — Fitness CRUD pattern reference (identical mutation pattern, same role access for writes, different role access for reads)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (Amelia, Senior Software Engineer)

### Debug Log References

- Zod v4 compatibility: `required_error` param not supported in Zod v4 `z.number()` and `z.enum()`. Fixed to use `message` param instead (matching existing `fitnessFormSchema.ts` pattern).
- `IconHeartPulse` (Lucide icon) not available in `@tabler/icons-react`. Replaced with `IconActivityHeartbeat`.
- `useForm` resolver type mismatch when conditionally using create vs edit schema. Fixed by always using `injuryEditSchema` (superset) as the form type and resolver, with sane defaults for status/clearanceDate in create mode.
- Chose batch query `getPlayersInjuryStatuses` (Task 11.2) for PlayerTable to avoid N+1 per-row queries. Uses `by_teamId` index on `playerInjuries` to fetch all current injuries in a single query.

### Completion Notes List

- All 42 new injury tests pass (injuries.test.ts)
- All 419 existing backend tests still pass (20 test files, 0 regressions)
- TypeScript compilation passes for both `packages/backend` and `apps/web`
- ESLint passes for all changed web files
- `getPlayerInjuries` uses `requireRole(["admin", "physio"])` — role-gated reads (AC #15, NFR7)
- `getPlayerInjuryStatus` uses `requireAuth()` and returns ONLY `{ hasCurrentInjury: boolean }` — no detail leakage (AC #12, #15)
- Injury tab visibility controlled by existing `tabAccess.showInjuries` from Story 5.1 (AC #1)
- All mutations use `requireRole(["admin", "physio"])` with `teamId` scoping (AC #14, #15)
- Real-time updates via Convex `useQuery` subscriptions (AC #16)

### File List

- `packages/backend/convex/players/queries.ts` — Modified: added `getPlayerInjuries`, `getPlayerInjuryStatus`, `getPlayersInjuryStatuses` queries
- `packages/backend/convex/players/mutations.ts` — Modified: added `logInjury`, `updateInjury`, `deleteInjury` mutations + `validateInjuryFields` helper
- `apps/web/src/components/players/InjuryLog.tsx` — Created: injury data table + summary section
- `apps/web/src/components/players/InjuryFormDialog.tsx` — Created: log/edit injury form dialog
- `apps/web/src/components/players/DeleteInjuryDialog.tsx` — Created: injury deletion confirmation dialog
- `apps/web/src/components/players/injuryFormSchema.ts` — Created: Zod schemas for create and edit forms
- `apps/web/src/components/players/PlayerProfileTabs.tsx` — Modified: replaced Injuries tab placeholder with InjuryLog component
- `apps/web/src/components/players/PlayerTable.tsx` — Modified: added batch injury status query + indicator icon
- `apps/web/src/components/players/PlayerProfileHeader.tsx` — Modified: added injury status indicator icon
- `packages/backend/convex/players/__tests__/injuries.test.ts` — Created: 42 unit tests for injury CRUD operations
