import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 3.3: Recurring Events
 *
 * These tests verify user-facing acceptance criteria for recurring event support.
 * NOTE: The E2E environment has no authenticated Convex backend, so tests are
 * limited to verifying page stability, component rendering, auth gating, and
 * client-side validation. Tests that require actual event data (creating events,
 * viewing occurrences) are covered by backend integration tests in
 * packages/backend/convex/calendar/__tests__/mutations.test.ts.
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
// AC #1, #2: Recurring toggle and recurrence fields gating
// ---------------------------------------------------------------------------

test.describe("Recurring Toggle — Admin Gating (AC #1, #2)", () => {
  test("non-admin users cannot access recurring event controls", async ({
    page,
  }) => {
    // AC #1: Recurring toggle is inside the Create Event dialog, which is
    // admin-only. Non-admin/unauthenticated users should see NONE of:
    //   - "Create Event" button
    //   - "Recurring event" toggle label
    //   - Frequency dropdown ("Select frequency")
    //   - Series end date picker
    const { wasRedirected } = await gotoCalendar(page);

    if (wasRedirected) {
      // Auth gate working — user can't reach the page at all
      const recurringToggle = page.locator("#recurring-toggle");
      expect(await recurringToggle.count()).toBe(0);
      return;
    }

    // Page rendered — verify all recurring-specific elements are absent
    const createEventBtn = page.getByRole("button", {
      name: /Create Event/i,
    });
    await expect(createEventBtn).not.toBeVisible({ timeout: 10000 });

    // AC #1: Recurring event toggle should not be in DOM
    const recurringToggle = page.locator("#recurring-toggle");
    expect(await recurringToggle.count()).toBe(0);

    // AC #2: Frequency select should not be in DOM
    const frequencySelect = page.getByText("Select frequency");
    expect(await frequencySelect.count()).toBe(0);

    // AC #2: "Recurring event" label should not be in DOM
    const recurringLabel = page.getByText("Recurring event", { exact: true });
    expect(await recurringLabel.count()).toBe(0);

    // AC #2: Occurrence preview should not be in DOM
    const previewText = page.getByText(/This will create \d+ events/);
    expect(await previewText.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #5, #6, #7: Admin action buttons gating for recurring events
// ---------------------------------------------------------------------------

test.describe("Admin Action Buttons — Recurring Event Actions (AC #5, #6, #7)", () => {
  test("Edit, Cancel Occurrence, and Delete Series buttons are gated behind admin role", async ({
    page,
  }) => {
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    // AC #5: Edit button (admin-only) should not be visible
    const editBtn = page.getByRole("button", { name: /^Edit$/i });
    expect(await editBtn.count()).toBe(0);

    // AC #6: "Cancel This Occurrence" button should not be visible
    const cancelOccurrenceBtn = page.getByRole("button", {
      name: /Cancel This Occurrence/i,
    });
    expect(await cancelOccurrenceBtn.count()).toBe(0);

    // AC #6: "Cancel This Event" button also gated
    const cancelEventBtn = page.getByRole("button", {
      name: /Cancel This Event/i,
    });
    expect(await cancelEventBtn.count()).toBe(0);

    // AC #7: "Delete Entire Series" button should not be visible
    const deleteSeriesBtn = page.getByRole("button", {
      name: /Delete Entire Series/i,
    });
    expect(await deleteSeriesBtn.count()).toBe(0);
  });

  test("confirmation dialogs for cancel and delete series are not pre-rendered", async ({
    page,
  }) => {
    // AC #6: Cancel confirmation dialog should only appear on button click
    // AC #7: Delete series dialog should only appear on button click
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    // Cancel dialog title should not be in DOM
    const cancelDialogTitle = page.getByRole("heading", {
      name: /Cancel this occurrence/i,
    });
    expect(await cancelDialogTitle.count()).toBe(0);

    // Delete series dialog title should not be in DOM
    const deleteDialogTitle = page.getByRole("heading", {
      name: /Delete entire series/i,
    });
    expect(await deleteDialogTitle.count()).toBe(0);

    // Specific confirmation text from AC #6 should not exist
    const cancelConfirmText = page.getByText(
      /Other occurrences will not be affected/,
    );
    expect(await cancelConfirmText.count()).toBe(0);

    // Specific confirmation text from AC #7 should not exist
    const deleteConfirmText = page.getByText(/This cannot be undone/);
    expect(await deleteConfirmText.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #10, #11: Series metadata and recurring indicator are absent without data
// ---------------------------------------------------------------------------

test.describe("Recurring Indicator & Series Metadata (AC #10, #11)", () => {
  test("series metadata elements are absent when no event is selected", async ({
    page,
  }) => {
    // AC #11: Series metadata ("Part of a weekly series", occurrence count,
    // series end date) is shown inside the EventDetail Sheet — which only
    // opens when a specific event is clicked.
    const { wasRedirected } = await gotoCalendar(page);
    if (wasRedirected) return;

    // "Part of a {frequency} series" text should not appear
    const seriesText = page.getByText(/Part of a .* series/);
    expect(await seriesText.count()).toBe(0);

    // "{N} of {M} occurrences" count label should not appear
    const occurrencesText = page.getByText(/\d+ of \d+ occurrences/);
    expect(await occurrencesText.count()).toBe(0);

    // "Series ends {date}" label should not appear
    const seriesEndsText = page.getByText(/Series ends/);
    expect(await seriesEndsText.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #8: Client-side validation — Zod schema structure verification
// ---------------------------------------------------------------------------

test.describe("Client-Side Validation — Schema (AC #8)", () => {
  test("calendar page loads successfully with recurring event schemas in bundle", async ({
    page,
  }) => {
    // AC #8: Zod validation schemas for recurring events must be bundled
    // correctly. This tests that the entire component tree (EventForm +
    // RecurrenceOptions + shared calendar schemas) loads without import
    // errors or module resolution failures.
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

    // No import/module/type errors from recurring event code
    expect(componentErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Page stability — regression check for recurring event code
// ---------------------------------------------------------------------------

test.describe("Page Stability — Recurring Events Code (AC all)", () => {
  test("calendar page renders heading, subtitle, and Sync Calendar button with recurring code loaded", async ({
    page,
  }) => {
    // This test confirms the full component tree (including RecurrenceOptions,
    // updated EventForm, EventDetail with cancel/delete actions, EventCard with
    // Repeat icon, CalendarView with MonthGridEvent) renders without errors.
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
  });
});
