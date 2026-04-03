"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import GraphInfoBadge from "./GraphInfoBadge";
import type { WinProbabilityRow } from "./types";

interface WinProbabilityBarProps {
  probabilities: WinProbabilityRow[];
  team1Id: number;
  team2Id: number;
  team1Color: string;
  team2Color: string;
  isLoading: boolean;
}

const WinProbabilityBar = ({
  probabilities,
  team1Id,
  team2Id,
  team1Color,
  team2Color,
  isLoading,
}: WinProbabilityBarProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const team1Prob = probabilities.find((p) => p.team_id === team1Id);
  const team2Prob = probabilities.find((p) => p.team_id === team2Id);

  const hasComplete = (
    row: WinProbabilityRow | undefined,
  ): row is WinProbabilityRow & {
    win_probability: number;
    draw_probability: number;
    loss_probability: number;
  } =>
    row != null &&
    row.win_probability != null &&
    row.draw_probability != null &&
    row.loss_probability != null &&
    Number.isFinite(row.win_probability) &&
    Number.isFinite(row.draw_probability) &&
    Number.isFinite(row.loss_probability);

  let winProb: number;
  let drawProb: number;
  let lossProb: number;

  if (hasComplete(team1Prob)) {
    winProb = team1Prob.win_probability;
    drawProb = team1Prob.draw_probability;
    lossProb = team1Prob.loss_probability;
  } else if (hasComplete(team2Prob)) {
    winProb = team2Prob.loss_probability;
    drawProb = team2Prob.draw_probability;
    lossProb = team2Prob.win_probability;
  } else {
    return null;
  }

  if (winProb < 0 || drawProb < 0 || lossProb < 0 || isNaN(winProb) || isNaN(drawProb) || isNaN(lossProb)) {
    return null;
  }

  // Minimum segment width for visibility, then normalize
  const minWidth = 0.05;
  const winW = Math.max(winProb, minWidth);
  const drawW = Math.max(drawProb, minWidth);
  const lossW = Math.max(lossProb, minWidth);
  const total = winW + drawW + lossW;
  const nWin = winW / total;
  const nDraw = drawW / total;
  const nLoss = lossW / total;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result Probability</CardTitle>
        <CardAction>
          <GraphInfoBadge text="Estimated full-time outcome probabilities for the selected match." />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex h-12 w-full overflow-hidden rounded">
          {/* Home win */}
          {nWin > 0 && (
            <div
              className="flex items-center justify-center text-sm font-medium text-white"
              style={{
                width: `${nWin * 100}%`,
                backgroundColor: team1Color,
                minWidth: nWin > 0 ? "40px" : "0",
              }}
            >
              {nWin > 0.05 && <span>{Math.round(nWin * 100)}%</span>}
            </div>
          )}
          {/* Draw */}
          {nDraw > 0 && (
            <div
              className="flex items-center justify-center text-sm font-medium text-white"
              style={{
                width: `${nDraw * 100}%`,
                backgroundColor: "#9e9e9e",
                minWidth: nDraw > 0 ? "40px" : "0",
              }}
            >
              {nDraw > 0.05 && <span>{Math.round(nDraw * 100)}%</span>}
            </div>
          )}
          {/* Away win */}
          {nLoss > 0 && (
            <div
              className="flex items-center justify-center text-sm font-medium text-white"
              style={{
                width: `${nLoss * 100}%`,
                backgroundColor: team2Color,
                minWidth: nLoss > 0 ? "40px" : "0",
              }}
            >
              {nLoss > 0.05 && <span>{Math.round(nLoss * 100)}%</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WinProbabilityBar;
