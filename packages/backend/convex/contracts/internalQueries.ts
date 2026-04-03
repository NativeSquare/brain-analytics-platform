import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

// ---------------------------------------------------------------------------
// getContractById — internal query for use by actions (Story 6.1)
// ---------------------------------------------------------------------------

/**
 * Fetch a contract by its ID. Internal-only — no auth checks.
 * Used by extractContractData action to get the fileId.
 */
export const getContractById = internalQuery({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, { contractId }) => {
    return await ctx.db.get(contractId);
  },
});
