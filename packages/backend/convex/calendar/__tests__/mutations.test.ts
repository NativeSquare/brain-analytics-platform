import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Mock getAuthUserId
// ---------------------------------------------------------------------------

const { mockGetAuthUserId } = vi.hoisted(() => {
  return { mockGetAuthUserId: vi.fn() };
});

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getAuthUserId: mockGetAuthUserId };
});

const { default: schema } = await import("../../schema");
const modules = import.meta.glob("../../**/*.ts");

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
  name?: string;
  email?: string;
}

async function seedTeamAndUser(
  t: ReturnType<typeof convexTest>,
  overrides: SeedOptions = {},
) {
  return await t.run(async (ctx) => {
    const teamId =
      overrides.teamId ??
      (await ctx.db.insert("teams", { name: "Test Club", slug: "test-club" }));

    const userId = await ctx.db.insert("users", {
      name: overrides.name ?? "Admin User",
      email: overrides.email ?? "admin@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

function defaultEventArgs(overrides: Record<string, any> = {}) {
  return {
    name: "Sprint Review",
    eventType: "meeting" as const,
    startsAt: new Date(2026, 2, 20, 10, 0).getTime(),
    endsAt: new Date(2026, 2, 20, 11, 0).getTime(),
    rsvpEnabled: true,
    invitedRoles: ["coach", "player"],
    invitedUserIds: [] as Id<"users">[],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

describe("createEvent", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("creates an event with correct fields for an admin user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs(),
    );

    expect(eventId).toBeTruthy();

    // Verify the document in DB
    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(event).not.toBeNull();
    expect(event!.name).toBe("Sprint Review");
    expect(event!.eventType).toBe("meeting");
    expect(event!.teamId).toBe(teamId);
    expect(event!.ownerId).toBe(userId);
    expect(event!.isRecurring).toBe(false);
    expect(event!.isCancelled).toBe(false);
    expect(event!.rsvpEnabled).toBe(true);
    expect(event!.invitedRoles).toEqual(["coach", "player"]);
    expect(event!.createdAt).toBeGreaterThan(0);
  });

  it("rejects non-admin users with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createEvent,
        defaultEventArgs(),
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_AUTHORIZED");
  });

  it("rejects when endsAt <= startsAt with VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const badArgs = defaultEventArgs({
      startsAt: new Date(2026, 2, 20, 11, 0).getTime(),
      endsAt: new Date(2026, 2, 20, 10, 0).getTime(), // before start
    });

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createEvent,
        badArgs,
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("VALIDATION_ERROR");
  });

  it("inserts calendarEventUsers for individually invited users", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create two additional users to invite
    const [user2, user3] = await t.run(async (ctx) => {
      const u2 = await ctx.db.insert("users", {
        name: "Player A",
        email: "playera@example.com",
        role: "player",
        status: "active",
        teamId,
      });
      const u3 = await ctx.db.insert("users", {
        name: "Player B",
        email: "playerb@example.com",
        role: "player",
        status: "active",
        teamId,
      });
      return [u2, u3];
    });

    const eventId = await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs({
        invitedRoles: [],
        invitedUserIds: [user2, user3],
      }),
    );

    // Verify calendarEventUsers records
    const invites = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEventUsers")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
    );

    expect(invites).toHaveLength(2);
    const invitedIds = invites.map((i) => i.userId).sort();
    expect(invitedIds).toEqual([user2, user3].sort());
  });

  it("creates notifications for invited users (role-based) but not the admin creator", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin Creator",
      email: "admin@example.com",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    // Create a coach who should get notified
    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach Smith",
        email: "coach@example.com",
        role: "coach",
        status: "active",
        teamId,
      }),
    );

    await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs({
        invitedRoles: ["coach"],
        invitedUserIds: [],
      }),
    );

    // Verify notifications
    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );

    // Coach should have a notification
    const coachNotif = notifications.filter((n) => n.userId === coachId);
    expect(coachNotif).toHaveLength(1);
    expect(coachNotif[0].type).toBe("event_created");
    expect(coachNotif[0].title).toContain("Sprint Review");

    // Admin creator should NOT have a notification
    const adminNotif = notifications.filter((n) => n.userId === adminId);
    expect(adminNotif).toHaveLength(0);
  });

  it("creates notifications for individually invited users", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player X",
        email: "playerx@example.com",
        role: "player",
        status: "active",
        teamId,
      }),
    );

    await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs({
        invitedRoles: [],
        invitedUserIds: [playerId],
      }),
    );

    const notifications = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId", (q) => q.eq("userId", playerId))
        .collect(),
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("event_created");
  });

  it("deduplicates notifications for users invited both by role and individually", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    // Create a coach who is both role-invited and individually invited
    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach Dup",
        email: "coach-dup@example.com",
        role: "coach",
        status: "active",
        teamId,
      }),
    );

    await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs({
        invitedRoles: ["coach"],
        invitedUserIds: [coachId], // same coach individually
      }),
    );

    const notifications = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId", (q) => q.eq("userId", coachId))
        .collect(),
    );

    // Should only receive ONE notification despite being invited twice
    expect(notifications).toHaveLength(1);
  });

  it("sets teamId from auth context, not from client input", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs(),
    );

    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(event!.teamId).toBe(teamId);
  });
});

