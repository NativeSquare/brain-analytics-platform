import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth, requireRole, getTeamResource } from "../lib/auth";
import { STAFF_DEPARTMENTS } from "@packages/shared/staff";

/**
 * Create a new staff profile. Admin only.
 *
 * Story 13.1 AC #5: Validates required fields, department, bio length.
 * Inserts with status "active", userId undefined, and timestamps.
 * AC #14: Team-scoped via requireRole.
 */
export const createStaff = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    photo: v.optional(v.string()),
    jobTitle: v.string(),
    department: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
    dateJoined: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    // Validate required fields
    if (!args.firstName.trim()) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "First name is required",
      });
    }
    if (!args.lastName.trim()) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Last name is required",
      });
    }
    if (!args.jobTitle.trim()) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Job title is required",
      });
    }

    // Validate department
    if (
      !(STAFF_DEPARTMENTS as readonly string[]).includes(args.department)
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid department "${args.department}". Must be one of: ${STAFF_DEPARTMENTS.join(", ")}.`,
      });
    }

    // Validate bio length
    if (args.bio && args.bio.length > 5000) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Biography cannot exceed 5000 characters",
      });
    }

    const now = Date.now();
    const staffId = await ctx.db.insert("staff", {
      teamId,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      photo: args.photo,
      jobTitle: args.jobTitle.trim(),
      department: args.department,
      phone: args.phone,
      email: args.email,
      bio: args.bio,
      dateJoined: args.dateJoined,
      status: "active",
      userId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return staffId;
  },
});

/**
 * Update a staff profile. Admin only.
 *
 * Story 13.1 AC #6: Validates team ownership via getTeamResource,
 * validates field values, patches with updatedAt.
 * AC #14: Team-scoped via requireRole.
 */
export const updateStaff = mutation({
  args: {
    staffId: v.id("staff"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    photo: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
    dateJoined: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "staff", args.staffId);

    // Validate fields if provided
    if (args.firstName !== undefined && !args.firstName.trim()) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "First name is required",
      });
    }
    if (args.lastName !== undefined && !args.lastName.trim()) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Last name is required",
      });
    }
    if (args.jobTitle !== undefined && !args.jobTitle.trim()) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Job title is required",
      });
    }
    if (
      args.department !== undefined &&
      !(STAFF_DEPARTMENTS as readonly string[]).includes(args.department)
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid department "${args.department}". Must be one of: ${STAFF_DEPARTMENTS.join(", ")}.`,
      });
    }
    if (args.bio !== undefined && args.bio.length > 5000) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Biography cannot exceed 5000 characters",
      });
    }

    // Build patch object with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.firstName !== undefined) patch.firstName = args.firstName.trim();
    if (args.lastName !== undefined) patch.lastName = args.lastName.trim();
    if (args.photo !== undefined) patch.photo = args.photo;
    if (args.jobTitle !== undefined) patch.jobTitle = args.jobTitle.trim();
    if (args.department !== undefined) patch.department = args.department;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.email !== undefined) patch.email = args.email;
    if (args.bio !== undefined) patch.bio = args.bio;
    if (args.dateJoined !== undefined) patch.dateJoined = args.dateJoined;

    await ctx.db.patch(args.staffId, patch);

    return args.staffId;
  },
});

/**
 * Soft-delete a staff member by setting status to "inactive". Admin only.
 *
 * Story 13.1 AC #7: Validates team ownership, sets status to "inactive".
 * AC #14: Team-scoped via requireRole.
 */
export const deleteStaff = mutation({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, { staffId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    await getTeamResource(ctx, teamId, "staff", staffId);

    await ctx.db.patch(staffId, {
      status: "inactive",
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Staff self-service (Story 13.4 AC #4, #6)
// ---------------------------------------------------------------------------

/**
 * Update the authenticated staff member's own profile.
 *
 * Story 13.4 AC #4: Derives staffId from auth — no staffId param.
 * Only phone, email, and bio are accepted (field allowlist).
 * AC #6: Restricted fields (role, department, jobTitle, status, fullName)
 * are NOT accepted as arguments.
 * AC #14: Team-scoped via requireAuth + userId lookup.
 */
export const updateOwnStaffProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    const staffMember = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!staffMember || staffMember.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "No staff profile linked to your account",
      });
    }

    // Validate email format if provided and non-empty
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

    // Build patch with only provided fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.phone !== undefined) patch.phone = args.phone || undefined;
    if (args.email !== undefined) patch.email = args.email || undefined;
    if (args.bio !== undefined) patch.bio = args.bio || undefined;

    await ctx.db.patch(staffMember._id, patch);

    return staffMember._id;
  },
});

