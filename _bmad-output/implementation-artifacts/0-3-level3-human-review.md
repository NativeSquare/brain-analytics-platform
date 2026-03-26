# Story 0.3 — Validation Level 3 (Human review workflow)

Status: in-progress

## Story

As a Mission Control pipeline,
I need the human review workflow to be wired end-to-end,
So that stories with `requires-human-review: true` are routed through Approve/Reject before completion.

## Acceptance Criteria

1. **AC1 — Notification delivery**
   **Given** the Telegram notification system is configured
   **When** a test notification is sent via `notifyAlex()`
   **Then** the Telegram API returns a successful response (env vars `LINUS_BOT_TOKEN` and `ALEX_CHAT_ID` are set)

2. **AC2 — UI needs_review column**
   **Given** a story-run transitions to `needs_review`
   **When** the operator views the kanban board
   **Then** the story appears in the "Needs Review" column with Approve/Reject buttons visible

3. **AC3 — Approve workflow**
   **Given** a story in `needs_review` status
   **When** the operator clicks "Approve"
   **Then** `POST /review-story { action: "approve" }` triggers `storyRuns.approve` mutation, setting status to `done` with `completedAt`

4. **AC4 — Reject workflow**
   **Given** a story in `needs_review` status
   **When** the operator clicks "Reject" with a rejection report
   **Then** `POST /review-story { action: "reject", report }` triggers `storyRuns.reject` mutation, storing the `rejectionReport`

5. **AC5 — Rejection report passed to dev agent on resume**
   **Given** a rejected story with a `rejectionReport`
   **When** the story is resumed via Resume button
   **Then** the `rejectionReport` is included in the dev agent's `userMessage` for the next development cycle

## Tasks

- [ ] Task 1: Verify notification env vars (`LINUS_BOT_TOKEN`, `ALEX_CHAT_ID`)
- [ ] Task 2: Send test notification via `notifyAlex()` and confirm delivery
- [ ] Task 3: Verify UI wiring — `needs_review` column, Approve/Reject buttons, reject textarea
- [ ] Task 4: Verify `handleReviewStory()` approve/reject flow in sync-server
- [ ] Task 5: Verify `storyRuns.approve` and `storyRuns.reject` Convex mutations
- [ ] Task 6: Verify rejection report injection on resume

## Dev Notes

- Package manager: pnpm
- Project type: monorepo
- Workspaces: apps\admin, apps\native, apps\web, packages\backend, packages\shared, packages\transactional

- Notification system: Telegram via `notifyAlex()` (not Slack)
- UI components: dev-loop-tab.tsx (DO NOT modify)
- Convex mutations: storyRuns.ts (DO NOT modify)
- This is a verification-only story — no new code should be written by the dev agent
