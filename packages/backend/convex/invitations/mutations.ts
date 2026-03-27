import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireRole } from "../lib/auth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a cryptographically secure random 32-character alphanumeric token.
 * Uses Web Crypto API (available in Convex V8 runtime) instead of Math.random().
 */
function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("coach"),
  v.literal("analyst"),
  v.literal("physio"),
  v.literal("player"),
  v.literal("staff"),
);

/**
 * Create a new invitation. Admin only.
 * Validates email format, checks for duplicate pending invites and existing
 * active team members, generates token, creates record, schedules email.
 */
export const createInvite = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: roleValidator,
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Invalid email address format.",
      });
    }

    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if user already exists as active team member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingUser && existingUser.teamId === teamId && existingUser.status === "active") {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "A user with this email is already a member of this team.",
      });
    }

    // Check for existing pending (non-expired, non-accepted, non-cancelled) invitation
    const now = Date.now();
    const existingInvites = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    const pendingInvite = existingInvites.find(
      (inv) =>
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

    // Create invitation
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

    // Schedule email sending
    await ctx.scheduler.runAfter(0, internal.invitations.actions.sendInviteEmail, {
      invitationId: inviteId,
    });

    return inviteId;
  },
});

/**
 * Accept an invitation. Requires authenticated user (newly signed up).
 * Validates token, checks expiry, verifies email match,
 * assigns role + teamId to user, marks invitation accepted.
 */
export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({
        code: "NOT_AUTHENTICATED" as const,
        message: "Authentication required. Please sign up first.",
      });
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_AUTHENTICATED" as const,
        message: "User record not found.",
      });
    }

    // Look up invitation by token
    const invite = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
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
        message:
          "This invitation has expired. Please ask your admin to send a new one.",
      });
    }

    // Verify email match (normalize both sides — auth may store original casing
    // while createInvite lowercases the invite email)
    if (user.email?.toLowerCase().trim() !== invite.email) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Your email does not match this invitation.",
      });
    }

    // Assign role, teamId, status to user
    await ctx.db.patch(userId, {
      role: invite.role,
      teamId: invite.teamId,
      status: "active" as const,
      name: invite.name,
    });

    // Mark invitation as accepted
    await ctx.db.patch(invite._id, {
      acceptedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Cancel a pending invitation. Admin only.
 * Validates the invitation belongs to admin's team and is still pending.
 */
export const cancelInvite = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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

    return null;
  },
});

/**
 * Resend an invitation email. Admin only.
 * Generates a new token, resets expiry, schedules email.
 */
export const resendInvite = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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

    // Generate new token and reset expiry
    const newToken = generateToken();
    const newExpiresAt = Date.now() + SEVEN_DAYS_MS;

    await ctx.db.patch(args.invitationId, {
      token: newToken,
      expiresAt: newExpiresAt,
    });

    // Schedule email sending
    await ctx.scheduler.runAfter(0, internal.invitations.actions.sendInviteEmail, {
      invitationId: args.invitationId,
    });

    return null;
  },
});
