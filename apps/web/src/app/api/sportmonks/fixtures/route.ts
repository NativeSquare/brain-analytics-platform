import { createSportMonksHandler } from "@/lib/sportmonks-handler";
import { rowsToCamel } from "@/lib/case-utils";

export const dynamic = "force-dynamic";

export const GET = createSportMonksHandler({
  queryFile: "fixtures.sql",
  resource: "fixtures",
  optionalParams: ["teamId", "status", "limit"],
  buildParams: (params) => {
    const values: unknown[] = [];
    // $1 is always limit
    values.push(Number(params.limit) || 20);

    // Dynamic params start at $2
    if (params.teamId) {
      values.push(Number(params.teamId));
    }

    return values;
  },
  transformSql: (sql, params) => {
    const filters: string[] = [];
    let paramIdx = 2; // $1 is limit

    if (params.teamId) {
      filters.push(
        `and (ft_home.participant_id = $${paramIdx} or ft_away.participant_id = $${paramIdx})`,
      );
      paramIdx++;
    }

    if (params.status === "upcoming") {
      filters.push(`and f.starting_at >= (now() at time zone 'utc')`);
    } else if (params.status === "finished") {
      filters.push(`and f.state_id = 5`);
    }

    const filterClause = filters.length > 0 ? filters.join("\n  ") : "";

    // Order: upcoming = ascending, finished/default = descending
    const order =
      params.status === "upcoming"
        ? "f.starting_at asc"
        : "f.starting_at desc";

    return sql
      .replace("{{FILTERS}}", filterClause)
      .replace("{{ORDER}}", order);
  },
  transformResult: (rows) => {
    return { data: rowsToCamel(rows) };
  },
});
