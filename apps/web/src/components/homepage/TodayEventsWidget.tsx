"use client";

import Link from "next/link";
import { format } from "date-fns";
import { IconCalendarEvent } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Types ---

export type CalendarEventSummary = {
  _id: string;
  name: string;
  eventType: "match" | "training" | "meeting" | "rehab";
  startsAt: number;
  endsAt: number;
  location?: string;
};

const eventTypeLabelMap: Record<CalendarEventSummary["eventType"], string> = {
  match: "Match",
  training: "Training",
  meeting: "Meeting",
  rehab: "Rehab",
};

// --- Component ---

interface TodayEventsWidgetProps {
  events?: CalendarEventSummary[];
}

export function TodayEventsWidget({ events }: TodayEventsWidgetProps) {
  const today = format(new Date(), "EEEE, d MMMM yyyy");
  const hasEvents = events && events.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCalendarEvent className="size-5 text-muted-foreground" aria-hidden="true" />
          Today&apos;s Events
        </CardTitle>
        <CardDescription>{today}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasEvents ? (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event._id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{event.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.startsAt), "HH:mm")} –{" "}
                    {format(new Date(event.endsAt), "HH:mm")}
                  </span>
                </div>
                <Badge variant="secondary">
                  {eventTypeLabelMap[event.eventType]}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <IconCalendarEvent className="size-10 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No events today</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href="/calendar"
          className="text-sm font-medium text-primary hover:underline"
        >
          View Calendar &rarr;
        </Link>
      </CardFooter>
    </Card>
  );
}
