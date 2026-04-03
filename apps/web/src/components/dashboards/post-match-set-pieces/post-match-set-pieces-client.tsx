"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect, FilterCheckbox } from "@/components/dashboard";
import SetPieceTable from "./set-piece-table";
import type {
  SetPiece,
  TeamOption,
  SeasonOption,
  MatchRow,
  MatchOption,
} from "./types";

const TYPE_OPTIONS = [
  { value: "Corner", label: "Corners" },
  { value: "Free Kick", label: "Free Kicks" },
  { value: "Throw-in", label: "Throw-ins" },
];

const SIDE_OPTIONS = [
  { value: "Left", label: "Left" },
  { value: "Right", label: "Right" },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PostMatchSetPiecesClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const matchIdParam = searchParams.get("match_id");
  const fromPostMatch = matchIdParam != null;

  // ---------- filter cascade state ----------
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(
    matchIdParam ? Number(matchIdParam) : null,
  );
  const [matchesLoading, setMatchesLoading] = useState(false);

  // ---------- client-side filters ----------
  const [attackDefense, setAttackDefense] = useState<"All" | "Attack" | "Defence">("All");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [sideFilters, setSideFilters] = useState<string[]>([]);

  // ---------- data state ----------
  const [rawData, setRawData] = useState<SetPiece[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // ---------- selection ----------
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ---------- load teams + seasons (only when NOT from post-match) ----------
  useEffect(() => {
    if (fromPostMatch) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [teamsRes, seasonsRes] = await Promise.all([
          fetch("/api/statsbomb/teams"),
          fetch("/api/statsbomb/seasons"),
        ]);
        if (!teamsRes.ok || !seasonsRes.ok) throw new Error("Failed");
        const teamsJson = await teamsRes.json();
        const seasonsJson = await seasonsRes.json();
        if (cancelled) return;
        const teamsData = (teamsJson.data ?? teamsJson) as TeamOption[];
        const seasonsData = (seasonsJson.data ?? seasonsJson) as SeasonOption[];
        setTeams(teamsData);
        setSeasons(seasonsData);
        const defaultTeam = teamsData.find((t) => t.team_id === 234);
        if (defaultTeam) setSelectedTeamId(defaultTeam.team_id);
        else if (teamsData.length > 0) setSelectedTeamId(teamsData[0].team_id);
      } catch {
        // silently ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fromPostMatch]);

  // ---------- load default season ----------
  useEffect(() => {
    if (fromPostMatch || !selectedTeamId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/statsbomb/default-season?teamId=${selectedTeamId}`,
        );
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        const data = json.data ?? json;
        if (cancelled) return;
        if (data?.season_id) setSelectedSeasonId(data.season_id);
      } catch {
        // silently ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId, fromPostMatch]);

  // ---------- load matches ----------
  useEffect(() => {
    if (fromPostMatch || !selectedTeamId) return;
    let cancelled = false;
    const load = async () => {
      setMatchesLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("teamId", String(selectedTeamId));
        if (selectedSeasonId) params.set("seasonId", String(selectedSeasonId));
        const res = await fetch(
          `/api/statsbomb/matches?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        const rows = (json.data ?? json) as MatchRow[];
        if (cancelled) return;
        const opts: MatchOption[] = rows.map((m) => ({
          ...m,
          label: m.match_label,
        }));
        setMatches(opts);
        if (opts.length > 0) {
          setSelectedMatchId(opts[0].match_id);
        } else {
          setSelectedMatchId(null);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId, selectedSeasonId, fromPostMatch]);

  // ---------- load set pieces ----------
  useEffect(() => {
    if (!selectedMatchId) return;
    let cancelled = false;
    const load = async () => {
      setDataLoading(true);
      setDataError(null);
      setSelectedId(null);
      try {
        const res = await fetch(
          `/api/statsbomb/set-pieces?matchId=${selectedMatchId}`,
        );
        if (!res.ok) throw new Error("Failed to load set pieces");
        const json = await res.json();
        const rows = (json.data ?? json) as SetPiece[];
        if (cancelled) return;
        setRawData(rows);
      } catch {
        if (!cancelled) setDataError("Unable to load set pieces");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedMatchId]);

  // ---------- derive team IDs for attack/defence filter ----------
  const teamIds = useMemo(() => {
    const ids = new Set<number>();
    for (const sp of rawData) {
      if (sp.team_id != null) ids.add(sp.team_id);
    }
    return Array.from(ids);
  }, [rawData]);

  const primaryTeamId = selectedTeamId ?? teamIds[0] ?? null;

  // ---------- filtered data ----------
  const filtered = useMemo(() => {
    return rawData.filter((sp) => {
      // Attack/Defence
      if (attackDefense === "Attack" && sp.team_id !== primaryTeamId)
        return false;
      if (attackDefense === "Defence" && sp.team_id === primaryTeamId)
        return false;

      // Type filter (multi-select)
      if (typeFilters.length > 0 && !typeFilters.includes(sp.sp_type ?? ""))
        return false;

      // Side filter (multi-select)
      if (sideFilters.length > 0 && !sideFilters.includes(sp.side ?? ""))
        return false;

      return true;
    });
  }, [rawData, attackDefense, typeFilters, sideFilters, primaryTeamId]);

  const handleTeamChange = useCallback((val: string) => {
    setSelectedTeamId(Number(val));
    setSelectedSeasonId(null);
    setSelectedMatchId(null);
  }, []);

  const handleSeasonChange = useCallback((val: string) => {
    setSelectedSeasonId(Number(val));
    setSelectedMatchId(null);
  }, []);

  const handleMatchChange = useCallback((val: string) => {
    setSelectedMatchId(Number(val));
  }, []);

  // ---------- render ----------
  const teamOptions = teams.map((t) => ({
    value: String(t.team_id),
    label: t.team_name,
  }));
  const seasonOptions = seasons.map((s) => ({
    value: String(s.season_id),
    label: s.season_name,
  }));
  const matchOptions = matches.map((m) => ({
    value: String(m.match_id),
    label: m.label,
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Back link if navigated from post-match */}
      {fromPostMatch && (
        <Link
          href={`/dashboards/post-match?match_id=${matchIdParam}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Post-Match
        </Link>
      )}

      {/* Match cascade filters (hidden when match_id is in URL) */}
      {!fromPostMatch && (
        <FilterBar>
          <FilterSelect
            label="Team"
            options={teamOptions}
            value={selectedTeamId != null ? String(selectedTeamId) : undefined}
            onChange={handleTeamChange}
            placeholder="Select team..."
            className="min-w-0 flex-1"
          />
          <FilterSelect
            label="Season"
            options={seasonOptions}
            value={
              selectedSeasonId != null ? String(selectedSeasonId) : undefined
            }
            onChange={handleSeasonChange}
            placeholder="Select season..."
            className="min-w-0 flex-1"
          />
          <FilterSelect
            label="Match"
            options={matchOptions}
            value={
              selectedMatchId != null ? String(selectedMatchId) : undefined
            }
            onChange={handleMatchChange}
            placeholder={
              matchesLoading
                ? "Loading matches..."
                : matches.length === 0
                  ? "No matches"
                  : "Select match..."
            }
            searchable
            className="min-w-0 flex-[2]"
          />
        </FilterBar>
      )}

      {/* Analysis filters */}
      <FilterBar>
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            View
          </span>
          <div className="flex gap-1">
            {(["All", "Attack", "Defence"] as const).map((opt) => (
              <Button
                key={opt}
                variant={attackDefense === opt ? "default" : "outline"}
                size="sm"
                onClick={() => setAttackDefense(opt)}
                className="h-8 px-3 text-xs"
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
        <FilterCheckbox
          label="Type"
          options={TYPE_OPTIONS}
          selectedValues={typeFilters}
          onChange={setTypeFilters}
        />
        <FilterCheckbox
          label="Side"
          options={SIDE_OPTIONS}
          selectedValues={sideFilters}
          onChange={setSideFilters}
        />
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => {
            setAttackDefense("All");
            setTypeFilters([]);
            setSideFilters([]);
          }}
        >
          Reset filters
        </Button>
      </FilterBar>

      {dataError && (
        <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
          {dataError}
        </div>
      )}

      {dataLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <SetPieceTable
          items={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
    </div>
  );
}

export default PostMatchSetPiecesClient;
