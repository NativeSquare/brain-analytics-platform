import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Internal query to fetch invitation details for the email action.
 * Not exposed to the client.
 */
export const getInvitationById = internalQuery({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.invitationId);
    if (!invite) return null;

    const inviter = await ctx.db.get(invite.invitedBy);
    const team = await ctx.db.get(invite.teamId);

    return {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      token: invite.token,
      teamName: team?.name ?? "Unknown",
      inviterName: inviter?.name ?? inviter?.email ?? "Unknown",
    };
  },
});
