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
const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
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
      name: "Test User",
      email: "user@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

async function insertPlayer(
  t: ReturnType<typeof convexTest>,
  data: {
    teamId: Id<"teams">;
    firstName: string;
    lastName: string;
    position: string;
    status: string;
  }
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

async function insertInjury(
  t: ReturnType<typeof convexTest>,
  data: {
    teamId: Id<"teams">;
    playerId: Id<"players">;
    injuryType: string;
    severity: string;
    date: number;
    status: string;
    clearanceDate?: number;
    createdBy: Id<"users">;
  }
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("playerInjuries", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  });
}

// ===========================================================================
// canViewInjuryDetails — AC1 (Story 14.4)
// ===========================================================================

describe("canViewInjuryDetails", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns true", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).canViewInjuryDetails,
      {}
    );
    expect(result).toBe(true);
  });

  it("physio → returns true", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).canViewInjuryDetails,
      {}
    );
    expect(result).toBe(true);
  });

  it("coach → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).canViewInjuryDetails,
      {}
    );
    expect(result).toBe(false);
  });

  it("analyst → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).canViewInjuryDetails,
      {}
    );
    expect(result).toBe(false);
  });

  it("player → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).canViewInjuryDetails,
      {}
    );
    expect(result).toBe(false);
  });

  it("staff → returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "staff" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).canViewInjuryDetails,
      {}
    );
    expect(result).toBe(false);
  });
});

// ===========================================================================
// getPlayerInjuryDetails — AC2 (Story 14.4)
// ===========================================================================

describe("getPlayerInjuryDetails", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns full injury details for same-team player", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
    });

    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "Hamstring strain",
      severity: "moderate",
      date: Date.now() - 7 * 86400000,
      status: "active",
      createdBy: userId,
    });

    const result = await t.query(
      (await import("../queries")).getPlayerInjuryDetails,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].injuryType).toBe("Hamstring strain");
  });

  it("physio → returns full injury details", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
    });

    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "ACL tear",
      severity: "severe",
      date: Date.now() - 30 * 86400000,
      status: "rehab",
      createdBy: userId,
    });

    const result = await t.query(
      (await import("../queries")).getPlayerInjuryDetails,
      { playerId }
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
  });

  it("coach → returns null (not error)", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerInjuryDetails,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("player → returns null for another player's injuries", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "Other",
      lastName: "Player",
      position: "Defender",
      status: "active",
    });

    const result = await t.query(
      (await import("../queries")).getPlayerInjuryDetails,
      { playerId }
    );

    expect(result).toBeNull();
  });

  it("cross-team admin → returns null (player not on their team)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create player in a different team
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
      (await import("../queries")).getPlayerInjuryDetails,
      { playerId }
    );

    expect(result).toBeNull();
  });
});

// ===========================================================================
// getInjuryReportByPlayer — AC5 (Story 14.4)
// ===========================================================================

describe("getInjuryReportByPlayer", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns data array with correct aggregations", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
    });

    const dateStart = Date.now() - 10 * 86400000;
    const dateEnd = Date.now() - 3 * 86400000;

    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "Hamstring strain",
      severity: "moderate",
      date: dateStart,
      status: "cleared",
      clearanceDate: dateEnd,
      createdBy: userId,
    });

    const result = await t.query(
      (await import("../queries")).getInjuryReportByPlayer,
      {}
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].playerName).toBe("John Doe");
    expect(result![0].totalInjuries).toBe(1);
    expect(result![0].totalDaysLost).toBe(Math.ceil((dateEnd - dateStart) / 86400000));
    expect(result![0].currentlyInjured).toBe(false);
  });

  it("physio → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).getInjuryReportByPlayer,
      {}
    );

    expect(result).toBeNull();
  });

  it("coach → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).getInjuryReportByPlayer,
      {}
    );

    expect(result).toBeNull();
  });

  it("admin from different team → returns empty array (no cross-team data)", async () => {
    const t = convexTest(schema, modules);

    // Create Team A with a player and injury
    const teamAId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team A", slug: "team-a" })
    );
    const teamAUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin A",
        email: "admin-a@example.com",
        role: "admin" as any,
        status: "active",
        teamId: teamAId,
      })
    );
    const playerA = await insertPlayer(t, {
      teamId: teamAId,
      firstName: "Player",
      lastName: "A",
      position: "Forward",
      status: "active",
    });
    await insertInjury(t, {
      teamId: teamAId,
      playerId: playerA,
      injuryType: "Ankle sprain",
      severity: "mild",
      date: Date.now() - 5 * 86400000,
      status: "active",
      createdBy: teamAUserId,
    });

    // Create Team B admin — this is who we query as
    const teamBId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team B", slug: "team-b" })
    );
    const teamBUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin B",
        email: "admin-b@example.com",
        role: "admin" as any,
        status: "active",
        teamId: teamBId,
      })
    );
    mockGetAuthUserId.mockResolvedValue(teamBUserId);

    const result = await t.query(
      (await import("../queries")).getInjuryReportByPlayer,
      {}
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(0);
  });
});

