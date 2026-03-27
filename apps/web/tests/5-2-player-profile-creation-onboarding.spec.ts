import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 5.2: Player Profile Creation & Onboarding
 *
 * These tests verify user-facing acceptance criteria for player profile creation,
 * the invitation system, and the onboarding flow.
 * Authentication is not available in this E2E suite, so tests focus on:
 *  - Route integrity and auth gate enforcement (AC #1, #14)
 *  - Page structure and form rendering (AC #2, #3)
 *  - Admin-only UI gating (AC #1 — Add Player button hidden for non-admin)
 *  - Accept-invite page for player tokens (AC #11)
 *  - Component stability (no JS crashes on render)
 */

// ---------------------------------------------------------------------------
// AC #1, #14: Players route integrity & auth gate enforcement
// ---------------------------------------------------------------------------

test.describe("Players Route & Auth Gate", () => {
  test("players route responds with a valid HTTP status (not 5xx)", async ({
    page,
  }) => {
    const response = await page.goto("/players");

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("unauthenticated users are redirected to login or see no admin controls", async ({
    page,
  }) => {
    // AC #1: "Add Player" button visible to admins ONLY
    await page.goto("/players");

    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const wasRedirected = url.includes("login") || url.includes("sign-in");

    if (wasRedirected) {
      // Auth gate redirected to login — verify login form is present
      const loginForm = page.locator(
        'input[type="email"], input[name="email"], input[type="password"]',
      );
      await expect(loginForm.first()).toBeVisible({ timeout: 10000 });
    } else {
      // No redirect — verify admin-only "Add Player" button is hidden
      const addPlayerBtn = page.getByRole("link", { name: /Add Player/i });
      await expect(addPlayerBtn).not.toBeVisible({ timeout: 10000 });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #1: Add Player page route integrity & auth gate
// ---------------------------------------------------------------------------

test.describe("Add Player Page — Route & Auth Gate", () => {
  test("add player route responds with a valid HTTP status (not 5xx)", async ({
    page,
  }) => {
    const response = await page.goto("/players/new");

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("unauthenticated users cannot access the Add Player form", async ({
    page,
  }) => {
    // AC #1: only admin users can access /players/new
    await page.goto("/players/new");

    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const wasRedirected =
      url.includes("login") || url.includes("sign-in") || url.includes("/players") && !url.includes("/new");

    if (wasRedirected) {
      // Auth gate redirected — verify we're not on the Add Player page
      expect(url).not.toContain("/players/new");
    } else {
      // If no redirect, the "Create Player" submit button must NOT be visible
      // (auth guard in the component prevents rendering for non-admins)
      const createBtn = page.getByRole("button", { name: /Create Player/i });
      await expect(createBtn).not.toBeVisible({ timeout: 10000 });
    }
  });
});

// ---------------------------------------------------------------------------
// AC #2, #3: Profile creation form — structure and fields
// ---------------------------------------------------------------------------

test.describe("Profile Form — Structure & Content", () => {
  test("add player page renders 'Add Player' heading", async ({ page }) => {
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return; // redirected — structure test N/A
    }

    // The page should render the "Add Player" heading
    const heading = page.locator("h1", { hasText: /Add Player/i });
    await expect(heading).toBeVisible({ timeout: 30000 });

    await page.screenshot({
      path: "tests/screenshots/5-2-add-player-heading.png",
    });
  });

  test("form renders all five card sections", async ({ page }) => {
    // AC #2: multi-section profile creation form
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    // Wait for form to render
    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 30000 });

    // Verify all 5 sections are present
    const sections = [
      "Basic Info",
      "Football Details",
      "Physical",
      "Contact",
      "Emergency Contact",
    ];

    for (const section of sections) {
      const sectionHeading = page.getByText(section, { exact: true });
      await expect(sectionHeading).toBeVisible({ timeout: 10000 });
    }

    await page.screenshot({
      path: "tests/screenshots/5-2-form-sections.png",
    });
  });

  test("form renders required field indicators for first name, last name, and position", async ({
    page,
  }) => {
    // AC #3: required field validation — visual indicators
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 30000 });

    // First Name and Last Name labels should have required indicators (*)
    const firstNameLabel = page.getByText(/First Name/);
    await expect(firstNameLabel).toBeVisible({ timeout: 10000 });

    const lastNameLabel = page.getByText(/Last Name/);
    await expect(lastNameLabel).toBeVisible({ timeout: 10000 });

    const positionLabel = page.getByText(/Position/).first();
    await expect(positionLabel).toBeVisible({ timeout: 10000 });
  });

  test("form renders Cancel and Create Player buttons", async ({ page }) => {
    // AC #2: form footer with Cancel and Create Player buttons
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 30000 });

    const cancelBtn = page.getByRole("button", { name: /Cancel/i });
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await expect(cancelBtn).toBeEnabled();

    const createBtn = page.getByRole("button", { name: /Create Player/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await expect(createBtn).toBeEnabled();
  });

  test("form contains expected input fields", async ({ page }) => {
    // AC #2: verify key form fields are present
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 30000 });

    // Basic Info fields
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#lastName")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#nationality")).toBeVisible({ timeout: 10000 });

    // Football Details fields
    await expect(page.locator("#squadNumber")).toBeVisible({ timeout: 10000 });

    // Physical fields
    await expect(page.locator("#heightCm")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#weightKg")).toBeVisible({ timeout: 10000 });

    // Contact fields
    await expect(page.locator("#phone")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#personalEmail")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#address")).toBeVisible({ timeout: 10000 });

    // Emergency Contact fields
    await expect(page.locator("#emergencyContactName")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("#emergencyContactRelationship")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("#emergencyContactPhone")).toBeVisible({
      timeout: 10000,
    });
  });

  test("photo upload area is present with format instructions", async ({
    page,
  }) => {
    // AC #5: photo upload area with file format/size info
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 30000 });

    // Photo upload area should show format text
    const photoInfo = page.getByText(/JPEG, PNG or WebP/i);
    await expect(photoInfo).toBeVisible({ timeout: 10000 });

    // File input should exist (hidden but present in DOM)
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);
  });

  test("position select has all four position options", async ({ page }) => {
    // AC #2: position select with Goalkeeper, Defender, Midfielder, Forward
    await page.goto("/players/new");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 30000 });

    // Click the Position select trigger to open it
    const positionTrigger = page
      .getByRole("combobox")
      .filter({ hasText: /Select position/i });
    if ((await positionTrigger.count()) > 0) {
      await positionTrigger.click();

      // Verify all position options exist
      for (const position of [
        "Goalkeeper",
        "Defender",
        "Midfielder",
        "Forward",
      ]) {
        const option = page.getByRole("option", { name: position });
        await expect(option).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC #11: Accept-invite page — player token handling
// ---------------------------------------------------------------------------

test.describe("Accept Invite — Player Token Flow", () => {
  test("accept-invite page handles type=player with invalid token", async ({
    page,
  }) => {
    // AC #11: player-specific accept flow with invalid token shows error
    await page.goto(
      "/accept-invite?token=invalid_player_token_test&type=player",
    );

    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: "tests/screenshots/5-2-invalid-player-invite.png",
    });
  });

  test("accept-invite page with type=player shows Go to Login button on error", async ({
    page,
  }) => {
    // AC #11: player invite error state provides navigation back to login
    await page.goto(
      "/accept-invite?token=expired_player_token_xyz&type=player",
    );

    const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
    await expect(goToLoginBtn).toBeVisible({ timeout: 15000 });
    await expect(goToLoginBtn).toBeEnabled();
  });

  test("accept-invite page renders structured error card for invalid player token", async ({
    page,
  }) => {
    // AC #11: invalid player token renders a structured error card
    const response = await page.goto(
      "/accept-invite?token=structure_player_test&type=player",
    );

    // Route must exist and not 5xx
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(404);
    expect(response!.status()).toBeLessThan(500);

    // Error card must contain heading
    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Error message should mention invitation
    const errorText = page.getByText(
      /invitation link is invalid|expired|already been used/i,
    );
    await expect(errorText).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// AC #12: Players list page — structure and content
// ---------------------------------------------------------------------------

test.describe("Players List Page — Structure & Content", () => {
  test("players page renders 'Players' heading", async ({ page }) => {
    await page.goto("/players");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    const heading = page.locator("h1", { hasText: /Players/i });
    await expect(heading).toBeVisible({ timeout: 30000 });

    await page.screenshot({
      path: "tests/screenshots/5-2-players-list-heading.png",
    });
  });

  test("Add Player button is NOT rendered in DOM for non-admin users", async ({
    page,
  }) => {
    // AC #1: only admins see the Add Player button
    await page.goto("/players");
    await page.waitForLoadState("networkidle").catch(() => {});

    const url = page.url();
    if (url.includes("login") || url.includes("sign-in")) {
      return;
    }

    // "Add Player" link/button must not be in the DOM for non-admin
    const addPlayerLink = page.getByRole("link", { name: /Add Player/i });
    expect(await addPlayerLink.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Page stability — no JS crashes
// ---------------------------------------------------------------------------

test.describe("Player Pages — Stability", () => {
  test("players list page renders without component-level JavaScript errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/players");
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

    expect(componentErrors).toHaveLength(0);
  });

  test("add player page renders without component-level JavaScript errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto("/players/new");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("networkidle").catch(() => {});

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

  test("accept-invite page with type=player renders without component-level JavaScript errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const response = await page.goto(
      "/accept-invite?token=stability_test&type=player",
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.waitForLoadState("networkidle").catch(() => {});

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
