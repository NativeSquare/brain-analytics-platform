import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "match-id-from-sportmonks.sql",
  requiredParams: ["sportmonksTeamId", "opponentSportmonksTeamId", "matchDate"],
  buildParams: (p) => [
    Number(p.sportmonksTeamId),
    Number(p.opponentSportmonksTeamId),
    p.matchDate,
  ],
  transformResult: (rows) => ({
    data: { match_id: rows[0]?.match_id ?? null },
  }),
});
