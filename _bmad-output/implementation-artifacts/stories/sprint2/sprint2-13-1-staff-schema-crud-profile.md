# Story 13.1: Staff Schema, CRUD & Profile Page

Status: ready
Story Type: fullstack
Sprint: 2
Epic: 13 — Staff Profiles & Directory

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to create, view, edit, and manage staff profiles with personal and professional details,
so that the club has a central directory of all non-player staff members.

## Acceptance Criteria (BDD)

### AC 1: Staff schema exists in Convex

**Given** the Convex backend is deployed,
**When** the schema is inspected,
**Then** a `staff` table exists with the following fields:
- `teamId` (id reference to `teams`) — required
- `userId` (optional id reference to `users`) — linked when staff member has an account
- `firstName` (string) — required
- `lastName` (string) — required
- `photo` (optional string) — Convex storage ID for staff photo
- `jobTitle` (string) — required (e.g. "Head Coach", "Physiotherapist", "Data Analyst")
- `department` (string) — required (one of: "Coaching", "Medical", "Operations", "Analytics", "Management", "Academy")
- `phone` (optional string)
- `email` (optional string) — work email
- `bio` (optional string) — free-text biography, max 5000 characters
- `dateJoined` (optional number) — Unix timestamp ms
- `status` (string) — one of `"active"`, `"inactive"`, default `"active"`
- `createdAt` (number) — Unix timestamp ms
- `updatedAt` (number) — Unix timestamp ms

**And** the table has indexes:
- `by_teamId` on `["teamId"]`
- `by_teamId_status` on `["teamId", "status"]`
- `by_teamId_department` on `["teamId", "department"]`
- `by_userId` on `["userId"]`

### AC 2: Shared staff constants are exported

**Given** the shared constants package,
**When** staff-related constants are imported,
**Then** the following are available from `packages/shared/staff.ts`:
- `STAFF_DEPARTMENTS = ["Coaching", "Medical", "Operations", "Analytics", "Management", "Academy"] as const`
- `STAFF_STATUSES = ["active", "inactive"] as const`
- `STAFF_STATUS_LABELS = { active: "Active", inactive: "Inactive" }`
- `STAFF_DEPARTMENT_LABELS` mapping each department to its display name

### AC 3: `getStaff` query returns team staff with filtering

**Given** the user is authenticated and belongs to a team,
**When** the `staff.queries.getStaff` query is called with optional `{ status?: string, department?: string, search?: string }`,
**Then** it calls `requireAuth(ctx)`, queries the `staff` table filtered by `teamId`, applies optional status/department/search filters, resolves photo URLs via `ctx.storage.getUrl()`, and returns an array of staff summary objects sorted alphabetically by `lastName` then `firstName`:
`{ _id, firstName, lastName, photoUrl, jobTitle, department, status }`

### AC 4: `getStaffById` query returns a single staff profile

**Given** the user is authenticated,
**When** `staff.queries.getStaffById` is called with `{ staffId: Id<"staff"> }`,
**Then** it calls `requireAuth(ctx)`, fetches the staff member by ID, validates `teamId` match, resolves photo URL, and returns the full staff object with `photoUrl`. Returns `null` if not found or wrong team.

### AC 5: `createStaff` mutation creates a staff profile (admin only)

**Given** the user has the `admin` role,
**When** `staff.mutations.createStaff` is called with staff profile fields,
**Then** it calls `requireRole(ctx, ["admin"])`, validates required fields (firstName, lastName, jobTitle, department), validates department is one of the allowed values, validates bio length (max 5000 chars), inserts a new `staff` document with `status: "active"`, `userId: undefined`, and timestamps, and returns the new staff ID.

### AC 6: `updateStaff` mutation updates a staff profile (admin only)

**Given** the user has the `admin` role,
**When** `staff.mutations.updateStaff` is called with `staffId` and updated fields,
**Then** it calls `requireRole(ctx, ["admin"])`, validates the staff member belongs to the same team via `getTeamResource`, validates field values, patches the document with `updatedAt: Date.now()`, and returns the staff ID.

### AC 7: `deleteStaff` mutation soft-deletes by setting status to "inactive" (admin only)

