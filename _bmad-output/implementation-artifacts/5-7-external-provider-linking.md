# Story 5.7: External Provider Linking

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to configure external provider IDs on a player profile,
so that future integrations with GPS trackers and performance platforms can link to the right player.

## Acceptance Criteria

1. **"Integrations" tab on the player profile page shows the external providers section** — When an admin views a player's profile at `/players/[playerId]` and clicks the "Integrations" tab, the placeholder content ("Coming soon") is replaced with a real "External Providers" management UI. The tab is always visible to all authenticated users (read access is not restricted), but only users with the `admin` role see the "Add Provider" button and edit/delete controls. Non-admin users see a read-only list of linked providers (or an empty state if none exist).

2. **Admin can add a new external provider link** — When an admin clicks "Add Provider" (or "Link Provider"), an inline form or dialog appears with two fields: `Provider Name` (text input, required — e.g., "Catapult", "GPS Sports", "Hudl", "StatsBomb", "Opta") and `Account ID / URL` (text input, required — e.g., an external player ID, API key, or URL). Both fields must be non-empty strings (whitespace-only values are rejected). The provider name must be unique per player — attempting to add a duplicate provider name shows a validation error ("This provider is already linked"). On successful submission, the provider link is saved and appears in the list immediately (real-time via Convex subscription). A success toast "Provider linked" is shown.

3. **Multiple providers can be linked to a single player** — The player's external providers list supports an arbitrary number of entries. Each entry displays the provider name and account ID/URL as a row. The list is displayed in a table or card-list format sorted alphabetically by provider name. If no providers are linked, an empty state is shown: an icon (e.g., `IconPlug`, `IconLink`, or `IconPlugConnected`), text "No external providers linked", and subtext "Link GPS trackers, performance platforms, and other services to this player." (with the "Link Provider" CTA for admins).

4. **Admin can edit an existing provider link** — Each provider entry shows an edit action (inline edit button or row action menu). Clicking edit opens the entry in an inline editable state or a dialog pre-populated with the current provider name and account ID. The admin can change either field. The same validation rules apply (non-empty, unique provider name — excluding the current entry from the uniqueness check). On save, the entry is updated and a success toast "Provider updated" is shown.

5. **Admin can remove an existing provider link** — Each provider entry shows a delete action. Clicking delete shows a confirmation dialog: "Remove [Provider Name]? This will unlink this provider from [Player Name]. This action cannot be undone." On confirmation, the entry is removed from the list. A success toast "Provider removed" is shown.

6. **`updateExternalProviders` mutation validates and persists provider links** — A mutation `players.mutations.updateExternalProviders` accepts `{ playerId: Id<"players">, externalProviderLinks: Array<{ provider: string, accountId: string }> }`. It calls `requireRole(ctx, ["admin"])`. Validates the player exists and belongs to the admin's team (throw `NOT_FOUND` if not). Validates every entry: `provider` and `accountId` are non-empty trimmed strings (throw `VALIDATION_ERROR` if empty/whitespace-only). Validates no duplicate provider names within the array (case-insensitive comparison — throw `VALIDATION_ERROR` with message "Duplicate provider name: [name]"). Patches the `players` document with the new `externalProviderLinks` array and `updatedAt: Date.now()`. Returns `{ success: true }`.

7. **`getExternalProviders` query returns provider links for a player** — A query `players.queries.getExternalProviders` accepts `{ playerId: Id<"players"> }`. Calls `requireAuth(ctx)`. Fetches the player, validates team membership. Returns `{ providers: Array<{ provider: string, accountId: string }>, canEdit: boolean }` where `canEdit` is `true` only for admin role. Returns the `externalProviderLinks` array sorted alphabetically by `provider` name (or an empty array if the field is `undefined` or `null`).

8. **The feature is informational — no active data import** — The "Integrations" tab displays a subtle info banner or callout at the top: "External provider links are saved for future integrations. No data is imported automatically at this time." This sets correct expectations for admins and avoids confusion about missing data syncing.

9. **Real-time updates** — Because the UI uses Convex `useQuery`, any provider links added, edited, or removed by another admin update in real time for all connected clients without manual refresh.

