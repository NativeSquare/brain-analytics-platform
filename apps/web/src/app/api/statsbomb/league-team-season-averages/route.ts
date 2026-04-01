import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "league-team-season-averages.sql",
  requiredParams: ["teamId", "seasonId"],
  buildParams: (p) => [Number(p.teamId), Number(p.seasonId)],
});
