import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Returns the count of unread notifications for the authenticated user,
 * scoped to their team.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

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
      .take(20);

    return notifications;
  },
});
