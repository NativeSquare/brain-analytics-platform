# Story 1.4: Build Reusable UI Components

Status: dev-complete
Story Type: frontend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **IMPORTANT: Before creating ANY custom component, check if a shadcn/ui component exists that can be used or extended. Use `npx shadcn@latest add <component>` to install missing shadcn components. Only create custom components when no suitable shadcn component exists.**

## Story

As a developer,
I want reusable UI components for event type badges, player status badges, read tracking indicators, folder breadcrumbs, and a notification center shell,
so that all modules use consistent visual patterns without duplicating code and downstream epics can import these components directly.

## Acceptance Criteria (BDD)

### AC-1: Event Type Badges

**Given** the design system is configured (Story 1.2 complete)
**When** the developer renders `<EventTypeBadge type="match" />` (or "training", "meeting", "rehab")
**Then** the badge renders with the correct label and distinct color:
  - Match: red background/text treatment
  - Training: green background/text treatment
  - Meeting: blue background/text treatment
  - Rehab: orange background/text treatment
**And** the badge uses the existing shadcn/ui `Badge` component with CVA variants
**And** each badge includes an appropriate Lucide icon alongside the label
**And** the component accepts an optional `size` prop ("sm" | "default") for use in different contexts (calendar cells vs. detail views)

### AC-2: Player Status Badges

**Given** the design system is configured
**When** the developer renders `<StatusBadge status="active" />` (or "on-loan", "left-the-club")
**Then** the badge renders with the correct label and visually distinct treatment:
  - Active: green/success visual treatment
  - On Loan: amber/warning visual treatment
  - Left the Club: muted/gray visual treatment
**And** the badge uses the existing shadcn/ui `Badge` component with CVA variants
**And** each status has an accompanying icon (e.g., check, arrow-right-left, log-out)

### AC-3: Read Tracking Indicator

**Given** a document has read tracking data (openCount and totalAccessCount)
**When** the developer renders `<ReadTrackingIndicator opened={18} total={25} />`
**Then** the indicator displays the text "Opened by 18/25"
**And** a progress bar (using shadcn/ui `Progress` component) shows the proportion visually (72%)
**And** the component renders gracefully when total is 0 (shows "No access" or similar)
**And** the indicator has a compact mode for use in table rows and a default mode for card displays

### AC-4: Folder Breadcrumbs

**Given** the user is navigating the Document Hub folder structure
**When** the developer renders `<FolderBreadcrumb segments={[{id: "root", label: "Documents"}, {id: "abc", label: "Playbooks"}, {id: "def", label: "Attacking"}]} />`
**Then** the breadcrumb displays "Documents > Playbooks > Attacking"
**And** all segments except the last are clickable links
**And** clicking a segment fires an `onNavigate(folderId)` callback
**And** the component uses the existing shadcn/ui `Breadcrumb` primitives (Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator)
**And** the breadcrumb truncates gracefully if the path is very long (using BreadcrumbEllipsis)

### AC-5: Notification Center Shell

**Given** the user is authenticated and the top bar is rendered
**When** the developer renders `<NotificationCenter />`
**Then** a bell icon (Lucide `Bell`) is displayed
**And** an unread count badge is shown on the bell icon when `count > 0` (placeholder prop for now)
**And** clicking the bell opens a dropdown/popover (using shadcn/ui `Popover` or `DropdownMenu`)
**And** the dropdown contains a placeholder list of notification items with title, message, and timestamp layout
**And** a "Mark all as read" button is present in the dropdown header
**And** the component exposes props for `notifications`, `unreadCount`, and `onMarkAllRead` so it can be wired to Convex queries in Epic 3

### AC-6: Component Export & Documentation

**Given** all five components are built
**When** the developer checks the `components/shared/` directory
**Then** each component is exported from its own file following PascalCase naming
**And** each component has TypeScript prop types fully defined (no `any`)
**And** each component can be imported and rendered in isolation without any backend dependency (all data via props)

## Tasks / Subtasks

