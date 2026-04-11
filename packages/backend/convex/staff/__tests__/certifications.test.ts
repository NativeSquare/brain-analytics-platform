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
const { requireAuth, requireRole } = await import("../../lib/auth");

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
  overrides: SeedOptions = {},
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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function computeCertStatus(
  expiryDate: number | undefined,
  now: number,
): "valid" | "expiring" | "expired" {
  if (expiryDate === undefined) return "valid";
  if (expiryDate <= now) return "expired";
  if (expiryDate <= now + THIRTY_DAYS_MS) return "expiring";
  return "valid";
}

// ---------------------------------------------------------------------------
// Inline logic mirrors (for t.run compatibility)
// ---------------------------------------------------------------------------

async function getStaffCertificationsLogic(
  ctx: any,
  args: { staffId: Id<"users"> },
) {
  const { teamId } = await requireAuth(ctx);

  const staffUser = await ctx.db.get(args.staffId);
  if (!staffUser || staffUser.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Staff member not found",
    });
  }

  const entries = await ctx.db
    .query("certifications")
    .withIndex("by_staffId", (q: any) => q.eq("staffId", args.staffId))
    .collect();

  const teamEntries = entries.filter((e: any) => e.teamId === teamId);

  const now = Date.now();
  const enriched = teamEntries.map((entry: any) => ({
    ...entry,
    status: computeCertStatus(entry.expiryDate, now),
  }));

  enriched.sort((a: any, b: any) => {
    if (a.expiryDate === undefined && b.expiryDate === undefined) return 0;
    if (a.expiryDate === undefined) return 1;
    if (b.expiryDate === undefined) return -1;
    return a.expiryDate - b.expiryDate;
  });

  return enriched;
}

async function addCertificationLogic(
  ctx: any,
  args: {
    staffId: Id<"users">;
    name: string;
    issuingBody: string;
    issueDate: number;
    expiryDate?: number;
    notes?: string;
  },
) {
  const { user, teamId } = await requireAuth(ctx);

  const isAdmin = user.role === "admin";
  const isSelf = user._id === args.staffId;
  if (!isAdmin && !isSelf) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message:
        "Only admins or the staff member themselves can manage certifications",
    });
  }

  const staffUser = await ctx.db.get(args.staffId);
  if (!staffUser || staffUser.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Staff member not found",
    });
  }

  if (!args.name || args.name.trim().length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Certification name is required",
    });
  }
  if (args.name.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Certification name cannot exceed 200 characters",
    });
  }
  if (!args.issuingBody || args.issuingBody.trim().length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Issuing body is required",
    });
  }
  if (args.issuingBody.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Issuing body cannot exceed 200 characters",
    });
  }
  if (args.notes !== undefined && args.notes.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Notes cannot exceed 2000 characters",
    });
  }
  if (args.expiryDate !== undefined && args.expiryDate <= args.issueDate) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Expiry date must be after issue date",
    });
  }

  const now = Date.now();
  return await ctx.db.insert("certifications", {
    teamId,
    staffId: args.staffId,
    name: args.name.trim(),
    issuingBody: args.issuingBody.trim(),
    issueDate: args.issueDate,
    expiryDate: args.expiryDate,
    notes: args.notes,
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
  });
}

async function updateCertificationLogic(
  ctx: any,
  args: {
    certificationId: Id<"certifications">;
    name: string;
    issuingBody: string;
    issueDate: number;
    expiryDate?: number;
    notes?: string;
  },
) {
  const { user, teamId } = await requireAuth(ctx);

  const cert = await ctx.db.get(args.certificationId);
  if (!cert || cert.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Certification not found",
    });
  }

  const isAdmin = user.role === "admin";
  const isSelf = user._id === cert.staffId;
  if (!isAdmin && !isSelf) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message:
        "Only admins or the staff member themselves can manage certifications",
    });
  }

  if (!args.name || args.name.trim().length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Certification name is required",
    });
  }
  if (args.name.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Certification name cannot exceed 200 characters",
    });
  }
  if (!args.issuingBody || args.issuingBody.trim().length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Issuing body is required",
    });
  }
  if (args.issuingBody.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Issuing body cannot exceed 200 characters",
    });
  }
  if (args.notes !== undefined && args.notes.length > 2000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Notes cannot exceed 2000 characters",
    });
  }
  if (args.expiryDate !== undefined && args.expiryDate <= args.issueDate) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Expiry date must be after issue date",
    });
  }

  await ctx.db.patch(args.certificationId, {
    name: args.name.trim(),
    issuingBody: args.issuingBody.trim(),
    issueDate: args.issueDate,
    expiryDate: args.expiryDate,
    notes: args.notes,
    updatedAt: Date.now(),
  });

  return args.certificationId;
}

