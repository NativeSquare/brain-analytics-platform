# Story 12.3: Data Fixes & GDPR

Status: draft
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` --- that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want invitation emails to link to the correct staging/production URL instead of localhost,
so that invited players and staff can actually onboard without manual URL editing.

As an admin,
I want to edit any player's contact information (phone, email, address, emergency contacts),
so that I can correct or update details on behalf of a player who cannot do it themselves.

As an admin,
I want to permanently delete a player and all their associated data,
so that the club complies with GDPR right-to-erasure obligations.

## Acceptance Criteria

### Part A: Player Invite URL Fix

1. **Invite emails use the `WEB_APP_URL` env var for the invite link** --- The code in `packages/backend/convex/emails.ts` (`sendAdminInviteEmail`, `sendPlayerInviteEmail`) and `packages/backend/convex/invitations/actions.ts` (`sendInviteEmail`) already reads `process.env.WEB_APP_URL` with a fallback chain: `WEB_APP_URL || ADMIN_URL || "http://localhost:3000"`. The code is correct. The fix is purely a deployment configuration task: the `WEB_APP_URL` environment variable must be set on the Convex staging and production deployments to the correct value (e.g., `https://app.brainanalytics.club`).

2. **Verification checklist after env var is set** --- After setting `WEB_APP_URL` on staging: trigger a test admin invite and a test player invite, inspect the email (or dev console log) and confirm the invite URL starts with the staging domain (not `localhost`). Repeat for production before go-live.

3. **No code changes required for Part A** --- The existing fallback logic is sound. This acceptance criterion exists solely to document the root cause (missing env var on staging) and the fix (set it).

### Part B: Admin Edit Player Contact Info

4. **New `updatePlayerContactInfo` mutation for admin use** --- A new mutation `players.mutations.updatePlayerContactInfo` accepts `{ playerId: Id<"players">, phone?: string, personalEmail?: string, address?: string, emergencyContactName?: string, emergencyContactRelationship?: string, emergencyContactPhone?: string }`. It calls `requireRole(ctx, ["admin"])`. It fetches the player via `getTeamResource(ctx, teamId, "players", playerId)` to enforce team scoping. It validates `personalEmail` format if provided and non-empty (same regex as `updateOwnContactInfo`). It validates all string fields are <= 500 characters. It patches the player document with the provided fields plus `updatedAt: Date.now()`. Returns the `playerId`.

5. **Admin sees an "Edit Contact Info" button on any player's Bio tab** --- When an admin views a player profile at `/players/[playerId]`, an "Edit Contact Info" action is available on the Bio tab (this may reuse the existing `ContactInfoEditDialog` or be integrated into the full profile edit form). The button is visible only to admin users. Clicking it opens a dialog pre-populated with the player's current contact fields.

6. **ContactInfoEditDialog supports admin mode** --- The existing `ContactInfoEditDialog` component (at `apps/web/src/components/players/ContactInfoEditDialog.tsx`) is updated to accept an optional `playerId` prop and an `isAdmin` boolean. When `isAdmin` is true and `playerId` is provided, the dialog calls `updatePlayerContactInfo` instead of `updateOwnContactInfo`. The form fields and validation remain identical. On success, it shows a toast ("Contact information updated") and closes.

7. **Admin edit does not bypass validation** --- The `updatePlayerContactInfo` mutation applies the same validation rules as `updateOwnContactInfo`: email format check, 500-character limit on all fields.

### Part C: GDPR Player Deletion (Right to Erasure)

8. **New `deletePlayer` mutation performs hard cascade deletion** --- A new mutation `players.mutations.deletePlayer` accepts `{ playerId: Id<"players"> }`. It calls `requireRole(ctx, ["admin"])`. It fetches the player via `getTeamResource(ctx, teamId, "players", playerId)` to enforce team scoping. It then deletes ALL data associated with the player in the following order:

   **Player-linked tables (queried by `playerId` index):**
   - `playerStats` --- all match stats (index: `by_playerId`)
   - `playerFitness` --- all fitness entries (index: `by_playerId`)
   - `playerInjuries` --- all injury records (index: `by_playerId`)
   - `contracts` --- all contracts AND their associated `_storage` files via `ctx.storage.delete(contract.fileId)` (index: `by_playerId`)
   - `playerInvites` --- all invitation records (index: `by_playerId`)

   **User-linked tables (queried by `userId` index, only if `player.userId` is set):**
   - `calendarEventUsers` --- all event assignments (index: `by_userId`)
   - `eventRsvps` --- all RSVP records (query by `userId` field, no direct index --- use filter)
   - `documentReads` --- all read tracking records (query by `userId` field, use filter or index)
   - `documentUserPermissions` --- all document permissions (index: `by_userId_teamId`)
   - `notifications` --- all notifications (index: `by_userId_teamId`)
   - `userPinnedDashboards` --- all pinned dashboards (index: `by_userId_teamId`)
   - `userRecentDashboards` --- all recent dashboards (index: `by_userId_teamId`)
   - `feedback` --- all feedback entries (index: `by_user`)

   **Player record itself:**
   - `players` --- the player document

   **User account (if linked):**
   - `users` --- the linked user document (if `player.userId` is set). This also invalidates their auth sessions.

   The deletion is **irreversible** --- there is no soft-delete, no undo, no archive. This is intentional for GDPR compliance.

