import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const NOTIFICATION_TYPES = {
  EVENT_CREATED: "event_created",
  EVENT_UPDATED: "event_updated",
  EVENT_CANCELLED: "event_cancelled",
} as const;

interface CreateNotificationArgs {
  userIds: Id<"users">[];
  teamId: Id<"teams">;
  type: string;
  title: string;
  message: string;
  relatedEntityId?: string;
}

/**
 * Insert one notification record per user.
 *
 * Designed to be called from within a Convex mutation after a domain event
 * (e.g. event creation, RSVP change, etc.).
 *
 * Silently skips if `userIds` is empty (defensive).
 */
export async function createNotification(
  ctx: MutationCtx,
  args: CreateNotificationArgs,
): Promise<void> {
  if (args.userIds.length === 0) return;

  const now = Date.now();

  for (const userId of args.userIds) {
    await ctx.db.insert("notifications", {
      userId,
      teamId: args.teamId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      createdAt: now,
      relatedEntityId: args.relatedEntityId,
    });
  }
}
