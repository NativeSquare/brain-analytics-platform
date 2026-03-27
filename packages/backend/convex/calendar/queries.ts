import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// ---------------------------------------------------------------------------
// Access-control helper
// ---------------------------------------------------------------------------

/**
 * Determine whether the given user can see the event.
 *
 * A user can see an event when ANY of these conditions hold:
 *  1. User role is "admin"
 *  2. User role is listed in event.invitedRoles
 *  3. User is individually invited (eventId is in the invitedEventIds set)
 */
function canUserAccessEvent(
  user: Doc<"users">,
  event: Doc<"calendarEvents">,
  invitedEventIds: Set<Id<"calendarEvents">>,
): boolean {
  const role = user.role;
  if (role === "admin") return true;
  if (role && event.invitedRoles?.includes(role)) return true;
  if (invitedEventIds.has(event._id)) return true;
  return false;
}

/**
 * Fetch the set of calendarEvent IDs for which the user has an individual
 * invitation via the calendarEventUsers junction table.
 */
async function getUserInvitedEventIds(
  ctx: QueryCtx,
  userId: Id<"users">,
  teamId: Id<"teams">,
): Promise<Set<Id<"calendarEvents">>> {
  const invites = await ctx.db
    .query("calendarEventUsers")
    .withIndex("by_userId_teamId", (q) =>
      q.eq("userId", userId).eq("teamId", teamId),
    )
    .collect();

  return new Set(invites.map((i) => i.eventId));
}

// ---------------------------------------------------------------------------
// Calendar Feed Token query (Story 3.5)
// ---------------------------------------------------------------------------

/**
 * Return the current user's calendarFeedToken, or null if not yet generated.
 */
export const getFeedToken = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return user.calendarFeedToken ?? null;
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all non-cancelled events the authenticated user can see for the
 * requested month.
 *
 * `month` is **1-indexed** (1 = January, 12 = December).
 */
export const getMonthEvents = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, { year, month }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Compute month boundaries (month is 1-indexed from the client)
    const monthStart = new Date(year, month - 1, 1).getTime();
    const monthEnd = new Date(year, month, 1).getTime();

    // Index range query: teamId + startsAt in [monthStart, monthEnd)
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_teamId_startsAt", (q) =>
        q.eq("teamId", teamId).gte("startsAt", monthStart).lt("startsAt", monthEnd),
      )
      .collect();

    // Batch-load individual invitations for this user (avoids N+1)
    const invitedEventIds = await getUserInvitedEventIds(ctx, user._id, teamId);

    // Filter: not cancelled + access check
    return events.filter(
      (e) => !e.isCancelled && canUserAccessEvent(user, e, invitedEventIds),
    );
  },
});

/**
 * Return a single event with full details including the owner's display name.
 * Returns `null` when the event does not exist, the user's team does not
 * match, or the user does not have access to the event (AC #13).
 */
export const getEventDetail = query({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, { eventId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const event = await ctx.db.get(eventId);
    if (!event || event.teamId !== teamId) return null;

    // Per-event access control (AC #13): user must be admin, in invitedRoles,
    // or individually invited via calendarEventUsers.
    const invitedEventIds = await getUserInvitedEventIds(ctx, user._id, teamId);
    if (!canUserAccessEvent(user, event, invitedEventIds)) return null;

    // Fetch owner name
    const owner = await ctx.db.get(event.ownerId);
    const ownerName = owner?.name ?? owner?.fullName ?? owner?.email ?? "Unknown";

    return { ...event, ownerName };
  },
});

/**
 * Return events for a specific day, sorted by startsAt.
 *
 * `date` is a Unix timestamp (ms) representing the **start** of the target
 * day (midnight).  The query covers the full 24-hour window.
 */
export const getDayEvents = query({
  args: {
    date: v.number(),
  },
  handler: async (ctx, { date }) => {
    const { user, teamId } = await requireAuth(ctx);

    const dayStart = date;
    const dayEnd = date + 24 * 60 * 60 * 1000; // +24 h

    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_teamId_startsAt", (q) =>
        q.eq("teamId", teamId).gte("startsAt", dayStart).lt("startsAt", dayEnd),
      )
      .collect();

    const invitedEventIds = await getUserInvitedEventIds(ctx, user._id, teamId);

    return events
      .filter(
        (e) => !e.isCancelled && canUserAccessEvent(user, e, invitedEventIds),
      )
      .sort((a, b) => a.startsAt - b.startsAt);
  },
});

// ---------------------------------------------------------------------------
// getUserEventRsvp (AC #5, #9, #12)
// ---------------------------------------------------------------------------

/**
 * Return the current user's RSVP record for a specific event, or null.
 */
export const getUserEventRsvp = query({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, { eventId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const event = await ctx.db.get(eventId);
    if (!event || event.teamId !== teamId) return null;

    const rsvp = await ctx.db
      .query("eventRsvps")
      .withIndex("by_userId_eventId", (q) =>
        q.eq("userId", user._id).eq("eventId", eventId),
      )
      .first();

    if (!rsvp) return null;

    return {
      status: rsvp.status,
      reason: rsvp.reason,
      respondedAt: rsvp.respondedAt,
    };
  },
});

