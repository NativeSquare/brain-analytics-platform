# Story 1.1: Initialize Project from Monorepo Template

Status: done

> **Note:** This story is already implemented by the monorepo template. No dev work needed.
Story Type: fullstack

## Story

As a developer,
I want to set up the project from the NativeSquare monorepo template,
so that I have a working codebase with authentication, routing, and Convex backend ready to build on.

## Acceptance Criteria

1. **Monorepo structure is operational** — The Turborepo monorepo is initialized with `apps/admin` (Next.js), `apps/web` (Next.js), `apps/native` (Expo), `packages/backend` (Convex), `packages/shared`, and `packages/transactional` (React Email / Resend) workspace packages.
2. **Dev server starts without errors** — Running `pnpm dev` from the root starts the Next.js admin app (port 3000) and Convex dev watcher concurrently, with no build or TypeScript errors.
3. **Convex backend is connected and operational** — The Convex development instance is provisioned, `packages/backend/convex/schema.ts` deploys successfully, and the admin app communicates with Convex via the `ConvexProvider`.
4. **Basic authentication flow is functional** — Email/password sign-up, login, email verification (OTP via Resend), password reset, and OAuth providers (GitHub, Google, Apple) are wired and functional through `@convex-dev/auth`.
5. **Admin app renders protected routes** — After login, the user is redirected to the `(app)` route group with a working layout (sidebar shell). Unauthenticated users are redirected to `/login`.
6. **TypeScript strict mode passes** — `pnpm typecheck` runs clean across all workspaces with no errors.
7. **Linting passes** — `pnpm lint` runs clean with the ESLint 9.x configuration.
8. **Package dependencies are locked** — `pnpm-lock.yaml` is committed and `pnpm install --frozen-lockfile` succeeds.

## Tasks / Subtasks