- [x] Task 1: Create `components/shared/` directory structure (AC: #6)
  - [x] 1.1 Create `apps/web/src/components/shared/` directory
  - [x] 1.2 Create barrel `index.ts` export file

- [x] Task 2: Build EventTypeBadge component (AC: #1)
  - [x] 2.1 Define `EventType` type: `"match" | "training" | "meeting" | "rehab"`
  - [x] 2.2 Define color mapping using CVA variants extending the base `Badge` component
  - [x] 2.3 Map each event type to a Lucide icon (e.g., `Trophy` for match, `Dumbbell` for training, `Users` for meeting, `Heart` for rehab)
  - [x] 2.4 Implement `size` prop ("sm" | "default") controlling padding/font-size
  - [x] 2.5 Export `EventTypeBadge` from `EventTypeBadge.tsx`

- [x] Task 3: Build StatusBadge component (AC: #2)
  - [x] 3.1 Define `PlayerStatus` type: `"active" | "on-loan" | "left-the-club"`
  - [x] 3.2 Define color mapping using CVA variants extending the base `Badge` component
  - [x] 3.3 Map each status to a Lucide icon (e.g., `CircleCheck` for active, `ArrowRightLeft` for on-loan, `LogOut` for left-the-club)
  - [x] 3.4 Export `StatusBadge` from `StatusBadge.tsx`

- [x] Task 4: Build ReadTrackingIndicator component (AC: #3)
  - [x] 4.1 Define props: `opened: number`, `total: number`, `compact?: boolean`
  - [x] 4.2 Compose with shadcn/ui `Progress` component for visual bar
  - [x] 4.3 Calculate and display percentage; handle `total === 0` edge case
  - [x] 4.4 Implement compact mode (inline text + thin bar) vs. default mode (stacked text + bar)
  - [x] 4.5 Export `ReadTrackingIndicator` from `ReadTrackingIndicator.tsx`

- [x] Task 5: Build FolderBreadcrumb component (AC: #4)
  - [x] 5.1 Define `BreadcrumbSegment` type: `{ id: string; label: string }`
  - [x] 5.2 Define props: `segments: BreadcrumbSegment[]`, `onNavigate: (folderId: string) => void`
  - [x] 5.3 Compose with shadcn/ui Breadcrumb primitives (Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator)
  - [x] 5.4 Implement ellipsis truncation when segments.length > 3 (show first, ellipsis, last two) using BreadcrumbEllipsis
  - [x] 5.5 Export `FolderBreadcrumb` from `FolderBreadcrumb.tsx`

- [x] Task 6: Build NotificationCenter component (AC: #5)
  - [x] 6.1 Define `NotificationItem` type: `{ id: string; title: string; message: string; createdAt: number; read: boolean }`
  - [x] 6.2 Define props: `notifications: NotificationItem[]`, `unreadCount: number`, `onMarkAllRead: () => void`, `onNotificationClick?: (id: string) => void`
  - [x] 6.3 Build bell icon button with unread count badge overlay (absolute positioned badge on the Bell icon)
  - [x] 6.4 Build popover/dropdown with notification list using shadcn/ui `Popover` (PopoverTrigger + PopoverContent)
  - [x] 6.5 Implement notification item row: icon, title, message truncated, relative timestamp (via date-fns `formatDistanceToNow`)
  - [x] 6.6 Add "Mark all as read" button in popover header
  - [x] 6.7 Add empty state when no notifications
  - [x] 6.8 Export `NotificationCenter` from `NotificationCenter.tsx`

- [x] Task 7: Barrel export & type exports (AC: #6)
  - [x] 7.1 Update `index.ts` to export all components and their prop types
  - [x] 7.2 Verify all components render independently (no Convex imports, all data via props)

## Dev Notes

### Architecture Patterns

- **Component location**: All components go in `apps/web/src/components/shared/` per architecture decision. [Source: architecture.md#Component Organization]
- **Naming convention**: PascalCase for component files (`EventTypeBadge.tsx`, `StatusBadge.tsx`). [Source: architecture.md#Naming Patterns]
- **Styling approach**: Tailwind CSS v4 + CVA (class-variance-authority) + `cn()` utility from `@/lib/utils`. Extend existing `Badge` component variants rather than creating from scratch. [Source: architecture.md#Styling Solution]
- **No backend dependency**: These are pure presentational components. All data flows via props. Backend wiring happens in consuming epics (Epic 3, 4, 5).
- **Icon library**: Use Lucide React icons (already installed via shadcn/ui preset). Import from `lucide-react`.

### Existing Components to Leverage

| shadcn/ui Component | File | Used By |
|---------------------|------|---------|
| `Badge` + `badgeVariants` | `components/ui/badge.tsx` | EventTypeBadge, StatusBadge |
| `Breadcrumb` (full set) | `components/ui/breadcrumb.tsx` | FolderBreadcrumb |
| `Progress` | `components/ui/progress.tsx` | ReadTrackingIndicator |
| `Popover` | `components/ui/popover.tsx` | NotificationCenter |
| `DropdownMenu` | `components/ui/dropdown-menu.tsx` | NotificationCenter (alternative) |

### Color Mapping Reference

**Event Type Badges (UX-DR5):**
| Type | Background Class | Text Class | Icon |
|------|-----------------|------------|------|
| Match | `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400` | — | `Trophy` or `Swords` |
| Training | `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400` | — | `Dumbbell` |
| Meeting | `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400` | — | `Users` |
| Rehab | `bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400` | — | `Heart` or `Activity` |

**Player Status Badges (UX-DR6):**
| Status | Background Class | Icon |
|--------|-----------------|------|
| Active | `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400` | `CircleCheck` |
| On Loan | `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400` | `ArrowRightLeft` |
| Left the Club | `bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400` | `LogOut` |

> **Implementation note**: These colors should be defined as CVA variants so they integrate cleanly with the existing `Badge` component pattern. Consider extending `badgeVariants` or creating a parallel variant definition. Always include dark mode support using `dark:` prefixes.

### Dependencies

- `date-fns` (already installed v4.1.0) — used in NotificationCenter for `formatDistanceToNow`
- `lucide-react` (already installed via shadcn/ui) — icons for all badge types
- `class-variance-authority` (already installed) — CVA variants for badge styles
- No new dependencies required.

### Testing Standards

- These are pure UI components with no backend calls — no Convex test infrastructure needed.
- Manual visual verification is sufficient for Sprint 1.
- Components should render without errors when imported and given valid props.
- Edge cases to verify: empty notifications list, zero total in read tracker, single-segment breadcrumb, long labels.

### Project Structure Notes

- **Alignment**: Files will be created under `apps/web/src/components/shared/` matching the architecture's component organization structure exactly. [Source: architecture.md#Project Structure]
- **No conflicts**: The `shared/` directory does not exist yet — this story creates it.
- **Cross-module usage**: EventTypeBadge will be consumed by `components/calendar/` (Epic 3). StatusBadge by `components/players/` (Epic 5). ReadTrackingIndicator by `components/documents/` (Epic 4). FolderBreadcrumb by `components/documents/` (Epic 4). NotificationCenter by `app/(app)/layout.tsx` (Epic 3, Story 3.7).

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Component Organization] — shared/ directory for cross-module components
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — PascalCase for React component files
- [Source: _bmad-output/planning-artifacts/architecture.md#Styling Solution] — Tailwind v4 + CVA + cn() utility
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Mapping] — EventTypeBadge, StatusBadge, NotificationCenter locations
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR3, UX-DR5, UX-DR6, UX-DR7, UX-DR8

### UX Design Requirements Covered

| UX-DR | Requirement | Component |
|-------|-------------|-----------|
| UX-DR3 | Notification center (bell icon + dropdown) | NotificationCenter |
| UX-DR5 | Color-coded event type badges | EventTypeBadge |
| UX-DR6 | Player status badges with distinct visual treatment | StatusBadge |
| UX-DR7 | Read tracking indicator ("Opened by X/Y") | ReadTrackingIndicator |
| UX-DR8 | Folder navigation breadcrumb | FolderBreadcrumb |

### Prerequisite Stories

- **Story 1.2** (Configure Design System & Theme) must be complete — CSS variables and shadcn/ui preset must be applied.
- **Story 1.3** (Core Layout & Sidebar) should be complete — NotificationCenter integrates into the top bar area defined in that story's layout.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `npx tsc --noEmit` — zero errors across all new shared components
- Grep verified zero `convex` imports and zero `any` types in `components/shared/`

### Completion Notes List

- All 5 components are pure presentational — no backend dependencies, all data via props
- EventTypeBadge: CVA variants with `eventType` + `size` axes, Lucide icons (Trophy, Dumbbell, Users, Heart), dark mode support
- StatusBadge: CVA variants with `status` axis, Lucide icons (CircleCheck, ArrowRightLeft, LogOut), dark mode support
- ReadTrackingIndicator: Composes shadcn/ui Progress, handles `total===0` with "No access" + EyeOff icon, compact vs default modes
- FolderBreadcrumb: Composes full shadcn/ui Breadcrumb primitive set, ellipsis truncation for >3 segments, `onNavigate` callback
- NotificationCenter: Composes shadcn/ui Popover, Bell icon with absolute-positioned unread badge (99+ cap), `formatDistanceToNow` timestamps, empty state with Inbox icon, "Mark all as read" header button
- Testing: Story specifies "Manual visual verification is sufficient for Sprint 1" — tsc --noEmit confirms type-safe compilation

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-26 | Bob (SM Agent) | Story created from Epic 1, Story 1.4 |
| 2026-03-27 | Amelia (Dev Agent) | Implemented all 5 shared components, barrel exports, tsc verified |

### File List

**Files created:**
- `apps/web/src/components/shared/EventTypeBadge.tsx`
- `apps/web/src/components/shared/StatusBadge.tsx`
- `apps/web/src/components/shared/ReadTrackingIndicator.tsx`
- `apps/web/src/components/shared/FolderBreadcrumb.tsx`
- `apps/web/src/components/shared/NotificationCenter.tsx`
- `apps/web/src/components/shared/index.ts`

**Existing files referenced (read-only):**
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/breadcrumb.tsx`
- `apps/web/src/components/ui/progress.tsx`
- `apps/web/src/components/ui/popover.tsx`
- `apps/web/src/components/ui/dropdown-menu.tsx`
- `apps/web/src/lib/utils.ts`
