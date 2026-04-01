import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import {
  createStatsBombHandler,
  createMultiQueryHandler,
} from "../api-handler";

// Mock the statsbomb-db module
vi.mock("../statsbomb-db", () => ({
  query: vi.fn(),
}));

// Mock the load-query module
vi.mock("../load-query", () => ({
  loadQuery: vi.fn((filename: string) => `SELECT * FROM ${filename}`),
}));

import { query } from "../statsbomb-db";
import { loadQuery } from "../load-query";

const mockedQuery = vi.mocked(query);
const mockedLoadQuery = vi.mocked(loadQuery);

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("createStatsBombHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when a required param is missing", async () => {
    const handler = createStatsBombHandler({
      queryFile: "teams.sql",
      requiredParams: ["teamId", "seasonId"],
      buildParams: (p) => [Number(p.teamId), Number(p.seasonId)],
    });

    const response = await handler(makeRequest("/api/test?teamId=1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing required parameter: seasonId");
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("returns 400 for the first missing required param", async () => {
    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: ["a", "b", "c"],
      buildParams: () => [],
    });

    const response = await handler(makeRequest("/api/test"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing required parameter: a");
  });

  it("returns { data: rows } on success with required params", async () => {
    mockedQuery.mockResolvedValue([
      { id: 1, name: "Team A" },
      { id: 2, name: "Team B" },
    ]);

    const handler = createStatsBombHandler({
      queryFile: "teams.sql",
      requiredParams: ["competitionId"],
      buildParams: (p) => [Number(p.competitionId)],
    });

    const response = await handler(
      makeRequest("/api/test?competitionId=42"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      { id: 1, name: "Team A" },
      { id: 2, name: "Team B" },
    ]);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.any(String),
      [42],
    );
  });

  it("passes optional params to buildParams when present", async () => {
    mockedQuery.mockResolvedValue([]);

    const buildParams = vi.fn((p: Record<string, string>) => [
      Number(p.competitionId),
      p.position ?? null,
    ]);

    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: ["competitionId"],
      optionalParams: ["position"],
      buildParams,
    });

    await handler(
      makeRequest("/api/test?competitionId=1&position=GK"),
    );

    expect(buildParams).toHaveBeenCalledWith({
      competitionId: "1",
      position: "GK",
    });
  });

  it("does NOT include optional params when absent", async () => {
    mockedQuery.mockResolvedValue([]);

    const buildParams = vi.fn((p: Record<string, string>) => [
      Number(p.competitionId),
      p.position ?? null,
    ]);

    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: ["competitionId"],
      optionalParams: ["position"],
      buildParams,
    });

    await handler(makeRequest("/api/test?competitionId=1"));

    // position key should NOT be in the params map
    expect(buildParams).toHaveBeenCalledWith({ competitionId: "1" });
  });

  it("returns { data: [] } for empty result sets (not 404)", async () => {
    mockedQuery.mockResolvedValue([]);

    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: [],
      buildParams: () => [],
    });

    const response = await handler(makeRequest("/api/test"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns 500 on DB error without leaking details", async () => {
    mockedQuery.mockRejectedValue(new Error("connection refused"));

    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: [],
      buildParams: () => [],
    });

    const response = await handler(makeRequest("/api/test"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
    // Must NOT contain the raw error message
    expect(JSON.stringify(body)).not.toContain("connection refused");
  });

  it("applies transformResult when provided", async () => {
    mockedQuery.mockResolvedValue([{ season_id: 90 }]);

    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: ["teamId"],
      buildParams: (p) => [Number(p.teamId)],
      transformResult: (rows) => ({ data: rows[0] ?? null }),
    });

    const response = await handler(makeRequest("/api/test?teamId=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ season_id: 90 });
  });

  it("applies transformSql before executing the query", async () => {
    mockedLoadQuery.mockReturnValue("SELECT * WHERE {{FILTER}}");
    mockedQuery.mockResolvedValue([]);

    const handler = createStatsBombHandler({
      queryFile: "test.sql",
      requiredParams: [],
      buildParams: () => [],
      transformSql: (sql) => sql.replace("{{FILTER}}", "1=1"),
    });

    await handler(makeRequest("/api/test"));

    expect(mockedQuery).toHaveBeenCalledWith(
      "SELECT * WHERE 1=1",
      [],
    );
  });
});

describe("createMultiQueryHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when validate returns an error", async () => {
    const handler = createMultiQueryHandler({
      requiredParams: ["matchId"],
      validate: (p) => (p.matchId ? null : "matchId is required"),
      selectBranch: () => ({
        queryFile: "test.sql",
        sqlParams: [],
      }),
    });

    const response = await handler(makeRequest("/api/test"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("matchId is required");
  });

  it("returns 400 when selectBranch returns null", async () => {
    const handler = createMultiQueryHandler({
      requiredParams: [],
      selectBranch: () => null,
    });

    const response = await handler(makeRequest("/api/test"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid parameter combination");
  });

  it("selects the correct query branch based on params", async () => {
    mockedQuery.mockResolvedValue([{ id: 1 }]);

    const handler = createMultiQueryHandler({
      requiredParams: ["matchId"],
      optionalParams: ["teamId"],
      selectBranch: (p) =>
        p.teamId
          ? { queryFile: "by-team.sql", sqlParams: [Number(p.teamId)] }
          : { queryFile: "by-match.sql", sqlParams: [Number(p.matchId)] },
    });

    const response = await handler(
      makeRequest("/api/test?matchId=10&teamId=20"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedLoadQuery).toHaveBeenCalledWith("by-team.sql");
    expect(mockedQuery).toHaveBeenCalledWith(expect.any(String), [20]);
    expect(body.data).toEqual([{ id: 1 }]);
  });
});
