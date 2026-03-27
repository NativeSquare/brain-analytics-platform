import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import { requireRole } from "../lib/auth";

/**
 * List all pending invitations for the admin's team.
 * Returns invites where: acceptedAt is undefined, cancelledAt is undefined,
 * expiresAt > now. Enriched with inviter name.
 */
export const listPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const now = Date.now();
    const invites = await ctx.db
      .query("invitations")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    // Filter to only pending
    const pendingInvites = invites.filter(
      (inv) => !inv.acceptedAt && !inv.cancelledAt && inv.expiresAt > now,
    );

    // Enrich with inviter names
    const result = await Promise.all(
      pendingInvites.map(async (invite) => {
        const inviter = await ctx.db.get(invite.invitedBy);
        return {
          _id: invite._id,
          _creationTime: invite._creationTime,
          email: invite.email,
          name: invite.name,
          role: invite.role,
          expiresAt: invite.expiresAt,
          inviterName: inviter?.name ?? inviter?.email ?? "Unknown",
        };
      }),
    );

    return result;
  },
});

/**
 * Get invitation details by token. No auth required — used on the
 * accept-invite page before the user is authenticated.
 * Returns null if token is invalid, expired, accepted, or cancelled.
 */
export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return null;
    }

    if (invite.acceptedAt) {
      return { status: "accepted" as const };
    }

    if (invite.cancelledAt) {
      return { status: "cancelled" as const };
    }

    if (invite.expiresAt < Date.now()) {
      return { status: "expired" as const };
    }

    // Get inviter name
    const inviter = await ctx.db.get(invite.invitedBy);
    // Get team name
    const team = await ctx.db.get(invite.teamId);

    return {
      status: "valid" as const,
      name: invite.name,
      email: invite.email,
      role: invite.role,
      inviterName: inviter?.name ?? inviter?.email ?? "Unknown",
      teamName: team?.name ?? "Unknown",
    };
  },
});

/**
 * Get team members and pending invitations in a unified view.
 * Admin only.
 */
export const getTeamMembersWithInvites = query({
  args: {},
  handler: async (ctx) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    // Get active team members
    const members = await ctx.db
      .query("users")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    const activeMembers = members
      .filter((m) => m.status !== "deactivated" || m.role)
      .map((m) => ({
        _id: m._id,
        type: "member" as const,
        name: m.name ?? m.fullName ?? "Unknown",
        email: m.email ?? "",
        role: m.role ?? "staff",
        status: (m.status ?? "active") as "active" | "invited" | "deactivated",
        avatarUrl: m.avatarUrl ?? m.image,
        joinedAt: m._creationTime,
      }));

    // Get pending invitations
    const now = Date.now();
    const invites = await ctx.db
      .query("invitations")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();

    const pendingInvites = invites
      .filter((inv) => !inv.acceptedAt && !inv.cancelledAt && inv.expiresAt > now)
      .map((inv) => ({
        _id: inv._id,
        type: "invite" as const,
        name: inv.name,
        email: inv.email,
        role: inv.role,
        status: "invited" as const,
        avatarUrl: undefined as string | undefined,
        joinedAt: inv._creationTime,
        expiresAt: inv.expiresAt,
      }));

    return {
      members: activeMembers,
      invites: pendingInvites,
    };
  },
});
