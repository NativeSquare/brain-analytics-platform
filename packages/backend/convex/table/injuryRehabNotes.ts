import { defineTable } from "convex/server";
import { v } from "convex/values";

export const injuryRehabNotes = defineTable({
  teamId: v.id("teams"),
  injuryId: v.id("playerInjuries"),
  authorId: v.id("users"),
  note: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_injuryId", ["injuryId"])
  .index("by_teamId", ["teamId"]);
