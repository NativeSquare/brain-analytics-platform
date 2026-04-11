# BMAD Dev Loop — Epic Execution Prompt

Use this prompt to instruct a Claude Code instance to execute the full dev loop on an epic's stories sequentially.

---

## Prompt

```
Execute the BMAD dev loop on Epic [EPIC_NUMBER] sequentially. The stories are located in:
`[PATH_TO_STORIES_FOLDER]`

Process each story in order: [LIST STORY FILES]

## Dev Loop — For Each Story

### Step 1: Dev Agent
Spawn a sub-agent (type: general-purpose) with the role of "Amelia, the Dev Agent".
- Give it the FULL content of the story file
- Give it full project context (stack, auth patterns, file structure, critical rules)
- It must implement the story completely (backend + frontend + unit tests if RBAC-sensitive)
- At the end, it MUST run typecheck + lint + backend tests
- If anything fails, it fixes and re-runs until green
- It reports back: files created/modified, what was implemented, test results

### Step 2: Review Agent
Spawn a SEPARATE sub-agent (type: general-purpose) with the role of "Review Agent".
This is a different session — it has NO memory of the Dev Agent.
- Give it the list of files created/modified by the Dev Agent
- Give it the story's acceptance criteria
- It performs a 3-layer adversarial review:
  1. **Blind Hunter**: bugs, typos, runtime errors, missing imports, broken JSX
  2. **Edge Case Hunter**: empty states, null values, concurrent operations, boundary conditions
  3. **Acceptance Auditor**: verify every AC from the story is covered
- For CRITICAL and HIGH issues: the Review Agent implements the fixes itself
- For MEDIUM and LOW: it reports them only
- At the end, it MUST run typecheck + lint + backend tests to validate its fixes
- It reports back: issues found by severity, fixes applied, AC pass/fail checklist

### Step 3: QA Test Cases
After the Review Agent completes, YOU (the main agent) write manual QA test cases:
- Add them to the sprint QA document: `[PATH_TO_QA_DOC]`
- Every AC from the story must be covered by at least one test case
- Use this format per test case:

| Field | Value |
|---|---|
| **ACs Covered** | [which ACs] |
| **Prerequisites** | [setup needed] |
| **Steps** | [numbered steps] |
| **Expected** | [what should happen] |
| **Pass/Fail** | [ ] |

- Keep test cases practical and non-redundant — combine related ACs into one test case when it makes sense
- Do NOT write granular atomic tests for every single AC — write end-to-end flows that cover multiple ACs naturally

### Step 4: Next Story
Move to the next story in the epic and repeat Steps 1-3.

## Critical Rules
- Steps are SEQUENTIAL: Dev Agent → typecheck/tests → Review Agent → typecheck/tests → QA → next story
- Dev Agent and Review Agent are SEPARATE sub-agents with NO shared context
- Each sub-agent gets full context in its prompt (project rules, file paths, auth patterns, what exists)
- Never skip typecheck/tests between steps
- The main agent does NOT implement code itself — only the sub-agents do
- QA test cases are written by the main agent after each story, not by the sub-agents
```

---

## Variables to Fill

| Variable | Description |
|---|---|
| `[EPIC_NUMBER]` | The epic number (e.g., 14) |
| `[PATH_TO_STORIES_FOLDER]` | Path to the story files (e.g., `_bmad-output/implementation-artifacts/stories/sprint2/`) |
| `[LIST STORY FILES]` | Ordered list of story filenames |
| `[PATH_TO_QA_DOC]` | Path to the sprint QA test plan document |

You also need to include in the sub-agent prompts:
- Project-specific critical rules (e.g., "all frontend in apps/web, never apps/admin")
- Auth patterns (requireAuth, requireRole, etc.)
- Data approach (mock data vs live)
- File structure conventions
- Any dependencies between stories
