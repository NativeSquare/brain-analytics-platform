"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSigned } from "./utils";

interface XPointsOverUnderCardProps {
  totalPoints: number;
  totalXPoints: number;
  pointsDelta: number;
  pointsDeltaPerGame: number;
}

export default function XPointsOverUnderCard({
  totalPoints,
  totalXPoints,
  pointsDelta,
  pointsDeltaPerGame,
}: XPointsOverUnderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>xPoints Over/Under</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Points</p>
          <p className="text-xl font-semibold">{totalPoints.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">xPoints</p>
          <p className="text-xl font-semibold">{totalXPoints.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Delta</p>
          <p
            className={`text-xl font-semibold ${pointsDelta >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatSigned(pointsDelta, 1)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Delta / Game</p>
          <p
            className={`text-xl font-semibold ${
              pointsDeltaPerGame >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatSigned(pointsDeltaPerGame, 2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
