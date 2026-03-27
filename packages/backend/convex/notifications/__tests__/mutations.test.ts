import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../_generated/dataModel";

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
const modules = import.meta.glob("../../**/*.ts");

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
// markRead
// ---------------------------------------------------------------------------

describe("markRead", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("marks a single notification as read", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const notifId = await insertNotification(t, userId, teamId);

    await t.mutation(
      (await import("../mutations")).markRead,
      { notificationId: notifId },
    );

    const updated = await t.run(async (ctx) => ctx.db.get(notifId));
    expect(updated!.read).toBe(true);
  });

  it("rejects if notification belongs to another user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);

    // Create another user in same team
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Other User",
        email: "other@example.com",
        role: "player" as any,
        status: "active",
        teamId,
      }),
    );

    // Notification belongs to otherUser
    const notifId = await insertNotification(t, otherUserId, teamId);

    // Authenticate as first user
    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).markRead,
        { notificationId: notifId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_AUTHORIZED");
  });

  it("rejects if notification belongs to another team", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );

    // Notification has userId match but different team
    const notifId = await insertNotification(t, userId, otherTeamId);

    mockGetAuthUserId.mockResolvedValue(userId);

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).markRead,
        { notificationId: notifId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_AUTHORIZED");
  });

  it("throws NOT_FOUND for non-existent notification", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    // Create a valid notification to get a properly typed ID, then delete it
    const { teamId } = await t.run(async (ctx) => {
      const user = (await ctx.db.get(userId))!;
      return { teamId: user.teamId! };
    });
    const notifId = await insertNotification(t, userId, teamId);
    await t.run(async (ctx) => ctx.db.delete(notifId));

    let caughtError: unknown;
    try {
      await t.mutation(
        (await import("../mutations")).markRead,
        { notificationId: notifId },
      );
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ConvexError);
    const rawData = (caughtError as ConvexError<any>).data;
    const errData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    expect(errData.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// markAllRead
// ---------------------------------------------------------------------------

describe("markAllRead", () => {
  beforeEach(() => {
    mockGetAuthUserId.mockReset();
  });

  it("marks all unread notifications as read for the user", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const notifId1 = await insertNotification(t, userId, teamId);
    const notifId2 = await insertNotification(t, userId, teamId);
    const notifId3 = await insertNotification(t, userId, teamId, { read: true });

    const result = await t.mutation(
      (await import("../mutations")).markAllRead,
      {},
    );

    expect(result.updated).toBe(2);

    const n1 = await t.run(async (ctx) => ctx.db.get(notifId1));
    const n2 = await t.run(async (ctx) => ctx.db.get(notifId2));
    const n3 = await t.run(async (ctx) => ctx.db.get(notifId3));

    expect(n1!.read).toBe(true);
    expect(n2!.read).toBe(true);
    expect(n3!.read).toBe(true); // Was already read
  });

  it("does not affect other team's notifications", async () => {
    const t = convexTest(schema, modules);
    const { userId, teamId } = await seedTeamAndUser(t);
    mockGetAuthUserId.mockResolvedValue(userId);

    const otherTeamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Other Team", slug: "other-team" }),
    );

    await insertNotification(t, userId, teamId);
    const otherNotifId = await insertNotification(t, userId, otherTeamId);

    await t.mutation(
      (await import("../mutations")).markAllRead,
      {},
    );

    // The other-team notification should remain unread
    const otherNotif = await t.run(async (ctx) => ctx.db.get(otherNotifId));
    expect(otherNotif!.read).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createNotification utility
// ---------------------------------------------------------------------------

describe("createNotification utility", () => {
  it("inserts one notification per userId", async () => {
    const t = convexTest(schema, modules);
    const { teamId } = await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        name: "Test Club",
        slug: "test-club",
      });
      return { teamId };
    });

    const userIds = await t.run(async (ctx) => {
      const ids: Id<"users">[] = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          await ctx.db.insert("users", {
            name: `User ${i}`,
            email: `user${i}@example.com`,
            role: "player" as any,
            status: "active",
            teamId,
          }),
        );
      }
      return ids;
    });

    // Call createNotification inside a mutation context
    await t.run(async (ctx) => {
      const { createNotification } = await import("../../lib/notifications");
      await createNotification(ctx, {
        userIds,
        teamId,
        type: "event_created",
        title: "Match Created",
        message: "A new match has been scheduled",
        relatedEntityId: "some-event-id",
      });
    });

    // Verify 3 notifications created
    const all = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );
    expect(all.length).toBe(3);
    expect(all.every((n) => n.type === "event_created")).toBe(true);
    expect(all.every((n) => n.read === false)).toBe(true);
    expect(all.every((n) => n.teamId === teamId)).toBe(true);
    expect(all.every((n) => n.relatedEntityId === "some-event-id")).toBe(true);
  });

  it("silently skips when userIds array is empty", async () => {
    const t = convexTest(schema, modules);
    const teamId = await t.run(async (ctx) =>
      ctx.db.insert("teams", { name: "Test Club", slug: "test-club" }),
    );

    await t.run(async (ctx) => {
      const { createNotification } = await import("../../lib/notifications");
      await createNotification(ctx, {
        userIds: [],
        teamId,
        type: "event_created",
        title: "No Recipients",
        message: "Should not insert anything",
      });
    });

    const all = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );
    expect(all.length).toBe(0);
  });
});
