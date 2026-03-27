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
const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

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
    rsvpEnabled: boolean;
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
      rsvpEnabled: overrides.rsvpEnabled ?? false,
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

// ---------------------------------------------------------------------------
// getUserEventRsvp
// ---------------------------------------------------------------------------

describe("getUserEventRsvp", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns the current user's RSVP record", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await seedEvent(t, teamId, userId, {
      name: "RSVP Test",
      invitedRoles: ["coach"],
    });

    // Insert an RSVP record directly
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId,
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
    });

    const result = await t.query(
      (await import("../queries")).getUserEventRsvp,
      { eventId },
    );

    expect(result).not.toBeNull();
    expect(result!.status).toBe("attending");
    expect(result!.respondedAt).toBeGreaterThan(0);
  });

  it("returns null when user has not responded", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await seedEvent(t, teamId, userId, {
      name: "No RSVP Event",
      invitedRoles: ["coach"],
    });

    const result = await t.query(
      (await import("../queries")).getUserEventRsvp,
      { eventId },
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getEventRsvps
// ---------------------------------------------------------------------------

describe("getEventRsvps", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin sees full response list with user details and summary counts", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

    // Create two players
    const [player1Id, player2Id] = await t.run(async (ctx) => {
      const p1 = await ctx.db.insert("users", {
        name: "Player One",
        fullName: "Player One",
        email: "p1@example.com",
        role: "player",
        status: "active",
        teamId,
      });
      const p2 = await ctx.db.insert("users", {
        name: "Player Two",
        fullName: "Player Two",
        email: "p2@example.com",
        role: "player",
        status: "active",
        teamId,
      });
      return [p1, p2];
    });

    // Create RSVP-enabled event inviting players
    const eventId = await t.run(async (ctx) =>
      ctx.db.insert("calendarEvents", {
        teamId,
        name: "Team Meeting",
        eventType: "meeting",
        startsAt: new Date(2026, 2, 15, 10, 0).getTime(),
        endsAt: new Date(2026, 2, 15, 12, 0).getTime(),
        ownerId: adminId,
        rsvpEnabled: true,
        isRecurring: false,
        isCancelled: false,
        invitedRoles: ["player"],
        createdAt: Date.now(),
      }),
    );

    // Player 1 attends, Player 2 not attending
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId: player1Id,
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId: player2Id,
        teamId,
        status: "not_attending",
        reason: "Away",
        respondedAt: Date.now(),
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.query(
      (await import("../queries")).getEventRsvps,
      { eventId },
    );

    expect(result).not.toBeNull();
    expect(result.summary.attending).toBe(1);
    expect(result.summary.notAttending).toBe(1);
    // Admin is also invited (admin role) so total invited should include admin + 2 players
    // Pending = total - attending - notAttending
    expect(result.summary.pending).toBeGreaterThanOrEqual(0);

    // Admin should see responses array
    expect("responses" in result).toBe(true);
    const responses = (result as any).responses;
    expect(responses).toHaveLength(2);

    const attendingResp = responses.find(
      (r: any) => r.status === "attending",
    );
    expect(attendingResp).toBeDefined();
    expect(attendingResp.fullName).toBe("Player One");

    const notAttendingResp = responses.find(
      (r: any) => r.status === "not_attending",
    );
    expect(notAttendingResp).toBeDefined();
    expect(notAttendingResp.reason).toBe("Away");
  });

  it("non-admin sees only own RSVP and summary counts (no individual user data)", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

    // Create coach and player
    const [coachId, playerId] = await t.run(async (ctx) => {
      const c = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach-q@example.com",
        role: "coach",
        status: "active",
        teamId,
      });
      const p = await ctx.db.insert("users", {
        name: "Player",
        email: "player-q@example.com",
        role: "player",
        status: "active",
        teamId,
      });
      return [c, p];
    });

    const eventId = await t.run(async (ctx) =>
      ctx.db.insert("calendarEvents", {
        teamId,
        name: "Coach Check",
        eventType: "training",
        startsAt: new Date(2026, 2, 20, 10, 0).getTime(),
        endsAt: new Date(2026, 2, 20, 12, 0).getTime(),
        ownerId: adminId,
        rsvpEnabled: true,
        isRecurring: false,
        isCancelled: false,
        invitedRoles: ["coach", "player"],
        createdAt: Date.now(),
      }),
    );

    // Coach responds attending
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId: coachId,
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
    });

    // Query as coach (non-admin)
    mockGetAuthUserId.mockResolvedValue(coachId);

    const result = await t.query(
      (await import("../queries")).getEventRsvps,
      { eventId },
    );

    expect(result.summary.attending).toBe(1);
    // Non-admin should NOT see responses array
    expect("responses" in result).toBe(false);
    // Should see own RSVP
    expect("myRsvp" in result).toBe(true);
    expect((result as any).myRsvp).not.toBeNull();
    expect((result as any).myRsvp.status).toBe("attending");
  });

  it("summary counts are accurate with multiple users", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });

    // Create 5 players
    const playerIds = await t.run(async (ctx) => {
      const ids: Id<"users">[] = [];
      for (let i = 1; i <= 5; i++) {
        const id = await ctx.db.insert("users", {
          name: `Player ${i}`,
          fullName: `Player ${i}`,
          email: `player${i}@example.com`,
          role: "player",
          status: "active",
          teamId,
        });
        ids.push(id);
      }
      return ids;
    });

    const eventId = await t.run(async (ctx) =>
      ctx.db.insert("calendarEvents", {
        teamId,
        name: "Full Count Event",
        eventType: "training",
        startsAt: new Date(2026, 2, 25, 10, 0).getTime(),
        endsAt: new Date(2026, 2, 25, 12, 0).getTime(),
        ownerId: adminId,
        rsvpEnabled: true,
        isRecurring: false,
        isCancelled: false,
        invitedRoles: ["player"],
        createdAt: Date.now(),
      }),
    );

    // 2 attending, 1 not attending, 2 pending
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId: playerIds[0],
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId: playerIds[1],
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
      await ctx.db.insert("eventRsvps", {
        eventId,
        userId: playerIds[2],
        teamId,
        status: "not_attending",
        reason: "Injured",
        respondedAt: Date.now(),
      });
      // playerIds[3] and playerIds[4] are pending (no RSVP)
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    const result = await t.query(
      (await import("../queries")).getEventRsvps,
      { eventId },
    );

    expect(result.summary.attending).toBe(2);
    expect(result.summary.notAttending).toBe(1);
    // 5 players invited, admin also has access but total invited = 5 players
    // pending = 5 - 2 - 1 = 2
    expect(result.summary.pending).toBe(2);

    // Verify pending users list
    const pending = (result as any).pending;
    expect(pending).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getUserRsvpsByEventIds (batch query for calendar view)
