"use client";

import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  IconCalendarClock,
  IconArrowRight,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodayEventsCard() {
  const { t } = useTranslation();
  const { isAuthenticated } = useConvexAuth();

  // Get the start of today as a UTC-midnight timestamp
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const events = useQuery(
    api.calendar.queries.getDayEvents,
    isAuthenticated ? { date: todayStart.getTime() } : "skip",
  );

  const isLoading = events === undefined;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <IconCalendarClock
            className="size-5 text-primary"
            aria-hidden="true"
          />
          {t.home.todayEvents}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 rounded-full bg-muted p-3">
              <IconCalendarClock
                className="size-6 text-muted-foreground/40"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.home.noEventsToday}
            </p>
          </div>
        ) : (
          events.map((event) => {
            const timeStr = new Date(event.startsAt).toLocaleTimeString(
              "en-GB",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              },
            );
            const [hour, minute] = timeStr.split(":");
            return (
              <div
                key={event._id}
                className="group relative flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-2 py-1.5 min-w-[50px]">
                  <span className="text-lg font-black leading-none">
                    {hour}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    :{minute}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{event.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {event.eventType}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      <div className="p-6 pt-0">
        <Button asChild className="w-full justify-between" variant="outline">
          <Link href="/calendar">
            {t.home.openCalendar}
            <IconArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
