import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireRole } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { EVENT_TYPE_LABELS } from "@packages/shared/calendar";

import type { Id } from "../_generated/dataModel";

export const createEvent = mutation({
  args: {
    name: v.string(),
    eventType: v.union(
      v.literal("match"),
      v.literal("training"),
      v.literal("meeting"),
      v.literal("rehab"),
    ),
    startsAt: v.number(),
    endsAt: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    rsvpEnabled: v.boolean(),
    invitedRoles: v.array(v.string()),
    invitedUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Auth + role check
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // 2. Server-side validation: endsAt > startsAt
    if (args.endsAt <= args.startsAt) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "End time must be after start time",
      });
    }

    // 3. Insert the calendar event
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      name: args.name,
      eventType: args.eventType,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      location: args.location,
      description: args.description,
      ownerId: user._id,
      rsvpEnabled: args.rsvpEnabled,
      isRecurring: false,
      seriesId: undefined,
      isCancelled: false,
      invitedRoles: args.invitedRoles,
      createdAt: Date.now(),
    });

    // 4. Insert individual user invitations
    for (const userId of args.invitedUserIds) {
      await ctx.db.insert("calendarEventUsers", {
        eventId,
        userId,
        teamId,
      });
    }

    // 5. Collect all invited user IDs for notifications
    const invitedUserIdSet = new Set<string>(
      args.invitedUserIds.map((id) => id as string),
    );

    // Query users whose role is in invitedRoles
    if (args.invitedRoles.length > 0) {
      for (const role of args.invitedRoles) {
        const usersWithRole = await ctx.db
          .query("users")
          .withIndex("by_teamId_role", (q) =>
            q.eq("teamId", teamId).eq("role", role as any),
          )
          .collect();

        for (const u of usersWithRole) {
          invitedUserIdSet.add(u._id as string);
        }
      }
    }

    // Remove the creating admin from notifications
    invitedUserIdSet.delete(user._id as string);

    // 6. Send notifications
    if (invitedUserIdSet.size > 0) {
      const eventDate = new Date(args.startsAt);
      const formattedDate = eventDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const typeLabel = EVENT_TYPE_LABELS[args.eventType] ?? args.eventType;

      await createNotification(ctx, {
        userIds: [...invitedUserIdSet] as Id<"users">[],
        teamId,
        type: "event_created",
        title: `New Event: ${args.name}`,
        message: `${typeLabel} on ${formattedDate}`,
        relatedEntityId: eventId as string,
      });
    }

    return eventId;
  },
});
