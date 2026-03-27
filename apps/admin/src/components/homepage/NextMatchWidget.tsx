"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  IconCalendarEvent,
  IconMapPin,
  IconTrophy,
} from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Types ---

export type NextMatchData = {
  _id: string;
  name: string;
  startsAt: number;
  location?: string;
};

// --- Component ---

interface NextMatchWidgetProps {
  match?: NextMatchData;
}

export function NextMatchWidget({ match }: NextMatchWidgetProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTrophy className="size-5 text-muted-foreground" />
          Next Match
        </CardTitle>
      </CardHeader>
      <CardContent>
        {match ? (
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold">{match.name}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <IconCalendarEvent className="size-4" />
              <span>{format(new Date(match.startsAt), "EEEE, d MMMM yyyy 'at' HH:mm")}</span>
            </div>
            {match.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <IconMapPin className="size-4" />
                <span>{match.location}</span>
              </div>
            )}
            <p className="mt-1 text-sm font-medium text-primary">
              {formatDistanceToNow(new Date(match.startsAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <IconCalendarEvent className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No upcoming matches
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
