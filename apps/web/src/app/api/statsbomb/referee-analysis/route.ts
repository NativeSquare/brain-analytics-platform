import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";
import { getMockResponse } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

type CompetitionOption = {
  competition_id: number;
  competition_name: string | null;
};
type RefereeOption = { referee_id: number; referee_name: string | null };

interface RefereeTotals {
  referee_id: number;
  referee_name: string | null;
  matches: number;
  fouls: number;
  fouls_per_match: number;
  advantages: number;
  advantages_per_match: number;
  yellow_cards: number;
  yellow_cards_per_match: number;
  second_yellow_cards: number;
  second_yellow_cards_per_match: number;
  straight_red_cards: number;
  straight_red_cards_per_match: number;
  red_cards: number;
  red_cards_per_match: number;
  penalties: number;
  penalties_per_match: number;
}

interface LeagueTotals {
  fouls_per_match: number;
  advantages_per_match: number;
  yellow_cards_per_match: number;
  second_yellow_cards_per_match: number;
  straight_red_cards_per_match: number;
  red_cards_per_match: number;
  penalties_per_match: number;
}

const toIntOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export async function GET(request: NextRequest) {
  const mock = getMockResponse("statsbomb", "referee-analysis");
  if (mock) return mock;

  const searchParams = request.nextUrl.searchParams;
  const competitionIdParam = searchParams.get("competitionId");
  const refereeIdParam = searchParams.get("refereeId");
  const includeCompetitions =
    searchParams.get("includeCompetitions") === "true";

  const competitionId = toIntOrNull(competitionIdParam);
  const requestedRefereeId = toIntOrNull(refereeIdParam);

  try {
    let competitions: CompetitionOption[] = [];
    if (includeCompetitions) {
      const rows = await query<CompetitionOption>(
        loadQuery("referee-analysis-competitions.sql"),
      );
      competitions = rows.filter(
        (r) => toIntOrNull(r.competition_id) != null,
      );
    }

    if (competitionId == null) {
      return NextResponse.json({
        data: {
          competitions,
          referees: [],
          active_referee_id: null,
          leagueTotals: null,
          totals: null,
          fouls: [],
          refereeAverages: [],
        },
      });
    }

    // Combined query for referees + league totals + averages
    const competitionDataRows = await query<Record<string, unknown>>(
      loadQuery("referee-analysis-competition-data.sql"),
      [competitionId],
    );

    const referees: RefereeOption[] = [];
    const refereeAverages: RefereeTotals[] = [];
    let leagueTotals: LeagueTotals | null = null;

    for (const row of competitionDataRows) {
      const refereeId = toIntOrNull(row.referee_id);

      if (
        row.data_type === "referee" &&
        refereeId != null &&
        row.referee_name != null
      ) {
        referees.push({
          referee_id: refereeId,
          referee_name: row.referee_name as string,
        });
      } else if (
        row.data_type === "average" &&
        refereeId != null &&
        row.referee_name != null
      ) {
        refereeAverages.push({
          referee_id: refereeId,
          referee_name: row.referee_name as string,
          matches: (row.matches as number) ?? 0,
          fouls: (row.fouls as number) ?? 0,
          fouls_per_match: (row.fouls_per_match as number) ?? 0,
          advantages: (row.advantages as number) ?? 0,
          advantages_per_match: (row.advantages_per_match as number) ?? 0,
          yellow_cards: (row.yellow_cards as number) ?? 0,
          yellow_cards_per_match:
            (row.yellow_cards_per_match as number) ?? 0,
          second_yellow_cards: (row.second_yellow_cards as number) ?? 0,
          second_yellow_cards_per_match:
            (row.second_yellow_cards_per_match as number) ?? 0,
          straight_red_cards: (row.straight_red_cards as number) ?? 0,
          straight_red_cards_per_match:
            (row.straight_red_cards_per_match as number) ?? 0,
          red_cards: (row.red_cards as number) ?? 0,
          red_cards_per_match: (row.red_cards_per_match as number) ?? 0,
          penalties: (row.penalties as number) ?? 0,
          penalties_per_match: (row.penalties_per_match as number) ?? 0,
        });
      } else if (row.data_type === "league_total") {
        leagueTotals = {
          fouls_per_match: (row.league_fouls_per_match as number) ?? 0,
          advantages_per_match:
            (row.league_advantages_per_match as number) ?? 0,
          yellow_cards_per_match:
            (row.league_yellow_cards_per_match as number) ?? 0,
          second_yellow_cards_per_match:
            (row.league_second_yellow_cards_per_match as number) ?? 0,
          straight_red_cards_per_match:
            (row.league_straight_red_cards_per_match as number) ?? 0,
          red_cards_per_match:
            (row.league_red_cards_per_match as number) ?? 0,
          penalties_per_match:
            (row.league_penalties_per_match as number) ?? 0,
        };
      }
    }

    referees.sort((a, b) =>
      (a.referee_name ?? "").localeCompare(b.referee_name ?? ""),
    );
    refereeAverages.sort((a, b) =>
      (a.referee_name ?? "").localeCompare(b.referee_name ?? ""),
    );

    const refereeIds = new Set(referees.map((r) => r.referee_id));
    const activeRefereeId =
      requestedRefereeId != null && refereeIds.has(requestedRefereeId)
        ? requestedRefereeId
        : referees[0]?.referee_id ?? null;

    let totals: RefereeTotals | null = null;
    let fouls: Record<string, unknown>[] = [];

    if (activeRefereeId != null) {
      const [totalsRows, foulsRows] = await Promise.all([
        query<RefereeTotals>(loadQuery("referee-analysis-totals.sql"), [
          activeRefereeId,
          competitionId,
        ]),
        query(loadQuery("referee-analysis-fouls.sql"), [
          activeRefereeId,
          competitionId,
        ]),
      ]);

      totals = totalsRows[0] ?? null;
      fouls = foulsRows;
    }

    return NextResponse.json({
      data: {
        competitions,
        referees,
        active_referee_id: activeRefereeId,
        leagueTotals,
        totals,
        fouls,
        refereeAverages,
      },
    });
  } catch (error) {
    console.error("[StatsBomb API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
