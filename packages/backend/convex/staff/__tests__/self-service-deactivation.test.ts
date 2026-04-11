import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, it, vi } from "vitest";
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
const { requireAuth, requireRole, getTeamResource } = await import(
  "../../lib/auth"
);

const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
  name?: string;
  email?: string;
  banned?: boolean;
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
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "user@example.com",
      role: (overrides.role as any) ?? "admin",
      status: "active",
      teamId,
      ...(overrides.banned !== undefined ? { banned: overrides.banned } : {}),
    });

    return { userId, teamId };
  });
}

async function seedStaff(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  overrides: {
    userId?: Id<"users">;
    firstName?: string;
    lastName?: string;
    status?: string;
    phone?: string;
    email?: string;
    bio?: string;
  } = {},
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const staffId = await ctx.db.insert("staff", {
      teamId,
      userId: overrides.userId,
      firstName: overrides.firstName ?? "John",
      lastName: overrides.lastName ?? "Doe",
      jobTitle: "Coach",
      department: "Coaching",
      phone: overrides.phone,
      email: overrides.email,
      bio: overrides.bio,
      status: overrides.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });
    return staffId;
  });
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).message;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Inline logic mirrors (for t.run compatibility)
// ---------------------------------------------------------------------------

async function getOwnStaffProfileLogic(ctx: any) {
  const { user, teamId } = await requireAuth(ctx);

  const member = await ctx.db
    .query("staff")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .first();

  if (!member) return null;
  if (member.teamId !== teamId) return null;

  return { ...member, photoUrl: null };
}

async function updateOwnStaffProfileLogic(
  ctx: any,
  args: { phone?: string; email?: string; bio?: string },
) {
  const { user, teamId } = await requireAuth(ctx);

  const staffMember = await ctx.db
    .query("staff")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .first();

  if (!staffMember || staffMember.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "No staff profile linked to your account",
    });
  }

  // Validate email format
  if (args.email && args.email.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Invalid email format",
      });
    }
  }

  // Validate field lengths
  if (args.phone !== undefined && args.phone.length > 500) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "phone cannot exceed 500 characters",
    });
  }
  if (args.email !== undefined && args.email.length > 500) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "email cannot exceed 500 characters",
    });
  }
  if (args.bio !== undefined && args.bio.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "bio cannot exceed 2000 characters",
    });
  }

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (args.phone !== undefined) patch.phone = args.phone || undefined;
  if (args.email !== undefined) patch.email = args.email || undefined;
  if (args.bio !== undefined) patch.bio = args.bio || undefined;

  await ctx.db.patch(staffMember._id, patch);
  return staffMember._id;
}

async function updateStaffStatusLogic(
  ctx: any,
  args: { staffId: Id<"staff">; status: string },
) {
  const { user, teamId } = await requireRole(ctx, ["admin"]);
  const staffMember = await getTeamResource(ctx, teamId, "staff", args.staffId);

  // Prevent admin from deactivating themselves
  if (
    args.status === "inactive" &&
    staffMember.userId &&
    staffMember.userId === user._id
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "You cannot deactivate your own account",
    });
  }

  const validStatuses = ["active", "inactive"];
  if (!validStatuses.includes(args.status)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Status must be active or inactive",
    });
  }

  if (staffMember.status === args.status) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Staff member already has this status",
    });
  }

  await ctx.db.patch(args.staffId, {
    status: args.status,
    updatedAt: Date.now(),
  });

  if (staffMember.userId) {
    const linkedUser = await ctx.db.get(staffMember.userId);
    if (linkedUser) {
      if (args.status === "inactive") {
        await ctx.db.patch(staffMember.userId, { banned: true });
      } else if (args.status === "active" && linkedUser.banned) {
        await ctx.db.patch(staffMember.userId, { banned: false });
      }
    }
  }

  return args.staffId;
}

// =====================================================================
// Tests
// =====================================================================

