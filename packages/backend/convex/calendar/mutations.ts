import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { EVENT_TYPE_LABELS, RECURRENCE_FREQUENCY_LABELS } from "@packages/shared/calendar";
import { computeOccurrenceDates } from "./utils";

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
    invitedRoles: v.array(
      v.union(
        v.literal("admin"),
        v.literal("coach"),
        v.literal("analyst"),
        v.literal("physio"),
        v.literal("player"),
        v.literal("staff"),
      ),
    ),
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
            q.eq("teamId", teamId).eq("role", role),
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

// ---------------------------------------------------------------------------
// Shared args & helpers
// ---------------------------------------------------------------------------

const eventTypeArg = v.union(
  v.literal("match"),
  v.literal("training"),
  v.literal("meeting"),
  v.literal("rehab"),
);

const roleArg = v.union(
  v.literal("admin"),
  v.literal("coach"),
  v.literal("analyst"),
  v.literal("physio"),
  v.literal("player"),
  v.literal("staff"),
);

const MAX_SERIES_SPAN_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Collect all invited user IDs (by role + individual), deduplicated,
 * excluding a specific user (typically the admin performing the action).
 */
async function collectInvitedUserIds(
  ctx: any,
  teamId: Id<"teams">,
  invitedRoles: string[],
  invitedUserIds: Id<"users">[],
  excludeUserId: Id<"users">,
): Promise<Id<"users">[]> {
  const set = new Set<string>(invitedUserIds.map((id) => id as string));

  for (const role of invitedRoles) {
    const usersWithRole = await ctx.db
      .query("users")
      .withIndex("by_teamId_role", (q: any) =>
        q.eq("teamId", teamId).eq("role", role),
      )
      .collect();
    for (const u of usersWithRole) {
      set.add(u._id as string);
    }
  }

  set.delete(excludeUserId as string);
  return [...set] as Id<"users">[];
}

// ---------------------------------------------------------------------------
// createRecurringEvent (AC #3, #9, #12)
// ---------------------------------------------------------------------------

export const createRecurringEvent = mutation({
  args: {
    name: v.string(),
    eventType: eventTypeArg,
    startsAt: v.number(),
    endsAt: v.number(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    rsvpEnabled: v.boolean(),
    invitedRoles: v.array(roleArg),
    invitedUserIds: v.array(v.id("users")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
    ),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // Validations
    if (args.endsAt <= args.startsAt) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "End time must be after start time",
      });
    }
    if (args.endDate <= args.startsAt) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Series end date must be after event start date",
      });
    }
    if (args.endDate - args.startsAt > MAX_SERIES_SPAN_MS) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Series cannot span more than 1 year",
      });
    }

    // Insert series record
    const seriesId = await ctx.db.insert("calendarEventSeries", {
      teamId,
      frequency: args.frequency,
      interval: 1,
      endDate: args.endDate,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    // Compute occurrences
    const occurrences = computeOccurrenceDates(
      args.startsAt,
      args.endsAt,
      args.frequency,
      args.endDate,
    );

    if (occurrences.length > 365) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Too many occurrences",
      });
    }

    // Insert events and user invitations
    let firstEventId: Id<"calendarEvents"> | null = null;
    for (const occ of occurrences) {
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId,
        name: args.name,
        eventType: args.eventType,
        startsAt: occ.startsAt,
        endsAt: occ.endsAt,
        location: args.location,
        description: args.description,
        ownerId: user._id,
        rsvpEnabled: args.rsvpEnabled,
        isRecurring: true,
        seriesId,
        isCancelled: false,
        invitedRoles: args.invitedRoles,
        createdAt: Date.now(),
      });

      if (!firstEventId) firstEventId = eventId;

      for (const userId of args.invitedUserIds) {
        await ctx.db.insert("calendarEventUsers", {
          eventId,
          userId,
          teamId,
        });
      }
    }

    // Notifications
    const notifyUserIds = await collectInvitedUserIds(
      ctx,
      teamId,
      args.invitedRoles,
      args.invitedUserIds,
      user._id,
    );

    if (notifyUserIds.length > 0) {
      const freqLabel =
        RECURRENCE_FREQUENCY_LABELS[args.frequency] ?? args.frequency;
      const typeLabel = EVENT_TYPE_LABELS[args.eventType] ?? args.eventType;

      await createNotification(ctx, {
        userIds: notifyUserIds,
        teamId,
        type: "event_created",
        title: `New Recurring Event: ${args.name}`,
        message: `${freqLabel} ${typeLabel} — ${occurrences.length} occurrences`,
        relatedEntityId: firstEventId as string,
      });
    }

    return { seriesId, eventCount: occurrences.length };
  },
});

