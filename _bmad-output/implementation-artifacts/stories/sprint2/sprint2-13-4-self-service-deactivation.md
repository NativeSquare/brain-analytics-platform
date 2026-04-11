# Story 13.4: Staff Self-Service & Deactivation

Status: pending
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As a staff member,
I want to view and edit my own profile (contact info, bio, certifications) without relying on an admin,
so that my details stay current and accurate.

As an admin,
I want to deactivate staff members who leave the club and optionally reactivate them,
so that departed staff lose platform access while their profiles remain available for reference.

## Dependencies

- **Story 13.1** (Staff Schema, CRUD & Profile Page) — staff table, profile page, admin CRUD mutations must exist.
- **Story 13.3** (Certification Tracking & Expiry Alerts) — certification sub-collection and CRUD must exist for self-service cert editing.

## Acceptance Criteria

1. **`getOwnStaffProfile` query returns the authenticated staff member's profile** — A query `staff.queries.getOwnStaffProfile` accepts `{}` (no arguments), calls `requireAuth(ctx)`. Looks up the `staff` record where `userId` matches the current user's `_id` and `teamId` matches. If no staff profile is linked, returns `null`. If found, resolves the `photo` to a URL via `ctx.storage.getUrl()` if set, and returns the full staff object with `photoUrl`. This query is safe for all authenticated users — they can only retrieve their own staff profile.

2. **Staff self-service view: staff can see their own profile** — When a staff member navigates to `/staff/[staffId]` (where the staffId is their own linked profile), they can see all profile tabs: Bio (all bio fields, read-only by default), Certifications (their certifications, with add/edit/delete capability), and Role Info (role, department, job title — all read-only). The profile page detects self-view via `userId` match on the staff record.

3. **Staff self-service edit: staff can edit their own contact info and bio** — When a staff member views their own profile, an "Edit Profile" button is visible on the Bio tab. Clicking it opens a dialog with ONLY these editable fields: phone, email, bio. All other fields (fullName, jobTitle, department, role, status, dateJoined) are NOT editable by the staff member. The form uses `react-hook-form` with Zod validation.

4. **`updateOwnStaffProfile` mutation allows staff to update their permitted fields** — A mutation `staff.mutations.updateOwnStaffProfile` accepts `{ phone?: string, email?: string, bio?: string }`, calls `requireAuth(ctx)`. Looks up the staff record where `userId === user._id` and `teamId` matches. If no staff profile linked, throws `NOT_FOUND` with message "No staff profile linked to your account". Validates `email` is a valid email format if provided and non-empty (throws `VALIDATION_ERROR` if invalid). Validates all string fields are <= 500 characters (bio <= 2000 characters). Patches the staff document with only the provided fields plus `updatedAt: Date.now()`. Returns the staff `_id`. **Critical:** This mutation does NOT accept a `staffId` parameter — it derives the profile from the authenticated user. This prevents any staff member from editing another's profile.