**Given** the user has the `admin` role,
**When** `staff.mutations.deleteStaff` is called with `{ staffId }`,
**Then** it calls `requireRole(ctx, ["admin"])`, validates team ownership, sets `status: "inactive"` and `updatedAt: Date.now()`.

### AC 8: Staff list page at `/staff`

**Given** the user navigates to `/staff`,
**When** the page loads,
**Then** a staff directory is displayed showing all team staff members in a table with columns: Photo (avatar), Name, Job Title, Department, Status badge. The list supports filtering by department (dropdown/tabs), status filter, and search by name. An "Add Staff" button is visible to admin users only. Empty state is shown when no staff exist.

### AC 9: Staff creation form at `/staff/new`

**Given** the user is an admin and navigates to `/staff/new`,
**When** the form is displayed,
**Then** it contains fields for: first name (required), last name (required), photo upload, job title (required), department (required, select from allowed values), phone, email, bio (textarea), date joined (date picker). Submitting the form calls `createStaff` and navigates to the new staff profile page on success. Validation errors are displayed inline.

### AC 10: Staff profile page at `/staff/[staffId]`

**Given** the user navigates to `/staff/[staffId]`,
**When** the page loads,
**Then** a profile page is rendered with:
- A header showing photo (or initials avatar), full name, job title, department badge, and status badge
- A tabbed interface with tabs: "Overview" (bio info, contact details, date joined), "Certifications" (placeholder — "Coming in Story 13.3"), "Role Info" (placeholder — future story)
- A "Back to Staff" link
- An "Edit" button visible to admin users only
- Loading skeleton while data is fetching
- "Staff member not found" state when ID is invalid

### AC 11: Staff edit form (admin only)

**Given** the user is an admin and clicks "Edit" on a staff profile,
**When** the edit form is displayed,
**Then** it is pre-populated with the current staff data, allows editing all fields, and calls `updateStaff` on submit. Photo can be changed via the existing Convex file upload pattern (`generateUploadUrl`). Success shows a toast and returns to the profile view.

### AC 12: "Staff" appears in sidebar navigation

**Given** the user is authenticated,
**When** the sidebar is rendered,
**Then** a "Staff" navigation item appears (using `IconUserShield` or `IconBriefcase` from `@tabler/icons-react`) linking to `/staff`, positioned after "Players" in the nav order.

### AC 13: Mock data for staff

**Given** `USE_MOCK_DATA=true` is set,
**When** staff data is needed during development,
**Then** a mock data file `apps/web/src/lib/mock-data/staff.json` provides 4-6 sample staff members spanning different departments, and the frontend components can use this mock data for initial development before backend is wired up.

### AC 14: Team-scoped data access enforced

**Given** any staff query or mutation,
**When** it executes,
**Then** all operations filter by `teamId` from `requireAuth`/`requireRole`. No cross-team staff data is ever returned or modifiable.

### AC 15: Real-time updates

**Given** the staff list or profile page is open,
**When** another admin creates or updates a staff member,
**Then** the changes appear in real time without manual refresh (via Convex `useQuery` subscriptions).

### AC 16: i18n translation keys

**Given** the i18n system is in place,
**When** the staff module UI is rendered,
**Then** all user-facing strings use translation keys from the existing `useTranslation` hook pattern (add `staff` section to both English and Italian translation files).

## Tasks / Subtasks

### Task 1: Define staff Convex schema table (AC: #1)

- [ ] 1.1: Create `packages/backend/convex/table/staff.ts` defining the `staff` table with fields: `teamId: v.id("teams")`, `userId: v.optional(v.id("users"))`, `firstName: v.string()`, `lastName: v.string()`, `photo: v.optional(v.string())`, `jobTitle: v.string()`, `department: v.string()`, `phone: v.optional(v.string())`, `email: v.optional(v.string())`, `bio: v.optional(v.string())`, `dateJoined: v.optional(v.number())`, `status: v.string()`, `createdAt: v.number()`, `updatedAt: v.number()`. Add indexes: `by_teamId` on `["teamId"]`, `by_teamId_status` on `["teamId", "status"]`, `by_teamId_department` on `["teamId", "department"]`, `by_userId` on `["userId"]`.
- [ ] 1.2: Import and register the `staff` table in `packages/backend/convex/schema.ts`: add `import { staff } from "./table/staff"` and include `staff` in the `defineSchema` call.
- [ ] 1.3: Provide the Convex CLI command to the user to verify schema deploys: `npx convex dev`

