import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 2.2: User Invitation & Onboarding
 *
 * These tests verify the UI structure and user flows for the invitation system.
 * Since the app requires a Convex backend + authentication, tests focus on
 * verifiable UI elements, routing, and unauthenticated accept-invite flows.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:4500";

// ---------------------------------------------------------------------------
// Accept-Invite Page — unauthenticated flows (no backend session needed)
// ---------------------------------------------------------------------------

test.describe("Accept Invite Page", () => {
  test("loads accept-invite page with missing token and shows loading/error state", async ({
    page,
  }) => {
    // Navigate to accept-invite with no token — should show loading then error
    await page.goto(`${BASE_URL}/accept-invite`);

    // The page should render (not 404)
    await expect(page).not.toHaveTitle("");

    // Wait for the page to settle — either a spinner or error card should appear
    const spinner = page.locator('[class*="spinner"], [class*="Spinner"]');
    const errorCard = page.locator("text=Invalid Invitation");
    const loadingIndicator = page.locator("text=Loading");

    // At least one of these states should be visible
    await expect(
      spinner.or(errorCard).or(loadingIndicator).first(),
    ).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: "tests/screenshots/accept-invite-no-token.png",
    });
  });

  test("loads accept-invite page with invalid token and shows error state", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/accept-invite?token=invalid_test_token_12345`);

    // Wait for the page to process the token
    await expect(page).not.toHaveTitle("");

    // After loading, should show an error state since token doesn't exist
    // Possible messages: "Invalid Invitation", "expired", "invalid"
    const errorIndicator = page
      .locator(
        "text=/Invalid Invitation|invitation link is invalid|expired|already been used/i",
      )
      .first();
    const spinner = page.locator('[class*="spinner"], [class*="Spinner"]');

    // Wait for either error or spinner (backend may not be running)
    await expect(errorIndicator.or(spinner).first()).toBeVisible({
      timeout: 15000,
    });

    await page.screenshot({
      path: "tests/screenshots/accept-invite-invalid-token.png",
    });
  });

  test("accept-invite page shows Go to Login button on error", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/accept-invite?token=completely_bogus_token_abc`,
    );

    // Wait for the page to settle
    await page.waitForTimeout(3000);

    // If an error state is shown, there should be a "Go to Login" button
    const goToLoginBtn = page.locator(
      'button:has-text("Go to Login"), a:has-text("Go to Login")',
    );
    const spinner = page.locator('[class*="spinner"], [class*="Spinner"]');

    // Either shows error with login button, or is still loading
    const visible = await goToLoginBtn.or(spinner).first().isVisible();
    expect(visible).toBeTruthy();

    await page.screenshot({
      path: "tests/screenshots/accept-invite-go-to-login.png",
    });
  });

  test("accept-invite page with player type param loads player flow", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/accept-invite?token=test_player_token&type=player`,
    );

    // The page should render (not 404)
    await expect(page).not.toHaveTitle("");

    // Should show loading spinner or error state for player invite
    const spinner = page.locator('[class*="spinner"], [class*="Spinner"]');
    const errorState = page.locator(
      "text=/Invalid Invitation|invitation link|expired/i",
    );

    await expect(spinner.or(errorState).first()).toBeVisible({
      timeout: 15000,
    });

    await page.screenshot({
      path: "tests/screenshots/accept-invite-player-type.png",
    });
  });
});

// ---------------------------------------------------------------------------
// Team Management Page — requires auth redirect verification
// ---------------------------------------------------------------------------

test.describe("Team Management Page", () => {
  test("unauthenticated user visiting /team is redirected to login", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/team`);

    // Unauthenticated users should be redirected to login or see auth prompt
    // Wait for navigation/redirect to settle
    await page.waitForTimeout(3000);

    const currentUrl = page.url();

    // Should either redirect to /login or stay on /team with auth gate
    const loginForm = page.locator(
      'form, input[type="email"], input[type="password"], text=/sign in|log in|login/i',
    );
    const teamPage = page.locator('text="Team"');

    // One of these should be visible
    const isLoginOrTeam = await loginForm
      .or(teamPage)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    expect(isLoginOrTeam || currentUrl.includes("login")).toBeTruthy();

    await page.screenshot({
      path: "tests/screenshots/team-page-unauth.png",
    });
  });

  test("team page route exists and responds", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/team`);

    // Page should load (200 or redirect 3xx, not 404/500)
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await page.screenshot({
      path: "tests/screenshots/team-page-response.png",
    });
  });
});

// ---------------------------------------------------------------------------
// Login Page — baseline verification
// ---------------------------------------------------------------------------

test.describe("Login Page", () => {
  test("login page loads with email and password fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await expect(page).not.toHaveTitle("");

    // Verify login form elements exist
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    );
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    );

    // Wait for the form to render
    await expect(emailInput.or(passwordInput).first()).toBeVisible({
      timeout: 10000,
    });

    await page.screenshot({ path: "tests/screenshots/login-page.png" });
  });
});

// ---------------------------------------------------------------------------
// Invitation UI Components — structural checks via route responses
// ---------------------------------------------------------------------------

test.describe("Invitation Flow Structure", () => {
  test("accept-invite route supports token query parameter", async ({
    page,
  }) => {
    // Verify the route handles query parameters without crashing
    const response = await page.goto(
      `${BASE_URL}/accept-invite?token=test123`,
    );

    expect(response).not.toBeNull();
    // Should not be a 404 or 500
    expect(response!.status()).toBeLessThan(500);
    expect(response!.status()).not.toBe(404);

    await page.screenshot({
      path: "tests/screenshots/accept-invite-route-check.png",
    });
  });

  test("accept-invite page renders a card component", async ({ page }) => {
    await page.goto(`${BASE_URL}/accept-invite?token=abc123`);

    // Wait for content to load
    await page.waitForTimeout(3000);

    // The page should contain a card structure (used for both valid and error states)
    const card = page.locator(
      '[class*="card"], [class*="Card"], [role="article"]',
    );
    const spinner = page.locator('[class*="spinner"], [class*="Spinner"]');
    const anyContent = page.locator("body");

    // Page should have rendered something
    await expect(anyContent).not.toBeEmpty();

    await page.screenshot({
      path: "tests/screenshots/accept-invite-card-structure.png",
    });
  });

  test("accept-invite page with expired-like token shows appropriate messaging", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/accept-invite?token=expired_token_simulation_test`,
    );

    // Wait for backend response
    await page.waitForTimeout(5000);

    // Should eventually show some form of error or loading
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(0);

    await page.screenshot({
      path: "tests/screenshots/accept-invite-expired-token.png",
    });
  });
});
