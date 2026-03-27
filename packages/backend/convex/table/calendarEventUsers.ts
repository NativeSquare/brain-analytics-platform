import { defineTable } from "convex/server";
import { v } from "convex/values";

export const calendarEventUsers = defineTable({
  eventId: v.id("calendarEvents"),
  userId: v.id("users"),
  teamId: v.id("teams"),
})
  .index("by_eventId", ["eventId"])
  .index("by_userId", ["userId"])
  .index("by_userId_teamId", ["userId", "teamId"]);
