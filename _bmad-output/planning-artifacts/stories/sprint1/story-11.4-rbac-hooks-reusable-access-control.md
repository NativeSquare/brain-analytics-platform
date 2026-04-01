# Story 11.4: RBAC Hooks -- Reusable Access Control Utilities

Status: draft
Story Type: backend
Points: 8

> **CONSTRAINT: No functional changes.** This story is a pure consolidation and extension of existing RBAC logic. Every refactored call site must produce the exact same authorization result as before. If any existing test fails after refactoring, the refactoring is incorrect.

## Story

As a developer working on the Brain Analytics Platform,
I want a set of reusable, composable RBAC hooks that replace the duplicated inline access checks scattered across all modules,
so that access control logic is centralized, consistent, and impossible to forget in new code.

## Epic Context

**Epic 11 -- Cross-Cutting Features:** Shared infrastructure that spans multiple feature areas.

**Dependencies:**
- All Epics 2-6 (existing code that will be refactored to use the new hooks)
- Existing RBAC helpers in `packages/backend/convex/lib/auth.ts` and `packages/backend/convex/lib/permissions.ts`

**Current state (from audit):**
- `auth.ts` provides: `requireAuth()`, `requireRole()`, `requireSelf()`, `requireMedical()`, `requireAdmin()`
- `permissions.ts` provides: `checkAccess()`, `checkDocumentAccess()`, `filterByAccess()`, `filterDocumentsByAccess()`
- `calendar/accessControl.ts` provides: `canUserAccessEvent()`, `getUserInvitedEventIds()`
- 84+ duplicate inline `teamId !== teamId` checks across all modules
- Admin bypass pattern (`if (user.role === "admin") return true`) duplicated everywhere
- Self-access + admin pattern repeated 3x in contracts/queries.ts
- No composable access control and no team-resource getter

---

## Acceptance Criteria (BDD)

### AC-1: getTeamResource Hook

**Given** a developer needs to fetch a resource and validate team ownership
**When** they call `getTeamResource(ctx, teamId, table, resourceId)`
**Then** the function:

1. Fetches the resource by ID from the specified table using `ctx.db.get(resourceId)`
2. If the resource is `null`, throws a `ConvexError` with code `"NOT_FOUND"` and message `"Resource not found."`
3. If `resource.teamId !== teamId`, throws a `ConvexError` with code `"NOT_FOUND"` and message `"Resource not found."` (same error to prevent enumeration)
4. Returns the fully typed resource document

```typescript
// packages/backend/convex/lib/auth.ts

import type { TableNames, Doc, Id } from "../_generated/dataModel";

/**
 * Tables that have a `teamId` field and can be used with getTeamResource.
 */
type TeamOwnedTable = {
  [T in TableNames]: Doc<T> extends { teamId: Id<"teams"> } ? T : never;
}[TableNames];

/**
 * Fetch a resource by ID, validate it exists AND belongs to the given team.
 * Returns the typed document. Throws NOT_FOUND if missing or wrong team
 * (same error for both to prevent resource enumeration).
 */
export async function getTeamResource<T extends TeamOwnedTable>(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  table: T,
  resourceId: Id<T>,
): Promise<Doc<T>> {
  const resource = await ctx.db.get(resourceId);
  if (!resource || (resource as Doc<T> & { teamId: Id<"teams"> }).teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Resource not found.",
    });
  }
  return resource;
}
```

**And** the hook replaces all inline patterns like:
```typescript
// BEFORE (repeated 84+ times across modules)
const player = await ctx.db.get(args.playerId);
if (!player || player.teamId !== teamId) {
  throw new ConvexError({ code: "NOT_FOUND", message: "Player not found." });
}

// AFTER
const player = await getTeamResource(ctx, teamId, "players", args.playerId);
```

---

### AC-2: requireAdminOrSelf Hook

**Given** a developer needs to check if the user is an admin or accessing their own data
**When** they call `requireAdminOrSelf(ctx, targetUserId)`
**Then** the function:

