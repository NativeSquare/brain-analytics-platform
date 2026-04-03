"use client";

import { useCallback, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, FilterSelect } from "@/components/dashboard";

import RefereeSummaryCard from "./referee-summary-card";
import RefereeStatsBar from "./referee-stats-bar";
import FoulsTable from "./fouls-table";
import type {
  CompetitionOption,
  RefereeOption,
  RefereeAnalysisResponse,
  RefereeTotals,
  RefereeRow,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RefereeAnalysisClient({ slug }: { slug: string }) {
  // ---------- filter state ----------
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [referees, setReferees] = useState<RefereeOption[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<
    number | null
  >(null);
  const [selectedRefereeId, setSelectedRefereeId] = useState<number | null>(
    null,
  );

  // ---------- data state ----------
  const [totals, setTotals] = useState<RefereeTotals | null>(null);
  const [fouls, setFouls] = useState<RefereeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  // ---------- load competitions on mount ----------
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          "/api/statsbomb/referee-analysis?includeCompetitions=true",
        );
        if (!res.ok) throw new Error("Failed to load competitions");
        const json = (await res.json()) as { data: RefereeAnalysisResponse };
        if (cancelled) return;
        const data = json.data;
        setCompetitions(data.competitions);
        if (data.competitions.length > 0) {
          setSelectedCompetitionId(data.competitions[0].competition_id);
        }
      } catch {
        if (!cancelled) setError("Unable to load competitions");
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- load referee list + data when competition changes ----------
  const loadData = useCallback(
    async (competitionId: number, refereeId?: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("competitionId", String(competitionId));
        if (refereeId != null) params.set("refereeId", String(refereeId));

        const res = await fetch(
          `/api/statsbomb/referee-analysis?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load referee data");
        const json = (await res.json()) as { data: RefereeAnalysisResponse };
        const data = json.data;

        setReferees(data.referees);
        setTotals(data.totals);
        setFouls(data.fouls);

        if (data.active_referee_id != null && refereeId == null) {
          setSelectedRefereeId(data.active_referee_id);
        }
      } catch {
        setError("Unable to load referee data");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedCompetitionId == null) return;
    setSelectedRefereeId(null);
    loadData(selectedCompetitionId);
  }, [selectedCompetitionId, loadData]);

  // ---------- reload when referee changes ----------
  useEffect(() => {
    if (selectedCompetitionId == null || selectedRefereeId == null) return;
    loadData(selectedCompetitionId, selectedRefereeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRefereeId]);

  // ---------- render ----------
  if (initLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const competitionOptions = competitions.map((c) => ({
    value: String(c.competition_id),
    label: c.competition_name ?? `Competition ${c.competition_id}`,
  }));

  const refereeOptions = referees.map((r) => ({
    value: String(r.referee_id),
    label: r.referee_name ?? `Referee ${r.referee_id}`,
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filters */}
      <FilterBar>
        <FilterSelect
          label="Competition"
          options={competitionOptions}
          value={
            selectedCompetitionId != null
              ? String(selectedCompetitionId)
              : undefined
          }
          onChange={(val) => setSelectedCompetitionId(Number(val))}
          placeholder="Select competition..."
          className="min-w-0 flex-1"
        />
        <FilterSelect
          label="Referee"
          options={refereeOptions}
          value={
            selectedRefereeId != null
              ? String(selectedRefereeId)
              : undefined
          }
          onChange={(val) => setSelectedRefereeId(Number(val))}
          placeholder={
            referees.length === 0
              ? "Select a competition first"
              : "Select referee..."
          }
          className="min-w-0 flex-1"
        />
      </FilterBar>

      {error && (
        <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <RefereeSummaryCard totals={totals} />
          <RefereeStatsBar totals={totals} />
          <FoulsTable fouls={fouls} />
        </>
      )}
    </div>
  );
}

export default RefereeAnalysisClient;
