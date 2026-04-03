# Story 11.2: Google OAuth Authentication

Status: draft
Story Type: fullstack
Points: 5

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` -- that is a separate internal admin panel. Backend auth configuration lives in `packages/backend/convex/`.

> **IMPORTANT: Before creating ANY custom component, check if a shadcn/ui component exists that can be used or extended. Use `npx shadcn@latest add <component>` to install missing shadcn components. Only create custom components when no suitable shadcn component exists.**

## Story

As an invited team member,
I want to sign in with my Google account as an alternative to email/password,
so that I can access the platform faster without managing a separate password.

As a platform administrator,
I want Google OAuth sign-in to enforce the same invitation-based access control as email/password,
so that only pre-invited users can access the platform regardless of sign-in method.

## Epic Context

**Epic 11 -- Cross-Cutting Features:** Features that span multiple areas of the platform. This story adds Google OAuth as an alternative authentication method alongside the existing email/password flow.

**Dependencies:**
- **Epic 2** (Auth & Roles) -- provides the existing Convex Auth infrastructure with email/password, invitation system, user/team membership tables.

**Current auth infrastructure (already in place):**
- `packages/backend/convex/auth.ts` -- Convex Auth configured with `Password`, `GitHub`, `Google`, and `Apple` providers. Google is already imported and registered but the client-side UI does not expose it.
- `packages/backend/convex/auth.config.ts` -- basic Convex Auth config pointing to `CONVEX_SITE_URL`.
- `apps/web/src/components/app/auth/login-form.tsx` -- existing login form with email/password only. Contains a TODO comment: `{/* TODO: Re-enable social providers (Apple, Google, Meta) */}`.
- `apps/web/src/providers/convex-client-provider.tsx` -- `ConvexAuthNextjsProvider` already configured.
- `packages/backend/convex/table/invitations.ts` -- invitation table with `email`, `role`, `teamId`, `token`, `acceptedAt` fields. Indexed by `by_email`.

**Source files (reference implementation in `football-dashboard-2`):**
- `src/app/(auth)/login/page.tsx` -- Google OAuth button alongside email/password form (Supabase-based)

**Architecture difference:** The backend already has Google as a registered Convex Auth provider. The work is primarily: (1) wiring the client-side "Sign in with Google" button, (2) implementing server-side account-linking and invitation-gate logic, and (3) handling edge cases.

---

## Acceptance Criteria (BDD)

### AC-1: Google Cloud Console Configuration (Environment Setup)

**Given** the developer needs to configure Google OAuth
**When** they set up the Google Cloud Console project
**Then** the following are configured:
  - An OAuth 2.0 Client ID of type "Web application" is created in the Google Cloud Console
  - Authorized redirect URIs include the Convex Auth callback URL: `{CONVEX_SITE_URL}/api/auth/callback/google` (for production) and the equivalent localhost URL (for development)
  - The OAuth consent screen is configured with app name "Brain Analytics Platform", the UC Sampdoria support email, and scopes limited to `openid`, `email`, and `profile`
**And** the following environment variables are set in the Convex deployment (via `npx convex env set`):
  - `AUTH_GOOGLE_CLIENT_ID` -- the OAuth 2.0 Client ID
  - `AUTH_GOOGLE_CLIENT_SECRET` -- the OAuth 2.0 Client Secret
**And** the same variables are documented in the project's `.env.example` file with placeholder values

> **Note:** The `Google` provider is already imported and registered in `packages/backend/convex/auth.ts`. Convex Auth's `@auth/core/providers/google` reads `AUTH_GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_CLIENT_SECRET` from environment variables by convention. No code changes are needed in `auth.ts` for the provider itself.

### AC-2: "Sign in with Google" Button on Login Page

**Given** the user navigates to `/login`
**When** the login page renders
**Then** a "Sign in with Google" button is displayed above the email/password form
**And** the button:
  - Uses a standard Google "G" logo SVG icon on the left side of the button text
  - Has the text "Sign in with Google"
  - Uses the shadcn/ui `Button` component with `variant="outline"` styling
  - Spans the full width of the form column (`w-full`)
**And** a visual separator appears between the Google button and the email/password form:
  - A horizontal line with the text "or" centered on it
  - Uses the pattern: `<div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background text-muted-foreground px-2">or</span></div></div>`
**And** the existing email/password form is unchanged below the separator

### AC-3: Google OAuth Sign-In Flow (Happy Path)

