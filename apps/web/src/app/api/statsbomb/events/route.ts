import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "events.sql",
  requiredParams: ["matchId"],
  buildParams: (p) => [Number(p.matchId)],
});
