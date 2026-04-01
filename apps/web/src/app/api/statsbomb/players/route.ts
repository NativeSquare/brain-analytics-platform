import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "players-search.sql",
  requiredParams: ["competitionId", "seasonId"],
  optionalParams: ["teamId", "position", "search"],
  buildParams: (p) => [
    Number(p.competitionId),
    Number(p.seasonId),
    p.teamId ? Number(p.teamId) : null,
    p.position ?? null,
    p.search ?? null,
  ],
});