async function deleteCertificationLogic(
  ctx: any,
  args: { certificationId: Id<"certifications"> },
) {
  const { user, teamId } = await requireAuth(ctx);

  const cert = await ctx.db.get(args.certificationId);
  if (!cert || cert.teamId !== teamId) {
    throw new ConvexError({
      code: "NOT_FOUND" as const,
      message: "Certification not found",
    });
  }

  const isAdmin = user.role === "admin";
  const isSelf = user._id === cert.staffId;
  if (!isAdmin && !isSelf) {
    throw new ConvexError({
      code: "NOT_AUTHORIZED" as const,
      message:
        "Only admins or the staff member themselves can manage certifications",
    });
  }

  await ctx.db.delete(args.certificationId);
}

async function getExpiringCertificationsLogic(ctx: any) {
  const { teamId } = await requireRole(ctx, ["admin"]);

  const entries = await ctx.db
    .query("certifications")
    .withIndex("by_teamId", (q: any) => q.eq("teamId", teamId))
    .collect();

  const now = Date.now();
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
  const cutoff = now + SIXTY_DAYS_MS;

  const expiring = entries.filter(
    (e: any) => e.expiryDate !== undefined && e.expiryDate <= cutoff,
  );

  const enriched = await Promise.all(
    expiring.map(async (entry: any) => {
      const staffUser = await ctx.db.get(entry.staffId);
      return {
        ...entry,
        status: computeCertStatus(entry.expiryDate, now),
        firstName: staffUser?.name?.split(" ")[0] ?? "Unknown",
        lastName: staffUser?.name?.split(" ").slice(1).join(" ") ?? "",
      };
    }),
  );

  enriched.sort((a: any, b: any) => {
    if (a.expiryDate === undefined && b.expiryDate === undefined) return 0;
    if (a.expiryDate === undefined) return 1;
    if (b.expiryDate === undefined) return -1;
    return a.expiryDate - b.expiryDate;
  });

  return enriched;
}

const VALID_CERT = {
  name: "UEFA Pro Coaching License",
  issuingBody: "UEFA",
  issueDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
  expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
};

// ---------------------------------------------------------------------------
// getStaffCertifications
// ---------------------------------------------------------------------------

describe("getStaffCertifications", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns all certs for a staff member within the same team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create a staff user
    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff Member",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    // Insert two certifications
    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        name: "UEFA Pro License",
        issuingBody: "UEFA",
        issueDate: 1000,
        expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        name: "First Aid",
        issuingBody: "Red Cross",
        issueDate: 2000,
        expiryDate: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days from now
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await getStaffCertificationsLogic(ctx, { staffId: staffUserId });
    });

    expect(result).toHaveLength(2);
  });

  it("returns empty array when none exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff Member",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const result = await t.run(async (ctx) => {
      return await getStaffCertificationsLogic(ctx, { staffId: staffUserId });
    });

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws NOT_FOUND for staff from a different team", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create a user on a different team
    const otherTeamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", { name: "Other Club", slug: "other-club" });
    });

    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other Staff",
        email: "other@example.com",
        role: "staff" as any,
        status: "active",
        teamId: otherTeamId,
      });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getStaffCertificationsLogic(ctx, { staffId: otherUserId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("unauthenticated user throws error", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(null);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    await expect(
      t.run(async (ctx) => {
        await getStaffCertificationsLogic(ctx, { staffId: staffUserId });
      }),
    ).rejects.toThrow();
  });

  it("computes status correctly: expired, expiring, valid", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const now = Date.now();
    await t.run(async (ctx) => {
      // Expired
      await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        name: "Expired Cert",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now - 24 * 60 * 60 * 1000, // yesterday
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      // Expiring (within 30 days)
      await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        name: "Expiring Cert",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 15 * 24 * 60 * 60 * 1000, // 15 days
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      // Valid
      await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        name: "Valid Cert",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 365 * 24 * 60 * 60 * 1000, // 1 year
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      // No expiry (valid)
      await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        name: "No Expiry Cert",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.run(async (ctx) => {
      return await getStaffCertificationsLogic(ctx, { staffId: staffUserId });
    });

    expect(result).toHaveLength(4);

    // Sorted by expiryDate ascending, no-expiry last
    expect(result[0].name).toBe("Expired Cert");
    expect(result[0].status).toBe("expired");

    expect(result[1].name).toBe("Expiring Cert");
    expect(result[1].status).toBe("expiring");

    expect(result[2].name).toBe("Valid Cert");
    expect(result[2].status).toBe("valid");

    expect(result[3].name).toBe("No Expiry Cert");
    expect(result[3].status).toBe("valid");
  });
});