- [ ] **Task 1: Clone and configure monorepo from NativeSquare template** (AC: #1, #8)
  - [ ] 1.1: Initialize the repository from the NativeSquare monorepo template
  - [ ] 1.2: Verify workspace structure: `apps/admin`, `apps/web`, `apps/native`, `packages/backend`, `packages/shared`, `packages/transactional`
  - [ ] 1.3: Verify `pnpm-workspace.yaml` lists `apps/*` and `packages/*`
  - [ ] 1.4: Verify `turbo.json` defines `dev`, `build`, `lint`, `typecheck`, `clean` tasks
  - [ ] 1.5: Run `pnpm install` and commit `pnpm-lock.yaml`

- [ ] **Task 2: Provision Convex development backend** (AC: #3)
  - [ ] 2.1: Run `npx convex dev --once` to provision a Convex development project or link to an existing one
  - [ ] 2.2: Verify `.env.local` in `packages/backend` contains `CONVEX_DEPLOYMENT` and `CONVEX_URL` (or equivalent)
  - [ ] 2.3: Verify `packages/backend/convex/schema.ts` deploys with auth tables (`authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`) plus app tables (`users`, `adminInvites`, `feedback`)
  - [ ] 2.4: Verify Convex dashboard shows the deployed schema with all indexes

- [ ] **Task 3: Configure authentication providers** (AC: #4)
  - [ ] 3.1: Verify `convex/auth.ts` configures `Password` provider with Resend OTP for email verification and password reset
  - [ ] 3.2: Verify OAuth providers (GitHub, Google, Apple) are wired in `convex/auth.ts`
  - [ ] 3.3: Set required environment variables: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`, `RESEND_API_KEY`
  - [ ] 3.4: Test email/password sign-up → OTP verification → login flow manually
  - [ ] 3.5: Verify the `users` table schema includes: `name`, `email`, `image`, `emailVerificationTime`, `phone`, `phoneVerificationTime`, `isAnonymous`, `bio`, `birthDate`, `hasCompletedOnboarding`, `role` (user | admin), `banned`, `banReason`, `banExpires`

- [ ] **Task 4: Verify admin app routing and layout** (AC: #5)
  - [ ] 4.1: Verify `apps/web/src/app/layout.tsx` wraps the app with `ConvexProvider` and `ThemeProvider`
  - [ ] 4.2: Verify `(auth)` route group contains: `/login`, `/otp`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invite`
  - [ ] 4.3: Verify `(app)` route group has a `layout.tsx` with sidebar/app-shell and auth guard (redirects unauthenticated users to `/login`)
  - [ ] 4.4: Verify existing protected routes render after login: `/team`, `/team/[userId]`, `/users`, `/users/[userId]`

- [ ] **Task 5: Validate dev server startup** (AC: #2)
  - [ ] 5.1: Run `pnpm dev` from monorepo root
  - [ ] 5.2: Confirm Next.js admin app is accessible at `http://localhost:3000`
  - [ ] 5.3: Confirm Convex dev watcher is running and syncing schema changes
  - [ ] 5.4: Confirm no TypeScript or runtime errors in terminal output

- [ ] **Task 6: Run static analysis checks** (AC: #6, #7)
  - [ ] 6.1: Run `pnpm typecheck` — must pass with zero errors across all workspaces
  - [ ] 6.2: Run `pnpm lint` — must pass with zero errors
  - [ ] 6.3: Run `pnpm build` for the admin app — must produce a successful build

## Dev Notes

### Architecture Context

This story establishes the **foundation layer** for the entire Brain Analytics Platform. Every subsequent epic and story depends on the infrastructure set up here. The NativeSquare template is a proprietary monorepo starter that provides 80% of the boilerplate out of the box.

**Key architectural decisions already made by the template:**
- **Runtime:** TypeScript 5.9.3 strict mode, React 19.2.3 with React Compiler, Node.js >= 20.19.4
- **Styling:** Tailwind CSS v4, shadcn/ui (new-york style, 56 pre-installed components), tw-animate-css
- **Build:** Turborepo for monorepo orchestration, pnpm 9.0.0 workspace protocol
- **Backend:** Convex 1.29.3 (all business logic as queries/mutations/actions, real-time subscriptions)
- **Auth:** `@convex-dev/auth` with Password + OAuth (GitHub, Google, Apple), Resend for OTP
- **Forms:** react-hook-form + @hookform/resolvers + Zod 4.3.6
- **Data tables:** @tanstack/react-table 8.21.3
- **Date handling:** date-fns 4.1.0
- **Charts:** recharts 2.15.4

**What Story 1.1 does NOT include (deferred to later stories):**
- Custom RBAC roles (Story 2.1 extends the role field from `user | admin` to 6 project-specific roles)
- shadcn preset configuration (Story 1.2)
- Sidebar navigation customization (Story 1.3)
- Reusable UI components (Story 1.4)
- Multi-tenant `teamId` scoping (Story 2.1)

### Project Structure Notes

The monorepo follows this structure (verified against architecture.md):

```
brain-analytics-platform/
├── apps/
│   ├── admin/         ← PRIMARY APP (Sprint 1) — Next.js 16.1.6
│   ├── web/           ← Client-facing Next.js app (minimal in Sprint 1)
│   └── native/        ← Expo React Native (not in Sprint 1 scope)
├── packages/
│   ├── backend/       ← Convex backend (schema, queries, mutations, auth)
│   ├── shared/        ← Shared constants and utilities
│   └── transactional/ ← React Email templates (Resend)
├── turbo.json         ← Turborepo task definitions
├── pnpm-workspace.yaml
└── package.json       ← Root scripts: dev, build, lint, typecheck
```

**Current Convex schema (`packages/backend/convex/schema.ts`):**
- `authTables` (6 tables from @convex-dev/auth)
- `users` — with role field (`user | admin`), ban system, onboarding flag
- `adminInvites` — invitation management
- `feedback` — user feedback

**Auth flow files already in place:**
- `convex/auth.ts` — Provider configuration (Password + OAuth)
- `convex/auth.config.ts` — Convex site URL provider config
- `convex/lib/auth/ResendOTP.ts` — Email verification OTP
- `convex/lib/auth/ResendOTPPasswordReset.ts` — Password reset OTP
- `apps/web/src/app/(auth)/` — All auth pages (login, otp, forgot-password, reset-password, verify-email, accept-invite)

### Alignment with Architecture Document

- **Directory structure:** Matches `architecture.md § Project Structure & Boundaries` — apps/admin as primary, packages/backend for Convex [Source: architecture.md#Complete-Project-Directory-Structure]
- **Auth system:** Template provides `@convex-dev/auth` with Password + OAuth. Architecture requires extending roles in Story 2.1. Current `user | admin` role enum is the template default. [Source: architecture.md#Authentication-&-Security]
- **Build tooling:** Turborepo + pnpm workspace matches architecture spec [Source: architecture.md#Starter-Options-Considered]
- **No detected conflicts or variances** with the architecture document

### References

- [Source: architecture.md#Selected-Starter-NativeSquare-Monorepo-Template] — Full template capabilities and pre-installed dependencies
- [Source: architecture.md#Core-Architectural-Decisions] — Data architecture, auth, API patterns
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming, structure, and enforcement guidelines
- [Source: epics.md#Story-1.1] — Original story definition and BDD acceptance criteria
- [Source: architecture.md#Note] — "Project initialization is already complete. Story 1.1 is done."

### Testing Notes

- **No automated tests required for this story.** This is an infrastructure/setup story.
- **Manual verification checklist:**
  - `pnpm install --frozen-lockfile` succeeds
  - `pnpm dev` starts without errors (Next.js + Convex)
  - Login page renders at `http://localhost:3000/login`
  - Sign up → OTP → verified user flow works
  - Authenticated user sees the app shell layout
  - `pnpm typecheck` passes
  - `pnpm lint` passes
  - `pnpm build` succeeds for admin app

### Environment Variables Required

```
# Convex (auto-generated by npx convex dev)
CONVEX_DEPLOYMENT=dev:xxx
CONVEX_URL=https://xxx.convex.cloud

# Auth OAuth providers
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_APPLE_ID=
AUTH_APPLE_SECRET=

# Email (Resend)
RESEND_API_KEY=

# App
CONVEX_SITE_URL=http://localhost:3000
```

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