### Task 2: Export shared staff constants (AC: #2)

- [ ] 2.1: Create `packages/shared/staff.ts` exporting: `STAFF_DEPARTMENTS = ["Coaching", "Medical", "Operations", "Analytics", "Management", "Academy"] as const`, `STAFF_STATUSES = ["active", "inactive"] as const`, `STAFF_STATUS_LABELS = { active: "Active", inactive: "Inactive" } as const`, `STAFF_DEPARTMENT_LABELS = { Coaching: "Coaching", Medical: "Medical", Operations: "Operations", Analytics: "Analytics", Management: "Management", Academy: "Academy" } as const`.

### Task 3: Create staff query functions (AC: #3, #4, #14)

- [ ] 3.1: Create `packages/backend/convex/staff/queries.ts`.
- [ ] 3.2: Implement `getStaff` query: accepts `{ status: v.optional(v.string()), department: v.optional(v.string()), search: v.optional(v.string()) }`, calls `requireAuth(ctx)`. When `status` is provided, query using `by_teamId_status` index. When `department` is provided without status, query using `by_teamId_department` index. Otherwise query by `by_teamId`. Apply in-memory search filter on `firstName`/`lastName` (case-insensitive). Resolve `photo` to URL via `ctx.storage.getUrl()`. Sort alphabetically by `lastName` then `firstName`. Return array: `{ _id, firstName, lastName, photoUrl, jobTitle, department, status }`.
- [ ] 3.3: Implement `getStaffById` query: accepts `{ staffId: v.id("staff") }`, calls `requireAuth(ctx)`, fetches staff by ID, validates `teamId` match, resolves photo URL. Returns full staff object with `photoUrl` or `null`.

### Task 4: Create staff mutation functions (AC: #5, #6, #7, #14)

- [ ] 4.1: Create `packages/backend/convex/staff/mutations.ts`.
- [ ] 4.2: Implement `createStaff` mutation: accepts all staff profile fields, calls `requireRole(ctx, ["admin"])`. Validates: `firstName` and `lastName` are non-empty strings, `jobTitle` is non-empty, `department` is one of `STAFF_DEPARTMENTS`, `bio` does not exceed 5000 characters, `email` format if provided. Inserts with `status: "active"`, `userId: undefined`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns new staff `_id`.
- [ ] 4.3: Implement `updateStaff` mutation: accepts `staffId` and all editable fields, calls `requireRole(ctx, ["admin"])`, calls `getTeamResource(ctx, teamId, "staff", staffId)`, validates fields same as create, patches with `updatedAt: Date.now()`. Returns `staffId`.
- [ ] 4.4: Implement `deleteStaff` mutation: accepts `{ staffId: v.id("staff") }`, calls `requireRole(ctx, ["admin"])`, calls `getTeamResource(ctx, teamId, "staff", staffId)`, patches `status: "inactive"` and `updatedAt: Date.now()`.

### Task 5: Create mock data file (AC: #13)

- [ ] 5.1: Create `apps/web/src/lib/mock-data/staff.json` with 5 sample staff members covering departments: Coaching (e.g. "Head Coach"), Medical (e.g. "Head Physiotherapist"), Operations (e.g. "Operations Manager"), Analytics (e.g. "Performance Analyst"), Management (e.g. "General Manager"). Each entry includes: `_id` (mock ID string), `firstName`, `lastName`, `photoUrl` (null), `jobTitle`, `department`, `phone`, `email`, `bio`, `dateJoined` (timestamp), `status: "active"`.

### Task 6: Add i18n translation keys (AC: #16)

