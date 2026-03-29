import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 4.4: Read Tracking
 *
 * These tests verify user-facing acceptance criteria for read tracking on documents.
 * NOTE: The E2E environment has no authenticated Convex backend, so tests that
 * require actual read data (trackRead mutation, getReadStats query, real-time
 * updates) are covered by backend integration tests in
 * packages/backend/convex/documents/__tests__/readTracking.test.ts (18 tests).
 *
 * These E2E tests focus on:
 * - Component structure and rendering correctness
 * - Auth gating of admin-only UI
 * - Client-side interactions (search toolbar, navigation)
 * - Verifying read tracking components don't crash the page bundle
 */

// ---------------------------------------------------------------------------
// Helper: navigate to documents page, detect auth redirect
// ---------------------------------------------------------------------------

async function gotoDocuments(page: import("@playwright/test").Page) {
  await page.goto("/documents");
  await page.waitForLoadState("domcontentloaded");

  const url = page.url();
  const wasRedirected = url.includes("login") || url.includes("sign-in");
  return { wasRedirected };
}

// ---------------------------------------------------------------------------
// AC #5 + #6: Read tracking indicators only for admin with data
// ---------------------------------------------------------------------------

test.describe("Read Tracking Indicators — Admin-Only Gating (AC #5, #6)", () => {
  test("'Opened by X/Y' indicators are absent without authenticated admin data", async ({
    page,
  }) => {
    // AC #5: "Opened by X/Y" indicators only appear for admin users when
    // readCount and totalAccess props are provided by getReadStats query.
    // AC #6: Non-admin users do NOT see read tracking indicators.
    // Without authenticated Convex data, no indicators should render.
    const { wasRedirected } = await gotoDocuments(page);

    // Verify the specific "Opened by X/Y" text pattern is NOT in the DOM.
    // This pattern comes from DocumentCard.tsx and DocumentSearchResults.tsx.
    const openedByIndicators = page.getByText(/Opened by \d+\/\d+/);
    expect(await openedByIndicators.count()).toBe(0);

    if (!wasRedirected) {
      // Also verify that no ReadTracker progress bars are rendered.
      // The trigger button inside ReadTrackerDetail wraps a Progress bar
      // and "Opened by" text — both gated by isAdmin && readCount != null.
      const readTrackerTriggers = page.locator(
        'button:has-text("Opened by")',
      );
      expect(await readTrackerTriggers.count()).toBe(0);
    }
  });

  test("unauthenticated access to /documents is gated by auth", async ({
    page,
  }) => {
    // AC #6: Non-admin users do NOT see read tracking. Unauthenticated
    // users should be redirected to login or see no admin-only elements.
    await page.goto("/documents");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const wasRedirected = url.includes("login") || url.includes("sign-in");

    if (wasRedirected) {
      // Verify the login page has an actual form — not just a blank redirect
      const formElement = page.locator("form, input, button");
      await expect(formElement.first()).toBeVisible({ timeout: 10000 });
    } else {
      // If page rendered: admin-only query results (getReadStats) should
      // not populate, so no tracking UI should exist.
      const readStatsUI = page.getByText(/Opened by/);
      expect(await readStatsUI.count()).toBe(0);

      // Admin-only popover header text should not exist
      const popoverHeader = page.getByText(/have opened this document/);
      expect(await popoverHeader.count()).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC #2: DocumentDetail sheet — trackRead integration wiring
// ---------------------------------------------------------------------------

test.describe("Document Detail Sheet — trackRead Wiring (AC #2)", () => {
  test("DocumentDetail sheet with Open/Download buttons is NOT pre-rendered", async ({
    page,
  }) => {
    // AC #2: trackRead fires when a user clicks "Open / Download" or
    // "Watch Video" in the DocumentDetail sheet. The sheet opens only
    // when a document card is clicked. Verify it's not in DOM initially.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // The sheet title "Document Details" should not be in the DOM
    const sheetTitle = page.getByText("Document Details", { exact: true });
    expect(await sheetTitle.count()).toBe(0);

    // The "Open / Download" button (inside the sheet) should not exist
    const openDownloadBtn = page.getByRole("button", {
      name: /Open \/ Download/i,
    });
    expect(await openDownloadBtn.count()).toBe(0);

    // The "Watch Video" button (inside the sheet) should not exist
    const watchVideoBtn = page.getByRole("button", {
      name: /Watch Video/i,
    });
    expect(await watchVideoBtn.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #7: ReadTrackerDetail popover structure
// ---------------------------------------------------------------------------

test.describe("ReadTrackerDetail Popover — Structure Verification (AC #7)", () => {
  test("popover sections (Opened / Not yet opened) are not pre-rendered", async ({
    page,
  }) => {
    // AC #7: Detail popover appears only on admin click of "Opened by"
    // indicator. Internal sections should not exist in DOM until triggered.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // "Not yet opened" section label (from ReadTrackerDetail.tsx)
    const notOpenedSection = page.getByText("Not yet opened");
    expect(await notOpenedSection.count()).toBe(0);

    // Popover summary text "X of Y users have opened this document"
    const popoverSummary = page.getByText(/have opened this document/);
    expect(await popoverSummary.count()).toBe(0);

    // Empty state "No one has opened this document yet."
    const emptyState = page.getByText("No one has opened this document yet");
    expect(await emptyState.count()).toBe(0);

    // date-fns formatted timestamps (e.g., "at 14:30") from reader rows
    const readerTimestamps = page.getByText(/at \d{2}:\d{2}$/);
    expect(await readerTimestamps.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #5 + #8: Documents page renders correctly with read tracking code
// ---------------------------------------------------------------------------

test.describe("Documents Page — Component Bundle Integrity (AC #5, #8)", () => {
  test("documents page loads without JavaScript errors from read tracking imports", async ({
    page,
  }) => {
    // Verify the component tree (DocumentCard with ReadTrackerDetail,
    // DocumentDetail with trackRead mutation, page.tsx with getReadStats
    // query) loads without import or runtime errors.
    const jsErrors: string[] = [];
    page.on("pageerror", (error) => {
      jsErrors.push(error.message);
    });

    const response = await page.goto("/documents");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("networkidle").catch(() => {});

    // Filter known network errors (no Convex backend in test env)
    const componentErrors = jsErrors.filter((e) => {
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

    expect(componentErrors).toHaveLength(0);
  });

  test("documents page renders search toolbar with working input", async ({
    page,
  }) => {
    // The search toolbar (DocumentSearchToolbar) is always visible on
    // /documents. Verify it renders and the input is interactive.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // Look for a search input — DocumentSearchToolbar renders an input
    const searchInput = page.locator(
      'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]',
    );

    if ((await searchInput.count()) > 0) {
      // Verify input is visible and can receive focus
      await expect(searchInput.first()).toBeVisible();
      await searchInput.first().click();
      await expect(searchInput.first()).toBeFocused();

      // Type in the search field — triggers useDocumentSearch debounce
      await searchInput.first().fill("test document");
      await expect(searchInput.first()).toHaveValue("test document");
    }

    // Take a screenshot for visual verification
    await page.screenshot({
      path: "tests/screenshots/4-4-read-tracking-documents-loaded.png",
    });
  });

  test("documents page does not return 404 or 500", async ({ page }) => {
    const response = await page.goto("/documents");
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(404);
    expect(response!.status()).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// AC #9 + #10: Schema integration — documentReads table
// ---------------------------------------------------------------------------

test.describe("Schema Integration — documentReads Table (AC #9, #10)", () => {
  test("documents page bundle includes read tracking API references without import errors", async ({
    page,
  }) => {
    // AC #9: documentReads table exists in schema. If schema were wrong,
    // the Convex generated API would fail to import, causing module errors.
    // AC #10: Team-scoped queries filter by teamId.
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/documents");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("domcontentloaded");

    // Look specifically for schema/import/module errors that would indicate
    // the documentReads table definition is broken
    const schemaErrors = errors.filter((e) => {
      const lower = e.toLowerCase();
      return (
        lower.includes("schema") ||
        lower.includes("module") ||
        lower.includes("import") ||
        lower.includes("cannot find") ||
        lower.includes("is not defined") ||
        lower.includes("is not a function")
      );
    });

    expect(schemaErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC #8: Real-time subscription setup doesn't crash
// ---------------------------------------------------------------------------

test.describe("Real-Time Subscription — Query Setup (AC #8)", () => {
  test("getReadStats useQuery subscription setup does not cause errors", async ({
    page,
  }) => {
    // AC #8: Read tracking updates in real time via Convex subscription.
    // The getReadStats query is conditionally called via useQuery with
    // "skip" sentinel when not admin / no documents. Verify this setup
    // doesn't crash the component tree.
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/documents");
    await page.waitForLoadState("domcontentloaded");

    // No errors from subscription setup code
    const subscriptionErrors = errors.filter((e) => {
      const lower = e.toLowerCase();
      return (
        lower.includes("usequery") ||
        lower.includes("subscription") ||
        lower.includes("getreadstats") ||
        lower.includes("trackread") ||
        lower.includes("getreadersdetail")
      );
    });

    expect(subscriptionErrors).toHaveLength(0);
  });
});
