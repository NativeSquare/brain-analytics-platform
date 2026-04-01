import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "match-stats.sql",
  requiredParams: ["matchId"],
  buildParams: (p) => [Number(p.matchId)],
});
