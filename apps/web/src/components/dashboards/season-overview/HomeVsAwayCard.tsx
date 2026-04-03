"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Plane } from "lucide-react";
import { formatSigned, formatPpg } from "./utils";
import type { PerformanceSplit } from "./types";

interface HomeVsAwayCardProps {
  homeSplit: PerformanceSplit;
  awaySplit: PerformanceSplit;
}

export default function HomeVsAwayCard({
  homeSplit,
  awaySplit,
}: HomeVsAwayCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Home vs Away</CardTitle>
      </CardHeader>
      <CardContent className="grid flex-1 grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border bg-muted/20 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-muted pb-2">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Home className="size-4 text-primary" />
            </div>
            <p className="font-semibold text-primary">Home</p>
          </div>
          <div className="mt-1 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Games</span>
              <span className="font-medium">{homeSplit.games}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">W-D-L</span>
              <span className="font-medium">
                {homeSplit.wins}-{homeSplit.draws}-{homeSplit.losses}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PPG</span>
              <span className="font-medium">{formatPpg(homeSplit.ppg)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">GF/GA</span>
              <span className="font-medium">
                {homeSplit.goalsFor}/{homeSplit.goalsAgainst}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-muted/60 pt-2">
              <span className="font-medium text-muted-foreground">GD</span>
              <span
                className={`font-semibold ${homeSplit.goalDiff > 0 ? "text-green-600 dark:text-green-500" : homeSplit.goalDiff < 0 ? "text-red-600 dark:text-red-500" : ""}`}
              >
                {formatSigned(homeSplit.goalDiff, 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border bg-muted/20 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-muted pb-2">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Plane className="size-4 text-primary" />
            </div>
            <p className="font-semibold text-primary">Away</p>
          </div>
          <div className="mt-1 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Games</span>
              <span className="font-medium">{awaySplit.games}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">W-D-L</span>
              <span className="font-medium">
                {awaySplit.wins}-{awaySplit.draws}-{awaySplit.losses}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PPG</span>
              <span className="font-medium">{formatPpg(awaySplit.ppg)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">GF/GA</span>
              <span className="font-medium">
                {awaySplit.goalsFor}/{awaySplit.goalsAgainst}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-muted/60 pt-2">
              <span className="font-medium text-muted-foreground">GD</span>
              <span
                className={`font-semibold ${awaySplit.goalDiff > 0 ? "text-green-600 dark:text-green-500" : awaySplit.goalDiff < 0 ? "text-red-600 dark:text-red-500" : ""}`}
              >
                {formatSigned(awaySplit.goalDiff, 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
