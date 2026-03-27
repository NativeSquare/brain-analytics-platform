# Story 5.3: Performance Stats Log

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to manually enter per-match performance stats for each player,
so that the club has a record of individual player performance over the season.

## Acceptance Criteria

1. **"Performance" tab on the player profile is functional** — When an admin or any authenticated user navigates to `/players/[playerId]` and clicks the "Performance" tab, the tab content renders a performance stats log (replacing the "Coming soon" placeholder from Story 5.1). The tab is visible to all authenticated users (not role-restricted).

2. **`getPlayerStats` query returns match stats for a player** — A query `players.queries.getPlayerStats` accepts `{ playerId: Id<"players"> }`, calls `requireAuth(ctx)`, validates the player belongs to the authenticated user's team, and returns an array of `playerStats` documents for that player sorted by `matchDate` descending (most recent match first). Each entry includes: `_id`, `matchDate`, `opponent`, `minutesPlayed`, `goals`, `assists`, `yellowCards`, `redCards`, `createdAt`. Returns an empty array if no stats exist.

3. **Stats log displays as a sortable data table** — The Performance tab renders a table (using shadcn `Table` or TanStack React Table) with columns: Date (formatted with `date-fns`, e.g. "15 Mar 2026"), Opponent, Minutes, Goals, Assists, Yellow Cards (yellow card icon + count), Red Cards (red card icon + count), and an Actions column (visible to admins only). The table is sorted by most recent match first by default. An empty state is shown when no stats entries exist ("No match stats recorded yet").

4. **"Add Match Stats" button visible to admins** — When the current user has the `admin` role, an "Add Match Stats" button is displayed above the stats table. Non-admin users do not see this button. Clicking the button opens a dialog/sheet with the stats entry form.

5. **Stats entry form validates and submits correctly** — The "Add Match Stats" form contains fields: match date (required — date picker, defaults to today), opponent (required — text input), minutes played (required — number input, 0-120 range), goals (required — number input, min 0, defaults to 0), assists (required — number input, min 0, defaults to 0), yellow cards (required — number input, 0-2 range, defaults to 0), red cards (required — number input, 0-1 range, defaults to 0). The form uses `react-hook-form` with Zod validation. Submit is disabled until all required fields are valid.

6. **`addPlayerStats` mutation creates a stats entry** — A mutation `players.mutations.addPlayerStats` accepts `{ playerId: Id<"players">, matchDate: number, opponent: string, minutesPlayed: number, goals: number, assists: number, yellowCards: number, redCards: number }`, calls `requireRole(ctx, ["admin"])`, validates the player belongs to the admin's team, inserts a new `playerStats` document with `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new stats entry `_id`.

7. **Success feedback after adding stats** — After successful form submission: a success toast is shown ("Match stats added"), the dialog/sheet closes, and the new entry appears in the stats table in real time (Convex subscription).

8. **Existing entries can be edited by admins** — Admins can click an edit action (pencil icon or "Edit" in a dropdown menu) on any stats row. This opens the same form pre-populated with the existing values. On submit, the `updatePlayerStats` mutation is called. Non-admin users do not see edit actions.

9. **`updatePlayerStats` mutation updates an existing stats entry** — A mutation `players.mutations.updatePlayerStats` accepts `{ statsId: Id<"playerStats">, matchDate: number, opponent: string, minutesPlayed: number, goals: number, assists: number, yellowCards: number, redCards: number }`, calls `requireRole(ctx, ["admin"])`, validates the stats entry exists and belongs to the admin's team, patches the document with the new values and `updatedAt: Date.now()`. Returns the updated stats entry `_id`.

10. **Existing entries can be deleted by admins** — Admins can click a delete action (trash icon or "Delete" in a dropdown menu) on any stats row. A confirmation dialog appears ("Delete match stats vs [opponent] on [date]? This action cannot be undone."). On confirm, the `deletePlayerStats` mutation is called. Non-admin users do not see delete actions.