5. **Staff can manage their own certifications** — Staff members viewing their own profile can add, edit, and delete their own certifications from the Certifications tab. This uses a `requireAdminOrSelf` pattern: the mutation checks that the caller is either an admin or the staff member whose certifications are being modified (by verifying the staff record's `userId` matches the authenticated user). Certification fields: name, issuingBody, issueDate, expiryDate, documentUrl (optional).

6. **Staff CANNOT edit restricted fields** — The `updateOwnStaffProfile` mutation accepts ONLY `phone`, `email`, and `bio`. The following fields are admin-only and cannot be changed via self-service: `fullName`, `jobTitle`, `department`, `role`, `status`, `dateJoined`. The mutation args validator enforces this at the Convex schema level — restricted fields are simply not accepted as arguments.

7. **Self-service edit success feedback** — After successful profile update: a success toast is shown ("Profile updated"), the dialog closes, and the updated fields appear in the Bio tab in real time (Convex subscription).

8. **Admin can deactivate a staff member** — When an admin views a staff profile, a "Deactivate" action is visible (button or menu item). Clicking it opens a confirmation dialog: "Deactivating {staffName} will revoke their platform access. Their profile will remain visible to admins for reference." The confirmation triggers the `updateStaffStatus` mutation.

9. **`updateStaffStatus` mutation changes the status and handles account side effects** — A mutation `staff.mutations.updateStaffStatus` accepts `{ staffId: Id<"staff">, status: string }`, calls `requireRole(ctx, ["admin"])`. Validates the staff member exists and belongs to the admin's team (throws `NOT_FOUND` if not). Validates `status` is one of `"active"`, `"inactive"` (throws `VALIDATION_ERROR` if not). Validates the new status is different from the current status (throws `VALIDATION_ERROR` with message "Staff member already has this status" if same). Patches the `staff` document with the new `status` and `updatedAt: Date.now()`. **Side effects based on new status:**
   - **`"inactive"`**: If the staff member has a linked `userId`, deactivate the user account by setting `banned: true` on the user record (same pattern as `updatePlayerStatus` in Story 5.6). The staff profile remains in the database and is visible to admins.
   - **`"active"`**: If the staff member has a linked `userId` and the user account has `banned: true`, reactivate it by setting `banned: false`. Restore full access.
   Returns the `staffId`.

10. **Deactivated staff profiles visible to admins, filtered for non-admins** — When a staff member's status is `"inactive"`: their linked user account is deactivated (cannot log in), their profile remains visible to admins in the staff directory with an "Inactive" badge (gray/muted styling), and an admin can navigate to their full profile page. Non-admin users see the staff directory filtered to show only `"active"` staff members — inactive staff are excluded from their view. The staff directory query applies this filter based on the caller's role.

11. **Admin can reactivate a staff member** — When an admin views an inactive staff profile, a "Reactivate" action is visible. Clicking it opens a confirmation dialog: "Reactivating {staffName} will restore their platform access." The confirmation triggers the `updateStaffStatus` mutation with `status: "active"`. On success, the linked user account's `banned` flag is removed, and the staff member can log in again.

12. **Status change success feedback** — After a successful status change: a success toast is shown (e.g., "Staff member deactivated" or "Staff member reactivated"), the confirmation dialog closes, the status badge on the profile and in the directory updates in real time.

13. **"My Profile" navigation shortcut for staff users** — When a user with a linked staff profile is logged in, the sidebar provides a "My Profile" link that navigates directly to `/staff/[theirStaffId]`. The link is derived from the `getOwnStaffProfile` query result. While loading, the link is disabled/skeleton. If no linked profile exists, the link is hidden.

14. **Team-scoped data access enforced** — All queries and mutations filter/validate by `teamId` from `requireAuth`/`requireRole`. No cross-team data access is possible. Access control is enforced at the Convex mutation/query layer, not just the UI.

15. **Real-time updates** — Because all views use Convex `useQuery`, status changes made by an admin are reflected in real time across all connected clients: the staff directory updates badge colors and filter results, the staff profile page updates the badge, and deactivated users are logged out or shown an access denied message on their next navigation.

16. **Mock data includes deactivation scenarios** — The mock data seed includes at least one inactive staff member to verify directory filtering and profile display. The mock data follows the same `USE_MOCK_DATA` pattern established in Sprint 1.

## Tasks / Subtasks

- [ ] **Task 1: Create `getOwnStaffProfile` query** (AC: #1, #14)
  - [ ] 1.1: In `packages/backend/convex/staff/queries.ts`, implement `getOwnStaffProfile` query: accepts `{}` (no arguments), calls `requireAuth(ctx)`. Queries the `staff` table using the `by_userId` index to find a staff record where `userId === user._id`. If no staff record is linked to the current user, return `null`. If found, validate `teamId` matches (defensive check — throw `NOT_FOUND` if not). Resolve `photo` to a URL via `ctx.storage.getUrl()` if set. Return the full staff object with `photoUrl`.
  - [ ] 1.2: This query returns `null` for users who don't have a linked staff profile (players, etc.). The frontend handles this gracefully.

- [ ] **Task 2: Create `updateOwnStaffProfile` mutation** (AC: #4, #6, #7, #14)
  - [ ] 2.1: In `packages/backend/convex/staff/mutations.ts`, implement `updateOwnStaffProfile` mutation: accepts `{ phone: v.optional(v.string()), email: v.optional(v.string()), bio: v.optional(v.string()) }`, calls `requireAuth(ctx)` (any authenticated user — not role-restricted, since any staff member can edit their own contact info).
  - [ ] 2.2: Look up the staff record where `userId === user._id` using the `by_userId` index. If no staff profile linked, throw `NOT_FOUND` with message "No staff profile linked to your account".
  - [ ] 2.3: Validate `teamId` matches the authenticated user's team (defensive check).
  - [ ] 2.4: Validate `email` format if provided and non-empty: use a basic email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). Throw `VALIDATION_ERROR` with message "Invalid email format" if invalid.
  - [ ] 2.5: Validate `phone` and `email` are <= 500 characters, `bio` is <= 2000 characters (throw `VALIDATION_ERROR` if exceeded).
  - [ ] 2.6: Build a patch object with only the fields that were provided (not `undefined`). Patch the staff document with the fields plus `updatedAt: Date.now()`. Return the staff `_id`.

- [ ] **Task 3: Update certification mutations with `requireAdminOrSelf` pattern** (AC: #5, #14)
  - [ ] 3.1: In the staff certification mutations (from Story 13.3), update the add/edit/delete certification mutations to use `requireAdminOrSelf` authorization. The mutation should: (a) call `requireAuth(ctx)`, (b) look up the target staff record by `staffId`, (c) if the caller is admin, allow the operation, (d) if the caller is not admin, verify that the staff record's `userId` matches the caller's `user._id` — if not, throw `NOT_AUTHORIZED`.
  - [ ] 3.2: Ensure the certification mutations still validate `teamId` scoping and the staff record exists.

- [ ] **Task 4: Create `updateStaffStatus` mutation** (AC: #9, #14)
  - [ ] 4.1: In `packages/backend/convex/staff/mutations.ts`, implement `updateStaffStatus` mutation: accepts `{ staffId: v.id("staff"), status: v.string() }`, calls `requireRole(ctx, ["admin"])`. Fetches the staff record via `getTeamResource(ctx, teamId, "staff", staffId)`.
  - [ ] 4.2: Validate `status` is one of `"active"`, `"inactive"` (throw `VALIDATION_ERROR` with message "Status must be active or inactive" if not).
  - [ ] 4.3: Validate the new status differs from the current status (throw `VALIDATION_ERROR` with message "Staff member already has this status" if same).
  - [ ] 4.4: Patch the staff document with `{ status, updatedAt: Date.now() }`.
  - [ ] 4.5: Implement account deactivation side effect: if new status is `"inactive"` and the staff member has a linked `userId`, fetch the user record and set `banned: true`. Follow the exact same pattern as `updatePlayerStatus` in `packages/backend/convex/players/mutations.ts`.
  - [ ] 4.6: Implement account reactivation side effect: if new status is `"active"` and the staff member has a linked `userId`, fetch the user record and if `banned === true`, set `banned: false`.
  - [ ] 4.7: Return the `staffId`.

- [ ] **Task 5: Update staff directory query to filter inactive for non-admins** (AC: #10, #14)
  - [ ] 5.1: In `packages/backend/convex/staff/queries.ts`, update the staff directory/list query. After fetching staff records, check the caller's role. If the caller is NOT an admin, filter out staff with `status === "inactive"`. If the caller IS an admin, return all staff (including inactive) with the status field included for badge rendering.
  - [ ] 5.2: Ensure the query still applies `teamId` scoping.

- [ ] **Task 6: Create Zod validation schemas** (AC: #3, #8)
  - [ ] 6.1: Create `apps/web/src/components/staff/staffProfileEditSchema.ts` with a Zod schema for the staff self-service edit form: `staffProfileEditSchema = z.object({ phone: z.string().max(500, "Phone number is too long").optional().or(z.literal("")), email: z.string().email("Invalid email format").max(500, "Email is too long").optional().or(z.literal("")), bio: z.string().max(2000, "Bio is too long").optional().or(z.literal("")) })`.

- [ ] **Task 7: Build StaffProfileEditDialog component** (AC: #3, #7)
  - [ ] 7.1: Create `apps/web/src/components/staff/StaffProfileEditDialog.tsx`. Accepts props: `staff: { phone?: string; email?: string; bio?: string }`, `open: boolean`, `onClose: () => void`.
  - [ ] 7.2: Use `react-hook-form` with `zodResolver` and `staffProfileEditSchema`. Pre-populate `defaultValues` from the existing staff object.
  - [ ] 7.3: Render the form inside a shadcn `Dialog` with title "Edit Profile". Form fields: `Input` for phone (type="tel", placeholder "e.g. +44 7700 900000"), `Input` for email (type="email", placeholder "e.g. name@email.com"), `Textarea` for bio (rows=4, placeholder "Tell us about yourself"). Display inline validation errors using `Field`, `FieldLabel`, `FieldError` components.
  - [ ] 7.4: Reset form when dialog opens with fresh staff data. Use `useRef` + `useEffect` pattern from `ContactInfoEditDialog.tsx` to capture latest props at open-time without resetting mid-edit.
  - [ ] 7.5: Submit button calls `updateOwnStaffProfile` mutation via `useMutation(api.staff.mutations.updateOwnStaffProfile)`. Clean empty strings to `undefined` before sending. On success: show toast ("Profile updated"), close the dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 7.6: "Cancel" button closes the dialog. Both buttons disabled while submitting. Submit button shows `<Spinner />` + "Saving..." while submitting.

- [ ] **Task 8: Build StaffStatusChangeDialog component** (AC: #8, #11, #12)
  - [ ] 8.1: Create `apps/web/src/components/staff/StaffStatusChangeDialog.tsx`. Accepts props: `staffId: Id<"staff">`, `currentStatus: string`, `staffName: string`, `open: boolean`, `onClose: () => void`.
  - [ ] 8.2: Render a shadcn `AlertDialog` with title "Change Staff Status".
  - [ ] 8.3: Display the current status with a badge and the action to be performed. If current status is `"active"`, show a "Deactivate" action with warning: "Deactivating {staffName} will revoke their platform access. Their profile will remain visible to admins for reference." If current status is `"inactive"`, show a "Reactivate" action with message: "Reactivating {staffName} will restore their platform access."
  - [ ] 8.4: Confirm button (destructive variant for deactivation, default for reactivation) calls `updateStaffStatus` mutation. On success: show toast ("Staff member deactivated" or "Staff member reactivated"), close dialog. On error: catch `ConvexError` and display via toast.
  - [ ] 8.5: Cancel button closes the dialog.

- [ ] **Task 9: Integrate self-service edit into staff profile page** (AC: #2, #3, #12)
  - [ ] 9.1: In the staff profile page component (from Story 13.1), detect self-view by comparing the staff record's `userId` with the current authenticated user's `_id`.
  - [ ] 9.2: When self-view is detected, show an "Edit Profile" button on the Bio tab/section. Wire it to open the `StaffProfileEditDialog` with the current staff data.
  - [ ] 9.3: When self-view is detected, ensure the Certifications tab shows add/edit/delete controls (these may already exist from Story 13.3 — verify they work with the updated `requireAdminOrSelf` auth pattern).
  - [ ] 9.4: Ensure Role Info fields (role, department, jobTitle) are always read-only for non-admin viewers — no edit controls rendered.

- [ ] **Task 10: Integrate status management into staff profile page** (AC: #8, #10, #11)
  - [ ] 10.1: In the staff profile page component, add a "Deactivate" / "Reactivate" button visible ONLY to admin users. Use the `currentUser.role === "admin"` check.
  - [ ] 10.2: Wire the button to open the `StaffStatusChangeDialog` with the staff member's `_id`, `status`, and `fullName`.
  - [ ] 10.3: Display a status badge on the profile header: "Active" (green) for active staff, "Inactive" (gray/muted) for deactivated staff. The badge styling should match the existing `PlayerStatusBadge` pattern.

- [ ] **Task 11: Update staff directory to show inactive badge for admins** (AC: #10)
  - [ ] 11.1: In the staff directory component (from Story 13.2), update the staff card/row to display an "Inactive" badge (gray, muted row styling) when `status === "inactive"`. Only admins will see these rows since the query filters them out for non-admins.
  - [ ] 11.2: Add a status filter to the directory (optional but recommended): admins can filter by "All", "Active", "Inactive". Default filter is "Active" for all users.

- [ ] **Task 12: Add "My Profile" navigation shortcut** (AC: #13)
  - [ ] 12.1: Create a hook `apps/web/src/hooks/useOwnStaffProfile.ts` that calls `useQuery(api.staff.queries.getOwnStaffProfile, {})` and returns the staff profile (or `null`).
  - [ ] 12.2: In the sidebar navigation component (`apps/web/src/components/application-shell2.tsx`), conditionally render a "My Profile" nav item for users with a linked staff profile. The link targets `/staff/[ownStaffId]` using the `_id` from the `getOwnStaffProfile` query result. Use a Lucide icon like `UserCircle`.
  - [ ] 12.3: Handle the loading state — while the query is loading (`undefined`), show the link disabled/skeleton. If `null` (no linked profile), hide the link. If the user already has a "My Profile" link from a player profile (Story 5.6), show the staff one instead (staff profile takes precedence for staff-role users).

- [ ] **Task 13: Add mock data for deactivation scenarios** (AC: #16)
  - [ ] 13.1: In the staff mock data seed (from Story 13.1), add at least one staff member with `status: "inactive"` and their linked user record with `banned: true`. This allows verifying directory filtering and profile display during development.
  - [ ] 13.2: Ensure the mock data follows the existing `USE_MOCK_DATA` pattern from Sprint 1.

- [ ] **Task 14: Write backend unit tests** (AC: #4, #5, #6, #9, #14)
  - [ ] 14.1: Create `packages/backend/convex/staff/__tests__/self-service-deactivation.test.ts` using `@convex-dev/test` + `vitest`.
  - [ ] 14.2: Test `getOwnStaffProfile`:
    (a) Staff user with a linked profile gets their full staff object returned.
    (b) Staff user with a linked profile gets `photoUrl` resolved if photo exists.
    (c) Admin user with no linked staff profile gets `null`.
    (d) Player user with no linked staff profile gets `null`.
    (e) Staff user on a different team does NOT get a cross-team profile.
    (f) Unauthenticated user throws `NOT_AUTHENTICATED` error.
  - [ ] 14.3: Test `updateOwnStaffProfile` — **self-service RBAC**:
    (a) Staff member can update their own phone — field is updated, other fields unchanged.
    (b) Staff member can update their own email and bio at once.
    (c) Staff member can clear a field by passing an empty string.
    (d) Invalid email format throws `VALIDATION_ERROR`.
    (e) Bio > 2000 characters throws `VALIDATION_ERROR`.
    (f) Phone or email > 500 characters throws `VALIDATION_ERROR`.
    (g) User with no linked staff profile throws `NOT_FOUND`.
    (h) `updatedAt` is refreshed on the staff record.
    (i) Cross-team check: staff member cannot update a profile from a different team.
  - [ ] 14.4: Test `updateOwnStaffProfile` — **field restrictions**:
    (a) Mutation args do NOT accept `role` — verify that passing `role` in the mutation call is rejected by the Convex validator (the field is not in the args schema).
    (b) Mutation args do NOT accept `department` — same validation.
    (c) Mutation args do NOT accept `jobTitle` — same validation.
    (d) Mutation args do NOT accept `status` — same validation.
    (e) Mutation args do NOT accept `fullName` — same validation.
  - [ ] 14.5: Test `updateStaffStatus` — **deactivation RBAC**:
    (a) Admin can deactivate a staff member (`"active"` -> `"inactive"`) — returns staffId, status is updated.
    (b) Admin can reactivate a staff member (`"inactive"` -> `"active"`) — returns staffId, status is updated.
    (c) Non-admin (coach) gets `NOT_AUTHORIZED` error.
    (d) Non-admin (staff) gets `NOT_AUTHORIZED` error — staff cannot deactivate other staff.
    (e) Non-admin (player) gets `NOT_AUTHORIZED` error.
    (f) Wrong team staff throws `NOT_FOUND`.
    (g) Invalid status value throws `VALIDATION_ERROR`.
    (h) Same status as current throws `VALIDATION_ERROR` with "Staff member already has this status".
    (i) Deactivation sets `banned: true` on linked user account.
    (j) Reactivation sets `banned: false` on linked user account.
    (k) Status change for staff with no linked `userId` does NOT throw (no account side effect needed).
    (l) `updatedAt` is refreshed on the staff record.
  - [ ] 14.6: Test certification self-service (updated `requireAdminOrSelf` pattern):
    (a) Staff member can add a certification to their own profile.
    (b) Staff member can edit a certification on their own profile.
    (c) Staff member can delete a certification from their own profile.
    (d) Staff member CANNOT add/edit/delete a certification on another staff member's profile — throws `NOT_AUTHORIZED`.
    (e) Admin can add/edit/delete a certification on any staff member's profile.

- [ ] **Task 15: Final validation** (AC: all)
  - [ ] 15.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 15.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 15.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass, all existing tests still pass.
  - [ ] 15.4: Start the dev server — log in as admin. Navigate to `/staff/[staffId]`. Verify "Deactivate" button is visible on the profile.
  - [ ] 15.5: Click "Deactivate" — verify confirmation dialog with warning message. Confirm — verify success toast, status badge updates to "Inactive" (gray), staff member's linked user account is deactivated.
  - [ ] 15.6: Navigate to staff directory as admin — verify the deactivated staff member is visible with an "Inactive" badge.
  - [ ] 15.7: Log in as a non-admin staff user — navigate to staff directory — verify the deactivated staff member is NOT visible.
  - [ ] 15.8: As admin, navigate to the inactive staff profile — click "Reactivate" — verify confirmation dialog, confirm, success toast, badge updates to "Active", user account reactivated.
  - [ ] 15.9: Log in as a staff member with a linked profile. Verify "My Profile" link appears in the sidebar. Click it — verify it navigates to their own profile page.
  - [ ] 15.10: On the Bio section of own profile, verify "Edit Profile" button is visible. Click it — verify dialog opens with phone, email, and bio fields pre-populated.
  - [ ] 15.11: Update phone number and bio — verify success toast, dialog closes, updated values appear immediately.
  - [ ] 15.12: Verify the staff member CANNOT see the "Deactivate" / "Reactivate" button on their own or any other profile.
  - [ ] 15.13: Verify the staff member CAN see add/edit/delete controls on their own Certifications tab.
  - [ ] 15.14: Verify Role Info fields (role, department, jobTitle) are displayed as read-only with no edit controls for the staff member.
  - [ ] 15.15: Verify real-time updates: open two browser tabs (one as admin, one as staff), deactivate the staff member in one — verify the staff member is logged out or sees access denied.
  - [ ] 15.16: Attempt to log in as the deactivated staff member — verify login is rejected (`requireAuth` returns `NOT_AUTHORIZED` due to `banned: true`).

## Dev Notes

### Architecture Context

This is the **staff self-service and deactivation story for Epic 13**, combining two related capabilities:

1. **Staff self-service** — allowing staff members to view their own profile data and edit their own contact info, bio, and certifications.
2. **Admin deactivation/reactivation** — admins can toggle staff between active and inactive status, with account access side effects.

These are grouped in a single story because they both modify the staff profile page behavior and share auth patterns (`requireAdminOrSelf`, `requireAuth` with userId-based scoping).

### Key Architectural Decisions

- **Authorization Pattern — Self-Service:** `requireAuth(ctx)` for self-service queries and mutations, with `userId`-based scoping to ensure staff can only access/edit their own profile. Follow the exact pattern from `updateOwnContactInfo` in `packages/backend/convex/players/mutations.ts`.

- **Authorization Pattern — Deactivation:** `requireRole(ctx, ["admin"])` for status changes. Follow the exact pattern from `updatePlayerStatus` in `packages/backend/convex/players/mutations.ts`, including the `banned` flag side effect on the user record.

- **Authorization Pattern — Certifications:** `requireAdminOrSelf(ctx, targetUserId)` from `packages/backend/convex/lib/auth.ts` — admin can manage any staff member's certifications, staff can manage their own.

- **Field Restriction Strategy:** The `updateOwnStaffProfile` mutation enforces field restrictions at the Convex validator level — the `args` object simply does not include restricted fields (`role`, `department`, `jobTitle`, `status`, `fullName`). This is the same approach used by `updateOwnContactInfo` which only accepts contact fields.

- **Account Deactivation Mechanism:** Use `banned: true` on the user record, consistent with `updatePlayerStatus`. The `requireAuth` helper in `packages/backend/convex/lib/auth.ts` already checks for `banned` and throws `NOT_AUTHORIZED`.

- **Directory Filtering:** The staff directory query applies role-based filtering at the Convex query layer — non-admins never receive inactive staff records in query results. This is a server-side filter, not a UI-only filter.

- **Frontend Component Pattern:** Follow the `ContactInfoEditDialog.tsx` pattern from `apps/web/src/components/players/` — same Dialog structure, react-hook-form + Zod, useRef for stable props, ConvexError handling, and toast feedback.

- **Mock Data:** Follow the existing `USE_MOCK_DATA` pattern. Include at least one inactive staff member in the seed data.

- **RBAC Model:** Single role enum on user record: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. Only `admin` can change staff status. Any authenticated user with a linked staff profile can edit their own contact info, bio, and certifications.

- **Multi-tenant Isolation:** Every table includes `teamId`. Every query/mutation filters by the authenticated user's team.

### Reference Files

- **Self-service edit dialog pattern:** `apps/web/src/components/players/ContactInfoEditDialog.tsx`
- **Status management mutation pattern:** `packages/backend/convex/players/mutations.ts` (`updatePlayerStatus`, `updateOwnContactInfo`)
- **Auth helpers:** `packages/backend/convex/lib/auth.ts` (`requireAuth`, `requireRole`, `requireAdminOrSelf`)
- **Staff schema/CRUD:** from Story 13.1 in `packages/backend/convex/staff/`
- **Certification CRUD:** from Story 13.3 in `packages/backend/convex/staff/`