// ---------------------------------------------------------------------------
// Staff status management (Story 13.4 AC #9)
// ---------------------------------------------------------------------------

/**
 * Change staff member status (active/inactive). Admin only.
 *
 * Story 13.4 AC #9: Validates status, handles account side effects.
 * When deactivating: sets banned: true on linked user.
 * When reactivating: sets banned: false on linked user.
 * AC #14: Team-scoped via requireRole.
 */
export const updateStaffStatus = mutation({
  args: {
    staffId: v.id("staff"),
    status: v.string(),
  },
  handler: async (ctx, { staffId, status }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const staffMember = await getTeamResource(ctx, teamId, "staff", staffId);

    // Prevent admin from deactivating themselves
    if (
      status === "inactive" &&
      staffMember.userId &&
      staffMember.userId === user._id
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "You cannot deactivate your own account",
      });
    }

    // Validate status value
    const validStatuses = ["active", "inactive"];
    if (!validStatuses.includes(status)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Status must be active or inactive",
      });
    }

    // Validate status is different
    if (staffMember.status === status) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Staff member already has this status",
      });
    }

    // Update staff status
    await ctx.db.patch(staffId, { status, updatedAt: Date.now() });

    // Handle account side effects
    if (staffMember.userId) {
      const linkedUser = await ctx.db.get(staffMember.userId);
      if (linkedUser) {
        if (status === "inactive") {
          // Deactivate account — uses `banned` field checked by @convex-dev/auth
          await ctx.db.patch(staffMember.userId, { banned: true });
        } else if (status === "active" && linkedUser.banned) {
          // Reactivate account
          await ctx.db.patch(staffMember.userId, { banned: false });
        }
      }
    }

    return staffId;
  },
});

// ---------------------------------------------------------------------------
// Certification mutations (Story 13.3)
// ---------------------------------------------------------------------------

/**
 * Add a certification for a staff member.
 *
 * Story 13.3 AC #3: Admin or self can add. Validates fields.
 */
export const addCertification = mutation({
  args: {
    staffId: v.id("users"),
    name: v.string(),
    issuingBody: v.string(),
    issueDate: v.number(),
    expiryDate: v.optional(v.number()),
    documentId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    // Authorization: admin or self
    const isAdmin = user.role === "admin";
    const isSelf = user._id === args.staffId;
    if (!isAdmin && !isSelf) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message:
          "Only admins or the staff member themselves can manage certifications",
      });
    }

    // Validate staff member belongs to same team
    const staffUser = await ctx.db.get(args.staffId);
    if (!staffUser || staffUser.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Staff member not found",
      });
    }

    // Field validations
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
      documentId: args.documentId,
      notes: args.notes,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing certification.
 *
 * Story 13.3 AC #4: Admin or self (owner of the cert) can update.
 */
export const updateCertification = mutation({
  args: {
    certificationId: v.id("certifications"),
    name: v.string(),
    issuingBody: v.string(),
    issueDate: v.number(),
    expiryDate: v.optional(v.number()),
    documentId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireAuth(ctx);

    // Fetch and validate the certification
    const cert = await ctx.db.get(args.certificationId);
    if (!cert || cert.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Certification not found",
      });
    }

    // Authorization: admin or owner
    const isAdmin = user.role === "admin";
    const isSelf = user._id === cert.staffId;
    if (!isAdmin && !isSelf) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message:
          "Only admins or the staff member themselves can manage certifications",
      });
    }

    // Field validations
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
      documentId: args.documentId,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return args.certificationId;
  },
});

/**
 * Delete a certification entry.
 *
 * Story 13.3 AC #5: Admin or self (owner of the cert) can delete.
 */
export const deleteCertification = mutation({
  args: {
    certificationId: v.id("certifications"),
  },
  handler: async (ctx, { certificationId }) => {
    const { user, teamId } = await requireAuth(ctx);

    // Fetch and validate the certification
    const cert = await ctx.db.get(certificationId);
    if (!cert || cert.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Certification not found",
      });
    }

    // Authorization: admin or owner
    const isAdmin = user.role === "admin";
    const isSelf = user._id === cert.staffId;
    if (!isAdmin && !isSelf) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message:
          "Only admins or the staff member themselves can manage certifications",
      });
    }

    await ctx.db.delete(certificationId);
  },
});
