import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Toggle pin status for a dashboard.
 * If the dashboard is currently pinned by this user, it is unpinned (deleted).
 * If it is not pinned, a new pin record is created.
 */
export const togglePinDashboard = mutation({
  args: {
    dashboardId: v.string(),
  },
  handler: async (ctx, { dashboardId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("userPinnedDashboards")
      .withIndex("by_userId_dashboardId", (q) =>
        q.eq("userId", user._id).eq("dashboardId", dashboardId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { pinned: false };
    }

    await ctx.db.insert("userPinnedDashboards", {
      userId: user._id,
      dashboardId,
      teamId,
      pinnedAt: Date.now(),
    });

    return { pinned: true };
  },
});

/**
 * Track that the user opened a dashboard.
 * Upserts: if a record already exists for this user + dashboardId, update openedAt.
 * Otherwise, insert a new record.
 */
export const trackDashboardOpen = mutation({
  args: {
    dashboardId: v.string(),
  },
  handler: async (ctx, { dashboardId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("userRecentDashboards")
      .withIndex("by_userId_dashboardId", (q) =>
        q.eq("userId", user._id).eq("dashboardId", dashboardId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        openedAt: Date.now(),
      });
      return existing._id;
    }

    const id = await ctx.db.insert("userRecentDashboards", {
      userId: user._id,
      dashboardId,
      teamId,
      openedAt: Date.now(),
    });

    return id;
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get all pinned dashboard IDs for the current user, scoped to their team.
 * Sorted by pinnedAt descending (most recently pinned first).
 */
export const getUserPinnedDashboards = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

    const pinned = await ctx.db
      .query("userPinnedDashboards")
      .withIndex("by_userId_teamId", (q) =>
        q.eq("userId", user._id).eq("teamId", teamId)
      )
      .collect();

    // Sort by pinnedAt descending
    pinned.sort((a, b) => b.pinnedAt - a.pinnedAt);

    return pinned;
  },
});

/**
 * Get the most recently opened dashboards for the current user, scoped to their team.
 * Sorted by openedAt descending. Limited to `limit` results (default 10).
 */
export const getUserRecentDashboards = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const { user, teamId } = await requireAuth(ctx);
    const maxResults = limit ?? 10;

    const recent = await ctx.db
      .query("userRecentDashboards")
      .withIndex("by_userId_teamId", (q) =>
        q.eq("userId", user._id).eq("teamId", teamId)
      )
      .collect();

    // Sort by openedAt descending and limit
    recent.sort((a, b) => b.openedAt - a.openedAt);

    return recent.slice(0, maxResults);
  },
});
