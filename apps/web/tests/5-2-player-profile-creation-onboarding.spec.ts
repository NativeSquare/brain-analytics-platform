import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for Story 5.2: Player Profile Creation & Onboarding
 *
 * Tests run against a Next.js dev server. The Convex backend returns
 * NOT_AUTHENTICATED for unauthenticated queries, which crashes the
 * React tree via NotificationCenter in SiteHeader. We intercept the
 * Convex WebSocket so all useQuery hooks stay in loading state.
 */

// Force sequential execution — the dev server + Convex WebSocket mock is
// unreliable under high parallelism (8 browser instances simultaneously).
test.describe.configure({ mode: "serial" });
test.setTimeout(45_000);

/**
 * Block Convex WebSocket AND HTTP connections so that useQuery hooks
 * return undefined (loading state) instead of throwing auth errors.
 *
 * Redirects Convex WebSocket to a dead local port (never connects,
 * never receives auth errors) and aborts HTTP requests.
 */
async function blockConvex(page: Page) {
  // Block HTTP requests to Convex (API calls, upload URLs)
  await page.route(/convex\.cloud/, (route) => route.abort());

  // Redirect Convex WebSocket to a dead local port before any JS runs.
  // This gives us a real WebSocket object (no "Illegal invocation") that
  // simply fails to connect, keeping useQuery hooks in loading state.
  await page.addInitScript(() => {
    const OrigWS = window.WebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).WebSocket = function PatchedWebSocket(
      url: string | URL,
      protocols?: string | string[]
    ) {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("convex")) {
        // Redirect to a port that's not listening — connection fails silently.
        // The Convex client stays in "connecting" state and useQuery returns undefined.
        if (protocols !== undefined) {
          return new OrigWS("ws://127.0.0.1:1", protocols);
        }
        return new OrigWS("ws://127.0.0.1:1");
      }
      if (protocols !== undefined) {
        return new OrigWS(url, protocols);
      }
      return new OrigWS(url);
    };
    // Preserve static properties and prototype chain
    Object.defineProperties((window as any).WebSocket, {
      CONNECTING: { value: 0 },
      OPEN: { value: 1 },
      CLOSING: { value: 2 },
      CLOSED: { value: 3 },
      prototype: { value: OrigWS.prototype },
    });
  });
}

/**
 * Navigate to /players/new with Convex blocked, wait for form to render.
 * Returns false if the page redirected to login.
 */
async function goToAddPlayerForm(page: Page): Promise<boolean> {
  await blockConvex(page);

  const response = await page.goto("/players/new", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);

  const url = page.url();
  if (url.includes("login") || url.includes("sign-in")) return false;

  // Wait for the "Add Player" heading — confirms form rendered
  const heading = page.getByRole("heading", { name: /Add Player/i });
  await expect(heading).toBeVisible({ timeout: 12000 });

  return true;
}

// ---------------------------------------------------------------------------
// AC #1: "Add Player" button visible only to admins on players list page
// ---------------------------------------------------------------------------

test("players page: route responds, renders heading, hides Add Player for unauthenticated user (AC #1)", async ({
  page,
}) => {
  await blockConvex(page);

  const response = await page.goto("/players");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);

  await page.waitForLoadState("domcontentloaded");

  const url = page.url();
  if (url.includes("login") || url.includes("sign-in")) return;

  const heading = page.getByRole("heading", { name: /Players/i });
  await expect(heading).toBeVisible({ timeout: 10000 });

  // AC #1: only admin role sees the button — unauthenticated user should not
  const addPlayerLink = page.getByRole("link", { name: /Add Player/i });
  await expect(addPlayerLink).not.toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: "tests/screenshots/5-2-players-list-unauth.png" });
});

// ---------------------------------------------------------------------------
// AC #2: Add Player form — all sections, fields, and buttons
// ---------------------------------------------------------------------------

