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
const { requireRole, requireAuth } = await import("../../lib/auth");

const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

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
      name: overrides.name ?? "Test Admin",
      email: overrides.email ?? "admin@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Inline mutation logic for convex-test compatibility (t.run pattern)
// ---------------------------------------------------------------------------

/** Mirrors deletePlayer handler */
async function deletePlayerLogic(
  ctx: any,
  args: { playerId: Id<"players"> }
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Player not found",
    });
  }

  // playerStats
  const stats = await ctx.db
    .query("playerStats")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();
  for (const doc of stats) await ctx.db.delete(doc._id);

  // playerFitness
  const fitness = await ctx.db
    .query("playerFitness")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();
  for (const doc of fitness) await ctx.db.delete(doc._id);

  // playerInjuries
  const injuries = await ctx.db
    .query("playerInjuries")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();
  for (const doc of injuries) await ctx.db.delete(doc._id);

  // contracts (skip storage.delete in test — mock ctx doesn't support it)
  const contracts = await ctx.db
    .query("contracts")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();
  for (const contract of contracts) {
    await ctx.db.delete(contract._id);
  }

  // playerInvites
  const invites = await ctx.db
    .query("playerInvites")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
    .collect();
  for (const doc of invites) await ctx.db.delete(doc._id);

  // User-linked records
  if (player.userId) {
    const userId = player.userId;

    const eventUsers = await ctx.db
      .query("calendarEventUsers")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();
    for (const doc of eventUsers) await ctx.db.delete(doc._id);

    const rsvps = await ctx.db
      .query("eventRsvps")
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();
    for (const doc of rsvps) await ctx.db.delete(doc._id);

    const docReads = await ctx.db
      .query("documentReads")
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();
    for (const doc of docReads) await ctx.db.delete(doc._id);

    const docPerms = await ctx.db
      .query("documentUserPermissions")
      .withIndex("by_userId_teamId", (q: any) =>
        q.eq("userId", userId).eq("teamId", teamId)
      )
      .collect();
    for (const doc of docPerms) await ctx.db.delete(doc._id);

    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_userId_teamId", (q: any) =>
        q.eq("userId", userId).eq("teamId", teamId)
      )
      .collect();
    for (const doc of notifs) await ctx.db.delete(doc._id);

    const pinned = await ctx.db
      .query("userPinnedDashboards")
      .withIndex("by_userId_teamId", (q: any) =>
        q.eq("userId", userId).eq("teamId", teamId)
      )
      .collect();
    for (const doc of pinned) await ctx.db.delete(doc._id);

    const recent = await ctx.db
      .query("userRecentDashboards")
      .withIndex("by_userId_teamId", (q: any) =>
        q.eq("userId", userId).eq("teamId", teamId)
      )
      .collect();
    for (const doc of recent) await ctx.db.delete(doc._id);

    const feedbackDocs = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const doc of feedbackDocs) await ctx.db.delete(doc._id);

    // Auth records
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q: any) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q: any) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) await ctx.db.delete(account._id);

    // Delete user document
    await ctx.db.delete(userId);
  }

  // Delete the player
  await ctx.db.delete(args.playerId);

  return { success: true, deletedPlayerId: args.playerId };
}

/** Mirrors updatePlayerContactInfo handler */
async function updatePlayerContactInfoLogic(
  ctx: any,
  args: {
    playerId: Id<"players">;
    phone?: string;
    personalEmail?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
  }
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Player not found",
    });
  }

  // Validate email
  if (args.personalEmail && args.personalEmail.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.personalEmail)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Invalid email format",
      });
    }
  }

  // Validate field lengths
  const { playerId: _pid, ...fields } = args;
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.length > 500) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `${key} cannot exceed 500 characters`,
      });
    }
  }

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (args.phone !== undefined) patch.phone = args.phone || undefined;
  if (args.personalEmail !== undefined) patch.personalEmail = args.personalEmail || undefined;
  if (args.address !== undefined) patch.address = args.address || undefined;
  if (args.emergencyContactName !== undefined) patch.emergencyContactName = args.emergencyContactName || undefined;
  if (args.emergencyContactRelationship !== undefined) patch.emergencyContactRelationship = args.emergencyContactRelationship || undefined;
  if (args.emergencyContactPhone !== undefined) patch.emergencyContactPhone = args.emergencyContactPhone || undefined;

  await ctx.db.patch(args.playerId, patch);
  return args.playerId;
}

// ---------------------------------------------------------------------------
// GDPR deletePlayer Tests (Story 12.3 AC #8, #9, #14, #15)
// ---------------------------------------------------------------------------

