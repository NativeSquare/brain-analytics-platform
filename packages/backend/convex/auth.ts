import Apple from "@auth/core/providers/apple";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { APP_SLUG } from "@packages/shared";
import { ResendOTP } from "./lib/auth/ResendOTP";
import { ResendOTPPasswordReset } from "./lib/auth/ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // In test mode (IS_TEST=true), skip OTP verification for E2E tests
      verify: process.env.IS_TEST === "true" ? undefined : ResendOTP,
      reset: process.env.IS_TEST === "true" ? undefined : ResendOTPPasswordReset,
      crypto: {
        hashSecret: async (secret) => {
          return secret;
        },
        verifySecret: async (secret, hash) => {
          if (secret === hash) {
            return true;
          }
          throw new ConvexError({ message: "Email or password is incorrect" });
        },
      },
    }),
    GitHub,
    Google,
    Apple({
      profile: (appleInfo) => {
        const name = appleInfo.user
          ? `${appleInfo.user.name.firstName} ${appleInfo.user.name.lastName}`
          : undefined;
        return {
          id: appleInfo.sub,
          name: name,
          email: appleInfo.email,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      console.log("redirectTo: ", redirectTo);
      const allowedRedirects = [
        `${APP_SLUG}://`,
        "http://localhost:3000",
      ];
      // Also allow the SITE_URL origin (production web app)
      const siteUrl = process.env.SITE_URL;
      if (siteUrl) {
        allowedRedirects.push(siteUrl);
      }
      if (!allowedRedirects.includes(redirectTo)) {
        throw new Error(`Invalid redirectTo URI ${redirectTo}`);
      }
      return redirectTo;
    },
    async createOrUpdateUser(ctx, { existingUserId, profile, provider }) {
      // For password / email / verification flows, replicate default behavior
      if (provider.id === "password") {
        if (existingUserId) {
          await ctx.db.patch(existingUserId, {
            ...(profile.emailVerified
              ? { emailVerificationTime: Date.now() }
              : null),
          });
          return existingUserId;
        }
        // New password sign-up: create user with profile data
        const userId = await ctx.db.insert("users", {
          email: profile.email,
          name: profile.name as string | undefined,
        });
        return userId;
      }

      // OAuth sign-ins (google, github, apple)
      const email =
        typeof profile.email === "string"
          ? profile.email.toLowerCase().trim()
          : undefined;
      if (!email) {
        throw new ConvexError({
          message: "OAuth provider did not return an email",
        });
      }

      // Account linking: if the OAuth account already has a linked user, return it
      if (existingUserId) {
        // Update profile fields from provider
        await ctx.db.patch(existingUserId, {
          emailVerificationTime: Date.now(),
        });
        return existingUserId;
      }

      // Check for existing user by email (account linking by email)
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), email))
        .first();
      if (existingUser) {
        return existingUser._id;
      }

      // No existing user — check for a valid invitation
      const invitation = await ctx.db
        .query("invitations")
        .filter((q) =>
          q.and(
            q.eq(q.field("email"), email),
            q.eq(q.field("cancelledAt"), undefined),
            q.eq(q.field("acceptedAt"), undefined),
          ),
        )
        .first();

      if (!invitation) {
        throw new ConvexError({ message: "not-invited" });
      }

      // Check expiry
      if (invitation.expiresAt < Date.now()) {
        throw new ConvexError({ message: "not-invited" });
      }

      // Accept invitation
      await ctx.db.patch(invitation._id, { acceptedAt: Date.now() });

      // Create user — match the pattern from acceptInvite mutation
      const userId = await ctx.db.insert("users", {
        email,
        name: (profile.name as string) ?? undefined,
        fullName: (profile.name as string) ?? undefined,
        role: invitation.role,
        teamId: invitation.teamId,
        status: "active" as const,
        emailVerificationTime: Date.now(),
      });

      return userId;
    },
  },
});
