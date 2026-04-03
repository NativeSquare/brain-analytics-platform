import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// ---------------------------------------------------------------------------
// updateExtractionResult — internal mutation (Story 6.1)
// ---------------------------------------------------------------------------

/**
 * Internal mutation used by extractContractData action to update the contract
 * record with extraction results or errors.
 *
 * Not exposed to clients — only callable from internal actions/mutations.
 */
export const updateExtractionResult = internalMutation({
  args: {
    contractId: v.id("contracts"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    extractedData: v.optional(
      v.object({
        salary: v.optional(v.string()),
        bonuses: v.optional(v.string()),
        clauses: v.optional(v.string()),
        duration: v.optional(v.string()),
        terminationTerms: v.optional(v.string()),
        governingLaw: v.optional(v.string()),
      }),
    ),
    extractionError: v.optional(v.string()),
  },
  handler: async (ctx, { contractId, status, extractedData, extractionError }) => {
    const contract = await ctx.db.get(contractId);
    if (!contract) {
      console.error(`[updateExtractionResult] Contract ${contractId} not found`);
      return;
    }

    const patch: Record<string, unknown> = {
      extractionStatus: status,
      updatedAt: Date.now(),
    };

    if (extractedData !== undefined) {
      patch.extractedData = extractedData;
    }

    if (extractionError !== undefined) {
      patch.extractionError = extractionError;
    }

    // Clear error on success
    if (status === "completed") {
      patch.extractionError = undefined;
    }

    // Clear data on failure
    if (status === "failed") {
      patch.extractedData = undefined;
    }

    await ctx.db.patch(contractId, patch);
  },
});
