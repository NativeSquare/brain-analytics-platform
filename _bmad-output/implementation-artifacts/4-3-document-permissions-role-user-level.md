# Story 4.3: Document Permissions (Role & User-Level)

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

> **Testing philosophy: Write tests where they matter — critical business logic, security rules, data integrity, and complex state management. Do NOT write tests for trivial getters, simple UI rendering, or obvious CRUD. Quality over quantity.**

> **IMPORTANT: Permission logic MUST have thorough unit/integration tests using @convex-dev/test. Test each role (admin, staff, player) against each permission level. This is critical security logic — test coverage is mandatory here.**

## Story

As an admin,
I want to control who can access each document or folder by role or by individual user,
so that sensitive documents (like contracts) are only visible to authorized people.

## Acceptance Criteria

1. **`setFolderPermissions` mutation sets role and user permissions on a folder** — A Convex mutation `documents.mutations.setFolderPermissions` accepts `{ folderId: Id<"folders">, permittedRoles: string[], userIds: Id<"users">[] }`, calls `requireRole(ctx, ["admin"])`, validates the folder exists and belongs to the user's team. Patches the folder's `permittedRoles` field with the provided array (empty array `[]` means no role-based access; `undefined`/null means unrestricted — all roles). Syncs the `documentUserPermissions` table for this folder: deletes all existing `documentUserPermissions` records where `targetType === "folder"` and `targetId === folderId`, then inserts new records for each `userId` in the provided array with `targetType: "folder"`, `targetId: folderId`, `grantedBy: user._id`, `createdAt: Date.now()`, `teamId`. Returns success.

2. **`setDocumentPermissions` mutation sets role and user permissions on a single document** — A Convex mutation `documents.mutations.setDocumentPermissions` accepts `{ documentId: Id<"documents">, permittedRoles: string[] | undefined, userIds: Id<"users">[] }`, calls `requireRole(ctx, ["admin"])`, validates the document exists and belongs to the user's team. When `permittedRoles` is `undefined`, the document inherits its parent folder's permissions (the default state from Story 4.2). When `permittedRoles` is an array, the document uses its own role-based permissions (override). Patches the document's `permittedRoles` field. Syncs the `documentUserPermissions` table for this document (same delete + re-insert pattern as AC #1 using `targetType: "document"` and `targetId: documentId`). Returns success.

3. **`checkAccess` permission utility enforces access control** — A shared utility function in `packages/backend/convex/lib/permissions.ts` exports `checkAccess(ctx, { permittedRoles, targetId, targetType, teamId, folderId? })` that determines whether the current user can access a resource. Logic:
   - Admins always have access (return `true` immediately).
   - If `permittedRoles` is `undefined` or `null` (unrestricted), return `true`.
   - If `permittedRoles` is an array, check if the user's role is in the array — if yes, return `true`.
   - If role not in array, check `documentUserPermissions` table for a record where `targetId` matches and `userId` matches the current user — if found, return `true`.
   - For documents with `permittedRoles === undefined` (inheriting): look up the parent folder's `permittedRoles` and the folder's `documentUserPermissions` records to determine access.
   - Return `false` if none of the checks pass.

4. **Folder access filtering applied in all document queries** — The `getFolders` query (Story 4.1) must filter results using `checkAccess` so non-admin users only see folders they have permission to access. The `getFolderContents` query (Story 4.1) must filter both subfolders and documents using `checkAccess`. Users without access to a folder do not see it in any view — it is as if it does not exist for them.

5. **Document access filtering applied in document queries** — Documents with their own `permittedRoles` (override) are filtered by document-level permissions. Documents with `permittedRoles === undefined` (inherit) are filtered by their parent folder's permissions. Non-admin users never see documents they lack access to.

6. **Permissions panel opens from folder or document context** — When an admin views a folder (via folder card context menu → "Permissions") or a document (via document detail view → "Permissions" button), a permissions panel (Sheet or Dialog) opens. The panel is only visible to admin users.

7. **Permissions panel shows role checkboxes** — The panel displays a checkbox for each of the 6 roles: Admin (always checked, disabled — admins always have access), Coach, Analyst, Physio/Medical, Player, Staff. Checkboxes reflect the current `permittedRoles` state. When no permissions are set (unrestricted), all checkboxes are checked. The admin can check/uncheck roles to restrict access.

8. **Permissions panel shows user search and list** — Below the role checkboxes, the panel has a user search field (Combobox or Command input). The admin can search team members by name or email and add them individually. Added users appear in a list with their name, role badge, and a remove button. The user list reflects current `documentUserPermissions` records for this target.

