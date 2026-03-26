# Story 4.2: File Upload, Replace & Video Links

Status: ready-for-dev
Story Type: fullstack

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to upload documents, replace outdated files, and add video links,
so that the team always has access to current materials.

## Acceptance Criteria

1. **"Upload" button visible to admins in folder view** — When an admin is viewing a folder's contents (via the `/documents?folder=<id>` page from Story 4.1), an "Upload" button is visible in the page action area. Non-admin users do NOT see this button. The button is disabled when viewing the top-level category list (no folder selected) since documents must belong to a folder.

2. **Upload dialog opens with file/video toggle** — When the admin clicks "Upload", a `Dialog` (shadcn/ui) opens. The dialog has two modes toggled via a `Tabs` or `SegmentedControl` component: "File Upload" (default) and "Video Link". The selected mode determines which form fields are shown.

3. **File upload mode — form fields** — In file upload mode, the form contains:
   - File input (drag-and-drop zone + click to browse, required)
   - Document name (`Input`, optional — defaults to the filename without extension if left empty)
   - Folder location (pre-filled with the current folder name, read-only display — the `folderId` is passed as a prop, not user-editable)
   - The file input accepts only supported MIME types: `application/pdf`, `image/jpeg`, `image/png`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`
   - Corresponding supported extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.xlsx`, `.csv`

4. **File size validation (50MB max)** — Files exceeding 50MB (52,428,800 bytes) are rejected client-side with an inline validation error: "File size exceeds the 50MB limit." The file input does not submit. This enforces NFR3.

5. **Video link mode — form fields** — In video link mode, the form contains:
   - Video URL (`Input`, required, must be a valid URL starting with `http://` or `https://`)
   - Document name (`Input`, required — no filename to default from)
   - Folder location (pre-filled, read-only — same as file mode)

6. **`uploadDocument` mutation stores the file document record** — A Convex mutation `documents.mutations.uploadDocument` accepts `{ folderId: Id<"folders">, name: string, filename: string, extension: string, storageId: string, mimeType: string, fileSize: number }`, calls `requireRole(ctx, ["admin"])`, validates the folder exists and belongs to the user's team, inserts a new document record into the `documents` table with: `teamId` from auth context, `folderId`, `name`, `filename`, `extension`, `storageId`, `mimeType`, `fileSize`, `videoUrl: undefined`, `ownerId: user._id`, `permittedRoles: undefined` (inherits folder permissions — Story 4.3), `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new document ID.

7. **`addVideoLink` mutation stores a video link document** — A Convex mutation `documents.mutations.addVideoLink` accepts `{ folderId: Id<"folders">, name: string, videoUrl: string }`, calls `requireRole(ctx, ["admin"])`, validates the folder exists and belongs to the user's team, validates `videoUrl` starts with `http://` or `https://`, inserts a new document record with: `teamId`, `folderId`, `name`, `filename: undefined`, `extension: undefined`, `storageId: undefined`, `mimeType: undefined`, `fileSize: undefined`, `videoUrl`, `ownerId: user._id`, `permittedRoles: undefined`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Returns the new document ID.

8. **File upload flow uses Convex storage** — The frontend upload process follows the Convex storage pattern:
   - Step 1: Call `generateUploadUrl` mutation (already exists in `convex/storage.ts`) to get a temporary upload URL
   - Step 2: `fetch(uploadUrl, { method: "POST", body: file })` to upload the file directly to Convex storage — returns a `{ storageId }` in the response
   - Step 3: Call `uploadDocument` mutation with the `storageId` and file metadata to create the document record
   - A progress indicator or spinner is shown during upload (disable submit button, show loading state)

9. **Uploaded document appears in folder in real time** — After successful upload or video link creation, the document immediately appears in the folder's document list via Convex subscription (`useQuery` in the documents page auto-updates). No manual refresh needed.

10. **Dialog closes and success toast on submit** — After successful mutation (either file upload or video link), the dialog closes, a success toast is displayed via `sonner` ("Document uploaded" or "Video link added"), and the form is reset. If any step fails, the error is displayed via `toast.error()` and the dialog stays open.