- [ ] 6.1: Add `staff` section to the English translation file with keys: `title` ("Staff Directory"), `addStaff` ("Add Staff Member"), `editStaff` ("Edit Staff Member"), `newStaff` ("New Staff Member"), `backToStaff` ("Back to Staff"), `noStaff` ("No staff members yet"), `addFirstStaff` ("Add your first staff member"), `tabs.overview` ("Overview"), `tabs.certifications` ("Certifications"), `tabs.roleInfo` ("Role Info"), `certComingSoon` ("Certifications will be available in a future update"), `roleInfoComingSoon` ("Role information will be available in a future update"), `fields.firstName` ("First Name"), `fields.lastName` ("Last Name"), `fields.jobTitle` ("Job Title"), `fields.department` ("Department"), `fields.phone` ("Phone"), `fields.email` ("Email"), `fields.bio` ("Biography"), `fields.dateJoined` ("Date Joined"), `fields.photo` ("Photo"), `fields.status` ("Status"), `departments.*` (one key per department), `statuses.active` ("Active"), `statuses.inactive` ("Inactive"), `toast.created` ("Staff member created"), `toast.updated` ("Staff member updated"), `toast.deleted` ("Staff member deactivated"), `notFound` ("Staff member not found"), `notFoundDescription` ("This staff member does not exist or you don't have access."), `filterByDepartment` ("Filter by department"), `allDepartments` ("All Departments"), `search` ("Search staff...").
- [ ] 6.2: Add equivalent Italian translations in the Italian translation file.
- [ ] 6.3: Add `staff: string` to the `nav` section of translations (English: "Staff", Italian: "Staff").

### Task 7: Add "Staff" to sidebar navigation (AC: #12)

- [ ] 7.1: In `apps/web/src/components/app-sidebar.tsx`, add a new nav item after the "Players" entry: `{ title: t.nav.staff, url: "/staff", icon: IconBriefcase }`. Import `IconBriefcase` from `@tabler/icons-react`.

### Task 8: Build StaffStatusBadge component (AC: #8, #10)

- [ ] 8.1: Create `apps/web/src/components/staff/StaffStatusBadge.tsx`. Accepts `status: "active" | "inactive"`. Renders a shadcn `Badge`: `active` = green styling with green dot, `inactive` = gray styling with gray dot. Displays label from `STAFF_STATUS_LABELS`. Follow the same pattern as the existing `PlayerStatusBadge`.

### Task 9: Build StaffDepartmentBadge component (AC: #8, #10)

- [ ] 9.1: Create `apps/web/src/components/staff/StaffDepartmentBadge.tsx`. Accepts `department: string`. Renders a shadcn `Badge` with `variant="outline"` showing the department name. Each department can have a subtle color coding (e.g. Coaching = blue, Medical = red, Operations = amber, Analytics = purple, Management = slate, Academy = green).

### Task 10: Build StaffTable component (AC: #8)

- [ ] 10.1: Create `apps/web/src/components/staff/StaffTable.tsx`. Accepts `staff` array and `onStaffClick` callback.
- [ ] 10.2: Render a table with columns: Photo (Avatar with initials fallback), Name (`firstName lastName`), Job Title, Department (using `StaffDepartmentBadge`), Status (using `StaffStatusBadge`).
- [ ] 10.3: Each row is clickable, triggering `onStaffClick(staff._id)`. Style with hover state and cursor pointer.

### Task 11: Build StaffListFilters component (AC: #8)

- [ ] 11.1: Create `apps/web/src/components/staff/StaffListFilters.tsx`. Accepts `currentDepartment`, `currentStatus`, `onDepartmentChange`, `onStatusChange`, `searchValue`, `onSearchChange`.
- [ ] 11.2: Render a department filter (shadcn `Select` with "All Departments" + each department option), a status filter (shadcn `Tabs` or `Select` with "All", "Active", "Inactive"), and a debounced search input (300ms debounce).

### Task 12: Build Staff list page (AC: #8, #15)

