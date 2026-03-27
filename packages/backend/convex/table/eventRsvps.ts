import { defineTable } from "convex/server";
import { v } from "convex/values";

export const eventRsvps = defineTable({
  eventId: v.id("calendarEvents"),
  userId: v.id("users"),
  teamId: v.id("teams"),
  status: v.union(v.literal("attending"), v.literal("not_attending")),
  reason: v.optional(v.string()),
  respondedAt: v.number(),
})
  .index("by_eventId", ["eventId"])
  .index("by_userId_eventId", ["userId", "eventId"])
  .index("by_teamId", ["teamId"]);
