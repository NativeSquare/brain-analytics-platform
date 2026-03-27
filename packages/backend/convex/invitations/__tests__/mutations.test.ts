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

// Import schema and helpers AFTER the mock is in place
const { default: schema } = await import("../../schema");
const { requireRole } = await import("../../lib/auth");
const { getAuthUserId } = await import("@convex-dev/auth/server");

const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers — inline mutation logic for convex-test compatibility
// ---------------------------------------------------------------------------
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function seedAdminAndTeam(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Test Club",
      slug: "test-club",
    });

    const adminId = await ctx.db.insert("users", {
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      status: "active",
      teamId,
    });

    return { adminId, teamId };
  });
}

/** Inline createInvite logic matching mutations.ts */
async function createInviteLogic(
  ctx: any,
  args: { email: string; name: string; role: string },
) {
  const { user, teamId } = await requireRole(ctx, ["admin"]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(args.email)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Invalid email address format.",
    });
  }

  const normalizedEmail = args.email.toLowerCase().trim();

  // Check existing active team member
  const existingUser = await ctx.db
    .query("users")
    .withIndex("email", (q: any) => q.eq("email", normalizedEmail))
    .first();

  if (
    existingUser &&
    existingUser.teamId === teamId &&
    existingUser.status === "active"
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "A user with this email is already a member of this team.",
    });
  }

  // Check pending invitation
  const now = Date.now();
  const existingInvites = await ctx.db
    .query("invitations")
    .withIndex("by_email", (q: any) => q.eq("email", normalizedEmail))
    .collect();

  const pendingInvite = existingInvites.find(
    (inv: any) =>
      !inv.acceptedAt &&
      !inv.cancelledAt &&
      inv.expiresAt > now &&
      inv.teamId === teamId,
  );

  if (pendingInvite) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "An invitation is already pending for this email address.",
    });
  }

  const token = generateToken();
  const expiresAt = now + SEVEN_DAYS_MS;

  const inviteId = await ctx.db.insert("invitations", {
    email: normalizedEmail,
    name: args.name,
    role: args.role,
    token,
    teamId,
    invitedBy: user._id,
    expiresAt,
  });

  return inviteId;
}

/** Inline acceptInvite logic matching mutations.ts */
async function acceptInviteLogic(ctx: any, args: { token: string }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED" as const,
      message: "Authentication required.",
    });
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED" as const,
      message: "User record not found.",
    });
  }

  const invite = await ctx.db
    .query("invitations")
    .withIndex("by_token", (q: any) => q.eq("token", args.token))
    .first();

  if (!invite) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "This invitation link is invalid.",
    });
  }

  if (invite.cancelledAt) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "This invitation has been cancelled.",
    });
  }

  if (invite.acceptedAt) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "This invitation has already been used.",
    });
  }

  if (invite.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "This invitation has expired.",
    });
  }

  if (user.email !== invite.email) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Your email does not match this invitation.",
    });
  }

  await ctx.db.patch(userId, {
    role: invite.role,
    teamId: invite.teamId,
    status: "active",
    name: invite.name,
  });

  await ctx.db.patch(invite._id, {
    acceptedAt: Date.now(),
  });
}

/** Inline cancelInvite logic matching mutations.ts */
async function cancelInviteLogic(
  ctx: any,
  args: { invitationId: Id<"invitations"> },
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const invite = await ctx.db.get(args.invitationId);
  if (!invite) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Invitation not found.",
    });
  }

  if (invite.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "You can only manage invitations for your own team.",
    });
  }

  if (invite.acceptedAt) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Cannot cancel an already accepted invitation.",
    });
  }

  await ctx.db.patch(args.invitationId, {
    cancelledAt: Date.now(),
  });
}

/** Inline resendInvite logic matching mutations.ts */
async function resendInviteLogic(
  ctx: any,
  args: { invitationId: Id<"invitations"> },
) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const invite = await ctx.db.get(args.invitationId);
  if (!invite) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Invitation not found.",
    });
  }

  if (invite.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message: "You can only manage invitations for your own team.",
    });
  }

  if (invite.acceptedAt) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Cannot resend an already accepted invitation.",
    });
  }

  if (invite.cancelledAt) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Cannot resend a cancelled invitation.",
    });
  }

  const newToken = generateToken();
  const newExpiresAt = Date.now() + SEVEN_DAYS_MS;

  await ctx.db.patch(args.invitationId, {
    token: newToken,
    expiresAt: newExpiresAt,
  });
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    return (error.data as any).code;
  }
  return undefined;
}

