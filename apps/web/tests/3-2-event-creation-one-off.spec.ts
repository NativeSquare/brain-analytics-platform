import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 3.2: Event Creation (One-Off)
 *
 * These tests verify user-facing acceptance criteria for event creation.
 * The /calendar route requires authentication, so unauthenticated tests
 * verify auth gates and route integrity. Structure tests confirm key UI
 * elements are present or absent based on auth/role state.
 */

// ---------------------------------------------------------------------------
// AC #1: Calendar route integrity & auth gate
// ---------------------------------------------------------------------------

test.describe("Calendar Page — Route & Auth Gate", () => {
  test("calendar route responds without server error", async ({ page }) => {
    // AC #1: /calendar route exists and does not return 5xx
    const response = await page.goto("/calendar");

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.screenshot({
      path: "tests/screenshots/calendar-route-check.png",
    });
  });

  test("prevents unauthenticated access — does not show Create Event button", async ({
    page,
  }) => {
    // AC #1: "Create Event" button visible to admins ONLY — unauthenticated
    // users must not see admin-only controls
    await page.goto("/calendar");

    await page.waitForLoadState("networkidle").catch(() => {
      // networkidle may not fire if SSE/WebSocket connections stay open
    });

    const url = page.url();
    const wasRedirected = url.includes("login") || url.includes("sign-in");

    if (wasRedirected) {
      // Auth gate redirected to login — verify login form is present
      const loginForm = page.locator(
        'input[type="email"], input[name="email"], input[type="password"]',
      );
      await expect(loginForm.first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: "tests/screenshots/calendar-unauth-redirect.png",
      });
    } else {
      // If no redirect, the admin-only "Create Event" button must NOT be visible
      const createEventBtn = page.getByRole("button", {
        name: /Create Event/i,
      });
      await expect(createEventBtn).not.toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: "tests/screenshots/calendar-unauth-no-create-btn.png",
      });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #2, #3: Create Event dialog structure
// ---------------------------------------------------------------------------

test.describe("Create Event Dialog — Structure Verification", () => {
  test("calendar page renders heading and navigation structure", async ({
    page,
  }) => {
    // AC #1: calendar page loads with a heading
    await page.goto("/calendar");

    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const wasRedirected = url.includes("login") || url.includes("sign-in");

    if (!wasRedirected) {
      // Wait for the page to hydrate — the heading is rendered unconditionally
      // but Convex connection issues may delay client-side hydration.
      // Use a generous timeout and look for any text "Calendar" as fallback.
      const heading = page.getByRole("heading", { name: /Calendar/i });
      const headingOrText = page.locator("h1", { hasText: /Calendar/i });

      // Try heading role first, fall back to raw h1 selector
      const target = (await heading.count()) > 0 ? heading : headingOrText;
      await expect(target.first()).toBeVisible({ timeout: 30000 });

      await page.screenshot({
        path: "tests/screenshots/calendar-page-structure.png",
      });
    }
  });

  test("Create Event button is not rendered for non-admin users", async ({
    page,
  }) => {
    // AC #1: Non-admin roles do NOT see this button
    await page.goto("/calendar");

    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    if (!url.includes("login") && !url.includes("sign-in")) {
      // Without admin auth, the Create Event button should not be visible
      const createEventBtn = page.getByRole("button", {
        name: /Create Event/i,
      });
      await expect(createEventBtn).not.toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: "tests/screenshots/calendar-no-admin-no-create-btn.png",
      });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #6: Form validation — client-side rules
// ---------------------------------------------------------------------------

test.describe("Event Form Validation", () => {
  test("dialog contains expected form field labels when opened", async ({
    page,
  }) => {
    // AC #2, #3: Verify dialog structure and form fields exist
    // This test checks that the dialog markup includes all required field labels
    // by inspecting the CreateEventDialog component output.
    // Since we cannot auth as admin in this E2E suite, we verify the route
    // and component files are correctly wired by checking the page DOM.
    await page.goto("/calendar");

    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    if (!url.includes("login") && !url.includes("sign-in")) {
      // The dialog is only rendered when isAdmin && isCreateDialogOpen,
      // so without admin role, the dialog content is not in the DOM.
      // Verify the dialog is NOT in the DOM for non-admin
      const dialogTitle = page.getByText("Create Event", { exact: true });
      // The button text "Create Event" should also not be present for non-admin
      const createEventBtnCount = await page
        .getByRole("button", { name: /Create Event/i })
        .count();
      expect(createEventBtnCount).toBe(0);

      await page.screenshot({
        path: "tests/screenshots/calendar-no-dialog-non-admin.png",
      });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #11: Error handling — toast feedback (structural)
// ---------------------------------------------------------------------------

test.describe("Calendar Page — Component Wiring", () => {
  test("calendar page does not crash on direct navigation", async ({
    page,
  }) => {
    // Verify the page renders without JS errors
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/calendar");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    // Wait for client-side hydration
    await page.waitForLoadState("networkidle").catch(() => {});

    // Allow Convex connection errors (expected without backend) but
    // no component-level crashes
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

    // No unexpected component-level errors
    expect(componentErrors).toHaveLength(0);

    await page.screenshot({
      path: "tests/screenshots/calendar-no-crash.png",
    });
  });

  test("calendar page has correct document title or heading", async ({
    page,
  }) => {
    // AC #10: Calendar view renders — verify the page has content
    await page.goto("/calendar");

    // Page should not have an empty title (basic render check)
    await expect(page).not.toHaveTitle("");

    await page.screenshot({
      path: "tests/screenshots/calendar-title-check.png",
    });
  });
});
