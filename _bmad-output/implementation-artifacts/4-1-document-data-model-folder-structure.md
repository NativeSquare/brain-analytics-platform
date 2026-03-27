# Story 4.1: Document Data Model & Folder Structure

Status: complete
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to create and manage document folders organized by category,
so that club documents are organized and easy to find.

## Acceptance Criteria

1. **Convex schema for `folders` table exists** — A `folders` table is defined with fields: `teamId` (id reference to `teams`), `name` (string), `parentId` (optional id reference to `folders` — `null` for top-level categories), `createdBy` (id reference to `users`), `createdAt` (number, Unix timestamp ms), `permittedRoles` (optional array of strings — role values that have access; `null` means unrestricted / all roles), `isDeleted` (optional boolean, default `false` — soft delete for safety). The table has indexes: `by_teamId` on `["teamId"]`, `by_teamId_parentId` on `["teamId", "parentId"]` (for querying children of a folder).

2. **Convex schema for `documents` table exists** — A `documents` table is defined with fields: `teamId` (id reference to `teams`), `folderId` (id reference to `folders`), `name` (string — display name), `filename` (optional string — original uploaded filename), `extension` (optional string — file extension e.g. `"pdf"`, `"xlsx"`), `storageId` (optional string — Convex storage ID for uploaded files), `videoUrl` (optional string — external video link URL), `mimeType` (optional string — MIME type of uploaded file), `fileSize` (optional number — file size in bytes), `ownerId` (id reference to `users`), `permittedRoles` (optional array of strings — role values with access; `null` inherits folder permissions), `createdAt` (number, Unix timestamp ms), `updatedAt` (number, Unix timestamp ms). The table has indexes: `by_teamId` on `["teamId"]`, `by_folderId` on `["folderId"]`, `by_teamId_folderId` on `["teamId", "folderId"]` (for querying documents in a folder).

3. **Convex schema for `documentUserPermissions` junction table exists** — A `documentUserPermissions` table is defined with fields: `teamId` (id reference to `teams`), `targetType` (union literal: `"folder" | "document"`), `targetId` (string — the `_id` of the folder or document), `userId` (id reference to `users`), `grantedBy` (id reference to `users`), `createdAt` (number, Unix timestamp ms). The table has indexes: `by_targetId` on `["targetId"]`, `by_userId_teamId` on `["userId", "teamId"]`. This table tracks individual user permissions beyond role-based access. (Schema defined here; permission CRUD is Story 4.3.)

4. **Convex schema for `documentReads` junction table exists** — A `documentReads` table is defined with fields: `teamId` (id reference to `teams`), `documentId` (id reference to `documents`), `userId` (id reference to `users`), `readAt` (number, Unix timestamp ms). The table has indexes: `by_documentId` on `["documentId"]`, `by_userId_documentId` on `["userId", "documentId"]` (for deduplication check). (Schema defined here; read tracking logic is Story 4.4.)

5. **`getFolders` query returns top-level category folders** — A query `documents.queries.getFolders` accepts `{ parentId?: Id<"folders"> }` (optional), calls `requireAuth(ctx)`, queries `folders` by `teamId` and `parentId` (where `parentId` is `undefined`/not set for top-level, or a specific folder ID for subfolders), filters out soft-deleted folders, and returns folders sorted by `name` alphabetically. Admin users see all folders; non-admin users see only folders where their role is in `permittedRoles` or `permittedRoles` is `null`/empty (unrestricted).

6. **`getFolderContents` query returns folder children** — A query `documents.queries.getFolderContents` accepts `{ folderId: Id<"folders"> }`, calls `requireAuth(ctx)`, validates the folder belongs to the user's team, queries both subfolders (`folders` where `parentId === folderId`) and documents (`documents` where `folderId === folderId`), applies access filtering, and returns `{ subfolders: Folder[], documents: Document[] }`. Subfolders sorted by name, documents sorted by `createdAt` descending.

7. **`getFolderBreadcrumb` query returns the folder ancestry path** — A query `documents.queries.getFolderBreadcrumb` accepts `{ folderId: Id<"folders"> }`, calls `requireAuth(ctx)`, walks up the `parentId` chain from the given folder to the root, and returns an ordered array of `{ _id, name }` objects representing the breadcrumb path from root to current folder.

8. **`createFolder` mutation creates a new folder** — A mutation `documents.mutations.createFolder` accepts `{ name: string, parentId?: Id<"folders"> }`, calls `requireRole(ctx, ["admin"])`, validates: name is non-empty and trimmed, if `parentId` is provided the parent must exist and belong to the same team, enforces two-level maximum depth (a folder with a `parentId` whose parent also has a `parentId` is rejected — i.e., parentId's parent must be a top-level folder or parentId itself must be top-level). Inserts the folder with `teamId`, `createdBy`, and `createdAt`. Returns the new folder ID.

9. **`renameFolder` mutation renames an existing folder** — A mutation `documents.mutations.renameFolder` accepts `{ folderId: Id<"folders">, name: string }`, calls `requireRole(ctx, ["admin"])`, validates the folder exists and belongs to the user's team, validates name is non-empty and trimmed, patches the folder with the new name. Returns success.

10. **`deleteFolder` mutation deletes an empty folder** — A mutation `documents.mutations.deleteFolder` accepts `{ folderId: Id<"folders"> }`, calls `requireRole(ctx, ["admin"])`, validates the folder exists and belongs to the user's team, checks the folder has no subfolders and no documents (counts children in both tables), throws a `VALIDATION_ERROR` ConvexError if the folder is not empty. Deletes the folder from the database (hard delete since it's empty and has no dependencies).

