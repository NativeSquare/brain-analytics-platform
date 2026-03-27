import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 5.2: Player Profile Creation & Onboarding
 *
 * Verifies route integrity, auth gating, form structure, and accept-invite
 * error states for the player creation and onboarding flows.
 *
 * Note: These tests run without a Convex backend, so we verify page structure,
 * component rendering, and error handling rather than full mutation flows.
 */

// ---------------------------------------------------------------------------
// AC #1: "Add Player" button visible only to admins on players list page
// ---------------------------------------------------------------------------

test.describe("Players List Page — Auth Gating", () => {
  test("players route responds without server error", async ({ page }) => {
    const response = await page.goto("/players");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("unauthenticated user does NOT see the Add Player button", async ({
    page,
  }) => {
    // AC #1: only admin role sees the button — unauthenticated user should not
    await page.goto("/players");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (!url.includes("login") && !url.includes("sign-in")) {
      const addPlayerLink = page.getByRole("link", { name: /Add Player/i });
      await expect(addPlayerLink).not.toBeVisible({ timeout: 5000 });
    }
  });

  test("players page renders heading 'Players'", async ({ page }) => {
    await page.goto("/players");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (!url.includes("login") && !url.includes("sign-in")) {
      const heading = page.getByRole("heading", { name: /Players/i });
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #2, #3: Add Player form structure and fields
// ---------------------------------------------------------------------------

test.describe("Add Player Page — Form Structure", () => {
  test("add player route responds without server error", async ({ page }) => {
    const response = await page.goto("/players/new");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("page displays 'Add Player' heading", async ({ page }) => {
    // AC #2: clicking "Add Player" opens a form page
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    const heading = page.getByRole("heading", { name: /Add Player/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("form renders 'Basic Info' section with first name and last name fields", async ({
    page,
  }) => {
    // AC #2: Basic Info section with required fields
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    // Section heading
    const basicInfo = page.getByRole("heading", { name: /Basic Info/i });
    await expect(basicInfo).toBeVisible({ timeout: 10000 });

    // First name and last name inputs
    const firstName = page.locator("#firstName");
    await expect(firstName).toBeVisible({ timeout: 5000 });

    const lastName = page.locator("#lastName");
    await expect(lastName).toBeVisible();
  });

  test("form renders 'Football Details' section with position select", async ({
    page,
  }) => {
    // AC #2: Football Details section with position select
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    const footballDetails = page.getByRole("heading", {
      name: /Football Details/i,
    });
    await expect(footballDetails).toBeVisible({ timeout: 10000 });

    // Position label with required indicator
    const positionLabel = page.getByText("Position").first();
    await expect(positionLabel).toBeVisible();
  });

  test("form renders 'Physical' section with height and weight fields", async ({
    page,
  }) => {
    // AC #2: Physical section
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    const physical = page.getByRole("heading", { name: /Physical/i });
    await expect(physical).toBeVisible({ timeout: 10000 });

    const heightField = page.locator("#heightCm");
    await expect(heightField).toBeVisible();

    const weightField = page.locator("#weightKg");
    await expect(weightField).toBeVisible();
  });

  test("form renders 'Contact' section with email and phone fields", async ({
    page,
  }) => {
    // AC #2: Contact section
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    const contact = page.getByRole("heading", { name: /^Contact$/i });
    await expect(contact).toBeVisible({ timeout: 10000 });

    const personalEmail = page.locator("#personalEmail");
    await expect(personalEmail).toBeVisible();

    const phone = page.locator("#phone");
    await expect(phone).toBeVisible();
  });

  test("form renders 'Emergency Contact' section", async ({ page }) => {
    // AC #2: Emergency Contact section
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    const emergencyContact = page.getByRole("heading", {
      name: /Emergency Contact/i,
    });
    await expect(emergencyContact).toBeVisible({ timeout: 10000 });

    const emergencyName = page.locator("#emergencyContactName");
    await expect(emergencyName).toBeVisible();
  });

  test("form has Cancel and Create Player buttons", async ({ page }) => {
    // AC #2: Form footer with Cancel and submit buttons
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) return;

    // Wait for form to render
    const basicInfo = page.getByRole("heading", { name: /Basic Info/i });
    await expect(basicInfo).toBeVisible({ timeout: 10000 });

    const cancelBtn = page.getByRole("button", { name: /Cancel/i });
    await expect(cancelBtn).toBeVisible();

    const createBtn = page.getByRole("button", { name: /Create Player/i });
    await expect(createBtn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC #11: Player accept-invite page — error states
// ---------------------------------------------------------------------------

test.describe("Player Accept Invite — Error States", () => {
  test("type=player with invalid token shows 'Invalid Invitation' heading", async ({
    page,
  }) => {
    // AC #11: invalid token displays error message
    await page.goto(
      "/accept-invite?token=nonexistent_player_token&type=player",
    );

    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("type=player with invalid token shows 'Go to Login' button", async ({
    page,
  }) => {
    // AC #11: error state provides navigation to login
    await page.goto(
      "/accept-invite?token=bad_player_token_xyz&type=player",
    );

    const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
    await expect(goToLoginBtn).toBeVisible({ timeout: 15000 });
    await expect(goToLoginBtn).toBeEnabled();
  });

  test("accept-invite without token shows 'Invalid Invitation' error", async ({
    page,
  }) => {
    // AC #11: missing token handled gracefully
    await page.goto("/accept-invite?type=player");

    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// Stability: no component-level JS errors across player pages
// ---------------------------------------------------------------------------

test.describe("Page Stability", () => {
  test("players and add-player pages render without JS component errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const r1 = await page.goto("/players");
    expect(r1).not.toBeNull();
    expect(r1!.status()).toBeLessThan(500);
    await page.waitForLoadState("domcontentloaded");

    const r2 = await page.goto("/players/new");
    expect(r2).not.toBeNull();
    expect(r2!.status()).toBeLessThan(500);
    await page.waitForLoadState("domcontentloaded");

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

    expect(componentErrors).toHaveLength(0);
  });
});