// ---------------------------------------------------------------------------
// updateEvent — single occurrence edit (AC #5)
// ---------------------------------------------------------------------------

export const updateEvent = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    name: v.optional(v.string()),
    eventType: v.optional(eventTypeArg),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    rsvpEnabled: v.optional(v.boolean()),
    invitedRoles: v.optional(v.array(roleArg)),
    invitedUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Event not found",
      });
    }

    // Time validation
    const newStartsAt = args.startsAt ?? event.startsAt;
    const newEndsAt = args.endsAt ?? event.endsAt;
    if (newEndsAt <= newStartsAt) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "End time must be after start time",
      });
    }

    // Build patch object
    const patch: Record<string, any> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.eventType !== undefined) patch.eventType = args.eventType;
    if (args.startsAt !== undefined) patch.startsAt = args.startsAt;
    if (args.endsAt !== undefined) patch.endsAt = args.endsAt;
    if (args.location !== undefined) patch.location = args.location;
    if (args.description !== undefined) patch.description = args.description;
    if (args.rsvpEnabled !== undefined) patch.rsvpEnabled = args.rsvpEnabled;
    if (args.invitedRoles !== undefined) patch.invitedRoles = args.invitedRoles;

    // Mark as modified if recurring
    if (event.isRecurring) {
      patch.isModified = true;
    }

    await ctx.db.patch(args.eventId, patch);

    // Re-sync invitedUserIds if provided
    if (args.invitedUserIds !== undefined) {
      // Delete existing
      const existing = await ctx.db
        .query("calendarEventUsers")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .collect();
      for (const inv of existing) {
        await ctx.db.delete(inv._id);
      }
      // Insert new
      for (const userId of args.invitedUserIds) {
        await ctx.db.insert("calendarEventUsers", {
          eventId: args.eventId,
          userId,
          teamId,
        });
      }
    }

    // Notifications — if invitedUserIds was not provided, fall back to
    // the existing individually-invited users so they are still notified.
    const finalRoles = args.invitedRoles ?? event.invitedRoles ?? [];
    let finalUserIds: Id<"users">[] = [];
    if (args.invitedUserIds !== undefined) {
      finalUserIds = args.invitedUserIds;
    } else {
      const existingInvites = await ctx.db
        .query("calendarEventUsers")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .collect();
      finalUserIds = existingInvites.map((inv) => inv.userId);
    }
    const notifyUserIds = await collectInvitedUserIds(
      ctx,
      teamId,
      finalRoles,
      finalUserIds,
      user._id,
    );

    if (notifyUserIds.length > 0) {
      await createNotification(ctx, {
        userIds: notifyUserIds,
        teamId,
        type: "event_updated",
        title: `Event Updated: ${args.name ?? event.name}`,
        message: `The event has been updated`,
        relatedEntityId: args.eventId as string,
      });
    }

    return args.eventId;
  },
});

// ---------------------------------------------------------------------------
// cancelEvent — single occurrence cancel (AC #6)
// ---------------------------------------------------------------------------

export const cancelEvent = mutation({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Event not found",
      });
    }

    if (event.isCancelled) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Event is already cancelled",
      });
    }

    await ctx.db.patch(args.eventId, { isCancelled: true });

    // Notifications
    const invitedUserIds: Id<"users">[] = [];
    const invites = await ctx.db
      .query("calendarEventUsers")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const inv of invites) {
      invitedUserIds.push(inv.userId);
    }

    const notifyUserIds = await collectInvitedUserIds(
      ctx,
      teamId,
      event.invitedRoles ?? [],
      invitedUserIds,
      user._id,
    );

    if (notifyUserIds.length > 0) {
      const eventDate = new Date(event.startsAt);
      const formattedDate = eventDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const typeLabel = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;

      await createNotification(ctx, {
        userIds: notifyUserIds,
        teamId,
        type: "event_cancelled",
        title: `Event Cancelled: ${event.name}`,
        message: `The ${typeLabel} on ${formattedDate} has been cancelled`,
        relatedEntityId: args.eventId as string,
      });
    }

    return args.eventId;
  },
});

