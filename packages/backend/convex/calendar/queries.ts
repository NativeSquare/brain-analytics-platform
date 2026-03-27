import { v } from "convex/values";
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
 * Returns `null` when the event does not exist or the user's team does not
 * match.
 */
export const getEventDetail = query({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, { eventId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const event = await ctx.db.get(eventId);
    if (!event || event.teamId !== teamId) return null;

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