// ===========================================================================
// getInjuryReportBySeason — AC6 (Story 14.4)
// ===========================================================================

describe("getInjuryReportBySeason", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns correctly grouped season data", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
    });

    // Oct 2025 → season "2025/26"
    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "Hamstring",
      severity: "moderate",
      date: new Date("2025-10-15T00:00:00Z").getTime(),
      status: "cleared",
      clearanceDate: new Date("2025-10-25T00:00:00Z").getTime(),
      createdBy: userId,
    });

    // Mar 2026 → season "2025/26"
    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "Ankle sprain",
      severity: "mild",
      date: new Date("2026-03-01T00:00:00Z").getTime(),
      status: "cleared",
      clearanceDate: new Date("2026-03-05T00:00:00Z").getTime(),
      createdBy: userId,
    });

    const result = await t.query(
      (await import("../queries")).getInjuryReportBySeason,
      {}
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].season).toBe("2025/26");
    expect(result![0].totalInjuries).toBe(2);
  });

  it("non-admin → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).getInjuryReportBySeason,
      {}
    );

    expect(result).toBeNull();
  });
});

// ===========================================================================
// getInjuryReportByType — AC7 (Story 14.4)
// ===========================================================================

describe("getInjuryReportByType", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin → returns correctly grouped type data with case-insensitive grouping", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await insertPlayer(t, {
      teamId,
      firstName: "John",
      lastName: "Doe",
      position: "Forward",
      status: "active",
    });

    const baseDate = Date.now() - 20 * 86400000;

    // "Hamstring strain" x2 (different casing)
    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "Hamstring strain",
      severity: "moderate",
      date: baseDate,
      status: "cleared",
      clearanceDate: baseDate + 10 * 86400000,
      createdBy: userId,
    });

    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "hamstring strain",
      severity: "mild",
      date: baseDate + 12 * 86400000,
      status: "cleared",
      clearanceDate: baseDate + 16 * 86400000,
      createdBy: userId,
    });

    // "Ankle sprain" x1
    await insertInjury(t, {
      teamId,
      playerId,
      injuryType: "Ankle sprain",
      severity: "mild",
      date: baseDate + 5 * 86400000,
      status: "cleared",
      clearanceDate: baseDate + 8 * 86400000,
      createdBy: userId,
    });

    const result = await t.query(
      (await import("../queries")).getInjuryReportByType,
      {}
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);

    // Hamstring strain should be first (count: 2)
    const hamstring = result!.find((r) => r.injuryType === "Hamstring strain");
    expect(hamstring).toBeDefined();
    expect(hamstring!.count).toBe(2);
    expect(hamstring!.totalDaysLost).toBe(14); // 10 + 4
    expect(hamstring!.avgDaysLost).toBe(7);

    const ankle = result!.find((r) => r.injuryType === "Ankle sprain");
    expect(ankle).toBeDefined();
    expect(ankle!.count).toBe(1);
    expect(ankle!.totalDaysLost).toBe(3);
  });

  it("non-admin → returns null", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.query(
      (await import("../queries")).getInjuryReportByType,
      {}
    );

    expect(result).toBeNull();
  });
});