// ---------------------------------------------------------------------------
// deleteEventSeries — delete entire series (AC #7)
// ---------------------------------------------------------------------------

export const deleteEventSeries = mutation({
  args: {
    seriesId: v.id("calendarEventSeries"),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const series = await ctx.db.get(args.seriesId);
    if (!series || series.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Series not found",
      });
    }

    // Find all events in series
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_seriesId", (q) => q.eq("seriesId", args.seriesId))
      .collect();

    // Collect all invited user IDs across all occurrences for notification.
    // All events in a series share the same invitedRoles, so we only need to
    // query role-based users once (from the first event) to avoid N+1 queries.
    const allInvitedUserIdSet = new Set<string>();
    let firstName = "";

    // Collect role-based users once from the first event's roles
    const firstEventRoles = events[0]?.invitedRoles;
    if (firstEventRoles) {
      for (const role of firstEventRoles) {
        const usersWithRole = await ctx.db
          .query("users")
          .withIndex("by_teamId_role", (q: any) =>
            q.eq("teamId", teamId).eq("role", role),
          )
          .collect();
        for (const u of usersWithRole) {
          allInvitedUserIdSet.add(u._id as string);
        }
      }
    }

    for (const event of events) {
      if (!firstName) firstName = event.name;

      // Delete all calendarEventUsers for this event
      const invites = await ctx.db
        .query("calendarEventUsers")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
        .collect();
      for (const inv of invites) {
        allInvitedUserIdSet.add(inv.userId as string);
        await ctx.db.delete(inv._id);
      }

      // Delete the event
      await ctx.db.delete(event._id);
    }

    // Remove admin from notifications
    allInvitedUserIdSet.delete(user._id as string);

    // Notify
    if (allInvitedUserIdSet.size > 0) {
      await createNotification(ctx, {
        userIds: [...allInvitedUserIdSet] as Id<"users">[],
        teamId,
        type: "event_series_deleted",
        title: `Event Series Deleted: ${firstName}`,
        message: `All ${events.length} occurrences have been deleted`,
        relatedEntityId: args.seriesId as string,
      });
    }

    // Delete the series record
    await ctx.db.delete(args.seriesId);

    return { deletedCount: events.length };
  },
});

// ---------------------------------------------------------------------------
// submitRsvp — user submits RSVP for an event (AC #2, #3, #4, #7, #12)
// ---------------------------------------------------------------------------

const RSVP_REASON_MAX_LENGTH = 500;

export const submitRsvp = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    status: v.union(v.literal("attending"), v.literal("not_attending")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    // Fetch event
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Event not found",
      });
    }

    // Team isolation
    if (event.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "Event not found",
      });
    }

    // RSVP must be enabled
    if (!event.rsvpEnabled) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "RSVP is not enabled for this event",
      });
    }

    // Cannot RSVP to cancelled event
    if (event.isCancelled) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Cannot RSVP to a cancelled event",
      });
    }

    // Check invitation: user role in invitedRoles OR individual invitation
    const isRoleInvited =
      user.role && event.invitedRoles?.includes(user.role);
    let isIndividuallyInvited = false;

    if (!isRoleInvited) {
      const invite = await ctx.db
        .query("calendarEventUsers")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first();
      isIndividuallyInvited = !!invite;
    }

    // Admin bypass: admins can always access team events
    if (!isRoleInvited && !isIndividuallyInvited && user.role !== "admin") {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "You are not invited to this event",
      });
    }

    // Validate reason length
    if (args.reason && args.reason.length > RSVP_REASON_MAX_LENGTH) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Reason must be ${RSVP_REASON_MAX_LENGTH} characters or less`,
      });
    }

    // Clear reason when attending
    const reason =
      args.status === "attending" ? undefined : args.reason;

    // Upsert: check for existing RSVP
    const existing = await ctx.db
      .query("eventRsvps")
      .withIndex("by_userId_eventId", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        reason,
        respondedAt: Date.now(),
      });
      return existing._id;
    }

    const rsvpId = await ctx.db.insert("eventRsvps", {
      eventId: args.eventId,
      userId: user._id,
      teamId,
      status: args.status,
      reason,
      respondedAt: Date.now(),
    });

    return rsvpId;
  },
});
