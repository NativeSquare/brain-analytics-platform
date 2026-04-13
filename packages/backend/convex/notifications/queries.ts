import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Returns the count of unread notifications for the authenticated user,
 * scoped to their team. Returns 0 gracefully if user has no team.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    // Graceful: return 0 if user not authenticated or has no team
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const user = await ctx.db.get(userId);
    if (!user || !user.teamId) return 0;
    const teamId = user.teamId;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .filter((q) => q.eq(q.field("teamId"), teamId))
      .collect();

    return unread.length;
  },
});

/**
 * Returns up to 20 most recent notifications for the authenticated user,
 * ordered newest-first, scoped to their team.
 */
export const getUserNotifications = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_teamId", (q) =>
        q.eq("userId", user._id).eq("teamId", teamId),
      )
      .order("desc")
      .take(5);

    return notifications;
  },
});

/**
 * Returns all notifications for the authenticated user (up to 100),
 * ordered newest-first. Used by the full notifications page.
 */
export const getAllNotifications = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_teamId", (q) =>
        q.eq("userId", user._id).eq("teamId", teamId),
      )
      .order("desc")
      .take(100);

    return notifications;
  },
});