- [ ] 12.1: Create `apps/web/src/app/(app)/staff/page.tsx`.
- [ ] 12.2: Read URL search params for `status`, `department`, `search`. Use `useSearchParams()` and `useRouter()`.
- [ ] 12.3: Call `useQuery(api.staff.queries.getStaff, { status, department, search })`. Show loading skeletons while `undefined`.
- [ ] 12.4: Render page title "Staff Directory", "Add Staff Member" button (admin only, links to `/staff/new`), `StaffListFilters`, and `StaffTable`. Wire filter changes to URL search params.
- [ ] 12.5: Show empty state when staff array is empty: icon, "No staff members yet", "Add your first staff member" CTA for admins.
- [ ] 12.6: Wire `onStaffClick` to navigate to `/staff/[staffId]`.

### Task 13: Build StaffProfileHeader component (AC: #10)

- [ ] 13.1: Create `apps/web/src/components/staff/StaffProfileHeader.tsx`. Accepts full staff object and `isAdmin` boolean.
- [ ] 13.2: Render: large Avatar (96px) with photo or initials, full name as heading, job title, `StaffDepartmentBadge`, `StaffStatusBadge`. Include "Edit" button (visible to admin only) linking to edit mode/dialog.

### Task 14: Build StaffProfileTabs component (AC: #10)

- [ ] 14.1: Create `apps/web/src/components/staff/StaffProfileTabs.tsx`. Accepts `staff` object and `isAdmin` boolean.
- [ ] 14.2: Render shadcn `Tabs` with three tabs:
  - **"Overview"**: Displays staff fields in a read-only grid — Job Title, Department, Phone, Email, Bio (rendered as paragraph), Date Joined (formatted with `date-fns`). Show "---" for empty optional fields.
  - **"Certifications"**: Placeholder component with icon and text "Certifications will be available in a future update" (Story 13.3 will replace this).
  - **"Role Info"**: Placeholder component with text "Role information will be available in a future update".

### Task 15: Build Staff profile page (AC: #10, #15)

- [ ] 15.1: Create `apps/web/src/app/(app)/staff/[staffId]/page.tsx`.
- [ ] 15.2: Extract `staffId` from route params. Call `useQuery(api.staff.queries.getStaffById, { staffId })` and `useQuery(api.table.users.currentUser)`.
- [ ] 15.3: Show `ProfileSkeleton` while loading. Show "Staff member not found" with back link when `null`.
- [ ] 15.4: Render `StaffProfileHeader` and `StaffProfileTabs`. Include a "Back to Staff" link at the top.

### Task 16: Build Staff creation form page (AC: #9)

- [ ] 16.1: Create `apps/web/src/app/(app)/staff/new/page.tsx`.
- [ ] 16.2: Build a form with fields: First Name (Input, required), Last Name (Input, required), Photo (file upload using existing `generateUploadUrl` + `ctx.storage.store()` pattern), Job Title (Input, required), Department (Select from `STAFF_DEPARTMENTS`), Phone (Input), Email (Input), Bio (Textarea, max 5000 chars with character counter), Date Joined (date picker).
- [ ] 16.3: On submit, call `staff.mutations.createStaff`. Show validation errors inline. On success, show toast and `router.push(\`/staff/${newStaffId}\`)`.
- [ ] 16.4: Only accessible to admin users — redirect non-admins or show unauthorized message.

### Task 17: Build Staff edit functionality (AC: #11)

- [ ] 17.1: Create `apps/web/src/app/(app)/staff/[staffId]/edit/page.tsx` (or use a dialog/sheet pattern — follow whichever pattern the player edit uses).
- [ ] 17.2: Pre-populate the form with current staff data from `getStaffById`.
- [ ] 17.3: Photo change uses existing upload pattern: call `generateUploadUrl`, upload file, get storage ID, pass to `updateStaff`.
- [ ] 17.4: On submit, call `staff.mutations.updateStaff`. Show toast on success and navigate back to profile.
- [ ] 17.5: Only accessible to admin users.

## Dev Notes

### Architecture Patterns (follow existing codebase)

1. **Schema pattern**: Define table in `packages/backend/convex/table/staff.ts`, import in `schema.ts`. Follow `players.ts` as the template.