// ---------------------------------------------------------------------------
// Recurring event helpers
// ---------------------------------------------------------------------------

function defaultRecurringArgs(overrides: Record<string, any> = {}) {
  return {
    name: "Weekly Standup",
    eventType: "meeting" as const,
    startsAt: new Date(2026, 5, 1, 10, 0).getTime(), // Jun 1 10:00 (no DST issues)
    endsAt: new Date(2026, 5, 1, 11, 0).getTime(), // Jun 1 11:00
    rsvpEnabled: true,
    invitedRoles: ["coach", "player"],
    invitedUserIds: [] as Id<"users">[],
    frequency: "weekly" as const,
    endDate: new Date(2026, 5, 22, 23, 59).getTime(), // Jun 22 23:59 → 4 weeks
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createRecurringEvent
// ---------------------------------------------------------------------------

describe("createRecurringEvent", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("creates a series and correct number of weekly occurrences", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs(),
    );

    expect(result.seriesId).toBeTruthy();
    // Jun 1, 8, 15, 22 = 4 occurrences
    expect(result.eventCount).toBe(4);

    // Verify series record
    const series = await t.run(async (ctx) => ctx.db.get(result.seriesId));
    expect(series).not.toBeNull();
    expect(series!.frequency).toBe("weekly");
    expect(series!.teamId).toBe(teamId);

    // Verify all events
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_seriesId", (q) => q.eq("seriesId", result.seriesId))
        .collect(),
    );
    expect(events).toHaveLength(4);

    for (const event of events) {
      expect(event.isRecurring).toBe(true);
      expect(event.seriesId).toBe(result.seriesId);
      expect(event.teamId).toBe(teamId);
      expect(event.name).toBe("Weekly Standup");
    }

    // Verify dates are 7 days apart (check calendar dates, not raw ms due to DST)
    const sortedEvents = events.sort((a, b) => a.startsAt - b.startsAt);
    const dates = sortedEvents.map((e) => new Date(e.startsAt).getDate());
    expect(dates).toEqual([1, 8, 15, 22]);

    // Verify duration preserved (1 hour each)
    for (const event of events) {
      expect(event.endsAt - event.startsAt).toBe(60 * 60 * 1000);
    }
  });

  it("rejects non-admin with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createRecurringEvent,
        defaultRecurringArgs(),
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_AUTHORIZED");
  });

  it("rejects endDate <= startsAt", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createRecurringEvent,
        defaultRecurringArgs({
          endDate: new Date(2026, 5, 1, 9, 0).getTime(), // before startsAt
        }),
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("VALIDATION_ERROR");
    expect(errData.message).toContain("Series end date");
  });

  it("rejects endDate more than 365 days from startsAt", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createRecurringEvent,
        defaultRecurringArgs({
          endDate: new Date(2028, 0, 1).getTime(), // way more than 1 year
        }),
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("VALIDATION_ERROR");
    expect(errData.message).toContain("1 year");
  });

  it("rejects endsAt <= startsAt", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).createRecurringEvent,
        defaultRecurringArgs({
          startsAt: new Date(2026, 5, 1, 11, 0).getTime(),
          endsAt: new Date(2026, 5, 1, 10, 0).getTime(), // before start
        }),
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("VALIDATION_ERROR");
    expect(errData.message).toContain("End time");
  });

  it("creates notifications for invited users and excludes admin", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const coachId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach",
        status: "active",
        teamId,
      }),
    );

    await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs({
        invitedRoles: ["coach"],
        invitedUserIds: [],
      }),
    );

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );

    // Coach gets 1 notification (for the entire series, not per occurrence)
    const coachNotifs = notifications.filter((n) => n.userId === coachId);
    expect(coachNotifs).toHaveLength(1);
    expect(coachNotifs[0].type).toBe("event_created");
    expect(coachNotifs[0].title).toContain("Recurring");

    // Admin creator should NOT get notified
    const adminNotifs = notifications.filter((n) => n.userId === adminId);
    expect(adminNotifs).toHaveLength(0);
  });

  it("sets correct teamId on series and all events", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs(),
    );

    const series = await t.run(async (ctx) => ctx.db.get(result.seriesId));
    expect(series!.teamId).toBe(teamId);

    const events = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_seriesId", (q) => q.eq("seriesId", result.seriesId))
        .collect(),
    );
    for (const event of events) {
      expect(event.teamId).toBe(teamId);
    }
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------

