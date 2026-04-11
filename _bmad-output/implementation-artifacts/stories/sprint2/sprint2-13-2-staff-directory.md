# Story 13.2: Staff Directory

Status: draft
Sprint: 2
Epic: 13 (Staff Profiles & Directory)
Depends on: Story 13.1 (staff schema)
Story Type: frontend

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **DATA APPROACH:** This story uses **mock data**. Staff data is loaded from a local JSON file in `apps/web/src/lib/mock-data/staff.json`. No Convex queries are required — the page reads mock data and filters/searches client-side. This follows the same pattern established in Sprint 1 for dashboard stories.

## Story

As any authenticated team member,
I want to browse a searchable, filterable staff directory,
so that I can quickly find colleagues by name, department, or role and navigate to their profile.

## Acceptance Criteria

1. **Staff directory page exists at `/staff`** — A new page at `apps/web/src/app/(app)/staff/page.tsx` renders the staff directory. The page is accessible to ALL authenticated users via `requireAuth` (not `requireRole`). Unauthenticated users are redirected to the login page by the existing auth middleware.

2. **Page header displays "Staff Directory" with a staff count** — The page header shows the title "Staff Directory" and a count badge showing the total number of staff members matching the current filters (e.g., "Staff Directory (24)"). The count updates as filters are applied.

3. **Staff members are displayed as cards in a responsive grid** — Each staff member is rendered as a card containing: a photo/avatar (with initials fallback when no photo is available), full name (first + last), job title, and department. The grid is responsive: 1 column on mobile (`sm:`), 2 columns on tablet (`md:`), 3 columns on desktop (`lg:`). Cards use the existing shadcn `Card` component.

4. **Search by name with debounced input** — A search input at the top of the page filters staff by first name or last name (case-insensitive partial match). The search is debounced at 300ms to avoid excessive re-renders. The search value is synced to the URL query parameter `?search=` so that the search state is preserved on page refresh and is shareable. Clearing the search input removes the query parameter.

5. **Filter by department via dropdown** — A `Select` dropdown allows filtering by department. Options are dynamically derived from the unique departments present in the mock data, plus an "All Departments" option that clears the filter. The selected department is synced to the URL query parameter `?department=`. The dropdown uses the shadcn `Select` component.

6. **Filter by role via dropdown** — A `Select` dropdown allows filtering by role (job category). Options are dynamically derived from the unique roles present in the mock data, plus an "All Roles" option that clears the filter. The selected role is synced to the URL query parameter `?role=`. The dropdown uses the shadcn `Select` component.

7. **Filters and search work together** — All three filter mechanisms (search, department, role) are composable. Applying a department filter while a search term is active narrows results further. The displayed count in the header reflects the combined filter results.

8. **Click a card to navigate to the staff profile page** — Clicking any staff card navigates to `/staff/[staffId]` using Next.js `router.push()`. The entire card is clickable with a `cursor-pointer` class and a subtle hover effect (e.g., border color change or shadow elevation).

9. **Empty state when no staff match filters** — When no staff members match the current search/filter combination, a centered empty state is displayed with an icon (e.g., `IconUsersGroup` from `@tabler/icons-react`), a heading "No staff found", and a description "Try adjusting your search or filters." If there are no staff at all (mock data is empty), the message reads "No staff members have been added yet."

10. **Loading skeleton while data initializes** — While mock data is being loaded, a skeleton grid of 6 placeholder cards is shown matching the responsive grid layout. Each skeleton card mirrors the card dimensions with `Skeleton` components for photo, name, title, and department.

11. **URL state is preserved across navigation** — When a user navigates to a staff profile and returns (browser back button), the search, department, and role filter state is preserved via URL query parameters. The page reads from `useSearchParams()` on mount.

12. **Staff cards display department as a colored badge** — The department is shown as a `Badge` component on each card, providing visual distinction between departments.

## Mock Data

Create `apps/web/src/lib/mock-data/staff.json` with an array of staff member objects. Each object has the following shape:

```json
{
  "id": "staff_001",
  "firstName": "Marco",
  "lastName": "Rossi",
  "jobTitle": "Head Coach",
  "department": "Coaching",
  "role": "coach",
  "photoUrl": null,
  "email": "marco.rossi@club.com",
  "phone": "+39 333 123 4567"
}
```

Include at least 12 entries spanning these departments: "Coaching", "Medical", "Performance", "Analytics", "Operations", "Academy". Include a mix of roles: "admin", "coach", "analyst", "physio", "staff". Some entries should have `photoUrl: null` to exercise the avatar fallback.

## Tasks / Subtasks