// ---------------------------------------------------------------------------
// getSeriesInfo (AC #11)
// ---------------------------------------------------------------------------

export const getSeriesInfo = query({
  args: {
    seriesId: v.id("calendarEventSeries"),
  },
  handler: async (ctx, { seriesId }) => {
    const { teamId } = await requireAuth(ctx);

    const series = await ctx.db.get(seriesId);
    if (!series || series.teamId !== teamId) return null;

    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_seriesId", (q) => q.eq("seriesId", seriesId))
      .collect();

    const totalOccurrences = events.length;
    const activeOccurrences = events.filter((e) => !e.isCancelled).length;

    return {
      series: {
        frequency: series.frequency,
        endDate: series.endDate,
        createdAt: series.createdAt,
      },
      totalOccurrences,
      activeOccurrences,
    };
  },
});

// ---------------------------------------------------------------------------
// getEventRsvps (AC #6, #8, #11, #12)
// ---------------------------------------------------------------------------

/**
 * Return RSVP data for an event. Admin sees full details + pending users.
 * Non-admin sees only own RSVP + summary counts.
 */
export const getEventRsvps = query({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, { eventId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Event not found",
      });
    }
    if (event.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "Event not found",
      });
    }

    // Fetch all RSVP records for this event
    const rsvps = await ctx.db
      .query("eventRsvps")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();

    const attendingCount = rsvps.filter(
      (r) => r.status === "attending",
    ).length;
    const notAttendingCount = rsvps.filter(
      (r) => r.status === "not_attending",
    ).length;

    // Compute total invited users
    const invitedUserIdSet = new Set<string>();

    // Role-based invitations
    if (event.invitedRoles && event.invitedRoles.length > 0) {
      for (const role of event.invitedRoles) {
        const usersWithRole = await ctx.db
          .query("users")
          .withIndex("by_teamId_role", (q: any) =>
            q.eq("teamId", teamId).eq("role", role),
          )
          .collect();
        for (const u of usersWithRole) {
          invitedUserIdSet.add(u._id as string);
        }
      }
    }

    // Individual invitations
    const individualInvites = await ctx.db
      .query("calendarEventUsers")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
    for (const inv of individualInvites) {
      invitedUserIdSet.add(inv.userId as string);
    }

    const totalInvited = invitedUserIdSet.size;
    const respondedUserIds = new Set(
      rsvps.map((r) => r.userId as string),
    );
    const pendingCount = Math.max(
      0,
      totalInvited - attendingCount - notAttendingCount,
    );

    const summary = {
      attending: attendingCount,
      notAttending: notAttendingCount,
      pending: pendingCount,
      total: totalInvited,
    };

    // Admin: full details
    if (user.role === "admin") {
      const responses = await Promise.all(
        rsvps.map(async (rsvp) => {
          const rsvpUser = await ctx.db.get(rsvp.userId);
          return {
            userId: rsvp.userId,
            status: rsvp.status,
            reason: rsvp.reason,
            respondedAt: rsvp.respondedAt,
            fullName:
              rsvpUser?.fullName ?? rsvpUser?.name ?? rsvpUser?.email ?? "Unknown",
            avatarUrl: rsvpUser?.avatarUrl ?? null,
          };
        }),
      );

      // Build pending users list
      const pendingUserIds = [...invitedUserIdSet].filter(
        (id) => !respondedUserIds.has(id),
      );
      const pending = await Promise.all(
        pendingUserIds.map(async (id) => {
          const pendingUser = await ctx.db.get(
            id as Id<"users">,
          );
          return {
            userId: id as Id<"users">,
            fullName:
              pendingUser?.fullName ??
              pendingUser?.name ??
              pendingUser?.email ??
              "Unknown",
            avatarUrl: pendingUser?.avatarUrl ?? null,
          };
        }),
      );

      return { responses, pending, summary };
    }

    // Non-admin: own RSVP + summary counts only
    const myRsvp = rsvps.find(
      (r) => (r.userId as string) === (user._id as string),
    );

    return {
      myRsvp: myRsvp
        ? {
            status: myRsvp.status,
            reason: myRsvp.reason,
            respondedAt: myRsvp.respondedAt,
          }
        : null,
      summary,
    };
  },
});

// ---------------------------------------------------------------------------
// getUserRsvpsByEventIds — batch query for calendar view (AC #1, #11)
// ---------------------------------------------------------------------------

/**
 * Return the current user's RSVP status for multiple events at once.
 * Returns a map of eventId → status.
 */
export const getUserRsvpsByEventIds = query({
  args: {
    eventIds: v.array(v.id("calendarEvents")),
  },
  handler: async (ctx, { eventIds }) => {
    const { user, teamId } = await requireAuth(ctx);

    const result: Record<string, string> = {};

    for (const eventId of eventIds) {
      // Team isolation: verify event belongs to user's team before returning RSVP
      const event = await ctx.db.get(eventId);
      if (!event || event.teamId !== teamId) continue;

      const rsvp = await ctx.db
        .query("eventRsvps")
        .withIndex("by_userId_eventId", (q) =>
          q.eq("userId", user._id).eq("eventId", eventId),
        )
        .first();

      if (rsvp) {
        result[eventId as string] = rsvp.status;
      }
    }

    return result;
  },
});