// ---------------------------------------------------------------------------

describe("getUserRsvpsByEventIds", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns a map of eventId → status for events the user has RSVPed to", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create two events
    const event1Id = await seedEvent(t, teamId, userId, {
      name: "Event 1",
      rsvpEnabled: true,
      invitedRoles: ["coach"],
    });
    const event2Id = await seedEvent(t, teamId, userId, {
      name: "Event 2",
      rsvpEnabled: true,
      invitedRoles: ["coach"],
      startsAt: new Date(2026, 2, 16, 10, 0).getTime(),
      endsAt: new Date(2026, 2, 16, 12, 0).getTime(),
    });

    // RSVP to event 1 only
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRsvps", {
        eventId: event1Id,
        userId,
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
    });

    const result = await t.query(
      (await import("../queries")).getUserRsvpsByEventIds,
      { eventIds: [event1Id, event2Id] },
    );

    // Event 1 should have status, Event 2 should not be in the map
    expect(result[event1Id as string]).toBe("attending");
    expect(result[event2Id as string]).toBeUndefined();
  });

  it("returns empty map when user has no RSVPs", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const eventId = await seedEvent(t, teamId, userId, {
      name: "No RSVP Event",
      rsvpEnabled: true,
      invitedRoles: ["coach"],
    });

    const result = await t.query(
      (await import("../queries")).getUserRsvpsByEventIds,
      { eventIds: [eventId] },
    );

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("excludes events from other teams (team isolation)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create event on user's team with RSVP
    const ownEventId = await seedEvent(t, teamId, userId, {
      name: "Own Team Event",
      rsvpEnabled: true,
      invitedRoles: ["coach"],
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRsvps", {
        eventId: ownEventId,
        userId,
        teamId,
        status: "attending",
        respondedAt: Date.now(),
      });
    });

    // Create event on other team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );
    const otherOwnerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other Owner",
        email: "other@example.com",
        role: "admin",
        status: "active",
        teamId: otherTeamId,
      }),
    );
    const otherEventId = await seedEvent(t, otherTeamId, otherOwnerId, {
      name: "Other Team Event",
      rsvpEnabled: true,
      invitedRoles: ["coach"],
    });

    const result = await t.query(
      (await import("../queries")).getUserRsvpsByEventIds,
      { eventIds: [ownEventId, otherEventId] },
    );

    // Only own team event should be in results
    expect(result[ownEventId as string]).toBe("attending");
    expect(result[otherEventId as string]).toBeUndefined();
  });
});