9. **Cascade deletion handles missing data gracefully** --- If any of the related tables have zero records for the player/user, the mutation continues without error. The deletion loop uses `.collect()` and iterates, never assuming records exist.

10. **Admin UI: "Delete Player" button with confirmation dialog** --- On the player profile page (`/players/[playerId]`), a "Delete Player" button is visible to admin users only. It is styled as a destructive action (red/danger variant). It is positioned in a clearly separated "Danger Zone" section or behind a dropdown menu to prevent accidental clicks.

11. **Two-step confirmation dialog for player deletion** --- Clicking "Delete Player" opens a confirmation dialog (`AlertDialog`) that:
    - Displays the player's full name prominently.
    - Shows a clear warning: "This will permanently delete {firstName} {lastName} and ALL associated data: performance stats, fitness records, injury history, contracts, calendar RSVPs, notifications, and document reads. This action cannot be undone."
    - Requires the admin to type the player's full name (e.g., "John Smith") into a text input to confirm. The "Delete" button remains disabled until the typed name matches exactly.
    - The "Delete" button is styled as destructive (red). The "Cancel" button closes the dialog.

12. **Deletion success feedback** --- After successful deletion: a success toast is shown ("Player {name} and all associated data permanently deleted"), the user is redirected to the player list page (`/players`), and the deleted player no longer appears in any list or query.

13. **Deletion error handling** --- If the mutation throws (e.g., player not found, not authorized), the error is caught and displayed via a toast. The dialog remains open so the admin can retry or cancel.

14. **Team-scoped access enforced** --- All new mutations (`updatePlayerContactInfo`, `deletePlayer`) validate `teamId` via `getTeamResource`. No cross-team data access or deletion is possible.

15. **Auth sessions cleaned up on user deletion** --- When the linked `users` record is deleted, any active auth sessions for that user are invalidated. Since `@convex-dev/auth` stores sessions in the `authSessions` table (part of `authTables`), the mutation must also delete all `authSessions` where `userId` matches the deleted user. Similarly, delete `authAccounts` records for the user.

## Tasks / Subtasks

### Part A: Invite URL Environment Variable