9. **Document permission inheritance toggle** — When editing a document's permissions, a toggle or switch labeled "Inherit from folder" is shown. When ON (default for new documents), the document uses its parent folder's permissions (`permittedRoles: undefined`). When OFF, the document uses its own permission settings, and the role checkboxes + user search become editable for the document specifically.

10. **Saving permissions triggers real-time access changes** — When the admin saves permissions, the mutation executes and Convex subscriptions propagate the change. Users who lose access will no longer see the folder/document on their next query refresh (real-time via `useQuery`). Users who gain access will see the folder/document appear.

11. **Access control enforced at the Convex query layer** — All permission checks happen in Convex queries/mutations, NOT in the frontend. The frontend conditionally renders the permissions UI based on admin role, but actual data filtering is server-side. A non-admin user cannot access restricted data even by calling Convex functions directly. This enforces NFR5.

12. **`getPermissions` query returns current permissions for a target** — A query `documents.queries.getPermissions` accepts `{ targetType: "folder" | "document", targetId: string }`, calls `requireRole(ctx, ["admin"])` (only admins can view permission settings), retrieves the target's `permittedRoles` array, queries `documentUserPermissions` for all user records on this target (joining with user table to get names), and returns `{ permittedRoles: string[] | undefined, users: Array<{ userId, fullName, email, role }> }`.

13. **`getTeamMembers` query supports user search** — A query (in `users/queries.ts` or `documents/queries.ts`) returns team members for the user search in the permissions panel. Accepts `{ search?: string }`, calls `requireRole(ctx, ["admin"])`, queries users in the team filtered by name/email search string. Returns `Array<{ _id, fullName, email, role }>`. Limited to 20 results for performance.

## Tasks / Subtasks

