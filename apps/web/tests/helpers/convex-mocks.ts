import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for E2E tests that need to mock Convex WebSocket connections.
 * Extracted from spec files to keep test implementations readable.
 */

export function encodeTs(n: number): string {
  const buf = new Uint8Array(8);
  let rem = n;
  for (let i = 0; i < 8; i++) {
    buf[i] = rem % 256;
    rem = Math.floor(rem / 256);
  }
  return Buffer.from(buf).toString("base64");
}

/** Block all Convex HTTP and WebSocket connections */
export async function blockConvex(page: Page) {
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

/** Mock Convex WebSocket to return a user with the given role */
export async function mockConvexWithRole(
  page: Page,
  role: "admin" | "player" | "coach"
) {
  await page.route(/convex\.cloud/, (route) => route.abort());
  let tsCounter = 1;
  let curQS = 0;
  let curId = 0;
  let curTs = encodeTs(0);

  function transition(
    newQS: number,
    newId: number,
    mods: unknown[] = []
  ) {
    const startTs = curTs;
    const endTs = encodeTs(tsCounter++);
    const msg = {
      type: "Transition",
      startVersion: { querySet: curQS, identity: curId, ts: startTs },
      endVersion: { querySet: newQS, identity: newId, ts: endTs },
      modifications: mods,
    };
    curQS = newQS;
    curId = newId;
    curTs = endTs;
    return JSON.stringify(msg);
  }

  await page.routeWebSocket(/convex/, (ws) => {
    ws.onMessage((message) => {
      const data =
        typeof message === "string" ? message : message.toString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: any;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.type === "Authenticate") {
        setTimeout(() => ws.send(transition(curQS, 1)), 20);
      }
      if (msg.type === "ModifyQuerySet") {
        const qm: unknown[] = [];
        if (msg.modifications) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const mod of msg.modifications as any[]) {
            if (mod.type === "Add") {
              if (mod.udfPath.includes("currentUser")) {
                qm.push({
                  type: "QueryUpdated",
                  queryId: mod.queryId,
                  value: {
                    _id: "mock_user_001",
                    _creationTime: 1700000000000,
                    clerkId: "clerk_mock",
                    email: `${role}@test.com`,
                    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                    role,
                    teamId: "mock_team_001",
                  },
                  logLines: [],
                });
              } else if (
                mod.udfPath.includes("getPlayers") ||
                mod.udfPath.includes("players")
              ) {
                qm.push({
                  type: "QueryUpdated",
                  queryId: mod.queryId,
                  value: [],
                  logLines: [],
                });
              } else {
                qm.push({
                  type: "QueryUpdated",
                  queryId: mod.queryId,
                  value: null,
                  logLines: [],
                });
              }
            }
          }
        }
        setTimeout(
          () => ws.send(transition(msg.newVersion, curId, qm)),
          20
        );
      }
    });
  });
}

/** Mock Convex WebSocket with mutation tracking AND query responses.
 *  Unlike the original version, this also responds to ModifyQuerySet with
 *  proper query results (currentUser as admin, empty players list, etc.)
 *  so auth-gated pages don't redirect to login.
 *  Returns the array of captured mutation calls.
 */
