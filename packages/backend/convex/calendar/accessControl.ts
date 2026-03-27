/**
 * Shared access-control helpers for calendar event visibility.
 *
 * Extracted to a single module so that both public queries (queries.ts) and
 * internal queries (internalQueries.ts) use the same logic. Keeping two
 * copies in sync is a security risk — any change in access policy must be
 * reflected everywhere.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Determine whether the given user can see the event.
 *
 * A user can see an event when ANY of these conditions hold:
 *  1. User role is "admin"
 *  2. User role is listed in event.invitedRoles
 *  3. User is individually invited (eventId is in the invitedEventIds set)
 */
export function canUserAccessEvent(
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
export async function getUserInvitedEventIds(
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
