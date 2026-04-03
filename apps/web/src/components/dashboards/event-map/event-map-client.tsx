"use client";

import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { FilterSelectOption } from "@/components/dashboard/FilterSelect";

import EventMapFilterBar from "./event-map-filter-bar";
import EventPitchMap from "./event-pitch-map";
import EventDetailsPane from "./event-details-pane";
import PlayerStatsChart from "./player-stats-chart";
import type { EventType, PitchEvent, ZoneStats, Zone } from "./types";
import {
  EVENT_TYPE_TABS,
  getMatchTypeForTab,
  classifyZone,
} from "./constants";

// ---------------------------------------------------------------------------
// Raw event row shape from the events.sql query
// ---------------------------------------------------------------------------

interface RawEventRow {
  event_id: number;
  match_id: number;
  period: number;
  team_id: number;
  team: string;
  type: string;
  minute: number;
  second: number;
  timestamp: string;
  location_x: number | null;
  location_y: number | null;
  player_id: number;
  player_name: string;
  pass_outcome?: string | null;
  shot_outcome?: string | null;
  foul_committed_card_name?: string | null;
}

// ---------------------------------------------------------------------------
// Match row shape from matches.sql
// ---------------------------------------------------------------------------

interface MatchRow {
  match_id: number;
  match_label: string;
  match_date?: string;
  home_team_name?: string;
  away_team_name?: string;
  venue?: string;
}