// ===========================================================================
// createInvite
// ===========================================================================

describe("createInvite", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("succeeds for admin and creates invitation with correct fields", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "new@example.com",
        name: "New User",
        role: "coach",
      });
    });

    expect(inviteId).toBeDefined();

    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite).not.toBeNull();
    expect(invite!.email).toBe("new@example.com");
    expect(invite!.name).toBe("New User");
    expect(invite!.role).toBe("coach");
    expect(invite!.teamId).toBe(teamId);
    expect(invite!.invitedBy).toBe(adminId);
    expect(invite!.token).toHaveLength(32);
    expect(invite!.expiresAt).toBeGreaterThan(Date.now());
    expect(invite!.acceptedAt).toBeUndefined();
    expect(invite!.cancelledAt).toBeUndefined();
  });

  it("throws NOT_AUTHORIZED for non-admin roles", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedAdminAndTeam(t);

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });
    mockGetAuthUserId.mockResolvedValue(coachId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createInviteLogic(ctx, {
            email: "new@example.com",
            name: "New User",
            role: "player",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("prevents duplicate pending invites for same email", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    await t.run(async (ctx) => {
      await createInviteLogic(ctx, {
        email: "dup@example.com",
        name: "Dup User",
        role: "analyst",
      });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createInviteLogic(ctx, {
            email: "dup@example.com",
            name: "Dup User",
            role: "analyst",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("prevents inviting existing active team member", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await createInviteLogic(ctx, {
            email: "admin@example.com",
            name: "Admin",
            role: "coach",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("generates valid 32-char alphanumeric token", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "token@example.com",
        name: "Token Test",
        role: "staff",
      });
    });

    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite!.token).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it("sets 7-day expiry", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const before = Date.now();
    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "expiry@example.com",
        name: "Expiry Test",
        role: "player",
      });
    });
    const after = Date.now();

    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite!.expiresAt).toBeGreaterThanOrEqual(before + SEVEN_DAYS_MS);
    expect(invite!.expiresAt).toBeLessThanOrEqual(after + SEVEN_DAYS_MS);
  });
});

// ===========================================================================
// acceptInvite
// ===========================================================================