11. **Document list items display with type-appropriate icons and metadata** — In the folder contents view (extending Story 4.1's document list items), each document displays:
    - A type icon: PDF icon for `.pdf`, image icon for `.jpg`/`.png`, spreadsheet icon for `.xlsx`/`.csv`, video/play icon for video links
    - Document name
    - File size (formatted: e.g. "2.4 MB") for files, or "Video Link" label for video links
    - Upload date (formatted with `date-fns`: e.g. "Mar 25, 2026")
    - An admin-only context menu (three-dot dropdown) with actions: "View Details", "Replace File" (files only), "Delete"

12. **Document detail view** — Clicking a document (or "View Details" from context menu) opens a detail panel (side sheet or dialog) showing:
    - Document name (editable by admin — future enhancement, read-only for now)
    - File type and extension
    - File size (formatted)
    - Uploaded by (owner's name)
    - Upload date (formatted)
    - For files: an "Open / Download" button that generates a signed URL via `ctx.storage.getUrl(storageId)` and opens it in a new tab (or triggers download)
    - For video links: a "Watch Video" button that opens the `videoUrl` in a new browser tab (`window.open(videoUrl, "_blank")`)
    - For admins: a "Replace File" button (visible only for file-type documents, not video links)
    - For admins: a "Delete" button

13. **`getDocumentUrl` query returns a signed URL** — A Convex query `documents.queries.getDocumentUrl` accepts `{ documentId: Id<"documents"> }`, calls `requireAuth(ctx)`, validates the document belongs to the user's team, retrieves the `storageId`, calls `ctx.storage.getUrl(storageId)`, and returns the signed URL. Returns `null` if the document is a video link (no `storageId`).

14. **`replaceFile` mutation replaces an existing document's file** — A Convex mutation `documents.mutations.replaceFile` accepts `{ documentId: Id<"documents">, storageId: string, filename: string, extension: string, mimeType: string, fileSize: number }`, calls `requireRole(ctx, ["admin"])`, validates the document exists and belongs to the user's team, validates the document is a file (has existing `storageId`, not a video link), deletes the old file from Convex storage via `ctx.storage.delete(oldStorageId)`, patches the document with the new `storageId`, `filename`, `extension`, `mimeType`, `fileSize`, and `updatedAt: Date.now()`. The document name is NOT changed (the admin can rename separately if needed). Returns success.

15. **Replace File flow** — From the document detail view, when an admin clicks "Replace File":
    - A file input dialog opens (same file type restrictions and 50MB limit as upload)
    - The admin selects a new file
    - The same three-step upload flow executes (generateUploadUrl → POST file → replaceFile mutation)
    - A loading/progress state is shown during the process
    - On success: toast "File replaced", detail view refreshes with new metadata
    - The old file is deleted from storage (handled in the mutation)

16. **`deleteDocument` mutation removes a document** — A Convex mutation `documents.mutations.deleteDocument` accepts `{ documentId: Id<"documents"> }`, calls `requireRole(ctx, ["admin"])`, validates the document exists and belongs to the user's team, if the document has a `storageId` (file type) deletes the file from Convex storage via `ctx.storage.delete(storageId)`, deletes the document record from the `documents` table, and also deletes any related `documentReads` records for this document. Returns success.

17. **Delete confirmation** — When an admin clicks "Delete" on a document (from context menu or detail view), a shadcn `AlertDialog` confirms the action: "Are you sure you want to delete '[document name]'? This will permanently remove the file and cannot be undone." On confirm, calls `deleteDocument` mutation, shows success toast, closes detail view if open.

18. **Video links open in new tab** — Clicking a video link document (from the document list or the "Watch Video" button in detail view) opens the `videoUrl` in a new browser tab via `window.open(videoUrl, "_blank")`. No in-app video player. This implements FR19.

19. **Server-side validation and authorization** — All mutations enforce:
    - Only users with `role === "admin"` can upload, replace, or delete documents (via `requireRole`)
    - `teamId` is set from the authenticated context (not from client input)
    - Folder existence and team ownership is validated before document creation
    - Non-admin users calling any write mutation receive a `NOT_AUTHORIZED` error

20. **Non-admin users can view and download** — Non-admin users who have access to a folder (per folder permissions from Story 4.1) can:
    - See documents listed in the folder
    - Click to view document details
    - Open/download files via signed URLs
    - Open video links in new tabs
    - They do NOT see Upload, Replace, or Delete controls

## Tasks / Subtasks

- [ ] **Task 1: Add document-related constants to shared package** (AC: #3, #4)
  - [ ] 1.1: In `packages/shared/constants.js` (or create `packages/shared/documents.ts`), add and export: `SUPPORTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]`, `SUPPORTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "xlsx", "csv"]`, `MAX_FILE_SIZE_BYTES = 52428800` (50 * 1024 * 1024), `EXTENSION_TO_MIME` mapping object, `MIME_TO_EXTENSION` reverse mapping.
  - [ ] 1.2: Add a `formatFileSize(bytes: number): string` utility function that returns human-readable sizes (e.g., "2.4 MB", "150 KB", "48.5 MB").
  - [ ] 1.3: Add an `extractExtension(filename: string): string` utility function that returns the lowercase extension from a filename (e.g., `"report.PDF"` -> `"pdf"`).

- [ ] **Task 2: Create Zod validation schemas for upload forms** (AC: #3, #4, #5, #6)
  - [ ] 2.1: Create validation schemas (either in `packages/shared/documents.ts` or co-located in the component): `uploadFileSchema` validates: `file: z.instanceof(File)` (required), `name: z.string().optional()`, `folderId: z.string()`. Add `.refine()` to validate file size <= `MAX_FILE_SIZE_BYTES` with message "File size exceeds the 50MB limit." Add `.refine()` to validate file MIME type is in `SUPPORTED_MIME_TYPES` with message "Unsupported file type. Accepted: PDF, JPG, PNG, XLSX, CSV."
  - [ ] 2.2: Create `addVideoLinkSchema`: `videoUrl: z.string().url().refine(url => url.startsWith("http://") || url.startsWith("https://"), "URL must start with http:// or https://")`, `name: z.string().min(1, "Document name is required")`, `folderId: z.string()`.

- [ ] **Task 3: Implement `uploadDocument` Convex mutation** (AC: #6, #8, #19)
  - [ ] 3.1: Add to `packages/backend/convex/documents/mutations.ts` (file created in Story 4.1, or create now).
  - [ ] 3.2: Implement `uploadDocument` mutation: accepts `{ folderId: v.id("folders"), name: v.string(), filename: v.string(), extension: v.string(), storageId: v.string(), mimeType: v.string(), fileSize: v.number() }`. Call `requireRole(ctx, ["admin"])` to get `{ user, teamId }`. Validate the folder exists and `folder.teamId === teamId` — throw `NOT_FOUND` if not. Insert into `documents` table with all fields plus `videoUrl: undefined`, `ownerId: user._id`, `permittedRoles: undefined`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Return the new document `_id`.

- [ ] **Task 4: Implement `addVideoLink` Convex mutation** (AC: #7, #19)
  - [ ] 4.1: Add `addVideoLink` mutation to `packages/backend/convex/documents/mutations.ts`. Accepts `{ folderId: v.id("folders"), name: v.string(), videoUrl: v.string() }`. Call `requireRole(ctx, ["admin"])`. Validate folder exists and belongs to team. Validate `videoUrl` starts with `http://` or `https://` — throw `VALIDATION_ERROR` if not. Insert into `documents` with `filename: undefined`, `extension: undefined`, `storageId: undefined`, `mimeType: undefined`, `fileSize: undefined`, `videoUrl`, `ownerId: user._id`, `permittedRoles: undefined`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Return the new document `_id`.

- [ ] **Task 5: Implement `replaceFile` Convex mutation** (AC: #14, #15, #19)
  - [ ] 5.1: Add `replaceFile` mutation to `packages/backend/convex/documents/mutations.ts`. Accepts `{ documentId: v.id("documents"), storageId: v.string(), filename: v.string(), extension: v.string(), mimeType: v.string(), fileSize: v.number() }`. Call `requireRole(ctx, ["admin"])`. Fetch the document, validate `teamId` match. Validate the document is a file type: `document.storageId` must exist — throw `VALIDATION_ERROR: "Cannot replace file on a video link document"` if `document.storageId` is undefined and `document.videoUrl` is defined. Delete old file from storage: `await ctx.storage.delete(document.storageId as Id<"_storage">)`. Patch the document with new `{ storageId, filename, extension, mimeType, fileSize, updatedAt: Date.now() }`. Return success.

- [ ] **Task 6: Implement `deleteDocument` Convex mutation** (AC: #16, #17, #19)
  - [ ] 6.1: Add `deleteDocument` mutation to `packages/backend/convex/documents/mutations.ts`. Accepts `{ documentId: v.id("documents") }`. Call `requireRole(ctx, ["admin"])`. Fetch the document, validate `teamId` match. If `document.storageId` exists, delete from storage: `await ctx.storage.delete(document.storageId as Id<"_storage">)`. Delete all `documentReads` records where `documentId === documentId` (query `by_documentId` index, iterate and delete). Delete the document record via `ctx.db.delete(documentId)`. Return success.

- [ ] **Task 7: Implement `getDocumentUrl` Convex query** (AC: #13, #20)
  - [ ] 7.1: Add to `packages/backend/convex/documents/queries.ts` (file created in Story 4.1). Implement `getDocumentUrl` query: accepts `{ documentId: v.id("documents") }`. Call `requireAuth(ctx)`. Fetch the document, validate `teamId` match. If `document.storageId` is defined, call `await ctx.storage.getUrl(document.storageId)` and return the URL string. If `document.storageId` is undefined (video link), return `null`.

- [ ] **Task 8: Implement `getDocument` detail query** (AC: #12, #20)
  - [ ] 8.1: Add `getDocument` query to `packages/backend/convex/documents/queries.ts`. Accepts `{ documentId: v.id("documents") }`. Call `requireAuth(ctx)`. Fetch the document, validate `teamId` match. Fetch the owner user record to get `fullName`. Return the document fields plus `ownerName: owner.fullName ?? owner.email`.

- [ ] **Task 9: Build FileDropZone component** (AC: #3, #4)
  - [ ] 9.1: Create `apps/admin/src/components/documents/FileDropZone.tsx`. A styled drag-and-drop zone using native HTML drag events (`onDragOver`, `onDrop`, `onDragEnter`, `onDragLeave`). Displays: a dashed border zone with an upload icon (`Upload` from `lucide-react`), text "Drag and drop a file here, or click to browse", and a hidden `<input type="file">` triggered on click.
  - [ ] 9.2: Accept props: `onFileSelected: (file: File) => void`, `accept: string` (MIME type string for the input's `accept` attribute), `maxSize: number` (bytes — for client-side validation).
  - [ ] 9.3: Visual feedback: border color changes on drag-over (e.g., primary color highlight). Show selected file name and size after selection. Show inline error if file exceeds max size or has unsupported type.
  - [ ] 9.4: After a file is selected (via drop or click), validate size and type client-side. If valid, call `onFileSelected(file)`. If invalid, display the error inline and do not call the callback.

- [ ] **Task 10: Build UploadDialog component** (AC: #1, #2, #3, #4, #5, #8, #9, #10)
  - [ ] 10.1: Create `apps/admin/src/components/documents/UploadDialog.tsx`. Uses shadcn `Dialog`. Accepts props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `folderId: Id<"folders">`, `folderName: string`.
  - [ ] 10.2: Inside the dialog, render a `Tabs` component (shadcn) with two tabs: "File Upload" and "Video Link".
  - [ ] 10.3: **File Upload tab**: Uses `react-hook-form` + `zodResolver(uploadFileSchema)`. Contains: `FileDropZone` component, `Input` for document name (placeholder: "Document name (optional — defaults to filename)"), read-only folder display showing `folderName`. Submit button: "Upload". Disable submit while uploading.
  - [ ] 10.4: **Video Link tab**: Uses `react-hook-form` + `zodResolver(addVideoLinkSchema)`. Contains: `Input` for video URL (placeholder: "https://..."), `Input` for document name (required, placeholder: "Video name"), read-only folder display. Submit button: "Add Link".
  - [ ] 10.5: **File upload submission flow**:
    - Set `isUploading = true`, show spinner on submit button
    - Call `generateUploadUrl` mutation to get the upload URL
    - `fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file })` — parse response JSON to get `storageId`
    - Call `uploadDocument` mutation with `{ folderId, name: formName || filenameWithoutExtension, filename: file.name, extension, storageId, mimeType: file.type, fileSize: file.size }`
    - On success: `toast.success("Document uploaded")`, close dialog, reset form
    - On error: `toast.error(errorMessage)`, set `isUploading = false`
  - [ ] 10.6: **Video link submission flow**:
    - Call `addVideoLink` mutation with `{ folderId, name, videoUrl }`
    - On success: `toast.success("Video link added")`, close dialog, reset form
    - On error: `toast.error(errorMessage)`

- [ ] **Task 11: Build DocumentCard component** (AC: #11, #18, #20)
  - [ ] 11.1: Create `apps/admin/src/components/documents/DocumentCard.tsx`. Renders a list item (row) for a single document in the folder contents view. Displays: type icon (use `FileText` for PDF, `Image` for images, `FileSpreadsheet` for xlsx/csv, `Video` or `Play` for video links — from `lucide-react`), document name, file size (formatted via `formatFileSize`) or "Video Link" label, upload date (formatted with `date-fns` `format(date, "MMM d, yyyy")`).
  - [ ] 11.2: The entire row is clickable — clicking opens the document detail view.
  - [ ] 11.3: For admin users, render a context menu (shadcn `DropdownMenu`) triggered by a three-dot icon button on the right side. Menu items: "View Details" (eye icon), "Replace File" (visible only if document has `storageId`, not for video links), "Delete" (trash icon).
  - [ ] 11.4: Accept props: `document: DocumentType` (the document object from the query), `isAdmin: boolean`, `onViewDetails: () => void`, `onReplace: () => void`, `onDelete: () => void`.

- [ ] **Task 12: Build DocumentDetail component** (AC: #12, #13, #15, #18, #20)
  - [ ] 12.1: Create `apps/admin/src/components/documents/DocumentDetail.tsx`. Renders in a `Sheet` (shadcn side panel) or `Dialog`. Accepts props: `documentId: Id<"documents"> | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`.
  - [ ] 12.2: When `documentId` is set, call `useQuery(api.documents.queries.getDocument, { documentId })` to fetch details. Show skeleton while loading.
  - [ ] 12.3: Display: document name (large text), type badge (file type or "Video Link"), file size (formatted), original filename, uploaded by (owner name), upload date, last updated date.
  - [ ] 12.4: **For file documents**: render an "Open / Download" button. On click, call `useQuery(api.documents.queries.getDocumentUrl, { documentId })` to get the signed URL, then `window.open(url, "_blank")`.
  - [ ] 12.5: **For video link documents**: render a "Watch Video" button with an external link icon. On click: `window.open(document.videoUrl, "_blank")`.
  - [ ] 12.6: **For admins — Replace File button** (visible only for file-type documents, hidden for video links): clicking triggers the replace file flow (Task 13).
  - [ ] 12.7: **For admins — Delete button**: clicking opens the `DocumentDeleteDialog` (Task 14).

- [ ] **Task 13: Build ReplaceFileDialog component** (AC: #14, #15)
  - [ ] 13.1: Create `apps/admin/src/components/documents/ReplaceFileDialog.tsx`. Uses shadcn `Dialog`. Accepts props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `documentId: Id<"documents">`, `documentName: string`.
  - [ ] 13.2: Contains a `FileDropZone` component with the same file type restrictions and 50MB limit as the upload dialog.
  - [ ] 13.3: On file selection and confirmation:
    - Set `isReplacing = true`, show loading state
    - Call `generateUploadUrl` mutation
    - Upload file via `fetch`
    - Call `replaceFile` mutation with `{ documentId, storageId, filename: file.name, extension, mimeType: file.type, fileSize: file.size }`
    - On success: `toast.success("File replaced")`, close dialog
    - On error: `toast.error(errorMessage)`, set `isReplacing = false`
  - [ ] 13.4: Warning text in the dialog: "This will permanently replace the current file. The previous version cannot be recovered."

- [ ] **Task 14: Build DocumentDeleteDialog component** (AC: #16, #17)
  - [ ] 14.1: Create `apps/admin/src/components/documents/DocumentDeleteDialog.tsx`. Uses shadcn `AlertDialog`. Accepts props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `documentId: Id<"documents">`, `documentName: string`, `onDeleted: () => void`.
  - [ ] 14.2: Confirmation message: "Are you sure you want to delete '[documentName]'? This will permanently remove the file and cannot be undone."
  - [ ] 14.3: On confirm: call `useMutation(api.documents.mutations.deleteDocument)` with `{ documentId }`. Show `toast.success("Document deleted")`. Call `onDeleted()` callback (to close detail view if open). On `ConvexError`: `toast.error(error.data.message)`.

- [ ] **Task 15: Integrate upload, detail, and actions into Documents page** (AC: #1, #9, #11, #12, #18, #20)
  - [ ] 15.1: Modify `apps/admin/src/app/(app)/documents/page.tsx` (created in Story 4.1).
  - [ ] 15.2: Add state management for: `isUploadDialogOpen`, `selectedDocumentId` (for detail view), `isDetailOpen`, `isReplaceDialogOpen`, `isDeleteDialogOpen`, `documentToReplace`, `documentToDelete`.
  - [ ] 15.3: When `currentFolderId` is set and user is admin, render the "Upload" button (shadcn `Button` with `Upload` icon) in the page header area next to the "New Subfolder" button.
  - [ ] 15.4: In the folder contents view (Task 10.4 from Story 4.1), replace the simple document list items with `DocumentCard` components. Pass each document object, admin status, and action handlers.
  - [ ] 15.5: Render `UploadDialog` with `folderId={currentFolderId}` and the current folder's name.
  - [ ] 15.6: Render `DocumentDetail` sheet/dialog, bound to `selectedDocumentId`.
  - [ ] 15.7: Render `ReplaceFileDialog` and `DocumentDeleteDialog`, bound to their respective state.
  - [ ] 15.8: Wire all action handlers: DocumentCard "View Details" -> open detail, "Replace File" -> open replace dialog, "Delete" -> open delete dialog. DocumentDetail "Replace File" -> open replace dialog, "Delete" -> open delete dialog.

- [ ] **Task 16: Implement document icon helper** (AC: #11)
  - [ ] 16.1: Create `apps/admin/src/components/documents/documentIcons.ts` (or add to a utils file). Export a function `getDocumentIcon(document: { extension?: string, videoUrl?: string }): LucideIcon` that returns the appropriate icon component: `FileText` for pdf, `Image` for jpg/jpeg/png, `FileSpreadsheet` for xlsx/csv, `Video` for video links, `File` as default fallback.

- [ ] **Task 17: Write backend unit tests** (AC: #6, #7, #13, #14, #16, #19)
  - [ ] 17.1: Add tests to `packages/backend/convex/documents/__tests__/mutations.test.ts` (file may exist from Story 4.1).
  - [ ] 17.2: Test `uploadDocument`: (a) admin uploads document successfully — verify document exists in `documents` table with correct fields, `storageId` set, `videoUrl` undefined, (b) non-admin calling mutation receives `NOT_AUTHORIZED` error, (c) uploading to a folder from a different team throws `NOT_FOUND`, (d) uploading to a non-existent folder throws `NOT_FOUND`.
  - [ ] 17.3: Test `addVideoLink`: (a) admin adds video link successfully — verify document exists with `videoUrl` set and `storageId` undefined, (b) invalid URL (no http/https prefix) throws `VALIDATION_ERROR`, (c) non-admin receives `NOT_AUTHORIZED`.
  - [ ] 17.4: Test `replaceFile`: (a) admin replaces file successfully — verify `storageId`, `filename`, `extension`, `mimeType`, `fileSize` are updated and `updatedAt` changed, (b) attempting to replace on a video link document throws `VALIDATION_ERROR`, (c) non-admin receives `NOT_AUTHORIZED`, (d) document from different team throws error.
  - [ ] 17.5: Test `deleteDocument`: (a) admin deletes file document — verify document record is removed, (b) admin deletes video link document — verify record removed (no storage deletion needed since no `storageId`), (c) non-admin receives `NOT_AUTHORIZED`, (d) verify related `documentReads` are also deleted.
  - [ ] 17.6: Add to `packages/backend/convex/documents/__tests__/queries.test.ts`: test `getDocumentUrl` — (a) returns a URL for file-type documents, (b) returns `null` for video link documents, (c) rejects wrong team access. Test `getDocument` — (a) returns document with owner name, (b) rejects wrong team.

- [ ] **Task 18: Final validation** (AC: all)
  - [ ] 18.1: Run `pnpm typecheck` — must pass with zero errors.
  - [ ] 18.2: Run `pnpm lint` — must pass with zero errors.
  - [ ] 18.3: Run backend tests (`vitest run` in packages/backend) — all new and existing tests pass.
  - [ ] 18.4: Start the dev server — navigate to `/documents`, enter a folder, verify:
    - "Upload" button is visible for admin users
    - "Upload" button is NOT visible for non-admin users
    - Clicking "Upload" opens the dialog with File/Video tabs
  - [ ] 18.5: Test file upload: select a PDF file under 50MB, submit, verify document appears in the folder list in real time with correct icon and metadata.
  - [ ] 18.6: Test file size rejection: attempt to upload a file > 50MB, verify the inline validation error appears.
  - [ ] 18.7: Test unsupported file type: attempt to upload a `.doc` or `.mp4` file, verify rejection.
  - [ ] 18.8: Test video link: switch to "Video Link" tab, enter a valid URL and name, submit, verify video link document appears in list with video icon.
  - [ ] 18.9: Test document detail: click a file document, verify detail panel opens with correct metadata and "Open / Download" button works (opens signed URL in new tab).
  - [ ] 18.10: Test video link detail: click a video link document, verify "Watch Video" button opens URL in new tab.
  - [ ] 18.11: Test replace file: from a file document's detail view, click "Replace File", upload a different file, verify metadata updates and the old file is no longer accessible.
  - [ ] 18.12: Test delete document: delete a document, verify it disappears from the list in real time.
  - [ ] 18.13: Verify non-admin users can see documents but NOT the Upload, Replace, or Delete controls.

## Dev Notes

### Architecture Context

This is the **file management story for Epic 4 (Document Hub)**. It builds directly on Story 4.1's folder structure and data model, adding the write and read paths for documents: uploading files, adding video links, viewing/downloading documents, replacing files, and deleting documents. This is the core "content" story of the Document Hub — after this, users can actually put documents into the folder structure.

This story directly implements:

- **FR13:** Admin can upload files (PDF, images, spreadsheets) and add video links to any folder
- **FR14:** Admin can replace an existing document's file from its detail view
- **FR17 (partial):** Users can view, open, and download documents they have access to — this story delivers the view/open/download UI; access filtering is refined in Story 4.3
- **FR19:** Video links open in the source platform (new browser tab)
- **NFR3:** Document upload supports files up to 50MB
- **NFR9:** File storage with signed URLs (no public access to uploaded documents)

Subsequent stories build on this:

- **Story 4.3 (Document Permissions):** Adds role and user-level permission management for the documents created here
- **Story 4.4 (Read Tracking):** Adds read tracking when users open documents created here
- **Story 4.5 (Document Search & Browse):** Adds search and filtering across all documents

### Key Architectural Decisions from architecture.md

- **Convex Storage Pattern:** Files are uploaded to Convex storage via a two-step process: (1) `generateUploadUrl` to get a temporary upload URL, (2) POST file to that URL, (3) save `storageId` in a mutation. Signed URLs are generated per-request for downloads. No files are publicly accessible. [Source: architecture.md#Authentication-&-Security — "File Security: Convex storage with signed URLs"]

- **Data Model — Documents Table:** The `documents` table (defined in Story 4.1) has both `storageId` (for uploaded files) and `videoUrl` (for video links). A document is either a file (`storageId` set, `videoUrl` undefined) or a video link (`videoUrl` set, `storageId` undefined). Never both. [Source: architecture.md#Data-Architecture]

- **Authorization Pattern:** `requireRole(ctx, ["admin"])` for all write operations (upload, replace, delete). `requireAuth(ctx)` for read operations (view, download). All queries filter by `teamId`. [Source: architecture.md#Authentication-&-Security]

- **State Management:** Convex `useQuery` for all document data. Local UI state for dialogs (open/closed, selected document). No global state management. [Source: architecture.md#Frontend-Architecture]

- **Error Handling:** `ConvexError` with standardized codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`. Frontend catches and displays via `sonner` toasts. [Source: architecture.md#Format-Patterns]

- **Component Organization:** Feature-grouped at `components/documents/`. [Source: architecture.md#Structure-Patterns]

- **Dates:** Stored as Unix timestamp ms (`number`) in Convex. Displayed using `date-fns` format function. [Source: architecture.md#Format-Patterns]

- **Loading States:** `useQuery` returns `undefined` while loading → show `Skeleton`. Empty data → show empty state message. [Source: architecture.md#Process-Patterns]

### Variance from Epic AC

The original epic acceptance criteria (epics.md, Story 4.2) state:

> a form appears with fields: file input (or video URL toggle), document name (optional, defaults to filename), folder location (pre-filled with current folder)

**This story extends that spec with:**

- **Document detail view** — not explicitly mentioned in the epic AC but architecturally necessary for FR14 ("replace from its detail view") and FR17 ("view, open, and download documents"). A detail panel is required to house the Replace and Download actions.
- **Delete functionality** — not in the original AC but essential for admin document management. Without it, admins have no way to remove incorrectly uploaded documents.
- **Type-specific icons** — enhanced document list items with file-type icons for better visual identification.
- **`getDocumentUrl` query** — necessary for the download flow (signed URLs cannot be stored permanently; they must be generated per-request).
- **`getDocument` detail query** — needed for the detail view to show owner name and full metadata.

### Dependencies (Must Be Complete Before Starting)

| Dependency | Story | Status Check |
|------------|-------|-------------|
| `documents` table schema with `storageId`, `videoUrl`, `filename`, `extension`, `mimeType`, `fileSize` fields | Story 4.1 | `packages/backend/convex/table/documents.ts` must exist with all fields |
| `folders` table schema | Story 4.1 | `packages/backend/convex/table/folders.ts` must exist |
| `documentReads` table schema (for cascade delete) | Story 4.1 | `packages/backend/convex/table/documentReads.ts` must exist |
| `requireAuth`, `requireRole` helpers | Story 2.1 | `packages/backend/convex/lib/auth.ts` must export both |
| Documents page (`/documents`) with folder browser | Story 4.1 | `apps/admin/src/app/(app)/documents/page.tsx` must exist with folder navigation |
| `generateUploadUrl` mutation | Template | `packages/backend/convex/storage.ts` must export `generateUploadUrl` |
| shadcn/ui Dialog, Sheet, Tabs, AlertDialog, DropdownMenu, Button, Input | Story 1.2 | Components must be installed in admin app |

### Current State (Baseline)

**`convex/documents/mutations.ts`:** Should exist from Story 4.1 with `createFolder`, `renameFolder`, `deleteFolder`. This story adds `uploadDocument`, `addVideoLink`, `replaceFile`, `deleteDocument`.

**`convex/documents/queries.ts`:** Should exist from Story 4.1 with `getFolders`, `getFolderContents`, `getFolderBreadcrumb`, `getFolderItemCounts`. This story adds `getDocumentUrl`, `getDocument`.

**`convex/storage.ts`:** Exists in the template with `generateUploadUrl` mutation and `getImageUrl`/`getImageUrls` queries. The `generateUploadUrl` will be reused directly for the document upload flow.

**`apps/admin/src/components/documents/`:** Should exist from Story 4.1 with `FolderCard.tsx`, `FolderCreateDialog.tsx`, `FolderRenameDialog.tsx`, `FolderDeleteDialog.tsx`, `DocumentFolderBreadcrumb.tsx`. This story adds `UploadDialog.tsx`, `DocumentCard.tsx`, `DocumentDetail.tsx`, `ReplaceFileDialog.tsx`, `DocumentDeleteDialog.tsx`, `FileDropZone.tsx`, `documentIcons.ts`.

**`apps/admin/src/app/(app)/documents/page.tsx`:** Should exist from Story 4.1 with folder browsing UI. This story modifies it to add the Upload button, document list rendering with `DocumentCard`, and dialog integrations.

### Upload Flow Sequence

```
Admin clicks "Upload" in folder view
→ UploadDialog opens (File Upload tab active)
→ Admin drags/drops or selects a file
→ FileDropZone validates size + type client-side
→ Admin optionally sets document name
→ Admin clicks "Upload"
→ react-hook-form validates via Zod
→ isUploading = true, button disabled with spinner
→ Step 1: useMutation(api.storage.generateUploadUrl)() → uploadUrl
→ Step 2: fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file })
→ Parse response: { storageId }
→ Step 3: useMutation(api.documents.mutations.uploadDocument)({
     folderId, name, filename: file.name, extension, storageId, mimeType: file.type, fileSize: file.size
   })
→ Success: toast.success("Document uploaded"), close dialog
→ Convex subscription: document appears in folder list in real time
```

### Replace Flow Sequence

```
Admin opens document detail → clicks "Replace File"
→ ReplaceFileDialog opens
→ Admin selects new file (same validation as upload)
→ Admin confirms replacement
→ isReplacing = true
→ Step 1: generateUploadUrl → uploadUrl
→ Step 2: fetch(uploadUrl, ...) → { storageId }
→ Step 3: replaceFile mutation ({
     documentId, storageId, filename, extension, mimeType, fileSize
   })
→ Server: deletes old file from storage, patches document with new metadata
→ Success: toast.success("File replaced"), close dialog
→ Detail view auto-updates with new metadata via subscription
```

### Component Architecture

```
Documents Page (page.tsx)
├── DocumentFolderBreadcrumb (Story 4.1)
├── "Upload" Button (admin-only, visible when in a folder)
├── "New Category" / "New Subfolder" Buttons (Story 4.1)
├── FolderCard grid (Story 4.1 — subfolders)
├── DocumentCard list (NEW — documents in folder)
│   ├── Type Icon (via getDocumentIcon)
│   ├── Name, Size, Date
│   └── Admin DropdownMenu (View Details | Replace | Delete)
├── UploadDialog (NEW)
│   ├── Tabs: "File Upload" | "Video Link"
│   ├── FileDropZone (NEW) — for file mode
│   └── Form fields (name, URL, etc.)
├── DocumentDetail Sheet (NEW)
│   ├── Document metadata display
│   ├── "Open / Download" button (files)
│   ├── "Watch Video" button (video links)
│   ├── "Replace File" button (admin, files only)
│   └── "Delete" button (admin)
├── ReplaceFileDialog (NEW)
│   └── FileDropZone + confirmation
└── DocumentDeleteDialog (NEW)
    └── AlertDialog confirmation
```

### Files Expected to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/shared/constants.js` (or `documents.ts`) | Modified/Created | Document constants: MIME types, extensions, max size, format utilities |
| `packages/backend/convex/documents/mutations.ts` | Modified | Add `uploadDocument`, `addVideoLink`, `replaceFile`, `deleteDocument` mutations |
| `packages/backend/convex/documents/queries.ts` | Modified | Add `getDocumentUrl`, `getDocument` queries |
| `apps/admin/src/components/documents/FileDropZone.tsx` | Created | Drag-and-drop file input component |
| `apps/admin/src/components/documents/UploadDialog.tsx` | Created | Upload dialog with File/Video tabs |
| `apps/admin/src/components/documents/DocumentCard.tsx` | Created | Document list item with icon, metadata, admin actions |
| `apps/admin/src/components/documents/DocumentDetail.tsx` | Created | Document detail side panel/dialog |
| `apps/admin/src/components/documents/ReplaceFileDialog.tsx` | Created | Replace file confirmation + upload dialog |
| `apps/admin/src/components/documents/DocumentDeleteDialog.tsx` | Created | Delete confirmation dialog |
| `apps/admin/src/components/documents/documentIcons.ts` | Created | File type to icon mapping utility |
| `apps/admin/src/app/(app)/documents/page.tsx` | Modified | Add Upload button, DocumentCard rendering, dialog integrations |
| `packages/backend/convex/documents/__tests__/mutations.test.ts` | Modified | Add tests for uploadDocument, addVideoLink, replaceFile, deleteDocument |
| `packages/backend/convex/documents/__tests__/queries.test.ts` | Modified | Add tests for getDocumentUrl, getDocument |

### What This Story Does NOT Include

- **No permission management UI** — that's Story 4.3. Documents created here inherit folder permissions (`permittedRoles: undefined`)
- **No read tracking** — that's Story 4.4. No `documentReads` records are created when opening documents in this story
- **No document search or filtering** — that's Story 4.5
- **No inline document preview** (e.g., PDF viewer) — out of Sprint 1 scope. Files open/download in a new tab
- **No version history** — replace is destructive (old file deleted). Version tracking is post-Sprint 1
- **No batch upload (multiple files at once)** — single file upload per dialog invocation. Batch is post-Sprint 1
- **No document renaming** — document name is set at creation. Admin can only replace the file, not rename. Renaming is a minor enhancement for a future story
- **No notification on upload** — document notifications (e.g., "New document shared with you") are deferred to Story 4.3 when permissions are set

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Story 4.1 (data model, folder structure) not complete yet | All document mutations depend on the `documents` and `folders` tables existing. Verify `convex/table/documents.ts` and `convex/table/folders.ts` exist before starting. |
| `generateUploadUrl` mutation signature may differ from expected | Check `packages/backend/convex/storage.ts` for the exact export and return type. The template provides this — it should be a simple mutation returning a URL string. |
| Large file uploads may timeout | Convex storage handles the upload directly (client → Convex storage). The 50MB limit is well within Convex's capabilities. No custom timeout handling needed. |
| `ctx.storage.delete()` may require `Id<"_storage">` type | Convex storage IDs stored as `string` in the documents table may need casting to `Id<"_storage">`. Test during implementation. |
| Drag-and-drop may have browser inconsistencies | Use standard HTML5 drag-and-drop events. Test on Chrome, Firefox, Safari, Edge (NFR12). Fallback is the click-to-browse input which works everywhere. |
| Multiple rapid uploads could cause race conditions | Each upload is an independent mutation — Convex handles transactional consistency. No race condition possible at the data layer. |

### Performance Considerations

- **Signed URL generation:** `ctx.storage.getUrl()` is called per-request in the `getDocumentUrl` query. These URLs have built-in expiration. For the document list view, URLs are NOT pre-fetched — they're only generated when the user clicks "Open / Download" in the detail view, avoiding unnecessary URL generation for all listed documents.
- **File upload:** The upload goes directly from the client to Convex storage (not through our server), so upload performance scales with Convex's infrastructure.
- **Old file cleanup:** `ctx.storage.delete()` in the `replaceFile` mutation ensures orphaned files don't accumulate in storage.
- **DocumentReads cleanup:** The `deleteDocument` mutation cascades to delete related `documentReads` records, preventing orphaned read tracking data.

### Alignment with Architecture Document

- **Storage Pattern:** Matches `architecture.md § Authentication & Security` — Convex storage with signed URLs, no public access
- **Mutation Pattern:** Matches `architecture.md § Process Patterns` — `useForm` + `zodResolver` + `useMutation` + `toast.success/error`
- **Auth Pattern:** Matches `architecture.md § Authentication & Security` — `requireRole(ctx, ["admin"])` for write operations, `requireAuth(ctx)` for reads
- **Data Model:** Matches `architecture.md § Data Architecture` — documents table with hybrid fields (storageId for files, videoUrl for links)
- **Component Structure:** Matches `architecture.md § Frontend Architecture` — components in `components/documents/`
- **Error Handling:** Matches `architecture.md § Format Patterns` — `ConvexError` with `VALIDATION_ERROR`, `NOT_FOUND`, `NOT_AUTHORIZED` codes
- **Naming:** Matches `architecture.md § Naming Patterns` — `uploadDocument` (camelCase mutation), `UploadDialog.tsx` (PascalCase component)
- **Testing:** Matches `architecture.md § Structure Patterns` — co-located tests in `convex/documents/__tests__/`
- **Loading States:** Matches `architecture.md § Process Patterns` — `useQuery` returns `undefined` → skeleton
- **No detected conflicts** with the architecture document

### References

- [Source: architecture.md#Data-Architecture] — Documents table schema, hybrid normalization (storageId vs videoUrl), junction tables
- [Source: architecture.md#Authentication-&-Security] — File Security: Convex storage with signed URLs, requireAuth/requireRole, teamId scoping
- [Source: architecture.md#Frontend-Architecture] — Component organization (components/documents/), page structure (app/(app)/documents/), state management (useQuery + local state)
- [Source: architecture.md#Format-Patterns] — Dates as timestamps, date-fns formatting, ConvexError codes
- [Source: architecture.md#Process-Patterns] — Form pattern, loading states, mutation feedback
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — Naming conventions, enforcement guidelines
- [Source: architecture.md#Project-Structure-&-Boundaries] — Directory structure, module boundaries
- [Source: architecture.md#API-&-Communication-Patterns] — Convex queries/mutations, error handling
- [Source: epics.md#Story-4.2] — Original story definition, user story, and BDD acceptance criteria
- [Source: epics.md#FR-Coverage-Map] — FR13, FR14, FR17, FR19 mapped to Epic 4
- [Source: 4-1-document-data-model-folder-structure.md] — Predecessor story establishing data model and folder UI

## Dev Agent Record

### Agent Model Used

(to be filled during implementation)

### Debug Log References

### Completion Notes List

### File List
