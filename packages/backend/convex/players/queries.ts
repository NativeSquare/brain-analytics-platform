import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth, requireRole, getTeamResource } from "../lib/auth";

/**
 * Get fitness entries for a specific player.
 *
 * Story 5.4 AC #2: Returns array of playerFitness sorted by date descending.
 * Story 5.4 AC #14: Team-scoped via requireAuth.
 */
export const getPlayerFitness = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { teamId } = await requireAuth(ctx);

    await getTeamResource(ctx, teamId, "players", playerId);

    const entries = await ctx.db
      .query("playerFitness")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    // Sort by date descending (most recent first)
    return entries.sort((a, b) => b.date - a.date);
  },
});

/**
 * Get match stats for a specific player.
 *
 * AC #2: Returns array of playerStats sorted by matchDate descending.
 * AC #14: Team-scoped via requireAuth.
 */
export const getPlayerStats = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { teamId } = await requireAuth(ctx);

    await getTeamResource(ctx, teamId, "players", playerId);

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    // Sort by matchDate descending (most recent first)
    return stats.sort((a, b) => b.matchDate - a.matchDate);
  },
});

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
 * Get injury entries for a specific player. Medical/admin only.
 *
 * Story 5.5 AC #2: Returns array of playerInjuries sorted by date descending.
 * Story 5.5 AC #14, #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const getPlayerInjuries = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    await getTeamResource(ctx, teamId, "players", playerId);

    const entries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    // Sort by date descending (most recent first)
    return entries.sort((a, b) => b.date - a.date);
  },
});

/**
 * Get rehab notes for a specific injury. Admin or physio only.
 *
 * Story 14.2 AC #6: Returns array of injuryRehabNotes sorted by createdAt ascending.
 * Story 14.2 AC #15: Team-scoped via requireRole(["admin", "physio"]).
 */
export const getRehabNotes = query({
  args: { injuryId: v.id("playerInjuries") },
  handler: async (ctx, { injuryId }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    const injury = await ctx.db.get(injuryId);
    if (!injury || injury.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND" as const, message: "Injury not found" });
    }

    const notes = await ctx.db
      .query("injuryRehabNotes")
      .withIndex("by_injuryId", (q) => q.eq("injuryId", injuryId))
      .collect();

    // Resolve author names
    const notesWithAuthors = await Promise.all(
      notes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          authorName: author?.name ?? author?.email ?? "Unknown",
        };
      })
    );

    // Sort by createdAt ascending (oldest first)
    return notesWithAuthors.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Get injury status for a player. Any authenticated team member.
 *
 * Story 5.5 AC #12: Returns { hasCurrentInjury: boolean } only.
 * Story 5.5 AC #15: Does NOT return any injury details — boolean flag only.
 */
export const getPlayerInjuryStatus = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { teamId } = await requireAuth(ctx);

    await getTeamResource(ctx, teamId, "players", playerId);

    // Story 14.1 AC #5, #12: Check for non-cleared status.
    // Backward compat: "current" (legacy) is treated as active (not cleared).
    // "recovered" (legacy) is treated as cleared, so we exclude it too.
    const allInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    const hasCurrentInjury = allInjuries.some(
      (i) => i.status !== "cleared" && i.status !== "recovered"
    );

    return { hasCurrentInjury };
  },
});

/**
 * Batch query: get injury status for multiple players at once.
 *
 * Story 5.5 AC #12, Task 11.2: Avoids N+1 queries in the player table.
 * Returns a map of playerId → hasCurrentInjury.
 */
export const getPlayersInjuryStatuses = query({
  args: { playerIds: v.array(v.id("players")) },
  handler: async (ctx, { playerIds }) => {
    const { teamId } = await requireAuth(ctx);

    const result: Record<string, boolean> = {};

    // Story 14.1 AC #5, #12: Fetch all non-cleared injuries.
    // Backward compat: "recovered" (legacy) is treated as cleared.
    const allInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Build a set of playerIds that have active injuries (not cleared/recovered)
    const injuredPlayerIds = new Set(
      allInjuries
        .filter((i) => i.status !== "cleared" && i.status !== "recovered")
        .map((i) => i.playerId)
    );

    for (const playerId of playerIds) {
      result[playerId] = injuredPlayerIds.has(playerId);
    }

    return result;
  },
});

/**
 * Batch query: get RTP status for multiple players. Admin or physio only.
 *
 * Story 14.3 AC #6: Returns the most severe RTP status per player.
 * Priority: active (3) > rehab (2) > assessment (1) > null.
 */
export const getPlayersRtpStatuses = query({
  args: { playerIds: v.array(v.id("players")) },
  handler: async (ctx, { playerIds }) => {
    const { teamId } = await requireRole(ctx, ["admin", "physio"]);

    const RTP_PRIORITY: Record<string, number> = {
      active: 3,
      current: 3, // backward compat
      rehab: 2,
      assessment: 1,
    };

    const allInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Filter to non-cleared injuries only
    const activeInjuries = allInjuries.filter(
      (i) => i.status !== "cleared" && i.status !== "recovered"
    );

    // Build playerId -> most severe status map
    const playerIdSet = new Set(playerIds.map((id) => id.toString()));
    const result: Record<string, string | null> = {};

    for (const playerId of playerIds) {
      result[playerId] = null;
    }

    for (const injury of activeInjuries) {
      if (!playerIdSet.has(injury.playerId.toString())) continue;

      const current = result[injury.playerId];
      const currentPriority = current ? (RTP_PRIORITY[current] ?? 0) : 0;
      const newPriority = RTP_PRIORITY[injury.status] ?? 0;

      if (newPriority > currentPriority) {
        result[injury.playerId] = injury.status;
      }
    }

    return result;
  },
});

/**
 * Get the authenticated player's own profile.
 *
 * Story 5.6 AC #7: Derives player from authenticated user's userId.
 * Returns null for users with no linked player profile.
 * Story 5.6 AC #14: Team-scoped defensive check.
 */
export const getOwnPlayerProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!player) return null;

    if (player.teamId !== teamId) {
      throw new ConvexError({ code: "NOT_FOUND" as const, message: "Player not found" });
    }

    const photoUrl = player.photo
      ? await ctx.storage.getUrl(player.photo as Parameters<typeof ctx.storage.getUrl>[0])
      : null;

    return { ...player, photoUrl };
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

/**
 * Get external provider links for a player.
 *
 * Story 5.7 AC #7: Returns providers sorted alphabetically + canEdit flag.
 * Story 5.7 AC #9: Real-time via Convex useQuery subscription.
 * Story 5.7 AC #10: Team-scoped via requireAuth.
 */
export const getExternalProviders = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return { providers: [], canEdit: false };
    }

    const canEdit = user.role === "admin";

    const providers = (player.externalProviderLinks ?? []).sort((a, b) =>
      a.provider.localeCompare(b.provider)
    );

    return { providers, canEdit };
  },
});

/**
 * Get the number of match appearances for multiple players in a single batch call.
 * Returns a record mapping playerId → appearance count.
 */
export const getPlayersAppearances = query({
  args: { playerIds: v.array(v.id("players")) },
  handler: async (ctx, { playerIds }) => {
    await requireAuth(ctx);

    const result: Record<string, number> = {};
    await Promise.all(
      playerIds.map(async (playerId) => {
        const stats = await ctx.db
          .query("playerStats")
          .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
          .collect();
        result[playerId] = stats.length;
      }),
    );
    return result;
  },
});