10. **Team-scoped data access enforced** — All queries and mutations filter by `teamId` from `requireAuth`. No cross-team player data is ever returned or modified. Access control is enforced at the Convex layer, not just the UI.

## Tasks / Subtasks

- [x] **Task 1: Create `getExternalProviders` query** (AC: #7, #9, #10)
  - [x] 1.1: In `packages/backend/convex/players/queries.ts`, add a new exported query `getExternalProviders`. Args: `{ playerId: v.id("players") }`. Call `requireAuth(ctx)` to get `{ user, teamId }`.
  - [x] 1.2: Fetch the player via `ctx.db.get(playerId)`. Validate `player !== null` and `player.teamId === teamId`. If validation fails, return `{ providers: [], canEdit: false }` (safe default, no error thrown — consistent with other read queries returning empty results for inaccessible data).
  - [x] 1.3: Determine `canEdit` by checking `user.role === "admin"`.
  - [x] 1.4: Return `{ providers: (player.externalProviderLinks ?? []).sort((a, b) => a.provider.localeCompare(b.provider)), canEdit }`.

- [x] **Task 2: Create `updateExternalProviders` mutation** (AC: #6, #10)
  - [x] 2.1: In `packages/backend/convex/players/mutations.ts`, add a new exported mutation `updateExternalProviders`. Args: `{ playerId: v.id("players"), externalProviderLinks: v.array(v.object({ provider: v.string(), accountId: v.string() })) }`.
  - [x] 2.2: Call `requireRole(ctx, ["admin"])` to get `{ user, teamId }`.
  - [x] 2.3: Fetch the player via `ctx.db.get(playerId)`. Validate `player !== null` and `player.teamId === teamId` — throw `ConvexError({ code: "NOT_FOUND", message: "Player not found" })` if not.
  - [x] 2.4: Validate each entry: trim `provider` and `accountId`, throw `ConvexError({ code: "VALIDATION_ERROR", message: "Provider name and account ID are required" })` if either is empty after trimming.
  - [x] 2.5: Validate uniqueness: build a set of lowercased provider names. If a duplicate is found, throw `ConvexError({ code: "VALIDATION_ERROR", message: "Duplicate provider name: [name]" })`.
  - [x] 2.6: Normalize entries: map over the array, trimming whitespace from `provider` and `accountId` values.
  - [x] 2.7: Patch the player document: `ctx.db.patch(playerId, { externalProviderLinks: normalizedLinks, updatedAt: Date.now() })`.
  - [x] 2.8: Return `{ success: true }`.

- [x] **Task 3: Build `ExternalProviders` component** (AC: #1, #2, #3, #4, #5, #8, #9)
  - [x] 3.1: Create `apps/web/src/components/players/ExternalProviders.tsx`. Accept props: `{ playerId: Id<"players"> }`.
  - [x] 3.2: Call `useQuery(api.players.queries.getExternalProviders, { playerId })` to get `{ providers, canEdit }`. Handle loading state (return `Skeleton` components when query returns `undefined`).
  - [x] 3.3: Render the info banner at the top using a shadcn `Alert` or `Callout` component with an info icon: "External provider links are saved for future integrations. No data is imported automatically at this time."
  - [x] 3.4: Render the provider list section with a heading "Linked Providers" and, if `canEdit` is true, an "Add Provider" button (shadcn `Button` with a `+` or link icon).
  - [x] 3.5: **Empty state:** When `providers` is empty, render a centered empty state: an icon (`IconPlug`, `IconLink`, or `IconPlugConnected` from `@tabler/icons-react` or `lucide-react`), "No external providers linked" heading, "Link GPS trackers, performance platforms, and other services to this player." subtext. If `canEdit`, show an "Add Provider" CTA button.
  - [x] 3.6: **Provider list:** When providers exist, render each entry as a row/card showing: provider name (bold/primary text), account ID/URL (secondary/muted text). If `canEdit`, each row has an action menu (shadcn `DropdownMenu` or inline icon buttons) with "Edit" and "Remove" actions.
  - [x] 3.7: **Add/Edit form:** Use a shadcn `Dialog` component with a form (react-hook-form + Zod validation). Fields: Provider Name (`Input`, required, min 1 char after trim), Account ID / URL (`Input`, required, min 1 char after trim). For edit mode, pre-populate fields with current values. Form title: "Link Provider" (add) or "Edit Provider" (edit).
  - [x] 3.8: **Add submission logic:** On add, take the current `providers` array from the query, append the new entry, and call `updateExternalProviders` mutation with the full array. Validate client-side that the provider name is not already in the list (case-insensitive). On success, close the dialog and show `toast.success("Provider linked")`.
  - [x] 3.9: **Edit submission logic:** On edit, take the current `providers` array, replace the entry at the index being edited with the new values, and call `updateExternalProviders` mutation with the full array. Validate uniqueness excluding the current index. On success, close the dialog and show `toast.success("Provider updated")`.
  - [x] 3.10: **Delete logic:** Show a shadcn `AlertDialog` with confirmation text: "Remove [Provider Name]? This will unlink this provider from [Player Name]. This action cannot be undone." On confirm, take the current `providers` array, filter out the entry at the index being deleted, and call `updateExternalProviders` mutation with the remaining array. On success, show `toast.success("Provider removed")`.
  - [x] 3.11: **Error handling:** Wrap mutation calls in try/catch. On `ConvexError`, display `error.data.message` via `toast.error()`. On unknown errors, display a generic "Something went wrong" toast.

- [x] **Task 4: Wire `ExternalProviders` into the player profile "Integrations" tab** (AC: #1)
  - [x] 4.1: In `apps/web/src/components/players/PlayerProfileTabs.tsx`, locate the "Integrations" tab content rendering.
  - [x] 4.2: Replace the placeholder content (icon + "Coming soon" text) with: `<ExternalProviders playerId={playerId} playerName={...} />`.
  - [x] 4.3: Import `ExternalProviders` from `./ExternalProviders`.

- [x] **Task 5: Write backend unit tests** (AC: #6, #7, #10)
  - [x] 5.1: In `packages/backend/convex/players/__tests__/queries.test.ts` (create if not exists), add tests for `getExternalProviders`:
    - (a) Returns empty array and `canEdit: false` for player with no external providers when called by a non-admin user.
    - (b) Returns empty array and `canEdit: true` for player with no external providers when called by an admin user.
    - (c) Returns provider links sorted alphabetically by provider name.
    - (d) Returns `{ providers: [], canEdit: false }` for a player from a different team (no error thrown).
    - (e) Returns `{ providers: [], canEdit: false }` for a non-existent player ID.
  - [x] 5.2: In `packages/backend/convex/players/__tests__/mutations.test.ts` (create if not exists), add tests for `updateExternalProviders`:
    - (a) Admin can add a single provider link to a player with no existing links.
    - (b) Admin can add multiple provider links at once.
    - (c) Admin can update the full array (simulating edit of one entry).
    - (d) Admin can set an empty array (simulating removal of all providers).
    - (e) Throws `NOT_AUTHORIZED` when called by a non-admin user.
    - (f) Throws `NOT_FOUND` when called with a player ID from a different team.
    - (g) Throws `VALIDATION_ERROR` when a provider name is empty or whitespace-only.
    - (h) Throws `VALIDATION_ERROR` when an account ID is empty or whitespace-only.
    - (i) Throws `VALIDATION_ERROR` when duplicate provider names are provided (case-insensitive).
    - (j) Trims whitespace from provider name and account ID before saving.
    - (k) Updates `updatedAt` timestamp on the player document.

- [x] **Task 6: Final validation** (AC: all)
  - [x] 6.1: Run `pnpm typecheck` — passed with zero errors.
  - [x] 6.2: Run `pnpm lint` — web/backend pass (native pre-existing failures unrelated).
  - [x] 6.3: Run backend tests (`vitest run` in packages/backend) — all 465 tests pass (21 files).
  - [ ] 6.4: Start the dev server — navigate to `/players/[playerId]`, click the "Integrations" tab. Verify the info banner and empty state render correctly.
  - [ ] 6.5: As an admin, click "Add Provider". Enter a provider name and account ID. Submit. Verify the provider appears in the list with a success toast.
  - [ ] 6.6: Add a second provider. Verify both appear sorted alphabetically.
  - [ ] 6.7: Try adding a provider with a duplicate name (case-insensitive). Verify a validation error is shown.
  - [ ] 6.8: Edit an existing provider — change the account ID. Verify the update persists with a success toast.
  - [ ] 6.9: Delete a provider. Verify the confirmation dialog appears. Confirm deletion. Verify the provider is removed with a success toast.
  - [ ] 6.10: Log in as a non-admin user. Navigate to the same player's "Integrations" tab. Verify providers are visible (read-only) but no add/edit/delete controls are shown.
  - [ ] 6.11: Verify real-time: Open two browser tabs as admin, add a provider in one tab. Verify it appears in the other tab without refresh.

## Dev Notes

### Architecture Context

This is the **final story in Epic 5 (Player Profiles & Management)**. It delivers the "Integrations" tab CRUD for external provider links on player profiles. The feature is intentionally informational in Sprint 1 — it stores provider IDs for future integration work (GPS trackers, performance analytics platforms) but does not perform any active data import or sync.

The data model for this feature was already defined in Story 5.1: the `externalProviderLinks` field on the `players` table, typed as `v.optional(v.array(v.object({ provider: v.string(), accountId: v.string() })))`. This story builds the backend mutation and frontend CRUD UI on top of that existing field.

**Stories that must be complete before this story:**

- **Story 5.1 (Player Data Model & Profile List):** Defines the `players` table schema including the `externalProviderLinks` field, the `getPlayerById` query, the `PlayerProfileTabs` component with the "Integrations" placeholder tab, and the player profile page at `/players/[playerId]`.
- **Story 5.2 (Player Profile Creation & Onboarding):** Provides the `createPlayer` mutation so that player documents exist in the database to be modified.

This story directly implements:

- **FR25:** Admin can configure external provider account/ID links on a player profile

### Key Architectural Decisions from architecture.md

- **Data Modeling — Hybrid Normalization (Array on Parent):** `externalProviderLinks` is stored as an array of objects directly on the `players` table, not as a separate junction table. This is the correct pattern for small, bounded lists that are always read with the parent document and don't need to be queried independently. [Source: architecture.md#Data-Architecture]

- **Mutation Pattern — Full Array Replacement:** The mutation receives the entire `externalProviderLinks` array (not individual add/remove operations). This simplifies the backend to a single mutation that validates and persists the complete state. The frontend manages add/edit/remove logic by manipulating the array locally and sending the full replacement. This avoids race conditions and keeps the mutation idempotent. [Source: architecture.md#API-&-Communication-Patterns]

- **Authorization Pattern:** `requireRole(ctx, ["admin"])` for the write mutation (only admins can modify provider links). `requireAuth(ctx)` for the read query (all authenticated team members can view linked providers). The query also returns a `canEdit` boolean so the frontend knows whether to render edit controls, but actual write access is enforced server-side in the mutation. Defense in depth. [Source: architecture.md#Authentication-&-Security]

- **RBAC Model:** Single role enum on user record. Only `admin` role can modify external provider links. All other roles get read-only access. [Source: architecture.md#Authentication-&-Security]

- **State Management:** Convex `useQuery` for real-time provider data. Local React state for dialog open/closed, form values, edit index. No global state. [Source: architecture.md#Frontend-Architecture]

- **Component Organization:** `ExternalProviders.tsx` in `components/players/` (feature-grouped, not `components/forms/` or `components/tables/`). [Source: architecture.md#Structure-Patterns]

- **Error Handling:** `ConvexError` with standardized codes (`NOT_FOUND`, `VALIDATION_ERROR`, `NOT_AUTHORIZED`). Frontend catches via `ConvexError` and displays via sonner `toast.error()`. [Source: architecture.md#Format-Patterns]

- **Form Pattern:** `react-hook-form` + `Zod` for the add/edit dialog form. `zodResolver` for schema validation. [Source: architecture.md#Process-Patterns]

- **Loading States:** `useQuery` returns `undefined` while loading — render `Skeleton`. Empty providers array renders empty state component. [Source: architecture.md#Process-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 5.7) state:

> **Given** the admin is viewing a player's profile
> **When** the admin navigates to an "Integrations" or "External Providers" section
> **Then** a form allows adding key-value pairs (provider name, account ID/URL)
> **And** multiple providers can be linked to a single player
> **And** the section is informational for now (no active data import in Sprint 1)

**This story extends the AC with:**

- **Edit and delete capabilities:** The original AC mentions only adding. This story adds edit and delete for a complete CRUD experience — necessary for correcting mistakes or removing stale provider links.
- **Client-side and server-side validation:** Provider name uniqueness enforcement (case-insensitive), non-empty field validation, and whitespace trimming. Not specified in the original AC but architecturally necessary for data integrity.
- **Read-only access for non-admins:** The original AC implies admin-only access. This story makes the list visible (read-only) to all authenticated team members but restricts CRUD to admins. This allows coaches and analysts to see which providers are linked without requiring admin privileges.
- **Info banner:** Explicit UI communication that the feature is informational only. Not in the original AC but prevents user confusion about missing data syncing.
- **`canEdit` pattern from query:** The query returns edit permission alongside data. This matches the established `getPlayerTabAccess` pattern from Story 5.1 and avoids frontend role-checking logic.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `players` table with `externalProviderLinks` field in schema | Story 5.1 | `packages/backend/convex/table/players.ts` must define `externalProviderLinks: v.optional(v.array(v.object({ provider: v.string(), accountId: v.string() })))` |
| `getPlayerById` query | Story 5.1 | `packages/backend/convex/players/queries.ts` must export `getPlayerById` |
| `PlayerProfileTabs` component with "Integrations" tab | Story 5.1 | `apps/web/src/components/players/PlayerProfileTabs.tsx` must render an "Integrations" tab (currently placeholder) |
| Player profile page at `/players/[playerId]` | Story 5.1 | `apps/web/src/app/(app)/players/[playerId]/page.tsx` must exist and render `PlayerProfileTabs` |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export `requireAuth(ctx)` returning `{ user, teamId }` and `requireRole(ctx, roles)` |
| `createPlayer` mutation (so test players exist) | Story 5.2 | `packages/backend/convex/players/mutations.ts` must export `createPlayer` |
| shadcn/ui Dialog, AlertDialog, Input, Button, Alert, Table, DropdownMenu components | Story 1.2 | All present in `apps/web/src/components/ui/` |
| react-hook-form + Zod installed | Template | Already in monorepo dependencies |
| sonner toast | Template | Already configured in root layout |

### Current State (Baseline)

**`players` table schema:** Defined in Story 5.1 spec with `externalProviderLinks: v.optional(v.array(v.object({ provider: v.string(), accountId: v.string() })))`. This field may be `undefined` (no providers linked) or an array of `{ provider, accountId }` objects. **Note:** The actual code for the players table may or may not be deployed yet depending on Story 5.1 implementation status. If not, this story is blocked on Story 5.1.

**`PlayerProfileTabs` component:** Per Story 5.1 spec, the "Integrations" tab currently renders a placeholder with "Coming soon" content. This story replaces that placeholder.

**`convex/players/queries.ts`:** Should exist from Story 5.1 with `getPlayers`, `getPlayerById`, and `getPlayerTabAccess`. This story adds `getExternalProviders`.

**`convex/players/mutations.ts`:** Should exist from Story 5.2 with `createPlayer`. This story adds `updateExternalProviders`.

**No ExternalProviders component exists.** Must be created from scratch.

### Implementation Patterns

**Full-Array Replacement Pattern:**

The mutation receives the complete `externalProviderLinks` array, not individual operations. The frontend manages the array:

```typescript
// Adding a provider
const currentProviders = providers ?? []
const newProviders = [...currentProviders, { provider: name.trim(), accountId: id.trim() }]
await updateExternalProviders({ playerId, externalProviderLinks: newProviders })

// Editing a provider (at index editIndex)
const updatedProviders = providers.map((p, i) =>
  i === editIndex ? { provider: newName.trim(), accountId: newId.trim() } : p
)
await updateExternalProviders({ playerId, externalProviderLinks: updatedProviders })

// Removing a provider (at index removeIndex)
const remainingProviders = providers.filter((_, i) => i !== removeIndex)
await updateExternalProviders({ playerId, externalProviderLinks: remainingProviders })
```

**Provider Name Uniqueness Check (Server-Side):**

```typescript
// In updateExternalProviders mutation
const seen = new Set<string>()
for (const link of externalProviderLinks) {
  const key = link.provider.trim().toLowerCase()
  if (seen.has(key)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `Duplicate provider name: ${link.provider.trim()}`,
    })
  }
  seen.add(key)
}
```

**Zod Schema for Add/Edit Form:**

```typescript
import { z } from "zod"

const providerFormSchema = z.object({
  provider: z.string().trim().min(1, "Provider name is required"),
  accountId: z.string().trim().min(1, "Account ID or URL is required"),
})

type ProviderFormData = z.infer<typeof providerFormSchema>
```

**Component Local State:**

```typescript
const [dialogOpen, setDialogOpen] = useState(false)
const [editIndex, setEditIndex] = useState<number | null>(null) // null = add mode, number = edit mode
const [deleteIndex, setDeleteIndex] = useState<number | null>(null) // controls AlertDialog visibility
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/players/queries.ts` | Modified | Add `getExternalProviders` query |
| `packages/backend/convex/players/mutations.ts` | Modified | Add `updateExternalProviders` mutation |
| `apps/web/src/components/players/ExternalProviders.tsx` | Created | Full CRUD component for external provider links |
| `apps/web/src/components/players/PlayerProfileTabs.tsx` | Modified | Replace "Integrations" tab placeholder with `ExternalProviders` component |
| `packages/backend/convex/players/__tests__/queries.test.ts` | Modified | Add `getExternalProviders` tests |
| `packages/backend/convex/players/__tests__/mutations.test.ts` | Modified | Add `updateExternalProviders` tests |

### What This Story Does NOT Include

- **No new Convex schema tables or fields** — the `externalProviderLinks` field on `players` is already defined in Story 5.1
- **No data import from external providers** — this is explicitly informational only in Sprint 1
- **No API integration with GPS trackers or performance platforms** — deferred to future sprints
- **No webhook endpoints for external services** — not in scope
- **No player creation or profile editing** — those are Stories 5.2 and 5.6
- **No changes to the player list page** — external providers are only visible on the profile "Integrations" tab
- **No notification creation** — adding a provider link does not trigger notifications

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Stories 5.1 and 5.2 not yet implemented | Check that `players` table, `getPlayerById` query, `PlayerProfileTabs` component, and player profile page exist before starting. If any are missing, this story is blocked. |
| `externalProviderLinks` field not yet on players table | Verify the players table schema includes the field. If Story 5.1 was implemented without it, add it as part of this story (minor schema addition). |
| Concurrent edits to provider links (two admins editing at same time) | Full-array replacement means last write wins. Acceptable for Sprint 1 (single admin is the expected scenario). The real-time subscription ensures both admins see the latest state after the write. |
| Large number of provider links | Unlikely bottleneck — teams typically link 3-10 providers. Array storage on the parent document is efficient for this scale. |
| Provider names with special characters or very long strings | Trim whitespace. No length limit enforced in Sprint 1. Consider adding `max(100)` on provider name and `max(500)` on account ID if needed. |

### Performance Considerations

- **Query performance:** `getExternalProviders` does a single `db.get()` by ID — O(1). Sorting a small array (< 20 items) in memory is negligible.
- **Mutation performance:** `updateExternalProviders` does a single `db.get()` + single `db.patch()` — O(1). Validation loop over the array is negligible for expected sizes.
- **No additional indexes needed** — the existing `by_teamId` index on the players table is sufficient. External provider data is accessed via the parent player document, not queried independently.
- **Real-time subscription:** Updating `externalProviderLinks` on the player document triggers re-evaluation of any `useQuery` subscription watching that player. This is the standard Convex behavior and introduces no extra cost.

### Alignment with Architecture Document

- **Data Model:** Matches `architecture.md` Data Architecture — `externalProviderLinks` stored as array on parent (hybrid normalization for bounded lists)
- **Auth Pattern:** Matches `architecture.md` Authentication & Security — `requireRole(ctx, ["admin"])` for writes, `requireAuth(ctx)` for reads
- **Component Structure:** Matches `architecture.md` Frontend Architecture — `ExternalProviders.tsx` in `components/players/`
- **Convex Organization:** Matches `architecture.md` Structure Patterns — query in `convex/players/queries.ts`, mutation in `convex/players/mutations.ts`
- **Error Handling:** Matches `architecture.md` Format Patterns — `ConvexError` with `NOT_FOUND`, `VALIDATION_ERROR`, `NOT_AUTHORIZED` codes
- **Form Pattern:** Matches `architecture.md` Process Patterns — react-hook-form + Zod + zodResolver
- **Loading States:** Matches `architecture.md` Process Patterns — Skeleton when useQuery returns undefined, empty state for empty array
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Data-Architecture] — Hybrid normalization, arrays for bounded lists on parent documents
- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, RBAC model, admin-only mutations
- [Source: architecture.md#Frontend-Architecture] — Component organization (players/), state management (useQuery + local state)
- [Source: architecture.md#Format-Patterns] — ConvexError codes, date handling, error display via sonner
- [Source: architecture.md#Process-Patterns] — Form pattern (react-hook-form + Zod), loading states, mutation feedback
- [Source: architecture.md#Structure-Patterns] — Feature-grouped components, co-located Convex tests
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, no REST
- [Source: epics.md#Story-5.7] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR25 mapped to Epic 5
- [Source: 5-1-player-data-model-profile-list.md] — externalProviderLinks field definition, PlayerProfileTabs "Integrations" tab placeholder

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation, all tests passed on first run.

### Completion Notes List

- Task 1: Added `getExternalProviders` query to `queries.ts`. Uses `requireAuth`, returns safe empty default for inaccessible players, `canEdit` derived from `user.role === "admin"`, providers sorted alphabetically.
- Task 2: Added `updateExternalProviders` mutation to `mutations.ts`. Uses `requireRole(["admin"])`, validates non-empty fields, case-insensitive uniqueness, trims whitespace, patches player doc with `updatedAt`.
- Task 3: Created `ExternalProviders.tsx` with full CRUD: info banner (Alert), empty state (IconPlug), provider list with DropdownMenu actions, Dialog form (react-hook-form + Zod), AlertDialog for delete confirmation. Uses `getConvexErrorMessage` utility for error toasts.
- Task 4: Replaced `PlaceholderTab` in PlayerProfileTabs with `<ExternalProviders>`, passing `playerId` and `playerName`.
- Task 5: Added 5 query tests (a-e) and 11 mutation tests (a-k) using `convex-test` + `t.run` pattern. All 16 new tests pass. Full suite: 465 tests, 21 files, 0 failures.
- Task 6: `pnpm typecheck` passes (5/5 packages). Web/backend lint clean. Full backend test suite passes. Manual validation tasks (6.4–6.11) deferred to QA.
- `requireAuth` import already existed in `mutations.test.ts` — added `requireAuth` alongside existing `requireRole` import for completeness.
- Used existing `getConvexErrorMessage` utility from `@/utils/getConvexErrorMessage.ts` instead of inline ConvexError handling — consistent with project patterns.

### File List

- `packages/backend/convex/players/queries.ts` (modified — added `getExternalProviders` query)
- `packages/backend/convex/players/mutations.ts` (modified — added `updateExternalProviders` mutation)
- `apps/web/src/components/players/ExternalProviders.tsx` (created — full CRUD component)
- `apps/web/src/components/players/PlayerProfileTabs.tsx` (modified — replaced integrations placeholder)
- `packages/backend/convex/players/__tests__/queries.test.ts` (modified — added 5 getExternalProviders tests)
- `packages/backend/convex/players/__tests__/mutations.test.ts` (modified — added 11 updateExternalProviders tests)
- `_bmad-output/implementation-artifacts/5-7-external-provider-linking.md` (modified — task checkmarks + dev record)
