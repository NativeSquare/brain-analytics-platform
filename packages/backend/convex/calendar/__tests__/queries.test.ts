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
      name: "Test User",
      email: "test@example.com",
      role: (overrides.role as any) ?? "coach",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

async function seedEvent(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  ownerId: Id<"users">,
  overrides: Partial<{
    name: string;
    eventType: string;
    startsAt: number;
    endsAt: number;
    isCancelled: boolean;
    invitedRoles: string[];
    location: string;
    description: string;
  }> = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("calendarEvents", {
      teamId,
      name: overrides.name ?? "Test Event",
      eventType: (overrides.eventType as any) ?? "training",
      startsAt: overrides.startsAt ?? new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: overrides.endsAt ?? new Date(2026, 2, 15, 12, 0).getTime(),
      location: overrides.location,
      description: overrides.description,
      ownerId,
      rsvpEnabled: false,
      isRecurring: false,
      isCancelled: overrides.isCancelled ?? false,
      invitedRoles: overrides.invitedRoles,
      createdAt: Date.now(),
    });
  });
}

// ---------------------------------------------------------------------------
// getMonthEvents
// ---------------------------------------------------------------------------

describe("getMonthEvents", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns events within the specified month only", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // March 2026 event
    await seedEvent(t, teamId, userId, {
      name: "March Event",
      startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });

    // April 2026 event — should NOT be returned
    await seedEvent(t, teamId, userId, {
      name: "April Event",
      startsAt: new Date(2026, 3, 5, 10, 0).getTime(),
      endsAt: new Date(2026, 3, 5, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getMonthEvents,
      { year: 2026, month: 3 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("March Event");
  });

  it("excludes cancelled events", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await seedEvent(t, teamId, userId, {
      name: "Active",
      startsAt: new Date(2026, 2, 10, 9, 0).getTime(),
      endsAt: new Date(2026, 2, 10, 10, 0).getTime(),
    });
    await seedEvent(t, teamId, userId, {
      name: "Cancelled",
      startsAt: new Date(2026, 2, 11, 9, 0).getTime(),
      endsAt: new Date(2026, 2, 11, 10, 0).getTime(),
      isCancelled: true,
    });

    const result = await t.query(
      (await import("../queries")).getMonthEvents,
      { year: 2026, month: 3 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Active");
  });

  it("returns events where user role is in invitedRoles", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Owner is a different user
    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
        role: "admin",
        status: "active",
        teamId,
      });
    });

    await seedEvent(t, teamId, ownerId, {
      name: "Coach Invited",
      invitedRoles: ["coach", "analyst"],
      startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });
    await seedEvent(t, teamId, ownerId, {
      name: "Player Only",
      invitedRoles: ["player"],
      startsAt: new Date(2026, 2, 16, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 16, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getMonthEvents,
      { year: 2026, month: 3 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Coach Invited");
  });

  it("returns events where user is individually invited", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
        role: "admin",
        status: "active",
        teamId,
      });
    });

    const eventId = await seedEvent(t, teamId, ownerId, {
      name: "Individual Invite",
      invitedRoles: ["coach"], // player not in roles
      startsAt: new Date(2026, 2, 20, 14, 0).getTime(),
      endsAt: new Date(2026, 2, 20, 16, 0).getTime(),
    });

    // Add individual invite for the player
    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEventUsers", {
        eventId,
        userId,
        teamId,
      });
    });

    const result = await t.query(
      (await import("../queries")).getMonthEvents,
      { year: 2026, month: 3 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Individual Invite");
  });

  it("admin sees all team events regardless of invitation", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });

    await seedEvent(t, teamId, ownerId, {
      name: "Player Only Event",
      invitedRoles: ["player"],
      startsAt: new Date(2026, 2, 22, 9, 0).getTime(),
      endsAt: new Date(2026, 2, 22, 11, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getMonthEvents,
      { year: 2026, month: 3 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Player Only Event");
  });

  it("does not return events from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create event on a different team
    const otherTeamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        name: "Other Club",
        slug: "other-club",
      });
    });
    const otherOwnerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other Owner",
        email: "other-owner@example.com",
        role: "admin",
        status: "active",
        teamId: otherTeamId,
      });
    });

    await seedEvent(t, otherTeamId, otherOwnerId, {
      name: "Other Team Event",
      startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getMonthEvents,
      { year: 2026, month: 3 },
    );

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getEventDetail
// ---------------------------------------------------------------------------

describe("getEventDetail", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns full event details for authorized user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await seedEvent(t, teamId, userId, {
      name: "Detail Event",
      eventType: "match",
      location: "Stadium A",
      description: "Important match",
      startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getEventDetail,
      { eventId },
    );

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Detail Event");
    expect(result!.eventType).toBe("match");
    expect(result!.location).toBe("Stadium A");
    expect(result!.description).toBe("Important match");
  });

  it("returns null for event from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create event on another team
    const otherTeamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        name: "Other Club",
        slug: "other-club",
      });
    });
    const otherOwnerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other Owner",
        email: "other@example.com",
        role: "admin",
        status: "active",
        teamId: otherTeamId,
      });
    });

    const eventId = await seedEvent(t, otherTeamId, otherOwnerId, {
      name: "Other Team Event",
    });

    const result = await t.query(
      (await import("../queries")).getEventDetail,
      { eventId },
    );

    expect(result).toBeNull();
  });

  it("returns owner name", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await seedEvent(t, teamId, userId, {
      name: "Owner Name Test",
    });

    const result = await t.query(
      (await import("../queries")).getEventDetail,
      { eventId },
    );

    expect(result).not.toBeNull();
    expect(result!.ownerName).toBe("Test User");
  });

  it("returns null when user role is not in invitedRoles and not individually invited", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Event created by a different user, only coaches invited
    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
        role: "admin",
        status: "active",
        teamId,
      });
    });

    const eventId = await seedEvent(t, teamId, ownerId, {
      name: "Coach Only Event",
      invitedRoles: ["coach"],
      startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getEventDetail,
      { eventId },
    );

    // Player should NOT see a coach-only event
    expect(result).toBeNull();
  });

  it("returns event when user is individually invited via calendarEventUsers", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
        role: "admin",
        status: "active",
        teamId,
      });
    });

    const eventId = await seedEvent(t, teamId, ownerId, {
      name: "Individual Invite Detail",
      invitedRoles: ["coach"], // player not in roles
      startsAt: new Date(2026, 2, 15, 14, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 16, 0).getTime(),
    });

    // Add individual invitation for the player
    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEventUsers", {
        eventId,
        userId,
        teamId,
      });
    });

    const result = await t.query(
      (await import("../queries")).getEventDetail,
      { eventId },
    );

    // Player should see the event because of individual invitation
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Individual Invite Detail");
  });
});

