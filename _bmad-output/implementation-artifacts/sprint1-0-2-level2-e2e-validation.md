# Story 0.2 — Validation Level 2 (E2E / CI-CD pipeline)

Status: done

## Story

As a Mission Control pipeline,
I need the full E2E / CI-CD chain to be operational,
So that stories with `requires-e2e: true` can be tested end-to-end without manual intervention.

## Acceptance Criteria

1. **AC1 — EAS CLI installed and authenticated**
   **Given** this repo (native project detected)
   **When** you run the prerequisite checks
   **Then** `eas --version` succeeds, `eas whoami` returns a valid user, and `eas init` has linked the project

2. **AC2 — CI/CD infrastructure scaffolded**
   **Given** prerequisites pass
   **When** scaffolding runs
   **Then** `eas.json` has preview/production channels, `app.config.ts` has fingerprint policy, `.eas/workflows/mc-ci-test.yml` exists, `.maestro/` has flows, EAS webhook is configured

3. **AC3 — Workflow validates**
   **Given** scaffolding complete
   **When** dry-run validation runs
   **Then** the workflow YAML is syntactically valid and references are correct

4. **AC4 — Web E2E (if applicable)**
   **Given** a web app is detected
   **When** web E2E checks run
   **Then** Playwright or Cypress is installed with at least a smoke test

## Tasks

- [ ] Task 1: Validate EAS CLI prerequisites
  - [ ] 1.1: Verify `eas --version` — if missing, run `npm install -g eas-cli`
  - [ ] 1.2: Verify `eas whoami` — if not logged in, check `EXPO_TOKEN` env var
  - [ ] 1.3: Verify EAS project linked (`extra.eas.projectId` in app config) — if missing, run `eas init`

- [ ] Task 2: Run CI/CD scaffolding (reuses Story 5.3 infrastructure)
  - [ ] 2.1: Call `runScaffolding()` which handles eas.json, fingerprint policy, workflow, maestro, webhook
  - [ ] 2.2: Verify scaffolding report has no critical errors

- [ ] Task 3: Dry-run workflow validation
  - [ ] 3.1: Try `eas workflow:validate .eas/workflows/mc-ci-test.yml`
  - [ ] 3.2: If validate command unavailable, parse YAML locally for basic structure check

- [ ] Task 4: Web E2E validation (if web app detected)
  - [ ] 4.1: Check for Playwright or Cypress in devDependencies
  - [ ] 4.2: If missing, install Playwright and create smoke test
  - [ ] 4.3: If `VERCEL_DEPLOY_HOOK_URL` configured, verify connectivity

## Dev Notes

- Package manager: **pnpm**
- Project type: **monorepo**
- Workspaces: apps\admin, apps\native, apps\web, packages\backend, packages\shared, packages\transactional
- Stack: **monorepo**
- Has native app: **true**
- Has web app: **false**

### Important

- Prerequisites (eas-cli, login, init) are BLOCKING — if any fail, the story fails.
- Scaffolding steps (eas.json, fingerprint, workflow, maestro, webhook) are non-blocking individually.
- The dry-run validates that the scaffolded workflow is syntactically correct.
- All checks are idempotent — running this story twice produces the same result.
- Use `pnpm` as the package manager.
- Do NOT install dependencies globally except `eas-cli`.
