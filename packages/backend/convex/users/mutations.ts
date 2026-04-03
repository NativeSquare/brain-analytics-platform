import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";
import { USER_ROLES } from "@packages/shared/roles";
import type { UserRole } from "@packages/shared/roles";

/**
 * Update the current user's profile (fullName and optionally avatar).
 * Any authenticated user can update their own profile.
 * If avatarStorageId is provided, the storageId is resolved to a URL and saved.
 */
export const updateProfile = mutation({
  args: {
    fullName: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
        code: "NOT_FOUND" as const,
        message: "User not found.",
      });
    }

    const fullName = args.fullName.trim();
    if (fullName.length === 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Full name is required.",
      });
    }

    const patch: {
      fullName: string;
      avatarUrl?: string;
      preferredLanguage?: string;
    } = { fullName };

    if (args.avatarStorageId !== undefined) {
      const url = await ctx.storage.getUrl(args.avatarStorageId);
      if (url) {
        patch.avatarUrl = url;
      }
    }

    if (args.preferredLanguage !== undefined) {
      if (args.preferredLanguage !== "en" && args.preferredLanguage !== "it") {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `Invalid language: ${args.preferredLanguage}. Allowed values: "en", "it".`,
        });
      }
      patch.preferredLanguage = args.preferredLanguage;
    }

    await ctx.db.patch(userId, patch);
  },
});

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
