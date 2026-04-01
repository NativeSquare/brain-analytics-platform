import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "player-season-stats.sql",
  requiredParams: ["playerId", "competitionId", "seasonId"],
  buildParams: (p) => [
    Number(p.playerId),
    Number(p.competitionId),
    Number(p.seasonId),
  ],
  transformResult: (rows) => ({ data: rows[0] ?? null }),
});