// ---------------------------------------------------------------------------
// EventMapDashboard
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EventMapDashboard({ slug }: { slug: string }) {
  // ---------- Filter state ----------
  const [teams, setTeams] = useState<
    Array<{ team_id: number; team_name: string }>
  >([]);
  const [seasons, setSeasons] = useState<
    Array<{ season_id: number; season_name: string }>
  >([]);
  const [matchRows, setMatchRows] = useState<MatchRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
    undefined,
  );
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(
    undefined,
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(
    undefined,
  );
  const [venueFilter, setVenueFilter] = useState<string | undefined>(
    undefined,
  );
  const [matchesLoading, setMatchesLoading] = useState(false);

  // ---------- Event data state ----------
  const [activeTab, setActiveTab] = useState<EventType>("interceptions");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<RawEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Load teams + seasons on mount ----------
  useEffect(() => {
    let isMounted = true;

    const loadFilters = async () => {
      try {
        const [teamsRes, seasonsRes] = await Promise.all([
          fetch("/api/statsbomb/teams"),
          fetch("/api/statsbomb/seasons"),
        ]);
        if (!teamsRes.ok || !seasonsRes.ok)
          throw new Error("Failed to load filters");
        const teamsJson = await teamsRes.json();
        const seasonsJson = await seasonsRes.json();
        if (!isMounted) return;

        const teamsData = teamsJson.data ?? teamsJson;
        const seasonsData = seasonsJson.data ?? seasonsJson;
        setTeams(teamsData);
        setSeasons(seasonsData);

        // Default team (234)
        const defaultTeam = teamsData.find(
          (t: { team_id: number }) => t.team_id === 234,
        );
        if (defaultTeam) setSelectedTeamId(String(defaultTeam.team_id));
      } catch {
        // silently ignore
      }
    };

    loadFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------- Load default season ----------
  useEffect(() => {
    if (!selectedTeamId) return;
    let isMounted = true;

    const loadDefaultSeason = async () => {
      try {
        const res = await fetch(
          `/api/statsbomb/default-season?teamId=${selectedTeamId}`,
        );
        if (!res.ok) throw new Error("Failed to load default season");
        const json = await res.json();
        const data = json.data ?? json;
        if (!isMounted) return;
        if (data?.season_id) setSelectedSeasonId(String(data.season_id));
      } catch {
        // silently ignore
      }
    };

    loadDefaultSeason();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  // ---------- Load matches when team/season changes ----------
  useEffect(() => {
    if (!selectedTeamId) return;
    let isMounted = true;

    const loadMatches = async () => {
      setMatchesLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("teamId", selectedTeamId);
        if (selectedSeasonId) params.set("seasonId", selectedSeasonId);
        const res = await fetch(`/api/statsbomb/matches?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load matches");
        const json = await res.json();
        if (!isMounted) return;
        const rows = (json.data ?? json) as MatchRow[];
        setMatchRows(rows);

        // Auto-select first match
        if (rows.length > 0) {
          setSelectedMatchId(String(rows[0].match_id));
        } else {
          setSelectedMatchId(undefined);
        }
      } catch {
        if (isMounted) setMatchRows([]);
      } finally {
        if (isMounted) setMatchesLoading(false);
      }
    };

    loadMatches();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId, selectedSeasonId]);

  // ---------- Load events when match changes ----------
  useEffect(() => {
    if (!selectedMatchId) {
      setAllEvents([]);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const loadEvents = async () => {
      setIsLoading(true);
      setError(null);
      setSelectedEventId(null);

      try {
        const res = await fetch(
          `/api/statsbomb/events?matchId=${selectedMatchId}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Failed to load event data");
        const json = await res.json();
        if (!isMounted) return;
        const rows = (json.data ?? json) as RawEventRow[];
        setAllEvents(rows);
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load event data");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadEvents();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedMatchId]);

  // ---------- Clear selection when tab changes ----------
  useEffect(() => {
    setSelectedEventId(null);
  }, [activeTab]);

  // ---------- Derived: filter options ----------
  const teamOptions: FilterSelectOption[] = useMemo(
    () =>
      teams.map((t) => ({
        value: String(t.team_id),
        label: t.team_name,
      })),
    [teams],
  );

  const seasonOptions: FilterSelectOption[] = useMemo(
    () =>
      seasons.map((s) => ({
        value: String(s.season_id),
        label: s.season_name,
      })),
    [seasons],
  );

  // Filter matches by venue (home / away) when a team is selected
  const filteredMatchRows = useMemo(() => {
    if (!venueFilter) return matchRows;
    const selectedTeam = teams.find(
      (t) => String(t.team_id) === selectedTeamId,
    );
    if (!selectedTeam) return matchRows;
    const teamName = selectedTeam.team_name;
    return matchRows.filter((m) => {
      if (venueFilter === "home") return m.home_team_name === teamName;
      if (venueFilter === "away") return m.away_team_name === teamName;
      return true;
    });
  }, [matchRows, venueFilter, teams, selectedTeamId]);

  const matchOptions: FilterSelectOption[] = useMemo(
    () =>
      filteredMatchRows.map((m) => ({
        value: String(m.match_id),
        label: m.match_label,
      })),
    [filteredMatchRows],
  );

  const venueOptions: FilterSelectOption[] = useMemo(
    () => [
      { value: "all", label: "All Venues" },
      { value: "home", label: "Home" },
      { value: "away", label: "Away" },
    ],
    [],
  );

  // ---------- Derived: filtered events for the active tab ----------
  const filteredEvents: PitchEvent[] = useMemo(() => {
    const matchType = getMatchTypeForTab(activeTab);
    return allEvents
      .filter((ev) => {
        if (ev.location_x == null || ev.location_y == null) return false;
        if (!ev.type?.includes(matchType)) return false;
        return true;
      })
      .map((ev) => ({
        id: String(ev.event_id),
        event_id: ev.event_id,
        match_id: ev.match_id,
        minute: ev.minute,
        second: ev.second,
        player_id: ev.player_id,
        player_name: ev.player_name ?? "Unknown",
        team_id: ev.team_id,
        team_name: ev.team ?? "Unknown",
        type: ev.type,
        outcome:
          ev.pass_outcome ?? ev.shot_outcome ?? ev.foul_committed_card_name ?? undefined,
        location_x: ev.location_x!,
        location_y: ev.location_y!,
        period: ev.period,
        timestamp: ev.timestamp,
      }));
  }, [allEvents, activeTab]);

  // ---------- Derived: zone stats ----------
  const zoneStats: ZoneStats[] = useMemo(() => {
    const total = filteredEvents.length;
    const counts: Record<Zone, number> = { ATT: 0, MID: 0, DEF: 0 };
    for (const ev of filteredEvents) {
      counts[classifyZone(ev.location_x)]++;
    }
    return (["ATT", "MID", "DEF"] as Zone[]).map((zone) => ({
      zone,
      count: counts[zone],
      percentage: total > 0 ? (counts[zone] / total) * 100 : 0,
    }));
  }, [filteredEvents]);

  // ---------- Selected event ----------
  const selectedEvent = useMemo(
    () => filteredEvents.find((ev) => ev.id === selectedEventId) ?? null,
    [filteredEvents, selectedEventId],
  );

  // ---------- Render ----------
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filter bar */}
      <EventMapFilterBar
        teams={teamOptions}
        seasons={seasonOptions}
        matches={matchOptions}
        venueOptions={venueOptions}
        selectedTeamId={selectedTeamId}
        selectedSeasonId={selectedSeasonId}
        selectedMatchId={selectedMatchId}
        venueFilter={venueFilter}
        matchesLoading={matchesLoading}
        onTeamChange={(v) => {
          setSelectedTeamId(v);
          setSelectedSeasonId(undefined);
          setSelectedMatchId(undefined);
        }}
        onSeasonChange={(v) => {
          setSelectedSeasonId(v);
          setSelectedMatchId(undefined);
        }}
        onMatchChange={setSelectedMatchId}
        onVenueChange={(v) => setVenueFilter(v === "all" ? undefined : v)}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
        {EVENT_TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Re-trigger fetch by toggling matchId
              const id = selectedMatchId;
              setSelectedMatchId(undefined);
              setTimeout(() => setSelectedMatchId(id), 0);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left: pitch map */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          ) : (
            <EventPitchMap
              events={filteredEvents}
              activeTab={activeTab}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              zoneStats={zoneStats}
              isEmpty={filteredEvents.length === 0 && !isLoading && !error}
            />
          )}
        </div>

        {/* Right: details + chart */}
        <div className="sticky top-4 flex flex-col gap-4 self-start">
          <EventDetailsPane
            event={selectedEvent}
            matchId={selectedMatchId ? Number(selectedMatchId) : null}
            onClose={() => setSelectedEventId(null)}
          />
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          ) : (
            <PlayerStatsChart zoneStats={zoneStats} activeTab={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}

export default EventMapDashboard;
