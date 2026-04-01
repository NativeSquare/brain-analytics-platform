import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "default-season.sql",
  requiredParams: ["teamId"],
  buildParams: (p) => [Number(p.teamId)],
  transformResult: (rows) => ({ data: rows[0] ?? null }),
});
