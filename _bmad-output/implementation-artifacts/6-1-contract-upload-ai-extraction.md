# Story 6.1: Contract Upload & AI Extraction

Status: ready-for-dev

> **PROJECT SCOPE:** All frontend work targets the client-facing web app at `apps/web/`. Do NOT modify `apps/admin/` — that is a separate internal admin panel. All UI components, pages, layouts, and routes go in `apps/web/`.

## Story

As an admin,
I want to upload a player's contract PDF and have key terms automatically extracted via AI,
so that I can quickly view structured contract data without reading the full document.

## Acceptance Criteria (BDD)

### AC1: Contract Tab Visibility (Admin Only)
**Given** the admin is viewing a player's profile page
**When** the page loads
**Then** a "Contract" tab is visible in the player profile tab navigation
**And** the tab is not rendered for non-admin roles (enforced at query layer, not UI-only)

### AC2: Contract PDF Upload
**Given** the admin is on a player's Contract tab
**When** the admin clicks "Upload Contract"
**Then** a file upload dialog opens accepting only PDF files
**And** the admin can select and upload a PDF file up to 50MB
**When** the upload completes
**Then** the contract record is created with `extractionStatus: "pending"`
**And** the original PDF is stored in Convex storage with a signed URL

### AC3: AI Data Extraction
**Given** a contract PDF has been uploaded
**When** the system processes the document via AI extraction
**Then** structured data is extracted containing: contract duration (start date, end date), salary, bonuses, clauses, termination terms, and governing law
**And** extraction completes within 30 seconds (NFR4)
**And** the contract record is updated with `extractionStatus: "completed"` and the extracted fields

### AC4: Extraction Status Feedback (Real-Time)
**Given** a contract upload has been initiated
**When** the extraction is in progress
**Then** the UI displays a loading/processing indicator with status text (e.g., "Extracting contract data...")
**And** the UI updates in real time via Convex subscription when status changes to "completed" or "failed"
**And** if extraction fails, an error message is displayed with an option to retry

### AC5: Structured Data Display
**Given** a contract has been successfully extracted
**When** the admin views the Contract tab
**Then** extracted data is displayed in a structured card layout showing:
  - Contract Duration: start date — end date
  - Salary details
  - Bonuses
  - Clauses
  - Termination terms
  - Governing law
**And** the original PDF remains downloadable via a "Download PDF" button
**And** empty/unextracted fields display a "Not found in document" placeholder

### AC6: Manual Correction of Extracted Fields
**Given** the admin is viewing the extracted contract data
**When** the admin clicks "Edit" on the contract details
**Then** all extracted fields become editable in a form
**When** the admin modifies any field and saves
**Then** the corrected data is persisted to the contract record
**And** a success toast confirms the update

### AC7: Multiple Contract Uploads
**Given** a player already has a contract uploaded
**When** the admin uploads a new contract PDF
**Then** the new contract replaces the previous one (latest contract is the active one)
**And** the previous extracted data is replaced by the new extraction results

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Define Contract Schema** (AC: 1, 2, 3, 5)
  - [ ] 1.1: Add `contracts` table to `packages/backend/convex/schema.ts` with fields:
    - `teamId` (Id<"teams">)
    - `playerId` (Id<"players">)
    - `storageId` (Id<"_storage">) — reference to uploaded PDF
    - `fileName` (string) — original filename
    - `extractionStatus` ("pending" | "processing" | "completed" | "failed")
    - `extractionError` (optional string) — error message if failed
    - `contractStartDate` (optional number) — Unix timestamp ms
    - `contractEndDate` (optional number) — Unix timestamp ms
    - `salary` (optional string) — free text, supports varied formats
    - `bonuses` (optional string) — free text
    - `clauses` (optional string) — free text
    - `terminationTerms` (optional string) — free text
    - `governingLaw` (optional string) — free text
    - `rawExtraction` (optional string) — full AI response for debugging
    - `uploadedBy` (Id<"users">)
    - `createdAt` (number)
    - `updatedAt` (number)
  - [ ] 1.2: Add indexes: `by_playerId` (playerId), `by_teamId` (teamId), `by_playerId_teamId` (playerId, teamId)

- [ ] **Task 2: Implement Contract Queries** (AC: 1, 5)
  - [ ] 2.1: Create `packages/backend/convex/contracts/queries.ts`
  - [ ] 2.2: Implement `getContract` query — takes `playerId`, enforces `requireRole(ctx, ["admin"])` + teamId scoping, returns contract record or null
  - [ ] 2.3: Implement `getContractDownloadUrl` query — takes `contractId`, enforces admin role, returns signed URL from Convex storage for PDF download

