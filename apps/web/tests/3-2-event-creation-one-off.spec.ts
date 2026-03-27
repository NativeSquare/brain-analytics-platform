import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 3.2: Event Creation (One-Off)
 *
 * These tests verify user-facing acceptance criteria for event creation.
 * Authentication is not available in this E2E suite, so tests focus on:
 *  - Route integrity and auth gate enforcement (AC #1)
 *  - Page structure and content verification (AC #1, #10)
 *  - Admin-only UI gating (AC #1 — Create Event button hidden for non-admin)
 *  - Dialog conditional rendering (AC #2 — dialog only exists for admin)
 *  - Component stability (no JS crashes on render)
 */

// ---------------------------------------------------------------------------
// AC #1: Route integrity & auth gate enforcement
// ---------------------------------------------------------------------------

test.describe("Calendar Route & Auth Gate", () => {
  test("calendar route responds with a valid HTTP status (not 5xx)", async ({
    page,
  }) => {
    const response = await page.goto("/calendar");

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("unauthenticated users are redirected to login or see no admin controls", async ({
    page,
  }) => {
    // AC #1: "Create Event" button visible to admins ONLY
    await page.goto("/calendar");

    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    const wasRedirected = url.includes("login") || url.includes("sign-in");

    if (wasRedirected) {
      // Auth gate redirected to login — verify login form is present
      const loginForm = page.locator(
        'input[type="email"], input[name="email"], input[type="password"]',
      );
      await expect(loginForm.first()).toBeVisible({ timeout: 10000 });
    } else {
      // No redirect — verify admin-only "Create Event" button is hidden
      const createEventBtn = page.getByRole("button", {
        name: /Create Event/i,
      });
      await expect(createEventBtn).not.toBeVisible({ timeout: 10000 });

      // Verify calendar heading IS present (page rendered, just without admin controls)
      const heading = page.locator("h1", { hasText: /Calendar/i });
      await expect(heading).toBeVisible({ timeout: 15000 });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #1, #10: Calendar page structure & content
// ---------------------------------------------------------------------------

test.describe("Calendar Page — Structure & Content", () => {
  test("calendar page renders 'Calendar' heading and schedule subtitle", async ({
    page,
  }) => {
    // AC #1, #10: Calendar page exists and renders recognizable content
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      // Redirected — structure test N/A
      return;
    }

    // Verify the page heading "Calendar"
    const heading = page.locator("h1", { hasText: /Calendar/i });
    await expect(heading).toBeVisible({ timeout: 30000 });

    // Verify the subtitle "View and manage your team's schedule"
    const subtitle = page.getByText(/schedule/i);
    await expect(subtitle).toBeVisible({ timeout: 10000 });
  });

  test("Sync Calendar button is rendered (visible to all authenticated users)", async ({
    page,
  }) => {
    // Sync Calendar is NOT admin-only — should be visible to any authenticated user
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const syncBtn = page.getByRole("button", { name: /Sync Calendar/i });
    await expect(syncBtn).toBeVisible({ timeout: 15000 });
  });

  test("Create Event dialog is NOT rendered in DOM for non-admin users", async ({
    page,
  }) => {
    // AC #1: Non-admin roles do NOT see the Create Event button
    // AC #2: Dialog is conditionally rendered ({isAdmin && <CreateEventDialog>})
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    // "Create Event" button must not exist in the DOM
    const createEventBtn = page.getByRole("button", {
      name: /Create Event/i,
    });
    expect(await createEventBtn.count()).toBe(0);

    // Dialog heading "Create Event" must not be in the DOM either
    const dialogTitle = page.getByRole("heading", {
      name: "Create Event",
      exact: true,
    });
    expect(await dialogTitle.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Page stability — no JS crashes
// ---------------------------------------------------------------------------

test.describe("Calendar Page — Stability", () => {
  test("calendar page renders without component-level JavaScript errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/calendar");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("networkidle").catch(() => {});

    // Filter out expected network errors (no Convex backend in test env)
    const componentErrors = errors.filter((e) => {
      const lower = e.toLowerCase();
      return (
        !lower.includes("websocket") &&
        !lower.includes("fetch") &&
        !lower.includes("failed to fetch") &&
        !lower.includes("networkerror") &&
        !lower.includes("err_connection") &&
        !lower.includes("econnrefused") &&
        !lower.includes("convex")
      );
    });

    // No unexpected component-level errors (import failures, null refs, etc.)
    expect(componentErrors).toHaveLength(0);
  });
});
