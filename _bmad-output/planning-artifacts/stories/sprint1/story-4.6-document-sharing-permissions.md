# Story 4.6: Document Sharing & Owner-Based Permissions

Status: draft
Story Type: fullstack
Points: 8

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. Do NOT modify `apps/admin/`. Backend changes in `packages/backend/convex/`.

## Story

As any authenticated user,
I want to upload documents and choose how they are shared -- private, by role, or by specific users -- via a dropdown at upload time,
So that I control who can see my documents without needing admin intervention.

As a document owner,
I want full control (edit, replace, delete) over documents I uploaded,
So that I can manage my own content independently.

## Dependencies

| Dependency | What it provides |
|---|---|
| Stories 4.1-4.5 | Document Hub: folder structure, upload, permissions, read tracking, search (all implemented, page disabled) |
| Story 11.4 | RBAC Hooks: `getTeamResource`, `requireAdminOrSelf`, `requireAdminOrRole`, `requireResourceAccess`, `withAccessControl` in `packages/backend/convex/lib/auth.ts` |

## Background

The Document Hub (Epic 4) is fully implemented but disabled. Stories 4.1-4.5 covered folder structure, file upload, permissions, read tracking, and search. However, the current implementation restricts uploads and all mutations to admin-only (`requireRole(ctx, ["admin"])`). This story relaxes those restrictions to enable owner-based CRUD and a Google Drive-style sharing dropdown.

**Story 11.4 RBAC Hooks** introduced reusable access control utilities that MUST be used in this story instead of inline checks:
- `getTeamResource(ctx, teamId, table, id)` — fetch + validate team ownership (anti-enumeration)
- `requireAdminOrSelf(ctx, targetUserId)` — admin bypass or self-access
- `requireResourceAccess(ctx, resource, options)` — composable: admin bypass + role check + owner check + custom permissions
- `withAccessControl(rules, handler)` — higher-order wrapper for new handlers

The new `requireOwnerOrAdmin` pattern should be implemented using `requireResourceAccess` with `{ allowOwner: true }` rather than a new standalone function.

### Current state:
- **Upload**: admin-only (`requireRole(ctx, ["admin"])`)
- **Delete/Replace**: admin-only
- **Permissions management**: admin-only via `setDocumentPermissions` / `setFolderPermissions`
- **Sharing model**: `permittedRoles` array on documents/folders + `documentUserPermissions` table for individual grants
- **Access checks**: `checkAccess()` and `checkDocumentAccess()` in `permissions.ts` already support role-based, user-based, and admin bypass

### Target state:
- **Upload**: any authenticated user
- **Delete/Replace/Edit**: owner OR admin
- **Sharing at upload**: dropdown with 3 options (Private / Roles / Users)
- **Permissions management**: owner OR admin can change sharing after upload
- **Read access**: determined by sharing settings (private = owner+admin only, roles = listed roles, users = listed users)

## Acceptance Criteria

### AC1: Any authenticated user can upload documents

**Given** the user is authenticated and viewing a folder
**When** the user clicks "Upload"
**Then** the upload dialog appears (same UI as today)
**And** the upload succeeds for any authenticated user (not just admins)
**And** the uploaded document's `ownerId` is set to the uploading user's `_id`

### AC2: Sharing dropdown at upload time

**Given** the user is uploading a document
**When** the upload dialog renders
**Then** a "Sharing" dropdown is displayed below the file input with three options:

| Option | Label | Behavior |
|---|---|---|
| `private` | "Only me" | `permittedRoles: []`, no individual grants. Only the owner and admins can see it. |
| `roles` | "Specific roles" | Shows a role multi-select (Admin, Coach, Analyst, Physio, Player, Staff). Selected roles saved to `permittedRoles`. |
| `users` | "Specific people" | Shows a user search/select field. Selected user IDs saved as `documentUserPermissions` entries. |

**And** the default sharing option is "Only me" (private)
**And** when "Specific roles" is selected, a multi-select appears below with role checkboxes
**And** when "Specific people" is selected, a user picker appears allowing the user to search team members by name and select multiple users
**And** the user can combine roles AND users (e.g., share with all coaches + 2 specific players)

### AC3: Owner has full CRUD on their documents

**Given** a user uploaded a document (they are the `ownerId`)
**When** the user views the document
**Then** they can:
- **Replace** the file (same `replaceFile` mutation)
- **Delete** the document (same `deleteDocument` mutation)
- **Change permissions** (same `setDocumentPermissions` mutation)

**And** these actions are available even if the user is NOT an admin
**And** admins retain full CRUD on all documents regardless of ownership

### AC4: Non-owner, non-admin users have read-only access

**Given** a user has read access to a document (via role or individual grant)
**When** the user views the document
**Then** they can view/download the document
**And** they CANNOT see replace, delete, or permissions buttons
**And** the read is tracked via `trackRead` (unchanged)

### AC5: Owner can modify sharing after upload

**Given** the owner is viewing their document
**When** they click a "Share" or "Permissions" button
**Then** the same sharing dropdown (Private / Roles / Users) appears
**And** the current sharing settings are pre-populated
**And** the owner can change the sharing mode and save
**And** admins can also modify sharing on any document

### AC6: Backend mutations accept owner OR admin

**Given** the backend mutations for documents
**When** the access control is checked
**Then** the following mutations use owner-or-admin access:
- `uploadDocument` → `requireAuth` (any authenticated user)
- `addVideoLink` → `requireAuth` (any authenticated user)
- `replaceFile` → owner OR admin
- `deleteDocument` → owner OR admin
- `setDocumentPermissions` → owner OR admin

