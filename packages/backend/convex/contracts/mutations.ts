import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireRole } from "../lib/auth";

// ---------------------------------------------------------------------------
// uploadContract — Admin-only (AC4, Task 3.1)
// ---------------------------------------------------------------------------

/**
 * Upload a contract PDF for a player. Admin-only.
 *
 * Story 6.2 AC4: Players cannot upload contracts.
 * Story 6.2 Task 3.1: Uses requireRole(["admin"]) — non-admin throws NOT_AUTHORIZED.
 *
 * If a contract already exists for this player, it replaces the existing one.
 */
export const uploadContract = mutation({
  args: {
    playerId: v.id("players"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, { playerId, fileId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    // Verify player exists and belongs to same team
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player not found.",
      });
    }

    // Check for existing contract
    const existing = await ctx.db
      .query("contracts")
      .withIndex("by_teamId_playerId", (q) =>
        q.eq("teamId", teamId).eq("playerId", playerId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Delete old PDF from storage to prevent orphaned files
      await ctx.storage.delete(existing.fileId);

      // Replace existing contract
      await ctx.db.patch(existing._id, {
        fileId,
        extractionStatus: "pending",
        extractedData: undefined,
        extractionError: undefined,
        updatedAt: now,
      });

      // Schedule AI extraction
      await ctx.scheduler.runAfter(
        0,
        internal.contracts.actions.extractContractData,
        { contractId: existing._id },
      );

      return existing._id;
    }

    // Create new contract
    const contractId = await ctx.db.insert("contracts", {
      teamId,
      playerId,
      fileId,
      extractionStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule AI extraction
    await ctx.scheduler.runAfter(
      0,
      internal.contracts.actions.extractContractData,
      { contractId },
    );

    return contractId;
  },
});

// ---------------------------------------------------------------------------
// updateContractFields — Admin-only (AC4, Task 3.2)
// ---------------------------------------------------------------------------

/**
 * Update extracted contract fields manually. Admin-only.
 *
 * Story 6.2 AC4: Players cannot edit contract fields.
 * Story 6.2 Task 3.2: Uses requireRole(["admin"]) — non-admin throws NOT_AUTHORIZED.
 */
export const updateContractFields = mutation({
  args: {
    playerId: v.id("players"),
    extractedData: v.object({
      salary: v.optional(v.string()),
      bonuses: v.optional(v.string()),
      clauses: v.optional(v.string()),
      duration: v.optional(v.string()),
      terminationTerms: v.optional(v.string()),
      governingLaw: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { playerId, extractedData }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    // Verify player exists and belongs to same team
    const player = await ctx.db.get(playerId);
    if (!player || player.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Player not found.",
      });
    }

    // Find contract
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_teamId_playerId", (q) =>
        q.eq("teamId", teamId).eq("playerId", playerId)
      )
      .first();

    if (!contract) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "No contract found for this player.",
      });
    }

    await ctx.db.patch(contract._id, {
      extractedData,
      updatedAt: Date.now(),
    });

    return contract._id;
  },
});
