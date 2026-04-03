"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PhaseRating } from "./types";

interface PhaseOfPlayRatingsProps {
  phases: PhaseRating[];
}

const RATING_STYLES: Record<string, string> = {
  Strong:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  Average:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Weak: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const BAR_COLORS: Record<string, string> = {
  Strong: "bg-emerald-500",
  Average: "bg-amber-500",
  Weak: "bg-red-500",
};

export default function PhaseOfPlayRatings({
  phases,
}: PhaseOfPlayRatingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase of Play Ratings</CardTitle>
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available</p>
        ) : (
          <div className="space-y-5">
            {phases.map((p) => (
              <div key={p.phase}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{p.phase}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RATING_STYLES[p.rating]}`}
                  >
                    {p.rating}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${BAR_COLORS[p.rating]}`}
                    style={{ width: `${Math.min(p.score, 100)}%` }}
                  />
                </div>

                {/* Contributing metrics */}
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                  {p.metrics.map((m) => (
                    <span
                      key={m.label}
                      className="text-xs text-muted-foreground"
                    >
                      {m.label}: {m.value.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
