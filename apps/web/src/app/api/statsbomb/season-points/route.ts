import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "season-points.sql",
  requiredParams: ["teamId", "seasonId", "competitionId"],
  buildParams: (p) => [
    Number(p.teamId),
    Number(p.seasonId),
    Number(p.competitionId),
  ],
  transformResult: (rows) => {
    let cumulativePoints = 0;
    let cumulativeXPoints = 0;

    const data = rows.map((row) => {
      cumulativePoints += Number(row.points);
      const xPointsValue = Number(row.x_points ?? 0);
      cumulativeXPoints += xPointsValue;

      return {
        ...row,
        cumulative_points: cumulativePoints,
        cumulative_x_points: cumulativeXPoints,
      };
    });

    return { data };
  },
});
