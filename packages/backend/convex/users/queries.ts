import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";
import { USER_ROLES } from "@packages/shared/roles";

/**
 * Return all users belonging to the authenticated user's team.
 * Admin-only — used on admin user management pages.
 */
export const getUsersByTeam = query({
  args: {},
  handler: async (ctx) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    return await ctx.db
      .query("users")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();
  },
});

/**
 * Return team members with an optional role filter.
 * Accessible to any authenticated team member (for invitation selectors, etc.).
 */
export const getTeamMembers = query({
  args: {
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("coach"),
        v.literal("analyst"),
        v.literal("physio"),
        v.literal("player"),
        v.literal("staff")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireAuth(ctx);

    if (args.role) {
      return await ctx.db
        .query("users")
        .withIndex("by_teamId_role", (q) =>
          q.eq("teamId", teamId).eq("role", args.role)
        )
        .collect();
    }

    return await ctx.db
      .query("users")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();
  },
});

/**
 * Return the static list of available roles.
 * Server-authoritative source for role dropdowns.
 * Requires authentication per AC #9 (team-scoped access enforcement).
 */
export const getTeamRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return [...USER_ROLES];
  },
});