- [ ] **Task 1: Create `checkAccess` permission utility** (AC: #3, #11)
  - [ ] 1.1: Create `packages/backend/convex/lib/permissions.ts`. Export `checkAccess` function accepting `(ctx, user, { permittedRoles, targetId, targetType, teamId, folderId? })` where `user` is the authenticated user object with `role` and `_id` fields.
  - [ ] 1.2: Implement access check logic:
    - If `user.role === "admin"`, return `true` immediately.
    - If `permittedRoles` is `undefined` or `null`, return `true` (unrestricted).
    - If `permittedRoles` is an array and includes `user.role`, return `true`.
    - Query `documentUserPermissions` table using `by_targetId` index where `targetId` matches — check if any record has `userId === user._id`. If found, return `true`.
    - Return `false`.
  - [ ] 1.3: Export `checkDocumentAccess` helper that handles inheritance: accepts `(ctx, user, document)`. If `document.permittedRoles` is defined, delegate to `checkAccess` with document-level data. If `document.permittedRoles` is `undefined`, fetch the parent folder (`ctx.db.get(document.folderId)`), then delegate to `checkAccess` with the folder's `permittedRoles`, `targetType: "folder"`, and `targetId: folder._id`.
  - [ ] 1.4: Export `filterByAccess` batch helper that accepts an array of items with `permittedRoles` and returns only accessible items for the current user. This avoids calling `checkAccess` in a loop with individual permission table queries — instead, batch-load all relevant `documentUserPermissions` records upfront and check in-memory.

- [ ] **Task 2: Update existing document queries to enforce permissions** (AC: #4, #5, #11)
  - [ ] 2.1: Modify `packages/backend/convex/documents/queries.ts` — `getFolders` query: after fetching folders, apply access filtering. For admin users, return all folders (no filtering). For non-admin users, use `filterByAccess` to return only folders where the user has role-based or individual access. The current Story 4.1 implementation already has basic role filtering — replace it with the comprehensive `checkAccess` pattern that also checks `documentUserPermissions`.
  - [ ] 2.2: Modify `getFolderContents` query: apply access filtering to both subfolders and documents. For documents, use `checkDocumentAccess` to handle inheritance. Admin users see all content.
  - [ ] 2.3: Modify `getDocument` query (from Story 4.2): add access check — call `checkDocumentAccess` for the requesting user. If access denied, throw `NOT_AUTHORIZED` error. Admin users bypass the check.
  - [ ] 2.4: Modify `getDocumentUrl` query (from Story 4.2): add the same access check before returning signed URLs. Users without document access must not be able to obtain download URLs.

- [ ] **Task 3: Implement `setFolderPermissions` mutation** (AC: #1, #10)
  - [ ] 3.1: Add `setFolderPermissions` to `packages/backend/convex/documents/mutations.ts`. Accepts `{ folderId: v.id("folders"), permittedRoles: v.array(v.string()), userIds: v.array(v.id("users")) }`.
  - [ ] 3.2: Call `requireRole(ctx, ["admin"])`. Fetch the folder, validate `teamId` match.
  - [ ] 3.3: Validate `permittedRoles` values — each must be one of `["admin", "coach", "analyst", "physio", "player", "staff"]`. Throw `VALIDATION_ERROR` for invalid role values.
  - [ ] 3.4: Validate `userIds` — each user must exist and belong to the same team. Throw `VALIDATION_ERROR` if any user is invalid or from a different team.
  - [ ] 3.5: Patch the folder: `ctx.db.patch(folderId, { permittedRoles })`. If `permittedRoles` is an empty array, this means no roles have access (only individually-added users and admins).
  - [ ] 3.6: Sync `documentUserPermissions`: query all records where `targetType === "folder"` and `targetId === folderId` using `by_targetId` index. Delete all existing records. Insert new records for each `userId` with `{ teamId, targetType: "folder", targetId: folderId, userId, grantedBy: user._id, createdAt: Date.now() }`.

- [ ] **Task 4: Implement `setDocumentPermissions` mutation** (AC: #2, #9, #10)
  - [ ] 4.1: Add `setDocumentPermissions` to `packages/backend/convex/documents/mutations.ts`. Accepts `{ documentId: v.id("documents"), permittedRoles: v.optional(v.array(v.string())), userIds: v.array(v.id("users")) }`.
  - [ ] 4.2: Call `requireRole(ctx, ["admin"])`. Fetch the document, validate `teamId` match.
  - [ ] 4.3: Validate `permittedRoles` values if provided (same validation as folder).
  - [ ] 4.4: Validate `userIds` (same validation as folder).
  - [ ] 4.5: Patch the document: `ctx.db.patch(documentId, { permittedRoles })`. When `permittedRoles` is `undefined` (passed as `undefined`), the document reverts to folder inheritance.
  - [ ] 4.6: Sync `documentUserPermissions`: same delete + re-insert pattern using `targetType: "document"` and `targetId: documentId`. When inheriting (`permittedRoles === undefined`), clear all document-level user permissions too (the folder's permissions apply).

- [ ] **Task 5: Implement `getPermissions` query** (AC: #12)
  - [ ] 5.1: Add `getPermissions` to `packages/backend/convex/documents/queries.ts`. Accepts `{ targetType: v.union(v.literal("folder"), v.literal("document")), targetId: v.string() }`.
  - [ ] 5.2: Call `requireRole(ctx, ["admin"])`. Fetch the target (folder or document), validate `teamId` match.
  - [ ] 5.3: Get `permittedRoles` from the target.
  - [ ] 5.4: Query `documentUserPermissions` using `by_targetId` index where `targetId` matches. For each record, fetch the user to get `fullName`, `email`, `role`.
  - [ ] 5.5: Return `{ permittedRoles: string[] | undefined, users: Array<{ userId: Id<"users">, fullName: string, email: string, role: string }> }`.

- [ ] **Task 6: Implement `getTeamMembers` query for user search** (AC: #13)
  - [ ] 6.1: Add `getTeamMembers` query to `packages/backend/convex/users/queries.ts` (or `documents/queries.ts`). Accepts `{ search: v.optional(v.string()) }`.
  - [ ] 6.2: Call `requireRole(ctx, ["admin"])`. Query `users` table filtered by `teamId`.
  - [ ] 6.3: If `search` is provided and non-empty, filter users where `fullName` or `email` contains the search string (case-insensitive, using `.filter()` since Convex doesn't support LIKE queries natively — use string includes check). Consider using Convex search indexes if available, otherwise filter in-memory.
  - [ ] 6.4: Limit results to 20. Return `Array<{ _id, fullName, email, role }>`. Exclude the current user from results (they're already admin with automatic access).

- [ ] **Task 7: Build PermissionsPanel component** (AC: #6, #7, #8, #9, #10)
  - [ ] 7.1: Create `apps/admin/src/components/documents/PermissionsPanel.tsx`. Uses shadcn `Sheet` (side panel). Accepts props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `targetType: "folder" | "document"`, `targetId: string`, `targetName: string`, `folderId?: string` (for documents, to show inheritance context).
  - [ ] 7.2: When open, call `useQuery(api.documents.queries.getPermissions, { targetType, targetId })` to load current permissions. Show skeleton while loading.
  - [ ] 7.3: **Inheritance toggle** (documents only): render a `Switch` labeled "Inherit from folder". Default ON when `permittedRoles` from the query is `undefined`. When toggled ON → set local state to inherit mode (disable role/user editing). When toggled OFF → enable role/user editing with current folder permissions pre-populated as starting point.
  - [ ] 7.4: **Role checkboxes section**: render 6 checkboxes, one per role. "Admin" checkbox is always checked and disabled (admins always have access). Other checkboxes are interactive. When permissions are unrestricted (`permittedRoles === undefined` or null), all checkboxes show as checked. Use local state to track selected roles.
  - [ ] 7.5: **User search section**: render a `Command` (shadcn) or `Combobox` input. On input change, call `useQuery(api.users.queries.getTeamMembers, { search: inputValue })` (debounce input to avoid excessive queries — use 300ms debounce). Display matching users in a dropdown. Clicking a user adds them to the local `selectedUsers` list.
  - [ ] 7.6: **Selected users list**: render added users with `Avatar` (initials), name, role `Badge`, and a remove `Button` (X icon). Users from the existing `getPermissions` response are pre-populated.
  - [ ] 7.7: **Save button**: on click, call the appropriate mutation (`setFolderPermissions` or `setDocumentPermissions`) with the current role selections and user IDs. Show `toast.success("Permissions updated")` on success. Close the panel.
  - [ ] 7.8: **"Unrestricted" shortcut**: add a button or link "Make unrestricted (all roles)" that checks all role checkboxes and clears the user list — effectively removing restrictions.

- [ ] **Task 8: Add "Permissions" action to folder context menu** (AC: #6)
  - [ ] 8.1: Modify `apps/admin/src/components/documents/FolderCard.tsx` (from Story 4.1). Add a "Permissions" item (lock/shield icon) to the admin dropdown menu, between "Rename" and "Delete".
  - [ ] 8.2: Add state management in the documents page for `permissionsTarget: { type: "folder" | "document", id: string, name: string } | null` and `isPermissionsPanelOpen: boolean`.
  - [ ] 8.3: Wire the "Permissions" menu item to open the `PermissionsPanel` with the folder's data.

- [ ] **Task 9: Add "Permissions" button to DocumentDetail** (AC: #6)
  - [ ] 9.1: Modify `apps/admin/src/components/documents/DocumentDetail.tsx` (from Story 4.2). Add a "Permissions" button (lock/shield icon) visible only to admin users, positioned near the "Replace File" and "Delete" buttons.
  - [ ] 9.2: Wire the button to open the `PermissionsPanel` with the document's data and its `folderId` for inheritance context.

- [ ] **Task 10: Add folder permission indicator to FolderCard** (AC: #7)
  - [ ] 10.1: Modify `FolderCard.tsx` to display a small lock icon or "Restricted" badge when the folder has `permittedRoles` set (non-null, non-undefined). Unrestricted folders show no indicator.
  - [ ] 10.2: The indicator is informational only — it helps admins see at a glance which folders have restricted access.

- [ ] **Task 11: Write backend unit tests** (AC: #1, #2, #3, #4, #5, #11, #12, #13)
  - [ ] 11.1: Create or extend `packages/backend/convex/documents/__tests__/permissions.test.ts`.
  - [ ] 11.2: Test `checkAccess`: (a) admin always has access regardless of `permittedRoles`, (b) user with matching role has access when role is in `permittedRoles`, (c) user without matching role is denied when role is not in `permittedRoles`, (d) user with individual permission record has access even when role is excluded, (e) unrestricted access (`permittedRoles: undefined`) grants all users access.
  - [ ] 11.3: Test `checkDocumentAccess` inheritance: (a) document with `permittedRoles: undefined` uses folder permissions, (b) document with its own `permittedRoles` overrides folder permissions, (c) user with folder-level individual permission can access inherited document, (d) user with document-level individual permission can access overridden document.
  - [ ] 11.4: Test `setFolderPermissions`: (a) admin sets role permissions successfully — verify `permittedRoles` updated on folder, (b) admin adds individual users — verify `documentUserPermissions` records created, (c) updating permissions replaces previous user permissions (old records deleted, new inserted), (d) non-admin receives `NOT_AUTHORIZED`, (e) invalid role value throws `VALIDATION_ERROR`, (f) user from different team throws `VALIDATION_ERROR`.
  - [ ] 11.5: Test `setDocumentPermissions`: (a) admin overrides document permissions — verify `permittedRoles` set on document, (b) admin reverts to inheritance (`permittedRoles: undefined`) — verify field cleared and user permissions removed, (c) non-admin receives `NOT_AUTHORIZED`.
  - [ ] 11.6: Test `getPermissions`: (a) returns current `permittedRoles` and user list for a folder, (b) returns current state for a document, (c) non-admin receives `NOT_AUTHORIZED`.
  - [ ] 11.7: Test access filtering in `getFolders`: (a) admin sees all folders including restricted ones, (b) coach user sees only folders where `permittedRoles` includes "coach" or is unrestricted, (c) user with individual permission sees the folder even if role is excluded, (d) user without any access does not see the folder.
  - [ ] 11.8: Test access filtering in `getFolderContents`: (a) admin sees all documents, (b) non-admin sees only accessible documents — testing both direct permissions and inheritance.

- [ ] **Task 12: Final validation** (AC: all)
  - [ ] 12.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 12.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 12.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 12.4: Start the dev server. Navigate to `/documents`. Verify:
    - Admin can see all folders (including any with restrictions).
    - Admin can open "Permissions" from a folder's context menu.
  - [ ] 12.5: Test folder permissions: set a folder to allow only "coach" and "analyst" roles. Verify:
    - A coach user sees the folder.
    - A player user does NOT see the folder.
    - An admin still sees the folder (admin always has access).
  - [ ] 12.6: Test individual user permissions: add a specific player user to a restricted folder. Verify that player can now see the folder even though the "player" role is not in `permittedRoles`.
  - [ ] 12.7: Test document inheritance: verify documents inside a restricted folder are automatically hidden from unauthorized users without needing document-level permissions.
  - [ ] 12.8: Test document override: set document-specific permissions that differ from the folder. Verify the document uses its own permissions, not the folder's.
  - [ ] 12.9: Test the "Inherit from folder" toggle: toggle OFF, set different permissions, save. Toggle back ON, save. Verify the document reverts to folder permissions.
  - [ ] 12.10: Verify removing all restrictions ("Make unrestricted") makes a folder visible to all users again.
  - [ ] 12.11: Verify non-admin users do NOT see the "Permissions" menu item or button.

## Dev Notes

### Architecture Context

This is the **permission management story for Epic 4 (Document Hub)**. It implements the core access control mechanism that gates who can see which documents and folders. This is a security-critical story — all permission checks must happen at the Convex query layer, not just the UI.

This story directly implements:

- **FR15:** Admin can set access permissions on documents and folders by role or by individual user
- **NFR5:** All data access enforced at the Convex mutation/query layer (not UI-only)
- **NFR6:** Multi-tenant isolation (teamId scoping — inherited from existing pattern)
- **NFR7 (partial):** Medical/injury data access control pattern (same role-based mechanism reused by Epic 5)

This story creates the `convex/lib/permissions.ts` shared utility referenced in the architecture document — this utility will be reused by calendar event access control and any future permission-gated features.

Subsequent stories build on this:

- **Story 4.4 (Read Tracking):** Read tracking counts depend on knowing who has access (the Y in "Opened by X/Y")
- **Story 4.5 (Document Search & Browse):** Search results must respect permissions — only return documents the user can access

### Key Architectural Decisions from architecture.md

- **Hybrid Permission Model:** `permittedRoles: string[]` array on folders/documents for role-based access. `documentUserPermissions` junction table for individual user permissions. This dual approach keeps the common case fast (role check is an array `includes()`) while supporting per-user exceptions via the junction table. [Source: architecture.md#Data-Architecture]

- **Permission Checking Utility:** `convex/lib/permissions.ts` — `checkAccess` is a shared utility called from document queries AND reusable by calendar invitation checks. It is NOT middleware — it's an explicit function call for clarity and testability. [Source: architecture.md#Cross-Cutting-Concerns-Mapping]

- **Authorization Pattern:** Admins always bypass permission checks. Non-admin users are filtered at the query layer. The frontend never makes authorization decisions — it only conditionally renders UI based on the user's role (to hide admin controls), but actual data is filtered server-side. [Source: architecture.md#Authentication-&-Security]

- **RBAC Model:** Six roles — `"admin" | "coach" | "analyst" | "physio" | "player" | "staff"`. Single role per user. Admins always have full access. [Source: architecture.md#Authentication-&-Security]

- **Component Organization:** `PermissionsPanel` in `components/documents/`. `PermissionSelector` in `components/shared/` (reusable for calendar invitations in Epic 3). [Source: architecture.md#Frontend-Architecture]

- **Convex Organization:** Permission utility in `convex/lib/permissions.ts`. Document-specific mutations/queries in `convex/documents/`. [Source: architecture.md#Structure-Patterns]

- **Error Handling:** `ConvexError` with `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR` codes. [Source: architecture.md#Format-Patterns]

### Inheritance Model Explained

```
Folder: "Playbooks" (permittedRoles: ["coach", "analyst"])
├── Document A (permittedRoles: undefined)       → INHERITS folder → coach + analyst
├── Document B (permittedRoles: ["coach"])        → OVERRIDE → coach only
├── Document C (permittedRoles: undefined)        → INHERITS folder → coach + analyst
└── Subfolder: "Attacking" (permittedRoles: undefined → unrestricted? NO)
    └── [Subfolders have their OWN permittedRoles, independent of parent]

Individual user permissions:
├── documentUserPermissions: { targetType: "folder", targetId: "Playbooks", userId: "player-X" }
│   → player-X can access "Playbooks" folder AND all inheriting documents (A, C)
│   → player-X CANNOT access Document B (it has its own permissions that exclude "player")
├── documentUserPermissions: { targetType: "document", targetId: "Document B", userId: "player-Y" }
│   → player-Y can access Document B specifically
```

**Key design decisions:**
- Folders always have their OWN permissions (no cascading inheritance between folders). Subfolders set their own `permittedRoles`.
- Documents can INHERIT from their parent folder (`permittedRoles: undefined`) or OVERRIDE with their own permissions.
- Individual user permissions are scoped to the exact target. A user added to a folder gets access to the folder and its inheriting documents, but NOT to documents with overridden permissions.
- Admins always have access — the "admin" checkbox in the UI is always checked and disabled.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `folders` table with `permittedRoles` field | Story 4.1 | `packages/backend/convex/table/folders.ts` must have `permittedRoles: v.optional(v.array(v.string()))` |
| `documents` table with `permittedRoles` field | Story 4.1 | `packages/backend/convex/table/documents.ts` must have `permittedRoles: v.optional(v.array(v.string()))` |
| `documentUserPermissions` table | Story 4.1 | `packages/backend/convex/table/documentUserPermissions.ts` must exist with `targetType`, `targetId`, `userId`, `grantedBy`, indexes |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export both |
| `getFolders`, `getFolderContents` queries | Story 4.1 | `packages/backend/convex/documents/queries.ts` must exist |
| `getDocument`, `getDocumentUrl` queries | Story 4.2 | Must exist in `packages/backend/convex/documents/queries.ts` |
| `FolderCard` component | Story 4.1 | `apps/admin/src/components/documents/FolderCard.tsx` must exist |
| `DocumentDetail` component | Story 4.2 | `apps/admin/src/components/documents/DocumentDetail.tsx` must exist |
| Documents page | Story 4.1 | `apps/admin/src/app/(app)/documents/page.tsx` must exist |
| shadcn/ui Sheet, Switch, Checkbox, Command, Badge, Avatar, Button | Story 1.2 | Components installed in admin app |

### Current State (Baseline)

**`convex/lib/permissions.ts`:** Does NOT exist. Must be created in this story. This is the core deliverable.

**`convex/documents/queries.ts`:** Should exist from Story 4.1 with `getFolders`, `getFolderContents`, `getFolderBreadcrumb`, `getFolderItemCounts`. Should exist from Story 4.2 with `getDocumentUrl`, `getDocument`. The existing access filtering in `getFolders` is basic (Story 4.1 checks `permittedRoles` array for role match) — this story REPLACES that with the comprehensive `checkAccess` utility that also checks individual user permissions.

**`convex/documents/mutations.ts`:** Should exist from Story 4.1/4.2 with folder CRUD and document CRUD. This story ADDS `setFolderPermissions` and `setDocumentPermissions`.

**`convex/table/documentUserPermissions.ts`:** Should exist from Story 4.1 (schema only, no CRUD). This story adds the write/read logic.

**`components/documents/`:** Should exist from Stories 4.1/4.2 with `FolderCard.tsx`, `DocumentDetail.tsx`, `UploadDialog.tsx`, etc. This story ADDS `PermissionsPanel.tsx` and MODIFIES `FolderCard.tsx` and `DocumentDetail.tsx`.

### Permission Check Performance Considerations

The `filterByAccess` batch helper is critical for performance. Without it, checking access for N folders/documents would require N separate queries to `documentUserPermissions`. The batch approach:

```typescript
// BAD: N+1 queries
for (const folder of folders) {
  const hasAccess = await checkAccess(ctx, user, folder) // Each call queries documentUserPermissions
}

// GOOD: Batch approach in filterByAccess
async function filterByAccess(ctx, user, items, teamId) {
  // 1. Fast filter: role check (in-memory, no DB query)
  const roleFiltered = items.filter(item =>
    !item.permittedRoles || item.permittedRoles.includes(user.role)
  )

  // 2. For items failing role check, batch-load user permissions
  const needsUserCheck = items.filter(item =>
    item.permittedRoles && !item.permittedRoles.includes(user.role)
  )

  if (needsUserCheck.length === 0) return roleFiltered

  // Single query: all user permissions for this user in this team
  const userPerms = await ctx.db.query("documentUserPermissions")
    .withIndex("by_userId_teamId", q => q.eq("userId", user._id).eq("teamId", teamId))
    .collect()
  const permittedTargetIds = new Set(userPerms.map(p => p.targetId))

  const userFiltered = needsUserCheck.filter(item =>
    permittedTargetIds.has(item._id)
  )

  return [...roleFiltered, ...userFiltered]
}
```

This reduces permission checking from O(N) DB queries to O(1) — one batch query for all user permissions.

### Debounce Pattern for User Search

The user search in the permissions panel should debounce input to avoid excessive Convex queries:

```typescript
// Use a debounced search value
const [searchInput, setSearchInput] = useState("")
const [debouncedSearch, setDebouncedSearch] = useState("")

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
  return () => clearTimeout(timer)
}, [searchInput])

const teamMembers = useQuery(
  api.users.queries.getTeamMembers,
  debouncedSearch.length >= 2 ? { search: debouncedSearch } : "skip"
)
```

Use Convex's `"skip"` sentinel to avoid querying until the user has typed at least 2 characters.

### Component Architecture

```
Documents Page (page.tsx) [MODIFIED]
├── FolderCard [MODIFIED — add "Permissions" to context menu, add lock indicator]
│   └── DropdownMenu: Rename | Permissions (NEW) | Delete
├── DocumentDetail Sheet [MODIFIED — add "Permissions" button]
│   └── "Permissions" Button (admin-only, NEW)
└── PermissionsPanel Sheet (NEW)
    ├── Target name header ("Permissions for: Playbooks")
    ├── Inheritance Toggle (documents only)
    │   └── Switch: "Inherit from folder"
    ├── Role Checkboxes Section
    │   ├── Checkbox: Admin (checked, disabled)
    │   ├── Checkbox: Coach
    │   ├── Checkbox: Analyst
    │   ├── Checkbox: Physio/Medical
    │   ├── Checkbox: Player
    │   └── Checkbox: Staff
    ├── "Make unrestricted" link/button
    ├── User Search (Command/Combobox)
    │   └── Search results dropdown with user name, email, role
    ├── Selected Users List
    │   └── Per user: Avatar + Name + Role Badge + Remove Button
    └── Save Button
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/lib/permissions.ts` | **Created** | `checkAccess`, `checkDocumentAccess`, `filterByAccess` utilities |
| `packages/backend/convex/documents/queries.ts` | Modified | Add `getPermissions`, update `getFolders`/`getFolderContents`/`getDocument`/`getDocumentUrl` with `checkAccess` |
| `packages/backend/convex/documents/mutations.ts` | Modified | Add `setFolderPermissions`, `setDocumentPermissions` |
| `packages/backend/convex/users/queries.ts` | Modified/Created | Add `getTeamMembers` query |
| `apps/admin/src/components/documents/PermissionsPanel.tsx` | **Created** | Permission editor sheet with roles + user search |
| `apps/admin/src/components/documents/FolderCard.tsx` | Modified | Add "Permissions" context menu item, lock indicator |
| `apps/admin/src/components/documents/DocumentDetail.tsx` | Modified | Add "Permissions" button for admin |
| `apps/admin/src/app/(app)/documents/page.tsx` | Modified | Add permissions panel state and rendering |
| `packages/backend/convex/documents/__tests__/permissions.test.ts` | **Created** | Tests for checkAccess, filterByAccess, checkDocumentAccess |
| `packages/backend/convex/documents/__tests__/mutations.test.ts` | Modified | Add tests for setFolderPermissions, setDocumentPermissions |
| `packages/backend/convex/documents/__tests__/queries.test.ts` | Modified | Add tests for getPermissions, update tests for access filtering |

### What This Story Does NOT Include

- **No cascading folder permissions** — subfolders do NOT inherit parent folder permissions. Each folder sets its own `permittedRoles` independently. Only documents inherit from their immediate parent folder.
- **No notification on permission changes** — e.g., "You now have access to Playbooks" notification. This could be a future enhancement.
- **No permission templates or presets** — no "Team-only" or "Coaching Staff" presets. Manual role selection only.
- **No audit log of permission changes** — `grantedBy` and `createdAt` on `documentUserPermissions` provide basic audit for individual user grants, but there's no history of role permission changes.
- **No bulk permission setting** — permissions are set one folder/document at a time. No "apply to all subfolders" batch action.
- **No public/link sharing** — all access requires authentication and explicit permission. No "anyone with the link" sharing.

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Stories 4.1/4.2 not implemented yet (no queries to modify) | Verify `convex/documents/queries.ts` and `convex/documents/mutations.ts` exist with the expected functions. If not, create the `convex/lib/permissions.ts` utility first (standalone, testable) and create the mutations — the query modifications can be applied once 4.1/4.2 are done. |
| `filterByAccess` batch query returns too many `documentUserPermissions` records | For Sprint 1 with a single team and limited users, this is not a concern. The `by_userId_teamId` index ensures efficient lookup. For scale, add pagination or result limits. |
| Convex `v.optional(v.array(v.string()))` may not correctly handle `undefined` vs `null` vs empty array | Convex stores `undefined` fields as absent. When patching with `undefined`, the field is removed. Test: `db.patch(id, { permittedRoles: undefined })` should remove the field (not set it to `null`). Verify during implementation. |
| User search debounce may feel laggy | 300ms debounce is standard for search UX. The search requires minimum 2 characters. Convex query subscription ensures the latest results appear when available. |
| Removing a user's access while they have the document open | Convex subscription will update the query on next re-evaluation. The document will disappear from their view. The signed URL they already obtained may still work until it expires — this is acceptable for Sprint 1. |

### Alignment with Architecture Document

- **Permission Model:** Matches `architecture.md § Data Architecture` — hybrid normalization with `permittedRoles` arrays + `documentUserPermissions` junction table
- **Shared Utility:** Matches `architecture.md § Cross-Cutting Concerns Mapping` — `convex/lib/permissions.ts` as a shared permission-checking utility
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireRole(ctx, ["admin"])` for write operations, permission checks in read queries
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — `PermissionsPanel` in `components/documents/`
- **Convex Organization:** Matches `architecture.md § Convex Function Organization` — mutations and queries in `convex/documents/`, shared utility in `convex/lib/`
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with standardized codes
- **State Management:** Matches `architecture.md § Frontend Architecture` — `useQuery` for permissions data, local state for panel open/closed and form state
- **Loading States:** Matches `architecture.md § Process Patterns` — `useQuery` returns `undefined` → skeleton
- **NFR5 Enforcement:** This story is the primary implementation of NFR5 for the document module — all access control at the Convex layer
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Data-Architecture] — Hybrid normalization, `permittedRoles: string[]` arrays, `documentUserPermissions` junction table
- [Source: architecture.md#Authentication-&-Security] — RBAC model (6 roles), requireAuth/requireRole, admin always has access
- [Source: architecture.md#Cross-Cutting-Concerns-Mapping] — `convex/lib/permissions.ts` — shared role+user permission checking
- [Source: architecture.md#Frontend-Architecture] — PermissionsPanel in components/documents/, PermissionSelector in components/shared/
- [Source: architecture.md#Format-Patterns] — ConvexError codes, dates as timestamps
- [Source: architecture.md#Process-Patterns] — Loading states, mutation feedback, form pattern
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines, anti-patterns
- [Source: architecture.md#Project-Structure-&-Boundaries] — Module boundaries, convex/lib/ for shared utilities
- [Source: epics.md#Story-4.3] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR15 mapped to Epic 4
- [Source: 4-1-document-data-model-folder-structure.md] — Schema definitions for folders, documents, documentUserPermissions tables
- [Source: 4-2-file-upload-replace-video-links.md] — Document CRUD mutations and queries that need permission enforcement

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
