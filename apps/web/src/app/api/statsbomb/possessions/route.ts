import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "possessions.sql",
  requiredParams: ["matchId"],
  buildParams: (p) => [Number(p.matchId)],
});
