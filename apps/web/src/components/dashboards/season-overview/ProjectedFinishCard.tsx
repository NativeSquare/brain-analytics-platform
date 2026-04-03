"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classifyPace, TOTAL_GAMES } from "./utils";

interface ProjectedFinishCardProps {
  gamesPlayed: number;
  remainingGames: number;
  currentPpg: number;
  currentXppg: number;
  projectedPoints: number;
  projectedXPoints: number;
  projectedAdditionalPoints: number;
  projectedAdditionalXPoints: number;
}

export default function ProjectedFinishCard({
  gamesPlayed,
  remainingGames,
  currentPpg,
  currentXppg,
  projectedPoints,
  projectedXPoints,
  projectedAdditionalPoints,
  projectedAdditionalXPoints,
}: ProjectedFinishCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projected Finish</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground">Games Played</p>
            <p className="text-lg font-semibold">
              {gamesPlayed}/{TOTAL_GAMES}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Games Remaining</p>
            <p className="text-lg font-semibold">{remainingGames}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current PPG</p>
            <p className="font-semibold">{currentPpg.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current xPPG</p>
            <p className="font-semibold">{currentXppg.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-muted-foreground">
            Projected Finish (Points Pace)
          </p>
          <p className="text-2xl font-semibold">
            {projectedPoints.toFixed(0)} pts
          </p>
          <p className="text-xs text-muted-foreground">
            +{projectedAdditionalPoints.toFixed(1)} more points at current pace
          </p>
          <p className="mt-1 text-xs font-medium text-primary">
            {classifyPace(projectedPoints)}
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-muted-foreground">
            Projected Finish (xPoints Pace)
          </p>
          <p className="text-2xl font-semibold">
            {projectedXPoints.toFixed(0)} pts
          </p>
          <p className="text-xs text-muted-foreground">
            +{projectedAdditionalXPoints.toFixed(1)} expected points
          </p>
          <p className="mt-1 text-xs font-medium text-primary">
            {classifyPace(projectedXPoints)}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Based on current rate. Projections update after each matchday.
        </p>
      </CardContent>
    </Card>
  );
}
