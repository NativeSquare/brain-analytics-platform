# Story 6.2: Contract Security & Access Control

Status: ready-for-dev

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want contract data to be completely hidden from non-admin users (except a player viewing their own contract),
so that sensitive financial information is protected at every layer of the system.

## Acceptance Criteria (BDD)

### AC1: Contract Tab Hidden for Non-Admin Users
**Given** a user with a non-admin role (Coach, Analyst, Physio, Player, Staff)
**When** they view any player's profile page
**Then** the "Contract" tab is not visible in the tab navigation
**And** no contract-related UI elements are rendered

### AC2: Convex Query-Layer Enforcement for Non-Admin Users
**Given** a user with a non-admin role
**When** any Convex contract query is executed (getContract, getContractDownloadUrl)
**Then** the query returns `null` (not an error) for non-admin, non-self requests
**And** no contract fields, PDF URLs, or extraction data are included in the response
**And** enforcement happens inside the Convex function, not via UI-only guards

### AC3: Direct URL Access Denied
**Given** a non-admin user who manually navigates to a player profile URL and attempts to access contract data
**When** the player profile page loads with a "contract" tab parameter or hash
**Then** the Contract tab does not render
**And** no contract data is fetched or exposed in the client

### AC4: Player Can View Own Contract (Read-Only)
**Given** a player is viewing their own profile
**When** they navigate to the Contract tab
**Then** the Contract tab is visible for their own profile only
**And** they can see their own extracted contract details (salary, bonuses, clauses, duration, termination terms, governing law)
**And** the original contract PDF is downloadable
**And** all fields are read-only (no "Edit" button rendered)
**And** they cannot upload or replace a contract

### AC5: Player Cannot View Other Players' Contracts
**Given** a player user
**When** they view another player's profile
**Then** the Contract tab is not visible
**And** the Convex query returns `null` for that player's contract

### AC6: Team-Scoped Contract Isolation
**Given** an admin from Team A
**When** they attempt to query a contract belonging to a player in Team B
**Then** the query returns `null` (teamId mismatch)
**And** no cross-tenant contract data is ever accessible

