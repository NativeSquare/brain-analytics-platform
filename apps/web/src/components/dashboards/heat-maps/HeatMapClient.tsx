"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import HeatPitchMap from "@/components/dashboards/HeatPitchMap";
import FullPitchBase from "@/components/dashboards/FullPitchBase";
import type { PitchEvent, EventType } from "@/components/dashboards/types";
import type { RawEvent, MatchOption } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_CONFIG: Record<
  EventType,
  { label: string; filterFn: (ev: RawEvent) => boolean }
> = {
  pressures: {
    label: "Pressures",
    filterFn: (ev) => ev.type === "Pressure",
  },
  buildup: {
    label: "Build-up",
    // Successful passes (pass_outcome_name is null when successful in StatsBomb)
    filterFn: (ev) => ev.type === "Pass" && ev.pass_outcome == null,
  },
  underPressure: {
    label: "Under Pressure",
    // Successful passes made under pressure
    filterFn: (ev) =>
      ev.type === "Pass" &&
      ev.pass_outcome == null &&
      ev.under_pressure === true,
  },
  interceptions: {
    label: "Interceptions",
    filterFn: (ev) => ev.type === "Interception",
  },
};

const EVENT_TYPE_KEYS = Object.keys(EVENT_CONFIG) as EventType[];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HeatMapClientProps {
  matches: MatchOption[];
  matchesLoading: boolean;
  matchesError: string | null;
  selectedMatch: MatchOption | null;
  onMatchChange: (match: MatchOption | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeatMapClient({
  matches,
  matchesLoading,
  matchesError,
  selectedMatch,
  onMatchChange,
}: HeatMapClientProps) {
  const [activeEventType, setActiveEventType] = useState<EventType>("pressures");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Event data state
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- Fetch events when match changes ----------
  const fetchEvents = useCallback(async (matchId: number) => {
    // Abort previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEventsLoading(true);
    setEventsError(null);
    setRawEvents([]);

    try {
      const response = await fetch(
        `/api/statsbomb/events?matchId=${matchId}`,
        { signal: controller.signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const json = (await response.json()) as { data?: RawEvent[] } | RawEvent[];
      if (controller.signal.aborted) return;

      const payload = (json as { data?: RawEvent[] }).data ?? (json as RawEvent[]);
      setRawEvents(payload);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Failed to load events";
      console.error("[HeatMapClient] events fetch error:", message);
      setEventsError(message);
    } finally {
      if (!controller.signal.aborted) setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedMatch) {
      setRawEvents([]);
      setEventsError(null);
      setEventsLoading(false);
      return;
    }
    fetchEvents(selectedMatch.match_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch?.match_id, fetchEvents]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ---------- Filter events by active tab ----------
  const filteredByType = useMemo(() => {
    const cfg = EVENT_CONFIG[activeEventType];
    const filtered = rawEvents.filter(cfg.filterFn);

    // For build-up, remap to pass end location (where the ball was received)
    // and use pass_recipient_name for the player attribution, matching the source
    if (activeEventType === "buildup") {
      return filtered.map((ev) => ({
        ...ev,
        player_name: ev.pass_recipient_name ?? ev.player_name,
        location_x: ev.pass_end_location_x ?? ev.location_x,
        location_y: ev.pass_end_location_y ?? ev.location_y,
      }));
    }

    return filtered;
  }, [rawEvents, activeEventType]);

  // ---------- Player list (unique players from filtered events) ----------
  const playerOptions = useMemo(() => {
    const map = new Map<number, string>();
    filteredByType.forEach((ev) => {
      if (ev.player_id != null) {
        const name = ev.player_name ?? `Player ${String(ev.player_id)}`;
        if (!map.has(ev.player_id)) map.set(ev.player_id, name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByType]);

  // Reset player filter when player no longer in list
  useEffect(() => {
    if (
      selectedPlayerId !== null &&
      !playerOptions.some((p) => p.id === selectedPlayerId)
    ) {
      setSelectedPlayerId(null);
    }
  }, [playerOptions, selectedPlayerId]);

  // ---------- Final events for heatmap ----------
  const heatmapEvents = useMemo(() => {
    let events = filteredByType;
    if (selectedPlayerId !== null) {
      events = events.filter((ev) => ev.player_id === selectedPlayerId);
    }
    // Convert to PitchEvent[]
    return events
      .filter((ev) => ev.location_x != null && ev.location_y != null)
      .map(
        (ev): PitchEvent => ({
          event_id: ev.event_id,
          period: ev.period,
          timestamp: ev.timestamp,
          location_x: ev.location_x as number,
          location_y: ev.location_y as number,
          player_name: ev.player_name ?? `Player ${String(ev.player_id ?? "?")}`,
          match_date: "",
          opponent_team_name: "",
        }),
      );
  }, [filteredByType, selectedPlayerId]);

  const isPlayerFiltered = selectedPlayerId !== null;

  // ---------- Handlers ----------
  const handleTypeChange = (type: EventType) => {
    setActiveEventType(type);
    setSelectedPlayerId(null);
  };

  // ---------- Render ----------
  return (
    <div className="flex flex-col gap-4">
      {/* Event type tab selector */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="mr-1 text-sm font-semibold uppercase text-muted-foreground">
              Event Type:
            </span>
            {EVENT_TYPE_KEYS.map((type) => {
              const isActive = activeEventType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  aria-pressed={isActive}
                  className={[
                    "inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    isActive
                      ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
                      : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  ].join(" ")}
                >
                  {EVENT_CONFIG[type].label}
                </button>
              );
            })}
          </div>

          {/* Match selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="heat-match-select"
              className="text-sm font-medium text-muted-foreground"
            >
              Match:
            </label>
            <select
              id="heat-match-select"
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
              disabled={matchesLoading || matches.length === 0}
              value={selectedMatch?.match_id ?? ""}
              onChange={(e) => {
                const matchId = Number(e.target.value);
                const match = matches.find((m) => m.match_id === matchId) ?? null;
                onMatchChange(match);
              }}
            >
              {matchesLoading ? (
                <option value="">Loading matches...</option>
              ) : matchesError ? (
                <option value="">Error loading matches</option>
              ) : matches.length === 0 ? (
                <option value="">No matches found</option>
              ) : (
                <>
                  <option value="">Select a match</option>
                  {matches.map((m) => (
                    <option key={m.match_id} value={m.match_id}>
                      {m.label}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Player filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="heat-player-select"
              className="text-sm font-medium text-muted-foreground"
            >
              Player:
            </label>
            <select
              id="heat-player-select"
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
              disabled={playerOptions.length === 0}
              value={selectedPlayerId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPlayerId(val ? Number(val) : null);
              }}
            >
              <option value="">All Players</option>
              {playerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Heatmap area */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        {eventsLoading ? (
          <div className="relative">
            <FullPitchBase />
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/60">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : eventsError ? (
          <div className="relative">
            <FullPitchBase />
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/60">
              <p className="text-sm text-destructive">{eventsError}</p>
            </div>
          </div>
        ) : !selectedMatch ? (
          <div className="relative">
            <FullPitchBase />
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/60">
              <p className="text-sm text-muted-foreground">
                Select a match to view heatmap
              </p>
            </div>
          </div>
        ) : heatmapEvents.length === 0 ? (
          <div className="relative">
            <FullPitchBase />
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/60">
              <p className="text-sm text-muted-foreground">
                No {EVENT_CONFIG[activeEventType].label.toLowerCase()} events
                found for this match
              </p>
            </div>
          </div>
        ) : (
          <HeatPitchMap
            events={heatmapEvents}
            isPlayerFiltered={isPlayerFiltered}
            eventType={activeEventType}
          />
        )}
      </div>

      {/* Event count summary */}
      {selectedMatch && !eventsLoading && !eventsError && (
        <div className="text-xs text-muted-foreground">
          Showing {heatmapEvents.length} {EVENT_CONFIG[activeEventType].label.toLowerCase()} event
          {heatmapEvents.length !== 1 ? "s" : ""}
          {isPlayerFiltered
            ? ` (filtered from ${filteredByType.length} total)`
            : ""}
        </div>
      )}
    </div>
  );
}
