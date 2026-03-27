import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

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
 */
export async function createNotification(
  ctx: MutationCtx,
  args: CreateNotificationArgs,
): Promise<void> {
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
