import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// ---------------------------------------------------------------------------
// Internal access-control helpers (mirrored from queries.ts)
// ---------------------------------------------------------------------------

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
// getUserByFeedToken — look up user via calendar feed token
// ---------------------------------------------------------------------------

export const getUserByFeedToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_calendarFeedToken", (q) =>
        q.eq("calendarFeedToken", token),
      )
      .first();

    return user ?? null;
  },
});

// ---------------------------------------------------------------------------
// getFeedEvents — get all accessible non-cancelled events for a user's team
// ---------------------------------------------------------------------------

export const getFeedEvents = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user || !user.teamId) return { events: [], teamName: "" };

    const teamId = user.teamId;

    // Fetch team name for X-WR-CALNAME
    const team = await ctx.db.get(teamId);
    const teamName = team?.name ?? "Unknown Team";

    // Fetch all events for this team
    const allEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Get individual invitations for the user
    const invitedEventIds = await getUserInvitedEventIds(ctx, userId, teamId);

    // Filter: not cancelled + user has access
    const events = allEvents.filter(
      (e) => !e.isCancelled && canUserAccessEvent(user, e, invitedEventIds),
    );

    return { events, teamName };
  },
});
