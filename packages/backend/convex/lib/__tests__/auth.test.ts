import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Mock getAuthUserId — convex-test does not support the getUserIdentity
// syscall (see https://github.com/get-convex/convex-test/issues/50), so we
// mock ONLY this function while keeping the real Convex DB for all other ops.
// ---------------------------------------------------------------------------
const { mockGetAuthUserId } = vi.hoisted(() => {
  return { mockGetAuthUserId: vi.fn() };
});

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getAuthUserId: mockGetAuthUserId };
});

// Import schema and auth helpers AFTER the mock is in place
const { default: schema } = await import("../../schema");
const { requireAuth, requireRole, requireSelf, requireMedical, requireAdmin } =
  await import("../auth");

// convex-test requires the modules map for function resolution
const modules = import.meta.glob("../../**/*.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert a team + user inside a convex-test `run` block and return their IDs. */
async function seedUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    banned?: boolean;
    status?: string;
    teamId?: Id<"teams"> | null;
  } = {}
) {
  return await t.run(async (ctx) => {
    const teamId =
      overrides.teamId === null
        ? undefined
        : overrides.teamId ??
          (await ctx.db.insert("teams", {
            name: "Test Club",
            slug: "test-club",
          }));

    const userId = await ctx.db.insert("users", {
      name: "Test User",
      email: "test@example.com",
      role: (overrides.role as any) ?? "coach",
      status: (overrides.status as any) ?? "active",
      teamId: teamId ?? undefined,
      banned: overrides.banned,
    });

    return { userId, teamId: teamId ?? (null as unknown as Id<"teams">) };
  });
}

// ===========================================================================
// requireAuth
// ===========================================================================

describe("requireAuth", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("throws NOT_AUTHENTICATED when no session exists", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireAuth(ctx);
        } catch (e) {
          if (e instanceof ConvexError) {
            errorCode = (e.data as any).code;
          }
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHENTICATED");
  });

  it("throws NOT_AUTHORIZED when user is banned", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { banned: true });
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorData: any;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireAuth(ctx);
        } catch (e) {
          if (e instanceof ConvexError) errorData = e.data;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorData.code).toBe("NOT_AUTHORIZED");
    expect(errorData.message).toContain("banned");
  });

  it("throws NOT_AUTHORIZED when user is deactivated", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { status: "deactivated" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorData: any;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireAuth(ctx);
        } catch (e) {
          if (e instanceof ConvexError) errorData = e.data;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorData.code).toBe("NOT_AUTHORIZED");
    expect(errorData.message).toContain("deactivated");
  });

  it("throws NOT_AUTHORIZED when user has no teamId", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { teamId: null });
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorData: any;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireAuth(ctx);
        } catch (e) {
          if (e instanceof ConvexError) errorData = e.data;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorData.code).toBe("NOT_AUTHORIZED");
    expect(errorData.message).toContain("team");
  });

  it("returns { user, teamId } for a valid authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireAuth(ctx);
    });

    expect(result.user._id).toBe(userId);
    expect(result.teamId).toBe(teamId);
    expect(result.user.role).toBe("coach");
  });
});

// ===========================================================================
// requireRole
// ===========================================================================

describe("requireRole", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes when user role is in the allowed list", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t, { role: "analyst" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireRole(ctx, ["analyst", "coach"]);
    });

    expect(result.user._id).toBe(userId);
    expect(result.teamId).toBe(teamId);
  });

  it("throws NOT_AUTHORIZED when user role is not in the allowed list", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await expect(
      t.run(async (ctx) => {
        await requireRole(ctx, ["admin", "coach"]);
      })
    ).rejects.toThrow(ConvexError);
  });

  it("works with multiple allowed roles", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireRole(ctx, ["admin", "physio", "coach"]);
    });

    expect(result.user.role).toBe("physio");
  });
});

// ===========================================================================
// requireSelf
// ===========================================================================

describe("requireSelf", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes when userId matches", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireSelf(ctx, userId);
    });

    expect(result.user._id).toBe(userId);
    expect(result.teamId).toBe(teamId);
  });

  it("throws NOT_AUTHORIZED when userId does not match", async () => {
    const t = convexTest(schema, modules);
    const { userId: user1, teamId } = await seedUser(t);

    // Create a second user on the same team
    const user2 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other User",
        email: "other@example.com",
        role: "player",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(user1);

    await expect(
      t.run(async (ctx) => {
        await requireSelf(ctx, user2);
      })
    ).rejects.toThrow(ConvexError);
  });
});

// ===========================================================================
// requireMedical
// ===========================================================================

describe("requireMedical", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes for admin", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireMedical(ctx);
    });
    expect(result.user.role).toBe("admin");
  });

  it("passes for physio", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireMedical(ctx);
    });
    expect(result.user.role).toBe("physio");
  });

  it.each(["coach", "analyst", "player", "staff"] as const)(
    "throws for %s",
    async (role) => {
      const t = convexTest(schema, modules);
      const { userId } = await seedUser(t, { role });
      mockGetAuthUserId.mockResolvedValue(userId);

      await expect(
        t.run(async (ctx) => {
          await requireMedical(ctx);
        })
      ).rejects.toThrow(ConvexError);
    }
  );
});

// ===========================================================================
// requireAdmin (shared version)
// ===========================================================================

describe("requireAdmin", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes for admin role", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireAdmin(ctx);
    });
    expect(result.user.role).toBe("admin");
  });

  it("throws for non-admin roles", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    await expect(
      t.run(async (ctx) => {
        await requireAdmin(ctx);
      })
    ).rejects.toThrow(ConvexError);
  });
});