1. Calls `requireAuth(ctx)` to get `{ user, teamId }`
2. If `user.role === "admin"`, returns `{ user, teamId }` immediately (admin bypass)
3. If `user._id === targetUserId`, returns `{ user, teamId }` (self-access allowed)
4. Otherwise, throws a `ConvexError` with code `"NOT_AUTHORIZED"` and message `"Access denied. Admin or self-access required."`

```typescript
// packages/backend/convex/lib/auth.ts

/**
 * Admin can access any user's data; non-admins can only access their own.
 * Returns { user, teamId }.
 *
 * @throws ConvexError NOT_AUTHORIZED -- not admin and not self
 */
export async function requireAdminOrSelf(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">,
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  if (result.user.role === "admin") return result;
  if (result.user._id === targetUserId) return result;

  throw new ConvexError({
    code: "NOT_AUTHORIZED" as const,
    message: "Access denied. Admin or self-access required.",
  });
}
```

**And** the hook replaces the pattern duplicated 3x in `contracts/queries.ts`:
```typescript
// BEFORE
const { user, teamId } = await requireAuth(ctx);
if (user.role === "admin") { /* full access */ }
else if (user.role === "player") {
  if (user._id !== args.userId) throw new ConvexError({ ... });
}

// AFTER
const { user, teamId } = await requireAdminOrSelf(ctx, args.userId);
```

---

### AC-3: requireAdminOrRole Hook

**Given** a developer needs admin bypass plus a role allow-list
**When** they call `requireAdminOrRole(ctx, roles)`
**Then** the function:

1. Calls `requireAuth(ctx)` to get `{ user, teamId }`
2. If `user.role === "admin"`, returns `{ user, teamId }` immediately (explicit admin bypass)
3. If `user.role` is in the `roles` array, returns `{ user, teamId }`
4. Otherwise, throws a `ConvexError` with code `"NOT_AUTHORIZED"` and message `"Access denied. Required roles: admin, <roles>."`

```typescript
// packages/backend/convex/lib/auth.ts

/**
 * Admin always passes. Otherwise the user's role must be in the allow-list.
 * Syntactic sugar over requireRole that makes admin bypass explicit.
 *
 * @throws ConvexError NOT_AUTHORIZED -- role not allowed
 */
export async function requireAdminOrRole(
  ctx: QueryCtx | MutationCtx,
  roles: UserRole[],
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  if (result.user.role === "admin") return result;

  if (!result.user.role || !roles.includes(result.user.role as UserRole)) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: `Access denied. Required roles: admin, ${roles.join(", ")}.`,
    });
  }

  return result;
}
```

**And** the hook replaces scattered patterns like:
```typescript
// BEFORE
if (user.role !== "admin" && user.role !== "coach" && user.role !== "analyst") {
  throw new ConvexError({ ... });
}

// AFTER
await requireAdminOrRole(ctx, ["coach", "analyst"]);
```

---

### AC-4: requireResourceAccess Hook

**Given** a developer needs a composable access check combining multiple rules
**When** they call `requireResourceAccess(ctx, resource, options)`
**Then** the function:

1. Calls `requireAuth(ctx)` to get `{ user, teamId }`
2. If `user.role === "admin"`, returns `{ user, teamId }` immediately
3. Evaluates the following checks in order, granting access if ANY pass:
   - **Role check:** if `options.allowedRoles` is provided and `user.role` is in the list, access is granted
   - **Owner check:** if `options.allowOwner === true` and `resource.createdBy === user._id`, access is granted
   - **Individual permissions check:** if `options.checkPermissions` is provided, calls the function and grants access if it returns `true`
4. If none of the checks pass, throws a `ConvexError` with code `"NOT_AUTHORIZED"` and message `"Access denied."`

