import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Contracts table — stores player contract PDFs and AI-extracted data.
 *
 * Created by Story 6.1, secured by Story 6.2.
 * Access: admin (full CRUD), player-self (read-only own contract).
 */
export const contracts = defineTable({
  teamId: v.id("teams"),
  playerId: v.id("players"),
  fileId: v.id("_storage"),
  extractionStatus: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  extractedData: v.optional(
    v.object({
      salary: v.optional(v.string()),
      bonuses: v.optional(v.string()),
      clauses: v.optional(v.string()),
      duration: v.optional(v.string()),
      terminationTerms: v.optional(v.string()),
      governingLaw: v.optional(v.string()),
    })
  ),
  extractionError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_teamId", ["teamId"])
  .index("by_teamId_playerId", ["teamId", "playerId"]);