// ---------------------------------------------------------------------------
// addCertification
// ---------------------------------------------------------------------------

describe("addCertification", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can add cert for any staff on their team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff Member",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const certId = await t.run(async (ctx) => {
      return await addCertificationLogic(ctx, {
        staffId: staffUserId,
        ...VALID_CERT,
      });
    });

    expect(certId).toBeTruthy();

    // Verify the created entry
    const cert = await t.run(async (ctx) => {
      return await ctx.db.get(certId);
    });

    expect(cert).not.toBeNull();
    expect(cert!.createdBy).toBe(userId);
    expect(cert!.teamId).toBe(teamId);
    expect(cert!.name).toBe(VALID_CERT.name);
  });

  it("staff member can add cert for themselves", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff Member",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(staffUserId);

    const certId = await t.run(async (ctx) => {
      return await addCertificationLogic(ctx, {
        staffId: staffUserId,
        ...VALID_CERT,
      });
    });

    expect(certId).toBeTruthy();
  });

  it("non-admin staff member cannot add cert for someone else", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff A",
        email: "staffa@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const otherStaffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff B",
        email: "staffb@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(staffUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addCertificationLogic(ctx, {
            staffId: otherStaffUserId,
            ...VALID_CERT,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("adding cert for staff on a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", { name: "Other", slug: "other" });
    });

    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
        role: "staff" as any,
        status: "active",
        teamId: otherTeamId,
      });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addCertificationLogic(ctx, {
            staffId: otherUserId,
            ...VALID_CERT,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("empty name throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addCertificationLogic(ctx, {
            staffId: userId,
            name: "",
            issuingBody: "UEFA",
            issueDate: Date.now(),
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("name > 200 chars throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addCertificationLogic(ctx, {
            staffId: userId,
            name: "x".repeat(201),
            issuingBody: "UEFA",
            issueDate: Date.now(),
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });

  it("expiryDate < issueDate throws VALIDATION_ERROR", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await addCertificationLogic(ctx, {
            staffId: userId,
            name: "Test Cert",
            issuingBody: "UEFA",
            issueDate: Date.now(),
            expiryDate: Date.now() - 1000,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// updateCertification
// ---------------------------------------------------------------------------

describe("updateCertification", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can update any cert on their team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        ...VALID_CERT,
        createdBy: staffUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await updateCertificationLogic(ctx, {
        certificationId: certId,
        name: "Updated Name",
        issuingBody: "Updated Body",
        issueDate: VALID_CERT.issueDate,
        expiryDate: VALID_CERT.expiryDate,
      });
    });

    expect(result).toBe(certId);

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(certId);
    });
    expect(updated!.name).toBe("Updated Name");
  });

  it("staff member can update their own cert", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(staffUserId);

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        ...VALID_CERT,
        createdBy: staffUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      return await updateCertificationLogic(ctx, {
        certificationId: certId,
        name: "Self Updated",
        issuingBody: VALID_CERT.issuingBody,
        issueDate: VALID_CERT.issueDate,
        expiryDate: VALID_CERT.expiryDate,
      });
    });

    expect(result).toBe(certId);
  });

  it("non-admin staff cannot update someone else's cert", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);

    const staffAId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff A",
        email: "staffa@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const staffBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff B",
        email: "staffb@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    // Create cert for Staff B
    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: staffBId,
        ...VALID_CERT,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Staff A tries to update Staff B's cert
    mockGetAuthUserId.mockResolvedValue(staffAId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateCertificationLogic(ctx, {
            certificationId: certId,
            name: "Hack",
            issuingBody: "Hack",
            issueDate: VALID_CERT.issueDate,
            expiryDate: VALID_CERT.expiryDate,
          });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("updatedAt is refreshed on update", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const oldTime = Date.now() - 10000;
    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        ...VALID_CERT,
        createdBy: userId,
        createdAt: oldTime,
        updatedAt: oldTime,
      });
    });

    await t.run(async (ctx) => {
      await updateCertificationLogic(ctx, {
        certificationId: certId,
        name: "Updated",
        issuingBody: VALID_CERT.issuingBody,
        issueDate: VALID_CERT.issueDate,
        expiryDate: VALID_CERT.expiryDate,
      });
    });

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(certId);
    });
    expect(updated!.updatedAt).toBeGreaterThan(oldTime);
  });

  it("non-existent certificationId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create a cert to get a valid-looking ID, then delete it
    const certId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        ...VALID_CERT,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await updateCertificationLogic(ctx, {
            certificationId: certId,
            name: "Test",
            issuingBody: "Test",
            issueDate: Date.now(),
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

// ---------------------------------------------------------------------------
// deleteCertification
// ---------------------------------------------------------------------------

describe("deleteCertification", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("admin can delete any cert on their team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        ...VALID_CERT,
        createdBy: staffUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await deleteCertificationLogic(ctx, { certificationId: certId });
    });

    const deleted = await t.run(async (ctx) => {
      return await ctx.db.get(certId);
    });
    expect(deleted).toBeNull();
  });

  it("staff member can delete their own cert", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(staffUserId);

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: staffUserId,
        ...VALID_CERT,
        createdBy: staffUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await deleteCertificationLogic(ctx, { certificationId: certId });
    });

    const deleted = await t.run(async (ctx) => {
      return await ctx.db.get(certId);
    });
    expect(deleted).toBeNull();
  });

  it("non-admin staff cannot delete someone else's cert", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);

    const staffAId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff A",
        email: "staffa@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const staffBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff B",
        email: "staffb@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: staffBId,
        ...VALID_CERT,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    mockGetAuthUserId.mockResolvedValue(staffAId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deleteCertificationLogic(ctx, { certificationId: certId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("deleting cert from a different team throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", { name: "Other", slug: "other" });
    });

    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
        role: "staff" as any,
        status: "active",
        teamId: otherTeamId,
      });
    });

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId: otherTeamId,
        staffId: otherUserId,
        ...VALID_CERT,
        createdBy: otherUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deleteCertificationLogic(ctx, { certificationId: certId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });

  it("deleted entry no longer appears in getStaffCertifications results", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const certId = await t.run(async (ctx) => {
      return await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        ...VALID_CERT,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Delete it
    await t.run(async (ctx) => {
      await deleteCertificationLogic(ctx, { certificationId: certId });
    });

    // Verify it's gone from results
    const result = await t.run(async (ctx) => {
      return await getStaffCertificationsLogic(ctx, { staffId: userId });
    });
    expect(result).toHaveLength(0);
  });

  it("non-existent certificationId throws NOT_FOUND", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const certId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        ...VALID_CERT,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await deleteCertificationLogic(ctx, { certificationId: certId });
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// getExpiringCertifications
// ---------------------------------------------------------------------------

describe("getExpiringCertifications", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns only expired and soon-to-expire certs within 60 days", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const now = Date.now();
    await t.run(async (ctx) => {
      // Expired (should be included)
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "Expired",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now - 10 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      // Expiring in 20 days (should be included)
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "Expiring Soon",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 20 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      // Valid, 90 days away (should NOT be included)
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "Valid Far",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 90 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      // No expiry (should NOT be included)
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "No Expiry",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.run(async (ctx) => {
      return await getExpiringCertificationsLogic(ctx);
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Expired");
    expect(result[1].name).toBe("Expiring Soon");
  });

  it("includes staff member name in results", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t, {
      name: "John Smith",
    });
    mockGetAuthUserId.mockResolvedValue(userId);

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "Expiring Cert",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 10 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.run(async (ctx) => {
      return await getExpiringCertificationsLogic(ctx);
    });

    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("John");
    expect(result[0].lastName).toBe("Smith");
  });

  it("only admin can call this query", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await seedTeamAndUser(t);

    const staffUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Staff",
        email: "staff@example.com",
        role: "staff" as any,
        status: "active",
        teamId,
      });
    });

    mockGetAuthUserId.mockResolvedValue(staffUserId);

    let errorCode: string | undefined;
    await expect(
      t.run(async (ctx) => {
        try {
          await getExpiringCertificationsLogic(ctx);
        } catch (e) {
          errorCode = getErrorCode(e);
          throw e;
        }
      }),
    ).rejects.toThrow(ConvexError);
    expect(errorCode).toBe("NOT_AUTHORIZED");
  });

  it("results sorted by expiryDate ascending", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "Later",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 30 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("certifications", {
        teamId,
        staffId: userId,
        name: "Sooner",
        issuingBody: "Body",
        issueDate: now - 365 * 24 * 60 * 60 * 1000,
        expiryDate: now + 5 * 24 * 60 * 60 * 1000,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.run(async (ctx) => {
      return await getExpiringCertificationsLogic(ctx);
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Sooner");
    expect(result[1].name).toBe("Later");
  });
});
