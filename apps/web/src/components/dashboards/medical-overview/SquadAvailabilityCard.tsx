"use client";

import { Card, CardContent } from "@/components/ui/card";

interface SquadAvailabilityData {
  totalPlayers: number;
  injuredPlayers: number;
  availablePercentage: number;
}

/**
 * Squad Availability widget.
 * Story 14.3 AC #11: Big number showing % of squad available.
 */
export default function SquadAvailabilityCard({
  data,
}: {
  data: SquadAvailabilityData;
}) {
  const colorClass =
    data.availablePercentage >= 85
      ? "text-green-600 dark:text-green-400"
      : data.availablePercentage >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const bgClass =
    data.availablePercentage >= 85
      ? "bg-green-50 dark:bg-green-950/30"
      : data.availablePercentage >= 70
        ? "bg-amber-50 dark:bg-amber-950/30"
        : "bg-red-50 dark:bg-red-950/30";

  return (
    <Card className={`h-full ${bgClass}`}>
      <CardContent className="flex h-full flex-col items-center justify-center py-6">
        <p className="text-muted-foreground mb-1 text-sm font-medium">
          Squad Availability
        </p>
        <p className={`text-5xl font-bold ${colorClass}`}>
          {data.availablePercentage}%
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          {data.totalPlayers - data.injuredPlayers} of {data.totalPlayers}{" "}
          players available
        </p>
      </CardContent>
    </Card>
  );
}
