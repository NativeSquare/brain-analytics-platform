import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Doc, Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { UserRole } from "@packages/shared/roles";

// ---------------------------------------------------------------------------
// Type utilities for team-owned tables
// ---------------------------------------------------------------------------

/**
 * Resolves to the subset of `TableNames` whose documents contain a `teamId`
 * field typed as `Id<"teams">`.
 */
type TeamOwnedTable = {
  [T in TableNames]: Doc<T> extends { teamId: Id<"teams"> } ? T : never;
}[TableNames];

/** A resource that may have a `createdBy` field for ownership checks. */
interface OwnedResource {
  createdBy?: Id<"users">;
}

/** Options for `requireResourceAccess`. */
interface ResourceAccessOptions {
  allowedRoles?: UserRole[];
  allowOwner?: boolean;
  checkPermissions?: (userId: Id<"users">) => boolean | Promise<boolean>;
}

/** Rules for the `withAccessControl` higher-order function. */
interface AccessControlRules {
  roles?: UserRole[];
  check?: (
    authCtx: AuthContext,
    args: Record<string, unknown>,
  ) => boolean | Promise<boolean>;
}

/** Return type shared by all auth helpers. */
export type AuthContext = {
  user: Doc<"users">;
  teamId: Id<"teams">;
};

/**
 * Validate the authenticated user exists, is not banned, not deactivated,
 * and belongs to a team. Returns `{ user, teamId }`.
 *
 * @throws ConvexError NOT_AUTHENTICATED — no valid session
 * @throws ConvexError NOT_AUTHORIZED   — banned or deactivated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED" as const,
      message: "Authentication required.",
    });
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED" as const,
      message: "User record not found.",
    });
  }

  // Banned check
  if (user.banned) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "Your account has been banned.",
    });
  }

  // Deactivated check
  if (user.status === "deactivated") {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "Your account has been deactivated.",
    });
  }

  // Team membership check
  if (!user.teamId) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "You are not assigned to a team.",
    });
  }

  return { user, teamId: user.teamId };
}

/**
 * Enforce role-based access. Calls `requireAuth` internally and checks
 * the user's role against the provided allow-list.
 *
 * @throws ConvexError NOT_AUTHORIZED — role not in allowed list
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[]
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  if (!result.user.role || !allowedRoles.includes(result.user.role as UserRole)) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: `Access denied. Required roles: ${allowedRoles.join(", ")}.`,
    });
  }

  return result;
}

/**
 * Enforce self-access — the authenticated user must match `targetUserId`.
 *
 * @throws ConvexError NOT_AUTHORIZED — userId mismatch
 */
export async function requireSelf(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  if (result.user._id !== targetUserId) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "You can only access your own data.",
    });
  }

  return result;
}

/**
 * Shorthand for medical access: admin or physio.
 */
export async function requireMedical(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext> {
  return requireRole(ctx, ["admin", "physio"]);
}

/**
 * Shorthand for admin-only access. Replaces the legacy `requireAdmin` in
 * `convex/table/admin.ts` with a proper shared version.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext> {
  return requireRole(ctx, ["admin"]);
}

// ---------------------------------------------------------------------------
// Story 11.4 — Reusable RBAC hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a team-owned resource by ID and validate it belongs to the user's team.
 *
 * Throws a single NOT_FOUND error for both "missing" and "wrong team" cases
 * to prevent cross-tenant enumeration.
 *
 * @throws ConvexError NOT_FOUND — resource missing or wrong team
 */
export async function getTeamResource<T extends TeamOwnedTable>(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  table: T,
  resourceId: Id<T>,
): Promise<Doc<T>> {
  const resource = await ctx.db.get(resourceId);
  if (!resource || resource.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: `${String(table).replace(/s$/, "").replace(/^./, (c) => c.toUpperCase())} not found`,
    });
  }
  return resource;
}

/**
 * Require the user to be an admin OR the target user themselves.
 *
 * @throws ConvexError NOT_AUTHORIZED — user is neither admin nor self
 */
export async function requireAdminOrSelf(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">,
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  // Admin bypass
  if (result.user.role === "admin") {
    return result;
  }

  // Self check
  if (result.user._id === targetUserId) {
    return result;
  }

  throw new ConvexError({
    code: "NOT_AUTHORIZED" as const,
    message: "Access denied. Admin or self required.",
  });
}

/**
 * Require the user to be an admin OR have one of the specified roles.
 *
 * @throws ConvexError NOT_AUTHORIZED — user role not in list and not admin
 */
export async function requireAdminOrRole(
  ctx: QueryCtx | MutationCtx,
  roles: UserRole[],
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  // Admin bypass
  if (result.user.role === "admin") {
    return result;
  }

  // Role check
  if (result.user.role && (roles as string[]).includes(result.user.role)) {
    return result;
  }

  throw new ConvexError({
    code: "NOT_AUTHORIZED" as const,
    message: `Access denied. Required roles: admin, ${roles.join(", ")}.`,
  });
}

/**
 * Require access to a resource through a combination of checks:
 * admin bypass, role check, owner check, or custom permission function.
 *
 * At least one check must pass; if none do, throws NOT_AUTHORIZED.
 *
 * @throws ConvexError NOT_AUTHORIZED — none of the checks passed
 */
export async function requireResourceAccess(
  ctx: QueryCtx | MutationCtx,
  resource: OwnedResource,
  options: ResourceAccessOptions,
): Promise<AuthContext> {
  const result = await requireAuth(ctx);

  // Admin bypass
  if (result.user.role === "admin") {
    return result;
  }

  // Role check
  if (
    options.allowedRoles &&
    result.user.role &&
    (options.allowedRoles as string[]).includes(result.user.role)
  ) {
    return result;
  }

  // Owner check
  if (options.allowOwner && resource.createdBy === result.user._id) {
    return result;
  }

  // Custom permission function
  if (options.checkPermissions) {
    const allowed = await options.checkPermissions(result.user._id);
    if (allowed) {
      return result;
    }
  }

  throw new ConvexError({
    code: "NOT_AUTHORIZED" as const,
    message: "Access denied.",
  });
}

/**
 * Higher-order function that wraps a handler with access control checks.
 *
 * Runs the specified rules before delegating to the wrapped handler.
 * Useful for new code that wants declarative auth.
 */
export function withAccessControl<
  TCtx extends QueryCtx | MutationCtx,
  TArgs extends Record<string, unknown>,
  TReturn,
>(
  rules: AccessControlRules,
  handler: (ctx: TCtx, args: TArgs, authCtx: AuthContext) => Promise<TReturn> | TReturn,
): (ctx: TCtx, args: TArgs) => Promise<TReturn> {
  return async (ctx: TCtx, args: TArgs): Promise<TReturn> => {
    let authCtx: AuthContext;

    if (rules.roles && rules.roles.length > 0) {
      authCtx = await requireRole(ctx, rules.roles);
    } else {
      authCtx = await requireAuth(ctx);
    }

    if (rules.check) {
      const allowed = await rules.check(authCtx, args);
      if (!allowed) {
        throw new ConvexError({
          code: "NOT_AUTHORIZED" as const,
          message: "Access denied.",
        });
      }
    }

    return await handler(ctx, args, authCtx);
  };
}
