import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// ---------------------------------------------------------------------------
// getDashboardsForRole — AC-6: Gallery page role-filtered dashboards
// ---------------------------------------------------------------------------

/**
 * Returns all dashboards that the current user's role can access.
 * Joins roleDashboards with dashboards via slug matching.
 */
export const getDashboardsForRole = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

    const role = user.role;
    if (!role) return [];

    // 1. Get all role-dashboard assignments for this team + role
    const roleAssignments = await ctx.db
      .query("roleDashboards")
      .withIndex("by_teamId_role", (q) =>
        q.eq("teamId", teamId).eq("role", role)
      )
      .collect();

    const allowedSlugs = new Set(roleAssignments.map((ra) => ra.dashboardSlug));

    // 2. Get all dashboards for this team
    const allDashboards = await ctx.db
      .query("dashboards")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // 3. Filter to only those the user's role can access
    return allDashboards.filter((d) => allowedSlugs.has(d.slug));
  },
});

// ---------------------------------------------------------------------------
// getDashboardBySlug — AC-10: Single dashboard lookup
// ---------------------------------------------------------------------------

/**
 * Returns a single dashboard by slug for the current user's team.
 * Also returns whether the user has access (via roleDashboards).
 */
export const getDashboardBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Look up the dashboard
    const dashboard = await ctx.db
      .query("dashboards")
      .withIndex("by_teamId_slug", (q) =>
        q.eq("teamId", teamId).eq("slug", slug)
      )
      .first();

    if (!dashboard) {
      return { dashboard: null, hasAccess: false };
    }

    // Check role access
    const role = user.role;
    if (!role) {
      return { dashboard, hasAccess: false };
    }

    const roleAssignment = await ctx.db
      .query("roleDashboards")
      .withIndex("by_teamId_role_dashboardSlug", (q) =>
        q.eq("teamId", teamId).eq("role", role).eq("dashboardSlug", slug)
      )
      .first();

    return { dashboard, hasAccess: roleAssignment !== null };
  },
});

// ---------------------------------------------------------------------------
// getRolesForDashboard — AC-9: Role badges on cards
// ---------------------------------------------------------------------------

/**
 * Returns all roles assigned to a given dashboard slug within the team.
 */
export const getRolesForDashboard = query({
  args: {
    dashboardSlug: v.string(),
  },
  handler: async (ctx, { dashboardSlug }) => {
    const { teamId } = await requireAuth(ctx);

    const assignments = await ctx.db
      .query("roleDashboards")
      .withIndex("by_teamId_dashboardSlug", (q) =>
        q.eq("teamId", teamId).eq("dashboardSlug", dashboardSlug)
      )
      .collect();

    return assignments.map((a) => a.role);
  },
});

// ---------------------------------------------------------------------------
// getAllRoleDashboardAssignments — AC-9 (batch) + AC-13 (admin tab)
// ---------------------------------------------------------------------------

/**
 * Returns all role-dashboard assignments for the team.
 * Used by gallery (to show role badges on all cards) and admin tab.
 */
export const getAllRoleDashboardAssignments = query({
  args: {},
  handler: async (ctx) => {
    const { teamId } = await requireAuth(ctx);

    const assignments = await ctx.db
      .query("roleDashboards")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    return assignments;
  },
});

// ---------------------------------------------------------------------------
// getAllDashboards — AC-13: Admin tab
// ---------------------------------------------------------------------------

/**
 * Returns all dashboards for the team. Used by the admin tab.
 */
export const getAllDashboards = query({
  args: {},
  handler: async (ctx) => {
    const { teamId } = await requireAuth(ctx);

    return await ctx.db
      .query("dashboards")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();
  },
});
