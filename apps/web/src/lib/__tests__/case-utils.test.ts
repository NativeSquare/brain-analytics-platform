import { describe, it, expect } from "vitest";

import { snakeToCamel, rowToCamel, rowsToCamel } from "../case-utils";

describe("snakeToCamel", () => {
  it("converts simple snake_case to camelCase", () => {
    expect(snakeToCamel("starting_at")).toBe("startingAt");
  });

  it("converts multiple underscores", () => {
    expect(snakeToCamel("goal_difference")).toBe("goalDifference");
    expect(snakeToCamel("home_team_name")).toBe("homeTeamName");
    expect(snakeToCamel("goals_for")).toBe("goalsFor");
  });

  it("returns the same string when there are no underscores", () => {
    expect(snakeToCamel("id")).toBe("id");
    expect(snakeToCamel("name")).toBe("name");
    expect(snakeToCamel("points")).toBe("points");
  });

  it("handles single character segments", () => {
    expect(snakeToCamel("a_b_c")).toBe("aBC");
  });

  it("does not alter already camelCase strings", () => {
    expect(snakeToCamel("startingAt")).toBe("startingAt");
  });

  it("converts leading underscore followed by a letter", () => {
    // The regex treats _x the same regardless of position
    expect(snakeToCamel("_private")).toBe("Private");
  });

  it("handles empty string", () => {
    expect(snakeToCamel("")).toBe("");
  });

  it("handles trailing underscore", () => {
    expect(snakeToCamel("name_")).toBe("name_");
  });
});

describe("rowToCamel", () => {
  it("converts all snake_case keys to camelCase", () => {
    const row = {
      home_team_id: 1,
      away_team_id: 2,
      starting_at: "2025-01-01",
      competition_name: "Premier League",
    };

    const result = rowToCamel(row);

    expect(result).toEqual({
      homeTeamId: 1,
      awayTeamId: 2,
      startingAt: "2025-01-01",
      competitionName: "Premier League",
    });
  });

  it("preserves values including null and undefined", () => {
    const row = { home_score: null, away_score: undefined, id: 42 };
    const result = rowToCamel(row);

    expect(result).toEqual({ homeScore: null, awayScore: undefined, id: 42 });
  });

  it("does not mutate the original row", () => {
    const row = { team_id: 5 };
    rowToCamel(row);
    expect(row).toEqual({ team_id: 5 });
  });
});

describe("rowsToCamel", () => {
  it("converts an array of rows", () => {
    const rows = [
      { team_id: 1, team_name: "A" },
      { team_id: 2, team_name: "B" },
    ];

    const result = rowsToCamel(rows);

    expect(result).toEqual([
      { teamId: 1, teamName: "A" },
      { teamId: 2, teamName: "B" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(rowsToCamel([])).toEqual([]);
  });
});
