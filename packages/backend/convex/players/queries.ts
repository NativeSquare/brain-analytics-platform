import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Get all players for the authenticated user's team with optional filtering.
 *
 * AC #5: Accepts optional status and search filters. Resolves photo URLs.
 * Sorts by squadNumber ascending (nulls last).
 * AC #14: Team-scoped via requireAuth.
 */
export const getPlayers = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { status, search }) => {
    const { teamId } = await requireAuth(ctx);

    // Use appropriate index based on whether status filter is provided
    let playersQuery;
    if (status) {
      playersQuery = ctx.db
        .query("players")
        .withIndex("by_teamId_status", (q) =>
          q.eq("teamId", teamId).eq("status", status)
        );
    } else {
      playersQuery = ctx.db
        .query("players")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId));
    }

    let players = await playersQuery.collect();

    // In-memory search filter (AC #9)
    if (search) {
      const term = search.toLowerCase();
      players = players.filter(
        (p) =>
          p.firstName.toLowerCase().includes(term) ||
          p.lastName.toLowerCase().includes(term)
      );
    }

    // Sort by squadNumber ascending, nulls last
    players.sort((a, b) => {
      if (a.squadNumber == null && b.squadNumber == null) return 0;
      if (a.squadNumber == null) return 1;
      if (b.squadNumber == null) return -1;
      return a.squadNumber - b.squadNumber;
    });

    // Resolve photo URLs (AC #15)
    const results = await Promise.all(
      players.map(async (player) => ({
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        photoUrl: player.photo
          ? await ctx.storage.getUrl(player.photo as Parameters<typeof ctx.storage.getUrl>[0])
          : null,
        position: player.position,
        squadNumber: player.squadNumber,
        status: player.status,
        nationality: player.nationality,
      }))
    );

    return results;
  },
});

/**
 * Get a single player by ID with full details.
 *
 * AC #6: Fetches player, validates team match, resolves photo URL.
 * AC #14: Team-scoped via requireAuth.
 */
export const getPlayerById = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { teamId } = await requireAuth(ctx);

    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return null;
    }

    const photoUrl = player.photo
      ? await ctx.storage.getUrl(player.photo as Parameters<typeof ctx.storage.getUrl>[0])
      : null;

    return {
      ...player,
      photoUrl,
    };
  },
});

/**
 * Get tab access permissions for a player profile.
 *
 * Controls conditional tab visibility based on user role:
 * - showInjuries: true for admin or physio (AC #11, NFR7)
 * - showContract: true for admin or self (AC #11, NFR8)
 * - isSelf: true if player's userId matches current user
 */
export const getPlayerTabAccess = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return { showInjuries: false, showContract: false, isSelf: false };
    }

    const isAdmin = user.role === "admin";
    const isPhysio = user.role === "physio";
    const isSelf =
      player.userId !== undefined && player.userId === user._id;

    return {
      showInjuries: isAdmin || isPhysio,
      showContract: isAdmin || isSelf,
      isSelf,
    };
  },
});