export async function mockConvexWithMutations(page: Page) {
  await page.route("**/mock-convex-upload.test/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ storageId: "mock_storage_id_123" }),
    });
  });
  await page.route(/convex\.cloud/, (route) => route.abort());

  const mutationCalls: {
    udfPath: string;
    args: unknown[];
    requestId: number;
  }[] = [];
  let tsCounter = 1;
  let curQS = 0;
  let curId = 0;
  let curTs = encodeTs(0);

  function transition(
    newQS: number,
    newId: number,
    mods: unknown[] = []
  ) {
    const startTs = curTs;
    const endTs = encodeTs(tsCounter++);
    const msg = {
      type: "Transition",
      startVersion: { querySet: curQS, identity: curId, ts: startTs },
      endVersion: { querySet: newQS, identity: newId, ts: endTs },
      modifications: mods,
    };
    curQS = newQS;
    curId = newId;
    curTs = endTs;
    return JSON.stringify(msg);
  }

  await page.routeWebSocket(/convex/, (ws) => {
    ws.onMessage((message) => {
      const data =
        typeof message === "string" ? message : message.toString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: any;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.type === "Authenticate") {
        setTimeout(() => ws.send(transition(curQS, 1)), 20);
      }
      if (msg.type === "ModifyQuerySet") {
        // Respond to queries so auth-gated pages see a valid admin user
        const qm: unknown[] = [];
        if (msg.modifications) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const mod of msg.modifications as any[]) {
            if (mod.type === "Add") {
              if (mod.udfPath.includes("currentUser")) {
                qm.push({
                  type: "QueryUpdated",
                  queryId: mod.queryId,
                  value: {
                    _id: "mock_user_001",
                    _creationTime: 1700000000000,
                    clerkId: "clerk_mock",
                    email: "admin@test.com",
                    name: "Test Admin",
                    role: "admin",
                    teamId: "mock_team_001",
                  },
                  logLines: [],
                });
              } else if (
                mod.udfPath.includes("getPlayers") ||
                mod.udfPath.includes("players")
              ) {
                qm.push({
                  type: "QueryUpdated",
                  queryId: mod.queryId,
                  value: [],
                  logLines: [],
                });
              } else {
                qm.push({
                  type: "QueryUpdated",
                  queryId: mod.queryId,
                  value: null,
                  logLines: [],
                });
              }
            }
          }
        }
        setTimeout(
          () => ws.send(transition(msg.newVersion, curId, qm)),
          20
        );
      }
      if (msg.type === "Mutation") {
        mutationCalls.push({
          udfPath: msg.udfPath,
          args: msg.args,
          requestId: msg.requestId,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any = null;
        if (msg.udfPath.includes("createPlayer"))
          result = "mock_player_id_123";
        else if (msg.udfPath.includes("generateUploadUrl"))
          result = "https://mock-convex-upload.test/upload";
        else if (msg.udfPath.includes("invitePlayer"))
          result = "mock_invite_id_456";

        const mutTs = encodeTs(tsCounter++);
        setTimeout(() => {
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
          setTimeout(
            () => ws.send(transition(curQS, curId)),
            80
          );
        }, 100);
      }
    });
  });

  return mutationCalls;
}

/** Wait for Next.js compilation and React hydration */
export async function waitForHydration(page: Page) {
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Compiling"),
      { timeout: 15000 }
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

/** Navigate to /players/new and wait for the form to be interactive */
export async function goToAddPlayerForm(page: Page): Promise<boolean> {
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
  await waitForHydration(page);
  await expect(page.locator("#firstName")).toBeVisible({ timeout: 5000 });
  await page.locator("#firstName").focus();
  await page.waitForTimeout(300);
  return true;
}

/** Navigate to /players/new with mutation mocking */
export async function goToFormWithMock(page: Page) {
  const mutationCalls = await mockConvexWithMutations(page);
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
  await waitForHydration(page);
  await expect(page.locator("#firstName")).toBeVisible({ timeout: 5000 });
  await page.locator("#firstName").focus();
  await page.waitForTimeout(300);
  return { ok: true as const, mutationCalls };
}

/** Fill the three required form fields (firstName, lastName, position) */
export async function fillRequiredFields(
  page: Page,
  opts?: { email?: string }
) {
  const firstName = page.locator("#firstName");
  await expect(firstName).toBeVisible({ timeout: 5000 });
  await firstName.focus();
  await page.waitForTimeout(300);
  await firstName.fill("Test");
  await expect(firstName).toHaveValue("Test", { timeout: 3000 });

  await page.locator("#lastName").fill("Player");
  await expect(page.locator("#lastName")).toHaveValue("Player", {
    timeout: 3000,
  });

  if (opts?.email) {
    await page.locator("#personalEmail").fill(opts.email);
  }

  const positionTrigger = page
    .locator("form [data-slot='select-trigger']")
    .first();
  await expect(positionTrigger).toBeVisible({ timeout: 5000 });
  await positionTrigger.click();
  await page.waitForTimeout(500);

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
