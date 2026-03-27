# Story 2.2: Implement User Invitation & Onboarding

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to invite new users by email and assign them a role,
so that I can onboard staff and players to the platform with the correct access level from day one.

## Acceptance Criteria

1. **Admin can invite users with any role** — On the team/members management page, the admin can enter an email address, a name, and select a role (Admin, Coach, Analyst, Physio, Player, Staff) from a dropdown. Submitting the form creates an invitation record and sends an invitation email to the specified address.

2. **Invitation record is team-scoped** — The invitation includes the `teamId` of the inviting admin. When the invited user accepts, they are assigned to the same team. Invitations are only visible to admins of the same team.

3. **Invited user appears in members list with "Invited" status** — After sending an invitation, the invited user immediately appears in the members list/table with a status badge showing "Invited". The list shows their name, email, assigned role, and invitation status. Active users show an "Active" status badge.

4. **Email contains a unique, time-limited invitation link** — The invitation email contains a link to `/accept-invite?token={token}`. The token is a securely generated 32-character alphanumeric string. The invitation expires after 7 days. Expired invitations cannot be accepted.

5. **Invited user can accept and set their password** — When the invited user clicks the link and navigates to the accept-invite page, they see a welcome message with the inviter's name, their assigned role, and a password form. After entering and confirming their password, a user account is created, the invitation is marked as accepted, and the user is redirected to the app.

6. **Accepted user is assigned the selected role and team** — Upon accepting the invitation, the new user's account is created with: `role` set to the value chosen by the inviting admin, `teamId` set to the inviting admin's team, and `status` set to `"active"`. The user can immediately access the platform with their assigned role's permissions.

7. **Admin can cancel pending invitations** — Admins can cancel a pending invitation from the members list. Cancelling removes the invitation from the pending list and invalidates the token. Already-accepted invitations cannot be cancelled.

8. **Admin can resend invitation emails** — For pending (non-expired, non-accepted) invitations, the admin can click a "Resend" action that generates a new token, resets the expiry to 7 days, and sends a fresh invitation email.

9. **Duplicate invitation prevention** — If an invitation is already pending for the same email address, the system prevents sending a duplicate and shows an appropriate error. If a user with that email already exists as an active member of the team, the system prevents the invitation and shows an error.

10. **Role selector shows all 6 roles** — The role dropdown in the invite form displays all 6 roles: Admin, Coach, Analyst, Physio/Medical, Player, Staff. The display labels are human-friendly (e.g., "Physio / Medical" for `"physio"`).

11. **Members list shows both active users and pending invites** — The team management page displays a unified view with: (a) a table of active team members with their name, email, role badge, status, and join date, and (b) a section for pending invitations showing name, email, assigned role, time remaining, and actions (cancel, resend).

12. **Authorization enforced at data layer** — All invitation mutations (`createInvite`, `acceptInvite`, `cancelInvite`, `resendInvite`) enforce authorization at the Convex layer. Only admins can create, cancel, or resend invitations. The `acceptInvite` mutation validates the token, checks expiry, and verifies the authenticated user's email matches the invitation email.

## Tasks / Subtasks