2. **Query/Mutation pattern**: Create `packages/backend/convex/staff/queries.ts` and `packages/backend/convex/staff/mutations.ts`. Use `requireAuth(ctx)` for queries, `requireRole(ctx, ["admin"])` for mutations. Use `getTeamResource()` for ownership validation on updates/deletes.

3. **Photo upload pattern**: Use existing `storage.ts` `generateUploadUrl` mutation. On the frontend, call `generateUploadUrl`, upload the file to the returned URL, extract the storage ID from the response, and pass it as the `photo` field to create/update mutations. Display photos by resolving storage ID to URL via `ctx.storage.getUrl()` in queries.

4. **Frontend routing**: Pages go in `apps/web/src/app/(app)/staff/`. Components go in `apps/web/src/components/staff/`.

5. **Mock data approach**: Create `apps/web/src/lib/mock-data/staff.json` for initial frontend development. The `USE_MOCK_DATA=true` env var pattern is established — follow the same pattern as other mock data files.

6. **i18n pattern**: Add translation keys to existing translation objects accessed via `useTranslation()` hook. Add both English and Italian translations.

7. **Convex CLI**: Never auto-run Convex commands. Provide the command to the user: `npx convex dev`.

8. **Tab structure for extensibility**: The "Certifications" tab is a placeholder in this story. Story 13.3 will implement the actual certifications data model and UI. The tab structure must be designed so the placeholder can be swapped for real content without restructuring.

### Key Differences from Players Module

| Aspect | Players | Staff |
|--------|---------|-------|
| Position/Role | `position` (Goalkeeper, etc.) | `jobTitle` (free text) + `department` (enum) |
| Squad Number | `squadNumber` | N/A |
| Physical Data | `heightCm`, `weightKg`, `preferredFoot` | N/A |
| Biography | N/A | `bio` (free text, max 5000 chars) |
| Date Joined | N/A | `dateJoined` (timestamp) |
| Status Values | active, onLoan, leftClub | active, inactive |
| Delete Behavior | Status change + account deactivation | Soft-delete via status = "inactive" |
| Sub-tables | playerStats, playerFitness, playerInjuries | staffCertifications (Story 13.3) |
| Contact Fields | phone, personalEmail, address, emergency | phone, email |

### File Tree (new files)

```
packages/
  backend/convex/
    table/staff.ts                    # Schema definition
    staff/
      queries.ts                      # getStaff, getStaffById
      mutations.ts                    # createStaff, updateStaff, deleteStaff
  shared/
    staff.ts                          # Constants (departments, statuses, labels)

apps/web/src/
  app/(app)/staff/
    page.tsx                          # Staff list page
    new/page.tsx                      # Staff creation form
    [staffId]/
      page.tsx                        # Staff profile page
      edit/page.tsx                   # Staff edit form
  components/staff/
    StaffTable.tsx                     # Table component for staff list
    StaffListFilters.tsx              # Department/status/search filters
    StaffProfileHeader.tsx            # Profile header with avatar, name, badges
    StaffProfileTabs.tsx              # Tabbed content (Overview, Certifications, Role Info)
    StaffStatusBadge.tsx              # Status badge component
    StaffDepartmentBadge.tsx          # Department badge component
  lib/mock-data/
    staff.json                        # Mock staff data for development
```

## References

- **Players module (template to follow):**
  - Schema: `packages/backend/convex/table/players.ts`
  - Queries: `packages/backend/convex/players/queries.ts`
  - Mutations: `packages/backend/convex/players/mutations.ts`
  - List page: `apps/web/src/app/(app)/players/page.tsx`
  - Profile page: `apps/web/src/app/(app)/players/[playerId]/page.tsx`
- **Auth helpers:** `packages/backend/convex/lib/auth.ts` (`requireAuth`, `requireRole`, `getTeamResource`)
- **Storage:** `packages/backend/convex/storage.ts` (`generateUploadUrl`)
- **Sidebar:** `apps/web/src/components/app-sidebar.tsx`
- **Mock data pattern:** `apps/web/src/lib/mock-data/index.ts`
- **Depends on:** Nothing (first story in Epic 13)
- **Blocks:** Story 13.3 (Staff Certifications — needs the "Certifications" tab placeholder from AC #10)