- [ ] **Task 3: Implement Contract Upload Mutation** (AC: 2, 7)
  - [ ] 3.1: Create `packages/backend/convex/contracts/mutations.ts`
  - [ ] 3.2: Implement `uploadContract` mutation:
    - Validate: `requireRole(ctx, ["admin"])`, teamId scoping
    - Accept: `playerId`, `storageId` (from client-side `uploadFile`), `fileName`
    - If existing contract for player: delete old storage file, delete old record
    - Insert new contract record with `extractionStatus: "pending"`
    - Schedule extraction action: `ctx.scheduler.runAfter(0, internal.contracts.actions.extractContractData, { contractId })`
    - Return the new contract ID
  - [ ] 3.3: Implement `updateExtractedData` internal mutation:
    - Called by the extraction action upon completion
    - Accept: `contractId`, extracted fields, status
    - Patch contract record with extracted data and `extractionStatus: "completed"` or `"failed"`
  - [ ] 3.4: Implement `updateContractFields` mutation:
    - Validate: `requireRole(ctx, ["admin"])`, teamId scoping
    - Accept: `contractId` + partial update of extracted fields (salary, bonuses, clauses, etc.)
    - Patch contract record with updated fields and `updatedAt` timestamp

- [ ] **Task 4: Implement AI Extraction Action** (AC: 3, 4)
  - [ ] 4.1: Create `packages/backend/convex/contracts/actions.ts`
  - [ ] 4.2: Implement `extractContractData` internal action:
    - Fetch PDF bytes from Convex storage via `ctx.storage.get(storageId)`
    - Update contract status to `"processing"` via internal mutation
    - Call LLM API (Claude or Gemini — use environment variable for provider selection) with:
      - System prompt instructing structured JSON extraction
      - PDF content (base64-encoded or as supported by provider)
      - Target fields: contractStartDate, contractEndDate, salary, bonuses, clauses, terminationTerms, governingLaw
    - Parse LLM JSON response with Zod validation
    - On success: call internal mutation to save extracted data with status `"completed"`
    - On failure: call internal mutation to set status `"failed"` with error message
    - Implement 30-second timeout guard
  - [ ] 4.3: Create the LLM prompt template as a constant — structured extraction prompt requesting JSON output with the target fields
  - [ ] 4.4: Add environment variable support: `LLM_PROVIDER` ("claude" | "gemini"), `LLM_API_KEY`

- [ ] **Task 5: Write Backend Tests** (AC: 1, 2, 3, 6)
  - [ ] 5.1: Create `packages/backend/convex/contracts/__tests__/mutations.test.ts`
  - [ ] 5.2: Test `uploadContract` — creates record with pending status, rejects non-admin
  - [ ] 5.3: Test `updateContractFields` — admin can update fields, non-admin rejected
  - [ ] 5.4: Test `updateExtractedData` — internal mutation correctly patches record
  - [ ] 5.5: Test `getContract` — returns contract for admin, returns null/throws for non-admin
  - [ ] 5.6: Test team scoping — admin from team A cannot access team B contracts

### Frontend Tasks

- [ ] **Task 6: Create ContractCard Component** (AC: 1, 5)
  - [ ] 6.1: Create `apps/admin/src/components/players/ContractCard.tsx`
  - [ ] 6.2: Subscribe to `api.contracts.queries.getContract` with `useQuery` passing `playerId`
  - [ ] 6.3: Render states:
    - **No contract**: Empty state with "Upload Contract" CTA button
    - **Pending/Processing**: Skeleton/spinner with "Extracting contract data..." text
    - **Failed**: Error alert with retry button
    - **Completed**: Structured card layout with extracted fields
  - [ ] 6.4: Implement structured data display using shadcn Card components:
    - Contract Duration card (start — end, formatted with date-fns)
    - Salary card
    - Bonuses card
    - Clauses card
    - Termination Terms card
    - Governing Law card
  - [ ] 6.5: Add "Download PDF" button that fetches signed URL from `getContractDownloadUrl` and triggers browser download
  - [ ] 6.6: Display "Not found in document" placeholder for null/empty fields

- [ ] **Task 7: Create Contract Upload Dialog** (AC: 2, 7)
  - [ ] 7.1: Create `apps/admin/src/components/players/ContractUploadDialog.tsx`
  - [ ] 7.2: Use shadcn Dialog with file input restricted to `accept=".pdf,application/pdf"`
  - [ ] 7.3: Implement upload flow:
    - Client-side: `useMutation(api.contracts.mutations.uploadContract)` + `useAction` for `storage.generateUploadUrl`
    - Upload PDF to Convex storage first, then call `uploadContract` mutation with `storageId`
  - [ ] 7.4: Show upload progress indicator during file transfer
  - [ ] 7.5: Handle errors: file too large (>50MB), wrong file type, upload failure — display via `sonner` toast
  - [ ] 7.6: If player already has a contract, show confirmation dialog before replacing

