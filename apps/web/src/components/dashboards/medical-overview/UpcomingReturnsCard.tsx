"use client";

import { CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUpcomingReturns } from "./mock-data";

/**
 * Upcoming Returns widget.
 * Story 14.3 AC #13: Players expected back within 14 days.
 */
export default function UpcomingReturnsCard() {
  // Already sorted by nearest return date first
  const returns = mockUpcomingReturns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Returns (14 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {returns.map((player) => (
            <li
              key={player.id}
              className="flex items-start justify-between rounded-lg border p-3"
            >
              <div className="space-y-0.5">
                <p className="font-medium">{player.playerName}</p>
                <p className="text-muted-foreground text-sm">
                  {player.injuryType}
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {player.expectedReturnDate}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {player.daysUntilReturn} day
                    {player.daysUntilReturn !== 1 ? "s" : ""} left
                  </p>
                </div>
                <CalendarCheck className="text-muted-foreground size-4 shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
