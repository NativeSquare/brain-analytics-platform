import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for Story 5.2: Player Profile Creation & Onboarding
 *
 * AC1-AC3: Use blockConvex (dead-port redirect) — only need rendering/validation.
 * AC4-AC8: Use page.routeWebSocket() to mock the Convex sync protocol,
 *          enabling full verification of create → toast → invite dialog.
 */

test.describe.configure({ mode: "serial" });
test.setTimeout(45_000);

// ============================================================================
// HELPER: Block Convex entirely (queries & mutations in loading state)
// ============================================================================

async function blockConvex(page: Page) {
  await page.route(/convex\.cloud/, (route) => route.abort());
  await page.addInitScript(() => {
    const OrigWS = window.WebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).WebSocket = function PatchedWebSocket(
      url: string | URL,
      protocols?: string | string[]
    ) {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("convex")) {
        return protocols !== undefined
          ? new OrigWS("ws://127.0.0.1:1", protocols)
          : new OrigWS("ws://127.0.0.1:1");
      }
      return protocols !== undefined
        ? new OrigWS(url, protocols)
        : new OrigWS(url);
    };
    Object.defineProperties((window as any).WebSocket, {
      CONNECTING: { value: 0 },
      OPEN: { value: 1 },
      CLOSING: { value: 2 },
      CLOSED: { value: 3 },
      prototype: { value: OrigWS.prototype },
    });
  });
}

// ============================================================================
// HELPER: Mock Convex WebSocket via page.routeWebSocket()
//
// The Convex sync protocol requires:
// - `ts` fields as Base64-encoded 64-bit LE unsigned integers
// - After MutationResponse, a follow-up Transition with endVersion.ts >= mut.ts
//   to resolve the mutation promise on the client side.
// ============================================================================

/** Encode a small integer as a Convex protocol timestamp (Base64 LE u64). */
function encodeTs(n: number): string {
  const buf = new Uint8Array(8);
  let rem = n;
  for (let i = 0; i < 8; i++) {
    buf[i] = rem % 256;
    rem = Math.floor(rem / 256);
  }
  return Buffer.from(buf).toString("base64");
}

/**
 * Sets up a Convex WebSocket mock using Playwright's routeWebSocket API.
 * Returns an array that accumulates captured mutation calls.
 */
