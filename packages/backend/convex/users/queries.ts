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

/**
 * Search team members for the permissions panel user search.
 * Admin-only. Excludes the current user. Returns up to 20 results.
 * Filters by name or email (case-insensitive).
 */
export const searchTeamMembersForPermissions = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Exclude the current user (they're admin with automatic access)
    let filtered = allUsers.filter((u) => u._id !== user._id);

    if (args.search && args.search.trim().length > 0) {
      const term = args.search.trim().toLowerCase();
      filtered = filtered.filter((u) => {
        const name = (u.fullName ?? u.name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    return filtered.slice(0, 20).map((u) => ({
      _id: u._id,
      fullName: u.fullName ?? u.name ?? u.email ?? "Unknown",
      email: u.email ?? "",
      role: u.role ?? "",
    }));
  },
});

/**
 * Search team users by name for invitation selectors.
 * Returns up to 50 results, filtered by optional search string (case-insensitive).
 * Accessible to any authenticated team member (AC #13: team-scoped).
 */
export const searchTeamUsers = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireAuth(ctx);

    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    let filtered = allUsers;

    if (args.search && args.search.trim().length > 0) {
      const term = args.search.trim().toLowerCase();
      filtered = allUsers.filter((u) => {
        const name = (u.fullName ?? u.name ?? u.email ?? "").toLowerCase();
        return name.includes(term);
      });
    }

    return filtered.slice(0, 50).map((u) => ({
      _id: u._id,
      fullName: u.fullName ?? u.name ?? u.email ?? "Unknown",
      email: u.email,
      role: u.role,
    }));
  },
});
