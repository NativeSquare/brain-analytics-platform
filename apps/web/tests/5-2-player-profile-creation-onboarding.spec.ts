import { test, expect } from "@playwright/test";

/**
 * E2E tests for Story 5.2: Player Profile Creation & Onboarding
 *
 * Verifies route integrity, auth gating, form structure, and accept-invite
 * error states for the player creation and onboarding flows.
 *
 * Note: These tests run without a Convex backend, so we verify page structure,
 * component rendering, and error handling rather than full mutation flows.
 *
 * Tests are consolidated (one navigation per route) to stay within CI timeout.
 */

// Give each test a generous but bounded timeout
test.setTimeout(30_000);

// ---------------------------------------------------------------------------
// AC #1: "Add Player" button visible only to admins on players list page
// AC #1: Players route renders heading and hides admin controls for unauth
// ---------------------------------------------------------------------------

test("players page: route responds, renders heading, hides Add Player for unauthenticated user (AC #1)", async ({
  page,
}) => {
  const response = await page.goto("/players");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);

  await page.waitForLoadState("domcontentloaded");

  const url = page.url();
  if (url.includes("login") || url.includes("sign-in")) {
    // Auth gate redirected — that's valid, Add Player is hidden
    return;
  }

  // Page rendered — verify heading
  const heading = page.getByRole("heading", { name: /Players/i });
  await expect(heading).toBeVisible({ timeout: 8000 });

  // AC #1: only admin role sees the button — unauthenticated user should not
  const addPlayerLink = page.getByRole("link", { name: /Add Player/i });
  await expect(addPlayerLink).not.toBeVisible({ timeout: 3000 });
});

// ---------------------------------------------------------------------------
// AC #2, #3: Add Player form — all sections, fields, and buttons
// Single navigation, all assertions in one test
// ---------------------------------------------------------------------------

test("add player form: renders all sections, fields, and action buttons (AC #2, #3)", async ({
  page,
}) => {
  const response = await page.goto("/players/new");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);

  await page.waitForLoadState("domcontentloaded");

  const url = page.url();
  if (url.includes("login") || url.includes("sign-in")) return;

  // --- "Add Player" heading (AC #2) — this is an actual <h1> ---
  const mainHeading = page.getByRole("heading", { name: /Add Player/i });
  await expect(mainHeading).toBeVisible({ timeout: 8000 });

  // Section titles use CardTitle which renders <div data-slot="card-title">,
  // NOT heading elements, so we use a data-slot locator instead of getByRole.
  const sectionTitle = (name: RegExp) =>
    page.locator('[data-slot="card-title"]').filter({ hasText: name });

  // --- Basic Info section with first/last name (AC #2) ---
  await expect(sectionTitle(/Basic Info/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#firstName")).toBeVisible();
  await expect(page.locator("#lastName")).toBeVisible();

  // --- Football Details section with position (AC #2) ---
  await expect(sectionTitle(/Football Details/)).toBeVisible({ timeout: 5000 });
  const positionLabel = page.getByText("Position").first();
  await expect(positionLabel).toBeVisible();

  // --- Physical section with height/weight (AC #2) ---
  await expect(sectionTitle(/Physical/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#heightCm")).toBeVisible();
  await expect(page.locator("#weightKg")).toBeVisible();

  // --- Contact section with email/phone (AC #2) ---
  await expect(sectionTitle(/^Contact$/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#personalEmail")).toBeVisible();
  await expect(page.locator("#phone")).toBeVisible();

  // --- Emergency Contact section (AC #2) ---
  await expect(sectionTitle(/Emergency Contact/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#emergencyContactName")).toBeVisible();

  // --- Cancel and Create Player buttons (AC #2 form footer) ---
  const cancelBtn = page.getByRole("button", { name: /Cancel/i });
  await expect(cancelBtn).toBeVisible();
  const createBtn = page.getByRole("button", { name: /Create Player/i });
  await expect(createBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC #11: Player accept-invite page — error states (consolidated)
// ---------------------------------------------------------------------------

test("accept-invite with invalid/missing player token shows error UI (AC #11)", async ({
  page,
}) => {
  // Test 1: Missing token entirely — the AcceptInviteForm component
  // short-circuits before any useQuery calls, so this works without a backend.
  await page.goto("/accept-invite");

  // AC #11: missing token displays "Invalid Invitation" heading
  const heading = page.getByRole("heading", {
    name: /Invalid Invitation/i,
  });
  await expect(heading).toBeVisible({ timeout: 12000 });

  // AC #11: error state provides "Go to Login" button
  const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
  await expect(goToLoginBtn).toBeVisible();
  await expect(goToLoginBtn).toBeEnabled();

  // Test 2: Missing token with type=player — also short-circuits before useQuery
  await page.goto("/accept-invite?type=player");

  const heading2 = page.getByRole("heading", {
    name: /Invalid Invitation/i,
  });
  await expect(heading2).toBeVisible({ timeout: 12000 });

  // Verify the "Go to Login" button is present on this path too
  const goToLoginBtn2 = page.getByRole("button", { name: /Go to Login/i });
  await expect(goToLoginBtn2).toBeVisible();
  await expect(goToLoginBtn2).toBeEnabled();
});

// ---------------------------------------------------------------------------
// Stability: no component-level JS errors across player pages
// ---------------------------------------------------------------------------

test("player pages render without JS component errors", async ({ page }) => {
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
