import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";

/**
 * Get all staff for the authenticated user's team with optional filtering.
 *
 * Story 13.1 AC #3: Accepts optional status, department, and search filters.
 * Resolves photo URLs. Sorts alphabetically by lastName then firstName.
 * Story 13.4 AC #10: Non-admins only see active staff. Admins see all.
 * AC #14: Team-scoped via requireAuth.
 */
export const getStaff = query({
  args: {
    status: v.optional(v.string()),
    department: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { status, department, search }) => {
    const { user, teamId } = await requireAuth(ctx);

    const isAdmin = user.role === "admin";

    // Use appropriate index based on filters provided
    let staffQuery;
    if (status) {
      staffQuery = ctx.db
        .query("staff")
        .withIndex("by_teamId_status", (q) =>
          q.eq("teamId", teamId).eq("status", status)
        );
    } else if (department) {
      staffQuery = ctx.db
        .query("staff")
        .withIndex("by_teamId_department", (q) =>
          q.eq("teamId", teamId).eq("department", department)
        );
    } else {
      staffQuery = ctx.db
        .query("staff")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId));
    }

    let staffMembers = await staffQuery.collect();

    // If both status and department were provided, apply department as in-memory filter
    if (status && department) {
      staffMembers = staffMembers.filter((s) => s.department === department);
    }

    // Story 13.4 AC #10: Non-admins only see active staff
    if (!isAdmin) {
      staffMembers = staffMembers.filter((s) => s.status === "active");
    }

    // In-memory search filter on firstName/lastName (case-insensitive)
    if (search) {
      const term = search.toLowerCase();
      staffMembers = staffMembers.filter(
        (s) =>
          s.firstName.toLowerCase().includes(term) ||
          s.lastName.toLowerCase().includes(term)
      );
    }

    // Sort alphabetically by lastName then firstName
    staffMembers.sort((a, b) => {
      const lastCmp = a.lastName.localeCompare(b.lastName);
      if (lastCmp !== 0) return lastCmp;
      return a.firstName.localeCompare(b.firstName);
    });

    // Resolve photo URLs
    const results = await Promise.all(
      staffMembers.map(async (member) => {
        const photoUrl = member.photo
          ? await ctx.storage.getUrl(
              member.photo as Parameters<typeof ctx.storage.getUrl>[0]
            )
          : null;

        return {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          photoUrl,
          jobTitle: member.jobTitle,
          department: member.department,
          status: member.status,
        };
      })
    );

    return results;
  },
});

/**
 * Get the authenticated user's own staff profile.
 *
 * Story 13.4 AC #1: Accepts no arguments, looks up staff record by userId.
 * Returns null if no linked staff profile exists.
 * AC #14: Team-scoped via requireAuth.
 */
export const getOwnStaffProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user, teamId } = await requireAuth(ctx);

    const member = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!member) {
      return null;
    }

    // Defensive team check
    if (member.teamId !== teamId) {
      return null;
    }

    const photoUrl = member.photo
      ? await ctx.storage.getUrl(
          member.photo as Parameters<typeof ctx.storage.getUrl>[0]
        )
      : null;

    return {
      ...member,
      photoUrl,
    };
  },
});

/**
 * Get a single staff member by ID with full details.
 *
 * Story 13.1 AC #4: Fetches staff, validates team match, resolves photo URL.
 * AC #14: Team-scoped via requireAuth.
 */
export const getStaffById = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const { teamId } = await requireAuth(ctx);

    const member = await ctx.db.get(staffId);
    if (!member || member.teamId !== teamId) {
      return null;
    }

    const photoUrl = member.photo
      ? await ctx.storage.getUrl(
          member.photo as Parameters<typeof ctx.storage.getUrl>[0]
        )
      : null;

    return {
      ...member,
      photoUrl,
    };
  },
});

// ---------------------------------------------------------------------------
// Certification queries (Story 13.3)
// ---------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function computeCertStatus(
  expiryDate: number | undefined,
  now: number,
): "valid" | "expiring" | "expired" {
  if (expiryDate === undefined) return "valid";
  if (expiryDate <= now) return "expired";
  if (expiryDate <= now + THIRTY_DAYS_MS) return "expiring";
  return "valid";
}

/**
 * Get all certifications for a staff member.
 *
 * Story 13.3 AC #2: Accepts staffId (users table), validates team match,
 * returns certifications sorted by expiryDate ascending (no-expiry last).
 * Each entry includes a computed `status` field.
 */
export const getStaffCertifications = query({
  args: { staffId: v.id("users") },
  handler: async (ctx, { staffId }) => {
    const { teamId } = await requireAuth(ctx);

    // Validate the staff member belongs to the same team
    const staffUser = await ctx.db.get(staffId);
    if (!staffUser || staffUser.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Staff member not found",
      });
    }

    const entries = await ctx.db
      .query("certifications")
      .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
      .collect();

    // Filter to same team (belt-and-suspenders)
    const teamEntries = entries.filter((e) => e.teamId === teamId);

    const now = Date.now();
    const enriched = teamEntries.map((entry) => ({
      ...entry,
      status: computeCertStatus(entry.expiryDate, now),
    }));

    // Sort: expired first, then expiring, then valid.
    // Within each group, sort by expiryDate ascending. No-expiry entries at the end.
    enriched.sort((a, b) => {
      // Both have no expiryDate → keep original order
      if (a.expiryDate === undefined && b.expiryDate === undefined) return 0;
      // No expiryDate goes last
      if (a.expiryDate === undefined) return 1;
      if (b.expiryDate === undefined) return -1;
      return a.expiryDate - b.expiryDate;
    });

    return enriched;
  },
});

/**
 * Get team-wide expiring/expired certifications for admin alerts.
 *
 * Story 13.3 AC #13: Admin-only. Returns certifications within 60 days of
 * expiry (or already expired), enriched with staff member name.
 */
export const getExpiringCertifications = query({
  args: {},
  handler: async (ctx) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const entries = await ctx.db
      .query("certifications")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    const now = Date.now();
    const cutoff = now + SIXTY_DAYS_MS;

    // Filter to entries with an expiryDate that is within 60 days or already expired
    const expiring = entries.filter(
      (e) => e.expiryDate !== undefined && e.expiryDate <= cutoff,
    );

    // Enrich with staff member name and status
    const enriched = await Promise.all(
      expiring.map(async (entry) => {
        const staffUser = await ctx.db.get(entry.staffId);
        const displayName =
          staffUser?.fullName ?? staffUser?.name ?? staffUser?.email ?? "Unknown";
        const nameParts = displayName.split(" ");
        return {
          ...entry,
          status: computeCertStatus(entry.expiryDate, now),
          firstName: nameParts[0] ?? "Unknown",
          lastName: nameParts.slice(1).join(" "),
        };
      }),
    );

    // Sort by expiryDate ascending (most urgent first)
    enriched.sort((a, b) => {
      if (a.expiryDate === undefined && b.expiryDate === undefined) return 0;
      if (a.expiryDate === undefined) return 1;
      if (b.expiryDate === undefined) return -1;
      return a.expiryDate - b.expiryDate;
    });

    return enriched;
  },
});