- [ ] **Task 1: Create staff mock data file** (AC: #3, #5, #6)
  - [ ] 1.1: Create `apps/web/src/lib/mock-data/staff.json` with at least 12 staff entries covering departments (Coaching, Medical, Performance, Analytics, Operations, Academy) and roles (admin, coach, analyst, physio, staff). Include a mix of entries with and without `photoUrl`. Each entry must have: `id`, `firstName`, `lastName`, `jobTitle`, `department`, `role`, `photoUrl`, `email`, `phone`.
  - [ ] 1.2: Create a TypeScript type definition `StaffMember` in `apps/web/src/lib/mock-data/staff-types.ts`:
    ```typescript
    export interface StaffMember {
      id: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      department: string;
      role: string;
      photoUrl: string | null;
      email: string;
      phone: string;
    }
    ```

- [ ] **Task 2: Create `useStaffDirectory` hook** (AC: #4, #5, #6, #7, #11)
  - [ ] 2.1: Create `apps/web/src/hooks/useStaffDirectory.ts`. This hook manages the staff directory state: search term, department filter, role filter. It reads initial values from `useSearchParams()` and syncs changes back to the URL using `router.replace()` (not `router.push()` — to avoid polluting browser history with every keystroke).
  - [ ] 2.2: Implement debounced search (300ms) following the same pattern as `useDocumentSearch` in `apps/web/src/hooks/useDocumentSearch.ts`: maintain both `searchTerm` (immediate, for the input value) and `debouncedSearchTerm` (delayed, for filtering).
  - [ ] 2.3: Import the mock data from `staff.json` and apply all three filters (search, department, role) in a `useMemo` to produce a `filteredStaff` array. Search matches against `firstName` and `lastName` (case-insensitive, partial match using `.toLowerCase().includes()`). Department and role are exact matches when set.
  - [ ] 2.4: Derive `departments` and `roles` arrays from the full (unfiltered) mock data using `useMemo` — these are the unique values used to populate the filter dropdowns. Sort them alphabetically.
  - [ ] 2.5: Return from the hook: `{ filteredStaff, searchTerm, setSearchTerm, department, setDepartment, role, setRole, departments, roles, totalCount, isLoading }`. Set `isLoading` to `false` since mock data is synchronous (but keep the field for future Convex migration).

- [ ] **Task 3: Create `StaffDirectoryFilters` component** (AC: #4, #5, #6)
  - [ ] 3.1: Create `apps/web/src/components/staff/StaffDirectoryFilters.tsx`. Accepts props: `searchValue: string`, `onSearchChange: (value: string) => void`, `department: string`, `onDepartmentChange: (value: string) => void`, `departments: string[]`, `role: string`, `onRoleChange: (value: string) => void`, `roles: string[]`.
  - [ ] 3.2: Render a search input with a search icon (`IconSearch` from `@tabler/icons-react`) using the same styling pattern as `PlayerListFilters` — relative positioned icon inside the input wrapper with `pl-8` padding. Placeholder text: "Search staff by name...".
  - [ ] 3.3: Render a department `Select` dropdown with options: "All Departments" (value `""`) followed by each department from the `departments` prop. When "All Departments" is selected, call `onDepartmentChange("")`.
  - [ ] 3.4: Render a role `Select` dropdown with options: "All Roles" (value `""`) followed by each role from the `roles` prop (display with capitalized first letter). When "All Roles" is selected, call `onRoleChange("")`.
  - [ ] 3.5: Layout: filters arranged in a row on desktop (`flex-row`), stacking vertically on mobile (`flex-col`). Search input takes more space (`flex-1` or `w-full sm:w-64`). Dropdowns have fixed width (`w-40` or `w-48`).

- [ ] **Task 4: Create `StaffCard` component** (AC: #3, #8, #12)
  - [ ] 4.1: Create `apps/web/src/components/staff/StaffCard.tsx`. Accepts props: `staff: StaffMember`, `onClick: (staffId: string) => void`.
  - [ ] 4.2: Render a shadcn `Card` component with: an `Avatar` (size `size-16` or `size-20`) centered at the top of the card with initials fallback using the same `getInitials` pattern from `PlayerTable.tsx` (first letter of first name + first letter of last name, uppercase), the staff member's full name (`font-semibold`), job title (`text-muted-foreground text-sm`), department as a `Badge` component.
  - [ ] 4.3: The entire card is clickable: attach `onClick={() => onClick(staff.id)}` to the card wrapper. Add `cursor-pointer` and a hover effect: `hover:border-primary/50 hover:shadow-md transition-all`.
  - [ ] 4.4: Card content is centered vertically (`text-center`, `items-center`).

- [ ] **Task 5: Create `StaffDirectoryGrid` component** (AC: #3, #8, #9, #10)
  - [ ] 5.1: Create `apps/web/src/components/staff/StaffDirectoryGrid.tsx`. Accepts props: `staff: StaffMember[]`, `onStaffClick: (staffId: string) => void`, `isLoading: boolean`.
  - [ ] 5.2: When `isLoading` is `true`, render a skeleton grid: 6 skeleton cards arranged in the responsive grid layout. Each skeleton card contains `Skeleton` elements matching the dimensions of a real `StaffCard` (circle for avatar, rectangle for name, rectangle for title, small rectangle for badge).
  - [ ] 5.3: When `staff` is empty and `isLoading` is `false`, render the empty state: centered layout with `IconUsersGroup` icon (`size-12`, `text-muted-foreground`), heading "No staff found" (`text-lg font-medium`), description "Try adjusting your search or filters." (`text-muted-foreground text-sm`).
  - [ ] 5.4: When `staff` has entries, render a CSS Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Map over `staff` and render a `StaffCard` for each, passing `onStaffClick` as the `onClick` handler. Use `staff.id` as the React key.

- [ ] **Task 6: Create the `/staff` page** (AC: #1, #2, #8, #11)
  - [ ] 6.1: Create `apps/web/src/app/(app)/staff/page.tsx`. Follow the same structure as `apps/web/src/app/(app)/players/page.tsx`: a default export wrapping the content in `Suspense` (because `useSearchParams()` requires it), and an inner `StaffDirectoryContent` component.
  - [ ] 6.2: Inside `StaffDirectoryContent`, call the `useStaffDirectory` hook to get filtered staff, filter state, and handlers.
  - [ ] 6.3: Render the page header with title "Staff Directory" and a count showing `filteredStaff.length` (e.g., in parentheses or as a `Badge`).
  - [ ] 6.4: Render `StaffDirectoryFilters` passing the search, department, and role state and handlers from the hook.
  - [ ] 6.5: Render `StaffDirectoryGrid` passing `filteredStaff`, the `handleStaffClick` callback (which calls `router.push(\`/staff/${staffId}\`)`), and `isLoading`.
  - [ ] 6.6: The page layout uses the same container pattern as the players page: `div className="flex flex-1 flex-col gap-4 p-4 md:p-6"`.

- [ ] **Task 7: Create placeholder `/staff/[staffId]` page** (AC: #8)
  - [ ] 7.1: Create `apps/web/src/app/(app)/staff/[staffId]/page.tsx` as a placeholder that displays the staff member's name loaded from mock data by matching the `staffId` param. Show a "Coming soon" message for the full profile. This ensures the card click navigation works end-to-end.
  - [ ] 7.2: Include a "Back to Directory" link using `Link` from `next/link` pointing to `/staff`.

- [ ] **Task 8: Add Staff Directory to sidebar navigation** (AC: #1)
  - [ ] 8.1: In the sidebar navigation configuration (locate the nav items array in `apps/web/src/components/app/`), add a "Staff" entry with icon `IconUsers` from `@tabler/icons-react` and href `/staff`. Position it near the "Players" link in the navigation order. This link should be visible to ALL authenticated users (no role restriction).

- [ ] **Task 9: Final validation** (AC: all)
  - [ ] 9.1: Run `pnpm typecheck` from the repository root — must pass with zero errors.
  - [ ] 9.2: Run `pnpm lint` from the repository root — must pass with zero errors.
  - [ ] 9.3: Start the dev server. Log in as any role (admin, coach, analyst, physio, player, staff). Navigate to `/staff` — verify the directory page loads with cards displayed in a responsive grid.
  - [ ] 9.4: Type a name in the search box — verify results filter after 300ms debounce. Verify URL updates with `?search=` parameter. Clear the search — verify all staff reappear and `?search=` is removed from URL.
  - [ ] 9.5: Select a department from the dropdown — verify only staff from that department are shown. Select "All Departments" — verify all staff reappear.
  - [ ] 9.6: Select a role from the dropdown — verify only staff with that role are shown. Select "All Roles" — verify all staff reappear.
  - [ ] 9.7: Combine search + department filter — verify results reflect both constraints. Verify the count in the header updates.
  - [ ] 9.8: Click a staff card — verify navigation to `/staff/[staffId]`. Press browser back — verify filters are preserved.
  - [ ] 9.9: Verify cards without `photoUrl` show initials in the avatar fallback.
  - [ ] 9.10: Resize the browser — verify 1 column on mobile, 2 on tablet, 3 on desktop.
  - [ ] 9.11: Verify the "Staff" link appears in the sidebar navigation for all user roles.

## Reference Files

- **Page pattern:** `apps/web/src/app/(app)/players/page.tsx` — Suspense wrapper, useSearchParams, filter state via URL, empty state, skeleton loading
- **Filter pattern:** `apps/web/src/components/players/PlayerListFilters.tsx` — debounced search input, filter tabs/dropdowns, URL sync
- **Search hook pattern:** `apps/web/src/hooks/useDocumentSearch.ts` — debounced search with URL sync, useMemo for derived state
- **Card component:** `apps/web/src/components/players/PlayerTable.tsx` — Avatar with initials fallback, click handler pattern
- **Role types:** `apps/web/src/utils/roles.ts` — USER_ROLES, ROLE_LABELS
- **Mock data location:** `apps/web/src/lib/mock-data/` — existing mock data directory

## Dev Notes

- This is a frontend-only story. No Convex backend changes are needed. All data comes from the mock JSON file.
- When the backend staff queries from Story 13.1 are ready, the `useStaffDirectory` hook can be migrated to use `useQuery(api.staff.queries.getStaff, ...)` instead of the local JSON import. The component layer should not need changes.
- The `requireAuth` check is handled by the existing auth middleware / layout guard in `apps/web/src/app/(app)/layout.tsx`. No additional auth code is needed in the page component itself.
- Do NOT create any files in `apps/admin/`. All work goes in `apps/web/`.
