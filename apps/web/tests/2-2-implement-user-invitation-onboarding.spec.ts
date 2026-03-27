import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 2.2: User Invitation & Onboarding
 *
 * These tests verify user-facing acceptance criteria for the invitation system.
 * The accept-invite page is public (no auth required) so we can test error
 * states directly with invalid/missing tokens. The team management page
 * requires authentication, so we verify the auth gate redirects properly.
 */

// ---------------------------------------------------------------------------
// AC #4, #5: Accept-invite page — error states for invalid tokens
// ---------------------------------------------------------------------------

test.describe("Accept Invite Page", () => {
  test("shows 'Invalid Invitation' heading when token does not exist", async ({
    page,
  }) => {
    // AC #5: error state for invalid token shows clear heading
    await page.goto("/accept-invite?token=nonexistent_token_for_testing");

    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("shows descriptive error message explaining link is invalid", async ({
    page,
  }) => {
    // AC #5: user sees helpful error text, not a blank page
    await page.goto("/accept-invite?token=invalid_test_token_xyz123");

    const errorText = page.getByText(
      /invitation link is invalid|expired|already been used/i,
    );
    await expect(errorText).toBeVisible({ timeout: 15000 });
  });

  test("displays 'Go to Login' button on error and it navigates to /login", async ({
    page,
  }) => {
    // AC #5: user can navigate to login from an invalid invite page
    await page.goto("/accept-invite?token=bogus_token_abc");

    const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
    await expect(goToLoginBtn).toBeVisible({ timeout: 15000 });

    // Verify the button actually navigates to the login page
    await goToLoginBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("accept-invite route is registered and does not 404", async ({
    page,
  }) => {
    // AC #4: invitation link navigates to /accept-invite?token={token}
    const response = await page.goto("/accept-invite?token=route_check");

    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(404);
    expect(response!.status()).toBeLessThan(500);
  });

  test("renders a card with heading and action button for error state", async ({
    page,
  }) => {
    // Verify proper card UI structure on the accept-invite page
    await page.goto("/accept-invite?token=structure_test");

    // Should render a heading (either welcome or error)
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should render at least one actionable button
    const button = page.getByRole("button").first();
    await expect(button).toBeVisible();
  });

  test("type=player parameter renders the player-specific accept flow", async ({
    page,
  }) => {
    // AC #5 variation: type=player triggers a different component branch
    await page.goto("/accept-invite?token=player_test_token&type=player");

    // Player flow with invalid token shows "Invalid Invitation" heading
    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Player flow error state also shows "Go to Login" button
    const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
    await expect(goToLoginBtn).toBeVisible();
  });

  test("error card shows 'Go to Login' button that is clickable", async ({
    page,
  }) => {
    // Verify the error state button is not disabled and is interactive
    await page.goto("/accept-invite?token=clickable_test");

    const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
    await expect(goToLoginBtn).toBeVisible({ timeout: 15000 });
    await expect(goToLoginBtn).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// AC #11, #12: Team management page — auth gate
// ---------------------------------------------------------------------------

test.describe("Team Management Page", () => {
  test("redirects unauthenticated user to login page", async ({ page }) => {
    // AC #12: authorization enforced — unauthenticated users cannot access /team
    await page.goto("/team");

    // Wait for either a URL redirect to login OR a sign-in heading to appear
    const loginRedirect = page.waitForURL(/\/(login|sign-in)/i, {
      timeout: 10000,
    });
    const signInHeading = page
      .getByRole("heading", { name: /sign in|log in/i })
      .first();

    await Promise.race([
      loginRedirect,
      expect(signInHeading).toBeVisible({ timeout: 10000 }),
    ]).catch(() => {
      // Acceptable: page may show auth error instead of redirect
    });

    const url = page.url();
    const bodyText = (await page.textContent("body")) ?? "";

    // Verify auth gate: must see login redirect/form, never unprotected team content
    const isAuthGated =
      url.includes("login") ||
      url.includes("sign-in") ||
      bodyText.toLowerCase().includes("sign in") ||
      bodyText.toLowerCase().includes("log in");

    expect(isAuthGated).toBeTruthy();
  });

  test("team route responds without server error", async ({ page }) => {
    const response = await page.goto("/team");

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// Login page: supports the accept-invite → sign-up flow (AC #5)
// ---------------------------------------------------------------------------

test.describe("Login Page", () => {
  test("renders email input field for authentication", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator(
      'input[type="email"], input[name="email"]',
    );
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
  });

  test("renders password input field for authentication", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible({ timeout: 10000 });
  });

  test("renders a submit button for sign-in", async ({ page }) => {
    await page.goto("/login");

    const submitBtn = page.getByRole("button", {
      name: /sign in|log in|submit/i,
    });
    await expect(submitBtn.first()).toBeVisible({ timeout: 10000 });
  });
});
