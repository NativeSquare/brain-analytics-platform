import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 2.2: User Invitation & Onboarding
 *
 * These tests verify user-facing acceptance criteria for the invitation system.
 * The accept-invite page is public (no auth required) so we can test error
 * states directly with invalid/missing tokens. The team management page
 * requires authentication, so we verify the auth gate prevents access.
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

  test("accept-invite page renders structured error card with heading and enabled navigation button", async ({
    page,
  }) => {
    // AC #4: invitation link navigates to /accept-invite?token={token} without 404
    // AC #5: invalid tokens render a structured error card with actionable UI
    const response = await page.goto("/accept-invite?token=structure_test");

    // Route must exist (not 404) and not error (not 5xx)
    expect(response).not.toBeNull();
    expect(response!.status()).not.toBe(404);
    expect(response!.status()).toBeLessThan(500);

    // Error card must contain an "Invalid Invitation" heading
    const heading = page.getByRole("heading", {
      name: /Invalid Invitation/i,
    });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // "Go to Login" button must be present and enabled (not disabled)
    const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
    await expect(goToLoginBtn).toBeVisible();
    await expect(goToLoginBtn).toBeEnabled();
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

  test("accept-invite page without token shows error or loading state", async ({
    page,
  }) => {
    // AC #5: missing token parameter should be handled gracefully, not crash
    await page.goto("/accept-invite");

    // Page should render something meaningful (heading) — not be blank or 404
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// AC #11, #12: Team management page — auth gate
// ---------------------------------------------------------------------------

test.describe("Team Management Page", () => {
  test("prevents unauthenticated access — does not show team management UI", async ({
    page,
  }) => {
    // AC #12: authorization enforced — unauthenticated users cannot access /team
    await page.goto("/team");

    // Wait for page to settle (redirect, render, or client-side auth check)
    await page.waitForLoadState("networkidle").catch(() => {
      // networkidle may not fire if SSE/WebSocket connections stay open
    });

    const url = page.url();
    const wasRedirected =
      url.includes("login") || url.includes("sign-in");

    if (wasRedirected) {
      // Auth gate redirected to login — verify login form is present
      const loginForm = page.locator(
        'input[type="email"], input[name="email"], input[type="password"]',
      );
      await expect(loginForm.first()).toBeVisible({ timeout: 10000 });
    } else {
      // If no redirect, the admin-only "Invite Member" button must NOT be visible
      // (this proves the auth gate prevented access to team management UI)
      const inviteButton = page.getByRole("button", {
        name: /Invite Member/i,
      });
      await expect(inviteButton).not.toBeVisible({ timeout: 10000 });
    }
  });

  test("team route responds without server error", async ({ page }) => {
    const response = await page.goto("/team");

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});
