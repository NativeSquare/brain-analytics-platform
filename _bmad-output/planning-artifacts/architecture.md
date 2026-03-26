---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-25'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/epics.md', 'docs/project-context.md', 'docs/reference/existing-database-schema.md', 'docs/reference/existing-platform-claude.md']
workflowType: 'architecture'
project_name: 'Brain Analytics Platform'
user_name: 'Alex'
date: '2026-03-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
39 FRs organized across 4 domains: Calendar Management (FR1-FR10), Document Management (FR11-FR19), Player Management (FR20-FR32), and Authentication/Navigation (FR33-FR39). The calendar module is the most architecturally complex, requiring recurrence engine, per-occurrence mutations, RSVP state machine, .ics feed generation via HTTP endpoint, and a dedicated real-time TV display mode. Document management introduces file storage with signed URLs, granular permissions (role + user level), and read tracking analytics. Player management spans the widest data surface with bio, stats, fitness, injuries (restricted), contracts (restricted + AI extraction), and self-service editing.

**Non-Functional Requirements:**
14 NFRs with the most impactful being: real-time propagation under 1 second (NFR2, satisfied natively by Convex subscriptions), data-layer access control enforcement (NFR5-NFR8, requiring Convex query/mutation guards on every function), multi-tenant isolation (NFR6, teamId scoping on all tables), and 50MB file upload support (NFR3, Convex storage). AI contract extraction must complete within 30 seconds (NFR4).

**Scale and Complexity:**

- Primary domain: Full-stack SaaS (Next.js + Convex)
- Complexity level: Medium
- Estimated architectural components: ~12 (auth, RBAC, calendar engine, recurrence, notifications, document storage, document permissions, player profiles, stats/fitness logging, injury management, contract AI extraction, .ics feed)

### Technical Constraints and Dependencies

- **Monorepo template**: NativeSquare template provides the foundation (Next.js admin + web apps, Expo mobile, Convex backend, shared package). Architecture must build on existing patterns, not replace them.
- **Convex backend**: All business logic runs as Convex queries/mutations/actions. No traditional REST API or SQL. Real-time is automatic via subscriptions.
- **Auth already in place**: Email/password + OAuth (GitHub, Google, Apple) provided by template. Must extend with RBAC (6 roles) and team-scoped user management.
- **shadcn/ui + Tailwind v4**: 56 components already installed. Design system is established. Calendar UI requires Schedule-X with shadcn theme or equivalent library.
- **Convex storage**: File uploads via Convex storage API with signed URLs. No external object storage needed.
- **AI extraction**: Convex actions can call external APIs (Gemini/Claude) for contract PDF processing. Must handle async processing with status feedback.
- **Testing**: Convex testing via `@convex-dev/test` + `vitest`. Architecture must favor pure, testable Convex functions with clear inputs/outputs to facilitate unit and integration testing of mutations and queries.
- **Single developer**: Architecture must prioritize simplicity, code reuse, and incremental delivery.

### Cross-Cutting Concerns Identified

- **RBAC enforcement**: Every Convex function must validate user role and team membership. Requires a shared auth helper pattern used across all modules.
- **Multi-tenancy**: Every table includes teamId. Every query filters by the authenticated user's team. No exceptions.
- **Real-time subscriptions**: All list views and detail views use Convex useQuery (live subscriptions). No manual polling or cache invalidation needed.
- **Notification system**: Calendar events, document shares, and player onboarding all generate notifications. Requires a centralized notification creation pattern callable from any module's mutations.
- **Permission model**: Documents and calendar events share a similar "accessible by roles + specific users" pattern. This should be a reusable permission-checking utility.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack SaaS monorepo (Next.js + Convex) based on project requirements for a multi-tenant, real-time football operations platform.

### Starter Options Considered

No evaluation of alternative starters needed. The NativeSquare monorepo template was pre-selected as part of the project engagement and is already initialized with a working codebase.

### Selected Starter: NativeSquare Monorepo Template

**Rationale for Selection:**
Proprietary company template providing a production-ready monorepo with auth, multi-app support, and Convex backend pre-configured. Eliminates weeks of boilerplate setup and ensures consistency with the company's deployment and maintenance standards.

**Architectural Decisions Provided by Starter:**

**Language and Runtime:**
- TypeScript 5.9.3 with strict mode enabled
- React 19.2.3 with React Compiler (babel-plugin-react-compiler)
- Node.js >= 20.19.4

**Styling Solution:**
- Tailwind CSS v4 via @tailwindcss/postcss (web/admin apps)
- shadcn/ui with "new-york" style, neutral base color, CSS variables
- tw-animate-css for animation utilities
- tailwind-merge + clsx + class-variance-authority for class composition

