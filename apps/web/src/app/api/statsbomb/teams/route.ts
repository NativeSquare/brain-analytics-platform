import { createStatsBombHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = createStatsBombHandler({
  queryFile: "teams.sql",
  requiredParams: [],
  buildParams: () => [],
});