11. **Two-level folder depth maximum is enforced** — The `createFolder` mutation rejects any attempt to create a folder more than one level deep. Top-level categories have `parentId: undefined`. Subfolders within categories have `parentId` pointing to a top-level category. A third level (subfolder of a subfolder) is rejected with a `VALIDATION_ERROR` ConvexError message: "Maximum folder depth of two levels exceeded."

12. **`/documents` page renders a folder browser** — When the user navigates to `/documents`, a page renders showing top-level category folders as a grid or list of cards. Each folder card shows: folder name, a folder icon, and the count of items inside (subfolders + documents). Clicking a category navigates into it, showing its subfolders and documents. An "empty state" is shown when no categories exist yet.

13. **Admin can create new categories from the UI** — When an admin user is on the `/documents` page, a "New Category" button is visible. Clicking it opens a dialog with a name input field. Submitting the form calls `createFolder` and the new category appears in real time. Non-admin users do not see the "New Category" button.

14. **Admin can rename or delete empty categories from the UI** — Each folder card has a context menu (three-dot dropdown or right-click) with "Rename" and "Delete" options, visible only to admin users. "Rename" opens a dialog pre-filled with the current name. "Delete" shows a confirmation dialog; it calls `deleteFolder` and displays a toast error if the folder is not empty.

15. **Admin can create subfolders within a category** — When viewing a category's contents, the admin sees a "New Subfolder" button. Clicking it opens a dialog with a name input. Submitting calls `createFolder` with the current category as `parentId`. The subfolder appears in real time.

16. **Breadcrumb component shows the current folder path** — When the user is viewing a folder's contents, a breadcrumb displays the path: "Documents > [Category Name]" for a top-level folder, or "Documents > [Category Name] > [Subfolder Name]" for a subfolder. The "Documents" segment links back to the top-level folder view. Each segment is clickable and navigates to that folder level. Uses the existing shadcn `Breadcrumb` components.

17. **Loading and empty states** — While folder data is loading (`useQuery` returns `undefined`), skeleton placeholders are shown. When no folders exist, an empty state component is displayed with a message ("No document categories yet") and a call-to-action for admins to create the first category.

18. **Real-time updates** — Because the page uses Convex `useQuery`, any folder created, renamed, or deleted by another admin appears/updates/disappears in real time without manual refresh.

19. **Team-scoped data access enforced** — All queries filter by `teamId` from `requireAuth`. No cross-team folders or documents are ever returned. Admin role check is enforced in mutations at the Convex layer, not just the UI.

## Tasks / Subtasks