- [ ] **Task 1: Set `WEB_APP_URL` on Convex deployments** (AC: #1, #2, #3)
  - [ ] 1.1: On the Convex staging deployment, set the environment variable `WEB_APP_URL` to the correct staging URL (e.g., `https://staging.brainanalytics.club`). Use the Convex dashboard or CLI: `npx convex env set WEB_APP_URL https://staging.brainanalytics.club`.
  - [ ] 1.2: On the Convex production deployment, set `WEB_APP_URL` to the production URL (e.g., `https://app.brainanalytics.club`).
  - [ ] 1.3: Trigger a test admin invite on staging. Verify the email contains the correct staging URL (check Resend dashboard or dev console logs).
  - [ ] 1.4: Trigger a test player invite on staging. Verify the email contains the correct staging URL with `&type=player` parameter.
  - [ ] 1.5: Document the env var in the project's deployment documentation or `.env.example` if one exists.

### Part B: Admin Edit Player Contact Info

- [ ] **Task 2: Create `updatePlayerContactInfo` mutation** (AC: #4, #7, #14)
  - [ ] 2.1: In `packages/backend/convex/players/mutations.ts`, add a new mutation `updatePlayerContactInfo`. Args: `{ playerId: v.id("players"), phone: v.optional(v.string()), personalEmail: v.optional(v.string()), address: v.optional(v.string()), emergencyContactName: v.optional(v.string()), emergencyContactRelationship: v.optional(v.string()), emergencyContactPhone: v.optional(v.string()) }`.
  - [ ] 2.2: Call `requireRole(ctx, ["admin"])` for authorization.
  - [ ] 2.3: Call `getTeamResource(ctx, teamId, "players", playerId)` to validate the player exists and belongs to the admin's team.
  - [ ] 2.4: Validate `personalEmail` format if provided and non-empty using the same regex as `updateOwnContactInfo`: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Throw `VALIDATION_ERROR` if invalid.
  - [ ] 2.5: Validate all provided string fields are <= 500 characters. Throw `VALIDATION_ERROR` if exceeded.
  - [ ] 2.6: Build a patch object with only provided fields (skip `undefined` values). Set `updatedAt: Date.now()`. Patch the player document. Return `playerId`.

- [ ] **Task 3: Update ContactInfoEditDialog for admin mode** (AC: #5, #6)
  - [ ] 3.1: In `apps/web/src/components/players/ContactInfoEditDialog.tsx`, add optional props: `playerId?: Id<"players">`, `isAdmin?: boolean`.
  - [ ] 3.2: Import the new `updatePlayerContactInfo` mutation from the API.
  - [ ] 3.3: In the `onSubmit` handler, check `isAdmin && playerId`: if true, call `updatePlayerContactInfo({ playerId, ...data })` instead of `updateOwnContactInfo(data)`.
  - [ ] 3.4: In the player profile page or `PlayerProfileTabs.tsx`, when the user is an admin viewing another player's profile, wire the "Edit Contact Info" button to open `ContactInfoEditDialog` with `isAdmin={true}` and `playerId={player._id}`.

- [ ] **Task 4: Write unit tests for `updatePlayerContactInfo`** (AC: #4, #7, #14)
  - [ ] 4.1: In `packages/backend/convex/players/__tests__/`, add tests for `updatePlayerContactInfo`:
    (a) Admin can update a player's phone and personalEmail --- fields are patched, `updatedAt` is refreshed.
    (b) Admin cannot update a player from another team --- throws `NOT_FOUND`.
    (c) Non-admin user (player, physio) cannot call the mutation --- throws `NOT_AUTHORIZED`.
    (d) Invalid email format is rejected --- throws `VALIDATION_ERROR`.
    (e) String exceeding 500 characters is rejected --- throws `VALIDATION_ERROR`.
    (f) Empty/undefined fields are not patched (only provided fields update).

### Part C: GDPR Player Deletion

- [ ] **Task 5: Create `deletePlayer` cascade mutation** (AC: #8, #9, #14, #15)
  - [ ] 5.1: In `packages/backend/convex/players/mutations.ts`, add a new mutation `deletePlayer`. Args: `{ playerId: v.id("players") }`.
  - [ ] 5.2: Call `requireRole(ctx, ["admin"])`.
  - [ ] 5.3: Call `getTeamResource(ctx, teamId, "players", playerId)` to fetch the player and validate team ownership. Store the result to access `player.userId`.
  - [ ] 5.4: Delete all `playerStats` for this player: query `playerStats` with index `by_playerId` where `playerId` matches, `.collect()`, iterate and `ctx.db.delete(doc._id)` each.
  - [ ] 5.5: Delete all `playerFitness` for this player: query with index `by_playerId`, collect, delete each.
  - [ ] 5.6: Delete all `playerInjuries` for this player: query with index `by_playerId`, collect, delete each.
  - [ ] 5.7: Delete all `contracts` for this player: query with index `by_playerId`, collect. For each contract, first delete the storage file via `await ctx.storage.delete(contract.fileId)`, then delete the contract document.
  - [ ] 5.8: Delete all `playerInvites` for this player: query with index `by_playerId`, collect, delete each.
  - [ ] 5.9: If `player.userId` is set, delete all user-linked data:
    - Query `calendarEventUsers` with index `by_userId` where `userId === player.userId`, collect, delete each.
    - Query `eventRsvps` by filtering on `userId === player.userId` (no direct userId-only index; use `.filter()`), collect, delete each.
    - Query `documentReads` by filtering on `userId === player.userId`, collect, delete each.
    - Query `documentUserPermissions` with index `by_userId_teamId` where `userId === player.userId` and `teamId === teamId`, collect, delete each.
    - Query `notifications` with index `by_userId_teamId` where `userId === player.userId` and `teamId === teamId`, collect, delete each.
    - Query `userPinnedDashboards` with index `by_userId_teamId` where `userId === player.userId` and `teamId === teamId`, collect, delete each.
    - Query `userRecentDashboards` with index `by_userId_teamId` where `userId === player.userId` and `teamId === teamId`, collect, delete each.
    - Query `feedback` with index `by_user` where `userId === player.userId`, collect, delete each.
  - [ ] 5.10: If `player.userId` is set, delete auth records:
    - Query `authSessions` (from `authTables`) where `userId === player.userId`, collect, delete each.
    - Query `authAccounts` (from `authTables`) where `userId === player.userId`, collect, delete each.
  - [ ] 5.11: If `player.userId` is set, delete the `users` document: `await ctx.db.delete(player.userId)`.
  - [ ] 5.12: Delete the `players` document itself: `await ctx.db.delete(playerId)`.
  - [ ] 5.13: Return `{ success: true, deletedPlayerId: playerId }`.

- [ ] **Task 6: Build DeletePlayerDialog component** (AC: #10, #11, #12, #13)
  - [ ] 6.1: Create `apps/web/src/components/players/DeletePlayerDialog.tsx`. Props: `playerId: Id<"players">`, `playerName: string` (full name: `${firstName} ${lastName}`), `open: boolean`, `onClose: () => void`.
  - [ ] 6.2: Render an `AlertDialog` with title "Permanently Delete Player".
  - [ ] 6.3: Display a warning message: "This will permanently delete **{playerName}** and ALL associated data: performance stats, fitness records, injury history, contracts, calendar RSVPs, notifications, and document reads. **This action cannot be undone.**"
  - [ ] 6.4: Add a text input with label: `Type "{playerName}" to confirm`. Track input state and compare against `playerName`.
  - [ ] 6.5: Render a "Delete" button with destructive variant, disabled until the confirmation input matches `playerName` exactly. Render a "Cancel" button that calls `onClose`.
  - [ ] 6.6: On "Delete" click, call the `deletePlayer` mutation with `{ playerId }`. Show a loading spinner on the button during the operation.
  - [ ] 6.7: On success: show toast ("Player {playerName} and all associated data permanently deleted"), call `onClose`, and navigate to `/players` using `useRouter().push("/players")`.
  - [ ] 6.8: On error: catch `ConvexError`, display error message via toast. Keep the dialog open.

- [ ] **Task 7: Integrate DeletePlayerDialog into the player profile page** (AC: #10)
  - [ ] 7.1: In `apps/web/src/components/players/PlayerProfileHeader.tsx` (or the player profile page component), add a "Delete Player" button visible ONLY to admin users. Style it as a destructive action --- either in a "Danger Zone" section at the bottom of the profile, or inside a dropdown menu with other admin actions (e.g., alongside "Change Status").
  - [ ] 7.2: Wire the button to open the `DeletePlayerDialog` with the current player's `_id` and full name.
  - [ ] 7.3: The "Delete Player" button must NOT be visible to non-admin users (players, physios, coaches).

- [ ] **Task 8: Write unit tests for `deletePlayer` cascade** (AC: #8, #9, #14, #15)
  - [ ] 8.1: Create `packages/backend/convex/players/__tests__/delete-player-gdpr.test.ts` using `@convex-dev/test` + `vitest`.
  - [ ] 8.2: **Test: Admin can delete a player with no associated data** --- Create a player with no stats, fitness, injuries, contracts, or linked user. Call `deletePlayer`. Verify the player document no longer exists.
  - [ ] 8.3: **Test: Cascade deletes all player-linked records** --- Create a player, then insert records into `playerStats`, `playerFitness`, `playerInjuries`, `playerInvites`, and `contracts` (with a mock storage file). Call `deletePlayer`. Query each table by the deleted `playerId` and verify zero results.
  - [ ] 8.4: **Test: Cascade deletes all user-linked records** --- Create a player with a linked `userId`. Insert records into `calendarEventUsers`, `eventRsvps`, `documentReads`, `documentUserPermissions`, `notifications`, `userPinnedDashboards`, `userRecentDashboards`, and `feedback` for that `userId`. Call `deletePlayer`. Verify all user-linked records are deleted. Verify the `users` document is deleted. Verify `authSessions` and `authAccounts` for that user are deleted.
  - [ ] 8.5: **Test: Non-admin cannot delete a player** --- Authenticate as a player or physio user. Call `deletePlayer`. Verify it throws `NOT_AUTHORIZED`.
  - [ ] 8.6: **Test: Admin cannot delete a player from another team** --- Create a player in team A. Authenticate as admin of team B. Call `deletePlayer` with the player from team A. Verify it throws `NOT_FOUND`.
  - [ ] 8.7: **Test: Deleting a player that does not exist throws NOT_FOUND** --- Call `deletePlayer` with a non-existent `playerId`. Verify it throws `NOT_FOUND`.
  - [ ] 8.8: **Test: Contract storage files are cleaned up** --- Create a player with a contract that has a `fileId` pointing to a storage file. Call `deletePlayer`. Verify `ctx.storage.delete` was called (or verify the storage file is no longer accessible).

## Dev Notes

### Part A: Invite URL

- **Root cause:** The `WEB_APP_URL` env var was never set on the Convex staging deployment. The code fallback chain (`WEB_APP_URL || ADMIN_URL || "localhost:3000"`) is correct and does not need modification.
- **Three files use this env var:**
  - `packages/backend/convex/emails.ts` lines 59 and 96 (admin invite, player invite)
  - `packages/backend/convex/invitations/actions.ts` line 36 (staff invite)
- **Action:** This is a deployment/ops task, not a code change. Give the Convex CLI command to the user --- do NOT run it directly.

### Part B: Admin Edit Contact Info

- **Existing code reference:** The `updateOwnContactInfo` mutation at `packages/backend/convex/players/mutations.ts` lines 561-618 contains the validation logic to reuse. The new `updatePlayerContactInfo` mutation should mirror its validation but use `requireRole(ctx, ["admin"])` and accept a `playerId` argument.
- **Frontend reuse:** The `ContactInfoEditDialog` at `apps/web/src/components/players/ContactInfoEditDialog.tsx` already has the full form. Adding `isAdmin` and `playerId` props is a minimal change --- the only difference is which mutation is called in `onSubmit`.
- **Zod schema:** Reuse `contactInfoSchema` from `apps/web/src/components/players/contactInfoSchema.ts` --- no changes needed to the validation schema.

### Part C: GDPR Cascade Deletion

- **Complete table inventory for cascade deletion (13 tables + auth tables):**

  | Table | FK Field | Index Available | Notes |
  |---|---|---|---|
  | `playerStats` | `playerId` | `by_playerId` | Direct query |
  | `playerFitness` | `playerId` | `by_playerId` | Direct query |
  | `playerInjuries` | `playerId` | `by_playerId` | Direct query |
  | `contracts` | `playerId` | `by_playerId` | Also delete `_storage` file via `ctx.storage.delete(fileId)` |
  | `playerInvites` | `playerId` | `by_playerId` | Direct query |
  | `calendarEventUsers` | `userId` | `by_userId` | Only if player has linked userId |
  | `eventRsvps` | `userId` | `by_userId_eventId` | Partial index --- use filter on userId |
  | `documentReads` | `userId` | `by_userId_documentId` | Partial index --- use filter on userId |
  | `documentUserPermissions` | `userId` | `by_userId_teamId` | Compound index, query with userId + teamId |
  | `notifications` | `userId` | `by_userId_teamId` | Compound index, query with userId + teamId |
  | `userPinnedDashboards` | `userId` | `by_userId_teamId` | Compound index, query with userId + teamId |
  | `userRecentDashboards` | `userId` | `by_userId_teamId` | Compound index, query with userId + teamId |
  | `feedback` | `userId` | `by_user` | Direct query |
  | `authSessions` | `userId` | Check authTables | Part of `@convex-dev/auth` schema |
  | `authAccounts` | `userId` | Check authTables | Part of `@convex-dev/auth` schema |
  | `users` | --- | --- | The user record itself |

- **Deletion order matters:** Delete child records first, then the player, then the user. Delete storage files before their contract documents.
- **No soft delete:** GDPR right-to-erasure requires actual deletion. No `deletedAt` flag, no trash/archive.
- **Convex mutation limits:** A single mutation can perform many writes but Convex has a limit of 8192 document writes per mutation. For a typical player this should be well within limits. If a player has an unusually large number of records, consider batching, but this is unlikely in practice.
- **Auth session cleanup:** The `authTables` from `@convex-dev/auth` include `authSessions`, `authAccounts`, `authRefreshTokens`, and `authVerificationCodes`. Check the actual table definitions at runtime. At minimum, delete `authSessions` and `authAccounts` for the user. This ensures the deleted user cannot maintain an active session.
- **Testing is critical:** The cascade deletion is the highest-risk mutation in the system. Every table must be verified in tests. A missed table means lingering PII, which is a GDPR violation.
