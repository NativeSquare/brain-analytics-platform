import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if the current player-role user is viewing their own profile.
 *
 * Story 6.2 AC7: Player self-access pattern.
 * 1. Get current user from auth → userId
 * 2. Query players table for player where userId === current user
 * 3. Compare that player's _id with the requested playerId
 */
async function isPlayerSelf(
  ctx: QueryCtx,
  playerId: Id<"players">,
  userId: Id<"users">,
  teamId: Id<"teams">
): Promise<boolean> {
  const playerRecord = await ctx.db
    .query("players")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!playerRecord) return false;
  if (playerRecord.teamId !== teamId) return false;
  return playerRecord._id === playerId;
}

// ---------------------------------------------------------------------------
// canViewContract — AC1, AC3, AC4, AC5, AC7
// ---------------------------------------------------------------------------

/**
 * Determine if the current user can view a player's contract tab.
 *
 * Returns `true` only if:
 * - User has admin role, OR
 * - User is a player viewing their own profile (userId matches)
 *
 * Always scopes by teamId — cross-tenant returns `false`.
 * This is the single source of truth for Contract tab visibility (AC7).
 */
export const canViewContract = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Verify player exists in the same team
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return false;
    }

    // Admin can view any contract in their team
    if (user.role === "admin") {
      return true;
    }

    // Player can view only their own contract
    if (user.role === "player") {
      return await isPlayerSelf(ctx, playerId, user._id, teamId);
    }

    // All other roles (coach, analyst, physio, staff) → denied
    return false;
  },
});

// ---------------------------------------------------------------------------
// getContract — AC2, AC4, AC5, AC6
// ---------------------------------------------------------------------------

/**
 * Get a player's contract data with security enforcement.
 *
 * Story 6.2 AC2: Returns `null` (not error) for non-admin, non-self requests.
 * Story 6.2 AC4: Player-self gets read-only access.
 * Story 6.2 AC6: Team-scoped — cross-tenant returns `null`.
 *
 * Return shape includes `readOnly` flag:
 * - `true` for player viewing own contract
 * - `false` for admin
 */
export const getContract = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Verify player exists and is in same team
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return null;
    }

    // Determine access level
    let readOnly: boolean;

    if (user.role === "admin") {
      readOnly = false;
    } else if (user.role === "player") {
      const isSelf = await isPlayerSelf(ctx, playerId, user._id, teamId);
      if (!isSelf) return null;
      readOnly = true;
    } else {
      // Coach, analyst, physio, staff → no access, return null (no error)
      return null;
    }

    // Fetch the contract record scoped by team
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_teamId_playerId", (q) =>
        q.eq("teamId", teamId).eq("playerId", playerId)
      )
      .first();

    if (!contract) {
      return null;
    }

    return {
      _id: contract._id,
      playerId: contract.playerId,
      fileId: contract.fileId,
      extractionStatus: contract.extractionStatus,
      extractedData: contract.extractedData ?? null,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      readOnly,
    };
  },
});

// ---------------------------------------------------------------------------
// getContractDownloadUrl — AC2, AC4
// ---------------------------------------------------------------------------

/**
 * Get a signed URL for downloading the contract PDF.
 *
 * Same authorization logic as getContract:
 * - Admin → allowed
 * - Player-self → allowed
 * - Otherwise → returns `null`
 */
export const getContractDownloadUrl = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Verify player exists and is in same team
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      return null;
    }

    // Determine access
    if (user.role === "admin") {
      // Allowed
    } else if (user.role === "player") {
      const isSelf = await isPlayerSelf(ctx, playerId, user._id, teamId);
      if (!isSelf) return null;
    } else {
      return null;
    }

    // Fetch contract
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_teamId_playerId", (q) =>
        q.eq("teamId", teamId).eq("playerId", playerId)
      )
      .first();

    if (!contract) {
      return null;
    }

    // Generate signed URL from storage
    const url = await ctx.storage.getUrl(contract.fileId);
    return url;
  },
});
