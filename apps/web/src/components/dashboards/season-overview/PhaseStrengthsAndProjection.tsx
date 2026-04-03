"use client";

import type { SeasonPointsData, TeamPhaseAverages, PhaseRow } from "./types";
import { TOTAL_GAMES, sortByMatchWeek } from "./utils";
import PhaseStrengthsCard from "./PhaseStrengthsCard";
import ProjectedFinishCard from "./ProjectedFinishCard";

interface PhaseStrengthsAndProjectionProps {
  pointsData: SeasonPointsData[];
  phaseAverages: TeamPhaseAverages | null;
}

function buildPhaseRows(phaseAverages: TeamPhaseAverages | null): PhaseRow[] {
  if (!phaseAverages) return [];
  return [
    {
      key: "build_up",
      label: "Build-up",
      goalsDelta:
        phaseAverages.build_up_goals_for -
        phaseAverages.build_up_goals_against,
      xtDelta:
        phaseAverages.build_up_xt_for - phaseAverages.build_up_xt_against,
      xgDelta:
        phaseAverages.build_up_xg_for - phaseAverages.build_up_xg_against,
      score:
        (phaseAverages.build_up_xg_for - phaseAverages.build_up_xg_against) *
          2 +
        (phaseAverages.build_up_goals_for -
          phaseAverages.build_up_goals_against),
    },
    {
      key: "transition",
      label: "Transition",
      goalsDelta:
        phaseAverages.transition_goals_for -
        phaseAverages.transition_goals_against,
      xtDelta:
        phaseAverages.transition_xt_for - phaseAverages.transition_xt_against,
      xgDelta:
        phaseAverages.transition_xg_for - phaseAverages.transition_xg_against,
      score:
        (phaseAverages.transition_xg_for -
          phaseAverages.transition_xg_against) *
          2 +
        (phaseAverages.transition_goals_for -
          phaseAverages.transition_goals_against),
    },
    {
      key: "set_piece",
      label: "Set Piece",
      goalsDelta:
        phaseAverages.set_piece_goals_for -
        phaseAverages.set_piece_goals_against,
      xtDelta:
        phaseAverages.set_piece_xt_for - phaseAverages.set_piece_xt_against,
      xgDelta:
        phaseAverages.set_piece_xg_for - phaseAverages.set_piece_xg_against,
      score:
        (phaseAverages.set_piece_xg_for -
          phaseAverages.set_piece_xg_against) *
          2 +
        (phaseAverages.set_piece_goals_for -
          phaseAverages.set_piece_goals_against),
    },
  ];
}

export default function PhaseStrengthsAndProjection({
  pointsData,
  phaseAverages,
}: PhaseStrengthsAndProjectionProps) {
  if (!pointsData || pointsData.length === 0) return null;

  const sortedPoints = sortByMatchWeek(pointsData);

  const gamesPlayed = sortedPoints.length;
  const lastMatch = sortedPoints[gamesPlayed - 1];
  const currentPoints = Number(lastMatch?.cumulative_points ?? 0);
  const currentXPoints = Number(lastMatch?.cumulative_xPoints ?? 0);
  const currentPpg = gamesPlayed > 0 ? currentPoints / gamesPlayed : 0;
  const currentXppg = gamesPlayed > 0 ? currentXPoints / gamesPlayed : 0;
  const projectedPoints = currentPpg * TOTAL_GAMES;
  const projectedXPoints = currentXppg * TOTAL_GAMES;
  const remainingGames = Math.max(TOTAL_GAMES - gamesPlayed, 0);
  const projectedAdditionalPoints = projectedPoints - currentPoints;
  const projectedAdditionalXPoints = projectedXPoints - currentXPoints;

  const phaseRows = buildPhaseRows(phaseAverages);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <PhaseStrengthsCard phaseRows={phaseRows} />
      <ProjectedFinishCard
        gamesPlayed={gamesPlayed}
        remainingGames={remainingGames}
        currentPpg={currentPpg}
        currentXppg={currentXppg}
        projectedPoints={projectedPoints}
        projectedXPoints={projectedXPoints}
        projectedAdditionalPoints={projectedAdditionalPoints}
        projectedAdditionalXPoints={projectedAdditionalXPoints}
      />
    </div>
  );
}
