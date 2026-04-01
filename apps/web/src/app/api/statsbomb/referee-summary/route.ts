import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "referee-summary.sql",
  requiredParams: ["refereeId"],
  optionalParams: ["locale"],
  buildParams: (p) => [Number(p.refereeId), p.locale === "it" ? "it" : "en"],
  transformResult: (rows) => ({ data: rows[0] ?? null }),
});
