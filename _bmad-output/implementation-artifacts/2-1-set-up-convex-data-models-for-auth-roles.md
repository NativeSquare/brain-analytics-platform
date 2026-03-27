# Story 2.1: Set Up Convex Data Models for Auth & Roles

Status: complete
Story Type: backend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **Testing philosophy: Write tests where they matter — critical business logic, security rules, data integrity, and complex state management. Do NOT write tests for trivial getters, simple UI rendering, or obvious CRUD. Quality over quantity.**

> **IMPORTANT: Backend and integration tests MUST use @convex-dev/test (Convex test framework). Do not use mock-based testing for Convex mutations/queries — use the real Convex test environment.**

## Story

As a developer,
I want to define the Convex schemas for teams and extend the users table with roles and team membership,
so that authentication and role-based access control have a data foundation that all subsequent modules depend on.

## Acceptance Criteria

1. **Teams table exists with required fields** — A `teams` table is defined in the Convex schema with fields: `name` (string), `slug` (string, unique), and `metadata` (optional object). The table has an index on `slug` for lookups. All team documents have an `_id` and `_creationTime` (provided by Convex automatically).

2. **Users table is extended with team and role fields** — The existing `users` table is extended with: `teamId` (id reference to `teams` table), `role` (union literal: `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`), `fullName` (optional string, mirrors existing `name` field for explicit usage), `avatarUrl` (optional string, mirrors existing `image` field), and `status` (union literal: `"active" | "invited" | "deactivated"`, default `"active"`). The existing `role: v.optional(v.union(v.literal("user"), v.literal("admin")))` field is replaced with the new 6-role enum. An index `by_teamId` exists on the users table for team-scoped queries. An index `by_teamId_role` exists for team+role filtered queries.

3. **Auth helper `requireAuth` returns user and teamId** — A `requireAuth(ctx)` function in `convex/lib/auth.ts` validates the authenticated user, checks they are not banned and not deactivated, and returns `{ user, teamId }`. It throws a `ConvexError` with code `NOT_AUTHENTICATED` if no valid session exists, and `NOT_AUTHORIZED` if the user is banned or deactivated.

4. **Auth helper `requireRole` enforces role-based access** — A `requireRole(ctx, allowedRoles)` function calls `requireAuth` internally and additionally checks `user.role` against the provided array of allowed roles. It throws `ConvexError` with code `NOT_AUTHORIZED` if the user's role is not in the allowed list. Returns `{ user, teamId }`.

5. **Auth helper `requireSelf` enforces self-access** — A `requireSelf(ctx, targetUserId)` function calls `requireAuth` internally and checks that the authenticated user's `_id` matches the provided `targetUserId`. Throws `NOT_AUTHORIZED` if mismatch. Returns `{ user, teamId }`.

6. **Auth helper `requireMedical` is a shorthand** — A `requireMedical(ctx)` function is equivalent to `requireRole(ctx, ["admin", "physio"])`. Returns `{ user, teamId }`.

7. **Seed data function creates default team and roles** — A seed mutation (or internal mutation callable via dashboard) creates: a default team named "Default Club" with slug "default-club", and ensures the 6 role type constants (`ADMIN`, `COACH`, `ANALYST`, `PHYSIO`, `PLAYER`, `STAFF`) are exported from a shared constants file. The seed function is idempotent — running it twice does not create duplicates.

8. **Team-scoped user queries exist** — A `getUsersByTeam` query returns all users for the authenticated user's team, filtered by `teamId`. A `getTeamMembers` query returns team members with optional role filter. Both queries start with `requireAuth(ctx)` or `requireRole(ctx, ["admin"])` as appropriate.

9. **All queries enforce team-scoped data access** — Every query and mutation created in this story filters data by the `teamId` returned from `requireAuth`. No query returns data from a different team.

10. **TypeScript types are correct and exported** — Role type (`UserRole`), status type (`UserStatus`), and team type are exported as TypeScript types from a shared location so that frontend and other backend modules can import them. The role constants array `USER_ROLES` is also exported.