**Build Tooling:**
- Turborepo for monorepo orchestration (dev, build, lint, typecheck tasks)
- pnpm 9.0.0 for package management with workspace protocol
- Next.js bundler with React Compiler optimization

**Testing Framework:**
- vitest + @convex-dev/test (to be installed for Convex function testing)

**Code Organization:**
- `apps/admin` -- Next.js admin dashboard (primary app for Sprint 1)
- `apps/web` -- Next.js client-facing app
- `apps/native` -- Expo React Native app (not in Sprint 1 scope)
- `packages/backend` -- Convex backend (schema, queries, mutations, actions, auth)
- `packages/shared` -- Shared constants and utilities
- `packages/transactional` -- React Email templates (Resend integration)

**Development Experience:**
- Hot reload via Next.js dev server + Convex dev watcher
- Path aliases (@/* mapping to src/*)
- ESLint 9.x + Prettier 3.7.4
- next-themes for dark/light mode
- sonner for toast notifications

**Pre-installed UI Components (56 in admin app):**
Form (Input, Textarea, Select, Checkbox, Radio, Toggle, Switch, Slider, Combobox, InputOTP), Display (Avatar, Badge, Alert, Card, Skeleton, Spinner), Layout (Sidebar, Sheet, Drawer, ScrollArea, Resizable), Dialogs (Dialog, AlertDialog, Popover, Tooltip, Command), Navigation (Tabs, Menubar, Breadcrumb), Data (Table with TanStack, Chart with Recharts, Carousel with Embla), plus Accordion, Collapsible, ContextMenu, HoverCard, DropdownMenu.

**Pre-installed Libraries:**
- date-fns 4.1.0 (date manipulation)
- @dnd-kit (drag-and-drop: core, sortable, modifiers, utilities)
- react-day-picker 9.13.0 (date picker)
- @tanstack/react-table 8.21.3 (data tables)
- recharts 2.15.4 (charts)
- react-hook-form 7.71.1 + @hookform/resolvers 5.2.2 + Zod 4.3.6 (forms and validation)
- vaul 1.1.2 (drawer)
- embla-carousel-react 8.6.0 (carousel)
- react-resizable-panels 4 (resizable layouts)
- oslo 1.2.1 (password hashing)

**Auth System:**
- @convex-dev/auth with Password, GitHub, Google, Apple OAuth providers
- Email verification and password reset via Resend OTP
- AdminGuard component for route protection
- User schema with role field (user/admin), ban system, onboarding flag

**Additional Dependencies (Sprint 1):**

- **Calendar UI**: Schedule-X with shadcn theme (`@schedule-x/react`, `@schedule-x/calendar`, `@schedule-x/theme-shadcn`, `@schedule-x/drag-and-drop`, `@schedule-x/event-recurrence`, `@schedule-x/event-modal`, `@schedule-x/calendar-controls`, `@schedule-x/current-time`) -- all free/MIT plugins. Chosen over alternatives (shadcn-event-calendar, charlietlamb/calendar, react-big-calendar, FullCalendar) for: built-in rrule recurrence, free drag-and-drop, dedicated shadcn theme package respecting CSS variables, npm distribution with active maintenance, and custom event rendering for color-coded event types. Paid premium plugins (drag-to-create, interactive modal) are not needed -- we build our own event creation form with shadcn Dialog.
- **Animations**: framer-motion (to be installed) for calendar transitions, modal animations, and micro-interactions across the platform.

**Note:** Project initialization is already complete. Story 1.1 (Initialize Project from Monorepo Template) is done.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data modeling approach (hybrid: arrays for static lists, junction tables for dynamic relations)
- Recurring event storage (materialized occurrences)
- RBAC model (enum on user table)
- Authorization pattern (requireAuth/requireRole helpers)

**Important Decisions (Shape Architecture):**
- Notification pattern (direct insert, no pub/sub)
- ICS feed via Convex HTTP endpoint with per-user token
- AI extraction via Convex actions with status tracking
- Frontend state: Convex useQuery only, no state management library
- Component and page organization

**Deferred Decisions (Post-MVP):**
- CI/CD pipeline automation (manual deploy acceptable for Sprint 1)
- Monitoring and logging infrastructure
- Multi-club onboarding workflow
- Mobile app architecture (Expo, not in Sprint 1)

### Data Architecture

**Database:** Convex (decided by template). All data lives in Convex tables with real-time subscriptions.

**Data Modeling Approach:** Hybrid normalization.
- Arrays for small, static lists: `invitedRoles: string[]` on events, `permittedRoles: string[]` on documents/folders. Simple to write and read when the list is bounded and rarely queried inversely.
- Junction tables for dynamic relations with metadata: `eventRsvps` (userId, eventId, status, reason, respondedAt), `documentReads` (userId, documentId, readAt), `documentUserPermissions` (userId, documentId). Required when the relation carries its own data or needs to be queried from both sides.

**Recurring Events:** Materialized occurrences (Option B).
- A `calendarEventSeries` table stores the rrule definition (frequency, interval, endDate, exceptions).
- Individual `calendarEvents` are generated as separate documents with a `seriesId` reference.
- Per-occurrence editing: modify the individual event document. Cancellation: set `isCancelled: true` on the occurrence.
- Series deletion: delete all events with matching `seriesId`.
- Rationale: Convex queries work best with flat documents. Each occurrence needs its own RSVPs, its own modifications, and its own notification triggers. Generating at creation time is simpler than computing on every read.

**Data Validation:** Zod 4.3.6 schemas shared between frontend forms and Convex argument validators via `packages/shared` or co-located with Convex functions. Convex's built-in `v.*` validators for function arguments, Zod for complex business validation.

### Authentication & Security

**RBAC Model:** Single role enum on user record.
- Extend existing user schema with `role: "admin" | "coach" | "analyst" | "physio" | "player" | "staff"` (replacing the template's simple "user" | "admin").
- One role per user. If a physio is also a coach, they get the role with broader access.
- Role is set by admin during invitation and can be changed by admin.

**Authorization Pattern:** Shared helper functions in `packages/backend/convex/lib/auth.ts`.
```typescript
requireAuth(ctx)                          // returns { user, teamId } or throws
requireRole(ctx, ["admin"])               // returns { user, teamId } or throws
requireRole(ctx, ["admin", "physio"])     // any of these roles
requireSelf(ctx, userId)                  // user can only access own data
requireMedical(ctx)                       // shorthand for physio role check
```
Every query and mutation starts with the appropriate auth check. No Convex middleware -- explicit function calls for clarity and testability.

**Multi-tenant Isolation:** Every table includes `teamId`. Every query filters by `ctx.user.teamId`. Enforced at the auth helper level -- `requireAuth` returns the teamId and all subsequent queries use it. No cross-tenant access is possible at the data layer.

**File Security:** Convex storage with signed URLs. Documents are never publicly accessible. URLs are generated per-request with expiration.

### API & Communication Patterns

**No REST API.** All client-server communication goes through Convex queries (reads), mutations (writes), and actions (side effects). The frontend uses `useQuery` for real-time subscriptions and `useMutation` for writes.

**HTTP Endpoints (Convex httpRouter):**
- `GET /api/calendar/:token` -- ICS feed for external calendar apps. Authenticated via a unique per-user feed token (UUID stored on user record), not session cookies.
- Future: webhook endpoints for external integrations.

**Notification Pattern:** Utility function `createNotification(ctx, { userIds, type, title, message, relatedEntityId })` called directly within mutations that trigger notifications. Supports batch creation (multiple userIds). No event bus or pub/sub -- direct insert into `notifications` table. The notification center UI subscribes via `useQuery` for real-time badge updates.

**AI Contract Extraction:** Convex action pattern.
1. Mutation: Upload PDF to Convex storage, create contract record with `extractionStatus: "pending"`
2. Action (scheduled from mutation): Fetch PDF bytes from storage, call Claude/Gemini API, parse structured response
3. Internal mutation (called from action): Write extracted data, set `extractionStatus: "completed"` or `"failed"`
Real-time UI feedback: frontend subscribes to the contract record and sees status changes live.

**Error Handling:** Convex ConvexError for user-facing errors with structured error codes. Convex's built-in error handling for system errors. Frontend: catch ConvexError in mutation calls, display via sonner toasts.

### Frontend Architecture

**State Management:** No state management library. Convex `useQuery` replaces all server state. Local UI state (form values, modals open/closed, filters) stays in React component state (useState/useReducer). URL state for shareable filters or navigation state via Next.js searchParams.

**Page Structure (apps/admin):**
```
src/app/(app)/
  page.tsx                    -- Homepage (dashboard widgets)
  calendar/
    page.tsx                  -- Month view calendar
    today/page.tsx            -- "What's on Today" TV display (no sidebar layout)
  documents/
    page.tsx                  -- Folder browser with search
  players/
    page.tsx                  -- Player list/table
    [playerId]/page.tsx       -- Player profile (tabbed: Bio, Performance, Fitness, Injuries, Contract, Integrations)
  settings/
    page.tsx                  -- App settings, calendar sync
```

**Component Organization:**
```
src/components/
  calendar/                   -- CalendarView, EventCard, EventForm, EventDetail, RSVPPanel, RecurrenceOptions
  documents/                  -- FolderTree, DocumentCard, UploadDialog, PermissionsPanel, ReadTracker
  players/                    -- PlayerTable, ProfileForm, StatsLog, FitnessLog, InjuryLog, ContractCard
  shared/                     -- StatusBadge, EventTypeBadge, NotificationCenter, PermissionSelector
  ui/                         -- shadcn/ui components (existing)
```

**Convex Function Organization (packages/backend):**
```
convex/
  lib/
    auth.ts                   -- requireAuth, requireRole helpers
    notifications.ts          -- createNotification utility
    permissions.ts            -- checkAccess utility for role+user permissions
  calendar/
    queries.ts                -- getMonthEvents, getEventDetail, getTodayEvents, getUserRsvps
    mutations.ts              -- createEvent, updateEvent, cancelEvent, submitRsvp
    actions.ts                -- generateIcsFeed
  documents/
    queries.ts                -- getFolders, getDocuments, getReadStats
    mutations.ts              -- createFolder, uploadDocument, replaceFile, setPermissions, trackRead
  players/
    queries.ts                -- getPlayers, getPlayerProfile, getStats, getFitness, getInjuries
    mutations.ts              -- createPlayer, updateProfile, addStats, addFitness, logInjury, updateStatus
  contracts/
    queries.ts                -- getContract
    mutations.ts              -- uploadContract, updateExtractedData
    actions.ts                -- extractContractData (AI pipeline)
  notifications/
    queries.ts                -- getUserNotifications, getUnreadCount
    mutations.ts              -- markRead, markAllRead
  schema.ts                   -- All table definitions
```

### Infrastructure & Deployment

**Hosting:**
- Frontend: Vercel (native Next.js support, auto-deploy from Git)
- Backend: Convex Cloud (managed, automatic scaling)
- Email: Resend (transactional emails, already configured in template)

**Environments:**
- Development: `npx convex dev` (local Convex dev instance) + `pnpm dev` (Next.js localhost)
- Staging: Convex staging project + Vercel preview deployments
- Production: Convex production project + Vercel production

**Deployment:** Vercel auto-deploys on push to main. Convex deployment via `npx convex deploy` (integrated into Vercel build or separate GitHub Action). Schema migrations handled by @convex-dev/migrations.

### Decision Impact Analysis

**Implementation Sequence:**
1. RBAC extension (auth helpers, user schema update) -- unblocks all modules
2. Notification system (table + utility) -- used by calendar and documents
3. Permission utilities (role + user access checking) -- used by calendar and documents
4. Calendar module (data model, CRUD, recurrence, RSVP, .ics, TV display)
5. Document module (folders, upload, permissions, read tracking, search)
6. Player module (profiles, stats, fitness, injuries, status management)
7. Contract module (upload, AI extraction, admin-only access)

**Cross-Component Dependencies:**
- Auth helpers are used by every module -- must be built first and thoroughly tested
- Notification utility is called from calendar mutations, document mutations, and player onboarding
- Permission checking pattern (role + user access) is shared between calendar invitations and document permissions
- Player profiles link to user accounts (auth) and contracts (AI extraction)

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Convex Tables (schema.ts):**
- camelCase, plural: `calendarEvents`, `documentReads`, `eventRsvps`, `calendarEventSeries`
- Columns in camelCase: `teamId`, `createdAt`, `startsAt`, `extractionStatus`
- Indexes named: `by_teamId`, `by_eventId`, `by_userId_teamId`

**Convex Functions:**
- Files in camelCase: `queries.ts`, `mutations.ts`, `actions.ts`
- Exported functions in camelCase: `getMonthEvents`, `createEvent`, `submitRsvp`
- Internal helpers prefixed `_` if non-exported: `_validateEventAccess`

**React Components:**
- PascalCase for components: `EventCard.tsx`, `PlayerTable.tsx`, `NotificationCenter.tsx`
- Component files in PascalCase: `EventCard.tsx` (not `event-card.tsx`)
- Hooks in camelCase with `use` prefix: `useCalendarEvents.ts`

**Routes (Next.js):**
- kebab-case for URL segments (Next.js convention): `/calendar/today`, `/players/[playerId]`
- Standard file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

### Structure Patterns

**Testing:**
- Convex unit/integration tests: co-located with Convex modules in `convex/{module}/__tests__/{file}.test.ts` using `@convex-dev/test` + `vitest`
- E2E tests: Playwright in a dedicated `e2e/` folder at monorepo root (via claude-playwright). Covers critical user flows: auth, event creation, document upload, player onboarding.
- Test naming: `{module}.test.ts` or `{function}.test.ts`

**Components by feature (not by type):**
```
components/calendar/EventCard.tsx       -- not components/cards/EventCard.tsx
components/calendar/EventForm.tsx       -- not components/forms/EventForm.tsx
components/shared/StatusBadge.tsx       -- only cross-module components go in shared/
```

**Convex by module:**
```
convex/calendar/queries.ts
convex/calendar/mutations.ts
convex/documents/queries.ts
convex/documents/mutations.ts
convex/lib/auth.ts                     -- shared helpers
convex/lib/notifications.ts
convex/lib/permissions.ts
convex/schema.ts                       -- single schema file, all tables
```

### Format Patterns

**Dates:**
- Convex storage: `number` (Unix timestamp ms via `Date.now()`)
- UI display: `date-fns` for formatting (locale-aware)
- ICS feed: iCalendar RFC5545 format (via rrule/Schedule-X)
- Forms: ISO string from date pickers, converted to timestamp in mutation

**Convex Errors:**
```typescript
throw new ConvexError({ code: "NOT_AUTHORIZED", message: "You don't have access to this resource" })
throw new ConvexError({ code: "NOT_FOUND", message: "Event not found" })
throw new ConvexError({ code: "VALIDATION_ERROR", message: "End date must be after start date" })
```
Standardized codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `EXTRACTION_FAILED`, `UPLOAD_FAILED`

**Frontend Error Handling:**
```typescript
try {
  await mutate(args)
} catch (error) {
  if (error instanceof ConvexError) {
    toast.error(error.data.message)
  }
}
```

### Process Patterns

**Loading States:**
- Convex `useQuery` returns `undefined` while loading:
```typescript
const events = useQuery(api.calendar.queries.getMonthEvents, { month, year })
if (events === undefined) return <Skeleton />  // loading
if (events.length === 0) return <Empty />       // no data
```
- No manual `isLoading` state. Convex handles everything.

**Mutation Feedback:**
- `toast.success()` after successful mutation
- `toast.error()` on caught ConvexError
- No loading spinner on buttons unless action takes > 1s (uploads, AI extraction)

**Auth Guard Pattern (pages):**
- Existing `AdminGuard` in template for admin routes
- No role checking on page level -- everything enforced in Convex. Queries return only authorized data.
- Conditional tabs/sections (e.g., Injuries tab visible only for physio) controlled by a dedicated query that checks role.

**Form Pattern:**
```typescript
const form = useForm<EventFormData>({
  resolver: zodResolver(eventSchema),
  defaultValues: { ... }
})
const createEvent = useMutation(api.calendar.mutations.createEvent)
const onSubmit = async (data: EventFormData) => {
  await createEvent(data)
  toast.success("Event created")
  onClose()
}
```

### Enforcement Guidelines

**All AI Agents MUST:**
- Start every Convex query/mutation with `requireAuth(ctx)` or `requireRole(ctx, [...])`
- Filter by `teamId` in every query without exception
- Use standardized error codes (no free-form strings)
- Co-locate Convex tests with the corresponding module
- Place E2E tests in `e2e/` at monorepo root
- Use `date-fns` for all date formatting (no native `toLocaleDateString()`)
- Use existing shadcn/ui components before creating new ones
- Use Convex `useQuery`/`useMutation` for all server communication

**Anti-patterns to avoid:**
- Never check permissions only on the UI side (always enforce in Convex)
- Never store dates as strings in Convex (always timestamp numbers)
- Never use `fetch()` from frontend to communicate with backend (always Convex useQuery/useMutation)
- Never create global state (Zustand, Context) for server data
- Never use `any` in TypeScript -- use Convex generated types

## Project Structure & Boundaries

### Complete Project Directory Structure

```
brain-analytics-platform/
├── apps/
│   ├── admin/                              # PRIMARY APP (Sprint 1)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx              # Root layout (ConvexProvider, ThemeProvider)
│   │   │   │   ├── (auth)/                 # Auth routes (existing)
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── otp/page.tsx
│   │   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   │   ├── reset-password/page.tsx
│   │   │   │   │   ├── verify-email/page.tsx
│   │   │   │   │   └── accept-invite/page.tsx
│   │   │   │   └── (app)/                  # Protected routes
│   │   │   │       ├── layout.tsx          # AppShell (Sidebar + TopBar + NotificationCenter)
│   │   │   │       ├── page.tsx            # Homepage (dashboard widgets) [Epic 2]
│   │   │   │       ├── calendar/
│   │   │   │       │   ├── page.tsx        # Month view calendar [Epic 3]
│   │   │   │       │   └── today/
│   │   │   │       │       ├── layout.tsx  # No-sidebar layout for TV display
│   │   │   │       │       └── page.tsx    # "What's on Today" [Epic 3]
│   │   │   │       ├── documents/
│   │   │   │       │   └── page.tsx        # Folder browser + search [Epic 4]
│   │   │   │       ├── players/
│   │   │   │       │   ├── page.tsx        # Player list/table [Epic 5]
│   │   │   │       │   └── [playerId]/
│   │   │   │       │       └── page.tsx    # Player profile (tabbed) [Epic 5 + 6]
│   │   │   │       ├── team/               # Existing user management
│   │   │   │       │   └── ...
│   │   │   │       └── settings/
│   │   │   │           └── page.tsx        # Calendar sync, app config
│   │   │   ├── components/
│   │   │   │   ├── ui/                     # shadcn/ui (56 existing components)
│   │   │   │   ├── app/                    # Existing app components (auth, guards)
│   │   │   │   ├── calendar/               # [Epic 3]
│   │   │   │   │   ├── CalendarView.tsx    # Schedule-X wrapper + month view
│   │   │   │   │   ├── EventCard.tsx       # Event display in calendar grid
│   │   │   │   │   ├── EventDetail.tsx     # Event detail panel/modal
│   │   │   │   │   ├── EventForm.tsx       # Create/edit event form
│   │   │   │   │   ├── RecurrenceOptions.tsx # Recurrence frequency picker
│   │   │   │   │   ├── RSVPPanel.tsx       # RSVP responses display + submit
│   │   │   │   │   ├── InvitationSelector.tsx # Role + user invitation picker
│   │   │   │   │   └── TodayDisplay.tsx    # Full-screen TV display component
│   │   │   │   ├── documents/              # [Epic 4]
│   │   │   │   │   ├── FolderTree.tsx      # Folder navigation sidebar
│   │   │   │   │   ├── DocumentCard.tsx    # Document item in list
│   │   │   │   │   ├── DocumentDetail.tsx  # Document view + replace
│   │   │   │   │   ├── UploadDialog.tsx    # File upload + video link form
│   │   │   │   │   ├── PermissionsPanel.tsx # Role + user permission editor
│   │   │   │   │   ├── ReadTracker.tsx     # "Opened by X/Y" indicator
│   │   │   │   │   └── DocumentSearch.tsx  # Search + filter bar
│   │   │   │   ├── players/                # [Epic 5 + 6]
│   │   │   │   │   ├── PlayerTable.tsx     # Player list with filters
│   │   │   │   │   ├── ProfileForm.tsx     # Create/edit player bio
│   │   │   │   │   ├── ProfileHeader.tsx   # Photo, name, status, squad number
│   │   │   │   │   ├── StatsLog.tsx        # Performance stats table + form
│   │   │   │   │   ├── FitnessLog.tsx      # Physical data table + form
│   │   │   │   │   ├── InjuryLog.tsx       # Injury history (medical only)
│   │   │   │   │   ├── ContractCard.tsx    # Contract display + upload [Epic 6]
│   │   │   │   │   ├── ExternalProviders.tsx # Provider ID linking
│   │   │   │   │   └── PlayerOnboarding.tsx # Invite player flow
│   │   │   │   ├── shared/                 # Cross-module components
│   │   │   │   │   ├── EventTypeBadge.tsx  # Match/Training/Meeting/Rehab badges
│   │   │   │   │   ├── StatusBadge.tsx     # Active/On Loan/Left the Club badges
│   │   │   │   │   ├── NotificationCenter.tsx # Bell icon + dropdown
│   │   │   │   │   ├── PermissionSelector.tsx # Reusable role+user picker
│   │   │   │   │   └── HomepageWidgets.tsx # Today's events, next match, quick access
│   │   │   │   └── custom/                 # Existing custom components
│   │   │   ├── hooks/
│   │   │   │   └── useCurrentUser.ts       # Typed current user with role
│   │   │   ├── lib/
│   │   │   │   └── utils.ts                # Existing utility functions
│   │   │   └── providers/
│   │   │       └── convex-client-provider.tsx
│   │   ├── components.json
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── web/                                # Client-facing app (minimal in Sprint 1)
│   └── native/                             # Expo mobile (not in Sprint 1)
├── packages/
│   ├── backend/                            # CONVEX BACKEND
│   │   ├── convex/
│   │   │   ├── schema.ts                   # ALL table definitions
│   │   │   ├── auth.ts                     # Existing auth config
│   │   │   ├── auth.config.ts              # OAuth provider config
│   │   │   ├── http.ts                     # HTTP router (.ics endpoint)
│   │   │   ├── crons.ts                    # Scheduled tasks
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts                 # requireAuth, requireRole helpers
│   │   │   │   ├── notifications.ts        # createNotification utility
│   │   │   │   └── permissions.ts          # checkAccess for role+user permissions
│   │   │   ├── calendar/                   # [Epic 3]
│   │   │   │   ├── queries.ts
│   │   │   │   ├── mutations.ts
│   │   │   │   ├── actions.ts              # generateIcsFeed
│   │   │   │   └── __tests__/
│   │   │   │       ├── queries.test.ts
│   │   │   │       └── mutations.test.ts
│   │   │   ├── documents/                  # [Epic 4]
│   │   │   │   ├── queries.ts
│   │   │   │   ├── mutations.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── queries.test.ts
│   │   │   │       └── mutations.test.ts
│   │   │   ├── players/                    # [Epic 5]
│   │   │   │   ├── queries.ts
│   │   │   │   ├── mutations.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── queries.test.ts
│   │   │   │       └── mutations.test.ts
│   │   │   ├── contracts/                  # [Epic 6]
│   │   │   │   ├── queries.ts
│   │   │   │   ├── mutations.ts
│   │   │   │   ├── actions.ts              # extractContractData (AI pipeline)
│   │   │   │   └── __tests__/
│   │   │   │       └── mutations.test.ts
│   │   │   ├── notifications/
│   │   │   │   ├── queries.ts
│   │   │   │   ├── mutations.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── queries.test.ts
│   │   │   └── users/                      # Existing + extended
│   │   │       ├── queries.ts
│   │   │       └── mutations.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/
│   │   ├── constants.js
│   │   └── package.json
│   └── transactional/
│       ├── emails/
│       │   ├── player-invite.tsx           # [Epic 5]
│       │   └── event-notification.tsx      # [Epic 3]
│       └── package.json
├── e2e/                                    # E2E tests (Playwright)
│   ├── playwright.config.ts
│   ├── auth.setup.ts
│   ├── calendar.spec.ts
│   ├── documents.spec.ts
│   ├── players.spec.ts
│   └── fixtures/
│       └── test-data.ts
├── docs/
│   ├── project-context.md
│   ├── reference/
│   └── contracts/
├── _bmad-output/
│   ├── planning-artifacts/
│   │   ├── prd.md
│   │   ├── epics.md
│   │   ├── architecture.md
│   │   └── sprint1-scope-clarification.md
│   └── implementation-artifacts/
├── _bmad/
├── .claude/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

### Architectural Boundaries

**Data Boundary:**
All data access goes through `packages/backend/convex/`. No direct database calls from frontend. Convex enforces this by design -- the frontend can only call exported queries/mutations/actions.

**Auth Boundary:**
`convex/lib/auth.ts` is the single gate. Every Convex function calls it. No auth logic in frontend components. Frontend only reads the user object from `useQuery(api.users.queries.currentUser)` to conditionally render UI.

**Module Boundaries:**
Each module (calendar, documents, players, contracts, notifications) is self-contained in its Convex directory. Cross-module communication happens through:
- `convex/lib/notifications.ts` -- any module can create notifications
- `convex/lib/permissions.ts` -- shared role+user access checking
- `convex/schema.ts` -- single source of truth for all tables (no per-module schemas)

**Frontend-Backend Boundary:**
- Frontend: `apps/admin/src/` -- React components, pages, hooks
- Backend: `packages/backend/convex/` -- all business logic, data access, validation
- No business logic in frontend. Components are thin -- they call Convex functions and render the result.

### Requirements to Structure Mapping

| Epic | Frontend (apps/admin/src/) | Backend (packages/backend/convex/) |
|------|---------------------------|-----------------------------------|
| Epic 1: Design System | components/ui/, components/shared/, globals.css | -- |
| Epic 2: Auth & Homepage | app/(app)/page.tsx, components/shared/HomepageWidgets.tsx | users/, lib/auth.ts |
| Epic 3: Calendar | app/(app)/calendar/, components/calendar/ | calendar/, notifications/, http.ts |
| Epic 4: Documents | app/(app)/documents/, components/documents/ | documents/, notifications/ |
| Epic 5: Players | app/(app)/players/, components/players/ | players/, notifications/ |
| Epic 6: Contracts | components/players/ContractCard.tsx | contracts/ |

### Cross-Cutting Concerns Mapping

| Concern | Location |
|---------|----------|
| RBAC enforcement | `convex/lib/auth.ts` |
| Multi-tenancy | `convex/lib/auth.ts` (teamId from requireAuth) |
| Notifications | `convex/lib/notifications.ts` + `convex/notifications/` |
| Permissions (role+user) | `convex/lib/permissions.ts` |
| Event type badges | `components/shared/EventTypeBadge.tsx` |
| Status badges | `components/shared/StatusBadge.tsx` |
| Email templates | `packages/transactional/emails/` |

### Data Flow

```
User Action -> React Component -> useMutation(api.module.mutations.fn)
  -> Convex Mutation -> requireAuth(ctx) -> business logic -> db.insert/patch/delete
  -> (optional) createNotification() -> notifications table
  -> Convex Subscription -> useQuery auto-updates all connected clients
```

```
AI Extraction Flow:
Upload PDF -> mutation (save to storage, status: pending)
  -> scheduler.runAfter(0, internal.contracts.actions.extract)
  -> action (fetch PDF, call Claude API, parse response)
  -> internal mutation (save extracted data, status: completed)
  -> frontend subscription sees status change live
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
All technology choices are compatible and verified. Next.js 16 + React 19 + Convex 1.29 runs as the template demonstrates. Schedule-X shadcn theme integrates with existing CSS variables. framer-motion supports React 19 (v11+). Zod 4.3.6 + react-hook-form + @hookform/resolvers form a validated chain. @convex-dev/test + vitest is the official Convex testing stack. No version conflicts detected.

**Pattern Consistency:**
Naming conventions are internally consistent: camelCase for Convex (tables, columns, functions), PascalCase for React components, kebab-case for routes (Next.js convention). Auth helper pattern (requireAuth/requireRole) is the single entry point for all authorization, used uniformly across modules. No contradictions between patterns.

**Structure Alignment:**
Frontend feature folders (calendar/, documents/, players/) mirror Convex module folders. Tests are co-located with backend modules. E2E tests are separated at monorepo root. Integration points are clearly defined through shared lib/ utilities.

### Requirements Coverage Validation

**Functional Requirements: 39/39 covered**
- FR1-FR10 (Calendar): convex/calendar/ + components/calendar/ + http.ts for .ics feed
- FR11-FR19 (Documents): convex/documents/ + components/documents/
- FR20-FR32 (Players): convex/players/ + convex/contracts/ + components/players/
- FR33-FR36 (Auth/RBAC): convex/lib/auth.ts + convex/users/ + existing template auth
- FR37-FR39 (Navigation/Homepage): app/(app)/layout.tsx + components/shared/HomepageWidgets.tsx

**Non-Functional Requirements: 14/14 covered**
- NFR1-2 (Performance/Real-time): Native Convex subscriptions
- NFR3 (50MB upload): Convex storage
- NFR4 (AI extraction 30s): Convex action with status tracking
- NFR5-8 (Security): requireAuth/requireRole in every function + teamId isolation
- NFR9 (Signed URLs): Native Convex storage
- NFR10 (Auth): Existing template auth
- NFR11 (Multi-tenant): teamId on all tables
- NFR12-13 (Responsive): Tailwind v4 responsive utilities
- NFR14 (.ics compatibility): Convex HTTP endpoint

### Gap Analysis Results

**Critical Gaps: None.** All FRs and NFRs are architecturally supported.

**Important Gaps (intentionally deferred):**
- Detailed Convex schema (columns, types, indexes per table) is not in this document. It will be defined story-by-story per the project-context strategy. This is intentional.
- LLM choice for contract extraction (Claude vs Gemini) is not fixed. Both work via Convex actions. Decision deferred to Epic 6 implementation.

**Nice-to-Have Gaps (post-Sprint 1):**
- Production monitoring and logging infrastructure
- Rate limiting on .ics HTTP endpoint (low risk with single tenant)
- Automated CI/CD pipeline (manual deploy acceptable for Sprint 1)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Proven stack: NativeSquare template provides 80% of infrastructure out of the box
- Convex drastically simplifies: real-time, auth, storage are native -- no plumbing to build
- Single RBAC pattern (requireAuth/requireRole) applied uniformly and testable
- Clear structure: 1 module = 1 Convex folder + 1 components folder
- Every decision is traceable to a FR/NFR
- Testing strategy covers both unit (vitest + @convex-dev/test) and E2E (Playwright)

**Areas for Future Enhancement:**
- Detailed data schema (column-level) -- defined per story during implementation
- LLM choice for contract extraction -- decided during Epic 6
- CI/CD automation and monitoring -- post Sprint 1

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt about a pattern, check the Enforcement Guidelines section

**Implementation Sequence:**
1. RBAC extension (auth helpers, user schema update) -- unblocks all modules
2. Notification system (table + utility) -- used by calendar and documents
3. Permission utilities (role + user access checking) -- used by calendar and documents
4. Calendar module (data model, CRUD, recurrence, RSVP, .ics, TV display)
5. Document module (folders, upload, permissions, read tracking, search)
6. Player module (profiles, stats, fitness, injuries, status management)
7. Contract module (upload, AI extraction, admin-only access)
