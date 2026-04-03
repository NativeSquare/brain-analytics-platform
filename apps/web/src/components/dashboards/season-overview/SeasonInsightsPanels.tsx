"use client";

import type { SeasonPointsData } from "./types";
import { toNumber, getResultCode, getVenueCode, buildSplit, sortByMatchWeek } from "./utils";
import XPointsOverUnderCard from "./XPointsOverUnderCard";
import CurrentFormCard from "./CurrentFormCard";
import HomeVsAwayCard from "./HomeVsAwayCard";

interface SeasonInsightsPanelsProps {
  data: SeasonPointsData[];
}

export default function SeasonInsightsPanels({ data }: SeasonInsightsPanelsProps) {
  if (!data || data.length === 0) return null;

  const sorted = sortByMatchWeek(data);

  const totalPoints = sorted.reduce((sum, row) => sum + toNumber(row.points), 0);
  const totalXPoints = sorted.reduce(
    (sum, row) => sum + toNumber(row.xPoints),
    0,
  );
  const pointsDelta = totalPoints - totalXPoints;
  const pointsDeltaPerGame =
    sorted.length > 0 ? pointsDelta / sorted.length : 0;

  const last5 = sorted.slice(-5);
  const last10 = sorted.slice(-10);
  const formSequence = last5.map((row) => getResultCode(row.points));
  const form5Split = buildSplit(last5);
  const form10Split = buildSplit(last10);

  const homeRows = sorted.filter((row) => getVenueCode(row.venue) === "home");
  const awayRows = sorted.filter((row) => getVenueCode(row.venue) === "away");
  const homeSplit = buildSplit(homeRows);
  const awaySplit = buildSplit(awayRows);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <XPointsOverUnderCard
        totalPoints={totalPoints}
        totalXPoints={totalXPoints}
        pointsDelta={pointsDelta}
        pointsDeltaPerGame={pointsDeltaPerGame}
      />
      <CurrentFormCard
        formSequence={formSequence}
        form5Split={form5Split}
        form10Split={form10Split}
      />
      <HomeVsAwayCard homeSplit={homeSplit} awaySplit={awaySplit} />
    </div>
  );
}
