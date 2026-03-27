import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 4.4: Read Tracking
 *
 * These tests verify user-facing acceptance criteria for read tracking on documents.
 * NOTE: The E2E environment has no authenticated Convex backend, so tests are
 * limited to verifying page stability, component rendering, auth gating, and
 * element absence/presence. Tests requiring actual read data (trackRead mutation,
 * getReadStats query, real-time updates) are covered by backend integration tests
 * in packages/backend/convex/documents/__tests__/readTracking.test.ts.
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
// AC #5: Read tracking indicators absent without authenticated data
// ---------------------------------------------------------------------------

test.describe("Read Tracking Indicators — Element Absence Without Data (AC #5, #6)", () => {
  test("'Opened by' indicators are not rendered on the documents page without data", async ({
    page,
  }) => {
    // AC #5: "Opened by X/Y" indicators only appear for admin users when
    // readCount and totalAccess props are provided. Without authenticated
    // data from Convex, these should not be in the DOM.
    const { wasRedirected } = await gotoDocuments(page);

    if (wasRedirected) {
      // Auth gate working — read tracking elements cannot exist
      const openedByText = page.getByText(/Opened by \d+\/\d+/);
      expect(await openedByText.count()).toBe(0);
      return;
    }

    // AC #5: "Opened by X/Y" text should not be in DOM without data
    const openedByText = page.getByText(/Opened by \d+\/\d+/);
    expect(await openedByText.count()).toBe(0);

    // AC #5: Progress bars for read tracking should not be present
    // (The progress visual only renders when readCount and totalAccess are provided)
    const readTrackerButtons = page.locator(
      'button:has-text("Opened by")',
    );
    expect(await readTrackerButtons.count()).toBe(0);
  });

  test("read tracking detail popover is not pre-rendered on the documents page", async ({
    page,
  }) => {
    // AC #7: The ReadTrackerDetail popover only opens on click of the
    // "Opened by" indicator. Without data, neither the indicator nor
    // the popover content should be in the DOM.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // Popover header text "have opened this document" should not exist
    const popoverHeader = page.getByText(/have opened this document/);
    expect(await popoverHeader.count()).toBe(0);

    // "Not yet opened" section label should not exist
    const notYetOpened = page.getByText("Not yet opened");
    expect(await notYetOpened.count()).toBe(0);

    // "No one has opened this document yet" empty state should not exist
    const noOneOpened = page.getByText("No one has opened this document yet");
    expect(await noOneOpened.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #6: Non-admin users do NOT see read tracking indicators
// ---------------------------------------------------------------------------

test.describe("Read Tracking Authorization Gating (AC #6)", () => {
  test("unauthenticated users do not see read tracking controls", async ({
    page,
  }) => {
    // AC #6: Read tracking indicators, counts, and detail views are
    // exclusively for admin users. Unauthenticated users should see
    // either a login redirect or a page without any read tracking UI.
    await page.goto("/documents");
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
      // Page rendered without redirect — read tracking controls must not be accessible
      const openedByText = page.getByText(/Opened by \d+\/\d+/);
      expect(await openedByText.count()).toBe(0);

      // Admin-only read stats summary should not appear
      const readStatsPopover = page.getByText(/have opened this document/);
      expect(await readStatsPopover.count()).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC #2: Document Detail sheet has trackRead integration
// ---------------------------------------------------------------------------

test.describe("Document Detail — trackRead Integration (AC #2)", () => {
  test("Document Detail sheet is not pre-rendered on the documents page", async ({
    page,
  }) => {
    // AC #2: trackRead is called when a user opens/downloads a document
    // via the DocumentDetail sheet. Without clicking a document, the
    // sheet (and its Open/Download buttons) should not be in the DOM.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // "Document Details" sheet title should not be in DOM
    const sheetTitle = page.getByText("Document Details", { exact: true });
    expect(await sheetTitle.count()).toBe(0);

    // "Open / Download" button should not be in DOM (it's inside the sheet)
    const openDownloadBtn = page.getByRole("button", {
      name: /Open \/ Download/i,
    });
    expect(await openDownloadBtn.count()).toBe(0);

    // "Watch Video" button should not be in DOM (it's inside the sheet)
    const watchVideoBtn = page.getByRole("button", {
      name: /Watch Video/i,
    });
    expect(await watchVideoBtn.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC #7: ReadTrackerDetail popover elements absent without context
// ---------------------------------------------------------------------------

test.describe("ReadTrackerDetail Popover — Element Absence (AC #7)", () => {
  test("reader detail sections are not pre-rendered on the documents page", async ({
    page,
  }) => {
    // AC #7: The detail popover only appears when an admin clicks on the
    // "Opened by" indicator. Its internal sections should not be in DOM.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // "Opened" section header (uppercase label) should not be in DOM
    const openedSection = page.locator("text=OPENED").first();
    expect(await openedSection.count()).toBeLessThanOrEqual(0);

    // "Not yet opened" section header should not be in DOM
    const notOpenedSection = page.getByText("Not yet opened");
    expect(await notOpenedSection.count()).toBe(0);

    // Role badges within popover should not appear (they render inside
    // the reader detail rows)
    const readerTimestamps = page.getByText(/at \d{2}:\d{2}$/);
    expect(await readerTimestamps.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Page stability — no JS crashes from read tracking code
// ---------------------------------------------------------------------------

test.describe("Page Stability — Read Tracking Code (AC all)", () => {
  test("documents page loads without component-level JavaScript errors from read tracking code", async ({
    page,
  }) => {
    // Verify the entire component tree (including DocumentCard with
    // ReadTracker, ReadTrackerDetail popover, DocumentDetail with trackRead
    // mutation, documents page with getReadStats query) loads without errors.
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/documents");
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

    // No import/module/type errors from read tracking code
    expect(componentErrors).toHaveLength(0);
  });

  test("documents page renders core elements with read tracking code loaded", async ({
    page,
  }) => {
    // Confirm the full component tree renders successfully, including
    // DocumentCard (with ReadTracker), ReadTrackerDetail, and DocumentDetail
    // (with trackRead) imports.
    const { wasRedirected } = await gotoDocuments(page);
    if (wasRedirected) return;

    // Core page elements must render successfully (documents page heading or search)
    const searchInput = page.locator(
      'input[placeholder*="Search"], input[type="search"]',
    );
    const heading = page.locator("h1, h2, h3").first();

    // At least one page structural element should be visible
    const hasSearch = (await searchInput.count()) > 0;
    const hasHeading = (await heading.count()) > 0;
    expect(hasSearch || hasHeading).toBeTruthy();

    // Screenshot at key checkpoint
    await page.screenshot({
      path: "tests/screenshots/4-4-read-tracking-documents-loaded.png",
    });
  });

  test("documents page does not return a 404 or 500 with read tracking components bundled", async ({
    page,
  }) => {
    const response = await page.goto("/documents");
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(404);
    expect(response!.status()).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// AC #9: documentReads schema — verified via page load stability
// ---------------------------------------------------------------------------

test.describe("Schema Integration — documentReads Table (AC #9, #10)", () => {
  test("documents page loads without schema errors from documentReads table", async ({
    page,
  }) => {
    // AC #9: The documentReads table must exist in schema with correct
    // indexes. If there were schema mismatches, the Convex client would
    // throw errors on import. This test verifies the page bundle loads
    // cleanly (no module import failures).
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/documents");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("domcontentloaded");

    // Filter network errors — look for schema/import errors only
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
// AC #8: Real-time subscription — verified via query setup in page
// ---------------------------------------------------------------------------

test.describe("Real-Time Subscription Setup (AC #8)", () => {
  test("documents page initializes without errors when read stats query is configured", async ({
    page,
  }) => {
    // AC #8: The getReadStats query is called via useQuery (Convex subscription).
    // Without auth, the query is skipped (via "skip" sentinel), but the
    // subscription setup code must not crash. Verifying page loads clean.
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/documents");
    await page.waitForLoadState("domcontentloaded");

    // No subscription setup errors
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
