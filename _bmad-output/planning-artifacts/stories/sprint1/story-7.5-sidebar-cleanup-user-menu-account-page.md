# Story 7.5: Sidebar Cleanup, User Menu & Account Page

Status: done
Story Type: fullstack
Points: 5

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. Do NOT modify `apps/admin/`.

## Story

As a user,
I want a clean sidebar with a user menu that shows my name and gives me access to my Account page,
So that I can view and edit my profile, see my role and team info, and set my language preference.

## Acceptance Criteria

### AC1: Remove Settings and Get Help from sidebar secondary nav

**Given** the user is on any authenticated page
**When** the sidebar renders
**Then** the secondary nav section (above the user footer) does NOT show "Settings" or "Get Help"
**And** the main navigation items (Dashboards, Players, Calendar, Documents, Team) remain unchanged

### AC2: User menu button shows the user's real name

**Given** the user is authenticated
**When** the sidebar footer renders
**Then** the user button displays the user's `fullName` or `name` from their Convex user record
**And** if no name is available, it displays "Your Profile"
**And** the user's email is shown below the name
**And** the user's avatar is shown (with initials fallback)

### AC3: User menu items are Account and Get Help only

**Given** the user clicks the user button in the sidebar footer
**When** the dropdown menu opens
**Then** it shows exactly two items: "Account" and "Get Help"
**And** "Billing" and "Notifications" items are NOT present
**And** "Log out" remains at the bottom with a separator
**And** clicking "Account" navigates to `/settings`
**And** clicking "Get Help" navigates to `#` (placeholder for now)

### AC4: Account page — profile section with editable name and avatar

**Given** the user navigates to `/settings` (via Account menu item)
**When** the page loads
**Then** the page title is "Account"
**And** a profile card (2/3 width on desktop) displays:
- **Full Name**: editable text input, pre-filled with current value, required
- **Avatar**: drag-and-drop upload zone with current avatar preview and initials fallback. Click or drag to select image. Preview updates immediately on selection.
- **Save button**: persists name and avatar to Convex
- *(Language preference selector will be added in a future story once i18n is implemented)*

### AC5: Account page — access info section with role badge and team

**Given** the user is on the `/settings` page
**When** the page loads
**Then** a sidebar card (1/3 width on desktop) displays:
- **Team**: team name (read-only)
- **Role**: colored badge showing the user's role (Admin, Coach, Analyst, Physio/Medical, Player, Staff). If no role, show "No roles" outline badge.
- **Admin**: "Yes" or "No" indicator
**And** the layout matches the source platform's two-column grid (profile 2/3 + access 1/3)

### AC6: Avatar upload persists to Convex storage

**Given** the user selects a new avatar image on the Account page
**When** the user clicks "Save"
**Then** the image is uploaded to Convex file storage
**And** the user record's avatarUrl is updated with the storage URL
**And** the new avatar appears in the sidebar user button immediately (Convex reactivity)

### AC7: Success/error feedback on save

**Given** the user clicks "Save" on the Account page
**When** the save succeeds
**Then** a success toast/alert is displayed
**When** the save fails (e.g., network error)
**Then** an error toast/alert is displayed with a clear message

## Implementation Notes

### Files to modify
- `apps/web/src/components/app-sidebar.tsx` — remove Settings and Get Help from navSecondary data array
- `apps/web/src/components/nav-user.tsx` — update button label to real name, update menu items to Account + Get Help + Log out, add navigation links
- `apps/web/src/app/(app)/settings/page.tsx` — replace placeholder with full Account page

### Files to create
- `apps/web/src/components/app/settings/profile-form.tsx` — profile form with name, avatar drag-and-drop, language selector
- Convex mutation for profile update (if not already existing) in `packages/backend/convex/`

### Source reference (port from)
- `football-dashboard-2/src/app/(dashboard)/settings/page.tsx` — two-column layout: profile card (2/3) + access card (1/3)
- `football-dashboard-2/src/app/(dashboard)/settings/profile-form.tsx` — avatar drag-and-drop with preview, name input, language selector

### User data available from Convex
- `currentUser` query: name, fullName, email, image, avatarUrl, role, teamId, status
- Team name: query teams table by teamId
- Role: string enum "admin" | "coach" | "analyst" | "physio" | "player" | "staff"

### Language values
- Store as string: "en" or "it"
- Display as: "English" / "Italian"
- Field name on user record: `preferredLanguage` (add to Convex users table if not present)

### Avatar upload pattern
Use Convex file storage: generateUploadUrl → upload file → get storageId → save to user record. Check if this pattern already exists in the project (e.g., player photo uploads).

### Role badge colors
- Admin: blue (primary)
- Coach: green
- Analyst: purple
- Physio/Medical: orange
- Player: cyan
- Staff: gray (secondary)