- [ ] **Task 8: Create Contract Edit Form** (AC: 6)
  - [ ] 8.1: Create `apps/admin/src/components/players/ContractEditForm.tsx`
  - [ ] 8.2: Use `react-hook-form` + Zod schema for contract fields validation
  - [ ] 8.3: Pre-populate form with current extracted data
  - [ ] 8.4: Call `updateContractFields` mutation on save
  - [ ] 8.5: Toggle between view mode and edit mode within ContractCard
  - [ ] 8.6: Show `toast.success("Contract updated")` on successful save

- [ ] **Task 9: Integrate Contract Tab into Player Profile** (AC: 1)
  - [ ] 9.1: Add "Contract" tab to player profile page at `apps/admin/src/app/(app)/players/[playerId]/page.tsx`
  - [ ] 9.2: Conditionally render the Contract tab only when current user has admin role (check via `useCurrentUser` hook or a dedicated role query)
  - [ ] 9.3: Render `ContractCard` component within the Contract tab content area
  - [ ] 9.4: Ensure tab is completely absent (not just hidden) for non-admin users

## Dev Notes

### Architecture Patterns

- **AI Extraction Flow (3-step pattern from architecture.md):**
  1. **Mutation**: Upload PDF to Convex storage → create contract record with `extractionStatus: "pending"` → schedule action
  2. **Action** (scheduled via `ctx.scheduler.runAfter`): Fetch PDF bytes → call LLM API → parse response
  3. **Internal Mutation** (called from action): Write extracted data → set `extractionStatus: "completed"` or `"failed"`
  - Frontend subscribes to contract record via `useQuery` — sees status transitions live, no polling needed.

- **Auth Pattern**: Every query/mutation starts with `requireRole(ctx, ["admin"])`. Contract data is never returned to non-admin users at the Convex layer. [Source: architecture.md#Authentication & Security]

- **Multi-tenancy**: All contract queries filter by `teamId` from `requireAuth(ctx)`. [Source: architecture.md#Authentication & Security]

- **Error Handling**: Use `ConvexError` with standardized codes: `NOT_AUTHORIZED`, `NOT_FOUND`, `EXTRACTION_FAILED`, `UPLOAD_FAILED`. Frontend catches `ConvexError` and displays via `sonner` toasts. [Source: architecture.md#Format Patterns]

- **File Security**: PDF stored in Convex storage with signed URLs — never publicly accessible. Use `ctx.storage.getUrl()` for signed download links. [Source: architecture.md#Authentication & Security]

- **Form Pattern**: `react-hook-form` + `zodResolver` + `useMutation`. [Source: architecture.md#Process Patterns]

- **Date Storage**: All dates stored as Unix timestamp ms (`number`), displayed via `date-fns` formatting. [Source: architecture.md#Format Patterns]

### LLM Integration Notes

- The LLM provider (Claude vs Gemini) is intentionally deferred — implement with an environment variable toggle (`LLM_PROVIDER`).
- For Claude: use the Anthropic SDK (`@anthropic-ai/sdk`) with PDF support via base64 content.
- For Gemini: use the Google Generative AI SDK with PDF via inline data.
- The extraction prompt should request strict JSON output matching a defined Zod schema for reliable parsing.
- Include fallback: if LLM response doesn't parse, set `extractionStatus: "failed"` with the raw response saved in `rawExtraction` for debugging.

### NFR Compliance

- **NFR4**: AI extraction must complete within 30 seconds. Implement a timeout in the action.
- **NFR3**: Support 50MB file uploads via Convex storage.
- **NFR8**: Contract data accessible only to admin users — enforced at Convex query/mutation layer.
- **NFR9**: Signed URLs for PDF storage — no public access.

### Project Structure Notes

- Alignment with architecture.md project structure:
  - Backend: `packages/backend/convex/contracts/` — queries.ts, mutations.ts, actions.ts
  - Frontend: `apps/admin/src/components/players/ContractCard.tsx`, `ContractUploadDialog.tsx`, `ContractEditForm.tsx`
  - Schema: `packages/backend/convex/schema.ts` — add `contracts` table definition
  - Tests: `packages/backend/convex/contracts/__tests__/mutations.test.ts`
  - Player profile page: `apps/admin/src/app/(app)/players/[playerId]/page.tsx` — add Contract tab
- No new routes needed — Contract tab lives within the existing player profile page.
- Depends on `convex/lib/auth.ts` (requireAuth, requireRole) being implemented (Epic 2 prerequisite).

### Dependencies

- **Epic 5 (Story 5.1)**: Player data model and profile page with tab navigation must exist.
- **Epic 2 (Story 2.1)**: Auth helpers (`requireAuth`, `requireRole`) must be implemented.
- **External**: LLM API key configured as Convex environment variable.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — AI Contract Extraction]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6 — Story 6.1]
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements — FR26, NFR4, NFR8, NFR9]

## Dev Agent Record

### Agent Model Used

<!-- To be filled by implementing agent -->

### Debug Log References

### Completion Notes List

### File List