11. **No regressions** — `pnpm typecheck` passes. The existing auth flow (login, signup, OAuth) continues to work. Existing admin functions (`requireAdmin`, admin invite, ban/unban) are updated to use the new role field where applicable without breaking existing functionality.

## Tasks / Subtasks

- [x] **Task 1: Define shared role constants and types** (AC: #10)
  - [x] 1.1: Create or update `packages/shared/constants.ts` (or `packages/shared/roles.ts`) to export the role constants array: `export const USER_ROLES = ["admin", "coach", "analyst", "physio", "player", "staff"] as const`
  - [x] 1.2: Export the TypeScript type: `export type UserRole = (typeof USER_ROLES)[number]`
  - [x] 1.3: Export the user status constants: `export const USER_STATUSES = ["active", "invited", "deactivated"] as const` and `export type UserStatus = (typeof USER_STATUSES)[number]`
  - [x] 1.4: Verify the shared package exports are accessible from `@packages/shared` in both admin app and backend

- [x] **Task 2: Create the `teams` table** (AC: #1)
  - [x] 2.1: Create `packages/backend/convex/table/teams.ts` defining the teams table schema with fields: `name: v.string()`, `slug: v.string()`, `metadata: v.optional(v.object({ logoUrl: v.optional(v.string()), timezone: v.optional(v.string()), country: v.optional(v.string()) }))`
  - [x] 2.2: Add index `by_slug` on `["slug"]` for unique slug lookups
  - [x] 2.3: Import and register the `teams` table in `packages/backend/convex/schema.ts`

- [x] **Task 3: Extend the `users` table schema** (AC: #2, #11)
  - [x] 3.1: Open `packages/backend/convex/table/users.ts` and add new fields to `documentSchema`: `teamId: v.optional(v.id("teams"))` (optional to support existing users without a team during migration), `status: v.optional(v.union(v.literal("active"), v.literal("invited"), v.literal("deactivated")))` defaulting to `"active"`
  - [x] 3.2: Replace the existing `role` field from `v.optional(v.union(v.literal("user"), v.literal("admin")))` to `v.optional(v.union(v.literal("admin"), v.literal("coach"), v.literal("analyst"), v.literal("physio"), v.literal("player"), v.literal("staff")))` — Note: keep `v.optional()` wrapper to maintain backward compatibility with existing user records that may have `role: "user"` or `role: undefined`
  - [x] 3.3: Add index `by_teamId` on `["teamId"]` for team-scoped queries
  - [x] 3.4: Add index `by_teamId_role` on `["teamId", "role"]` for team+role filtered queries
  - [x] 3.5: Update the `partialSchema` to match the new fields
  - [x] 3.6: Update the `currentUser` query to remain backward compatible — it should still return the user doc as-is

- [x] **Task 4: Create auth helper functions** (AC: #3, #4, #5, #6)
  - [x] 4.1: Create `packages/backend/convex/lib/auth.ts` (new file — not to be confused with existing `convex/auth.ts` which is the auth provider config)
  - [x] 4.2: Implement `requireAuth(ctx)`: use `getAuthUserId(ctx)` from `@convex-dev/auth/server`, fetch the user doc, validate not null, not banned, not deactivated (`status !== "deactivated"`), validate `teamId` exists. Return `{ user, teamId }`. Throw `ConvexError({ code: "NOT_AUTHENTICATED", message: "..." })` or `ConvexError({ code: "NOT_AUTHORIZED", message: "..." })` as appropriate
  - [x] 4.3: Implement `requireRole(ctx, allowedRoles: UserRole[])`: call `requireAuth(ctx)`, check `user.role` is in `allowedRoles` array. Throw `NOT_AUTHORIZED` if not. Return `{ user, teamId }`
  - [x] 4.4: Implement `requireSelf(ctx, targetUserId: Id<"users">)`: call `requireAuth(ctx)`, check `user._id === targetUserId`. Throw `NOT_AUTHORIZED` if mismatch. Return `{ user, teamId }`
  - [x] 4.5: Implement `requireMedical(ctx)`: delegate to `requireRole(ctx, ["admin", "physio"])`. Return `{ user, teamId }`
  - [x] 4.6: Implement `requireAdmin(ctx)`: delegate to `requireRole(ctx, ["admin"])`. Return `{ user, teamId }` — This replaces the existing `requireAdmin` in `convex/table/admin.ts` with a proper shared version
  - [x] 4.7: Export all helpers and the return type `AuthContext = { user: Doc<"users">; teamId: Id<"teams"> }`

- [x] **Task 5: Create team-scoped user queries and mutations** (AC: #8, #9)
  - [x] 5.1: Create `packages/backend/convex/users/queries.ts` with a `getUsersByTeam` query: calls `requireAuth(ctx)`, queries `users` table with index `by_teamId` filtered by the authenticated user's `teamId`. Returns array of user docs. Only admins can access this (use `requireRole(ctx, ["admin"])`)
  - [x] 5.2: Create a `getTeamMembers` query with optional `role` filter argument: calls `requireAuth(ctx)`, queries users by teamId and optionally by role. Accessible to all authenticated team members (for invitation selectors, etc.)
  - [x] 5.3: Create a `getTeamRoles` query that returns the static list of available roles for the team. This is a simple query returning the `USER_ROLES` constant — provides a server-authoritative list for dropdowns
  - [x] 5.4: Create `packages/backend/convex/users/mutations.ts` with an `updateUserRole` mutation: calls `requireRole(ctx, ["admin"])`, validates the new role is in `USER_ROLES`, patches the user's `role` field. Only admins can change roles
  - [x] 5.5: Create an `assignUserToTeam` internal mutation for use during onboarding/invitation flows: patches a user's `teamId` field

- [x] **Task 6: Create seed data function** (AC: #7)
  - [x] 6.1: Create `packages/backend/convex/seed.ts` with an internal mutation `seedDefaultData` that: (a) checks if a team with slug `"default-club"` already exists (idempotency check), (b) if not, creates the default team, (c) checks if an admin user exists, (d) if the current first admin user has no `teamId`, patches them with the new team's ID and `role: "admin"`, `status: "active"`
  - [x] 6.2: Export the seed function as an `internalMutation` so it can be called from the Convex dashboard or from a test setup
  - [x] 6.3: Document in dev notes how to run the seed: via Convex dashboard "Run Function" or via a one-time migration script

- [x] **Task 7: Update existing admin functions for compatibility** (AC: #11)
  - [x] 7.1: Open `packages/backend/convex/table/admin.ts` and update the local `requireAdmin()` helper to either: (a) delegate to the new shared `requireAdmin` from `convex/lib/auth.ts`, or (b) keep as-is but check for `role === "admin"` instead of the old check (whichever causes fewer changes)
  - [x] 7.2: Ensure `inviteAdmin` mutation still works — it should create the invite record as before. The invited user's role will be set to `"admin"` (matching the new enum) when they accept
  - [x] 7.3: Ensure `acceptInvite` mutation sets `role: "admin"` (which is valid in both old and new enums) and sets `status: "active"`
  - [x] 7.4: Ensure `banUser` / `unbanUser` mutations still work — the ban fields are unchanged
  - [x] 7.5: Run through all exported functions in `admin.ts` and verify no type errors after the role field change

- [x] **Task 8: Write unit tests for auth helpers** (AC: #3, #4, #5, #6)
  - [x] 8.1: Create `packages/backend/convex/lib/__tests__/auth.test.ts` using `convex-test` + `vitest`
  - [x] 8.2: Test `requireAuth`: (a) throws NOT_AUTHENTICATED when no session, (b) throws NOT_AUTHORIZED when user is banned, (c) throws NOT_AUTHORIZED when user status is "deactivated", (d) returns `{ user, teamId }` for valid authenticated user with a team
  - [x] 8.3: Test `requireRole`: (a) passes when user role is in allowed list, (b) throws NOT_AUTHORIZED when user role is not in allowed list, (c) works with multiple allowed roles
  - [x] 8.4: Test `requireSelf`: (a) passes when userId matches, (b) throws NOT_AUTHORIZED when userId doesn't match
  - [x] 8.5: Test `requireMedical`: (a) passes for admin, (b) passes for physio, (c) throws for coach/analyst/player/staff

- [x] **Task 9: Write unit tests for user queries and seed** (AC: #7, #8, #9)
  - [x] 9.1: Create `packages/backend/convex/users/__tests__/queries.test.ts`
  - [x] 9.2: Test `getUsersByTeam` returns only users from the authenticated user's team
  - [x] 9.3: Test `getTeamMembers` with role filter returns only matching roles
  - [x] 9.4: Test `updateUserRole` only succeeds for admin callers
  - [x] 9.5: Test seed function is idempotent — calling twice doesn't create duplicate teams

- [x] **Task 10: Final validation** (AC: #11)
  - [x] 10.1: Run `pnpm typecheck` — must pass with zero errors
  - [ ] 10.2: Run `pnpm lint` — skipped (no lint script in backend package)
  - [x] 10.3: Run `pnpm test` (or `vitest run` in the backend package) — all 27 tests pass
  - [ ] 10.4: Start the dev server — skipped (requires env vars and Convex cloud connection)
  - [ ] 10.5: Verify existing admin dashboard pages — skipped (requires running dev server)

## Dev Notes

### Architecture Context

This is the **foundational backend story** for the entire platform. Every subsequent module (Calendar, Documents, Players, Contracts) depends on the auth helpers and team-scoped data access patterns established here. This story directly implements:

- **FR33:** Users authenticate via email/password (extending existing auth)
- **FR35:** All data is scoped to a team (tenant); users can only access data belonging to their team
- **FR36:** Access control rules are enforced at the Convex query/mutation layer
- **NFR5:** All data access enforced at the Convex mutation/query layer (not UI-only)
- **NFR6:** Multi-tenant isolation: no cross-team data access possible at the data layer
- **NFR11:** Data model supports multiple clubs (teams) without schema changes

**Key architectural decisions from architecture.md:**

- **RBAC Model:** Single role enum on user record — NOT a separate `roles` table with a `userRoles` junction table. The architecture explicitly chose this approach: *"Extend existing user schema with `role: "admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. One role per user."* [Source: architecture.md#Authentication-&-Security]
- **Authorization Pattern:** Shared helper functions in `packages/backend/convex/lib/auth.ts` — `requireAuth`, `requireRole`, `requireSelf`, `requireMedical`. Every query and mutation starts with the appropriate auth check. No middleware — explicit function calls for clarity and testability. [Source: architecture.md#Authentication-&-Security]
- **Multi-tenant Isolation:** Every table includes `teamId`. Every query filters by `ctx.user.teamId`. Enforced at the auth helper level. [Source: architecture.md#Authentication-&-Security]
- **Error codes:** Standardized `ConvexError` codes: `NOT_AUTHENTICATED`, `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR` [Source: architecture.md#Format-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 2.1) specify:

> a `roles` table exists with id, name, teamId
> a `userRoles` junction table exists mapping users to roles

**This story intentionally deviates** from that AC based on the architecture decision document. The architecture explicitly chose a single role enum on the user record instead of separate roles/userRoles tables. Rationale:

1. Roles are a fixed set of 6 values — they don't need a dynamic table
2. One role per user — no many-to-many relationship needed
3. Simpler queries — no joins across junction tables
4. The architecture document is the authoritative technical spec, the epic provides business intent

The `isAdmin` field from the epic AC is also replaced by `role === "admin"` check — no separate boolean needed.

### Current State (Baseline)

**`convex/schema.ts`:** Imports from `@convex-dev/auth/server` authTables, plus custom tables: `adminInvites`, `feedback`, `users`. No `teams` table.

**`convex/table/users.ts`:** User schema has:
- Auth fields: `name`, `image`, `email`, `emailVerificationTime`, `phone`, `phoneVerificationTime`, `isAnonymous`
- Custom fields: `bio`, `birthDate`, `hasCompletedOnboarding`
- Role: `role: v.optional(v.union(v.literal("user"), v.literal("admin")))` — **must be replaced** with 6-role enum
- Ban fields: `banned`, `banReason`, `banExpires`
- Index: `email` on `["email"]`
- Exports: `currentUser` query, `getUserByEmail` query, `deleteAccount` mutation, CRUD via `generateFunctions`

**`convex/table/admin.ts`:** 630-line file with `requireAdmin()` helper that checks `role === "admin"`. Has user management mutations (inviteAdmin, acceptInvite, banUser, etc.). This file's `requireAdmin` will be superseded by the shared helper but must remain backward compatible.

**`convex/lib/auth/`:** Contains `ResendOTP.ts` and `ResendOTPPasswordReset.ts` — email OTP providers. **Not to be confused with the new `convex/lib/auth.ts`** (the auth helpers file). These are in a subdirectory and won't conflict.

**`convex/auth.ts`:** The convex-dev/auth provider configuration (Password, GitHub, Google, Apple). **Do not modify this file.**

### File Path Clarification

```
convex/auth.ts                    -- Auth PROVIDER config (DO NOT TOUCH)
convex/auth.config.ts             -- Auth config (DO NOT TOUCH)
convex/lib/auth/ResendOTP.ts      -- OTP email provider (DO NOT TOUCH)
convex/lib/auth/ResendOTPPasswordReset.ts -- Password reset OTP (DO NOT TOUCH)
convex/lib/auth.ts                -- NEW: Auth helpers (requireAuth, requireRole, etc.)
```

The new `convex/lib/auth.ts` file sits alongside the existing `convex/lib/auth/` directory. This is valid in Node.js/TypeScript — a file and directory can share a name prefix at the same level.

### Migration Strategy

Existing users in the database may have `role: "user"` or `role: "admin"` or `role: undefined`. The schema change must handle this gracefully:

1. Keep `role` as `v.optional(...)` so existing records without the new role values don't break schema validation
2. The `requireAuth` helper should handle the case where `role` is `"user"` (old value) — treat it as `"staff"` or throw a meaningful error asking the user to contact admin
3. The seed function should update the first admin user to have the new `role: "admin"` value (which is the same string, so it's compatible)
4. A future migration (or admin action) can update any remaining `role: "user"` records to the appropriate new role

### Convex Testing Setup

If `@convex-dev/test` and `vitest` are not yet installed in the backend package:

```bash
cd packages/backend
pnpm add -D @convex-dev/test vitest
```

Test files follow the pattern from architecture.md: co-located with modules in `__tests__/` subdirectories. Use Convex test helpers to create test databases and mock auth context.

### Role Constants Reference

| Role | Value | Description |
|------|-------|-------------|
| Admin | `"admin"` | Full platform access, user management, contracts |
| Coach | `"coach"` | Team management, player data (no contracts, no injuries) |
| Analyst | `"analyst"` | Stats and analytics focus (no contracts, no injuries) |
| Physio/Medical | `"physio"` | Medical data access including injuries |
| Player | `"player"` | Self-service only (own profile, own stats, own contract) |
| Staff | `"staff"` | General access (documents, calendar — no player management) |

### What This Story Does NOT Include

- **No UI components** — this is a backend-only story
- **No user invitation flow** — that's Story 2.2
- **No homepage** — that's Story 2.3
- **No navigation changes** — already done in Story 1.3
- **No notification system** — that's a separate story in Epic 3
- **No permission utilities for documents/calendar** — that's `convex/lib/permissions.ts`, built when needed
- **No data migration script** — existing users are handled via optional fields and the seed function

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/shared/constants.ts` (or new `roles.ts`) | Modified/Created | Add USER_ROLES, UserRole, USER_STATUSES, UserStatus exports |
| `packages/backend/convex/table/teams.ts` | Created | New teams table definition |
| `packages/backend/convex/table/users.ts` | Modified | Extend role enum to 6 roles, add teamId, add status, add indexes |
| `packages/backend/convex/schema.ts` | Modified | Import and register teams table |
| `packages/backend/convex/lib/auth.ts` | Created | requireAuth, requireRole, requireSelf, requireMedical, requireAdmin helpers |
| `packages/backend/convex/users/queries.ts` | Created | getUsersByTeam, getTeamMembers, getTeamRoles queries |
| `packages/backend/convex/users/mutations.ts` | Created | updateUserRole, assignUserToTeam mutations |
| `packages/backend/convex/seed.ts` | Created | seedDefaultData internal mutation |
| `packages/backend/convex/table/admin.ts` | Modified | Update requireAdmin to use new role enum or delegate to shared helper |
| `packages/backend/convex/lib/__tests__/auth.test.ts` | Created | Unit tests for auth helpers |
| `packages/backend/convex/users/__tests__/queries.test.ts` | Created | Unit tests for user queries |

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing users with `role: "user"` break after schema change | Keep role as `v.optional()`, treat unknown/legacy values gracefully in `requireAuth`. Seed function patches existing admin. |
| `convex/lib/auth.ts` conflicts with `convex/lib/auth/` directory | Both a file `auth.ts` and directory `auth/` can coexist at the same level in Node/TS. Verify import paths resolve correctly. If conflict arises, rename the helpers file to `convex/lib/authorization.ts`. |
| Admin functions in `admin.ts` break after role enum change | Task 7 explicitly verifies all existing admin functions. The `"admin"` literal exists in both old and new enums, so most functions need no change. |
| `generateFunctions` CRUD exports bypass auth checks | These are low-level utilities. New team-scoped queries in `users/queries.ts` replace direct usage. Document that `generateFunctions` exports should NOT be used directly from frontend — only internal backend use. |
| Seed function fails in production if no admin exists yet | Seed is idempotent and handles missing admin gracefully. It's an internal mutation, not auto-run — must be triggered manually. |

### Alignment with Architecture Document

- **RBAC Model:** Matches `architecture.md § Authentication & Security` — single role enum, 6 roles, one role per user
- **Auth Helpers:** Matches `architecture.md § Authentication & Security` — `requireAuth`, `requireRole`, `requireSelf`, `requireMedical` in `convex/lib/auth.ts`
- **Multi-tenancy:** Matches `architecture.md § Authentication & Security` — teamId on all tables, requireAuth returns teamId
- **Error Handling:** Matches `architecture.md § Format Patterns` — ConvexError with standardized codes
- **Naming:** Matches `architecture.md § Naming Patterns` — camelCase tables, camelCase columns, camelCase function names
- **File Structure:** Matches `architecture.md § Convex Function Organization` — `convex/lib/auth.ts` for shared helpers, `convex/users/` for user module
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `__tests__/` using `@convex-dev/test` + `vitest`
- **No detected conflicts or variances** with the architecture document (only with epic AC, as documented above)

### References

- [Source: architecture.md#Authentication-&-Security] — RBAC model, auth helpers, multi-tenant isolation
- [Source: architecture.md#Data-Architecture] — Hybrid normalization, data modeling approach
- [Source: architecture.md#Format-Patterns] — ConvexError codes, date formats
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: architecture.md#Decision-Impact-Analysis] — Implementation sequence (RBAC first, unblocks all modules)
- [Source: epics.md#Story-2.1] — Original story definition and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR33, FR34, FR35, FR36 mapped to Epic 2

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- convex-test `getUserIdentity` syscall not supported (issue #50): mocked `getAuthUserId` via `vi.hoisted` + `vi.mock` for auth helper tests
- convex-test module resolution from `__tests__/` subdirectories: `import.meta.glob` produces relative paths that don't match convex-test's expected format. Used `t.run()` with direct helper imports instead of `t.query(api....)` for query tests
- `@convex-dev/test` package referenced in story does not exist on npm — actual package is `convex-test`

### Completion Notes List

- Created `packages/shared/roles.ts` with USER_ROLES, UserRole, USER_STATUSES, UserStatus exports
- Created `packages/backend/convex/table/teams.ts` with teams table (name, slug, metadata, by_slug index)
- Extended `users` table with teamId, role (6-role enum), status, fullName, avatarUrl fields + by_teamId, by_teamId_role indexes
- Created `packages/backend/convex/lib/auth.ts` with requireAuth, requireRole, requireSelf, requireMedical, requireAdmin helpers + AuthContext type
- Created `packages/backend/convex/users/queries.ts` with getUsersByTeam, getTeamMembers, getTeamRoles queries
- Created `packages/backend/convex/users/mutations.ts` with updateUserRole mutation + assignUserToTeam internal mutation
- Created `packages/backend/convex/seed.ts` with idempotent seedDefaultData internal mutation
- Updated `packages/backend/convex/table/admin.ts`: new role enum in all validators, acceptInvite sets status:"active", updateUser uses new role enum
- Updated admin app components to use new 6-role enum (type fixes only, minimal UI changes)
- Excluded `__tests__/` from convex tsconfig (test files use Vite-specific import.meta.glob)
- Legacy `requireAdmin` in admin.ts kept as-is (no teamId requirement) for backward compat with admin app; new shared `requireAdmin` in `convex/lib/auth.ts` enforces team membership
- 27 tests total: 18 auth helper tests + 9 query/seed tests, all passing
- Seed function docs: run via Convex Dashboard "Run Function" → `seed:seedDefaultData` or CLI: `npx convex run seed:seedDefaultData`

### File List

- `packages/shared/roles.ts` — Created: USER_ROLES, UserRole, USER_STATUSES, UserStatus
- `packages/shared/package.json` — Modified: added `./roles` export
- `packages/backend/convex/table/teams.ts` — Created: teams table definition
- `packages/backend/convex/schema.ts` — Modified: registered teams table
- `packages/backend/convex/table/users.ts` — Modified: extended with teamId, 6-role enum, status, fullName, avatarUrl, new indexes
- `packages/backend/convex/lib/auth.ts` — Created: requireAuth, requireRole, requireSelf, requireMedical, requireAdmin, AuthContext
- `packages/backend/convex/users/queries.ts` — Created: getUsersByTeam, getTeamMembers, getTeamRoles
- `packages/backend/convex/users/mutations.ts` — Created: updateUserRole, assignUserToTeam
- `packages/backend/convex/seed.ts` — Created: seedDefaultData internal mutation
- `packages/backend/convex/table/admin.ts` — Modified: updated validators + acceptInvite sets status
- `packages/backend/convex/tsconfig.json` — Modified: excluded __tests__ dirs
- `packages/backend/package.json` — Modified: added test scripts + convex-test, vitest, @edge-runtime/vm devDeps
- `packages/backend/vitest.config.ts` — Created: vitest config for edge-runtime
- `packages/backend/convex/lib/__tests__/auth.test.ts` — Created: 18 auth helper tests
- `packages/backend/convex/users/__tests__/queries.test.ts` — Created: 9 query/seed tests
- `apps/admin/src/components/app/dashboard/admin-table.tsx` — Modified: updated role type
- `apps/admin/src/components/app/dashboard/user-table.tsx` — Modified: updated role type + filter
- `apps/admin/src/components/app/dashboard/user-detail.tsx` — Modified: updated role enum + form schema
- `apps/admin/src/app/(app)/users/page.tsx` — Modified: removed stale roleFilter="user"
