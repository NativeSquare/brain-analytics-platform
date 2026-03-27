import { defineTable } from "convex/server";
import { v } from "convex/values";

const documentSchema = {
  email: v.string(),
  name: v.string(),
  role: v.union(
    v.literal("admin"),
    v.literal("coach"),
    v.literal("analyst"),
    v.literal("physio"),
    v.literal("player"),
    v.literal("staff"),
  ),
  token: v.string(),
  teamId: v.id("teams"),
  invitedBy: v.id("users"),
  expiresAt: v.number(),
  acceptedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
};

export const invitations = defineTable(documentSchema)
  .index("by_token", ["token"])
  .index("by_email", ["email"])
  .index("by_teamId", ["teamId"])
  .index("by_teamId_status", ["teamId", "acceptedAt"]);
