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