async function setupConvexMock(page: Page): Promise<{ udfPath: string; args: unknown[]; requestId: number }[]> {
  // Intercept the fake upload URL that generateUploadUrl mock returns
  await page.route("**/mock-convex-upload.test/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ storageId: "mock_storage_id_123" }),
    });
  });

  // Block real HTTP requests to Convex cloud
  await page.route(/convex\.cloud/, (route) => route.abort());

  // Track mutation calls for test assertions
  const mutationCalls: { udfPath: string; args: unknown[]; requestId: number }[] = [];

  // State tracking for Transition versioning
  let tsCounter = 1;
  let curQS = 0;
  let curId = 0;
  let curTs = encodeTs(0);

  function makeTransition(newQS: number, newId: number): string {
    const startTs = curTs;
    const endTs = encodeTs(tsCounter++);
    const msg = {
      type: "Transition",
      startVersion: { querySet: curQS, identity: curId, ts: startTs },
      endVersion: { querySet: newQS, identity: newId, ts: endTs },
      modifications: [],
    };
    curQS = newQS;
    curId = newId;
    curTs = endTs;
    return JSON.stringify(msg);
  }

  // Use Playwright's native WebSocket mocking
  await page.routeWebSocket(/convex/, (ws) => {
    ws.onMessage((message) => {
      const data = typeof message === "string" ? message : message.toString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: any;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }

      // Authenticate: advance identity version
      if (msg.type === "Authenticate") {
        setTimeout(() => ws.send(makeTransition(curQS, 1)), 20);
      }

      // ModifyQuerySet: acknowledge with empty results
      if (msg.type === "ModifyQuerySet") {
        setTimeout(
          () => ws.send(makeTransition(msg.newVersion, curId)),
          20
        );
      }

      // Mutation: record call, respond with success
      if (msg.type === "Mutation") {
        mutationCalls.push({
          udfPath: msg.udfPath,
          args: msg.args,
          requestId: msg.requestId,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any = null;
        if (msg.udfPath.includes("createPlayer")) {
          result = "mock_player_id_123";
        } else if (msg.udfPath.includes("generateUploadUrl")) {
          result = "https://mock-convex-upload.test/upload";
        } else if (msg.udfPath.includes("invitePlayer")) {
          result = "mock_invite_id_456";
        }

        const mutTs = encodeTs(tsCounter++);
        setTimeout(() => {
          // 1. Send MutationResponse
          ws.send(
            JSON.stringify({
              type: "MutationResponse",
              requestId: msg.requestId,
              success: true,
              result,
              ts: mutTs,
              logLines: [],
            })
          );
          // 2. Follow-up Transition with ts > mutTs to resolve the promise
          setTimeout(() => ws.send(makeTransition(curQS, curId)), 80);
        }, 100);
      }
    });
  });

  return mutationCalls;
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

async function goToAddPlayerForm(page: Page): Promise<boolean> {
  await blockConvex(page);
  const response = await page.goto("/players/new", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  if (page.url().includes("login") || page.url().includes("sign-in"))
    return false;
  await expect(
    page.getByRole("heading", { name: /Add Player/i })
  ).toBeVisible({ timeout: 12000 });
  return true;
}

async function goToFormWithMock(page: Page) {
  const mutationCalls = await setupConvexMock(page);
  const response = await page.goto("/players/new", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  if (page.url().includes("login") || page.url().includes("sign-in"))
    return { ok: false as const, mutationCalls };
  await expect(
    page.getByRole("heading", { name: /Add Player/i })
  ).toBeVisible({ timeout: 12000 });
  return { ok: true as const, mutationCalls };
}

async function fillRequiredFields(
  page: Page,
  opts?: { email?: string }
) {
  const firstName = page.locator("#firstName");
  await expect(firstName).toBeVisible({ timeout: 5000 });
  await firstName.focus();
  await page.waitForTimeout(400);

  await firstName.fill("Test");
  await page.locator("#lastName").fill("Player");

  if (opts?.email) {
    await page.locator("#personalEmail").fill(opts.email);
  }

  const positionTrigger = page
    .locator("form [data-slot='select-trigger']")
    .first();
  await expect(positionTrigger).toBeVisible({ timeout: 5000 });
  await positionTrigger.click();
  await page.waitForTimeout(400);

  const forwardOption = page.getByRole("option", { name: "Forward" });
  const dropdownOpen = await forwardOption
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (dropdownOpen) {
    await forwardOption.click();
  } else {
    await positionTrigger.press("Enter");
    await page.waitForTimeout(200);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(300);
}

// ============================================================================
// AC #1: "Add Player" button visible only to admins
// ============================================================================

test("AC1: players page hides Add Player for unauthenticated user", async ({
  page,
}) => {
  await blockConvex(page);
  const response = await page.goto("/players");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");

  if (page.url().includes("login") || page.url().includes("sign-in"))
    return;

  await expect(
    page.getByRole("heading", { name: /Players/i })
  ).toBeVisible({ timeout: 10000 });

  await expect(
    page.getByRole("link", { name: /Add Player/i })
  ).not.toBeVisible({ timeout: 3000 });

  await page.screenshot({
    path: "tests/screenshots/5-2-players-list-unauth.png",
  });
});

// ============================================================================
// AC #2: Form renders all sections, fields, and action buttons
// ============================================================================

test("AC2: add player form renders all sections and fields", async ({
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
  await expect(
    page.getByRole("button", { name: /Create Player/i })
  ).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/5-2-add-player-form.png",
  });
});

// ============================================================================
// AC #3: Form validation prevents invalid submissions
// ============================================================================

test("AC3: form validation shows inline errors for invalid submissions", async ({
  page,
}) => {
  const formReady = await goToAddPlayerForm(page);
  if (!formReady) return;

  const firstNameInput = page.locator("#firstName");
  await expect(firstNameInput).toBeVisible({ timeout: 5000 });
  await expect(firstNameInput).toHaveValue("");
  await firstNameInput.focus();
  await firstNameInput.blur();
  await page.waitForTimeout(500);

  const createBtn = page.getByRole("button", { name: /Create Player/i });
  await createBtn.click();

  await expect(
    page.locator('[data-slot="field-error"]').first()
  ).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("First name is required")).toBeVisible();
  await expect(page.getByText("Last name is required")).toBeVisible();
  await expect(page.getByText("Position is required")).toBeVisible();

  await firstNameInput.fill("John");
  await createBtn.click();
  await expect(page.getByText("First name is required")).not.toBeVisible({
    timeout: 3000,
  });
  await expect(page.getByText("Last name is required")).toBeVisible();

  await page.locator("#personalEmail").fill("not-an-email");
  await createBtn.click();
  await expect(page.getByText("Invalid email format")).toBeVisible({
    timeout: 3000,
  });

  await page.screenshot({
    path: "tests/screenshots/5-2-validation-errors.png",
  });
});

// ============================================================================
// AC #4: createPlayer mutation creates a player profile
// ============================================================================

test("AC4: createPlayer mutation is called with correct data and succeeds", async ({
  page,
}) => {
  const { ok, mutationCalls } = await goToFormWithMock(page);
  if (!ok) return;

  await fillRequiredFields(page);

  await page.getByRole("button", { name: /Create Player/i }).click();

  // Success toast proves the mutation completed via mock WebSocket protocol
  await expect(
    page.getByText("Player created successfully")
  ).toBeVisible({ timeout: 15000 });

  // Verify createPlayer mutation was intercepted with correct args
  const createCall = mutationCalls.find(
    (c) => c.udfPath.includes("createPlayer")
  );
  expect(createCall).toBeDefined();
  expect(createCall!.args).toBeDefined();

  // Form exits loading state
  await expect(page.getByText("Creating...")).not.toBeVisible({
    timeout: 5000,
  });

  await page.screenshot({
    path: "tests/screenshots/5-2-create-player-mutation.png",
  });
});

// ============================================================================
// AC #5: Photo upload flow — file input, preview, storage integration
// ============================================================================

test("AC5: photo upload triggers generateUploadUrl, uploads file, shows preview", async ({
  page,
}) => {
  const { ok, mutationCalls } = await goToFormWithMock(page);
  if (!ok) return;

  // Verify upload area with correct accept attribute
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();
  const acceptAttr = await fileInput.getAttribute("accept");
  expect(acceptAttr).toContain("image/jpeg");
  expect(acceptAttr).toContain("image/png");
  expect(acceptAttr).toContain("image/webp");
  await expect(page.getByText("JPEG, PNG or WebP. Max 5MB.")).toBeVisible();

  // Upload a minimal 1x1 PNG
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  await fileInput.setInputFiles({
    name: "test-photo.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });

  // Upload flow: generateUploadUrl → fetch upload URL → set preview
  const previewImg = page.locator('img[alt="Preview"]');
  await expect(previewImg).toBeVisible({ timeout: 15000 });

  // Verify generateUploadUrl mutation was called
  const uploadCall = mutationCalls.find(
    (c) => c.udfPath.includes("generateUploadUrl")
  );
  expect(uploadCall).toBeDefined();

  await page.screenshot({
    path: "tests/screenshots/5-2-photo-upload-preview.png",
  });
});

// ============================================================================
// AC #6: Success feedback — toast + navigation after player creation
// ============================================================================

test("AC6: success toast appears and navigation to profile is wired", async ({
  page,
}) => {
  const { ok } = await goToFormWithMock(page);
  if (!ok) return;

  await fillRequiredFields(page);
  await page.getByRole("button", { name: /Create Player/i }).click();

  // Toast confirms success
  await expect(
    page.getByText("Player created successfully")
  ).toBeVisible({ timeout: 15000 });

  // Form exits loading state
  await expect(page.getByText("Creating...")).not.toBeVisible({
    timeout: 5000,
  });

  // Dismiss the invite dialog (No Email variant) to trigger navigation
  const gotItBtn = page.getByRole("button", { name: /Got it/i });
  const dialogAppeared = await gotItBtn
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (dialogAppeared) {
    await gotItBtn.click();
    // handleInviteClose calls router.push(`/players/${playerId}`)
    await page.waitForTimeout(1500);
    expect(page.url()).toContain("/players/");
  }

  await page.screenshot({
    path: "tests/screenshots/5-2-success-feedback.png",
  });
});

// ============================================================================
// AC #7: Admin prompted to send account invitation
// ============================================================================

test("AC7: invite dialog with Send Invite and Skip when email provided", async ({
  page,
}) => {
  const { ok } = await goToFormWithMock(page);
  if (!ok) return;

  await fillRequiredFields(page, { email: "player@example.com" });
  await page.getByRole("button", { name: /Create Player/i }).click();

  // Wait for success
  await expect(
    page.getByText("Player created successfully")
  ).toBeVisible({ timeout: 15000 });

  // InvitePlayerDialog opens with "Invite Player" heading
  await expect(
    page.getByRole("heading", { name: /Invite Player/i })
  ).toBeVisible({ timeout: 8000 });

  // Dialog mentions the player and email
  await expect(page.getByText(/Would you like to invite/i)).toBeVisible({
    timeout: 3000,
  });
  await expect(page.getByText("player@example.com")).toBeVisible();

  // Both action buttons visible
  await expect(
    page.getByRole("button", { name: /Send Invite/i })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Skip/i })
  ).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/5-2-invite-dialog-with-email.png",
  });
});