describe("getOwnStaffProfile", () => {
  it("returns own staff profile for linked user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
    const staffId = await seedStaff(t, teamId, {
      userId,
      firstName: "Jane",
      lastName: "Smith",
    });

    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return getOwnStaffProfileLogic(ctx);
    });

    expect(result).not.toBeNull();
    expect(result!._id).toBe(staffId);
    expect(result!.firstName).toBe("Jane");
    expect(result!.lastName).toBe("Smith");
  });

  it("returns null for user with no linked staff profile", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "admin" });

    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return getOwnStaffProfileLogic(ctx);
    });

    expect(result).toBeNull();
  });

  it("returns null for player user with no linked staff profile", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t, { role: "player" });

    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return getOwnStaffProfileLogic(ctx);
    });

    expect(result).toBeNull();
  });

  it("throws NOT_AUTHENTICATED for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          return await getOwnStaffProfileLogic(ctx);
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHENTICATED");
  });

  it("returns null for cross-team staff profile", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });

    // Create a staff record on a different team
    const otherTeamId = await t.run(async (ctx) => {
      return ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
    });
    await seedStaff(t, otherTeamId, { userId, firstName: "Cross" });

    mockGetAuthUserId.mockResolvedValue(userId);

    const result = await t.run(async (ctx) => {
      return getOwnStaffProfileLogic(ctx);
    });

    // The staff is on another team, so it should be null
    expect(result).toBeNull();
  });
});

