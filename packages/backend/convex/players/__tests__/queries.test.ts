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
// Helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
  name?: string;
  email?: string;
}

async function seedTeamAndUser(
  t: ReturnType<typeof convexTest>,
  overrides: SeedOptions = {}
) {
  return await t.run(async (ctx) => {
    const teamId =
      overrides.teamId ??
      (await ctx.db.insert("teams", { name: "Test Club", slug: "test-club" }));

    const userId = await ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "user@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

interface PlayerInsert {
  teamId: Id<"teams">;
  firstName: string;
  lastName: string;
  position: string;
  status: string;
  squadNumber?: number;
  nationality?: string;
  photo?: string;
  userId?: Id<"users">;
  [key: string]: any;
}

async function insertPlayer(
  t: ReturnType<typeof convexTest>,
  data: PlayerInsert
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("players", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  });
}

// ---------------------------------------------------------------------------
// getPlayers
// ---------------------------------------------------------------------------

describe("getPlayers", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns all players for the team when no filters applied", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
      squadNumber: 9,
    });
    await insertPlayer(t, {
      teamId,
      firstName: "Jane",
      lastName: "Smith",
      position: "Midfielder",
      status: "active",
      squadNumber: 8,
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      {}
    );

    expect(result).toHaveLength(2);
  });

  it("filters by status correctly when status param is provided", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertPlayer(t, {
      teamId,
      firstName: "Active",
      lastName: "Player",
      position: "Forward",
      status: "active",
      squadNumber: 9,
    });
    await insertPlayer(t, {
      teamId,
      firstName: "Loan",
      lastName: "Player",
      position: "Defender",
      status: "onLoan",
      squadNumber: 4,
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      { status: "active" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Active");
  });

  it("filters by search string matching first or last name (case-insensitive)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertPlayer(t, {
      teamId,
      firstName: "Marcus",
      lastName: "Rashford",
      position: "Forward",
      status: "active",
    });
    await insertPlayer(t, {
      teamId,
      firstName: "Bruno",
      lastName: "Fernandes",
      position: "Midfielder",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      { search: "rash" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].lastName).toBe("Rashford");
  });

  it("combines status and search filters correctly", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertPlayer(t, {
      teamId,
      firstName: "Marcus",
      lastName: "Rashford",
      position: "Forward",
      status: "active",
    });
    await insertPlayer(t, {
      teamId,
      firstName: "Marcus",
      lastName: "Loan",
      position: "Defender",
      status: "onLoan",
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      { status: "active", search: "marcus" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].lastName).toBe("Rashford");
  });

  it("does not return players from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Other team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    await insertPlayer(t, {
      teamId,
      firstName: "Own",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });
    await insertPlayer(t, {
      teamId: otherTeamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      {}
    );

    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Own");
  });

  it("sorts by squadNumber ascending with nulls last", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertPlayer(t, {
      teamId,
      firstName: "No",
      lastName: "Number",
      position: "Forward",
      status: "active",
    });
    await insertPlayer(t, {
      teamId,
      firstName: "High",
      lastName: "Number",
      position: "Defender",
      status: "active",
      squadNumber: 20,
    });
    await insertPlayer(t, {
      teamId,
      firstName: "Low",
      lastName: "Number",
      position: "Goalkeeper",
      status: "active",
      squadNumber: 1,
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      {}
    );

    expect(result).toHaveLength(3);
    expect(result[0].squadNumber).toBe(1);
    expect(result[1].squadNumber).toBe(20);
    expect(result[2].squadNumber).toBeUndefined();
  });

  it("resolves photo storage IDs to URLs", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertPlayer(t, {
      teamId,
      firstName: "No",
      lastName: "Photo",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayers,
      {}
    );

    // Player without photo should have null photoUrl
    expect(result[0].photoUrl).toBeNull();
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let caughtError: unknown;
    try {
      await t.query((await import("../queries")).getPlayers, {});
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
  });
});

// ---------------------------------------------------------------------------
// getPlayerById
// ---------------------------------------------------------------------------

describe("getPlayerById", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns full player object for valid ID within the same team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
      squadNumber: 9,
      nationality: "England",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerById,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("John");
    expect(result!.lastName).toBe("Doe");
    expect(result!.position).toBe("Forward");
    expect(result!.squadNumber).toBe(9);
    expect(result!.nationality).toBe("England");
  });

  it("returns null for player ID from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    const otherPlayerId = await insertPlayer(t, {
      teamId: otherTeamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerById,
      { playerId: otherPlayerId }
    );

    expect(result).toBeNull();
  });

  it("returns null photoUrl when no photo set", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "No",
      lastName: "Photo",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerById,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(result!.photoUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPlayerTabAccess
// ---------------------------------------------------------------------------

describe("getPlayerTabAccess", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin role gets showInjuries: true, showContract: true", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerTabAccess,
      { playerId }
    );

    expect(result.showInjuries).toBe(true);
    expect(result.showContract).toBe(true);
  });

  it("physio role gets showInjuries: true, showContract: false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerTabAccess,
      { playerId }
    );

    expect(result.showInjuries).toBe(true);
    expect(result.showContract).toBe(false);
  });

  it("coach role gets showInjuries: false, showContract: false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Test",
      lastName: "Player",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerTabAccess,
      { playerId }
    );

    expect(result.showInjuries).toBe(false);
    expect(result.showContract).toBe(false);
  });

  it("player viewing own profile gets showContract: true, isSelf: true", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Self",
      lastName: "Player",
      position: "Forward",
      status: "active",
      userId, // Link player to user
    });

    const result = await t.query(
      (await import("../queries")).getPlayerTabAccess,
      { playerId }
    );

    expect(result.showContract).toBe(true);
    expect(result.isSelf).toBe(true);
  });

  it("player viewing another player's profile gets showContract: false, isSelf: false", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create another user for the other player
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other Player",
        email: "other@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      })
    );

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
      userId: otherUserId,
    });

    const result = await t.query(
      (await import("../queries")).getPlayerTabAccess,
      { playerId }
    );

    expect(result.showContract).toBe(false);
    expect(result.isSelf).toBe(false);
  });

  it("returns all false for player from different team", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Club", slug: "other-club" })
    );

    const playerId = await insertPlayer(t, {
      teamId: otherTeamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerTabAccess,
      { playerId }
    );

    expect(result.showInjuries).toBe(false);
    expect(result.showContract).toBe(false);
    expect(result.isSelf).toBe(false);
  });
});