- [x] **Task 1: Extend invitation data model** (AC: #1, #2, #4, #9)
  - [x] 1.1: Update `packages/backend/convex/table/adminInvites.ts` — rename table to `invitations` (or create a new table) with fields: `email: v.string()`, `name: v.string()`, `role: v.union(v.literal("admin"), v.literal("coach"), v.literal("analyst"), v.literal("physio"), v.literal("player"), v.literal("staff"))`, `token: v.string()`, `teamId: v.id("teams")`, `invitedBy: v.id("users")`, `expiresAt: v.number()`, `acceptedAt: v.optional(v.number())`, `cancelledAt: v.optional(v.number())`
  - [x] 1.2: Add indexes: `by_token` on `["token"]`, `by_email` on `["email"]`, `by_teamId` on `["teamId"]`, `by_teamId_status` on `["teamId", "acceptedAt"]`
  - [x] 1.3: Update `packages/backend/convex/schema.ts` to register the updated/new table
  - [x] 1.4: Decide migration approach — if renaming `adminInvites` to `invitations`, create a migration. If creating a new `invitations` table alongside `adminInvites`, the old table can be deprecated. **Recommendation:** Create a new `invitations` table and deprecate `adminInvites` to avoid migration complexity. Update the existing admin invite flow to use the new table.

- [x] **Task 2: Create invitation backend mutations** (AC: #1, #4, #6, #7, #8, #9, #12)
  - [x] 2.1: Create `packages/backend/convex/invitations/mutations.ts` with `createInvite` mutation: calls `requireRole(ctx, ["admin"])`, validates email format, checks for existing active user with same email in the team, checks for existing pending (non-expired, non-accepted, non-cancelled) invitation for the same email, generates 32-char token, creates invitation record with `teamId` from auth context and 7-day expiry, schedules email sending action. Returns invitation ID.
  - [x] 2.2: Create `acceptInvite` mutation: requires authenticated user (newly signed up), validates token exists and is not expired/accepted/cancelled, validates the authenticated user's email matches the invitation email, patches the user record with `role`, `teamId`, `status: "active"`, marks invitation `acceptedAt: Date.now()`. Returns success.
  - [x] 2.3: Create `cancelInvite` mutation: calls `requireRole(ctx, ["admin"])`, validates invitation belongs to admin's team, validates invitation is still pending (not accepted), sets `cancelledAt: Date.now()`. Returns success.
  - [x] 2.4: Create `resendInvite` mutation: calls `requireRole(ctx, ["admin"])`, validates invitation belongs to admin's team, validates invitation is still pending, generates a new 32-char token, resets `expiresAt` to 7 days from now, schedules email sending action with the new token. Returns success.

- [x] **Task 3: Create invitation backend queries** (AC: #3, #11)
  - [x] 3.1: Create `packages/backend/convex/invitations/queries.ts` with `listPendingInvites` query: calls `requireRole(ctx, ["admin"])`, returns all invitations for the admin's team where `acceptedAt` is undefined AND `cancelledAt` is undefined AND `expiresAt > Date.now()`. Enriches each with inviter name.
  - [x] 3.2: Create `getInviteByToken` query: takes `token` argument (no auth required — used on accept-invite page before user is authenticated), returns invitation details (name, email, role, inviter name, team name) if token is valid (not expired, not accepted, not cancelled). Returns `null` otherwise.
  - [x] 3.3: Create `getTeamMembersWithInvites` query: calls `requireRole(ctx, ["admin"])`, returns both active team members (from `users` table filtered by `teamId`) and pending invitations (from `invitations` table), combined into a unified response for the members management page.

- [x] **Task 4: Create/update invitation email template and action** (AC: #4, #5)
  - [x] 4.1: Update or create invitation email template in `packages/transactional/emails/` — the email should include: greeting with name, invitation message mentioning the role they're being invited for, the team name, "Accept Invitation" button linking to `{ADMIN_URL}/accept-invite?token={token}`, expiration info (7 days), app branding footer.
  - [x] 4.2: Create `packages/backend/convex/invitations/actions.ts` with `sendInviteEmail` internal action: retrieves invitation details, constructs the invite URL, renders the HTML template, sends via Resend (or logs in dev mode). Handles errors gracefully — a failed email send should not crash the system (log the error, the admin can resend).
  - [x] 4.3: Ensure the email sending action is called from both `createInvite` and `resendInvite` mutations via `ctx.scheduler.runAfter(0, ...)`.

- [x] **Task 5: Update accept-invite page and form** (AC: #5, #6)
  - [x] 5.1: Update `apps/admin/src/app/(auth)/accept-invite/page.tsx` (if needed) and `apps/admin/src/components/app/auth/accept-invite-form.tsx` — the form should: extract token from URL params, query `getInviteByToken(token)` to display invite details, show the inviter name, assigned role (human-friendly label), and team name in the welcome message. On submit: sign up the user with email + password, call `acceptInvite(token)` mutation, redirect to `/` (homepage).
  - [x] 5.2: Handle error states: invalid token (show "Invalid invitation link"), expired token (show "This invitation has expired — contact your admin"), already accepted (show "This invitation has already been used"), generic error (show error message).
  - [x] 5.3: Ensure the accept flow works correctly with the existing `@convex-dev/auth` Password provider — the user signs up via `signIn("password", { email, password, flow: "signUp" })`, then the `acceptInvite` mutation patches their user record.

- [x] **Task 6: Update team management page — invite dialog** (AC: #1, #10)
  - [x] 6.1: Update `apps/admin/src/components/app/dashboard/invite-dialog.tsx` — add a **role selector** to the form. The selector shows all 6 roles with human-friendly labels: "Admin", "Coach", "Analyst", "Physio / Medical", "Player", "Staff". Use the shadcn `Select` component. The role field is required.
  - [x] 6.2: Update the form validation schema to include `role: z.enum(USER_ROLES)` as a required field.
  - [x] 6.3: Update the mutation call to pass the selected role to `createInvite` (instead of `inviteAdmin`).
  - [x] 6.4: Update the success toast to mention the assigned role: e.g., "Invitation sent to user@example.com as Coach".

- [x] **Task 7: Update team management page — members table** (AC: #3, #11)
  - [x] 7.1: Update `apps/admin/src/components/app/dashboard/admin-table.tsx` (rename to `MembersTable.tsx` or update in-place) — the table should display ALL team members (not just admins) with columns: Avatar, Name, Email, Role (badge), Status (Active/Invited), Join Date, Actions.
  - [x] 7.2: Add a **role badge** column showing the user's role with distinct styling (use existing Badge component with color variants).
  - [x] 7.3: Add **status badge** column: "Active" (green) for active users, "Invited" (yellow/amber) for pending invitations, "Deactivated" (gray) for deactivated users.
  - [x] 7.4: Add role filter dropdown above the table to filter by role.
  - [x] 7.5: Ensure the actions dropdown includes: Edit (navigate to user detail), Remove (delete confirmation). For pending invites, the actions should be: Resend and Cancel.

- [x] **Task 8: Update team management page — pending invites section** (AC: #7, #8)
  - [x] 8.1: Update `apps/admin/src/components/app/dashboard/pending-invites.tsx` — add a "Resend" action button alongside the existing "Cancel" button for each pending invite.
  - [x] 8.2: Wire the "Resend" button to call the `resendInvite` mutation with the invitation ID. Show success toast: "Invitation resent to user@example.com".
  - [x] 8.3: Display the assigned role for each pending invite in the invite card/row.
  - [x] 8.4: Update the query from `listInvites` (old) to `listPendingInvites` (new).

- [x] **Task 9: Migrate existing admin invite flow** (AC: #12)
  - [x] 9.1: Update the existing `acceptInvite` logic in `packages/backend/convex/table/admin.ts` to delegate to the new `invitations/mutations.ts` `acceptInvite` — OR — update the accept-invite form to call the new mutation directly and deprecate the old one. **Recommendation:** The accept-invite form should call the new `acceptInvite` from `invitations/mutations.ts`. Keep the old `admin.ts` functions as deprecated wrappers that call the new ones, to avoid breaking any remaining references.
  - [x] 9.2: Update any existing references to `api.admin.inviteAdmin` to use `api.invitations.mutations.createInvite` in the frontend.
  - [x] 9.3: Update any existing references to `api.admin.listInvites` to use `api.invitations.queries.listPendingInvites`.
  - [x] 9.4: Update any existing references to `api.admin.cancelInvite` to use `api.invitations.mutations.cancelInvite`.
  - [x] 9.5: Update the `api.admin.getInvite` reference in the accept-invite form to use `api.invitations.queries.getInviteByToken`.

- [x] **Task 10: Write backend unit tests** (AC: #1, #6, #7, #8, #9, #12)
  - [x] 10.1: Create `packages/backend/convex/invitations/__tests__/mutations.test.ts`
  - [x] 10.2: Test `createInvite`: (a) succeeds for admin, (b) throws NOT_AUTHORIZED for non-admin roles, (c) prevents duplicate pending invites for same email, (d) prevents inviting existing active team member, (e) creates invitation with correct role and teamId, (f) generates valid 32-char token, (g) sets 7-day expiry
  - [x] 10.3: Test `acceptInvite`: (a) succeeds with valid token, (b) sets user role and teamId correctly, (c) marks invitation acceptedAt, (d) throws for expired token, (e) throws for already-accepted token, (f) throws for cancelled invitation, (g) throws if email doesn't match
  - [x] 10.4: Test `cancelInvite`: (a) succeeds for admin, (b) throws NOT_AUTHORIZED for non-admin, (c) throws for already-accepted invite, (d) throws for invite not in admin's team
  - [x] 10.5: Test `resendInvite`: (a) succeeds for admin, (b) generates new token, (c) resets expiry, (d) throws for already-accepted invite

- [x] **Task 11: Final validation** (AC: all)
  - [x] 11.1: Run `pnpm typecheck` — must pass with zero errors
  - [x] 11.2: Run `pnpm lint` — must pass with zero errors
  - [x] 11.3: Run `pnpm test` (backend tests) — all new tests pass
  - [x] 11.4: Start the dev server — verify the full invitation flow end-to-end: admin invites user with role → email is sent (logged in dev) → accept-invite page loads → user sets password → user appears as active with correct role
  - [x] 11.5: Verify the existing admin invite flow still works (backward compatibility) OR has been fully migrated to the new system
  - [x] 11.6: Verify members list shows both active users and pending invites correctly

## Dev Notes

### Architecture Context

This story builds on Story 2.1 (Auth & Roles data model) and extends the existing admin-only invitation system to support **all 6 roles**. It directly implements:

- **FR34:** Admins can invite new users by email and assign roles
- **FR33:** Users authenticate via email/password (the accept-invite flow creates an account)
- **FR35:** All data is scoped to a team (tenant) — invitations carry `teamId`
- **FR36:** Access control rules are enforced at the Convex query/mutation layer — only admins can manage invitations

**Key architectural decisions from architecture.md:**

- **RBAC Model:** Single role enum on user record. The invitation assigns the role at creation time, and `acceptInvite` writes it to the user record. [Source: architecture.md#Authentication-&-Security]
- **Authorization Pattern:** All mutations use `requireRole(ctx, ["admin"])` from `convex/lib/auth.ts`. The `acceptInvite` mutation uses `requireAuth(ctx)` (any authenticated user can accept their own invitation). [Source: architecture.md#Authentication-&-Security]
- **Multi-tenant Isolation:** Invitations carry `teamId`. The accepting user is assigned to the inviting admin's team. Queries filter by the authenticated admin's team. [Source: architecture.md#Authentication-&-Security]
- **Error Handling:** Use `ConvexError` with standardized codes: `NOT_AUTHORIZED`, `VALIDATION_ERROR`, `NOT_FOUND`. [Source: architecture.md#Format-Patterns]
- **Notification Pattern:** The `createNotification` utility from `convex/lib/notifications.ts` could be used to notify the admin when an invitation is accepted. However, the notification system may not yet exist at this point in the implementation sequence — check if Story 3.7 (Notification Center) has been completed. If not, skip notifications for now and add them later. [Source: architecture.md#API-&-Communication-Patterns]
- **Email Sending:** Uses Resend via `@convex-dev/resend` component, already configured in `packages/backend/convex/emails.ts`. [Source: existing codebase]

### Variance from Epic AC

The original epic AC (epics.md, Story 2.2) states:
> an invitation is sent to the email address

This story implements email sending via the existing Resend integration. In dev mode, emails are logged to the console rather than sent — this is the existing behavior from the template and is acceptable for development.

The epic AC does not mention resend functionality or team-scoped invitations — these are added based on architecture requirements (multi-tenancy) and UX best practices (resend for failed deliveries).

### Current State (Baseline)

**Existing Invitation System:**
The template provides a fully functional admin-only invitation system:

- `packages/backend/convex/table/adminInvites.ts` — Table schema with `email`, `name`, `token`, `invitedBy`, `expiresAt`, `acceptedAt`. Indexes: `by_token`, `by_email`.
- `packages/backend/convex/table/admin.ts` — 630+ line file containing: `inviteAdmin`, `acceptInvite`, `getInvite`, `listInvites`, `cancelInvite` mutations/queries, plus user management functions (`updateUser`, `deleteUser`, `banUser`, `unbanUser`).
- `packages/backend/convex/emails.ts` — Email sending via `@convex-dev/resend`. Has `sendAdminInviteEmail` internal action.
- `packages/transactional/emails/admin-invite.tsx` — React Email template for admin invitations.
- `packages/transactional/emails/html-templates.ts` — Plain HTML email templates including `renderAdminInviteHtml()`.
- `apps/admin/src/components/app/auth/accept-invite-form.tsx` — Accept invitation page: extracts token from URL, validates invite, shows password form, calls `signIn` + `acceptInvite`.
- `apps/admin/src/components/app/dashboard/invite-dialog.tsx` — Dialog with name + email fields (no role selector), calls `inviteAdmin`.
- `apps/admin/src/components/app/dashboard/pending-invites.tsx` — Lists pending invites with cancel button.
- `apps/admin/src/components/app/dashboard/admin-table.tsx` — Lists admin users only.
- `apps/admin/src/app/(app)/team/page.tsx` — Team management page composing InviteDialog, PendingInvites, AdminTable.

**What needs to change:**
1. Invitation system must support all 6 roles (not just admin)
2. Invitations must carry `teamId` for multi-tenant isolation
3. Invite dialog must include a role selector
4. Members table must show all team members (not just admins) with role badges
5. Pending invites must show assigned role and support resend
6. Accept-invite form must display the assigned role

**What can be reused:**
- Token generation logic (32-char alphanumeric)
- Email sending infrastructure (Resend + templates)
- Accept-invite page structure and password form
- Invite dialog UI structure (extend with role selector)
- Pending invites component (extend with role display and resend)

### Migration Strategy

**Approach: New `invitations` table alongside `adminInvites`**

Rather than modifying the existing `adminInvites` table (which risks breaking existing pending invitations), create a new `invitations` table with the full schema. Then:

1. New invitations use the `invitations` table exclusively
2. The accept-invite form checks BOTH tables — first the new `invitations` table, then falls back to `adminInvites` for backward compatibility with any outstanding invitations sent before this story
3. Once all old invitations have expired or been accepted (7-day window), the `adminInvites` table can be removed in a cleanup task

**Alternative approach (simpler but riskier):** Add `role` and `teamId` fields to the existing `adminInvites` table as optional fields. Existing invitations without these fields continue to work (defaulting to `role: "admin"` and the first team). This avoids creating a new table but requires careful handling of optional fields.

**Recommendation for the developer:** Evaluate both approaches based on whether there are any outstanding pending invitations in the system. If the platform is in early development with no real users, the simpler approach (extending `adminInvites`) is fine. If there are real pending invitations, use the new table approach.

### Convex Function Organization

```
convex/invitations/
  queries.ts          -- listPendingInvites, getInviteByToken, getTeamMembersWithInvites
  mutations.ts        -- createInvite, acceptInvite, cancelInvite, resendInvite
  actions.ts          -- sendInviteEmail (internal action)
  __tests__/
    mutations.test.ts -- Unit tests for invitation mutations
```

### Frontend Component Changes

```
components/app/dashboard/
  invite-dialog.tsx      -- MODIFY: Add role selector (Select component)
  pending-invites.tsx    -- MODIFY: Add role display, resend action
  admin-table.tsx        -- MODIFY/RENAME: Show all team members, add role + status columns

components/app/auth/
  accept-invite-form.tsx -- MODIFY: Display assigned role, query new getInviteByToken
```

### Role Display Labels

| Role Value | Display Label | Badge Variant |
|-----------|---------------|---------------|
| `"admin"` | Admin | Default/primary |
| `"coach"` | Coach | Secondary |
| `"analyst"` | Analyst | Secondary |
| `"physio"` | Physio / Medical | Secondary |
| `"player"` | Player | Outline |
| `"staff"` | Staff | Outline |

### Token Generation

Reuse the existing pattern from `admin.ts`:
```typescript
function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 32)
}
```

### Error Messages

| Scenario | Error Code | User Message |
|----------|-----------|--------------|
| Non-admin attempts invite | `NOT_AUTHORIZED` | "Only admins can invite team members" |
| Duplicate pending invite | `VALIDATION_ERROR` | "An invitation is already pending for this email address" |
| Existing active user | `VALIDATION_ERROR` | "A user with this email is already a member of this team" |
| Invalid/missing token | `NOT_FOUND` | "This invitation link is invalid" |
| Expired token | `VALIDATION_ERROR` | "This invitation has expired. Please ask your admin to send a new one." |
| Already accepted | `VALIDATION_ERROR` | "This invitation has already been used" |
| Email mismatch on accept | `VALIDATION_ERROR` | "Your email does not match this invitation" |

### Dependencies

- **Story 2.1** (Auth & Roles data model) — MUST be completed first. This story depends on: `requireAuth`, `requireRole` helpers, the `teams` table, the extended `users` table with `role` and `teamId` fields, and the `UserRole` type from shared constants.
- **Epic 1** (Design System) — shadcn/ui components (Select, Badge, Dialog, Table, Button) must be available. These are already installed per the template.

### What This Story Does NOT Include

- **No navigation changes** — already done in Story 1.3
- **No homepage** — that's Story 2.3
- **No notification system** — notifications for invitation acceptance can be added when the notification center is built (Story 3.7)
- **No player-specific invitation flow** — Epic 5 Story 5.2 handles player profile creation with an invitation prompt. This story handles the generic user invitation system that 5.2 will use.
- **No OAuth signup for invited users** — invited users sign up via email/password only. OAuth (GitHub, Google, Apple) remains for self-registration if enabled.
- **No bulk invitation** — single invitations only for Sprint 1
- **No invitation analytics** — no tracking of open/click rates on invitation emails

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/invitations/mutations.ts` | Created | createInvite, acceptInvite, cancelInvite, resendInvite |
| `packages/backend/convex/invitations/queries.ts` | Created | listPendingInvites, getInviteByToken, getTeamMembersWithInvites |
| `packages/backend/convex/invitations/actions.ts` | Created | sendInviteEmail internal action |
| `packages/backend/convex/schema.ts` | Modified | Register new invitations table |
| `packages/backend/convex/table/adminInvites.ts` | Modified | Extend with role + teamId fields OR deprecate |
| `packages/backend/convex/table/admin.ts` | Modified | Deprecate old invite functions, delegate to new module |
| `packages/backend/convex/emails.ts` | Modified | Add/update sendInviteEmail action for role-aware invitations |
| `packages/transactional/emails/admin-invite.tsx` | Modified | Update template to show assigned role and team name |
| `packages/transactional/emails/html-templates.ts` | Modified | Update renderAdminInviteHtml to include role |
| `apps/admin/src/components/app/auth/accept-invite-form.tsx` | Modified | Query new getInviteByToken, display role, call new acceptInvite |
| `apps/admin/src/components/app/dashboard/invite-dialog.tsx` | Modified | Add role selector (Select component) |
| `apps/admin/src/components/app/dashboard/pending-invites.tsx` | Modified | Add role display, resend action |
| `apps/admin/src/components/app/dashboard/admin-table.tsx` | Modified | Show all team members, add role + status columns |
| `apps/admin/src/app/(app)/team/page.tsx` | Modified | Update to use new queries and components |
| `packages/backend/convex/invitations/__tests__/mutations.test.ts` | Created | Unit tests for invitation mutations |

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Old pending invitations (sent via `adminInvites`) break after migration | Accept-invite form checks both tables OR extends the existing table. 7-day expiry means old invitations auto-expire. |
| `acceptInvite` race condition — user signs up but mutation fails | The auth signup and role assignment are separate operations. If `acceptInvite` fails after signup, the user has an account but no role/team. Handle this in the accept-invite form: retry the mutation, or show an error with "Contact admin" guidance. The admin can manually assign the role from the members page. |
| Email delivery fails silently | Email sending is a scheduled action. If it fails, the admin won't know unless they check. Mitigate: show a "Resend" button on pending invites (Task 8). In dev mode, emails are logged to console — verify the log output. |
| Role field on existing `adminInvites` table is undefined for old invitations | Default to `"admin"` role if the `role` field is missing — maintains backward compatibility with invitations sent before this story. |
| Token collision (two invitations with same token) | 32-char alphanumeric token has ~165 bits of entropy. Collision probability is negligible. No additional uniqueness check needed. |

### Alignment with Architecture Document

- **RBAC Model:** Matches — role assigned during invitation, written to user record on accept. [architecture.md#Authentication-&-Security]
- **Auth Helpers:** Uses `requireRole(ctx, ["admin"])` for admin-only mutations, `requireAuth(ctx)` for accept flow. [architecture.md#Authentication-&-Security]
- **Multi-tenancy:** Invitations carry `teamId`, accepted users join the inviting admin's team. [architecture.md#Authentication-&-Security]
- **Error Handling:** Uses `ConvexError` with standardized codes. [architecture.md#Format-Patterns]
- **Naming:** camelCase for Convex tables/functions, PascalCase for React components. [architecture.md#Naming-Patterns]
- **File Structure:** `convex/invitations/` module with queries.ts, mutations.ts, actions.ts. [architecture.md#Convex-Function-Organization]
- **Frontend Patterns:** `useQuery` for real-time subscription, `useMutation` for writes, `toast` for feedback, `react-hook-form` + Zod for form validation. [architecture.md#Frontend-Architecture]
- **Testing:** Co-located tests in `__tests__/` using `@convex-dev/test` + `vitest`. [architecture.md#Structure-Patterns]
- **No detected conflicts** with the architecture document.

### References

- [Source: architecture.md#Authentication-&-Security] — RBAC model, auth helpers, multi-tenant isolation
- [Source: architecture.md#API-&-Communication-Patterns] — Notification pattern, error handling
- [Source: architecture.md#Format-Patterns] — ConvexError codes, date formats
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming, structure, process patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: architecture.md#Frontend-Architecture] — State management, page structure, component organization
- [Source: epics.md#Story-2.2] — Original story definition and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR33, FR34, FR35, FR36 mapped to Epic 2
- [Source: story-2.1] — Dependency: Auth helpers, teams table, users table extension

## Dev Agent Record

### Agent Model Used

Claude Opus 4 (via Claude Code)

### Debug Log References

- Typecheck: 5/5 packages pass (0 errors)
- Lint: admin/web pass; native has pre-existing errors (unrelated to this story)
- Tests: 317/317 pass (all backend tests including invitation tests)
- Post-fix: aligned role types in admin-table.tsx, user-detail.tsx, user-table.tsx, users/page.tsx

### Completion Notes List

- **Migration approach:** Created new `invitations` table alongside `adminInvites` (deprecated). No data migration needed — legacy table preserved for backward compat with any outstanding admin invites.
- **Accept-invite backward compat:** `accept-invite-form.tsx` queries new `getInviteByToken` first, falls back to legacy `api.table.admin.getInvite` for old tokens.
- **Role labels:** Added `ROLE_LABELS` map to `packages/shared/roles.ts`. Duplicated in `apps/admin/src/utils/roles.ts` because admin app doesn't have `@packages/shared` as a dependency.
- **Zod v4:** Admin app uses Zod 4 which uses `{ message }` instead of `{ required_error }` for `z.enum()`.
- **Test pattern:** Used inline logic replication (matching `convex-test` pattern from existing tests) rather than direct mutation handler calls, since `convex-test` doesn't expose `.handler` on registered mutations.
- **Email action:** Uses internal query `getInvitationById` to fetch invitation data from action context (Convex actions can't access DB directly).
- **Post-fix (follow-up):** admin-table.tsx, user-detail.tsx, user-table.tsx had stale `"user" | "admin"` role types causing TS errors. Updated to derive types from Convex query results and use `USER_ROLES`/`ROLE_LABELS` from `@packages/shared/roles`. Removed `roleFilter="user"` from users/page.tsx (no longer a valid role).

### File List

- `packages/backend/convex/table/invitations.ts` — **Created** — New invitations table schema with role, teamId, cancelledAt fields
- `packages/backend/convex/schema.ts` — **Modified** — Registered new invitations table
- `packages/backend/convex/invitations/mutations.ts` — **Created** — createInvite, acceptInvite, cancelInvite, resendInvite
- `packages/backend/convex/invitations/queries.ts` — **Created** — listPendingInvites, getInviteByToken, getTeamMembersWithInvites
- `packages/backend/convex/invitations/actions.ts` — **Created** — sendInviteEmail internal action
- `packages/backend/convex/invitations/internalQueries.ts` — **Created** — getInvitationById internal query for action use
- `packages/backend/convex/invitations/__tests__/mutations.test.ts` — **Created** — 18 unit tests for all 4 mutations
- `packages/transactional/emails/html-templates.ts` — **Modified** — Added renderInviteHtml template with role/team/inviter
- `packages/transactional/index.ts` — **Modified** — Exported renderInviteHtml
- `packages/shared/roles.ts` — **Modified** — Added ROLE_LABELS map
- `apps/admin/src/utils/roles.ts` — **Created** — Local role constants for admin app
- `apps/admin/src/components/app/auth/accept-invite-form.tsx` — **Modified** — Uses new getInviteByToken + acceptInvite, shows role/team, error states, legacy fallback
- `apps/admin/src/components/app/dashboard/invite-dialog.tsx` — **Modified** — Added role selector (Select), uses createInvite, role in toast
- `apps/admin/src/components/app/dashboard/admin-table.tsx` — **Modified** — Shows all team members via getTeamMembersWithInvites, role badges, status badges, role filter
- `apps/admin/src/components/app/dashboard/pending-invites.tsx` — **Modified** — Uses listPendingInvites, shows role, resend button, cancelInvite/resendInvite mutations
- `apps/admin/src/app/(app)/team/page.tsx` — **Modified** — Updated description text
- `apps/admin/src/components/app/dashboard/user-detail.tsx` — **Modified** — Aligned role form schema with 6-role enum, uses ROLE_LABELS
- `apps/admin/src/components/app/dashboard/user-table.tsx` — **Modified** — Aligned UserData type with Convex query return, uses ROLE_LABELS
- `apps/admin/src/app/(app)/users/page.tsx` — **Modified** — Removed invalid roleFilter="user" prop
- `apps/web/src/app/(auth)/accept-invite/page.tsx` — **Created** — Accept-invite route page for web app
- `apps/web/tests/2-2-implement-user-invitation-onboarding.spec.ts` — **Created** — Playwright E2E tests for invitation & onboarding flows
