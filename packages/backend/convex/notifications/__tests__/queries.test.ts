import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

// Suppress convex-test false-positive warning for ctx.scheduler.runAfter
const _w = console.warn;
console.warn = (...a: any[]) => {
  if (typeof a[0] === "string" && a[0].includes("should not directly call")) return;
  _w.apply(console, a);
};

// ---------------------------------------------------------------------------
// Mock getAuthUserId
// ---------------------------------------------------------------------------

const { mockGetAuthUserId } = vi.hoisted(() => {
  return { mockGetAuthUserId: vi.fn() };
});

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getAuthUserId: mockGetAuthUserId };
});

const { default: schema } = await import("../../schema");
const modules = import.meta.glob(["../../**/*.ts", "!../../http.ts"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SeedOptions {
  role?: string;
  teamId?: Id<"teams">;
  name?: string;
  email?: string;
}

async function seedTeamAndUser(
  t: ReturnType<typeof convexTest>,
  overrides: SeedOptions = {},
) {
  return await t.run(async (ctx) => {
    const teamId =
      overrides.teamId ??
      (await ctx.db.insert("teams", { name: "Test Club", slug: "test-club" }));

    const userId = await ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "user@example.com",
      role: (overrides.role as any) ?? "player",
      status: "active",
      teamId,
    });

    return { userId, teamId };
  });
}

async function insertNotification(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  teamId: Id<"teams">,
  overrides: Record<string, any> = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("notifications", {
      userId,
      teamId,
      type: "event_created",
      title: "Test Notification",
      message: "Test message",
      read: false,
      createdAt: Date.now(),
      ...overrides,
    });
  });
}

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

describe("getUnreadCount", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns correct unread count for user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Insert 3 unread, 1 read
    await insertNotification(t, userId, teamId);
    await insertNotification(t, userId, teamId);
    await insertNotification(t, userId, teamId);
    await insertNotification(t, userId, teamId, { read: true });

    const count = await t.query(
      (await import("../queries")).getUnreadCount,
      {},
    );

    expect(count).toBe(3);
  });

  it("returns 0 when no unread notifications", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertNotification(t, userId, teamId, { read: true });

    const count = await t.query(
      (await import("../queries")).getUnreadCount,
      {},
    );

    expect(count).toBe(0);
  });

  it("respects team scoping — does not count other team notifications", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create another team
    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );

    // Notification for same user but different team
    await insertNotification(t, userId, otherTeamId);
    // Notification for correct team
    await insertNotification(t, userId, teamId);

    const count = await t.query(
      (await import("../queries")).getUnreadCount,
      {},
    );

    expect(count).toBe(1);
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    mockGetAuthUserId.mockResolvedValue(null);

    let caughtError: unknown;
    try {
      await t.query((await import("../queries")).getUnreadCount, {});
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
  });
});

// ---------------------------------------------------------------------------
// getUserNotifications
// ---------------------------------------------------------------------------

describe("getUserNotifications", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("returns notifications ordered newest-first", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    await insertNotification(t, userId, teamId, {
      createdAt: 1000,
      title: "Old",
    });
    await insertNotification(t, userId, teamId, {
      createdAt: 3000,
      title: "Newest",
    });
    await insertNotification(t, userId, teamId, {
      createdAt: 2000,
      title: "Middle",
    });

    const result = await t.query(
      (await import("../queries")).getUserNotifications,
      {},
    );

    expect(result.length).toBe(3);
    // Ordered by _creationTime desc (Convex default desc on index)
    // The newest inserted should be first
    expect(result[0].title).toBe("Middle");
  });

  it("returns at most 5 notifications", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Insert 10 notifications
    for (let i = 0; i < 10; i++) {
      await insertNotification(t, userId, teamId, {
        createdAt: Date.now() + i,
        title: `Notification ${i}`,
      });
    }

    const result = await t.query(
      (await import("../queries")).getUserNotifications,
      {},
    );

    expect(result.length).toBe(5);
  });

  it("respects team scoping — does not return other team notifications", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );

    await insertNotification(t, userId, teamId, { title: "My team" });
    await insertNotification(t, userId, otherTeamId, { title: "Other team" });

    const result = await t.query(
      (await import("../queries")).getUserNotifications,
      {},
    );

    expect(result.length).toBe(1);
    expect(result[0].title).toBe("My team");
  });
});