**Given** the user clicks "Sign in with Google"
**When** the button click handler fires
**Then** the handler calls `signIn("google", { redirectTo: window.location.origin })` using the `useAuthActions()` hook from `@convex-dev/auth/react`
**And** the user is redirected to Google's OAuth consent screen
**And** after the user authorizes, Google redirects back to the Convex Auth callback URL
**And** Convex Auth processes the OAuth callback, creates or matches an `authAccounts` entry, and establishes a session
**And** the user is redirected to the app's home page (`/`)

### AC-4: Invitation-Gate -- Reject Uninvited Google Users

**Given** a user signs in with Google using an email that does NOT match any record in the `invitations` table (no row where `invitations.email` equals the Google account email)
**When** Convex Auth processes the OAuth callback
**Then** the sign-in is rejected
**And** the user is redirected to the login page with an error query parameter: `/login?error=not-invited`
**And** the login page reads the `error` query parameter and displays the message: "Your Google account is not associated with an invitation. Please contact your team administrator to request access."

**Implementation approach:** Add a `createOrUpdateUser` callback in `convexAuth()` config in `packages/backend/convex/auth.ts`. This callback:
1. Receives the profile from the OAuth provider (including `email`)
2. For OAuth sign-ins (not password), queries the `invitations` table by email
3. If no invitation exists (or all invitations for that email are cancelled), throws a `ConvexError` with message `"not-invited"`
4. If an invitation exists and has not been accepted, marks it as accepted (`acceptedAt: Date.now()`)
5. Creates the user record linked to the correct `teamId` and `role` from the invitation

### AC-5: Account Linking -- Google Email Matches Existing User

**Given** a user already has an account created via email/password with email `user@example.com`
**And** a valid (non-cancelled, non-expired) invitation exists for `user@example.com`
**When** the user clicks "Sign in with Google" and authorizes with the same `user@example.com` Google account
**Then** Convex Auth links the Google OAuth account to the existing user record (same `userId` in the `authAccounts` table)
**And** the user can subsequently sign in with either email/password or Google -- both work
**And** no duplicate user record is created

> **Note:** Convex Auth handles account linking by email automatically when the `createOrUpdateUser` callback returns an existing user's ID. The callback should query `users` by email and return the existing `userId` if found, rather than creating a new user.

### AC-6: Loading and Error States

**Given** the user clicks "Sign in with Google"
**When** the OAuth redirect is in progress
**Then** the Google button shows a loading spinner (using the existing `Spinner` component) and is disabled
**And** all other form elements (email input, password input, login button) are also disabled during the redirect