describe("updateEvent", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("updates a recurring occurrence and sets isModified", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create recurring events
    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs(),
    );

    // Get all events in the series
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_seriesId", (q) => q.eq("seriesId", result.seriesId))
        .collect(),
    );
    const firstEvent = events.sort((a, b) => a.startsAt - b.startsAt)[0];
    const secondEvent = events.sort((a, b) => a.startsAt - b.startsAt)[1];

    // Update first event's name
    await t.mutation(
      (await import("../mutations")).updateEvent,
      {
        eventId: firstEvent._id,
        name: "Renamed Standup",
      },
    );

    // Verify first event is updated
    const updated = await t.run(async (ctx) => ctx.db.get(firstEvent._id));
    expect(updated!.name).toBe("Renamed Standup");
    expect(updated!.isModified).toBe(true);

    // Verify second event is unchanged
    const unchanged = await t.run(async (ctx) => ctx.db.get(secondEvent._id));
    expect(unchanged!.name).toBe("Weekly Standup");
    expect(unchanged!.isModified).toBeUndefined();
  });

  it("rejects non-admin with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    // Create event as admin
    const eventId = await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs(),
    );

    // Switch to player
    const { userId: playerId } = await seedTeamAndUser(t, {
      role: "player",
      teamId,
      email: "player@example.com",
    });
    mockGetAuthUserId.mockResolvedValue(playerId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).updateEvent,
        { eventId, name: "Hacked" },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_AUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// cancelEvent
// ---------------------------------------------------------------------------

describe("cancelEvent", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("cancels a single occurrence without affecting others", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs(),
    );

    const events = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_seriesId", (q) => q.eq("seriesId", result.seriesId))
        .collect(),
    );
    const targetEvent = events[0];

    // Cancel the first occurrence
    await t.mutation(
      (await import("../mutations")).cancelEvent,
      { eventId: targetEvent._id },
    );

    // Verify the target is cancelled
    const cancelled = await t.run(async (ctx) => ctx.db.get(targetEvent._id));
    expect(cancelled!.isCancelled).toBe(true);

    // Verify other events are NOT cancelled
    for (const event of events.slice(1)) {
      const e = await t.run(async (ctx) => ctx.db.get(event._id));
      expect(e!.isCancelled).toBe(false);
    }
  });

  it("rejects cancelling an already cancelled event", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await t.mutation(
      (await import("../mutations")).createEvent,
      defaultEventArgs(),
    );

    // Cancel once
    await t.mutation(
      (await import("../mutations")).cancelEvent,
      { eventId },
    );

    // Try cancelling again
    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).cancelEvent,
        { eventId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("VALIDATION_ERROR");
    expect(errData.message).toContain("already cancelled");
  });
});

// ---------------------------------------------------------------------------
// deleteEventSeries
// ---------------------------------------------------------------------------

describe("deleteEventSeries", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("deletes all events, invitations, and the series record", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create a player to invite individually
    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Player",
        email: "player@example.com",
        role: "player",
        status: "active",
        teamId,
      }),
    );

    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs({
        invitedUserIds: [playerId],
      }),
    );

    expect(result.eventCount).toBe(4);

    // Delete the entire series
    const deleteResult = await t.mutation(
      (await import("../mutations")).deleteEventSeries,
      { seriesId: result.seriesId },
    );

    expect(deleteResult.deletedCount).toBe(4);

    // Verify series is deleted
    const series = await t.run(async (ctx) => ctx.db.get(result.seriesId));
    expect(series).toBeNull();

    // Verify all events are deleted
    const remainingEvents = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_seriesId", (q) => q.eq("seriesId", result.seriesId))
        .collect(),
    );
    expect(remainingEvents).toHaveLength(0);

    // Verify all calendarEventUsers are deleted
    const remainingInvites = await t.run(async (ctx) =>
      ctx.db.query("calendarEventUsers").collect(),
    );
    expect(remainingInvites).toHaveLength(0);
  });

  it("rejects non-admin with NOT_AUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });
    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs(),
    );

    // Switch to player
    const { userId: playerId } = await seedTeamAndUser(t, {
      role: "player",
      teamId,
      email: "player@example.com",
    });
    mockGetAuthUserId.mockResolvedValue(playerId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).deleteEventSeries,
        { seriesId: result.seriesId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_AUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// getSeriesInfo
// ---------------------------------------------------------------------------

describe("getSeriesInfo", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns correct occurrence count and series metadata", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.mutation(
      (await import("../mutations")).createRecurringEvent,
      defaultRecurringArgs(),
    );

    const seriesInfo = await t.query(
      (await import("../queries")).getSeriesInfo,
      { seriesId: result.seriesId },
    );

    expect(seriesInfo).not.toBeNull();
    expect(seriesInfo!.series.frequency).toBe("weekly");
    expect(seriesInfo!.totalOccurrences).toBe(4);
    expect(seriesInfo!.activeOccurrences).toBe(4);

    // Cancel one occurrence
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_seriesId", (q) => q.eq("seriesId", result.seriesId))
        .collect(),
    );

    await t.mutation(
      (await import("../mutations")).cancelEvent,
      { eventId: events[0]._id },
    );

    const updatedInfo = await t.query(
      (await import("../queries")).getSeriesInfo,
      { seriesId: result.seriesId },
    );

    expect(updatedInfo!.totalOccurrences).toBe(4);
    expect(updatedInfo!.activeOccurrences).toBe(3);
  });
});