```typescript
// packages/backend/convex/lib/auth.ts

interface ResourceAccessOptions {
  /** Roles that are allowed access (in addition to admin). */
  allowedRoles?: UserRole[];
  /** If true, the resource creator (createdBy field) is allowed access. */
  allowOwner?: boolean;
  /** Custom permission check function for individual grants. */
  checkPermissions?: (userId: Id<"users">) => boolean | Promise<boolean>;
}

interface OwnedResource {
  createdBy?: Id<"users">;
}

/**
 * Composable access check combining role-based, ownership, and individual
 * permission checks. Admin always passes.
 *
 * @throws ConvexError NOT_AUTHORIZED -- no check passed
 */
export async function requireResourceAccess(
  ctx: QueryCtx | MutationCtx,
  resource: OwnedResource,
  options: ResourceAccessOptions,
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  // Admin bypass
  if (result.user.role === "admin") return result;

  // Role check
  if (
    options.allowedRoles &&
    result.user.role &&
    options.allowedRoles.includes(result.user.role as UserRole)
  ) {
    return result;
  }

  // Owner check
  if (options.allowOwner && resource.createdBy === result.user._id) {
    return result;
  }

  // Individual permission check
  if (options.checkPermissions) {
    const granted = await options.checkPermissions(result.user._id);
    if (granted) return result;
  }

  throw new ConvexError({
    code: "NOT_AUTHORIZED" as const,
    message: "Access denied.",
  });
}
```

**And** the hook replaces composite checks like the calendar RSVP pattern:
```typescript
// BEFORE (calendar mutations)
if (user.role !== "admin") {
  if (!event.invitedRoles?.includes(user.role)) {
    const invitedIds = await getUserInvitedEventIds(ctx, user._id, teamId);
    if (!invitedIds.has(event._id)) {
      throw new ConvexError({ ... });
    }
  }
}

// AFTER
await requireResourceAccess(ctx, event, {
  allowedRoles: event.invitedRoles as UserRole[] | undefined,
  checkPermissions: async (userId) => {
    const invitedIds = await getUserInvitedEventIds(ctx, userId, teamId);
    return invitedIds.has(event._id);
  },
});
```

---

### AC-5: withAccessControl Higher-Order Function

**Given** a developer wants to ensure access control is never forgotten on a new mutation or query
**When** they wrap their handler with `withAccessControl(handler, rules)`
**Then** the function:

1. Returns a new handler function compatible with Convex mutation/query signatures
2. Before executing the wrapped handler, it automatically runs the specified access control checks
3. Passes the authenticated `{ user, teamId }` as additional context to the handler
4. If any access check fails, the handler is never executed and the appropriate error is thrown

```typescript
// packages/backend/convex/lib/auth.ts

interface AccessControlRules {
  /** Roles allowed (admin is always implicit). */
  roles?: UserRole[];
  /** Custom predicate run after auth; receives the auth context. */
  check?: (authCtx: AuthContext, args: Record<string, unknown>) => boolean | Promise<boolean>;
}

/**
 * Higher-order function that wraps a Convex handler with automatic access
 * control. Makes it impossible to forget auth checks in new code.
 *
 * Usage is optional -- intended for new code, not forced on existing handlers.
 */
export function withAccessControl<
  Ctx extends QueryCtx | MutationCtx,
  Args extends Record<string, unknown>,
  Result,
>(
  rules: AccessControlRules,
  handler: (ctx: Ctx, args: Args, authCtx: AuthContext) => Result | Promise<Result>,
): (ctx: Ctx, args: Args) => Promise<Result> {
  return async (ctx: Ctx, args: Args): Promise<Result> => {
    // Run auth + role check
    const authCtx = rules.roles
      ? await requireAdminOrRole(ctx, rules.roles)
      : await requireAuth(ctx);

    // Custom predicate
    if (rules.check) {
      const allowed = await rules.check(authCtx, args);
      if (!allowed) {
        throw new ConvexError({
          code: "NOT_AUTHORIZED" as const,
          message: "Access denied by custom access rule.",
        });
      }
    }

    return handler(ctx, args, authCtx);
  };
}
```

**And** usage looks like:
```typescript
// BEFORE
export const getPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin", "coach"]);
    const player = await ctx.db.get(args.playerId);
    if (!player || player.teamId !== teamId) throw ...;
    return player;
  },
});

// AFTER (optional pattern for new code)
export const getPlayer = query({
  args: { playerId: v.id("players") },
  handler: withAccessControl(
    { roles: ["coach"] },
    async (ctx, args, { teamId }) => {
      return getTeamResource(ctx, teamId, "players", args.playerId);
    },
  ),
});
```