### AC7: Contract Tab Permissions Query
**Given** any authenticated user on a player profile page
**When** the page determines which tabs to display
**Then** a dedicated query (`canViewContract`) returns `true` only if:
  - User has admin role, OR
  - User is a player viewing their own profile (user.playerId matches the profile's playerId)
**And** this query is the single source of truth for Contract tab visibility

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Create `canViewContract` Authorization Query** (AC: 1, 3, 4, 5, 7)
  - [ ] 1.1: Add to `packages/backend/convex/contracts/queries.ts`:
    ```
    canViewContract(ctx, { playerId }) → boolean
    ```
    - Call `requireAuth(ctx)` to get `{ user, teamId }`
    - Return `true` if `user.role === "admin"`
    - Return `true` if `user.role === "player"` AND user's linked `playerId === args.playerId`
    - Return `false` for all other cases
    - Always filter by `teamId` — if player not in same team, return `false`
  - [ ] 1.2: Ensure the query uses the `players` table to verify the requesting player's identity (lookup user → player record via `userId`)

- [ ] **Task 2: Harden `getContract` Query with Player-Self Access** (AC: 2, 4, 5, 6)
  - [ ] 2.1: Modify `packages/backend/convex/contracts/queries.ts` `getContract`:
    - Current (from Story 6.1): `requireRole(ctx, ["admin"])`
    - New logic: call `requireAuth(ctx)`, then check:
      - If admin → proceed (full access)
      - If player AND `playerId` matches own linked player → proceed (read-only flag returned)
      - Otherwise → return `null` (no error thrown, no data leaked)
    - Always scope by `teamId`
  - [ ] 2.2: Add a `readOnly: boolean` field to the query return type:
    - `true` for player viewing own contract
    - `false` for admin
  - [ ] 2.3: Ensure `getContractDownloadUrl` follows same authorization logic — admin OR player-self only

- [ ] **Task 3: Harden Contract Mutations (Admin-Only Write Access)** (AC: 4)
  - [ ] 3.1: Verify `uploadContract` mutation uses `requireRole(ctx, ["admin"])` — players cannot upload
  - [ ] 3.2: Verify `updateContractFields` mutation uses `requireRole(ctx, ["admin"])` — players cannot edit
  - [ ] 3.3: Add explicit `NOT_AUTHORIZED` ConvexError if non-admin attempts mutation

- [ ] **Task 4: Write Security-Focused Backend Tests** (AC: 1, 2, 4, 5, 6)
  - [ ] 4.1: Add tests to `packages/backend/convex/contracts/__tests__/security.test.ts`
  - [ ] 4.2: Test `canViewContract`:
    - Admin user → returns `true` for any player in same team
    - Player user viewing own profile → returns `true`
    - Player user viewing other player → returns `false`
    - Coach/Analyst/Physio/Staff → returns `false`
    - Admin from different team → returns `false`
  - [ ] 4.3: Test `getContract` hardened access:
    - Admin → returns full contract with `readOnly: false`
    - Player-self → returns contract with `readOnly: true`
    - Player-other → returns `null`
    - Non-admin role (Coach, Physio, etc.) → returns `null`
    - Wrong team admin → returns `null`
  - [ ] 4.4: Test `getContractDownloadUrl` access:
    - Admin → returns signed URL
    - Player-self → returns signed URL
    - Non-admin/non-self → returns `null`
  - [ ] 4.5: Test mutation guards:
    - `uploadContract` rejects non-admin (including players)
    - `updateContractFields` rejects non-admin (including players)

### Frontend Tasks

- [ ] **Task 5: Implement Contract Tab Conditional Rendering** (AC: 1, 3, 4, 5, 7)
  - [ ] 5.1: In `apps/web/src/app/(app)/players/[playerId]/page.tsx`:
    - Subscribe to `api.contracts.queries.canViewContract` via `useQuery` passing the current `playerId`
    - Only include the "Contract" tab in the tabs array when `canViewContract` returns `true`
    - Do NOT render a hidden/disabled tab — completely omit it from the DOM
  - [ ] 5.2: If `canViewContract` is still loading (`undefined`), do not flash the tab — wait for resolution before rendering tabs

- [ ] **Task 6: Update ContractCard for Read-Only Mode** (AC: 4)
  - [ ] 6.1: In `apps/web/src/components/players/ContractCard.tsx`:
    - Read the `readOnly` flag from the `getContract` query response
    - When `readOnly === true`:
      - Hide the "Upload Contract" button
      - Hide the "Edit" button on extracted fields
      - Hide the "Replace Contract" confirmation
      - Display all fields as static text (no form controls)
    - When `readOnly === false` (admin):
      - Show full edit/upload/replace functionality (existing Story 6.1 behavior)
  - [ ] 6.2: Ensure the "Download PDF" button remains visible in both admin and player-self modes

- [ ] **Task 7: Verify No Contract Data Leakage in Player Profile** (AC: 2, 3)
  - [ ] 7.1: Confirm that the player profile page does NOT pre-fetch contract data for all users — only fetch when `canViewContract` is `true`
  - [ ] 7.2: Ensure no contract fields appear in the player profile overview/header area (contract data only in Contract tab)
  - [ ] 7.3: Verify the browser network tab shows no contract-related Convex queries for non-authorized users

## Dev Notes

### Architecture Patterns

- **Auth Enforcement at Query Layer (NOT UI-Only)**:
  Every contract query and mutation MUST call `requireAuth(ctx)` or `requireRole(ctx, ["admin"])` before accessing data. The UI conditional rendering is a UX enhancement, NOT a security mechanism. The Convex layer is the single source of truth.
  [Source: architecture.md#Authentication & Security]

- **Authorization Helpers** (`packages/backend/convex/lib/auth.ts`):
  ```typescript
  requireAuth(ctx)                        // returns { user, teamId } or throws
  requireRole(ctx, ["admin"])             // returns { user, teamId } or throws
  requireRole(ctx, ["admin", "physio"])   // any of these roles
  requireSelf(ctx, userId)               // user can only access own data
  ```
  These MUST exist from Epic 2. If not yet implemented, this story depends on them.
  [Source: architecture.md#Authentication & Security]

- **Error Pattern — Return null, don't throw for unauthorized reads:**
  For queries where the user simply shouldn't see data (like a coach viewing contracts), return `null` instead of throwing `NOT_AUTHORIZED`. Throwing errors would leak information about data existence. Reserve `ConvexError({ code: "NOT_AUTHORIZED" })` for mutation rejections where the user actively tries a forbidden action.
  [Source: architecture.md#Format Patterns]

- **Multi-Tenancy**: Every query filters by `teamId` from `requireAuth(ctx)`. Cross-tenant contract access is impossible at the data layer.
  [Source: architecture.md#Authentication & Security]

- **Player-to-User Linkage**: The `players` table has a `userId` field that links to the `users` table. To check "is this player me?", query the `players` table for the current `userId` and compare the resulting `playerId` against the requested `playerId`.

### Current Codebase State (from Story 6.1 analysis)

- **User Schema** (`packages/backend/convex/table/users.ts`):
  Current role field: `role: v.optional(v.union(v.literal("user"), v.literal("admin")))`
  Architecture target: `role: "admin" | "coach" | "analyst" | "physio" | "player" | "staff"`
  The role field must be extended before this story can function correctly. This is an Epic 2 dependency.

- **Auth Lib** (`packages/backend/convex/lib/auth/`):
  Currently contains only `ResendOTP.ts` and `ResendOTPPasswordReset.ts` — no `requireAuth`/`requireRole` helpers yet. The architecture specifies these at `packages/backend/convex/lib/auth.ts`. This is an Epic 2 dependency.

- **Contracts Module**: Does not exist yet — created by Story 6.1. This story layers security hardening on top of 6.1's implementation.

### Player Self-Access Pattern

The player-self access check requires:
1. Get current user from auth context → `userId`
2. Query `players` table: find player where `userId === currentUserId` AND `teamId === currentTeamId`
3. If found, compare that player's `_id` with the `playerId` argument
4. If match → this player is viewing their own profile → allow read-only contract access

This pattern should be extracted into a reusable helper if not already available:
```typescript
async function isPlayerSelf(ctx, playerId: Id<"players">): Promise<boolean> {
  const { user, teamId } = await requireAuth(ctx);
  if (user.role !== "player") return false;
  const playerRecord = await ctx.db
    .query("players")
    .withIndex("by_userId_teamId", q => q.eq("userId", user._id).eq("teamId", teamId))
    .first();
  return playerRecord?._id === playerId;
}
```

### NFR Compliance

- **NFR5**: All data access enforced at the Convex mutation/query layer (not UI-only).
- **NFR6**: Multi-tenant isolation — no cross-team contract data access at the data layer.
- **NFR8**: Contract data accessible only to admin users (extended: + player viewing own).
- **NFR9**: Signed URLs for PDF storage — never publicly accessible.

### Anti-Patterns to Avoid

- **DO NOT** check permissions only on the UI side — always enforce in Convex queries/mutations.
- **DO NOT** throw errors for unauthorized read queries — return `null` to avoid leaking data existence.
- **DO NOT** hide the Contract tab with CSS `display: none` — completely omit it from the React tree.
- **DO NOT** fetch contract data and then filter it on the client — never fetch it in the first place for unauthorized users.
- **DO NOT** use `any` types — use Convex generated types for contract records.

### Testing Standards

- Backend tests: `@convex-dev/test` + `vitest` co-located at `packages/backend/convex/contracts/__tests__/security.test.ts`
- Test all role permutations: admin, coach, analyst, physio, player (self), player (other), staff
- Test cross-tenant isolation
- Test both query returns (null vs data) and mutation rejections (ConvexError)

### Project Structure Notes

- Backend queries: `packages/backend/convex/contracts/queries.ts` — modify existing file from Story 6.1
- Backend mutations: `packages/backend/convex/contracts/mutations.ts` — verify existing file from Story 6.1
- Backend tests: `packages/backend/convex/contracts/__tests__/security.test.ts` — new file
- Frontend player profile: `apps/web/src/app/(app)/players/[playerId]/page.tsx` — modify tab logic
- Frontend ContractCard: `apps/web/src/components/players/ContractCard.tsx` — add read-only mode
- No new routes needed — all changes are within existing player profile page

### Dependencies

- **Story 6.1** (MUST be completed first): Creates the contracts table, queries, mutations, actions, and ContractCard component that this story hardens.
- **Epic 2 (Story 2.1)**: Auth helpers (`requireAuth`, `requireRole`) and extended role enum must exist.
- **Epic 5 (Story 5.1)**: Player data model with `userId` linkage must exist for player-self checks.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules — Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — Convex Errors]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Auth Guard Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6 — Story 6.2]
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements — FR27, FR31, NFR5, NFR6, NFR8]
- [Source: _bmad-output/implementation-artifacts/6-1-contract-upload-ai-extraction.md — Previous story context]

## Dev Agent Record

### Agent Model Used

<!-- To be filled by implementing agent -->

### Debug Log References

### Completion Notes List

### File List