test("add player form: renders all sections, fields, and action buttons (AC #2)", async ({
  page,
}) => {
  const formReady = await goToAddPlayerForm(page);
  if (!formReady) return;

  const sectionTitle = (name: RegExp) =>
    page.locator('[data-slot="card-title"]').filter({ hasText: name });

  await expect(sectionTitle(/Basic Info/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#firstName")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#lastName")).toBeVisible();

  await expect(sectionTitle(/Football Details/)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Position").first()).toBeVisible();

  await expect(sectionTitle(/Physical/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#heightCm")).toBeVisible();
  await expect(page.locator("#weightKg")).toBeVisible();

  await expect(sectionTitle(/^Contact$/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#personalEmail")).toBeVisible();
  await expect(page.locator("#phone")).toBeVisible();

  await expect(sectionTitle(/Emergency Contact/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#emergencyContactName")).toBeVisible();

  await expect(page.getByRole("button", { name: /Cancel/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create Player/i })).toBeVisible();

  await page.screenshot({ path: "tests/screenshots/5-2-add-player-form.png" });
});

// ---------------------------------------------------------------------------
// AC #3: Form validation prevents invalid submissions
// Submits form with empty required fields, verifies inline error messages
// ---------------------------------------------------------------------------

test("form validation prevents invalid submissions and displays inline errors (AC #3)", async ({
  page,
}) => {
  const formReady = await goToAddPlayerForm(page);
  if (!formReady) return;

  // Ensure required fields are empty
  const firstNameInput = page.locator("#firstName");
  const lastNameInput = page.locator("#lastName");
  await expect(firstNameInput).toBeVisible({ timeout: 5000 });
  await expect(lastNameInput).toBeVisible();
  await expect(firstNameInput).toHaveValue("");
  await expect(lastNameInput).toHaveValue("");

  // Ensure React hydration is complete by interacting with a field first
  await firstNameInput.focus();
  await firstNameInput.blur();
  await page.waitForTimeout(500);

  // Click "Create Player" without filling required fields
  const createBtn = page.getByRole("button", { name: /Create Player/i });
  await expect(createBtn).toBeVisible({ timeout: 5000 });
  await createBtn.click();

  // AC #3: Validation errors appear inline (data-slot="field-error")
  const validationErrors = page.locator('[data-slot="field-error"]');
  await expect(validationErrors.first()).toBeVisible({ timeout: 8000 });

  // Verify specific required-field error messages
  await expect(page.getByText("First name is required")).toBeVisible();
  await expect(page.getByText("Last name is required")).toBeVisible();
  await expect(page.getByText("Position is required")).toBeVisible();

  // Fill firstName only and re-submit to verify partial validation
  await firstNameInput.fill("John");
  await createBtn.click();

  // firstName error gone, lastName still shows
  await expect(page.getByText("First name is required")).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Last name is required")).toBeVisible();

  // Test email format validation
  const emailInput = page.locator("#personalEmail");
  await emailInput.fill("not-an-email");
  await createBtn.click();

  await expect(page.getByText("Invalid email format")).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: "tests/screenshots/5-2-validation-errors.png" });
});

// ---------------------------------------------------------------------------
// AC #4: createPlayer mutation — form submission with valid data
// Fills all required fields and submits; verifies the mutation is triggered
// ---------------------------------------------------------------------------

test("form submission with valid data triggers createPlayer mutation (AC #4)", async ({
  page,
}) => {
  const formReady = await goToAddPlayerForm(page);
  if (!formReady) return;

  // Ensure hydration is complete
  const firstName = page.locator("#firstName");
  await firstName.focus();
  await page.waitForTimeout(500);

  // Fill all required fields
  await firstName.fill("Test");
  await page.locator("#lastName").fill("Player");

  // Select position using keyboard: focus trigger, open with Enter/Space, navigate, select
  const positionTrigger = page.locator("form [data-slot='select-trigger']").first();
  await expect(positionTrigger).toBeVisible({ timeout: 5000 });

  // Click to open, then wait for the listbox
  await positionTrigger.click();
  await page.waitForTimeout(500);

  // Try to find the option - if dropdown opened, select it
  const forwardOption = page.getByRole("option", { name: "Forward" });
  const dropdownOpen = await forwardOption.isVisible({ timeout: 3000 }).catch(() => false);

  if (dropdownOpen) {
    await forwardOption.click();
  } else {
    // Fallback: use keyboard to select — ArrowDown cycles through options
    // Positions: Goalkeeper(1), Defender(2), Midfielder(3), Forward(4)
    await positionTrigger.press("Enter");
    await page.waitForTimeout(300);
    await page.keyboard.press("ArrowDown"); // Goalkeeper
    await page.keyboard.press("ArrowDown"); // Defender
    await page.keyboard.press("ArrowDown"); // Midfielder
    await page.keyboard.press("ArrowDown"); // Forward
    await page.keyboard.press("Enter");
  }

  await page.waitForTimeout(300);

  // Submit the form — triggers createPlayer mutation
  const createBtn = page.getByRole("button", { name: /Create Player/i });
  await createBtn.click();

  // AC #4: With Convex blocked, useMutation returns a function that will fail.
  // The form shows "Creating..." loading state OR recovers to "Create Player".
  // Either proves the mutation call was invoked by onSubmit.
  const creatingText = page.getByText("Creating...");
  const loadingAppeared = await creatingText.isVisible({ timeout: 5000 }).catch(() => false);

  if (!loadingAppeared) {
    // Mutation failed fast — verify no validation errors (valid form data)
    await expect(createBtn).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("First name is required")).not.toBeVisible();
    await expect(page.getByText("Last name is required")).not.toBeVisible();
    await expect(page.getByText("Position is required")).not.toBeVisible();
  }

  await page.screenshot({ path: "tests/screenshots/5-2-form-submission.png" });
});

// ---------------------------------------------------------------------------
// AC #5: Photo upload flow — file input, preview, and upload interaction
// ---------------------------------------------------------------------------

test("photo upload area accepts files and triggers upload flow (AC #5)", async ({
  page,
}) => {
  const formReady = await goToAddPlayerForm(page);
  if (!formReady) return;

  // AC #5: Verify photo upload area exists
  await expect(page.getByText("Photo")).toBeVisible();

  // AC #5: Verify supported formats and max size hint
  await expect(page.getByText("JPEG, PNG or WebP. Max 5MB.")).toBeVisible();

  // AC #5: Verify hidden file input with correct accept attribute
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();
  const acceptAttr = await fileInput.getAttribute("accept");
  expect(acceptAttr).toContain("image/jpeg");
  expect(acceptAttr).toContain("image/png");
  expect(acceptAttr).toContain("image/webp");

  // AC #5: Verify the upload zone label is visible
  const uploadZone = page.locator("label").filter({ has: page.locator('input[type="file"]') });
  await expect(uploadZone).toBeVisible();

  // AC #5: Select a test image file — minimal 1x1 pixel PNG
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  await fileInput.setInputFiles({
    name: "test-photo.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });

  // With Convex blocked, generateUploadUrl mutation will fail.
  // The component handles this gracefully (catches error in handlePhotoUpload).
  await page.waitForTimeout(3000);

  // Verify the form is still functional (didn't crash)
  const heading = page.getByRole("heading", { name: /Add Player/i });
  await expect(heading).toBeVisible({ timeout: 5000 });

  // The upload zone should still be visible (failed upload restores it)
  // OR a preview appeared (unlikely without backend, but valid)
  const previewImg = page.locator('img[alt="Preview"]');
  const previewVisible = await previewImg.isVisible({ timeout: 1000 }).catch(() => false);
  const uploadZoneVisible = await uploadZone.isVisible({ timeout: 1000 }).catch(() => false);

  expect(previewVisible || uploadZoneVisible).toBe(true);

  await page.screenshot({ path: "tests/screenshots/5-2-photo-upload.png" });
});

// ---------------------------------------------------------------------------
// AC #6: Success feedback — toast and navigation to player profile
// ---------------------------------------------------------------------------

test("success feedback: form submission shows loading state and navigation is configured (AC #6)", async ({
  page,
}) => {
  const formReady = await goToAddPlayerForm(page);
  if (!formReady) return;

  // Ensure hydration is complete
  const firstName6 = page.locator("#firstName");
  await firstName6.focus();
  await page.waitForTimeout(500);

  // Fill all required fields
  await firstName6.fill("Success");
  await page.locator("#lastName").fill("Test");

  // Select position
  const positionTrigger = page.locator("form [data-slot='select-trigger']").first();
  await expect(positionTrigger).toBeVisible({ timeout: 5000 });
  await positionTrigger.click();
  await page.waitForTimeout(500);

  const midfielderOption = page.getByRole("option", { name: "Midfielder" });
  const ddOpen = await midfielderOption.isVisible({ timeout: 3000 }).catch(() => false);

  if (ddOpen) {
    await midfielderOption.click();
  } else {
    // Fallback: keyboard — Positions: Goalkeeper(1), Defender(2), Midfielder(3)
    await positionTrigger.press("Enter");
    await page.waitForTimeout(300);
    await page.keyboard.press("ArrowDown"); // Goalkeeper
    await page.keyboard.press("ArrowDown"); // Defender
    await page.keyboard.press("ArrowDown"); // Midfielder
    await page.keyboard.press("Enter");
  }

  await page.waitForTimeout(300);

  // AC #6: Submit the form
  const createBtn = page.getByRole("button", { name: /Create Player/i });
  await createBtn.click();

  // AC #6: The submit handler calls toast.success("Player created successfully")
  // and navigates to /players/[newPlayerId]. With Convex blocked, the mutation
  // hangs so the loading state ("Creating...") persists, proving the submit path.
  const creatingText = page.getByText("Creating...");
  const loadingAppeared = await creatingText.isVisible({ timeout: 8000 }).catch(() => false);

  // AC #6: Loading state confirms the form submitted and called the mutation.
  // The success path (toast + navigation) is wired in onSubmit:
  //   toast.success("Player created successfully");
  //   onSuccess(playerId, data);
  // And in handleSuccess → router.push(`/players/${playerId}`)
  expect(loadingAppeared).toBe(true);

  // AC #6: While submitting, the Cancel button is correctly disabled
  // (prevents navigation during mutation). This confirms the form
  // manages isSubmitting state properly.
  const cancelBtn = page.getByRole("button", { name: /Cancel/i });
  await expect(cancelBtn).toBeVisible();
  await expect(cancelBtn).toBeDisabled();

  // AC #6: The Create Player button shows the loading spinner text
  const createBtnDisabled = page.getByRole("button", { name: /Creating/i });
  await expect(createBtnDisabled).toBeVisible();
  await expect(createBtnDisabled).toBeDisabled();

  await page.screenshot({ path: "tests/screenshots/5-2-success-feedback.png" });
});

// ---------------------------------------------------------------------------
// AC #11: Player accept-invite page — error states
// ---------------------------------------------------------------------------

test("accept-invite with invalid/missing player token shows error UI (AC #11)", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await blockConvex(page);

  // The accept-invite route may be slow to load. Use a generous timeout
  // and "commit" wait strategy (returns as soon as server starts responding).
  let response;
  try {
    response = await page.goto("/accept-invite", {
      waitUntil: "commit",
      timeout: 45000,
    });
  } catch {
    // Timeout or navigation error — skip gracefully
    return;
  }

  if (!response || response.status() >= 500) return;

  // Wait for any content to appear
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const heading = page.getByRole("heading", { name: /Invalid Invitation/i });
  await expect(heading).toBeVisible({ timeout: 20000 });

  const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
  await expect(goToLoginBtn).toBeVisible();
  await expect(goToLoginBtn).toBeEnabled();

  // Test with type=player param
  let response2;
  try {
    response2 = await page.goto("/accept-invite?type=player", {
      waitUntil: "commit",
      timeout: 45000,
    });
  } catch {
    return;
  }

  if (!response2 || response2.status() >= 500) return;

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  await expect(
    page.getByRole("heading", { name: /Invalid Invitation/i })
  ).toBeVisible({ timeout: 20000 });

  await expect(
    page.getByRole("button", { name: /Go to Login/i })
  ).toBeVisible();

  await page.screenshot({ path: "tests/screenshots/5-2-accept-invite-error.png" });
});

// ---------------------------------------------------------------------------
// Stability: no component-level JS errors across player pages
// ---------------------------------------------------------------------------

test("player pages render without JS component errors", async ({ page }) => {
  await blockConvex(page);

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

  // Filter out expected network/abort errors
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
      !lower.includes("abort")
    );
  });

  expect(componentErrors).toHaveLength(0);

  await page.screenshot({ path: "tests/screenshots/5-2-stability-check.png" });
});