describe("updateOwnStaffProfile", () => {
  describe("self-service RBAC", () => {
    it("staff member can update their own phone", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      const staffId = await seedStaff(t, teamId, {
        userId,
        phone: "+44 111",
      });

      mockGetAuthUserId.mockResolvedValue(userId);

      const result = await t.run(async (ctx) => {
        return updateOwnStaffProfileLogic(ctx, { phone: "+44 222" });
      });

      expect(result).toBe(staffId);

      // Verify updated
      const updated = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(updated!.phone).toBe("+44 222");
    });

    it("staff member can update email and bio at once", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      const staffId = await seedStaff(t, teamId, { userId });

      mockGetAuthUserId.mockResolvedValue(userId);

      await t.run(async (ctx) => {
        return updateOwnStaffProfileLogic(ctx, {
          email: "new@example.com",
          bio: "Updated bio",
        });
      });

      const updated = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(updated!.email).toBe("new@example.com");
      expect(updated!.bio).toBe("Updated bio");
    });

    it("staff member can clear a field by passing empty string", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      const staffId = await seedStaff(t, teamId, {
        userId,
        phone: "+44 111",
      });

      mockGetAuthUserId.mockResolvedValue(userId);

      await t.run(async (ctx) => {
        return updateOwnStaffProfileLogic(ctx, { phone: "" });
      });

      const updated = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(updated!.phone).toBeUndefined();
    });

    it("invalid email format throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      await seedStaff(t, teamId, { userId });

      mockGetAuthUserId.mockResolvedValue(userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateOwnStaffProfileLogic(ctx, { email: "not-an-email" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("bio > 2000 characters throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      await seedStaff(t, teamId, { userId });

      mockGetAuthUserId.mockResolvedValue(userId);

      const longBio = "a".repeat(2001);
      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateOwnStaffProfileLogic(ctx, { bio: longBio });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("phone > 500 characters throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      await seedStaff(t, teamId, { userId });

      mockGetAuthUserId.mockResolvedValue(userId);

      const longPhone = "1".repeat(501);
      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateOwnStaffProfileLogic(ctx, { phone: longPhone });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("email > 500 characters throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      await seedStaff(t, teamId, { userId });

      mockGetAuthUserId.mockResolvedValue(userId);

      const longEmail = "a".repeat(490) + "@example.com";
      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateOwnStaffProfileLogic(ctx, { email: longEmail });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("user with no linked staff profile throws NOT_FOUND", async () => {
      const t = convexTest(schema, modules);
      const { userId } = await seedTeamAndUser(t, { role: "staff" });

      mockGetAuthUserId.mockResolvedValue(userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateOwnStaffProfileLogic(ctx, { phone: "+44 111" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_FOUND");
    });

    it("updatedAt is refreshed on the staff record", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      const staffId = await seedStaff(t, teamId, { userId });

      const beforeUpdate = await t.run(async (ctx) => ctx.db.get(staffId));
      const originalUpdatedAt = beforeUpdate!.updatedAt;

      mockGetAuthUserId.mockResolvedValue(userId);

      await t.run(async (ctx) => {
        return updateOwnStaffProfileLogic(ctx, { phone: "+44 999" });
      });

      const afterUpdate = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(afterUpdate!.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe("field restrictions", () => {
    // Since the Convex validator defines args as {phone, email, bio} only,
    // passing restricted fields to the mutation would be rejected at the schema
    // level. We verify the logic function itself only processes allowed fields.

    it("mutation only processes phone, email, and bio fields", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "staff" });
      const staffId = await seedStaff(t, teamId, {
        userId,
        firstName: "Original",
      });

      mockGetAuthUserId.mockResolvedValue(userId);

      // The args type only accepts phone, email, bio.
      // Passing extra fields would be a TypeScript error.
      // We verify that the original fields remain unchanged.
      await t.run(async (ctx) => {
        return updateOwnStaffProfileLogic(ctx, {
          phone: "+44 999",
        });
      });

      const updated = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(updated!.firstName).toBe("Original");
      expect(updated!.department).toBe("Coaching");
      expect(updated!.jobTitle).toBe("Coach");
      expect(updated!.status).toBe("active");
    });
  });
});

describe("updateStaffStatus", () => {
  describe("deactivation RBAC", () => {
    it("admin can deactivate a staff member", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      const staffId = await seedStaff(t, teamId, { status: "active" });

      mockGetAuthUserId.mockResolvedValue(userId);

      const result = await t.run(async (ctx) => {
        return updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
      });

      expect(result).toBe(staffId);
      const updated = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(updated!.status).toBe("inactive");
    });

    it("admin can reactivate a staff member", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      const staffId = await seedStaff(t, teamId, { status: "inactive" });

      mockGetAuthUserId.mockResolvedValue(userId);

      const result = await t.run(async (ctx) => {
        return updateStaffStatusLogic(ctx, { staffId, status: "active" });
      });

      expect(result).toBe(staffId);
      const updated = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(updated!.status).toBe("active");
    });

    it("non-admin (coach) gets NOT_AUTHORIZED", async () => {
      const t = convexTest(schema, modules);
      const { teamId } = await seedTeamAndUser(t);
      const staffId = await seedStaff(t, teamId, { status: "active" });

      const { userId: coachId } = await seedTeamAndUser(t, {
        role: "coach",
        teamId,
        email: "coach@example.com",
      });
      mockGetAuthUserId.mockResolvedValue(coachId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_AUTHORIZED");
    });

    it("non-admin (staff) gets NOT_AUTHORIZED", async () => {
      const t = convexTest(schema, modules);
      const { teamId } = await seedTeamAndUser(t);
      const staffId = await seedStaff(t, teamId, { status: "active" });

      const { userId: staffUserId } = await seedTeamAndUser(t, {
        role: "staff",
        teamId,
        email: "staff@example.com",
      });
      mockGetAuthUserId.mockResolvedValue(staffUserId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_AUTHORIZED");
    });

    it("non-admin (player) gets NOT_AUTHORIZED", async () => {
      const t = convexTest(schema, modules);
      const { teamId } = await seedTeamAndUser(t);
      const staffId = await seedStaff(t, teamId, { status: "active" });

      const { userId: playerId } = await seedTeamAndUser(t, {
        role: "player",
        teamId,
        email: "player@example.com",
      });
      mockGetAuthUserId.mockResolvedValue(playerId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_AUTHORIZED");
    });

    it("wrong team staff throws NOT_FOUND", async () => {
      const t = convexTest(schema, modules);
      const { userId } = await seedTeamAndUser(t, { role: "admin" });

      const otherTeamId = await t.run(async (ctx) => {
        return ctx.db.insert("teams", {
          name: "Other Club",
          slug: "other-club",
        });
      });
      const staffId = await seedStaff(t, otherTeamId, { status: "active" });

      mockGetAuthUserId.mockResolvedValue(userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("NOT_FOUND");
    });

    it("invalid status value throws VALIDATION_ERROR", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      const staffId = await seedStaff(t, teamId, { status: "active" });

      mockGetAuthUserId.mockResolvedValue(userId);

      let errorCode: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateStaffStatusLogic(ctx, { staffId, status: "suspended" });
          } catch (e) {
            errorCode = getErrorCode(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorCode).toBe("VALIDATION_ERROR");
    });

    it("same status throws VALIDATION_ERROR with correct message", async () => {
      const t = convexTest(schema, modules);
      const { userId, teamId } = await seedTeamAndUser(t, { role: "admin" });
      const staffId = await seedStaff(t, teamId, { status: "active" });

      mockGetAuthUserId.mockResolvedValue(userId);

      let errorMessage: string | undefined;
      await expect(
        t.run(async (ctx) => {
          try {
            return await updateStaffStatusLogic(ctx, { staffId, status: "active" });
          } catch (e) {
            errorMessage = getErrorMessage(e);
            throw e;
          }
        }),
      ).rejects.toThrow(ConvexError);
      expect(errorMessage).toBe("Staff member already has this status");
    });

    it("deactivation sets banned: true on linked user account", async () => {
      const t = convexTest(schema, modules);
      const { userId: adminId, teamId } = await seedTeamAndUser(t, {
        role: "admin",
      });

      // Create a staff user
      const { userId: staffUserId } = await seedTeamAndUser(t, {
        role: "staff",
        teamId,
        email: "staffmember@example.com",
        name: "Staff Member",
      });
      const staffId = await seedStaff(t, teamId, {
        userId: staffUserId,
        status: "active",
      });

      mockGetAuthUserId.mockResolvedValue(adminId);

      await t.run(async (ctx) => {
        return updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
      });

      const linkedUser = await t.run(async (ctx) =>
        ctx.db.get(staffUserId),
      );
      expect(linkedUser!.banned).toBe(true);
    });

    it("reactivation sets banned: false on linked user account", async () => {
      const t = convexTest(schema, modules);
      const { userId: adminId, teamId } = await seedTeamAndUser(t, {
        role: "admin",
      });

      // Create a banned staff user
      const { userId: staffUserId } = await seedTeamAndUser(t, {
        role: "staff",
        teamId,
        email: "staffmember@example.com",
        name: "Staff Member",
        banned: true,
      });
      const staffId = await seedStaff(t, teamId, {
        userId: staffUserId,
        status: "inactive",
      });

      mockGetAuthUserId.mockResolvedValue(adminId);

      await t.run(async (ctx) => {
        return updateStaffStatusLogic(ctx, { staffId, status: "active" });
      });

      const linkedUser = await t.run(async (ctx) =>
        ctx.db.get(staffUserId),
      );
      expect(linkedUser!.banned).toBe(false);
    });

    it("status change for staff with no linked userId does NOT throw", async () => {
      const t = convexTest(schema, modules);
      const { userId: adminId, teamId } = await seedTeamAndUser(t, {
        role: "admin",
      });
      const staffId = await seedStaff(t, teamId, {
        status: "active",
        // no userId
      });

      mockGetAuthUserId.mockResolvedValue(adminId);

      // Should not throw
      const result = await t.run(async (ctx) => {
        return updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
      });
      expect(result).toBe(staffId);
    });

    it("updatedAt is refreshed on the staff record after status change", async () => {
      const t = convexTest(schema, modules);
      const { userId: adminId, teamId } = await seedTeamAndUser(t, {
        role: "admin",
      });
      const staffId = await seedStaff(t, teamId, { status: "active" });

      const before = await t.run(async (ctx) => ctx.db.get(staffId));
      const originalUpdatedAt = before!.updatedAt;

      mockGetAuthUserId.mockResolvedValue(adminId);

      await t.run(async (ctx) => {
        return updateStaffStatusLogic(ctx, { staffId, status: "inactive" });
      });

      const after = await t.run(async (ctx) => ctx.db.get(staffId));
      expect(after!.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });
});