// ===========================================================================
// getFootballSeason helper — boundary cases
// ===========================================================================

describe("getFootballSeason", () => {
  it("Oct 2025 → 2025/26", async () => {
    const { getFootballSeason } = await import("../queries");
    const date = new Date("2025-10-15T00:00:00Z").getTime();
    expect(getFootballSeason(date)).toBe("2025/26");
  });

  it("Mar 2026 → 2025/26", async () => {
    const { getFootballSeason } = await import("../queries");
    const date = new Date("2026-03-15T00:00:00Z").getTime();
    expect(getFootballSeason(date)).toBe("2025/26");
  });

  it("Aug 2025 → 2025/26", async () => {
    const { getFootballSeason } = await import("../queries");
    const date = new Date("2025-08-01T00:00:00Z").getTime();
    expect(getFootballSeason(date)).toBe("2025/26");
  });

  it("Jul 2025 → 2024/25", async () => {
    const { getFootballSeason } = await import("../queries");
    const date = new Date("2025-07-31T00:00:00Z").getTime();
    expect(getFootballSeason(date)).toBe("2024/25");
  });
});

// ===========================================================================
// Cross-team isolation — AC10 (Story 14.4)
// ===========================================================================

describe("cross-team isolation", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin from Team A sees only Team A injuries in report queries", async () => {
    const t = convexTest(schema, modules);

    // Create Team A
    const teamAId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team A", slug: "team-a" })
    );
    const adminAId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin A",
        email: "admin-a@example.com",
        role: "admin" as any,
        status: "active",
        teamId: teamAId,
      })
    );
    const playerA = await insertPlayer(t, {
      teamId: teamAId,
      firstName: "Player",
      lastName: "A",
      position: "Forward",
      status: "active",
    });
    await insertInjury(t, {
      teamId: teamAId,
      playerId: playerA,
      injuryType: "ACL tear",
      severity: "severe",
      date: Date.now() - 60 * 86400000,
      status: "active",
      createdBy: adminAId,
    });

    // Create Team B with different injury
    const teamBId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Team B", slug: "team-b" })
    );
    const adminBId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin B",
        email: "admin-b@example.com",
        role: "admin" as any,
        status: "active",
        teamId: teamBId,
      })
    );
    const playerB = await insertPlayer(t, {
      teamId: teamBId,
      firstName: "Player",
      lastName: "B",
      position: "Defender",
      status: "active",
    });
    await insertInjury(t, {
      teamId: teamBId,
      playerId: playerB,
      injuryType: "Knee injury",
      severity: "moderate",
      date: Date.now() - 30 * 86400000,
      status: "rehab",
      createdBy: adminBId,
    });

    // Query as Admin A → should only see Team A data
    mockGetAuthUserId.mockResolvedValue(adminAId);

    const byPlayer = await t.query(
      (await import("../queries")).getInjuryReportByPlayer,
      {}
    );
    expect(byPlayer).toHaveLength(1);
    expect(byPlayer![0].playerName).toBe("Player A");

    const byType = await t.query(
      (await import("../queries")).getInjuryReportByType,
      {}
    );
    expect(byType).toHaveLength(1);
    expect(byType![0].injuryType).toBe("ACL tear");

    // Query as Admin B → should only see Team B data
    mockGetAuthUserId.mockResolvedValue(adminBId);

    const byPlayerB = await t.query(
      (await import("../queries")).getInjuryReportByPlayer,
      {}
    );
    expect(byPlayerB).toHaveLength(1);
    expect(byPlayerB![0].playerName).toBe("Player B");

    const byTypeB = await t.query(
      (await import("../queries")).getInjuryReportByType,
      {}
    );
    expect(byTypeB).toHaveLength(1);
    expect(byTypeB![0].injuryType).toBe("Knee injury");
  });
});