**And** this pattern is optional -- it is provided for new code and is NOT forced onto existing handlers during this story's refactoring scope.

---

### AC-6: Refactoring -- Calendar Module

**Given** the new hooks are implemented and tested
**When** the developer refactors `packages/backend/convex/calendar/mutations.ts` and `packages/backend/convex/calendar/queries.ts`
**Then:**

1. All inline `event.teamId !== teamId` checks are replaced with `getTeamResource(ctx, teamId, "calendarEvents", eventId)`
2. All composite access checks (role + invitation) are replaced with `requireResourceAccess` where applicable
3. `canUserAccessEvent()` in `calendar/accessControl.ts` remains unchanged (it is a pure function used for batch filtering, not a throwing guard)
4. The refactored code produces identical authorization results for all inputs
5. All existing calendar tests pass without modification

---

### AC-7: Refactoring -- Contracts Module

**Given** the new hooks are implemented and tested
**When** the developer refactors `packages/backend/convex/contracts/queries.ts`
**Then:**

1. All 3 instances of the admin-or-self pattern are replaced with `requireAdminOrSelf(ctx, targetUserId)`
2. All inline `contract.teamId !== teamId` checks are replaced with `getTeamResource(ctx, teamId, "contracts", contractId)`
3. The refactored code produces identical authorization results for all inputs
4. All existing contract tests pass without modification

---

### AC-8: Refactoring -- Documents Module

**Given** the new hooks are implemented and tested
**When** the developer refactors `packages/backend/convex/documents/mutations.ts` and `packages/backend/convex/documents/queries.ts`
**Then:**

1. All inline `document.teamId !== teamId` and `folder.teamId !== teamId` checks are replaced with `getTeamResource`
2. Existing `checkDocumentAccess`, `filterByAccess`, and `filterDocumentsByAccess` in `permissions.ts` are NOT modified (they handle document-specific inheritance logic that is separate from team ownership)
3. The refactored code produces identical authorization results for all inputs
4. All existing document tests pass without modification

---

### AC-9: Refactoring -- Players Module

**Given** the new hooks are implemented and tested
**When** the developer refactors `packages/backend/convex/players/mutations.ts` and `packages/backend/convex/players/queries.ts`
**Then:**

1. All inline `player.teamId !== teamId` checks are replaced with `getTeamResource(ctx, teamId, "players", playerId)`
2. Any `requireRole(ctx, ["admin"])` + manual teamId check combos are simplified using the new hooks where the pattern matches
3. The refactored code produces identical authorization results for all inputs
4. All existing player tests pass without modification

---

### AC-10: Unit Tests for New Hooks

**Given** the 5 new hooks are implemented
**When** the developer writes unit tests
**Then** the following test cases are covered:

**getTeamResource:**
- Returns the resource when it exists and teamId matches
- Throws `NOT_FOUND` when the resource does not exist (null from db.get)
- Throws `NOT_FOUND` when the resource exists but teamId does not match
- Works with multiple table types (players, contracts, calendarEvents)

**requireAdminOrSelf:**
- Returns `{ user, teamId }` when user is admin (regardless of targetUserId)
- Returns `{ user, teamId }` when user._id matches targetUserId (any role)
- Throws `NOT_AUTHORIZED` when user is not admin and user._id does not match targetUserId
- Throws `NOT_AUTHENTICATED` when no user session exists

**requireAdminOrRole:**
- Returns `{ user, teamId }` when user is admin (regardless of roles list)
- Returns `{ user, teamId }` when user role is in the allowed list
- Throws `NOT_AUTHORIZED` when user role is not admin and not in the allowed list
- Throws `NOT_AUTHENTICATED` when no user session exists

