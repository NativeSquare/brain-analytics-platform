"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { APP_ADDRESS, APP_NAME } from "@packages/shared/constants";
import { ROLE_LABELS } from "@packages/shared/roles";
import { renderInviteHtml } from "@packages/transactional";
import { resend } from "../emails";

const APP_DOMAIN = process.env.APP_DOMAIN ?? "dev.nativesquare.fr";
const DEFAULT_FROM = `${APP_NAME} <no-reply@${APP_DOMAIN}>`;

/**
 * Send an invitation email. Internal action called from createInvite and resendInvite.
 * Retrieves invitation details from the DB, constructs URL, renders HTML, sends via Resend.
 * In dev mode, logs to console instead of sending.
 */
export const sendInviteEmail = internalAction({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch invitation details
    const invite = await ctx.runQuery(internal.invitations.internalQueries.getInvitationById, {
      invitationId: args.invitationId,
    });

    if (!invite) {
      console.error(`[sendInviteEmail] Invitation ${args.invitationId} not found`);
      return null;
    }

    // WEB_APP_URL preferred; fall back to ADMIN_URL for backward compat; default to web app port (3000)
    const baseUrl = process.env.WEB_APP_URL || process.env.ADMIN_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/accept-invite?token=${invite.token}`;
    const roleLabel = ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS] ?? invite.role;

    const isDev = process.env.IS_DEV === "true";
    if (isDev) {
      console.log(`[DEV] Invitation email to ${invite.email}`);
      console.log(`[DEV] Role: ${roleLabel}, Team: ${invite.teamName}`);
      console.log(`[DEV] Invite URL: ${inviteUrl}`);
      return null;
    }

    try {
      const html = renderInviteHtml(
        {
          name: invite.name,
          inviteUrl,
          roleLabel,
          teamName: invite.teamName,
          inviterName: invite.inviterName,
        },
        { appName: APP_NAME, appAddress: APP_ADDRESS },
      );

      await resend.sendEmail(ctx, {
        from: DEFAULT_FROM,
        to: invite.email,
        subject: `You're invited to join ${invite.teamName} on ${APP_NAME}`,
        html,
      });
    } catch (error) {
      // Log error but don't crash — admin can resend
      console.error(`[sendInviteEmail] Failed to send email to ${invite.email}:`, error);
    }

    return null;
  },
});