11. **`deletePlayerStats` mutation removes a stats entry** — A mutation `players.mutations.deletePlayerStats` accepts `{ statsId: Id<"playerStats"> }`, calls `requireRole(ctx, ["admin"])`, validates the stats entry exists and belongs to the admin's team, deletes the document. The entry disappears from the table in real time.

12. **Players can view their own performance stats (read-only)** — When a player navigates to their own profile and clicks the "Performance" tab, they see the stats table (read-only, no add/edit/delete actions). The data is accessible because `getPlayerStats` uses `requireAuth` (not `requireRole`), so any authenticated team member can read performance stats.

13. **Summary stats row or header** — Above the stats table, a summary section displays aggregated totals for the visible stats: total matches (count of entries), total goals, total assists, total yellow cards, total red cards, and average minutes per match. These are computed from the query results on the frontend.

14. **Team-scoped data access enforced** — All queries and mutations filter/validate by `teamId` from `requireAuth`/`requireRole`. No cross-team stats access is possible. Access control is enforced at the Convex mutation/query layer, not just the UI.

15. **Real-time updates** — Because the stats table uses Convex `useQuery`, stats entries added, edited, or deleted by another admin appear/update/disappear in real time for all connected clients without manual refresh.

## Tasks / Subtasks

- [ ] **Task 1: Create `getPlayerStats` query** (AC: #2, #14)
  - [ ] 1.1: In `packages/backend/convex/players/queries.ts`, implement `getPlayerStats` query: accepts `{ playerId: v.id("players") }`, calls `requireAuth(ctx)`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches the authenticated user's team (throw `NOT_FOUND` if not). Queries `playerStats` table using the `by_playerId` index filtering by `playerId`. Sorts results by `matchDate` descending. Returns the array of stats objects.
  - [ ] 1.2: Verify query returns an empty array (not `null`) when no stats exist for the player.

- [ ] **Task 2: Create `addPlayerStats` mutation** (AC: #6, #14)
  - [ ] 2.1: In `packages/backend/convex/players/mutations.ts`, implement `addPlayerStats` mutation: accepts `{ playerId: v.id("players"), matchDate: v.number(), opponent: v.string(), minutesPlayed: v.number(), goals: v.number(), assists: v.number(), yellowCards: v.number(), redCards: v.number() }`. Calls `requireRole(ctx, ["admin"])`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches (throw `NOT_FOUND` if not). Validates `minutesPlayed` is between 0 and 120, `yellowCards` is 0-2, `redCards` is 0-1, `goals` >= 0, `assists` >= 0 (throw `VALIDATION_ERROR` with descriptive message if invalid). Inserts into `playerStats` with `teamId`, `playerId`, `createdBy: user._id`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new `_id`.

- [ ] **Task 3: Create `updatePlayerStats` mutation** (AC: #9, #14)
  - [ ] 3.1: In `packages/backend/convex/players/mutations.ts`, implement `updatePlayerStats` mutation: accepts `{ statsId: v.id("playerStats"), matchDate: v.number(), opponent: v.string(), minutesPlayed: v.number(), goals: v.number(), assists: v.number(), yellowCards: v.number(), redCards: v.number() }`. Calls `requireRole(ctx, ["admin"])`. Fetches the stats entry via `ctx.db.get(statsId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Applies same field-level validations as `addPlayerStats`. Patches the document with all provided fields plus `updatedAt: Date.now()`. Returns the `statsId`.

- [ ] **Task 4: Create `deletePlayerStats` mutation** (AC: #11, #14)
  - [ ] 4.1: In `packages/backend/convex/players/mutations.ts`, implement `deletePlayerStats` mutation: accepts `{ statsId: v.id("playerStats") }`. Calls `requireRole(ctx, ["admin"])`. Fetches the stats entry via `ctx.db.get(statsId)`, validates it exists and `teamId` matches (throw `NOT_FOUND` if not). Calls `ctx.db.delete(statsId)`.

- [ ] **Task 5: Create Zod validation schema for stats form** (AC: #5)
  - [ ] 5.1: Create a shared Zod schema for the match stats form (co-located with the `StatsLog` component or in a shared location). Schema: `matchDate: z.number({ required_error: "Match date is required" })`, `opponent: z.string().min(1, "Opponent is required")`, `minutesPlayed: z.number().int().min(0, "Minutes must be 0 or more").max(120, "Minutes cannot exceed 120")`, `goals: z.number().int().min(0, "Goals must be 0 or more").default(0)`, `assists: z.number().int().min(0, "Assists must be 0 or more").default(0)`, `yellowCards: z.number().int().min(0).max(2, "Maximum 2 yellow cards").default(0)`, `redCards: z.number().int().min(0).max(1, "Maximum 1 red card").default(0)`.

- [ ] **Task 6: Build StatsLog component** (AC: #1, #3, #4, #12, #13)
  - [ ] 6.1: Create `apps/web/src/components/players/StatsLog.tsx`. Accepts `playerId: Id<"players">` and `isAdmin: boolean` props.
  - [ ] 6.2: Call `useQuery(api.players.queries.getPlayerStats, { playerId })`. Handle loading state with `Skeleton` components. Handle empty state with a centered message ("No match stats recorded yet") and an icon (e.g., chart/activity icon).
  - [ ] 6.3: Render the stats summary section above the table: a row of stat cards or inline metrics showing: "Matches: {count}", "Goals: {total}", "Assists: {total}", "Yellow Cards: {total}", "Red Cards: {total}", "Avg Minutes: {average}". Compute these from the query results using `useMemo`.
  - [ ] 6.4: Render the data table with columns: Date (formatted via `date-fns` `format(new Date(matchDate), "dd MMM yyyy")`), Opponent, Minutes, Goals, Assists, Yellow Cards, Red Cards. If `isAdmin` is true, add an Actions column.
  - [ ] 6.5: The Actions column renders a `DropdownMenu` with "Edit" and "Delete" options for each row (admin only).
  - [ ] 6.6: If `isAdmin`, render an "Add Match Stats" button above the table (aligned right, next to or above the summary section).

- [ ] **Task 7: Build StatsFormDialog component** (AC: #5, #7, #8)
  - [ ] 7.1: Create `apps/web/src/components/players/StatsFormDialog.tsx`. Accepts props: `playerId: Id<"players">`, `existingStats?: PlayerStats` (for edit mode), `open: boolean`, `onClose: () => void`.
  - [ ] 7.2: Use `react-hook-form` with `zodResolver` and the Zod schema from Task 5. In edit mode, pre-populate `defaultValues` from `existingStats`. In create mode, default `matchDate` to today's timestamp, and numeric fields to 0.
  - [ ] 7.3: Render the form inside a shadcn `Dialog` (or `Sheet`) with title "Add Match Stats" (create mode) or "Edit Match Stats" (edit mode).
  - [ ] 7.4: Form fields: Date picker for `matchDate` (using `react-day-picker` calendar inside a `Popover`, matching existing date picker patterns in the codebase), `Input` for opponent (text), `Input` (type=number) for minutes played, `Input` (type=number) for goals, `Input` (type=number) for assists, `Input` (type=number) for yellow cards, `Input` (type=number) for red cards. Display inline validation errors below each field.
  - [ ] 7.5: Submit button calls `addPlayerStats` mutation (create mode) or `updatePlayerStats` mutation (edit mode). On success: show toast ("Match stats added" or "Match stats updated"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 7.6: "Cancel" button closes the dialog without saving.

- [ ] **Task 8: Build DeleteStatsDialog component** (AC: #10)
  - [ ] 8.1: Create `apps/web/src/components/players/DeleteStatsDialog.tsx`. Accepts props: `statsId: Id<"playerStats">`, `opponent: string`, `matchDate: number`, `open: boolean`, `onClose: () => void`.
  - [ ] 8.2: Render a shadcn `AlertDialog` with title "Delete Match Stats" and description "Delete match stats vs {opponent} on {formatted date}? This action cannot be undone."
  - [ ] 8.3: "Delete" button (destructive variant) calls `deletePlayerStats` mutation. On success: show toast ("Match stats deleted"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 8.4: "Cancel" button closes the dialog.

- [ ] **Task 9: Integrate StatsLog into the Player Profile page** (AC: #1)
  - [ ] 9.1: In `apps/web/src/components/players/PlayerProfileTabs.tsx` (or wherever the "Performance" tab content is rendered), replace the placeholder content with the `StatsLog` component. Pass `playerId` from the profile context and `isAdmin` derived from the current user's role (check `user.role === "admin"` from the current user query or from `tabAccess` data).
  - [ ] 9.2: Ensure the Performance tab correctly receives the player ID from the parent page component and passes it down.

- [ ] **Task 10: Write backend unit tests** (AC: #2, #6, #9, #11, #14)
  - [ ] 10.1: Create `packages/backend/convex/players/__tests__/stats.test.ts` (or add to existing `mutations.test.ts`) using `@convex-dev/test` + `vitest`.
  - [ ] 10.2: Test `getPlayerStats`: (a) returns all stats for a player within the same team sorted by matchDate descending, (b) returns empty array when no stats exist, (c) does not return stats for a player from a different team (throws or returns empty), (d) unauthenticated user throws error.
  - [ ] 10.3: Test `addPlayerStats`: (a) admin can add stats for a player on their team, returns a valid ID, (b) non-admin user gets `NOT_AUTHORIZED` error, (c) adding stats for a player on a different team throws `NOT_FOUND`, (d) `minutesPlayed` > 120 throws `VALIDATION_ERROR`, (e) negative `goals` throws `VALIDATION_ERROR`, (f) `yellowCards` > 2 throws `VALIDATION_ERROR`, (g) `redCards` > 1 throws `VALIDATION_ERROR`, (h) created entry has correct `createdBy`, `createdAt`, `teamId` fields.
  - [ ] 10.4: Test `updatePlayerStats`: (a) admin can update an existing stats entry, (b) non-admin user gets `NOT_AUTHORIZED` error, (c) updating a stats entry from a different team throws `NOT_FOUND`, (d) `updatedAt` is refreshed on update, (e) all fields are updated correctly, (f) non-existent statsId throws `NOT_FOUND`.
  - [ ] 10.5: Test `deletePlayerStats`: (a) admin can delete a stats entry, (b) non-admin user gets `NOT_AUTHORIZED` error, (c) deleting a stats entry from a different team throws `NOT_FOUND`, (d) deleted entry no longer appears in `getPlayerStats` results, (e) non-existent statsId throws `NOT_FOUND`.

- [ ] **Task 11: Final validation** (AC: all)
  - [ ] 11.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 11.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 11.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [ ] 11.4: Start the dev server — navigate to `/players/[playerId]`, click the "Performance" tab. Verify the empty state is displayed ("No match stats recorded yet").
  - [ ] 11.5: As admin, verify the "Add Match Stats" button is visible. Click it — verify the form dialog opens with all fields and correct defaults.
  - [ ] 11.6: Submit the form with valid data — verify the entry appears in the stats table, sorted correctly. Verify the success toast appears.
  - [ ] 11.7: Add multiple entries — verify the table sorts by most recent match first and the summary stats update correctly.
  - [ ] 11.8: Click edit on a stats row — verify the form pre-populates with existing values. Update a field and submit — verify the table updates in real time.
  - [ ] 11.9: Click delete on a stats row — verify the confirmation dialog appears. Confirm — verify the entry disappears from the table.
  - [ ] 11.10: Log in as a non-admin user (e.g., coach or player) — navigate to a player's Performance tab. Verify stats are visible (read-only) but add/edit/delete actions are NOT visible.
  - [ ] 11.11: Verify real-time updates: open two browser tabs, add a stats entry in one tab — verify it appears in the other tab without refresh.
  - [ ] 11.12: Test form validation: submit with empty opponent — verify inline error. Enter minutes > 120 — verify validation error. Enter yellow cards > 2 — verify validation error.

## Dev Notes

### Architecture Context

This is the **performance stats CRUD story for Epic 5**. It builds directly on Story 5.1 (which defines the `playerStats` table schema and the "Performance" tab placeholder) and Story 5.2 (which provides the player creation mechanism). This story delivers the full read/write path for per-match performance statistics.

This story directly implements:

- **FR22:** Admin can manually enter per-match performance stats for a player (date, opponent, minutes, goals, assists, yellow cards, red cards)
- **NFR2:** Real-time updates propagate via Convex subscriptions (stats entries appear/update/disappear for all connected clients)
- **NFR5:** Data access enforced at the Convex mutation layer (`requireRole(ctx, ["admin"])` for all write operations)
- **NFR6:** Multi-tenant isolation via `teamId` scoping on `playerStats` table

Subsequent stories that build on or relate to this:

- **Story 5.4 (Physical & Fitness Data Log):** Follows the same CRUD pattern established here, but for the `playerFitness` table
- **Story 5.5 (Injury History):** Follows the same CRUD pattern but with medical-only role restriction
- **Story 5.6 (Player Status Management & Self-Service):** Players viewing their own stats is established here (read-only access)

### Key Architectural Decisions from architecture.md

- **Authorization Pattern:** `requireAuth(ctx)` returns `{ user, teamId }` for read operations (any authenticated team member can view stats). `requireRole(ctx, ["admin"])` for write operations (only admins can add/edit/delete stats). Every mutation starts with the appropriate auth check. No middleware — explicit function calls. [Source: architecture.md#Authentication-&-Security]

- **RBAC Model:** Single role enum on user record: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. Only admins can write performance stats. All authenticated team members can read them. [Source: architecture.md#Authentication-&-Security]

- **Multi-tenant Isolation:** Every table includes `teamId`. Every query/mutation filters by the authenticated user's team. Enforced at the auth helper level. [Source: architecture.md#Authentication-&-Security]

- **Data Model:** `playerStats` table is a separate table (not an array on `players`) because each entry has independent lifecycle, metadata (`createdBy`, `createdAt`), and needs to be queried by `playerId`. [Source: architecture.md#Data-Architecture]

- **Form Pattern:** `react-hook-form` + Zod schema + `zodResolver` + `useMutation`. [Source: architecture.md#Process-Patterns]

- **Error Handling:** `ConvexError` with standardized codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

- **Dates:** Stored as Unix timestamp ms (`number`) in Convex. Displayed using `date-fns` formatting (e.g., `format(new Date(matchDate), "dd MMM yyyy")`). Never stored as strings. [Source: architecture.md#Format-Patterns]

- **Loading States:** Convex `useQuery` returns `undefined` while loading — render `Skeleton` components. Empty array renders empty state. [Source: architecture.md#Process-Patterns]

- **Component Organization:** Feature-grouped at `components/players/`. [Source: architecture.md#Structure-Patterns]

- **Convex Organization:** `convex/players/queries.ts` for reads, `convex/players/mutations.ts` for writes. Tests co-located in `convex/players/__tests__/`. [Source: architecture.md#Structure-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 5.3) state:

> **Given** the admin is viewing a player's profile
> **When** the admin navigates to the "Performance" tab and clicks "Add Match Stats"
> **Then** a form appears with fields: match date, opponent, minutes played, goals, assists, yellow cards, red cards
> **When** the admin submits the form
> **Then** the entry appears in a chronological log on the player's profile
> **And** the log displays as a table sorted by most recent match first
> **And** existing entries can be edited or deleted by admins

**This story extends and decomposes the AC as follows:**

- **Summary stats section:** Not in the original AC but adds significant value — admins and coaches can see aggregated totals (total goals, assists, matches, etc.) at a glance without manually tallying. Computed on the frontend from query results (no separate backend endpoint needed).
- **Field validation ranges:** The original AC doesn't specify validation ranges. This story adds: `minutesPlayed` 0-120 (standard match length including extra time), `yellowCards` 0-2 (a player can receive 2 yellows), `redCards` 0-1 (a player can receive 1 red), `goals` >= 0, `assists` >= 0. Validated both client-side (Zod) and server-side (mutation).
- **Delete confirmation dialog:** Not in the original AC but a standard UX pattern to prevent accidental data loss. Follows destructive action best practices.
- **Read-only access for non-admins:** The original AC only mentions admin writing stats. This story explicitly allows all authenticated team members to view stats (read-only), enabling coaches, analysts, and the player themselves to see performance data. This aligns with FR31 (players can view their own profile).
- **`createdBy` tracking:** Each stats entry records which admin created it, enabling audit trail visibility. Defined in the schema (Story 5.1) but utilized and enforced here.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `playerStats` table defined in schema | Story 5.1 | `packages/backend/convex/table/playerStats.ts` must exist with all fields and indexes (`by_playerId`, `by_teamId`) |
| `players` table defined in schema | Story 5.1 | `packages/backend/convex/table/players.ts` must exist |
| `getPlayerById` query | Story 5.1 | `packages/backend/convex/players/queries.ts` must export `getPlayerById` |
| `getPlayerTabAccess` query | Story 5.1 | Must exist to determine if user is admin for conditional UI rendering |
| Player profile page at `/players/[playerId]` | Story 5.1 | `apps/web/src/app/(app)/players/[playerId]/page.tsx` must exist with tabbed layout |
| `PlayerProfileTabs` component with "Performance" tab placeholder | Story 5.1 | Must exist and render tab shell |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export these |
| shadcn/ui components: Dialog, AlertDialog, Table, Button, Input, Form, Popover, DropdownMenu, Badge, Card | Story 1.2 | All must be available in `components/ui/` |
| `react-day-picker` (date picker) | Template | Already installed (v9.13.0) |
| `date-fns` (date formatting) | Template | Already installed (v4.1.0) |

### Current State (Baseline)

**`convex/table/playerStats.ts`:** Exists from Story 5.1. Defines the `playerStats` table with fields: `teamId`, `playerId`, `matchDate`, `opponent`, `minutesPlayed`, `goals`, `assists`, `yellowCards`, `redCards`, `createdBy`, `createdAt`, `updatedAt`. Indexes: `by_playerId`, `by_teamId`.

**`convex/players/queries.ts`:** Exists from Story 5.1 with `getPlayers`, `getPlayerById`, `getPlayerTabAccess` queries. **No `getPlayerStats` query** — must be added.

**`convex/players/mutations.ts`:** May exist from Story 5.2 with `createPlayer`, `invitePlayer`, `acceptPlayerInvite` mutations. **No stats-related mutations** — must be added.

**`apps/web/src/components/players/StatsLog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/StatsFormDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/DeleteStatsDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/PlayerProfileTabs.tsx`:** Exists from Story 5.1. The "Performance" tab currently renders a placeholder ("Coming soon"). Must be updated to render `StatsLog`.

**Auth utilities:** `requireAuth(ctx)` and `requireRole(ctx, roles)` exist in `packages/backend/convex/lib/auth.ts` from Story 2.1. `requireRole(ctx, ["admin"])` is used in Story 5.2 mutations.

**UI components available:** `Dialog`, `AlertDialog`, `Table`, `Button`, `Input`, `Form`, `Popover`, `DropdownMenu`, `Badge`, `Card`, `Skeleton`, `Spinner` — all present in `components/ui/`.

### Existing Patterns to Follow

**Stats CRUD follows the same pattern as all Convex mutations in this project:**

```typescript
// Query pattern (read):
export const getPlayerStats = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx)
    const player = await ctx.db.get(playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect()

    // Sort by matchDate descending (most recent first)
    return stats.sort((a, b) => b.matchDate - a.matchDate)
  },
})
```

```typescript
// Mutation pattern (write):
export const addPlayerStats = mutation({
  args: {
    playerId: v.id("players"),
    matchDate: v.number(),
    opponent: v.string(),
    minutesPlayed: v.number(),
    goals: v.number(),
    assists: v.number(),
    yellowCards: v.number(),
    redCards: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"])
    const player = await ctx.db.get(args.playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    // Validate ranges
    if (args.minutesPlayed < 0 || args.minutesPlayed > 120) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Minutes played must be between 0 and 120" })
    }
    // ... other validations

    return await ctx.db.insert("playerStats", {
      teamId,
      playerId: args.playerId,
      matchDate: args.matchDate,
      opponent: args.opponent,
      minutesPlayed: args.minutesPlayed,
      goals: args.goals,
      assists: args.assists,
      yellowCards: args.yellowCards,
      redCards: args.redCards,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

**Form Dialog Pattern (from Story 5.2 ProfileForm):**

```typescript
const form = useForm<StatsFormData>({
  resolver: zodResolver(statsSchema),
  defaultValues: existingStats
    ? {
        matchDate: existingStats.matchDate,
        opponent: existingStats.opponent,
        minutesPlayed: existingStats.minutesPlayed,
        goals: existingStats.goals,
        assists: existingStats.assists,
        yellowCards: existingStats.yellowCards,
        redCards: existingStats.redCards,
      }
    : {
        matchDate: Date.now(),
        opponent: "",
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
})

const addStats = useMutation(api.players.mutations.addPlayerStats)
const updateStats = useMutation(api.players.mutations.updatePlayerStats)

const onSubmit = async (data: StatsFormData) => {
  try {
    if (existingStats) {
      await updateStats({ statsId: existingStats._id, ...data })
      toast.success("Match stats updated")
    } else {
      await addStats({ playerId, ...data })
      toast.success("Match stats added")
    }
    onClose()
  } catch (error) {
    if (error instanceof ConvexError) {
      toast.error(error.data.message)
    }
  }
}
```

**Date Picker Pattern (using react-day-picker + Popover):**

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

**Summary Stats Computation:**

```typescript
const summaryStats = useMemo(() => {
  if (!stats || stats.length === 0) return null
  return {
    totalMatches: stats.length,
    totalGoals: stats.reduce((sum, s) => sum + s.goals, 0),
    totalAssists: stats.reduce((sum, s) => sum + s.assists, 0),
    totalYellowCards: stats.reduce((sum, s) => sum + s.yellowCards, 0),
    totalRedCards: stats.reduce((sum, s) => sum + s.redCards, 0),
    avgMinutes: Math.round(stats.reduce((sum, s) => sum + s.minutesPlayed, 0) / stats.length),
  }
}, [stats])
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/players/queries.ts` | Modified | Add `getPlayerStats` query |
| `packages/backend/convex/players/mutations.ts` | Modified | Add `addPlayerStats`, `updatePlayerStats`, `deletePlayerStats` mutations |
| `apps/web/src/components/players/StatsLog.tsx` | Created | Performance stats table + summary section |
| `apps/web/src/components/players/StatsFormDialog.tsx` | Created | Add/edit stats form in a dialog |
| `apps/web/src/components/players/DeleteStatsDialog.tsx` | Created | Confirmation dialog for stats deletion |
| `apps/web/src/components/players/PlayerProfileTabs.tsx` | Modified | Replace "Performance" tab placeholder with `StatsLog` component |
| `packages/backend/convex/players/__tests__/stats.test.ts` | Created | Unit tests for stats queries and mutations |

### What This Story Does NOT Include

- **No batch import of stats** — only manual per-match entry via form
- **No stats charts or visualizations** — only the table and summary totals (charts can be added as a future enhancement)
- **No stats export (CSV/PDF)** — out of Sprint 1 scope
- **No stats comparison between players** — single player view only
- **No match-level stats aggregation across all players** — this is player-scoped only
- **No automatic stats import from external providers** — that's post-Sprint 1 (requires Story 5.7 integrations)
- **No fitness data CRUD** — that's Story 5.4
- **No injury management** — that's Story 5.5
- **No coach/analyst write access** — only admins can add/edit/delete in Sprint 1. Role expansion can be considered in future sprints.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 5.1 not complete (no `playerStats` schema, no player profile page) | This story is fully blocked until Story 5.1 is done. Check for `convex/table/playerStats.ts` and `app/(app)/players/[playerId]/page.tsx` before starting. |
| Story 5.2 not complete (no players exist to add stats to) | Story 5.2 provides the player creation mechanism. Without it, there are no players. Can test with manually inserted player documents in Convex dashboard if needed. |
| `requireRole` helper not available (Story 2.1 not complete) | Fallback: use `requireAdmin(ctx)` from `convex/table/admin.ts` for mutations. Use basic auth check for queries. |
| Date picker value conversion issues (Date object vs Unix timestamp) | The date picker returns a `Date` object; convert via `.getTime()` before passing to mutation. The Zod schema accepts `number` (timestamp). Add explicit conversion in the form's `onSelect` handler. |
| Number input type coercion (string to number) | HTML number inputs return strings. Use `z.coerce.number()` in the Zod schema or explicit `Number()` conversion in the form's transform/onSubmit handler. Test that zero values are not treated as empty. |
| Large number of stats entries could slow the table | For Sprint 1 scale (1 team, ~30 players, ~40 matches/season = ~1200 entries max across all players), in-memory sort is fine. Pagination can be added if needed. |

### Performance Considerations

- **Index usage:** `by_playerId` index on `playerStats` ensures fast lookup per player. No full table scan needed.
- **Sorting:** In-memory sort by `matchDate` descending is O(n log n) but n is small (< 50 entries per player per season).
- **Summary computation:** Frontend `useMemo` reduces across the stats array once per render. Negligible cost for typical dataset sizes.
- **Real-time updates:** Convex subscription on `getPlayerStats` triggers re-render only when that player's stats change. No unnecessary updates from other players' data.

### Alignment with Architecture Document

- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireAuth` for reads, `requireRole(ctx, ["admin"])` for writes, `teamId` scoping
- **Data Model:** Matches `architecture.md § Data Architecture` — `playerStats` as a separate table (Story 5.1 defined schema, this story adds CRUD)
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — `StatsLog.tsx` in `components/players/`, profile page at `app/(app)/players/[playerId]/page.tsx`
- **Convex Organization:** Matches `architecture.md § Convex Function Organization` — queries in `convex/players/queries.ts`, mutations in `convex/players/mutations.ts`
- **Naming:** Matches `architecture.md § Naming Patterns` — camelCase Convex functions (`getPlayerStats`, `addPlayerStats`), PascalCase components (`StatsLog.tsx`, `StatsFormDialog.tsx`)
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/players/__tests__/`
- **Dates:** Matches `architecture.md § Format Patterns` — timestamps as numbers, `date-fns` for display
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with `NOT_FOUND`, `NOT_AUTHORIZED`, `VALIDATION_ERROR` codes
- **Form Pattern:** Matches `architecture.md § Process Patterns` — `react-hook-form` + `zodResolver` + `useMutation` + `toast`
- **Loading States:** Matches `architecture.md § Process Patterns` — `Skeleton` for loading, empty state for no data
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, RBAC model (6 roles), teamId scoping
- [Source: architecture.md#Data-Architecture] — Separate `playerStats` table for data with metadata and independent lifecycle
- [Source: architecture.md#Frontend-Architecture] — Page structure (`app/(app)/players/[playerId]/page.tsx`), component organization (`components/players/`), state management (useQuery)
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, error handling, no REST
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting, ConvexError codes, mutation feedback via toast
- [Source: architecture.md#Process-Patterns] — Form pattern (react-hook-form + Zod + zodResolver), loading states, mutation feedback
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: epics.md#Story-5.3] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR22 mapped to Epic 5
- [Source: Story-5.1] — `playerStats` table schema definition, `PlayerProfileTabs` component with placeholder tabs, `getPlayerTabAccess` query

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