// ---------------------------------------------------------------------------
// getDayEvents
// ---------------------------------------------------------------------------

describe("getDayEvents", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns events for the specified day only", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const march15 = new Date(2026, 2, 15, 0, 0, 0).getTime();

    await seedEvent(t, teamId, userId, {
      name: "March 15 Event",
      startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });
    await seedEvent(t, teamId, userId, {
      name: "March 16 Event",
      startsAt: new Date(2026, 2, 16, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 16, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getDayEvents,
      { date: march15 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("March 15 Event");
  });

  it("applies same access filtering as getMonthEvents", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
        role: "admin",
        status: "active",
        teamId,
      });
    });

    const march15 = new Date(2026, 2, 15, 0, 0, 0).getTime();

    // Event where player IS invited
    await seedEvent(t, teamId, ownerId, {
      name: "Player Invited",
      invitedRoles: ["player"],
      startsAt: new Date(2026, 2, 15, 9, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 10, 0).getTime(),
    });

    // Event where player is NOT invited
    await seedEvent(t, teamId, ownerId, {
      name: "Coach Only",
      invitedRoles: ["coach"],
      startsAt: new Date(2026, 2, 15, 11, 0).getTime(),
      endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
    });

    const result = await t.query(
      (await import("../queries")).getDayEvents,
      { date: march15 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Player Invited");
  });
});
