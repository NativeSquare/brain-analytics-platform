import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs.readFileSync before importing the module
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { loadQuery, _clearQueryCache } from "../load-query";

const mockedReadFileSync = vi.mocked(readFileSync);

describe("loadQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearQueryCache();
  });

  it("reads the SQL file from the correct path", () => {
    mockedReadFileSync.mockReturnValue("SELECT 1");

    const result = loadQuery("teams.sql");

    expect(result).toBe("SELECT 1");
    expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
    const calledPath = mockedReadFileSync.mock.calls[0][0] as string;
    expect(calledPath).toContain("queries");
    expect(calledPath).toContain("statsbomb");
    expect(calledPath).toContain("teams.sql");
  });

  it("trims whitespace from the loaded SQL", () => {
    mockedReadFileSync.mockReturnValue("  SELECT 1;\n\n  ");

    const result = loadQuery("test.sql");

    expect(result).toBe("SELECT 1;");
  });

  it("caches the result and does not re-read the file", () => {
    mockedReadFileSync.mockReturnValue("SELECT 1");

    const first = loadQuery("cached.sql");
    const second = loadQuery("cached.sql");

    expect(first).toBe(second);
    expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
  });

  it("reads different files independently", () => {
    mockedReadFileSync
      .mockReturnValueOnce("SELECT teams")
      .mockReturnValueOnce("SELECT seasons");

    const teams = loadQuery("teams.sql");
    const seasons = loadQuery("seasons.sql");

    expect(teams).toBe("SELECT teams");
    expect(seasons).toBe("SELECT seasons");
    expect(mockedReadFileSync).toHaveBeenCalledTimes(2);
  });

  it("throws when the file does not exist", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    expect(() => loadQuery("nonexistent.sql")).toThrow("ENOENT");
  });

  it("reads from a custom directory when provided", () => {
    mockedReadFileSync.mockReturnValue("SELECT 1");

    const result = loadQuery("fixtures.sql", "sportmonks");

    expect(result).toBe("SELECT 1");
    const calledPath = mockedReadFileSync.mock.calls[0][0] as string;
    expect(calledPath).toContain("sportmonks");
    expect(calledPath).toContain("fixtures.sql");
    expect(calledPath).not.toContain("statsbomb");
  });

  it("caches queries per directory independently", () => {
    mockedReadFileSync
      .mockReturnValueOnce("SELECT statsbomb")
      .mockReturnValueOnce("SELECT sportmonks");

    const sb = loadQuery("teams.sql", "statsbomb");
    const sm = loadQuery("teams.sql", "sportmonks");

    expect(sb).toBe("SELECT statsbomb");
    expect(sm).toBe("SELECT sportmonks");
    expect(mockedReadFileSync).toHaveBeenCalledTimes(2);
  });
});
