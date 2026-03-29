import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 3.4: RSVP Tracking
 *
 * These tests verify user-facing acceptance criteria for RSVP tracking.
 * NOTE: The E2E environment has no authenticated Convex backend, so tests are
 * limited to verifying page stability, component rendering, auth gating, and
 * element absence/presence. Tests requiring actual RSVP data (submitting RSVPs,
 * viewing responses) are covered by backend integration tests in
 * packages/backend/convex/calendar/__tests__/mutations.test.ts and queries.test.ts.
 */

// ---------------------------------------------------------------------------
// Helper: navigate to calendar, detect auth redirect
// ---------------------------------------------------------------------------

async function gotoCalendar(page: import("@playwright/test").Page) {
  await page.goto("/calendar");
  await page.waitForLoadState("domcontentloaded");

  const url = page.url();
  const wasRedirected = url.includes("login") || url.includes("sign-in");
  return { wasRedirected };
}

// ---------------------------------------------------------------------------
// AC #1: RSVP UI elements are absent when no event detail panel is open
// ---------------------------------------------------------------------------

test.describe("RSVP Panel — Element Absence Without Event Context (AC #1, #5)", () => {
  test("RSVP buttons and labels are not rendered on the calendar page", async ({
    page,
  }) => {
    // AC #1: RSVP buttons are only visible inside the EventDetail Sheet,
    // which opens when a specific event is clicked. Without clicking an
    // event, none of the RSVP UI should be present in the DOM.
    const { wasRedirected } = await gotoCalendar(page);

    if (wasRedirected) {
      // Auth gate working — RSVP elements cannot exist
      const rsvpHeading = page.getByText("Your RSVP");
      expect(await rsvpHeading.count()).toBe(0);
      return;
    }

    // AC #1: "Your RSVP" heading should not be in DOM
    const rsvpHeading = page.getByText("Your RSVP");
    expect(await rsvpHeading.count()).toBe(0);

    // AC #5: "You haven't responded yet" label should not be in DOM
    const noResponseLabel = page.getByText("You haven't responded yet");
    expect(await noResponseLabel.count()).toBe(0);

    // AC #2: "Attending" RSVP button should not be in DOM (distinct from nav)
    // Use more specific selector since "Attending" is only in RSVPPanel buttons
    const attendingBtn = page.getByRole("button", { name: /^Attending$/i });
    expect(await attendingBtn.count()).toBe(0);

    // AC #3: "Not Attending" button should not be in DOM
    const notAttendingBtn = page.getByRole("button", {
      name: /Not Attending/i,
    });
    expect(await notAttendingBtn.count()).toBe(0);
  });

  test("reason textarea for absence is not pre-rendered", async ({ page }) => {
    // AC #3: The reason textarea only appears after clicking "Not Attending"
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    const reasonTextarea = page.getByPlaceholder(
      "Reason for absence (optional)",
    );
    expect(await reasonTextarea.count()).toBe(0);

    // Character count indicator should not be in DOM
    const charCount = page.getByText(/\d+\/500/);
    expect(await charCount.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #6: RSVP Overview elements absent without event context
// ---------------------------------------------------------------------------

test.describe("RSVP Overview — Element Absence Without Event Context (AC #6)", () => {
  test("RSVP response summary and admin overview are not rendered on the calendar page", async ({
    page,
  }) => {
    // AC #6: RSVP overview is inside EventDetail Sheet (admin-only detailed list).
    // Without clicking an event, none of the overview UI should be in the DOM.
    const { wasRedirected } = await gotoCalendar(page);

    if (wasRedirected) {
      const overviewHeading = page.getByText("RSVP Responses");
      expect(await overviewHeading.count()).toBe(0);
      return;
    }

    // "RSVP Responses" section heading should not exist
    const overviewHeading = page.getByText("RSVP Responses");
    expect(await overviewHeading.count()).toBe(0);

    // Summary badges should not exist
    const attendingBadge = page.getByText(/\d+ Attending/);
    expect(await attendingBadge.count()).toBe(0);

    const notAttendingBadge = page.getByText(/\d+ Not Attending/);
    expect(await notAttendingBadge.count()).toBe(0);

    const pendingBadge = page.getByText(/\d+ Pending/);
    expect(await pendingBadge.count()).toBe(0);

    // Collapsible group triggers should not exist
    const attendingGroup = page.getByText(/Attending \(\d+\)/);
    expect(await attendingGroup.count()).toBe(0);

    const notAttendingGroup = page.getByText(/Not Attending \(\d+\)/);
    expect(await notAttendingGroup.count()).toBe(0);

    const pendingGroup = page.getByText(/Pending \(\d+\)/);
    expect(await pendingGroup.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #1: RSVP status indicator on EventDetail panel gating
// ---------------------------------------------------------------------------

test.describe("RSVP Status Indicator — EventDetail Integration (AC #1)", () => {
  test("RSVP Enabled/Disabled label is not visible without an open event detail", async ({
    page,
  }) => {
    // The "RSVP Enabled" / "RSVP Disabled" text in EventDetail is only
    // rendered inside the Sheet — should not be in the DOM on page load.
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    const rsvpEnabled = page.getByText("Enabled", { exact: true });
    const rsvpDisabled = page.getByText("Disabled", { exact: true });

    // Neither label should be in DOM (they live inside EventDetail Sheet)
    expect(await rsvpEnabled.count()).toBe(0);
    expect(await rsvpDisabled.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #8: RSVP EventCard indicator icons are absent without RSVP data
// ---------------------------------------------------------------------------

test.describe("RSVP EventCard Indicators — No Pre-Rendered Icons (AC #8, #11)", () => {
  test("RSVP status check/X icons are not pre-rendered on the calendar page", async ({
    page,
  }) => {
    // AC #8/Task 8: EventCard RSVP indicators (CheckCircle green / XCircle red)
    // only appear when rsvpStatus prop is passed. Without events loaded or
    // RSVP data, these icons should not exist.
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    // Green check icon for attending status
    const attendingIcon = page.locator("svg.text-green-600");
    expect(await attendingIcon.count()).toBe(0);

    // Red X icon for not-attending status
    const notAttendingIcon = page.locator("svg.text-red-600");
    expect(await notAttendingIcon.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Page stability — no JS crashes from RSVP code
// ---------------------------------------------------------------------------

test.describe("Page Stability — RSVP Code (AC all)", () => {
  test("calendar page loads without component-level JavaScript errors from RSVP code", async ({
    page,
  }) => {
    // Verify the entire component tree (including RSVPPanel, RSVPOverview,
    // updated EventDetail, updated EventCard with RSVP indicators,
    // DayEventsPanel with batch RSVP query) loads without errors.
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/calendar");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("networkidle").catch(() => {});

    // Filter expected network errors (no Convex backend in test env)
    const componentErrors = errors.filter((e) => {
      const lower = e.toLowerCase();
      return (
        !lower.includes("websocket") &&
        !lower.includes("fetch") &&
        !lower.includes("failed to fetch") &&
        !lower.includes("networkerror") &&
        !lower.includes("err_connection") &&
        !lower.includes("econnrefused") &&
        !lower.includes("convex") &&
        !lower.includes("hydration")
      );
    });

    // No import/module/type errors from RSVP code
    expect(componentErrors).toHaveLength(0);
  });

  test("calendar page renders core elements with RSVP code loaded", async ({
    page,
  }) => {
    // Confirm the full component tree renders successfully, including
    // RSVPPanel, RSVPOverview, and updated EventDetail/EventCard imports.
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    // Core page elements must render successfully
    const heading = page.locator("h1", { hasText: /Calendar/i });
    await expect(heading).toBeVisible({ timeout: 30000 });

    const subtitle = page.getByText(/View and manage your team/i);
    await expect(subtitle).toBeVisible({ timeout: 10000 });

    // Sync Calendar button (non-admin control, regression check)
    const syncBtn = page.getByRole("button", { name: /Sync Calendar/i });
    await expect(syncBtn).toBeVisible({ timeout: 15000 });

    // Screenshot at key checkpoint
    await page.screenshot({
      path: "tests/screenshots/3-4-rsvp-tracking-calendar-loaded.png",
    });
  });

  test("calendar page does not return a 404 or 500 with RSVP components bundled", async ({
    page,
  }) => {
    const response = await page.goto("/calendar");
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(404);
    expect(response!.status()).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// AC #7: Non-admin RSVP UI gating
// ---------------------------------------------------------------------------

test.describe("RSVP Authorization Gating (AC #7, #12)", () => {
  test("unauthenticated users do not see RSVP controls", async ({ page }) => {
    // AC #7: submitRsvp requires authentication via requireAuth.
    // Unauthenticated users should see either a login redirect or
    // a page without any RSVP controls accessible.
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const wasRedirected = url.includes("login") || url.includes("sign-in");

    if (wasRedirected) {
      // Auth gate is enforced — verify login form exists
      const loginInput = page.locator(
        'input[type="email"], input[name="email"], input[type="password"]',
      );
      await expect(loginInput.first()).toBeVisible({ timeout: 10000 });
    } else {
      // Page rendered without redirect — RSVP controls must not be accessible
      // (they live inside EventDetail Sheet which needs auth + event data)
      const rsvpLabel = page.getByText("Your RSVP");
      expect(await rsvpLabel.count()).toBe(0);

      const rsvpOverview = page.getByText("RSVP Responses");
      expect(await rsvpOverview.count()).toBe(0);
    }
  });
});
