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

    // Batch-fetch all playerInvites for the team once (avoids N+1 per-player queries)
    const teamInvites = await ctx.db
      .query("playerInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Build a map of playerId → most recent invite status
    const invitesByPlayer = new Map<string, { status: string; createdAt: number }>();
    for (const invite of teamInvites) {
      const existing = invitesByPlayer.get(invite.playerId);
      if (!existing || invite.createdAt > existing.createdAt) {
        invitesByPlayer.set(invite.playerId, {
          status: invite.status,
          createdAt: invite.createdAt,
        });
      }
    }
    const inviteStatusMap = new Map<string, string>();
    for (const [playerId, { status: invStatus }] of invitesByPlayer) {
      inviteStatusMap.set(playerId, invStatus);
    }

    // Resolve photo URLs (AC #15) and invite status (AC #12)
    const results = await Promise.all(
      players.map(async (player) => {
        // Resolve photo URL
        const photoUrl = player.photo
          ? await ctx.storage.getUrl(player.photo as Parameters<typeof ctx.storage.getUrl>[0])
          : null;

        // Look up invite status from the pre-fetched map (AC #12)
        const inviteStatus = !player.userId
          ? inviteStatusMap.get(player._id) ?? null
          : null;

        return {
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl,
          position: player.position,
          squadNumber: player.squadNumber,
          status: player.status,
          nationality: player.nationality,
          inviteStatus,
        };
      })
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

/**
 * Validate a player invitation token. Public query (no auth required).
 *
 * AC #11: Used by the accept-invite page to check token validity
 * and pre-fill the registration form.
 */
export const validatePlayerInvite = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("playerInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invite) {
      return { valid: false as const, reason: "not_found" as const };
    }

    if (invite.status !== "pending") {
      return { valid: false as const, reason: "already_used" as const };
    }

    if (invite.expiresAt < Date.now()) {
      return { valid: false as const, reason: "expired" as const };
    }

    // Fetch associated player
    const player = await ctx.db.get(invite.playerId);
    if (!player) {
      return { valid: false as const, reason: "not_found" as const };
    }

    return {
      valid: true as const,
      firstName: player.firstName,
      lastName: player.lastName,
      email: invite.email,
    };
  },
});

/**
 * Get the invite status for a specific player. Authenticated.
 *
 * AC #12: Used by the player list and profile page to show
 * invite status indicators and re-invite button.
 */
export const getPlayerInviteStatus = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    await requireAuth(ctx);

    const invites = await ctx.db
      .query("playerInvites")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    if (invites.length === 0) {
      return null;
    }

    // Return the most recent invite's status
    const sorted = invites.sort((a, b) => b.createdAt - a.createdAt);
    return sorted[0].status;
  },
});
