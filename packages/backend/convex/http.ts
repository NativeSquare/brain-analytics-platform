import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { resend } from "./emails";
import { generateIcsCalendar } from "./calendar/ics";
import type { IcsEvent } from "./calendar/ics";

const http = httpRouter();

// Auth routes
auth.addHttpRoutes(http);

// Resend webhook for email delivery tracking
// Set up webhook in Resend dashboard pointing to:
// https://<your-deployment>.convex.site/resend-webhook
// Enable all email.* events and set RESEND_WEBHOOK_SECRET env var
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

// ---------------------------------------------------------------------------
// Calendar .ics feed endpoint (Story 3.5)
// GET /api/calendar/{token}
// ---------------------------------------------------------------------------

http.route({
  pathPrefix: "/api/calendar/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    // Extract token from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/calendar/{token} → parts: ["", "api", "calendar", "{token}"]
    const token = pathParts[3];

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Look up user by feed token
    const user = await ctx.runQuery(
      internal.calendar.internalQueries.getUserByFeedToken,
      { token },
    );

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Fetch user's accessible events + team name
    const { events, teamName } = await ctx.runQuery(
      internal.calendar.internalQueries.getFeedEvents,
      { userId: user._id },
    );

    // Convert to ICS events
    const icsEvents: IcsEvent[] = events.map((event: any) => ({
      uid: event._id as string,
      summary: event.name,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      eventType: event.eventType,
      createdAt: event.createdAt,
    }));

    // Generate ICS output
    const calendarName = `BrainAnalytics - ${teamName} Events`;
    const icsBody = generateIcsCalendar(icsEvents, calendarName);

    return new Response(icsBody, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }),
});

export default http;