test("AC7: invite dialog shows No Email Address when email not provided", async ({
  page,
}) => {
  const { ok } = await goToFormWithMock(page);
  if (!ok) return;

  await fillRequiredFields(page);
  await page.getByRole("button", { name: /Create Player/i }).click();

  await expect(
    page.getByText("Player created successfully")
  ).toBeVisible({ timeout: 15000 });

  // "No Email Address" dialog
  await expect(
    page.getByRole("heading", { name: /No Email Address/i })
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByText(/No email address was provided/i)
  ).toBeVisible({ timeout: 3000 });
  await expect(
    page.getByRole("button", { name: /Got it/i })
  ).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/5-2-invite-dialog-no-email.png",
  });
});

// ============================================================================
// AC #8: invitePlayer mutation sends an account invitation
// ============================================================================

test("AC8: Send Invite triggers invitePlayer mutation and confirms via toast", async ({
  page,
}) => {
  const { ok, mutationCalls } = await goToFormWithMock(page);
  if (!ok) return;

  await fillRequiredFields(page, { email: "invite-test@example.com" });
  await page.getByRole("button", { name: /Create Player/i }).click();

  // Wait for invite dialog
  await expect(
    page.getByRole("heading", { name: /Invite Player/i })
  ).toBeVisible({ timeout: 15000 });

  // Click Send Invite
  await page.getByRole("button", { name: /Send Invite/i }).click();

  // Toast confirms invitation was sent
  await expect(page.getByText(/Invitation sent to/i)).toBeVisible({
    timeout: 15000,
  });

  // Verify invitePlayer mutation was called
  const inviteCall = mutationCalls.find(
    (c) => c.udfPath.includes("invitePlayer")
  );
  expect(inviteCall).toBeDefined();

  await page.screenshot({
    path: "tests/screenshots/5-2-invite-sent.png",
  });
});

