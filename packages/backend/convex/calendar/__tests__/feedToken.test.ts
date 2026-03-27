import { convexTest } from "convex-test";
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
  calendarFeedToken?: string;
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
      calendarFeedToken: overrides.calendarFeedToken,
    });

    return { userId, teamId };
  });
}

async function seedEvent(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  ownerId: Id<"users">,
  overrides: Record<string, any> = {},
) {
  return await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      name: overrides.name ?? "Training Session",
      eventType: overrides.eventType ?? "training",
      startsAt: overrides.startsAt ?? Date.UTC(2026, 2, 20, 10, 0, 0),
      endsAt: overrides.endsAt ?? Date.UTC(2026, 2, 20, 11, 0, 0),
      ownerId,
      rsvpEnabled: false,
      isRecurring: false,
      isCancelled: overrides.isCancelled ?? false,
      invitedRoles: overrides.invitedRoles ?? ["admin", "coach", "player"],
      createdAt: Date.now(),
      ...overrides,
    });
    return eventId;
  });
}

// ---------------------------------------------------------------------------
// generateFeedToken
// ---------------------------------------------------------------------------

describe("generateFeedToken", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("generates a UUID token on first call", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const token = await t.mutation(
      (await import("../mutations")).generateFeedToken,
      {},
    );

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    // UUID v4 format check
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns the same token on subsequent calls (idempotent)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const mutations = await import("../mutations");
    const token1 = await t.mutation(mutations.generateFeedToken, {});
    const token2 = await t.mutation(mutations.generateFeedToken, {});

    expect(token1).toBe(token2);
  });

  it("returns existing token if user already has one", async () => {
    const t = convexTest(schema, modules);
    const existingToken = "pre-existing-token-123";
    const { userId } = await seedTeamAndUser(t, {
      calendarFeedToken: existingToken,
    });
    mockGetAuthUserId.mockResolvedValue(userId);

    const token = await t.mutation(
      (await import("../mutations")).generateFeedToken,
      {},
    );

    expect(token).toBe(existingToken);
  });
});

// ---------------------------------------------------------------------------
// regenerateFeedToken
// ---------------------------------------------------------------------------

describe("regenerateFeedToken", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("produces a new distinct token", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const mutations = await import("../mutations");
    const token1 = await t.mutation(mutations.generateFeedToken, {});
    const token2 = await t.mutation(mutations.regenerateFeedToken, {});

    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2);
  });

  it("replaces the existing token in DB", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const mutations = await import("../mutations");
    await t.mutation(mutations.generateFeedToken, {});
    const newToken = await t.mutation(mutations.regenerateFeedToken, {});

    // Verify in DB
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.calendarFeedToken).toBe(newToken);
  });
});

// ---------------------------------------------------------------------------
// getFeedToken
// ---------------------------------------------------------------------------

describe("getFeedToken", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns null when no token exists", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const token = await t.query(
      (await import("../queries")).getFeedToken,
      {},
    );

    expect(token).toBeNull();
  });

  it("returns the token when one exists", async () => {
    const t = convexTest(schema, modules);
    const existingToken = "my-feed-token-456";
    const { userId } = await seedTeamAndUser(t, {
      calendarFeedToken: existingToken,
    });
    mockGetAuthUserId.mockResolvedValue(userId);

    const token = await t.query(
      (await import("../queries")).getFeedToken,
      {},
    );

    expect(token).toBe(existingToken);
  });
});

// ---------------------------------------------------------------------------
// Internal queries (getUserByFeedToken, getFeedEvents)
// ---------------------------------------------------------------------------

describe("getUserByFeedToken", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("finds user by valid token", async () => {
    const t = convexTest(schema, modules);
    const token = "valid-token-789";
    const { userId } = await seedTeamAndUser(t, {
      calendarFeedToken: token,
    });

    const internalQueries = await import("../internalQueries");
    const user = await t.query(internalQueries.getUserByFeedToken, {
      token,
    });

    expect(user).not.toBeNull();
    expect(user!._id).toBe(userId);
  });

  it("returns null for invalid token", async () => {
    const t = convexTest(schema, modules);
    await seedTeamAndUser(t, { calendarFeedToken: "real-token" });

    const internalQueries = await import("../internalQueries");
    const user = await t.query(internalQueries.getUserByFeedToken, {
      token: "invalid-token",
    });

    expect(user).toBeNull();
  });
});

describe("getFeedEvents", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns non-cancelled events the user can access by role", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });

    // Event that invites coaches
    await seedEvent(t, teamId, userId, {
      name: "Coach Training",
      invitedRoles: ["coach"],
    });

    // Event that doesn't invite coaches
    await seedEvent(t, teamId, userId, {
      name: "Player Only",
      invitedRoles: ["player"],
    });

    const internalQueries = await import("../internalQueries");
    const result = await t.query(internalQueries.getFeedEvents, {
      userId,
    });

    expect(result.teamName).toBe("Test Club");
    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe("Coach Training");
  });

  it("returns events the user is individually invited to", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t, {
      role: "admin",
    });
    const { userId: playerId } = await seedTeamAndUser(t, {
      role: "player",
      teamId,
      name: "Player",
      email: "player@example.com",
    });

    // Event with no role invite for players
    const eventId = await seedEvent(t, teamId, adminId, {
      name: "Special Meeting",
      invitedRoles: [],
    });

    // Individually invite the player
    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEventUsers", {
        eventId,
        userId: playerId,
        teamId,
      });
    });

    const internalQueries = await import("../internalQueries");
    const result = await t.query(internalQueries.getFeedEvents, {
      userId: playerId,
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe("Special Meeting");
  });

  it("excludes cancelled events", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });

    await seedEvent(t, teamId, userId, { name: "Active Event" });
    await seedEvent(t, teamId, userId, {
      name: "Cancelled Event",
      isCancelled: true,
    });

    const internalQueries = await import("../internalQueries");
    const result = await t.query(internalQueries.getFeedEvents, {
      userId,
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe("Active Event");
  });

  it("enforces team isolation - only returns events from user's team", async () => {
    const t = convexTest(schema, modules);
    const { userId: user1, teamId: team1 } = await seedTeamAndUser(t, {
      role: "admin",
      name: "User A",
      email: "a@test.com",
    });

    // Create second team
    const { teamId: team2 } = await seedTeamAndUser(t, {
      role: "admin",
      name: "User B",
      email: "b@test.com",
    });

    // Events in different teams
    await seedEvent(t, team1, user1, { name: "Team 1 Event" });
    await seedEvent(t, team2, user1, { name: "Team 2 Event" });

    const internalQueries = await import("../internalQueries");
    const result = await t.query(internalQueries.getFeedEvents, {
      userId: user1,
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe("Team 1 Event");
  });

  it("admin sees all team events regardless of invitedRoles", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });

    await seedEvent(t, teamId, userId, {
      name: "Player Training",
      invitedRoles: ["player"],
    });
    await seedEvent(t, teamId, userId, {
      name: "Physio Session",
      invitedRoles: ["physio"],
    });

    const internalQueries = await import("../internalQueries");
    const result = await t.query(internalQueries.getFeedEvents, {
      userId,
    });

    expect(result.events).toHaveLength(2);
  });
});