**Given** the OAuth flow fails for any reason (network error, user cancels on Google's consent screen, Convex Auth error)
**When** the user returns to the login page
**Then** the login page checks for an `error` query parameter
**And** displays a user-friendly error message in the same `formError` area used by the email/password form:
  - `error=not-invited` -> "Your Google account is not associated with an invitation. Please contact your team administrator to request access."
  - `error=OAuthAccountNotLinked` -> "This email is already registered with a different sign-in method. Please sign in with your email and password."
  - Any other error -> "Something went wrong during sign-in. Please try again."

### AC-7: Google OAuth Button Component

**Given** the developer implements the Google sign-in button
**When** they create the component
**Then** the component is placed at `apps/web/src/components/app/auth/google-sign-in-button.tsx`
**And** the component:
  - Is a client component (`"use client"`)
  - Accepts `className` as an optional prop
  - Uses `useAuthActions()` from `@convex-dev/auth/react` to call `signIn("google", { redirectTo: window.location.origin })`
  - Renders the Google "G" logo as an inline SVG (not an external image dependency)
  - Manages its own `isLoading` state: sets `true` on click, resets on error
  - Is exported as a named export `GoogleSignInButton`

### AC-8: TypeScript and Lint Compliance

**Given** all files have been created or modified
**When** `pnpm typecheck` is run from the workspace root
**Then** it passes with zero errors related to the new or modified files
**And** `pnpm lint` passes with zero new errors

---

## Technical Notes

### Files to Create

| File | Purpose |
|---|---|
| `apps/web/src/components/app/auth/google-sign-in-button.tsx` | Google sign-in button component with "G" logo, loading state, and `signIn("google")` call |

### Files to Modify

| File | Change |
|---|---|
| `packages/backend/convex/auth.ts` | Add `createOrUpdateUser` callback to enforce invitation-gate for OAuth sign-ins and handle account linking |
| `apps/web/src/components/app/auth/login-form.tsx` | Import `GoogleSignInButton`, add it above the email/password form with "or" separator, remove the TODO comment, read `error` query param for OAuth error display |
| `apps/web/src/app/(auth)/login/page.tsx` | No changes expected (LoginForm handles everything) |

### Files Unchanged (Already Configured)

| File | Reason |
|---|---|
| `packages/backend/convex/auth.config.ts` | Already has the base config; Google provider env vars are read by convention |
| `packages/backend/convex/auth.ts` (provider registration) | `Google` from `@auth/core/providers/google` is already imported and in the `providers` array |
| `apps/web/src/providers/convex-client-provider.tsx` | `ConvexAuthNextjsProvider` is already configured |

### Environment Variables

| Variable | Where to Set | Convention |
|---|---|---|
| `AUTH_GOOGLE_CLIENT_ID` | Convex deployment env vars | Convex Auth auto-reads this for the Google provider |
| `AUTH_GOOGLE_CLIENT_SECRET` | Convex deployment env vars | Convex Auth auto-reads this for the Google provider |

### Key Implementation Detail: createOrUpdateUser Callback

```typescript
// In packages/backend/convex/auth.ts, add to convexAuth() config:
callbacks: {
  // ... existing redirect callback ...
  async createOrUpdateUser(ctx, { existingUserId, profile, provider }) {
    // For password sign-ins, use default behavior
    if (provider.id === "password") {
      if (existingUserId) return existingUserId;
      // Default user creation for password flow (already handled by accept-invite flow)
      return; // Let Convex Auth handle default creation
    }

    // For OAuth sign-ins (google, github, apple):
    const email = profile.email;
    if (!email) {
      throw new ConvexError({ message: "OAuth provider did not return an email address" });
    }

    // Check if user already exists (account linking)
    if (existingUserId) {
      return existingUserId;
    }

    // Check for existing user by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existingUser) {
      return existingUser._id;
    }

    // Check invitation
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) =>
        q.and(
          q.eq(q.field("cancelledAt"), undefined),
          q.eq(q.field("acceptedAt"), undefined)
        )
      )
      .first();

    if (!invitation) {
      throw new ConvexError({ message: "not-invited" });
    }

    // Accept invitation and create user
    await ctx.db.patch(invitation._id, { acceptedAt: Date.now() });

    // Create user with team membership
    // (follow the same pattern used by the existing accept-invite flow)
    const userId = await ctx.db.insert("users", {
      email,
      name: profile.name ?? invitation.name,
      role: invitation.role,
      teamId: invitation.teamId,
      // ... other required fields per users table schema
    });

    return userId;
  },
},
```

> **Important:** The exact field names in the `users` table insert must match the schema defined in `packages/backend/convex/table/users.ts`. The developer should reference the existing `accept-invite` flow in `packages/backend/convex/invitations/mutations.ts` to ensure consistency.

### Google "G" Logo SVG

Use the official Google "G" logo as an inline SVG for the button. The standard multi-color version:

```tsx
<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
</svg>
```

---

## Testing Notes

### Manual Testing Checklist

- [ ] Google button renders on login page with correct styling
- [ ] Clicking Google button redirects to Google consent screen
- [ ] Authorizing with a Google account linked to a valid invitation signs the user in and redirects to `/`
- [ ] Authorizing with a Google account NOT linked to any invitation shows the "not-invited" error on the login page
- [ ] A user with an existing email/password account can also sign in with Google (same email) -- no duplicate user created
- [ ] After linking, both email/password and Google sign-in work for the same user
- [ ] Cancelling the Google consent screen returns to login page with a generic error
- [ ] Loading spinner appears on the Google button while redirect is in progress
- [ ] Form inputs are disabled during Google redirect
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

### Edge Cases to Verify

- [ ] User with expired invitation tries Google sign-in -> treated as not-invited
- [ ] User with cancelled invitation tries Google sign-in -> treated as not-invited
- [ ] User with already-accepted invitation tries Google sign-in -> links to existing account (does not re-accept)
- [ ] Google account without an email (theoretically possible) -> shows error
- [ ] Multiple invitations for same email (different teams) -> uses the first unaccepted invitation

---

## Out of Scope

- Apple OAuth sign-in button (separate story)
- GitHub OAuth sign-in button (separate story)
- Settings page showing linked auth methods (nice-to-have, separate story)
- Self-registration via Google (explicitly blocked -- invitation required)
- Revoking Google account linking from user settings
- Mobile/native app Google sign-in (Expo app is separate)
