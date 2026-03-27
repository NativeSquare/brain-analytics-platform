import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Mark a single notification as read.
 * Validates ownership: the notification must belong to the calling user and team.
 */
export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Notification not found",
      });
    }

    if (notification.userId !== user._id || notification.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "Not authorized to modify this notification",
      });
    }

    await ctx.db.patch(args.notificationId, { read: true });

    return args.notificationId;
  },
});

/**
 * Mark all unread notifications as read for the authenticated user,
 * scoped to their team.
 */
export const markAllRead = mutation({
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

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return { updated: unread.length };
  },
});
