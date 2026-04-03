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
const {
  requireAuth,
  requireRole,
  requireSelf,
  requireMedical,
  requireAdmin,
  getTeamResource,
  requireAdminOrSelf,
  requireAdminOrRole,
  requireResourceAccess,
  withAccessControl,
} = await import("../auth");

// convex-test requires the modules map for function resolution
const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

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

// ===========================================================================
// getTeamResource (Story 11.4)
// ===========================================================================

describe("getTeamResource", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns the resource when it exists and belongs to the team", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedUser(t, { role: "admin" });

    const playerId = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId,
        firstName: "John",
        lastName: "Doe",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getTeamResource(ctx, teamId, "players", playerId);
    });

    expect(result._id).toBe(playerId);
    expect(result.teamId).toBe(teamId);
  });

  it("throws NOT_FOUND when resource does not exist", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedUser(t);

    // Use a fake ID that doesn't exist
    const fakeId = "k57a1234567890123456789012" as Id<"players">;

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getTeamResource(ctx, teamId, "players", fakeId);
        } catch (e) {
          if (e instanceof ConvexError) errorCode = (e.data as any).code;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("throws NOT_FOUND when resource belongs to a different team (anti-enumeration)", async () => {
    const t = convexTest(schema, modules);

    // Create two teams
    const { teamId: team1 } = await seedUser(t, { role: "admin" });
    const team2 = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        name: "Other Club",
        slug: "other-club",
      });
    });

    // Create a player on team2
    const playerId = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId: team2,
        firstName: "Jane",
        lastName: "Doe",
        position: "Defender",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          // team1 user tries to access team2 player
          await getTeamResource(ctx, team1, "players", playerId);
        } catch (e) {
          if (e instanceof ConvexError) errorCode = (e.data as any).code;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    // Same error code as missing — prevents enumeration
    expect(errorCode).toBe("NOT_FOUND");
  });
});

// ===========================================================================
// requireAdminOrSelf (Story 11.4)
// ===========================================================================

describe("requireAdminOrSelf", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes for admin regardless of targetUserId", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t, { role: "admin" });

    // Create another user
    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other",
        email: "other@test.com",
        role: "player",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireAdminOrSelf(ctx, otherUserId);
    });
    expect(result.user.role).toBe("admin");
  });

  it("passes when user is the target (self)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireAdminOrSelf(ctx, userId);
    });
    expect(result.user._id).toBe(userId);
  });

  it("throws NOT_AUTHORIZED when user is neither admin nor self", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t, { role: "coach" });

    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other",
        email: "other@test.com",
        role: "player",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireAdminOrSelf(ctx, otherUserId);
        } catch (e) {
          if (e instanceof ConvexError) errorCode = (e.data as any).code;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// requireAdminOrRole (Story 11.4)
// ===========================================================================

describe("requireAdminOrRole", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes for admin even when admin is not in the roles list", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireAdminOrRole(ctx, ["physio"]);
    });
    expect(result.user.role).toBe("admin");
  });

  it("passes when user role is in the allowed list", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireAdminOrRole(ctx, ["physio", "coach"]);
    });
    expect(result.user.role).toBe("physio");
  });

  it("throws NOT_AUTHORIZED when user role is not in list and not admin", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireAdminOrRole(ctx, ["physio", "coach"]);
        } catch (e) {
          if (e instanceof ConvexError) errorCode = (e.data as any).code;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// requireResourceAccess (Story 11.4)
// ===========================================================================

describe("requireResourceAccess", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("passes for admin regardless of options", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireResourceAccess(ctx, {}, {});
    });
    expect(result.user.role).toBe("admin");
  });

  it("passes when user role is in allowedRoles", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "physio" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireResourceAccess(ctx, {}, { allowedRoles: ["physio"] });
    });
    expect(result.user.role).toBe("physio");
  });

  it("passes when allowOwner is true and user is the owner", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireResourceAccess(
        ctx,
        { createdBy: userId },
        { allowOwner: true },
      );
    });
    expect(result.user._id).toBe(userId);
  });

  it("passes when checkPermissions returns true", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return await requireResourceAccess(ctx, {}, {
        checkPermissions: async () => true,
      });
    });
    expect(result.user._id).toBe(userId);
  });

  it("throws NOT_AUTHORIZED when no check passes", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t, { role: "player" });

    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@test.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await requireResourceAccess(
            ctx,
            { createdBy: otherUserId },
            { allowedRoles: ["admin"], allowOwner: true },
          );
        } catch (e) {
          if (e instanceof ConvexError) errorCode = (e.data as any).code;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// withAccessControl (Story 11.4)
// ===========================================================================

describe("withAccessControl", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("runs the handler when no roles are required", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const handler = withAccessControl({}, (_ctx, _args, authCtx) => {
      return authCtx.user.role;
    });

    const result = await t.run(async (ctx) => {
      return await handler(ctx, {});
    });
    expect(result).toBe("coach");
  });

  it("enforces role check from rules", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "player" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const handler = withAccessControl(
      { roles: ["admin"] },
      (_ctx, _args, authCtx) => authCtx.user.role,
    );

    await expect(
      t.run(async (ctx) => {
        await handler(ctx, {});
      })
    ).rejects.toThrow(ConvexError);
  });

  it("runs custom check and denies if it returns false", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t, { role: "coach" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const handler = withAccessControl(
      { check: () => false },
      (_ctx, _args, authCtx) => authCtx.user.role,
    );

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await handler(ctx, {});
        } catch (e) {
          if (e instanceof ConvexError) errorCode = (e.data as any).code;
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("passes authCtx to the wrapped handler", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedUser(t, { role: "admin" });
    mockGetAuthUserId.mockResolvedValue(userId);

    const handler = withAccessControl(
      { roles: ["admin"] },
      (_ctx, _args, authCtx) => ({
        userId: authCtx.user._id,
        teamId: authCtx.teamId,
      }),
    );

    const result = await t.run(async (ctx) => {
      return await handler(ctx, {});
    });
    expect(result.userId).toBe(userId);
    expect(result.teamId).toBe(teamId);
  });
});