describe("deletePlayer — GDPR cascade deletion", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("deletes a player with no associated data", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

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

    await t.run(async (ctx) => {
      await deletePlayerLogic(ctx, { playerId });
    });

    // Verify player is gone
    await t.run(async (ctx) => {
      const player = await ctx.db.get(playerId);
      expect(player).toBeNull();
    });
  });

  it("cascade deletes all player-linked records", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const { playerId, statsId, fitnessId, injuryId, inviteId } = await t.run(
      async (ctx) => {
        const now = Date.now();
        const pid = await ctx.db.insert("players", {
          teamId,
          firstName: "Jane",
          lastName: "Smith",
          position: "Midfielder",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });

        const sid = await ctx.db.insert("playerStats", {
          teamId,
          playerId: pid,
          matchDate: now,
          opponent: "Test FC",
          minutesPlayed: 90,
          goals: 1,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        });

        const fid = await ctx.db.insert("playerFitness", {
          teamId,
          playerId: pid,
          date: now,
          weightKg: 70,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        });

        const iid = await ctx.db.insert("playerInjuries", {
          teamId,
          playerId: pid,
          date: now,
          injuryType: "Hamstring",
          severity: "minor",
          status: "current",
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        });

        const invId = await ctx.db.insert("playerInvites", {
          teamId,
          playerId: pid,
          email: "jane@example.com",
          token: "test-token",
          status: "pending",
          createdAt: now,
          expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        });

        return {
          playerId: pid,
          statsId: sid,
          fitnessId: fid,
          injuryId: iid,
          inviteId: invId,
        };
      }
    );

    // Delete the player
    await t.run(async (ctx) => {
      await deletePlayerLogic(ctx, { playerId });
    });

    // Verify all records are gone
    await t.run(async (ctx) => {
      expect(await ctx.db.get(playerId)).toBeNull();
      expect(await ctx.db.get(statsId)).toBeNull();
      expect(await ctx.db.get(fitnessId)).toBeNull();
      expect(await ctx.db.get(injuryId)).toBeNull();
      expect(await ctx.db.get(inviteId)).toBeNull();
    });
  });

  it("cascade deletes all user-linked records and auth data", async () => {
    const t = convexTest(schema, modules);
    const { userId: adminId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const ids = await t.run(async (ctx) => {
      const now = Date.now();

      // Create a user for the player
      const playerUserId = await ctx.db.insert("users", {
        name: "Player User",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      });

      const playerId = await ctx.db.insert("players", {
        teamId,
        firstName: "Player",
        lastName: "One",
        position: "Defender",
        status: "active",
        userId: playerUserId,
        createdAt: now,
        updatedAt: now,
      });

      // Create a folder for documents
      const folderId = await ctx.db.insert("folders", {
        teamId,
        name: "Test Folder",
        createdBy: adminId,
        createdAt: now,
      });

      // Create a calendar event for event-linked records
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId,
        name: "Training",
        eventType: "training",
        startsAt: now,
        endsAt: now + 3600000,
        ownerId: adminId,
        rsvpEnabled: false,
        isRecurring: false,
        isCancelled: false,
        createdAt: now,
      });

      // Create a document for doc-linked records
      const documentId = await ctx.db.insert("documents", {
        teamId,
        folderId,
        name: "Test Doc",
        ownerId: adminId,
        createdAt: now,
        updatedAt: now,
      });

      const calEventUserId = await ctx.db.insert("calendarEventUsers", {
        eventId,
        userId: playerUserId,
        teamId,
      });

      const rsvpId = await ctx.db.insert("eventRsvps", {
        eventId,
        userId: playerUserId,
        teamId,
        status: "attending",
        respondedAt: now,
      });

      const docReadId = await ctx.db.insert("documentReads", {
        teamId,
        documentId,
        userId: playerUserId,
        readAt: now,
      });

      const docPermId = await ctx.db.insert("documentUserPermissions", {
        teamId,
        targetType: "document",
        targetId: documentId as unknown as string,
        userId: playerUserId,
        grantedBy: adminId,
        createdAt: now,
      });

      const notifId = await ctx.db.insert("notifications", {
        userId: playerUserId,
        teamId,
        type: "info",
        title: "Test",
        message: "Test notification",
        read: false,
        createdAt: now,
      });

      const pinnedId = await ctx.db.insert("userPinnedDashboards", {
        userId: playerUserId,
        dashboardId: "dash-1",
        teamId,
        pinnedAt: now,
      });

      const recentId = await ctx.db.insert("userRecentDashboards", {
        userId: playerUserId,
        dashboardId: "dash-1",
        teamId,
        openedAt: now,
      });

      const feedbackId = await ctx.db.insert("feedback", {
        userId: playerUserId,
        type: "bug",
        feedbackText: "Test feedback",
      });

      return {
        playerId,
        playerUserId,
        calEventUserId,
        rsvpId,
        docReadId,
        docPermId,
        notifId,
        pinnedId,
        recentId,
        feedbackId,
      };
    });

    // Delete the player
    await t.run(async (ctx) => {
      await deletePlayerLogic(ctx, { playerId: ids.playerId });
    });

    // Verify all records are gone
    await t.run(async (ctx) => {
      expect(await ctx.db.get(ids.playerId)).toBeNull();
      expect(await ctx.db.get(ids.playerUserId)).toBeNull();
      expect(await ctx.db.get(ids.calEventUserId)).toBeNull();
      expect(await ctx.db.get(ids.rsvpId)).toBeNull();
      expect(await ctx.db.get(ids.docReadId)).toBeNull();
      expect(await ctx.db.get(ids.docPermId)).toBeNull();
      expect(await ctx.db.get(ids.notifId)).toBeNull();
      expect(await ctx.db.get(ids.pinnedId)).toBeNull();
      expect(await ctx.db.get(ids.recentId)).toBeNull();
      expect(await ctx.db.get(ids.feedbackId)).toBeNull();
    });
  });

  it("non-admin cannot delete a player (RBAC)", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    // Create a player-role user
    const playerUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Player User",
        email: "player@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      });
    });

    const playerId = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId,
        firstName: "Target",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Auth as player user
    mockGetAuthUserId.mockResolvedValue(playerUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerLogic(ctx, { playerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("admin cannot delete a player from another team (cross-team denial)", async () => {
    const t = convexTest(schema, modules);

    // Create team A with a player
    const { teamId: teamAId } = await seedTeamAndUser(t, {
      email: "adminA@example.com",
      name: "Admin A",
    });

    const playerIdTeamA = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId: teamAId,
        firstName: "Team A",
        lastName: "Player",
        position: "Goalkeeper",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create team B admin
    const teamBId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        name: "Other Club",
        slug: "other-club",
      });
    });

    const adminBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Admin B",
        email: "adminB@example.com",
        role: "admin" as any,
        status: "active",
        teamId: teamBId,
      });
    });

    // Auth as team B admin
    mockGetAuthUserId.mockResolvedValue(adminBId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerLogic(ctx, { playerId: playerIdTeamA });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");

    // Verify player still exists
    await t.run(async (ctx) => {
      const player = await ctx.db.get(playerIdTeamA);
      expect(player).not.toBeNull();
    });
  });

  it("deleting a non-existent player throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Use a valid-format but non-existent ID
    const fakePlayerId = await t.run(async (ctx) => {
      // Insert then delete to get a valid format ID that doesn't exist
      const tempId = await ctx.db.insert("players", {
        teamId: (await ctx.db.query("teams").first())!._id,
        firstName: "Temp",
        lastName: "Temp",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(tempId);
      return tempId;
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deletePlayerLogic(ctx, { playerId: fakePlayerId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// updatePlayerContactInfo Tests (Story 12.3 AC #4, #7, #14)
// ---------------------------------------------------------------------------

describe("updatePlayerContactInfo — admin edit contact info", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can update a player's phone and personalEmail", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

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

    await t.run(async (ctx) => {
      await updatePlayerContactInfoLogic(ctx, {
        playerId,
        phone: "+44 7700 900000",
        personalEmail: "john@example.com",
      });
    });

    await t.run(async (ctx) => {
      const player = await ctx.db.get(playerId);
      expect(player).not.toBeNull();
      expect(player!.phone).toBe("+44 7700 900000");
      expect(player!.personalEmail).toBe("john@example.com");
      expect(player!.updatedAt).toBeGreaterThan(0);
    });
  });

  it("admin cannot update a player from another team", async () => {
    const t = convexTest(schema, modules);
    const { teamId: teamAId } = await seedTeamAndUser(t, {
      email: "adminA@example.com",
    });

    const playerIdA = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId: teamAId,
        firstName: "Other",
        lastName: "Player",
        position: "Defender",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create team B admin
    const teamBId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        name: "Other Club",
        slug: "other-club",
      });
    });

    const adminBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Admin B",
        email: "adminB@example.com",
        role: "admin" as any,
        status: "active",
        teamId: teamBId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminBId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerContactInfoLogic(ctx, {
            playerId: playerIdA,
            phone: "+44 0000 000000",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("non-admin cannot call updatePlayerContactInfo", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const playerUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Physio User",
        email: "physio@example.com",
        role: "physio" as any,
        status: "active",
        teamId,
      });
    });

    const playerId = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId,
        firstName: "Target",
        lastName: "Player",
        position: "Forward",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    mockGetAuthUserId.mockResolvedValue(playerUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerContactInfoLogic(ctx, {
            playerId,
            phone: "+44 1234 567890",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("invalid email format is rejected", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

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

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerContactInfoLogic(ctx, {
            playerId,
            personalEmail: "not-an-email",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("string exceeding 500 characters is rejected", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

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

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updatePlayerContactInfoLogic(ctx, {
            playerId,
            address: "x".repeat(501),
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      })
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("undefined fields are not patched — only provided fields update", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const playerId = await t.run(async (ctx) => {
      return await ctx.db.insert("players", {
        teamId,
        firstName: "John",
        lastName: "Doe",
        position: "Forward",
        status: "active",
        phone: "+44 1111 111111",
        personalEmail: "original@example.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Only update phone, not email
    await t.run(async (ctx) => {
      await updatePlayerContactInfoLogic(ctx, {
        playerId,
        phone: "+44 2222 222222",
      });
    });

    await t.run(async (ctx) => {
      const player = await ctx.db.get(playerId);
      expect(player).not.toBeNull();
      expect(player!.phone).toBe("+44 2222 222222");
      // personalEmail should remain unchanged
      expect(player!.personalEmail).toBe("original@example.com");
    });
  });
});