**And** folder mutations remain admin-only (createFolder, renameFolder, deleteFolder, setFolderPermissions)
**And** the `uploadDocument` mutation accepts a new `sharing` arg:
```typescript
sharing: v.object({
  mode: v.union(v.literal("private"), v.literal("roles"), v.literal("users")),
  roles: v.optional(v.array(v.string())),
  userIds: v.optional(v.array(v.id("users"))),
})
```

### AC7: Private documents are invisible to non-owners

**Given** a user uploaded a document with sharing mode "Only me"
**When** another non-admin user browses the same folder
**Then** the private document does NOT appear in the folder contents
**And** the private document does NOT appear in search results
**And** the existing `checkDocumentAccess()` / `filterDocumentsByAccess()` functions handle this correctly (they already check `permittedRoles: []` as "no roles allowed")

### AC8: TypeScript types and lint pass

**Given** all changes are made
**When** `pnpm turbo typecheck lint` is run
**Then** zero new errors

---

## Implementation Notes

### Backend changes

**`packages/backend/convex/documents/mutations.ts`:**

1. `uploadDocument`:
   - Change `requireRole(ctx, ["admin"])` → `requireAuth(ctx)`
   - Add `sharing` arg to the validator
   - After insert, apply sharing:
     - `private`: set `permittedRoles: []` (already the default empty means unrestricted — need to explicitly set `[]` for "no one")
     - `roles`: set `permittedRoles: sharing.roles`
     - `users`: set `permittedRoles: []` + insert `documentUserPermissions` for each userId

2. `addVideoLink`: same change as uploadDocument

3. `replaceFile`, `deleteDocument`, `setDocumentPermissions`:
   - Change `requireRole(ctx, ["admin"])` → `requireAuth(ctx)`
   - After auth, check: `if (user.role !== "admin" && document.ownerId !== user._id) throw NOT_AUTHORIZED`
   - Or use `requireAdminOrSelf` concept adapted for ownership

4. **Use RBAC hooks from Story 11.4** — Do NOT create a new `requireOwnerOrAdmin` function. Instead, use `requireResourceAccess` from `packages/backend/convex/lib/auth.ts`:
```typescript
// For owner-or-admin checks on document mutations:
const document = await getTeamResource(ctx, teamId, "documents", args.documentId);
await requireResourceAccess(ctx, { createdBy: document.ownerId }, { allowOwner: true });
```
This leverages the existing composable RBAC hook which already handles admin bypass + owner check.

### Frontend changes

**`apps/web/src/components/documents/UploadDialog.tsx`:**
- Add sharing dropdown below file input
- Three modes with conditional sub-fields:
  - "Only me" → no additional fields
  - "Specific roles" → role checkboxes (use existing `VALID_PERMISSION_ROLES`)
  - "Specific people" → user search/picker (fetch team members from Convex)
- Pass `sharing` object to the `uploadDocument` mutation call

**`apps/web/src/components/documents/DocumentCard.tsx`** (or wherever actions are rendered):
- Show replace/delete/permissions buttons only if `user._id === document.ownerId || user.role === "admin"`
- Non-owners see read-only view

**`apps/web/src/components/documents/PermissionsPanel.tsx`:**
- Already exists and supports role + user permissions
- Need to make it accessible to owners (not just admins)
- Add the 3-mode dropdown on top

### Permissions logic (no changes needed)

`checkAccess()` and `checkDocumentAccess()` in `permissions.ts` already handle:
- `permittedRoles: undefined/null` → unrestricted (visible to all)
- `permittedRoles: []` → no roles allowed (only admin + individual grants)
- `permittedRoles: ["coach", "physio"]` → those roles + admin + individual grants

**Important distinction:**
- `permittedRoles: undefined` = visible to everyone (unrestricted)
- `permittedRoles: []` = visible to NO role (private — only admin and individual grants)

This matches the Google Drive model:
- **Private** → `permittedRoles: []`, no grants → owner + admin only
- **Roles** → `permittedRoles: [selected roles]` → those roles + admin + owner
- **Users** → `permittedRoles: []` + individual grants → listed users + admin + owner

### Future considerations (out of scope for now)

- Read/Write granularity per role (e.g., admins can edit, players can only read)
- Per-role permission levels on `documentUserPermissions` (add a `level: "read" | "write"` field)
- Folder-level sharing that propagates to all documents inside
- Transfer ownership

### Files to modify

| File | Change |
|---|---|
| `packages/backend/convex/documents/mutations.ts` | Relax auth on upload/video, add ownership check on replace/delete/permissions, add sharing arg |
| `packages/backend/convex/lib/auth.ts` | Use existing `requireResourceAccess` with `{ allowOwner: true }` (Story 11.4) |
| `apps/web/src/components/documents/UploadDialog.tsx` | Add sharing dropdown + sub-fields |
| `apps/web/src/components/documents/DocumentCard.tsx` | Conditional action buttons (owner/admin only) |
| `apps/web/src/components/documents/PermissionsPanel.tsx` | Add 3-mode dropdown, allow owner access |
| `apps/web/src/app/(app)/documents/page.tsx` | Uncomment and adapt (pass current user for ownership checks) |

### Files NOT to modify

| File | Reason |
|---|---|
| `packages/backend/convex/lib/permissions.ts` | Already handles all 3 sharing modes correctly |
| `packages/backend/convex/documents/queries.ts` | Access filtering already works via `filterDocumentsByAccess` |
| Folder mutations (create/rename/delete) | Remain admin-only |

### Testing approach

- **Manual**: Upload as non-admin, verify sharing modes, verify visibility, verify owner CRUD
- **Security**: Try to delete/replace someone else's document as non-admin — should fail
- **Privacy**: Upload a private doc, verify other users can't see it in folder listing or search