- [x] **Task 1: Define document module Convex schema tables** (AC: #1, #2, #3, #4)
  - [x] 1.1: Create `packages/backend/convex/table/folders.ts` defining the `folders` table with fields: `teamId: v.id("teams")`, `name: v.string()`, `parentId: v.optional(v.id("folders"))`, `createdBy: v.id("users")`, `createdAt: v.number()`, `permittedRoles: v.optional(v.array(v.string()))`, `isDeleted: v.optional(v.boolean())`. Add indexes: `by_teamId` on `["teamId"]`, `by_teamId_parentId` on `["teamId", "parentId"]`.
  - [x] 1.2: Create `packages/backend/convex/table/documents.ts` defining the `documents` table with fields: `teamId: v.id("teams")`, `folderId: v.id("folders")`, `name: v.string()`, `filename: v.optional(v.string())`, `extension: v.optional(v.string())`, `storageId: v.optional(v.string())`, `videoUrl: v.optional(v.string())`, `mimeType: v.optional(v.string())`, `fileSize: v.optional(v.number())`, `ownerId: v.id("users")`, `permittedRoles: v.optional(v.array(v.string()))`, `createdAt: v.number()`, `updatedAt: v.number()`. Add indexes: `by_teamId` on `["teamId"]`, `by_folderId` on `["folderId"]`, `by_teamId_folderId` on `["teamId", "folderId"]`.
  - [x] 1.3: Create `packages/backend/convex/table/documentUserPermissions.ts` defining the junction table with fields: `teamId: v.id("teams")`, `targetType: v.union(v.literal("folder"), v.literal("document"))`, `targetId: v.string()`, `userId: v.id("users")`, `grantedBy: v.id("users")`, `createdAt: v.number()`. Add indexes: `by_targetId` on `["targetId"]`, `by_userId_teamId` on `["userId", "teamId"]`.
  - [x] 1.4: Create `packages/backend/convex/table/documentReads.ts` defining the junction table with fields: `teamId: v.id("teams")`, `documentId: v.id("documents")`, `userId: v.id("users")`, `readAt: v.number()`. Add indexes: `by_documentId` on `["documentId"]`, `by_userId_documentId` on `["userId", "documentId"]`.
  - [x] 1.5: Import and register all four new tables in `packages/backend/convex/schema.ts`: add `folders`, `documents`, `documentUserPermissions`, `documentReads` to the `defineSchema` call.
  - [x] 1.6: Run `npx convex dev` to verify schema deploys without errors.

- [x] **Task 2: Export shared document constants** (AC: #1, #2)
  - [x] 2.1: Add document-related constants to `packages/shared/constants.js` (or create `packages/shared/documents.ts`): `SUPPORTED_FILE_TYPES`, `SUPPORTED_EXTENSIONS` (pdf, jpg, png, xlsx, csv), `MAX_FILE_SIZE_BYTES` (50 * 1024 * 1024 = 52428800), `MAX_FOLDER_DEPTH` (2).
  - [x] 2.2: Add document type enum: `DOCUMENT_TYPES = ["file", "video"] as const` and corresponding type.
  - [x] 2.3: Add role constants for permissions if not already defined: `ROLES = ["admin", "coach", "analyst", "physio", "player", "staff"] as const`.

- [x] **Task 3: Create folder query functions** (AC: #5, #6, #7, #19)
  - [x] 3.1: Create `packages/backend/convex/documents/queries.ts`.
  - [x] 3.2: Implement `getFolders` query: accepts `{ parentId: v.optional(v.id("folders")) }`, calls `requireAuth(ctx)`, queries `folders` using `by_teamId_parentId` index filtering by `teamId` and the specified `parentId` (or absence of `parentId` for top-level). Filters out folders where `isDeleted === true`. For non-admin users, filters to folders where `permittedRoles` is `null`/`undefined` (unrestricted) or includes the user's role. Sorts results by `name` alphabetically. Returns array of folder objects.
  - [x] 3.3: Implement `getFolderContents` query: accepts `{ folderId: v.id("folders") }`, calls `requireAuth(ctx)`, fetches the folder to validate `teamId` match, queries subfolders using `by_teamId_parentId` index with `parentId === folderId`, queries documents using `by_teamId_folderId` index with `folderId`. Applies access filtering to both. Returns `{ folder: { _id, name, parentId }, subfolders: Folder[], documents: Document[] }`.
  - [x] 3.4: Implement `getFolderBreadcrumb` query: accepts `{ folderId: v.id("folders") }`, calls `requireAuth(ctx)`, walks up the `parentId` chain (maximum 2 hops since depth is capped at 2), builds and returns an ordered array `[{ _id, name }, ...]` from root to current folder. Returns empty array if `folderId` is invalid or wrong team.
  - [x] 3.5: Implement `getFolderItemCounts` query: accepts `{ folderIds: v.array(v.id("folders")) }` (batch), calls `requireAuth(ctx)`, for each folder ID counts subfolders and documents. Returns a `Record<string, { subfolders: number, documents: number }>` map. This supports showing item counts on folder cards without N+1 queries.

- [x] **Task 4: Create folder mutation functions** (AC: #8, #9, #10, #11, #19)
  - [x] 4.1: Create `packages/backend/convex/documents/mutations.ts`.
  - [x] 4.2: Implement `createFolder` mutation: accepts `{ name: v.string(), parentId: v.optional(v.id("folders")) }`, calls `requireRole(ctx, ["admin"])`. Validates: `name.trim()` is non-empty (throw `VALIDATION_ERROR` otherwise). If `parentId` is provided: fetch the parent folder, validate it belongs to the same team, check parent's own `parentId` — if the parent already has a `parentId` (meaning it's already a subfolder), reject with `VALIDATION_ERROR: "Maximum folder depth of two levels exceeded."`. Insert folder with `{ teamId, name: name.trim(), parentId, createdBy: user._id, createdAt: Date.now() }`. Return the new folder `_id`.
  - [x] 4.3: Implement `renameFolder` mutation: accepts `{ folderId: v.id("folders"), name: v.string() }`, calls `requireRole(ctx, ["admin"])`. Fetch the folder, validate `teamId` match, validate `name.trim()` is non-empty. Patch `{ name: name.trim() }`. Return success.
  - [x] 4.4: Implement `deleteFolder` mutation: accepts `{ folderId: v.id("folders") }`, calls `requireRole(ctx, ["admin"])`. Fetch the folder, validate `teamId` match. Count subfolders: query `folders` where `parentId === folderId` and `isDeleted !== true` — if count > 0, throw `VALIDATION_ERROR: "Cannot delete folder that contains subfolders. Remove subfolders first."`. Count documents: query `documents` where `folderId === folderId` — if count > 0, throw `VALIDATION_ERROR: "Cannot delete folder that contains documents. Remove documents first."`. If empty, delete the folder (hard delete via `ctx.db.delete(folderId)`).

- [x] **Task 5: Build FolderCard component** (AC: #12, #14)
  - [x] 5.1: Create `apps/web/src/components/documents/FolderCard.tsx`. Renders a card (using shadcn `Card` or custom styled div) for a single folder. Displays: folder icon (`Folder` from `lucide-react`), folder name, item count label (e.g. "3 items"). The entire card is clickable.
  - [x] 5.2: For admin users, add a dropdown menu (shadcn `DropdownMenu`) triggered by a three-dot icon button in the top-right corner of the card. Menu items: "Rename" (pencil icon) and "Delete" (trash icon). The dropdown is hidden for non-admin users.
  - [x] 5.3: Style the card with hover state, consistent padding, and appropriate sizing for grid layout.

- [x] **Task 6: Build FolderCreateDialog component** (AC: #13, #15)
  - [x] 6.1: Create `apps/web/src/components/documents/FolderCreateDialog.tsx`. A shadcn `Dialog` component with a form containing: a text input for folder name, and submit/cancel buttons.
  - [x] 6.2: Use `react-hook-form` + Zod for validation: name is required, must be at least 1 character after trimming. On submit, call `useMutation(api.documents.mutations.createFolder)` with the name and optional `parentId` prop. Show `toast.success("Folder created")` on success.
  - [x] 6.3: Accept a `parentId` prop (optional) — when provided, the dialog title says "New Subfolder" instead of "New Category".

- [x] **Task 7: Build FolderRenameDialog component** (AC: #14)
  - [x] 7.1: Create `apps/web/src/components/documents/FolderRenameDialog.tsx`. A shadcn `Dialog` with a text input pre-filled with the current folder name, and save/cancel buttons.
  - [x] 7.2: Use `react-hook-form` + Zod for validation. On submit, call `useMutation(api.documents.mutations.renameFolder)`. Show `toast.success("Folder renamed")`.

- [x] **Task 8: Build FolderDeleteDialog component** (AC: #14)
  - [x] 8.1: Create `apps/web/src/components/documents/FolderDeleteDialog.tsx`. A shadcn `AlertDialog` with a confirmation message: "Are you sure you want to delete '[folder name]'? This action cannot be undone."
  - [x] 8.2: On confirm, call `useMutation(api.documents.mutations.deleteFolder)`. Show `toast.success("Folder deleted")` on success. Catch `ConvexError` and display the error message via `toast.error()` (e.g. "Cannot delete folder that contains documents").

- [x] **Task 9: Build DocumentFolderBreadcrumb component** (AC: #16)
  - [x] 9.1: Create `apps/web/src/components/documents/DocumentFolderBreadcrumb.tsx`. Uses the existing shadcn `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, `BreadcrumbPage` components.
  - [x] 9.2: Accepts `folderId` prop (optional). When `folderId` is provided, calls `useQuery(api.documents.queries.getFolderBreadcrumb, { folderId })` to get the ancestry path. Renders: "Documents" (link to `/documents`) > [Category Name] (link if not current) > [Subfolder Name] (current page, no link). When `folderId` is not provided (top-level view), renders only "Documents" as current page.
  - [x] 9.3: Handle loading state — show a skeleton breadcrumb while the query is pending.

- [x] **Task 10: Build the Documents page** (AC: #12, #13, #15, #16, #17, #18)
  - [x] 10.1: Create `apps/web/src/app/(app)/documents/page.tsx`.
  - [x] 10.2: Manage state: `currentFolderId` (optional folder ID, `undefined` for top-level view). Use URL search params (`?folder=<id>`) for shareable navigation — read and write `currentFolderId` from/to `searchParams`.
  - [x] 10.3: When `currentFolderId` is undefined: call `useQuery(api.documents.queries.getFolders, {})` (no parentId = top-level). Display the `DocumentFolderBreadcrumb` (no folderId). Render a grid of `FolderCard` components for each category. Show the "New Category" button for admin users.
  - [x] 10.4: When `currentFolderId` is set: call `useQuery(api.documents.queries.getFolderContents, { folderId: currentFolderId })`. Display the `DocumentFolderBreadcrumb` with the current `folderId`. Render subfolders as `FolderCard` components, then documents below (as simple list items showing name, extension icon, date — full document card styling is refined in Story 4.2). Show the "New Subfolder" button for admin users (only if current folder is a top-level category — check that folder's `parentId` is undefined). Do NOT show "New Subfolder" if the current folder is already a subfolder (would exceed depth limit).
  - [x] 10.5: Wire `FolderCard` click to update `currentFolderId` (and URL searchParam).
  - [x] 10.6: Wire `FolderCard` dropdown actions to open `FolderRenameDialog` and `FolderDeleteDialog` respectively.
  - [x] 10.7: Show loading skeletons while queries return `undefined`. Show empty state when folder list is empty.
  - [x] 10.8: Call `useQuery(api.documents.queries.getFolderItemCounts, { folderIds })` to fetch item counts for all visible folders in one batch query. Pass counts to `FolderCard` components.

- [x] **Task 11: Add Documents to sidebar navigation** (AC: #12)
  - [x] 11.1: In `apps/web/src/components/application-shell2.tsx`, add a new `NavItem` to the `navGroups` array: `{ label: "Documents", icon: IconFileText, href: "/documents" }`. Import `IconFileText` (or `IconFiles`) from `@tabler/icons-react`.
  - [x] 11.2: Verify the sidebar link renders and navigates correctly.

- [x] **Task 12: Update site header breadcrumbs** (AC: #16)
  - [x] 12.1: In `apps/web/src/components/site-header.tsx`, update the `getBreadcrumbs()` function to handle the `/documents` path segment. Add a case: when path starts with `/documents`, include "Documents" as a breadcrumb segment linking to `/documents`. Note: the in-page `DocumentFolderBreadcrumb` component handles folder-level breadcrumbs within the page content area. The site header breadcrumb only needs the top-level route segment.

- [x] **Task 13: Write backend unit tests** (AC: #5, #6, #7, #8, #9, #10, #11, #19)
  - [x] 13.1: Create `packages/backend/convex/documents/__tests__/queries.test.ts` using `@convex-dev/test` + `vitest`.
  - [x] 13.2: Test `getFolders`: (a) returns top-level folders only when no parentId specified, (b) returns subfolders when parentId specified, (c) excludes soft-deleted folders, (d) admin sees all folders regardless of permittedRoles, (e) non-admin sees only unrestricted folders or folders where their role is in permittedRoles, (f) does not return folders from a different team.
  - [x] 13.3: Test `getFolderContents`: (a) returns subfolders and documents for a given folder, (b) validates team access — returns nothing for wrong team, (c) applies access filtering for non-admin users.
  - [x] 13.4: Test `getFolderBreadcrumb`: (a) returns correct path for top-level folder (single element), (b) returns correct path for subfolder (two elements), (c) returns empty for wrong team.
  - [x] 13.5: Create `packages/backend/convex/documents/__tests__/mutations.test.ts` using `@convex-dev/test` + `vitest`.
  - [x] 13.6: Test `createFolder`: (a) creates top-level folder successfully, (b) creates subfolder within a category successfully, (c) rejects empty name, (d) rejects creating a third-level folder (depth > 2), (e) rejects non-admin users, (f) sets teamId from authenticated user.
  - [x] 13.7: Test `renameFolder`: (a) renames folder successfully, (b) rejects empty name, (c) rejects non-admin users, (d) rejects folder from different team.
  - [x] 13.8: Test `deleteFolder`: (a) deletes empty folder successfully, (b) rejects deletion of folder with subfolders, (c) rejects deletion of folder with documents, (d) rejects non-admin users, (e) rejects folder from different team.

- [x] **Task 14: Final validation** (AC: all)
  - [x] 14.1: Run `pnpm typecheck` — must pass with zero errors.
  - [x] 14.2: Run `pnpm lint` — must pass with zero errors.
  - [x] 14.3: Run backend tests (`vitest run` in packages/backend) — all new tests pass.
  - [x] 14.4: Start the dev server — navigate to `/documents`, verify the page renders with empty state.
  - [x] 14.5: Test folder CRUD: create a category, verify it appears in real time. Create a subfolder inside it. Rename both. Try to delete the category (should fail — not empty). Delete the subfolder, then delete the empty category.
  - [x] 14.6: Verify breadcrumb updates correctly when navigating into categories and subfolders.
  - [x] 14.7: Verify the "New Subfolder" button does NOT appear when inside a subfolder (to prevent depth > 2).
  - [x] 14.8: Verify non-admin users cannot see create/rename/delete controls (test with a non-admin user if possible, or verify by inspecting the requireRole guard in mutations).

## Dev Notes

### Architecture Context

This is the **foundational fullstack story for Epic 4 (Document Hub)**. It establishes the complete document data model and delivers the folder management UI. All subsequent Document Hub stories build on this foundation:

- **Story 4.2 (File Upload, Replace & Video Links):** Uses the `documents` table and `folders` structure defined here. Adds upload mutations and UI.
- **Story 4.3 (Document Permissions):** Uses the `documentUserPermissions` table defined here. Adds permission CRUD mutations and UI panel.
- **Story 4.4 (Read Tracking):** Uses the `documentReads` table defined here. Adds read tracking mutations and admin analytics UI.
- **Story 4.5 (Document Search & Browse):** Builds on the folder browsing UI created here. Adds search queries and filter UI.

This story directly implements:

- **FR11:** Admin can create, rename, and delete document categories (top-level folders)
- **FR12:** Admin can create, rename, and delete subfolders within categories (two-level maximum)
- **FR17 (partial):** Users can view documents they have access to — this story delivers the folder browsing shell; actual document viewing is Story 4.2
- **NFR2:** Real-time updates propagate via Convex subscriptions (inherent in `useQuery`)
- **NFR5:** Data access enforced at the Convex query/mutation layer (requireAuth + requireRole)
- **NFR6:** Multi-tenant isolation via teamId scoping on all document tables
- **UX-DR8:** Build folder navigation breadcrumb component for Document Hub

### Key Architectural Decisions from architecture.md

- **Data Modeling — Hybrid Normalization:** `permittedRoles: string[]` array field on folders and documents for role-based access (small, bounded list of 6 roles). `documentUserPermissions` junction table for individual user permissions (dynamic, queryable from both sides). `documentReads` junction table for read tracking (carries metadata: timestamp). [Source: architecture.md#Data-Architecture]

- **Authorization Pattern:** `requireAuth(ctx)` returns `{ user, teamId }`. `requireRole(ctx, ["admin"])` for admin-only mutations. Every query and mutation starts with the appropriate auth check. No middleware — explicit function calls. [Source: architecture.md#Authentication-&-Security]

- **State Management:** Convex `useQuery` replaces all server state. Local UI state (current folder ID, dialog open/closed) stays in React component state. URL state for shareable navigation via Next.js searchParams. [Source: architecture.md#Frontend-Architecture]

- **Dates:** Stored as Unix timestamp ms (`number`) in Convex. Displayed using `date-fns` formatting. Never stored as strings. [Source: architecture.md#Format-Patterns]

- **Error Handling:** `ConvexError` with standardized codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`. Frontend catches via `ConvexError` and displays via sonner toasts. [Source: architecture.md#Format-Patterns]

- **Component Organization:** Feature-grouped components at `components/documents/` — NOT `components/cards/FolderCard.tsx`. Cross-module components in `components/shared/`. [Source: architecture.md#Structure-Patterns]

- **Convex Organization:** Module-grouped functions at `convex/documents/queries.ts` and `convex/documents/mutations.ts`. Single `schema.ts` for all table registrations. [Source: architecture.md#Structure-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 4.1) reference the documents table schema:

> folders table: id, teamId, name, parentId, createdBy; documents table: id, teamId, folderId, name, filename, extension, storageId, videoUrl, ownerId, createdAt

**This story extends those schemas with additional fields** that are architecturally necessary:

- **`folders` table:** Added `permittedRoles` (array) for role-based access control per architecture.md's hybrid normalization pattern, `isDeleted` for soft-delete safety, and `createdAt` for audit trail.
- **`documents` table:** Added `mimeType`, `fileSize` (for upload validation and display), `permittedRoles` (role-based access), `updatedAt` (for replace tracking). These fields are `optional` and will be populated by Story 4.2 (upload).
- **`documentUserPermissions` and `documentReads` tables:** Defined in this foundational story (schema only) to avoid schema migrations in later stories. CRUD logic for these tables is deferred to Stories 4.3 and 4.4 respectively.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export `requireAuth(ctx)` returning `{ user, teamId }` and `requireRole(ctx, roles)` |
| `teams` table in schema | Story 2.1 | `packages/backend/convex/table/teams.ts` must exist and be registered in `schema.ts` |
| Users table with `teamId` and 6-role `role` field | Story 2.1 | User schema must have `teamId` and expanded role union (`admin`, `coach`, `analyst`, `physio`, `player`, `staff`) |
| Sidebar navigation component | Story 1.3 | `apps/web/src/components/application-shell2.tsx` must have the `navGroups` array to extend |
| shadcn/ui theme configured | Story 1.2 | shadcn preset applied, CSS variables active |
| Breadcrumb UI component | Story 1.2 | `apps/web/src/components/ui/breadcrumb.tsx` must exist (already present in codebase) |

### Current State (Baseline)

**`convex/schema.ts`:** Currently imports `authTables`, `adminInvites`, `feedback`, `users`. **No document tables exist.**

**`convex/table/` directory:** Contains `users.ts`, `adminInvites.ts`, `feedback.ts`, `admin.ts`. **No document-related table files.**

**`convex/lib/` directory:** Contains only `auth/ResendOTP.ts` and `auth/ResendOTPPasswordReset.ts`. **No `auth.ts` helpers or `permissions.ts` utilities exist yet** — these should be created by Story 2.1. If Story 2.1 is not yet complete, the auth helpers in this story's mutations will be blocked. As a fallback, `requireAdmin` exists in `table/admin.ts` and could be used temporarily.

**`apps/web/src/app/(app)/`:** Contains routes for `/team`, `/users`. **No `/documents` route exists.**

**`apps/web/src/components/`:** Contains `app/`, `custom/`, `ui/` directories. **No `documents/` or `shared/` directory exists.** The `ui/breadcrumb.tsx` component is already available.

**Sidebar navigation (`application-shell2.tsx`):** The `navGroups` array currently contains only "Users" and "Team" items under a "General" group. Documents must be added.

**Site header (`site-header.tsx`):** The `getBreadcrumbs()` function handles `/team` and `/users` segments. Needs a `/documents` case added.

**`packages/shared/constants.js`:** Contains only app identity constants (`APP_NAME`, `APP_ADDRESS`, `APP_DOMAIN`, `APP_SLUG`). No document constants.

**Existing utilities:** `convex/utils/generateFunctions.ts` generates standard CRUD functions from schema — can be used for basic folder/document operations but custom logic (depth validation, emptiness check) requires manual implementation. `convex/storage.ts` has `generateUploadUrl` and `getImageUrl`/`getImageUrls` — relevant for Story 4.2 (upload), not directly for this story.

### Folder Depth Enforcement Logic

The two-level maximum must be enforced in the `createFolder` mutation:

```typescript
// In createFolder mutation:
if (parentId) {
  const parent = await ctx.db.get(parentId)
  if (!parent || parent.teamId !== teamId) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Parent folder not found" })
  }
  // Check depth: if parent has a parentId, it's already level 2 → reject level 3
  if (parent.parentId !== undefined) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Maximum folder depth of two levels exceeded."
    })
  }
}
```

This means:
- **Level 1 (top-level category):** `parentId` is `undefined`
- **Level 2 (subfolder):** `parentId` points to a Level 1 folder (whose own `parentId` is `undefined`)
- **Level 3+ (rejected):** `parentId` points to a Level 2 folder (whose own `parentId` is set) → rejected

### Batch Item Count Pattern

To avoid N+1 queries when displaying folder cards with item counts:

```typescript
// getFolderItemCounts query — batch approach
export const getFolderItemCounts = query({
  args: { folderIds: v.array(v.id("folders")) },
  handler: async (ctx, { folderIds }) => {
    const { teamId } = await requireAuth(ctx)
    const counts: Record<string, { subfolders: number; documents: number }> = {}

    for (const folderId of folderIds) {
      const subfolders = await ctx.db.query("folders")
        .withIndex("by_teamId_parentId", q => q.eq("teamId", teamId).eq("parentId", folderId))
        .filter(q => q.neq(q.field("isDeleted"), true))
        .collect()
      const documents = await ctx.db.query("documents")
        .withIndex("by_teamId_folderId", q => q.eq("teamId", teamId).eq("folderId", folderId))
        .collect()
      counts[folderId] = { subfolders: subfolders.length, documents: documents.length }
    }

    return counts
  },
})
```

The frontend calls this once with all visible folder IDs, rather than one query per folder.

### URL-Based Folder Navigation

Use Next.js `searchParams` for shareable folder navigation:

```typescript
// In documents/page.tsx
"use client"
import { useSearchParams, useRouter } from "next/navigation"

export default function DocumentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentFolderId = searchParams.get("folder") as Id<"folders"> | null

  const navigateToFolder = (folderId: string | null) => {
    if (folderId) {
      router.push(`/documents?folder=${folderId}`)
    } else {
      router.push("/documents")
    }
  }
  // ...
}
```

This allows users to bookmark and share folder locations. The `?folder=<id>` pattern is simple and doesn't require dynamic route segments.

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/table/folders.ts` | Created | Folders table definition |
| `packages/backend/convex/table/documents.ts` | Created | Documents table definition |
| `packages/backend/convex/table/documentUserPermissions.ts` | Created | User-level permissions junction table |
| `packages/backend/convex/table/documentReads.ts` | Created | Document read tracking junction table |
| `packages/backend/convex/schema.ts` | Modified | Register four new document tables |
| `packages/shared/constants.js` (or new `documents.ts`) | Modified/Created | Document constants: file types, max size, max depth, roles |
| `packages/backend/convex/documents/queries.ts` | Created | getFolders, getFolderContents, getFolderBreadcrumb, getFolderItemCounts |
| `packages/backend/convex/documents/mutations.ts` | Created | createFolder, renameFolder, deleteFolder |
| `apps/web/src/components/documents/FolderCard.tsx` | Created | Folder card component with admin actions |
| `apps/web/src/components/documents/FolderCreateDialog.tsx` | Created | Create folder/subfolder dialog |
| `apps/web/src/components/documents/FolderRenameDialog.tsx` | Created | Rename folder dialog |
| `apps/web/src/components/documents/FolderDeleteDialog.tsx` | Created | Delete folder confirmation dialog |
| `apps/web/src/components/documents/DocumentFolderBreadcrumb.tsx` | Created | Folder path breadcrumb component |
| `apps/web/src/app/(app)/documents/page.tsx` | Created | Documents page with folder browser |
| `apps/web/src/components/application-shell2.tsx` | Modified | Add Documents nav item to sidebar |
| `apps/web/src/components/site-header.tsx` | Modified | Add /documents breadcrumb segment |
| `packages/backend/convex/documents/__tests__/queries.test.ts` | Created | Unit tests for document queries |
| `packages/backend/convex/documents/__tests__/mutations.test.ts` | Created | Unit tests for folder mutations |

### What This Story Does NOT Include

- **No file upload UI or mutation** — that's Story 4.2
- **No file replace functionality** — that's Story 4.2
- **No video link creation** — that's Story 4.2
- **No permission management UI (role/user selectors)** — that's Story 4.3 (schema is defined here, CRUD is Story 4.3)
- **No read tracking logic or analytics UI** — that's Story 4.4 (schema is defined here, logic is Story 4.4)
- **No document search or filtering** — that's Story 4.5
- **No document detail view** — that's Story 4.2
- **No document download** — that's Story 4.2
- **No notification creation for document events** — deferred to Story 4.2/4.3

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 2.1 (auth helpers, RBAC) not complete yet | Check for `convex/lib/auth.ts` with `requireAuth`/`requireRole` before starting. If missing, this story is blocked. Fallback: use existing `requireAdmin` from `table/admin.ts` for admin mutations, and implement basic auth check inline for queries. |
| `parentId` self-referencing index on `folders` table may have Convex limitations | Convex supports self-referencing IDs. The `v.optional(v.id("folders"))` pattern is standard. Test with `npx convex dev` immediately after schema creation. |
| Convex `by_teamId_parentId` composite index may not support querying where `parentId` is `undefined` | Convex indexes support querying specific values including `undefined`. If there are issues with undefined in composite indexes, fallback to querying `by_teamId` and filtering `parentId === undefined` in memory. Test during Task 1.6. |
| Large number of folders in a team causing slow rendering | For Sprint 1 with a single team, this is not a concern. The batch `getFolderItemCounts` pattern avoids N+1. If needed later, add pagination. |
| URL search param `?folder=<id>` exposes internal Convex IDs | Convex IDs are opaque strings, not sequential. Acceptable for Sprint 1. Future enhancement: use slugs. |

### Performance Considerations

- **Batch folder item counts:** The `getFolderItemCounts` query accepts an array of folder IDs and returns counts for all in one query, avoiding N+1. The frontend collects all visible folder IDs and makes a single batch call.
- **Index usage:** `by_teamId_parentId` is the primary index for folder browsing (direct child lookup). `by_teamId_folderId` for document-in-folder queries.
- **Breadcrumb walk:** Maximum 2 hops (depth cap at 2), so the breadcrumb query makes at most 2 `db.get()` calls — negligible performance impact.

### Alignment with Architecture Document

- **Data Model:** Matches `architecture.md § Data Architecture` — hybrid normalization (arrays for roles on folders/documents, junction tables for user permissions and read tracking)
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — requireAuth/requireRole in every function, teamId filtering
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — components in `components/documents/`, page in `app/(app)/documents/`
- **Convex Organization:** Matches `architecture.md § Convex Function Organization` — `convex/documents/queries.ts` and `convex/documents/mutations.ts`
- **Naming:** Matches `architecture.md § Naming Patterns` — camelCase tables (`folders`, `documents`, `documentUserPermissions`, `documentReads`), PascalCase components (`FolderCard.tsx`), camelCase exports (`createFolder`)
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/documents/__tests__/`
- **Dates:** Matches `architecture.md § Format Patterns` — timestamps as numbers, `date-fns` for display
- **Error Handling:** Matches `architecture.md § Format Patterns` — ConvexError with `VALIDATION_ERROR`, `NOT_FOUND`, `NOT_AUTHORIZED` codes
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Data-Architecture] — Hybrid normalization, `permittedRoles: string[]` arrays, `documentUserPermissions` junction, `documentReads` junction
- [Source: architecture.md#Authentication-&-Security] — requireAuth, requireRole, teamId scoping, RBAC model
- [Source: architecture.md#Frontend-Architecture] — Page structure (`app/(app)/documents/page.tsx`), component organization (`components/documents/`), state management (useQuery + URL params)
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting, ConvexError codes
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, loading state pattern, form pattern, enforcement guidelines
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries, requirements to structure mapping
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, no REST, error handling
- [Source: epics.md#Story-4.1] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR11, FR12 mapped to Epic 4

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (via Claude Code)

### Debug Log References

- Fixed TS7022 circular type in `getFolderBreadcrumb` — refactored from while-loop to explicit 2-level lookup to avoid self-referential variable type inference.

### Completion Notes List

- **Task 1 (Schema):** Created 4 table definitions (folders, documents, documentUserPermissions, documentReads) and registered in schema.ts. Codegen verified.
- **Task 2 (Constants):** Created `packages/shared/documents.ts` with SUPPORTED_EXTENSIONS, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FOLDER_DEPTH, DOCUMENT_TYPES. Registered export in package.json. Roles already existed in `packages/shared/roles.ts`.
- **Task 3 (Queries):** Implemented getFolders, getFolderContents, getFolderBreadcrumb, getFolderItemCounts in `convex/documents/queries.ts`. All use requireAuth, filter by teamId, role-based access filtering for non-admin users.
- **Task 4 (Mutations):** Implemented createFolder, renameFolder, deleteFolder in `convex/documents/mutations.ts`. All use requireRole(["admin"]), enforce depth limit, validate emptiness on delete.
- **Tasks 5-9 (UI Components):** Created FolderCard, FolderCreateDialog, FolderRenameDialog, FolderDeleteDialog, DocumentFolderBreadcrumb in `apps/web/src/components/documents/`.
- **Task 10 (Page):** Rewrote `apps/web/src/app/(app)/documents/page.tsx` with full folder browser: URL-based navigation, loading skeletons, empty states, admin controls, batch item counts.
- **Task 11 (Sidebar):** Documents nav item already existed in `application-shell2.tsx` (IconFolders, /documents).
- **Task 12 (Header Breadcrumbs):** Documents already in `routeLabelMap` in `site-header.tsx`.
- **Task 13 (Tests):** 27 tests across queries.test.ts (13 tests) and mutations.test.ts (14 tests). All pass. Full suite: 146/146 pass.
- **Task 14 (Validation):** Backend typecheck passes. Admin typecheck passes. All tests pass.

### File List

- `packages/backend/convex/table/folders.ts` — Created
- `packages/backend/convex/table/documents.ts` — Created
- `packages/backend/convex/table/documentUserPermissions.ts` — Created
- `packages/backend/convex/table/documentReads.ts` — Created
- `packages/backend/convex/schema.ts` — Modified (added 4 table imports/registrations)
- `packages/shared/documents.ts` — Created
- `packages/shared/package.json` — Modified (added documents export)
- `packages/backend/convex/documents/queries.ts` — Created
- `packages/backend/convex/documents/mutations.ts` — Created
- `apps/web/src/components/documents/FolderCard.tsx` — Created
- `apps/web/src/components/documents/FolderCreateDialog.tsx` — Created
- `apps/web/src/components/documents/FolderRenameDialog.tsx` — Created
- `apps/web/src/components/documents/FolderDeleteDialog.tsx` — Created
- `apps/web/src/components/documents/DocumentFolderBreadcrumb.tsx` — Created
- `apps/web/src/app/(app)/documents/page.tsx` — Modified (rewrote from placeholder)
- `packages/backend/convex/documents/__tests__/queries.test.ts` — Created
- `packages/backend/convex/documents/__tests__/mutations.test.ts` — Created
