import { createSportMonksHandler } from "@/lib/sportmonks-handler";

export const dynamic = "force-dynamic";

export const GET = createSportMonksHandler({
  queryFile: "standings.sql",
  resource: "standings",
  optionalParams: ["seasonId", "competitionId"],
  buildParams: (params) => {
    const values: unknown[] = [];
    if (params.seasonId) {
      values.push(Number(params.seasonId));
    }
    if (params.competitionId) {
      values.push(Number(params.competitionId));
    }
    return values;
  },
  transformSql: (sql, params) => {
    const filters: string[] = [];
    let paramIdx = 1;

    if (params.seasonId) {
      filters.push(`and st.season_id = $${paramIdx}`);
      paramIdx++;
    }

    if (params.competitionId) {
      filters.push(`and st.league_id = $${paramIdx}`);
      paramIdx++;
    }

    return sql.replace(
      "{{FILTERS}}",
      filters.length > 0 ? filters.join("\n  ") : "",
    );
  },
});
