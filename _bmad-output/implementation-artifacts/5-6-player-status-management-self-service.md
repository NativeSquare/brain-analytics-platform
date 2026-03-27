# Story 5.6: Player Status Management & Self-Service

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to change a player's status (Active, On Loan, Left the Club) and have it reflected across the platform,
so that the roster accurately represents the current squad.

As a player,
I want to view my own profile and edit my contact information,
so that I can keep my details up to date without relying on admin staff.

## Acceptance Criteria

1. **Admin can change a player's status from the player profile page** — When an admin views a player's profile at `/players/[playerId]`, a status management control is visible (e.g., a dropdown/select or action menu). The control displays the current status and allows changing it to any of the three values: `"active"`, `"onLoan"`, `"leftClub"`. A confirmation dialog appears before committing the change, explaining the consequences (e.g., "Changing status to Left the Club will deactivate this player's account. They will no longer be able to log in."). The control is only visible to users with `admin` role.

2. **`updatePlayerStatus` mutation changes the status and handles account side effects** — A mutation `players.mutations.updatePlayerStatus` accepts `{ playerId: Id<"players">, status: string }`, calls `requireRole(ctx, ["admin"])`. Validates the player exists and belongs to the admin's team (throw `NOT_FOUND` if not). Validates `status` is one of `"active"`, `"onLoan"`, `"leftClub"` (throw `VALIDATION_ERROR` if not). Validates the new status is different from the current status (throw `VALIDATION_ERROR` with message "Player already has this status" if same). Patches the `players` document with the new `status` and `updatedAt: Date.now()`. **Side effects based on new status:**
   - **`"leftClub"`**: If the player has a linked `userId`, deactivate the user account by setting a `banned` or `isDeactivated` flag on the user record (check existing auth system for the correct deactivation mechanism — the template uses a `banned` field on the user). The player's profile remains in the database and is visible to admins.
   - **`"active"`**: If the player has a linked `userId` and the user account is deactivated, reactivate it (remove the banned/deactivated flag). Restore full access.
   - **`"onLoan"`**: If the player has a linked `userId` and the user account is deactivated (e.g., transitioning from `leftClub` to `onLoan`), reactivate it. Player retains account access.
   Returns the `playerId`.

3. **Status change success feedback** — After a successful status change: a success toast is shown (e.g., "Player status updated to On Loan"), the confirmation dialog closes, the `PlayerStatusBadge` on the profile header and player list updates in real time (Convex subscription), and the player list filtering reflects the new status immediately.

4. **"Left the Club" players are deactivated and visible only to admins** — When a player's status is `"leftClub"`: their linked user account is deactivated (cannot log in), their profile remains visible to admins in the player list when the "Left the Club" or "All" filter is selected, the profile page shows a "Left the Club" badge prominently (gray styling from `PlayerStatusBadge`), and a visual indicator (e.g., a muted/dimmed row or a banner) communicates that this player has left. Other non-admin users can still see the player in the list (for historical reference) but cannot interact with the deactivated account.

5. **"On Loan" players retain account access with a visible indicator** — When a player's status is `"onLoan"`: their linked user account remains active (can log in), an "On Loan" badge (amber/yellow from `PlayerStatusBadge`) is displayed on their profile header and in the player list, and the player can continue using the platform as normal.

6. **Status restored to "Active" re-enables full access** — When a player's status is changed back to `"active"`: their linked user account is reactivated if it was deactivated, status badges are removed (Active badge is the default), and the player appears in the "Active" filtered view of the player list.

7. **`getOwnPlayerProfile` query returns the authenticated player's profile** — A query `players.queries.getOwnPlayerProfile` accepts no arguments (or empty `{}`), calls `requireAuth(ctx)`. Looks up the `players` record where `userId` matches the current user's `_id` and `teamId` matches. If no player profile is linked, returns `null`. If found, returns the full player object with `photoUrl` resolved (same as `getPlayerById`). This query is safe for all authenticated users — they can only retrieve their own player profile.

8. **Player self-service view: players can see their own profile** — When a player navigates to `/players/[playerId]` (where the playerId is their own linked profile), they can see: Bio tab (all bio fields, read-only by default), Performance tab (their match stats, read-only), Fitness tab (their fitness data, read-only), Contract tab (their own contract details, read-only — visible per `getPlayerTabAccess` `isSelf` logic from Story 5.1). The Injuries tab remains hidden from players (per Story 5.5). The Integrations tab displays read-only external provider links.

9. **Player self-service edit: players can edit their own contact information** — When a player views their own profile (detected via `getPlayerTabAccess` returning `isSelf: true`), an "Edit Contact Info" button is visible on the Bio tab. Clicking it opens an edit form (dialog or inline edit mode) with ONLY these editable fields: phone, personal email, address, emergency contact name, emergency contact relationship, emergency contact phone. All other bio fields (name, DOB, nationality, position, squad number, preferred foot, height, weight, photo) are NOT editable by the player. The form uses `react-hook-form` with Zod validation.

