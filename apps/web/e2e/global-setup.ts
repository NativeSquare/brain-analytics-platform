/**
 * Vitest globalSetup — starts the Next.js dev server on port 4500
 * before Stagehand E2E tests run, mirroring playwright.config.ts webServer.
 */
import { type ChildProcess, spawn } from "node:child_process";

const PORT = 4500;
const BASE = `http://localhost:${PORT}`;
const STARTUP_TIMEOUT = 120_000; // 2 min, same as playwright

let server: ChildProcess | null = null;

async function waitForServer(url: string, timeout: number): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true; // 2xx/3xx/4xx all mean the server is up
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}

export async function setup(): Promise<void> {
  // Re-use an already-running server (matches playwright reuseExistingServer)
  try {
    const res = await fetch(BASE);
    if (res.status < 500) {
      console.log(`[e2e-setup] Server already running at ${BASE}`);
      return;
    }
  } catch {
    /* not running — will start */
  }

  console.log(`[e2e-setup] Starting Next.js dev server on port ${PORT}…`);
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: process.cwd(), // vitest is invoked from apps/web
    stdio: "pipe",
    shell: true,
  });

  server.stdout?.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[next-dev] ${msg}`);
  });
  server.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[next-dev:err] ${msg}`);
  });

  const ready = await waitForServer(BASE, STARTUP_TIMEOUT);
  if (ready) {
    console.log(`[e2e-setup] Dev server ready at ${BASE}`);
  } else {
    console.warn(`[e2e-setup] Dev server failed to start within ${STARTUP_TIMEOUT}ms — tests will run but may fail`);
  }
}

export async function teardown(): Promise<void> {
  if (server) {
    console.log("[e2e-setup] Stopping dev server…");
    server.kill("SIGTERM");
    server = null;
  }
}
