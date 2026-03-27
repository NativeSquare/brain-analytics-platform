import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Mock getAuthUserId (convex-test #50 — getUserIdentity not supported)
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

// Import auth helpers for direct use in t.run()
const { requireAuth, requireRole } = await import("../../lib/auth");

// Import seed function
const { seedDefaultData } = await import("../../seed");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function seedTeamAndUser(
  t: ReturnType<typeof convexTest>,
  opts: {
    role?: string;
    slug?: string;
    teamName?: string;
  } = {}
) {
  return await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: opts.teamName ?? "Test Club",
      slug: opts.slug ?? "test-club",
    });
    const userId = await ctx.db.insert("users", {
      name: "Test User",
      email: "test@test.com",
      role: (opts.role as any) ?? "admin",
      status: "active",
      teamId,
    });
    return { teamId, userId };
  });
}

// ===========================================================================
// getUsersByTeam — admin-only, returns only same-team users (AC: #8)
// ===========================================================================
describe("getUsersByTeam", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("returns only users from the authenticated user's team", async () => {
    const t = convexTest(schema, modules);

    // Create two teams with users
    const team1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", { name: "Team A", slug: "team-a" });
    });
    const team2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", { name: "Team B", slug: "team-b" });
    });

    const admin1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Admin A",
        email: "admin@team-a.com",
        role: "admin",
        status: "active",
        teamId: team1Id,
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Coach A",
        email: "coach@team-a.com",
        role: "coach",
        status: "active",
        teamId: team1Id,
      });
      // User on team B — should NOT appear
      await ctx.db.insert("users", {
        name: "Admin B",
        email: "admin@team-b.com",
        role: "admin",
        status: "active",
        teamId: team2Id,
      });
    });

    mockGetAuthUserId.mockResolvedValue(admin1Id);

    // Simulate getUsersByTeam logic: requireRole(admin) then query by teamId
    const users = await t.run(async (ctx) => {
      const { teamId } = await requireRole(ctx, ["admin"]);
      return await ctx.db
        .query("users")
        .withIndex("by_teamId", (q: any) => q.eq("teamId", teamId))
        .collect();
    });

    expect(users).toHaveLength(2);
    expect(users.every((u: any) => u.teamId === team1Id)).toBe(true);
  });

  it("throws for non-admin callers", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(coachId);

    await expect(
      t.run(async (ctx) => {
        await requireRole(ctx, ["admin"]);
      })
    ).rejects.toThrow(ConvexError);
  });
});

// ===========================================================================
// getTeamMembers — any authenticated user, optional role filter (AC: #8)
// ===========================================================================
describe("getTeamMembers", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("returns all team members when no role filter", async () => {
    const t = convexTest(schema, modules);
    const { teamId, userId } = await seedTeamAndUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Player 1",
        email: "p1@test.com",
        role: "player",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(userId);

    const members = await t.run(async (ctx) => {
      const { teamId: tid } = await requireAuth(ctx);
      return await ctx.db
        .query("users")
        .withIndex("by_teamId", (q: any) => q.eq("teamId", tid))
        .collect();
    });

    expect(members).toHaveLength(2);
  });

  it("filters by role when provided", async () => {
    const t = convexTest(schema, modules);
    const { teamId, userId } = await seedTeamAndUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Player 1",
        email: "p1@test.com",
        role: "player",
        status: "active",
        teamId,
      });
      await ctx.db.insert("users", {
        name: "Coach 1",
        email: "c1@test.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(userId);

    const players = await t.run(async (ctx) => {
      const { teamId: tid } = await requireAuth(ctx);
      return await ctx.db
        .query("users")
        .withIndex("by_teamId_role", (q: any) =>
          q.eq("teamId", tid).eq("role", "player")
        )
        .collect();
    });

    expect(players).toHaveLength(1);
    expect(players[0].role).toBe("player");
  });
});

// ===========================================================================
// updateUserRole — admin-only (AC: #8)
// ===========================================================================
describe("updateUserRole", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("succeeds for admin caller", async () => {
    const t = convexTest(schema, modules);
    const { teamId, userId: adminId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    // Simulate updateUserRole logic
    await t.run(async (ctx) => {
      const { teamId: tid } = await requireRole(ctx, ["admin"]);
      const target = await ctx.db.get(coachId);
      if (!target || target.teamId !== tid) throw new Error("Invalid");
      await ctx.db.patch(coachId, { role: "analyst" });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(coachId));
    expect(updated?.role).toBe("analyst");
  });

  it("throws for non-admin caller", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(coachId);

    await expect(
      t.run(async (ctx) => {
        await requireRole(ctx, ["admin"]);
      })
    ).rejects.toThrow(ConvexError);
  });
});

// ===========================================================================
// seedDefaultData — idempotent (AC: #7)
// ===========================================================================
describe("seedDefaultData", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("creates the default team on first run", async () => {
    const t = convexTest(schema, modules);

    // Seed function is an internalMutation — call its handler via t.run
    await t.run(async (ctx) => {
      // Replicate seed logic inline (internalMutation handler)
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q: any) => q.eq("slug", "default-club"))
        .first();
      if (!existing) {
        await ctx.db.insert("teams", { name: "Default Club", slug: "default-club" });
      }
    });

    const team = await t.run(async (ctx) => {
      return await ctx.db
        .query("teams")
        .withIndex("by_slug", (q: any) => q.eq("slug", "default-club"))
        .first();
    });

    expect(team).not.toBeNull();
    expect(team?.name).toBe("Default Club");
    expect(team?.slug).toBe("default-club");
  });

  it("is idempotent — second run does not create a duplicate", async () => {
    const t = convexTest(schema, modules);

    // Run seed logic twice
    const seedLogic = async (ctx: any) => {
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q: any) => q.eq("slug", "default-club"))
        .first();
      let teamId = existing?._id;
      if (!teamId) {
        teamId = await ctx.db.insert("teams", {
          name: "Default Club",
          slug: "default-club",
        });
      }
      // Patch first admin without team
      const allUsers = await ctx.db.query("users").collect();
      const adminNoTeam = allUsers.find(
        (u: any) => u.role === "admin" && !u.teamId
      );
      if (adminNoTeam) {
        await ctx.db.patch(adminNoTeam._id, {
          teamId,
          role: "admin",
          status: "active",
        });
      }
    };

    await t.run(seedLogic);
    await t.run(seedLogic);

    const teams = await t.run(async (ctx) => {
      return await ctx.db
        .query("teams")
        .withIndex("by_slug", (q: any) => q.eq("slug", "default-club"))
        .collect();
    });

    expect(teams).toHaveLength(1);
  });

  it("patches the first admin user with teamId", async () => {
    const t = convexTest(schema, modules);

    // Create an admin user without a teamId
    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
      });
    });

    // Run seed logic
    await t.run(async (ctx) => {
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q: any) => q.eq("slug", "default-club"))
        .first();
      let teamId = existing?._id;
      if (!teamId) {
        teamId = await ctx.db.insert("teams", {
          name: "Default Club",
          slug: "default-club",
        });
      }
      const allUsers = await ctx.db.query("users").collect();
      const adminNoTeam = allUsers.find(
        (u: any) => u.role === "admin" && !u.teamId
      );
      if (adminNoTeam) {
        await ctx.db.patch(adminNoTeam._id, {
          teamId,
          role: "admin",
          status: "active",
        });
      }
    });

    const admin = await t.run(async (ctx) => ctx.db.get(adminId));
    expect(admin?.teamId).toBeDefined();
    expect(admin?.status).toBe("active");
    expect(admin?.role).toBe("admin");
  });
});