10. **`updateOwnContactInfo` mutation allows players to update their contact fields** — A mutation `players.mutations.updateOwnContactInfo` accepts `{ phone?: string, personalEmail?: string, address?: string, emergencyContactName?: string, emergencyContactRelationship?: string, emergencyContactPhone?: string }`, calls `requireAuth(ctx)`. Looks up the player record where `userId === user._id` and `teamId` matches. If no player profile linked, throw `NOT_FOUND`. Validates `personalEmail` is a valid email format if provided and non-empty (throw `VALIDATION_ERROR` if invalid). Validates all string fields are ≤ 500 characters. Patches the player document with only the provided fields plus `updatedAt: Date.now()`. Returns the `playerId`. **Critical:** This mutation does NOT accept a `playerId` parameter — it uses the authenticated user's own linked player profile only. This prevents any player from editing another player's contact info.

11. **Self-service edit success feedback** — After successful contact info update: a success toast is shown ("Contact information updated"), the form/dialog closes, and the updated fields appear in the Bio tab in real time.

12. **Admin can also edit any player's contact info and all other fields** — Admins retain full edit capability on any player's profile via the existing `updatePlayer` mutation (or equivalent from Story 5.2). The self-service edit button for players is a separate, restricted flow. When an admin views a player profile, they see a full "Edit Profile" button (not just "Edit Contact Info").

13. **Player profile navigation shortcut** — When a user with the `player` role is logged in, the sidebar or a user menu provides a "My Profile" link that navigates directly to `/players/[theirPlayerId]`. This avoids the player needing to search for themselves in the player list. The link is derived from the `getOwnPlayerProfile` query result.

14. **Team-scoped data access enforced** — All queries and mutations filter/validate by `teamId` from `requireAuth`/`requireRole`. No cross-team data access is possible. Access control is enforced at the Convex mutation/query layer, not just the UI.

15. **Real-time updates** — Because all views use Convex `useQuery`, status changes made by an admin are reflected in real time across all connected clients: the player list updates badge colors and filter results, the player profile header updates the badge, and deactivated users are logged out or shown an access denied message on their next navigation.

16. **Status transition audit** — The `updatedAt` timestamp on the player record is refreshed on every status change. (Full audit logging of status transitions is out of scope for Sprint 1 but the timestamp provides basic change tracking.)

## Tasks / Subtasks

