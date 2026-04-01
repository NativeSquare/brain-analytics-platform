import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "teams-by-competition.sql",
  requiredParams: ["competitionId"],
  buildParams: (p) => [Number(p.competitionId)],
});