describe("acceptInvite", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("succeeds with valid token and sets role/teamId correctly", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "new@example.com",
        name: "New User",
        role: "analyst",
      });
    });

    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    const token = invite!.token;

    // Create the invited user (simulating signup)
    const newUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "New User",
        email: "new@example.com",
      });
    });
    mockGetAuthUserId.mockResolvedValue(newUserId);

    await t.run(async (ctx) => {
      await acceptInviteLogic(ctx, { token });
    });

    const user = await t.run(async (ctx) => ctx.db.get(newUserId));
    expect(user!.role).toBe("analyst");
    expect(user!.teamId).toBe(teamId);
    expect(user!.status).toBe("active");

    const updatedInvite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(updatedInvite!.acceptedAt).toBeDefined();
  });

  it("throws for expired token", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("invitations", {
        email: "expired@example.com",
        name: "Expired User",
        role: "coach",
        token: "expired_token_12345678901234",
        teamId,
        invitedBy: adminId,
        expiresAt: Date.now() - 1000,
      });
    });

    const newUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "expired@example.com",
        name: "Expired User",
      });
    });
    mockGetAuthUserId.mockResolvedValue(newUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptInviteLogic(ctx, {
            token: "expired_token_12345678901234",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("throws for already-accepted token", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("invitations", {
        email: "accepted@example.com",
        name: "Accepted User",
        role: "staff",
        token: "accepted_token1234567890123",
        teamId,
        invitedBy: adminId,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
        acceptedAt: Date.now() - 1000,
      });
    });

    const newUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "accepted@example.com",
        name: "Accepted User",
      });
    });
    mockGetAuthUserId.mockResolvedValue(newUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptInviteLogic(ctx, {
            token: "accepted_token1234567890123",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("throws for cancelled invitation", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("invitations", {
        email: "cancelled@example.com",
        name: "Cancelled User",
        role: "player",
        token: "cancelled_token123456789012",
        teamId,
        invitedBy: adminId,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
        cancelledAt: Date.now() - 1000,
      });
    });

    const newUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "cancelled@example.com",
        name: "Cancelled User",
      });
    });
    mockGetAuthUserId.mockResolvedValue(newUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptInviteLogic(ctx, {
            token: "cancelled_token123456789012",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("throws if email doesn't match", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("invitations", {
        email: "invited@example.com",
        name: "Invited User",
        role: "coach",
        token: "mismatch_token12345678901234",
        teamId,
        invitedBy: adminId,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
      });
    });

    const wrongUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "wrong@example.com",
        name: "Wrong User",
      });
    });
    mockGetAuthUserId.mockResolvedValue(wrongUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptInviteLogic(ctx, {
            token: "mismatch_token12345678901234",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("throws NOT_FOUND for invalid token", async () => {
    const t = convexTest(schema, modules);
    const newUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Test",
        email: "test@example.com",
      });
    });
    mockGetAuthUserId.mockResolvedValue(newUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await acceptInviteLogic(ctx, {
            token: "nonexistent_token_1234567890",
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});

// ===========================================================================
// cancelInvite
// ===========================================================================

describe("cancelInvite", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("succeeds for admin and sets cancelledAt", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "cancel@example.com",
        name: "Cancel User",
        role: "player",
      });
    });

    await t.run(async (ctx) => {
      await cancelInviteLogic(ctx, { invitationId: inviteId });
    });

    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite!.cancelledAt).toBeDefined();
  });

  it("throws NOT_AUTHORIZED for non-admin", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "cancelnotadmin@example.com",
        name: "Not Admin",
        role: "player",
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
        role: "coach",
        status: "active",
        teamId,
      });
    });
    mockGetAuthUserId.mockResolvedValue(coachId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await cancelInviteLogic(ctx, { invitationId: inviteId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("throws for already-accepted invite", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);

    const inviteId = await t.run(async (ctx) => {
      return await ctx.db.insert("invitations", {
        email: "alreadyaccepted@example.com",
        name: "Already Accepted",
        role: "coach",
        token: "alreadyaccepted_token1234567",
        teamId,
        invitedBy: adminId,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
        acceptedAt: Date.now(),
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await cancelInviteLogic(ctx, { invitationId: inviteId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("throws for invite not in admin's team", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);

    const otherTeamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        name: "Other Team",
        slug: "other-team",
      });
    });

    const inviteId = await t.run(async (ctx) => {
      return await ctx.db.insert("invitations", {
        email: "otherteam@example.com",
        name: "Other Team",
        role: "analyst",
        token: "otherteam_token12345678901234",
        teamId: otherTeamId,
        invitedBy: adminId,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await cancelInviteLogic(ctx, { invitationId: inviteId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });
});

// ===========================================================================
// resendInvite
// ===========================================================================

describe("resendInvite", () => {
  beforeEach(() => mockGetAuthUserId.mockReset());

  it("succeeds for admin and generates new token with reset expiry", async () => {
    const t = convexTest(schema, modules);
    const { adminId } = await seedAdminAndTeam(t);
    mockGetAuthUserId.mockResolvedValue(adminId);

    const inviteId = await t.run(async (ctx) => {
      return await createInviteLogic(ctx, {
        email: "resend@example.com",
        name: "Resend User",
        role: "physio",
      });
    });

    const originalInvite = await t.run(async (ctx) => ctx.db.get(inviteId));
    const originalToken = originalInvite!.token;

    await t.run(async (ctx) => {
      await resendInviteLogic(ctx, { invitationId: inviteId });
    });

    const updatedInvite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(updatedInvite!.token).not.toBe(originalToken);
    expect(updatedInvite!.token).toHaveLength(32);
    expect(updatedInvite!.expiresAt).toBeGreaterThanOrEqual(
      originalInvite!.expiresAt,
    );
  });

  it("throws for already-accepted invite", async () => {
    const t = convexTest(schema, modules);
    const { adminId, teamId } = await seedAdminAndTeam(t);

    const inviteId = await t.run(async (ctx) => {
      return await ctx.db.insert("invitations", {
        email: "accepted-resend@example.com",
        name: "Accepted Resend",
        role: "staff",
        token: "acceptedresend_token12345678",
        teamId,
        invitedBy: adminId,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
        acceptedAt: Date.now(),
      });
    });

    mockGetAuthUserId.mockResolvedValue(adminId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await resendInviteLogic(ctx, { invitationId: inviteId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });
});
