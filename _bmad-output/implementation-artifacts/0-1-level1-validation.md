# Story 0.1 — Validation Level 1 (tsc + unit tests)

Status: done

## Story

As a Mission Control pipeline,
I need the target repo's TypeScript compilation and unit tests to pass,
So that the dev->review gate never crashes on toolchain problems during real epic stories.

## Acceptance Criteria

1. **AC1 — TypeScript compilation passes**
   **Given** this repo
   **When** you run `npx tsc --build --noEmit`
   **Then** it exits with code 0 (no type errors)
   - If TypeScript is not installed, install it via `pnpm`
   - If there are pre-existing TS errors, fix them (path aliases, missing types, tsconfig issues)
   - For monorepos: ensure project references are correct and `tsc --build --noEmit` works

2. **AC2 — Unit test runner works**
   **Given** this repo
   **When** you run `npx vitest run`
   **Then** it exits with code 0
   - Test runner detected: **none (will install vitest)**
   - No test runner detected — you must install vitest and create a smoke test
   - If no test runner exists: install vitest (`pnpm add -D vitest`) and create `src/__tests__/smoke.test.ts` with `expect(true).toBe(true)`
   - If tests fail: fix the failing tests or configuration

3. **AC3 — Pre-commit hooks do not block commits**
   **Given** this repo (no pre-commit hooks detected)
   **When** you run `git commit --allow-empty -m "test: epic0 hook validation"`
   **Then** the commit succeeds (hooks pass or are configured to not block)
   - If the commit succeeds: clean up with `git reset HEAD~1`
   - If hooks fail and cannot be fixed quickly: add a `## Git Commit` section to the repo's `CLAUDE.md` instructing to use `--no-verify`

4. **AC4 — Idempotent pass-through**
   **Given** a repo where tsc passes, tests pass, and hooks are OK
   **When** this story runs
   **Then** it completes as `done` with no modifications needed

## Tasks

- [x] Task 1: Validate TypeScript (`npx tsc --build --noEmit`)
  - [x] 1.1: Verify TypeScript is installed (`node_modules/.bin/tsc` exists). If not, run `pnpm install`.
  - [x] 1.2: Run `npx tsc --build --noEmit` and check exit code
  - [x] 1.3: If tsc fails, analyze and fix errors (tsconfig paths, missing @types/*, project references)
  - [x] 1.4: Re-run `npx tsc --build --noEmit` until it passes

- [x] Task 2: Validate test runner (`npx vitest run`)
  - [x] 2.1: Verify test runner binary exists in `node_modules/.bin/`. If not, run `pnpm install`.
  - [x] 2.2: Run `npx vitest run` and check exit code
  - [x] 2.3: If no test runner detected: install vitest and create a smoke test
  - [x] 2.4: If tests fail, fix them
  - [x] 2.5: Re-run until exit code 0

- [x] Task 3: Validate pre-commit hooks
  - [x] 3.1: Run `git commit --allow-empty -m "test: epic0 hook validation"`
  - [x] 3.2: If commit succeeds, run `git reset HEAD~1` to clean up
  - [x] 3.3: If commit fails: try to fix hooks, or add `--no-verify` instruction to CLAUDE.md

- [x] Task 4: Final verification
  - [x] 4.1: Run `npx tsc --build --noEmit` one final time
  - [x] 4.2: Run `npx vitest run` one final time
  - [x] 4.3: Write signal file with status "done" if everything passes

## Dev Notes

- Package manager: **pnpm**
- Project type: **monorepo**
- Workspaces: apps\admin, apps\native, apps\web, packages\backend, packages\shared, packages\transactional
- Type checker: **tsc**
- Test runner: **none (will install vitest)**
   - No test runner detected — you must install vitest and create a smoke test
- Pre-commit hooks: **none detected**
- Install command: `pnpm install`

### Important

- Do NOT skip pre-existing errors. Fixing them is the whole point of this story.
- Do NOT install dependencies globally. Use `npx` or devDependencies.
- Do NOT replace config files wholesale. Fix what's broken.
- Use `pnpm` as the package manager (detected from lockfile/packageManager field).
- Commit your fixes with message: `fix(epic0): validate toolchain — tsc + unit tests + hooks`

## Dev Agent Record

### What was done
- **AC1**: Created root `tsconfig.json` with project references to all workspace packages. Added `composite: true` to each workspace tsconfig (apps/web, apps/admin, apps/native, packages/backend/convex, packages/transactional). Fixed 4 pre-existing TS errors:
  - `apps/admin/src/components/ui/button.tsx`: Added missing `"icon-xs"` size variant to Button component (used by combobox.tsx)
  - `apps/native/src/app/(app)/(tabs)/_layout.tsx`: Fixed import — `Label`/`Icon` are sub-components of `NativeTabs.Trigger`, not top-level exports from `expo-router/unstable-native-tabs`
  - `packages/backend/convex/convex.config.ts`: Added `ReturnType<typeof defineApp>` annotation to fix TS2742 (non-portable inferred type)
- **AC2**: Installed vitest 4.1.2 as root devDependency. Created `src/__tests__/smoke.test.ts`.
- **AC3**: Pre-commit hooks pass (none detected). Validated with empty commit + reset.
- **AC4**: Final `tsc --build --noEmit` and `vitest run` both exit 0.

## File List

- `tsconfig.json` (created — root project references)
- `package.json` (added vitest devDependency)
- `pnpm-lock.yaml` (updated)
- `apps/web/tsconfig.json` (added composite: true)
- `apps/admin/tsconfig.json` (added composite: true)
- `apps/admin/src/components/ui/button.tsx` (added icon-xs size variant)
- `apps/native/tsconfig.json` (added composite: true)
- `apps/native/src/app/(app)/(tabs)/_layout.tsx` (fixed NativeTabs.Trigger sub-component usage)
- `packages/backend/convex/tsconfig.json` (added composite: true)
- `packages/backend/convex/convex.config.ts` (added type annotation)
- `packages/transactional/tsconfig.json` (added composite: true)
- `src/__tests__/smoke.test.ts` (created — smoke test)