- [ ] **Task 1: Create `updatePlayerStatus` mutation** (AC: #2, #14, #16)
  - [ ] 1.1: In `packages/backend/convex/players/mutations.ts`, implement `updatePlayerStatus` mutation: accepts `{ playerId: v.id("players"), status: v.string() }`, calls `requireRole(ctx, ["admin"])`. Fetches the player via `ctx.db.get(playerId)`, validates `teamId` matches the authenticated user's team (throw `NOT_FOUND` if not). Validates `status` is one of `"active"`, `"onLoan"`, `"leftClub"` using the `PLAYER_STATUSES` constant from `packages/shared/` (throw `VALIDATION_ERROR` with message "Status must be active, onLoan, or leftClub" if invalid). Validates the new status differs from the current status (throw `VALIDATION_ERROR` with message "Player already has this status" if same). Patches the player document with `{ status, updatedAt: Date.now() }`.
  - [ ] 1.2: Implement account deactivation side effect: if new status is `"leftClub"` and the player has a linked `userId`, fetch the user record via `ctx.db.get(player.userId)` and check if a `banned` field exists on the user table. If the template auth system uses `banned: true` to deactivate accounts, patch the user with `{ banned: true }`. If the deactivation mechanism is different (check `packages/backend/convex/table/users.ts` and `convex/auth.ts` for the correct field), use the appropriate field. Document which field was used.
  - [ ] 1.3: Implement account reactivation side effect: if new status is `"active"` or `"onLoan"` and the player has a linked `userId`, fetch the user record and remove the deactivation flag (e.g., patch with `{ banned: false }` or remove the field). This restores login access.
  - [ ] 1.4: Return the `playerId` on success.

- [ ] **Task 2: Create `getOwnPlayerProfile` query** (AC: #7, #14)
  - [ ] 2.1: In `packages/backend/convex/players/queries.ts`, implement `getOwnPlayerProfile` query: accepts `{}` (no arguments), calls `requireAuth(ctx)`. Queries the `players` table using the `by_userId` index to find a player where `userId === user._id`. If no player record is linked to the current user, return `null`. If found, validate `teamId` matches (throw `NOT_FOUND` if not — defensive check). Resolve `photo` to a URL via `ctx.storage.getUrl()` if set. Return the full player object with `photoUrl`.
  - [ ] 2.2: This query returns `null` for non-player users (admins, coaches, etc. who don't have a linked player profile). The frontend handles this gracefully.

- [ ] **Task 3: Create `updateOwnContactInfo` mutation** (AC: #10, #14)
  - [ ] 3.1: In `packages/backend/convex/players/mutations.ts`, implement `updateOwnContactInfo` mutation: accepts `{ phone: v.optional(v.string()), personalEmail: v.optional(v.string()), address: v.optional(v.string()), emergencyContactName: v.optional(v.string()), emergencyContactRelationship: v.optional(v.string()), emergencyContactPhone: v.optional(v.string()) }`, calls `requireAuth(ctx)` (any authenticated user — not role-restricted, since any player can edit their own contact info).
  - [ ] 3.2: Look up the player record where `userId === user._id` using the `by_userId` index. If no player profile linked, throw `NOT_FOUND` with message "No player profile linked to your account".
  - [ ] 3.3: Validate `teamId` matches the authenticated user's team (defensive check).
  - [ ] 3.4: Validate `personalEmail` format if provided and non-empty: use a basic email regex or Zod email validation. Throw `VALIDATION_ERROR` with message "Invalid email format" if invalid.
  - [ ] 3.5: Validate all provided string fields are ≤ 500 characters (throw `VALIDATION_ERROR` if exceeded).
  - [ ] 3.6: Build a patch object with only the fields that were provided (not `undefined`). Patch the player document with the fields plus `updatedAt: Date.now()`. Return the player `_id`.

- [ ] **Task 4: Create Zod validation schemas for status change and contact edit forms** (AC: #1, #9)
  - [ ] 4.1: Create a Zod schema for the status change confirmation: `statusChangeSchema = z.object({ status: z.enum(["active", "onLoan", "leftClub"]) })`. Co-locate with the `StatusChangeDialog` component or in a shared form schemas file.
  - [ ] 4.2: Create a Zod schema for the player contact info edit form: `contactInfoSchema = z.object({ phone: z.string().max(500, "Phone number is too long").optional().or(z.literal("")), personalEmail: z.string().email("Invalid email format").max(500, "Email is too long").optional().or(z.literal("")), address: z.string().max(500, "Address is too long").optional().or(z.literal("")), emergencyContactName: z.string().max(500, "Name is too long").optional().or(z.literal("")), emergencyContactRelationship: z.string().max(500, "Relationship is too long").optional().or(z.literal("")), emergencyContactPhone: z.string().max(500, "Phone number is too long").optional().or(z.literal("")) })`.

- [ ] **Task 5: Build StatusChangeDialog component** (AC: #1, #3)
  - [ ] 5.1: Create `apps/web/src/components/players/StatusChangeDialog.tsx`. Accepts props: `playerId: Id<"players">`, `currentStatus: string`, `playerName: string`, `open: boolean`, `onClose: () => void`.
  - [ ] 5.2: Render a shadcn `AlertDialog` with title "Change Player Status".
  - [ ] 5.3: Display the current status (with `PlayerStatusBadge`) and a `Select` component for choosing the new status. The select options are the three statuses from `PLAYER_STATUSES` / `PLAYER_STATUS_LABELS`, excluding the current status.
  - [ ] 5.4: Display a contextual warning message based on the selected new status:
    - `"leftClub"`: "This will deactivate {playerName}'s account. They will no longer be able to log in. Their profile will remain accessible to admins."
    - `"onLoan"`: "{playerName} will retain account access with an 'On Loan' status indicator."
    - `"active"`: "{playerName}'s account will be fully restored to active status."
  - [ ] 5.5: "Confirm" button (destructive variant if new status is `"leftClub"`, default variant otherwise) calls `updatePlayerStatus` mutation. On success: show toast ("Player status updated to {label}"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 5.6: "Cancel" button closes the dialog.

- [ ] **Task 6: Build ContactInfoEditDialog component** (AC: #9, #11)
  - [ ] 6.1: Create `apps/web/src/components/players/ContactInfoEditDialog.tsx`. Accepts props: `player: PlayerDoc` (the current player object with existing contact fields), `open: boolean`, `onClose: () => void`.
  - [ ] 6.2: Use `react-hook-form` with `zodResolver` and `contactInfoSchema`. Pre-populate `defaultValues` from the existing player object: `phone`, `personalEmail`, `address`, `emergencyContactName`, `emergencyContactRelationship`, `emergencyContactPhone`.
  - [ ] 6.3: Render the form inside a shadcn `Dialog` (or `Sheet`) with title "Edit Contact Information".
  - [ ] 6.4: Form fields (all optional): `Input` for phone, `Input` for personal email (type="email"), `Textarea` for address, a section header "Emergency Contact" followed by `Input` for emergency contact name, `Input` for emergency contact relationship, `Input` for emergency contact phone. Display inline validation errors.
  - [ ] 6.5: Submit button calls `updateOwnContactInfo` mutation (for player self-service) or `updatePlayer` mutation (for admin editing — check the `isAdmin` context to decide). On success: show toast ("Contact information updated"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 6.6: "Cancel" button closes the dialog without saving.

- [ ] **Task 7: Integrate StatusChangeDialog into PlayerProfileHeader** (AC: #1, #12)
  - [ ] 7.1: In `apps/web/src/components/players/PlayerProfileHeader.tsx`, add a "Change Status" button (or a dropdown menu action) visible ONLY when the current user has the `admin` role. Use the `getPlayerTabAccess` result or a separate role check (e.g., check `currentUser.role === "admin"`).
  - [ ] 7.2: Wire the button to open the `StatusChangeDialog` component with the current player's `_id`, `status`, and name.
  - [ ] 7.3: Ensure the admin also sees a full "Edit Profile" button that opens the full profile edit form (from Story 5.2's `ProfileForm`).

- [ ] **Task 8: Integrate ContactInfoEditDialog into PlayerProfileTabs (Bio tab)** (AC: #8, #9, #12)
  - [ ] 8.1: In `apps/web/src/components/players/PlayerProfileTabs.tsx`, within the "Bio" tab content section, add an "Edit Contact Info" button visible ONLY when `tabAccess.isSelf === true` (i.e., the player is viewing their own profile). Position it near the contact information fields.
  - [ ] 8.2: Wire the button to open the `ContactInfoEditDialog` component with the current player object.
  - [ ] 8.3: For admin users viewing any player's Bio tab, show the full "Edit Profile" button instead (which opens Story 5.2's full profile edit form allowing all fields to be changed). Admin users should NOT see the limited "Edit Contact Info" button — they see the full edit instead.
  - [ ] 8.4: Ensure fields updated via self-service edit are reflected immediately in the Bio tab display (Convex subscription handles this).

- [ ] **Task 9: Add "My Profile" navigation shortcut for player users** (AC: #13)
  - [ ] 9.1: Create a hook `apps/web/src/hooks/useOwnPlayerProfile.ts` that calls `useQuery(api.players.queries.getOwnPlayerProfile, {})` and returns the player profile (or `null`).
  - [ ] 9.2: In the sidebar navigation component (`apps/web/src/components/application-shell2.tsx`), conditionally render a "My Profile" nav item for users with `role === "player"` (or any user with a linked player profile). The link targets `/players/[ownPlayerId]` using the `_id` from the `getOwnPlayerProfile` query result. Use a Lucide/Tabler icon like `UserCircle` or `User`.
  - [ ] 9.3: Handle the loading state — while the query is loading (returns `undefined`), show the "My Profile" link with a disabled state or skeleton. If `null` (no linked profile), hide the link.

- [ ] **Task 10: Write backend unit tests** (AC: #2, #7, #10, #14)
  - [ ] 10.1: Create `packages/backend/convex/players/__tests__/status-and-self-service.test.ts` using `@convex-dev/test` + `vitest`.
  - [ ] 10.2: Test `updatePlayerStatus`:
    (a) Admin can change a player's status from `"active"` to `"onLoan"` — returns playerId, player status is updated.
    (b) Admin can change status from `"active"` to `"leftClub"` — returns playerId, player status is updated.
    (c) Admin can change status from `"leftClub"` back to `"active"` — player status is updated, account is reactivated.
    (d) Admin can change status from `"onLoan"` to `"active"`.
    (e) Admin can change status from `"leftClub"` to `"onLoan"` — account is reactivated.
    (f) Non-admin (coach) gets `NOT_AUTHORIZED` error.
    (g) Non-admin (player) gets `NOT_AUTHORIZED` error.
    (h) Wrong team player throws `NOT_FOUND`.
    (i) Invalid status value throws `VALIDATION_ERROR`.
    (j) Same status as current throws `VALIDATION_ERROR` with "Player already has this status".
    (k) Status change to `"leftClub"` deactivates linked user account (banned flag set).
    (l) Status change from `"leftClub"` to `"active"` reactivates linked user account (banned flag removed).
    (m) Status change for player with no linked `userId` does NOT throw (no account side effect needed).
    (n) `updatedAt` is refreshed on the player record.
  - [ ] 10.3: Test `getOwnPlayerProfile`:
    (a) Player user with a linked profile gets their full player object returned.
    (b) Player user with a linked profile gets `photoUrl` resolved if photo exists.
    (c) Admin user with no linked player profile gets `null`.
    (d) Coach user with no linked player profile gets `null`.
    (e) Player user on a different team does NOT get a cross-team profile (defensive check).
    (f) Unauthenticated user throws error.
  - [ ] 10.4: Test `updateOwnContactInfo`:
    (a) Player can update their own phone number — field is updated, other fields unchanged.
    (b) Player can update multiple contact fields at once (phone, email, address, emergency contact).
    (c) Player can clear a field by passing an empty string.
    (d) Invalid email format throws `VALIDATION_ERROR`.
    (e) String field > 500 characters throws `VALIDATION_ERROR`.
    (f) User with no linked player profile throws `NOT_FOUND`.
    (g) Admin user with a linked player profile can also use this mutation for their own profile.
    (h) `updatedAt` is refreshed on the player record.
    (i) Mutation does NOT allow changing non-contact fields (name, position, etc.) — they are not in the accepted args.
    (j) Cross-team check: player cannot update a profile from a different team.

- [ ] **Task 11: Final validation** (AC: all)
  - [ ] 11.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 11.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 11.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [ ] 11.4: Start the dev server — log in as admin. Navigate to `/players/[playerId]`. Verify "Change Status" button is visible on the profile header.
  - [ ] 11.5: Click "Change Status" — verify the dialog opens with current status displayed, new status select, and contextual warning message.
  - [ ] 11.6: Change status to "On Loan" — verify success toast, dialog closes, badge updates to amber "On Loan" on profile header and in the player list.
  - [ ] 11.7: Change status to "Left the Club" — verify success toast, badge updates to gray "Left the Club", and the player's linked user account is deactivated.
  - [ ] 11.8: Attempt to log in as the "Left the Club" player — verify login is rejected/account is deactivated.
  - [ ] 11.9: As admin, change the player's status back to "Active" — verify the account is reactivated, badge updates, and the player can now log in.
  - [ ] 11.10: Log in as a player with a linked profile. Verify "My Profile" link appears in the sidebar. Click it — verify it navigates to their own profile page.
  - [ ] 11.11: On the Bio tab of own profile, verify "Edit Contact Info" button is visible. Click it — verify the dialog opens with contact fields pre-populated.
  - [ ] 11.12: Update phone number and emergency contact — verify success toast, dialog closes, and updated values appear in the Bio tab immediately.
  - [ ] 11.13: Verify the player CANNOT see the "Change Status" button on their own profile.
  - [ ] 11.14: Verify the player CANNOT see the full "Edit Profile" button — only "Edit Contact Info".
  - [ ] 11.15: Verify the player CAN see their Bio, Performance, Fitness, and Contract (if applicable) tabs but NOT the Injuries tab.
  - [ ] 11.16: Log in as a coach — navigate to a player's profile. Verify no "Change Status" button and no "Edit Contact Info" button are visible.
  - [ ] 11.17: Verify real-time updates: open two browser tabs (one as admin, one as another admin), change a player's status in one — verify it updates in the other without refresh.
  - [ ] 11.18: Verify the player list correctly filters players by all three statuses after status changes.

## Dev Notes

### Architecture Context

This is the **player status management and self-service story for Epic 5**, combining two related capabilities:

1. **Admin status management** — changing players between Active, On Loan, and Left the Club, with account deactivation/reactivation side effects.
2. **Player self-service** — allowing players to view their own profile data and edit their own contact information.

These are grouped in a single story because they both modify the player profile page behavior and the self-service view depends on the status being correct to determine access.

This story directly implements:

- **FR28:** Admin can change a player's status between Active, On Loan, and Left the Club
- **FR29:** Players marked as "Left the Club" have their account deactivated; their profile remains accessible to admins
- **FR30:** Players marked as "On Loan" retain account access with a visible status indicator
- **FR31:** Players can view their own profile (bio, stats, fitness data, contract)
- **FR32:** Players can edit their own contact information and emergency contacts
- **NFR2:** Real-time updates propagate via Convex subscriptions
- **NFR5:** Data access enforced at the Convex mutation/query layer (requireRole for status changes, requireAuth + userId check for self-service)
- **NFR6:** Multi-tenant isolation via teamId scoping

### Key Architectural Decisions from architecture.md

- **Authorization Pattern:** `requireRole(ctx, ["admin"])` for status management mutations. `requireAuth(ctx)` for self-service queries and mutations (with userId-based scoping). [Source: architecture.md#Authentication-&-Security]

- **RBAC Model:** Single role enum on user record: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. Only `admin` can change player statuses. Any authenticated user with a linked player profile can edit their own contact info. [Source: architecture.md#Authentication-&-Security]

- **Multi-tenant Isolation:** Every table includes `teamId`. Every query/mutation filters by the authenticated user's team. [Source: architecture.md#Authentication-&-Security]

- **Auth System — Account Deactivation:** The NativeSquare template uses `@convex-dev/auth` with a `banned` field on the user record. Setting `banned: true` prevents login. Check `packages/backend/convex/table/users.ts` and `convex/auth.ts` for the exact field name and mechanism. The `@convex-dev/auth` library checks the `banned` field during session validation. [Source: architecture.md#Starter-Template-Evaluation, Template auth system]

- **Form Pattern:** `react-hook-form` + Zod schema + `zodResolver` + `useMutation`. [Source: architecture.md#Process-Patterns]

- **Error Handling:** `ConvexError` with codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

- **Loading States:** `useQuery` returns `undefined` → render `Skeleton`. `null` → show appropriate fallback. [Source: architecture.md#Process-Patterns]

- **Component Organization:** Feature-grouped at `components/players/`. [Source: architecture.md#Structure-Patterns]

- **Convex Organization:** Queries in `convex/players/queries.ts`, mutations in `convex/players/mutations.ts`. Tests in `convex/players/__tests__/`. [Source: architecture.md#Structure-Patterns]

### Shared Constants from Story 5.1

Story 5.1 Task 2 exports constants to `packages/shared/`:
- `PLAYER_STATUSES = ["active", "onLoan", "leftClub"] as const`
- `PLAYER_STATUS_LABELS = { active: "Active", onLoan: "On Loan", leftClub: "Left the Club" }`

**Use these constants** in both backend validation and frontend UI components. Do NOT hardcode the values.

### Account Deactivation Mechanism

The NativeSquare template's auth system (based on `@convex-dev/auth`) supports user banning. The mechanism works as follows:

1. The user table has a field (likely `banned: boolean` or similar) that the auth library checks during session validation.
2. When `banned` is set to `true`, the user's existing sessions are invalidated and they cannot create new sessions.
3. To deactivate: `ctx.db.patch(userId, { banned: true })`
4. To reactivate: `ctx.db.patch(userId, { banned: false })`

**IMPORTANT:** Before implementing Task 1, inspect the actual user table schema and the `@convex-dev/auth` configuration to confirm the exact field name and behavior. The field might be `banned`, `isDeactivated`, `status`, or similar. Check:
- `packages/backend/convex/table/users.ts` — for the user schema definition
- `packages/backend/convex/auth.ts` — for auth configuration and ban handling
- `node_modules/@convex-dev/auth` — for the ban check mechanism

### Self-Service Security Model

The self-service pattern follows a "user can only access/modify their own data" principle:

```typescript
// Self-service query — NO playerId parameter
export const getOwnPlayerProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx)

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!player) return null
    if (player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    const photoUrl = player.photo
      ? await ctx.storage.getUrl(player.photo)
      : null

    return { ...player, photoUrl }
  },
})
```

```typescript
// Self-service mutation — derives playerId from auth, NOT from args
export const updateOwnContactInfo = mutation({
  args: {
    phone: v.optional(v.string()),
    personalEmail: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx)

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No player profile linked to your account",
      })
    }

    // Validate email format if provided
    if (args.personalEmail && args.personalEmail.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(args.personalEmail)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Invalid email format",
        })
      }
    }

    // Validate field lengths
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string" && value.length > 500) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: `${key} cannot exceed 500 characters`,
        })
      }
    }

    // Build patch with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.phone !== undefined) patch.phone = args.phone || undefined
    if (args.personalEmail !== undefined) patch.personalEmail = args.personalEmail || undefined
    if (args.address !== undefined) patch.address = args.address || undefined
    if (args.emergencyContactName !== undefined) patch.emergencyContactName = args.emergencyContactName || undefined
    if (args.emergencyContactRelationship !== undefined) patch.emergencyContactRelationship = args.emergencyContactRelationship || undefined
    if (args.emergencyContactPhone !== undefined) patch.emergencyContactPhone = args.emergencyContactPhone || undefined

    await ctx.db.patch(player._id, patch)
    return player._id
  },
})
```

```typescript
// Status change mutation — admin only, explicit playerId
export const updatePlayerStatus = mutation({
  args: {
    playerId: v.id("players"),
    status: v.string(),
  },
  handler: async (ctx, { playerId, status }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"])

    const player = await ctx.db.get(playerId)
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Player not found" })
    }

    if (!["active", "onLoan", "leftClub"].includes(status)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Status must be active, onLoan, or leftClub",
      })
    }

    if (player.status === status) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Player already has this status",
      })
    }

    // Update player status
    await ctx.db.patch(playerId, { status, updatedAt: Date.now() })

    // Handle account side effects
    if (player.userId) {
      const linkedUser = await ctx.db.get(player.userId)
      if (linkedUser) {
        if (status === "leftClub") {
          // Deactivate account
          await ctx.db.patch(player.userId, { banned: true })
        } else if (linkedUser.banned) {
          // Reactivate account (active or onLoan)
          await ctx.db.patch(player.userId, { banned: false })
        }
      }
    }

    return playerId
  },
})
```

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 5.6) state:

> **Given** the admin is viewing a player's profile
> **When** the admin changes the status to "Left the Club"
> **Then** the player's account is deactivated (cannot log in)
> **And** their profile remains visible to admins with a "Left the Club" badge
> **And** they appear in a filtered "Left the Club" section of the player list
> **When** the admin changes the status to "On Loan"
> **Then** the player retains account access
> **And** an "On Loan" badge is displayed on their profile and in the player list
> **When** any status is changed back to "Active"
> **Then** the player's access is restored and badges are removed
> **And** players can view their own profile (bio, stats, fitness, contract)
> **And** players can edit their own phone, personal email, address, and emergency contacts
> **And** players cannot edit any other fields

**This story extends and decomposes the AC as follows:**

- **Confirmation dialog for status changes:** Not in the original AC but critical UX. Changing status to "Left the Club" deactivates an account — a destructive action that requires explicit confirmation with clear messaging about consequences.
- **Contextual warning messages:** Added per-status warnings in the confirmation dialog to ensure admins understand the implications of each status transition.
- **`getOwnPlayerProfile` query:** The original AC says "players can view their own profile" but doesn't specify the mechanism. Added a dedicated query that derives the player profile from the authenticated user's ID, avoiding the need for players to know their own playerId.
- **"My Profile" sidebar shortcut:** Not in the original AC but a natural UX improvement. Players shouldn't need to search for themselves in the player list.
- **Self-service mutation security:** The `updateOwnContactInfo` mutation deliberately does NOT accept a `playerId` parameter. It always uses the authenticated user's own profile. This prevents any possibility of a player editing another player's contact info, even if they craft a malicious request.
- **Email validation on contact edit:** Added basic email format validation for the `personalEmail` field to prevent obviously invalid data.
- **Field length validation:** Added 500-character limit on all contact fields to prevent abuse.
- **Same-status validation:** Added a check preventing setting the same status as current, which avoids unnecessary account side effect operations.
- **Admin full edit vs player limited edit:** Clarified the distinction between admin editing (full profile via Story 5.2's form) and player self-service editing (contact fields only). These are separate UI paths.
- **Status transition from leftClub to onLoan:** The original AC doesn't explicitly mention this transition, but it's a valid scenario (player returns from retirement to a loan arrangement). Handled with account reactivation.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `players` table with `status` field and `by_userId` index | Story 5.1 | `packages/backend/convex/table/players.ts` must exist with status field and `by_userId` index |
| `getPlayerById` query | Story 5.1 | `packages/backend/convex/players/queries.ts` must export `getPlayerById` |
| `getPlayerTabAccess` query returning `isSelf` | Story 5.1 | Must exist and return `isSelf: true` when player views own profile |
| Player profile page at `/players/[playerId]` | Story 5.1 | Must exist with tabbed layout and `PlayerProfileHeader` |
| `PlayerProfileHeader` component | Story 5.1 | Must exist at `components/players/PlayerProfileHeader.tsx` |
| `PlayerProfileTabs` with Bio tab content | Story 5.1 | Must exist with Bio tab displaying contact fields |
| `PlayerStatusBadge` component | Story 5.1 | Must exist at `components/shared/PlayerStatusBadge.tsx` (or `StatusBadge.tsx`) |
| `updatePlayer` mutation (full profile edit) | Story 5.2 | Used for admin full edit; if not available, admin full edit button can be deferred |
| `ProfileForm` component (full profile edit) | Story 5.2 | Used for admin full edit UI; if not available, admin full edit button can be deferred |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export these |
| `PLAYER_STATUSES`, `PLAYER_STATUS_LABELS` constants | Story 5.1 | Must be exported from `packages/shared/` |
| Sidebar navigation component | Story 1.3 | Must be modifiable to add "My Profile" link |
| shadcn/ui components: Dialog, AlertDialog, Select, Button, Input, Textarea, Form, Badge, Tooltip | Story 1.2 | All must be available in `components/ui/` |

### Current State (Baseline)

**`convex/players/queries.ts`:** Exists from Story 5.1 with `getPlayers`, `getPlayerById`, `getPlayerTabAccess`. Also has `getPlayerStats` (Story 5.3), `getPlayerFitness` (Story 5.4), `getPlayerInjuries`, `getPlayerInjuryStatus` (Story 5.5). **No `getOwnPlayerProfile` query** — must be added.

**`convex/players/mutations.ts`:** Exists from Story 5.2+ with `createPlayer`, `updatePlayer`, and CRUD mutations for stats/fitness/injuries. **No `updatePlayerStatus` or `updateOwnContactInfo` mutations** — must be added.

**`apps/web/src/components/players/StatusChangeDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/ContactInfoEditDialog.tsx`:** **Does not exist.** Must be created.

**`apps/web/src/components/players/PlayerProfileHeader.tsx`:** Exists from Story 5.1. Currently shows player photo, name, status badge. **No "Change Status" button** — must be added for admin users.

**`apps/web/src/components/players/PlayerProfileTabs.tsx`:** Exists from Story 5.1. Bio tab shows player fields read-only. **No "Edit Contact Info" button** — must be added for self-service.

**`apps/web/src/hooks/useOwnPlayerProfile.ts`:** **Does not exist.** Must be created.

**Sidebar navigation (`application-shell2.tsx`):** Contains "Players" link (from Story 5.1). **No "My Profile" link** for player users — must be added conditionally.

**Auth system:** `@convex-dev/auth` with `banned` field on user table. Verify the exact field name before implementing Task 1.

### Existing Patterns to Follow

**Status change follows the same confirmation-dialog-then-mutation pattern used for delete operations in Stories 5.3-5.5.**

**Contact info edit follows the same react-hook-form pattern used in Story 5.2's ProfileForm, but with a restricted field set.**

**The "My Profile" sidebar link follows the same conditional nav item pattern as role-based menu items already in the sidebar.**

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/players/queries.ts` | Modified | Add `getOwnPlayerProfile` query |
| `packages/backend/convex/players/mutations.ts` | Modified | Add `updatePlayerStatus` and `updateOwnContactInfo` mutations |
| `apps/web/src/components/players/StatusChangeDialog.tsx` | Created | Status change confirmation dialog with contextual warnings |
| `apps/web/src/components/players/ContactInfoEditDialog.tsx` | Created | Self-service contact info edit form in a dialog |
| `apps/web/src/components/players/PlayerProfileHeader.tsx` | Modified | Add "Change Status" button for admin users |
| `apps/web/src/components/players/PlayerProfileTabs.tsx` | Modified | Add "Edit Contact Info" button for players on Bio tab |
| `apps/web/src/hooks/useOwnPlayerProfile.ts` | Created | Hook wrapping `getOwnPlayerProfile` query |
| `apps/web/src/components/application-shell2.tsx` | Modified | Add conditional "My Profile" nav item for player users |
| `packages/backend/convex/players/__tests__/status-and-self-service.test.ts` | Created | Unit tests for status and self-service mutations/queries |

### What This Story Does NOT Include

- **No bulk status changes** — admin changes one player at a time
- **No status change audit log** — only `updatedAt` timestamp is tracked; full audit trail is post-Sprint 1
- **No status change notifications** — players are not notified when their status changes (could be a future enhancement)
- **No status change history** — no record of previous statuses, only the current status
- **No player self-service photo upload** — players cannot change their own photo (admin only)
- **No player self-service bio editing** — only contact fields (phone, email, address, emergency contacts)
- **No player settings page** — self-service is accessed via the existing profile page, not a dedicated settings route
- **No role-based player list visibility rules** — all authenticated users can see the player list (per Story 5.1); this story only adds self-service editing
- **No admin notification when player edits contact info** — silent self-service update
- **No contract visibility changes** — contract tab visibility is governed by Story 6.2 / `getPlayerTabAccess` logic from Story 5.1
- **No session invalidation on deactivation** — setting `banned: true` prevents new logins; existing active sessions may persist until they expire or the auth library checks the ban flag on the next request. This is acceptable for Sprint 1.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Account deactivation mechanism unknown (exact field name on user table) | Inspect user table schema and `@convex-dev/auth` source before starting Task 1. Document the field used. |
| `banned` flag may not immediately invalidate existing sessions | Acceptable for Sprint 1. The next time the session is validated against Convex, the ban check will reject it. Most auth libraries check on every request. |
| Player role user with no linked player profile | `getOwnPlayerProfile` returns `null`. "My Profile" link is hidden. Self-service edit button is hidden. No errors — graceful degradation. This happens when a player account is created but not yet linked to a player profile (e.g., during onboarding). |
| Story 5.2 (ProfileForm / updatePlayer) not yet complete | The admin full "Edit Profile" button can be conditionally hidden or show a toast "Coming soon" if the `updatePlayer` mutation doesn't exist yet. The self-service contact edit is independent and works regardless. |
| `by_userId` index may not exist on players table | Must be confirmed from Story 5.1 implementation. If missing, the `getOwnPlayerProfile` query would need a filter instead of index — less efficient but functional for small datasets. |
| Player navigating to another player's profile tries self-service edit | `getPlayerTabAccess.isSelf` returns `false` for other players' profiles. The "Edit Contact Info" button is not rendered. Even if shown, `updateOwnContactInfo` uses the authenticated user's own profile — cannot edit another player. Defense in depth. |

### Performance Considerations

- **`getOwnPlayerProfile` query:** Uses `by_userId` index for O(1) lookup. Very lightweight.
- **`updateOwnContactInfo` mutation:** Single index lookup + single patch. Negligible cost.
- **`updatePlayerStatus` mutation:** Two patches (player + user account). Still very fast.
- **Sidebar "My Profile" link:** The `useOwnPlayerProfile` hook runs once per page load via Convex subscription. Minimal overhead.
- **Real-time status updates:** Convex subscriptions automatically push status changes to all connected clients. No polling needed.

### Alignment with Architecture Document

- **Auth Pattern:** `requireRole(ctx, ["admin"])` for status changes, `requireAuth(ctx)` + userId scoping for self-service — matches architecture.md § Authentication & Security
- **RBAC Model:** Admin-only status management, player self-service via userId check — matches architecture.md § Authentication & Security
- **Multi-tenancy:** teamId scoping on all queries/mutations — matches architecture.md § Authentication & Security
- **Component Structure:** New components in `components/players/`, hook in `hooks/` — matches architecture.md § Frontend Architecture
- **Convex Organization:** Queries in `convex/players/queries.ts`, mutations in `convex/players/mutations.ts` — matches architecture.md § Convex Function Organization
- **Naming:** camelCase Convex functions (`updatePlayerStatus`, `getOwnPlayerProfile`, `updateOwnContactInfo`), PascalCase components (`StatusChangeDialog.tsx`, `ContactInfoEditDialog.tsx`)
- **Testing:** Co-located in `convex/players/__tests__/`
- **Error Handling:** `ConvexError` with `NOT_FOUND`, `NOT_AUTHORIZED`, `VALIDATION_ERROR` codes
- **Form Pattern:** `react-hook-form` + `zodResolver` + `useMutation` + `toast`
- **No detected conflicts** with the architecture document

### Project Structure Notes

- All files align with the unified project structure from architecture.md
- New components are placed in `apps/web/src/components/players/` (feature-grouped)
- New Convex functions are placed in `packages/backend/convex/players/` (module-grouped)
- Tests are co-located in `packages/backend/convex/players/__tests__/`
- Hook created in `apps/web/src/hooks/` following existing pattern
- Shared constants consumed from `packages/shared/`
- No new directories are created — all files fit into existing structure

### References

- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, RBAC model (6 roles), teamId scoping, account ban mechanism
- [Source: architecture.md#Starter-Template-Evaluation] — @convex-dev/auth with ban system, user schema with role field
- [Source: architecture.md#Frontend-Architecture] — Page structure, component organization, state management (useQuery + URL params)
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, error handling, no REST
- [Source: architecture.md#Format-Patterns] — ConvexError codes, standardized error handling
- [Source: architecture.md#Process-Patterns] — Form pattern (react-hook-form + Zod + zodResolver), loading states, mutation feedback
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: epics.md#Story-5.6] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR28, FR29, FR30, FR31, FR32 mapped to Epic 5
- [Source: Story-5.1] — Players table schema (status field, by_userId index), PlayerProfileHeader, PlayerProfileTabs, getPlayerTabAccess, PLAYER_STATUSES/PLAYER_STATUS_LABELS constants
- [Source: Story-5.2] — ProfileForm component, updatePlayer mutation (full profile edit), player invitation/onboarding flow
- [Source: Story-5.5] — Pattern reference for role-gated queries, medical data security model (analogous restricted access pattern)

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