**requireResourceAccess:**
- Admin always passes regardless of options
- Passes when user role is in allowedRoles
- Passes when allowOwner is true and user is the resource creator
- Passes when checkPermissions returns true
- Throws `NOT_AUTHORIZED` when no check passes
- Correctly short-circuits (stops checking after first passing rule)

**withAccessControl:**
- Calls the wrapped handler with the correct authCtx when access is granted
- Never calls the wrapped handler when access is denied
- Correctly passes through the handler's return value
- Applies role checks before custom predicates

---

### AC-11: Backward Compatibility

**Given** all refactoring is complete
**When** the full test suite is run
**Then:**

1. Zero existing tests are broken
2. Zero new `ConvexError` codes are introduced (the hooks use only `NOT_FOUND`, `NOT_AUTHENTICATED`, and `NOT_AUTHORIZED` -- all existing codes)
3. The existing exports from `auth.ts` (`requireAuth`, `requireRole`, `requireSelf`, `requireMedical`, `requireAdmin`, `AuthContext`) remain unchanged and fully backward compatible
4. The existing exports from `permissions.ts` remain unchanged
5. The existing exports from `calendar/accessControl.ts` remain unchanged
6. No mutation or query changes its public API signature

---

## Technical Notes

### Files to Create
- None (all hooks are added to the existing `packages/backend/convex/lib/auth.ts`)

### Files to Modify
| File | Changes |
|------|---------|
| `packages/backend/convex/lib/auth.ts` | Add 5 new hooks: `getTeamResource`, `requireAdminOrSelf`, `requireAdminOrRole`, `requireResourceAccess`, `withAccessControl` |
| `packages/backend/convex/calendar/mutations.ts` | Replace inline teamId checks with `getTeamResource`, replace composite access checks with `requireResourceAccess` |
| `packages/backend/convex/calendar/queries.ts` | Replace inline teamId checks with `getTeamResource` |
| `packages/backend/convex/documents/mutations.ts` | Replace inline teamId/folderId checks with `getTeamResource` |
| `packages/backend/convex/documents/queries.ts` | Replace inline teamId/folderId checks with `getTeamResource` |
| `packages/backend/convex/contracts/queries.ts` | Replace admin/self pattern with `requireAdminOrSelf`, replace inline teamId checks with `getTeamResource` |
| `packages/backend/convex/players/mutations.ts` | Replace inline teamId checks with `getTeamResource` |
| `packages/backend/convex/players/queries.ts` | Replace inline teamId checks with `getTeamResource` |

### Files NOT to Modify
| File | Reason |
|------|--------|
| `packages/backend/convex/lib/permissions.ts` | Document permission logic is specialized and correct; no consolidation needed |
| `packages/backend/convex/calendar/accessControl.ts` | Pure helper functions used for batch filtering; not a guard pattern to replace |

### Implementation Order
1. Implement all 5 hooks in `auth.ts` with full TypeScript types
2. Write unit tests for all 5 hooks
3. Refactor contracts module (smallest, clearest win -- 3 replacements)
4. Refactor players module
5. Refactor documents module
6. Refactor calendar module (most complex due to composite access patterns)
7. Run full test suite and verify zero regressions

### Type Safety
- `getTeamResource` uses conditional type mapping (`TeamOwnedTable`) to restrict the `table` parameter to only tables that have a `teamId` field. This is enforced at compile time.
- The return type of `getTeamResource` is `Doc<T>`, preserving full type information for the consuming code.
- `withAccessControl` preserves the generic types of the wrapped handler.

### Error Message Consistency
- `getTeamResource` intentionally uses the same `NOT_FOUND` error for both "does not exist" and "wrong team" cases. This prevents resource enumeration attacks where an attacker could distinguish between nonexistent and forbidden resources.

---

## Out of Scope
- Modifying `permissions.ts` document access helpers (they handle inheritance, a separate concern)
- Modifying `calendar/accessControl.ts` pure functions (used for batch filtering)
- Adding new roles or changing role definitions
- Adding UI changes (this is a backend-only story)
- Forcing `withAccessControl` on existing handlers (it is opt-in for new code)
- Changing any public mutation/query API signatures
