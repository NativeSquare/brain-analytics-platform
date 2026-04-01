import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "league-player-season-stats.sql",
  requiredParams: ["competitionId", "seasonId"],
  optionalParams: ["minMinutes"],
  buildParams: (p) => [
    Number(p.competitionId),
    Number(p.seasonId),
    Number(p.minMinutes ?? "300"),
  ],
});
