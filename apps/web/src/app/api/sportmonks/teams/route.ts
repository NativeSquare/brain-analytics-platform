import { createSportMonksHandler } from "@/lib/sportmonks-handler";
import { rowsToCamel } from "@/lib/case-utils";

export const dynamic = "force-dynamic";

export const GET = createSportMonksHandler({
  queryFile: "teams.sql",
  resource: "teams",
  optionalParams: ["teamId"],
  buildParams: (params) => {
    const values: unknown[] = [];
    if (params.teamId) {
      values.push(Number(params.teamId));
    }
    return values;
  },
  transformSql: (sql, params) => {
    if (params.teamId) {
      return sql.replace("{{FILTERS}}", "where t.id = $1");
    }
    return sql.replace("{{FILTERS}}", "");
  },
  transformResult: (rows, params) => {
    const camelRows = rowsToCamel(rows);
    // Return single object when filtering by teamId
    if (params.teamId && camelRows.length > 0) {
      return { data: camelRows[0] };
    }
    return { data: camelRows };
  },
});