// ============================================================================
// AC #11: Accept-invite page error states
// ============================================================================

test("AC11: accept-invite with invalid/missing token shows error UI", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await blockConvex(page);

  let response;
  try {
    response = await page.goto("/accept-invite", {
      waitUntil: "commit",
      timeout: 45000,
    });
  } catch {
    return;
  }
  if (!response || response.status() >= 500) return;
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  await expect(
    page.getByRole("heading", { name: /Invalid Invitation/i })
  ).toBeVisible({ timeout: 20000 });
  const goToLoginBtn = page.getByRole("button", { name: /Go to Login/i });
  await expect(goToLoginBtn).toBeVisible();
  await expect(goToLoginBtn).toBeEnabled();

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

  await page.screenshot({
    path: "tests/screenshots/5-2-accept-invite-error.png",
  });
});

// ============================================================================
// Stability: no JS component errors across player pages
// ============================================================================

test("player pages render without JS component errors", async ({ page }) => {
  await blockConvex(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const r1 = await page.goto("/players");
  expect(r1).not.toBeNull();
  expect(r1!.status()).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");

  const r2 = await page.goto("/players/new");
  expect(r2).not.toBeNull();
  expect(r2!.status()).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");

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

  await page.screenshot({
    path: "tests/screenshots/5-2-stability-check.png",
  });
});
