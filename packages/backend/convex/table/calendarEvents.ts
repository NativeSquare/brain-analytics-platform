import { defineTable } from "convex/server";
import { v } from "convex/values";

export const calendarEvents = defineTable({
  teamId: v.id("teams"),
  name: v.string(),
  eventType: v.union(
    v.literal("match"),
    v.literal("training"),
    v.literal("meeting"),
    v.literal("rehab"),
  ),
  startsAt: v.number(),
  endsAt: v.number(),
  location: v.optional(v.string()),
  description: v.optional(v.string()),
  ownerId: v.id("users"),
  rsvpEnabled: v.boolean(),
  isRecurring: v.boolean(),
  seriesId: v.optional(v.id("calendarEventSeries")),
  isCancelled: v.boolean(),
  isModified: v.optional(v.boolean()),
  invitedRoles: v.optional(v.array(v.string())),
  createdAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_teamId_startsAt", ["teamId", "startsAt"])
  .index("by_seriesId", ["seriesId"]);
