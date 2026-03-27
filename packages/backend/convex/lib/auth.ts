import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { UserRole } from "@packages/shared/roles";

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
