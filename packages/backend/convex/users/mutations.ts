import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { requireRole } from "../lib/auth";
import { USER_ROLES } from "@packages/shared/roles";
import type { UserRole } from "@packages/shared/roles";

/**
 * Update a user's role. Admin-only.
 * Validates the new role is in the allowed set.
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("analyst"),
      v.literal("physio"),
      v.literal("player"),
      v.literal("staff")
    ),
  },
  handler: async (ctx, args) => {
    const { user: admin, teamId } = await requireRole(ctx, ["admin"]);

    // Validate role value
    if (!USER_ROLES.includes(args.role as UserRole)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid role: ${args.role}`,
      });
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "User not found.",
      });
    }

    // Ensure target user is on the same team
    if (targetUser.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "Cannot modify users from a different team.",
      });
    }

    // Prevent admin from demoting themselves
    if (args.userId === admin._id && args.role !== "admin") {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "You cannot demote yourself.",
      });
    }

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/**
 * Assign a user to a team. Internal mutation used during onboarding/invitation flows.
 */
export const assignUserToTeam = internalMutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "User not found.",
      });
    }
    await ctx.db.patch(args.userId, { teamId: args.teamId });
  },
});
