"use client";

import FullPitchBase from "@/components/dashboards/FullPitchBase";

import type { PitchEvent, ZoneStats, EventType } from "./types";
import { sbToFullPitchSvg, getEventColor } from "./constants";

interface EventPitchMapProps {
  events: PitchEvent[];
  activeTab: EventType;
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  zoneStats: ZoneStats[];
  isEmpty: boolean;
}

// ---------------------------------------------------------------------------
// Zone stats sidebar (rightAdornment)
// ---------------------------------------------------------------------------

function ZoneStatsAdornment({ stats }: { stats: ZoneStats[] }) {
  const zones: Array<{ key: string; label: string; bgClass: string }> = [
    { key: "ATT", label: "ATT", bgClass: "bg-emerald-500/10" },
    { key: "MID", label: "MID", bgClass: "bg-amber-500/10" },
    { key: "DEF", label: "DEF", bgClass: "bg-sky-500/10" },
  ];

  return (
    <div className="flex h-full flex-col">
      {zones.map((z) => {
        const s = stats.find((st) => st.zone === z.key);
        return (
          <div
            key={z.key}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-4 ${z.bgClass}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {z.label}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {s?.count ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {s?.percentage != null ? `${s.percentage.toFixed(0)}%` : "--"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EventPitchMap({
  events,
  activeTab,
  selectedEventId,
  onSelectEvent,
  zoneStats,
  isEmpty,
}: EventPitchMapProps) {
  const color = getEventColor(activeTab);

  return (
    <FullPitchBase
      rightAdornment={<ZoneStatsAdornment stats={zoneStats} />}
      onClick={() => onSelectEvent(null)}
    >
      {/* Render event dots */}
      {events.map((ev) => {
        const { x, y } = sbToFullPitchSvg(ev.location_x, ev.location_y);
        const isSelected = ev.id === selectedEventId;

        return (
          <circle
            key={ev.id}
            cx={x}
            cy={y}
            r={1.5}
            fill={color}
            opacity={isSelected ? 1 : 0.8}
            stroke={isSelected ? "#fbbf24" : "#ffffff"}
            strokeWidth={isSelected ? 0.8 : 0.3}
            cursor="pointer"
            className="transition-all duration-150 hover:scale-150 hover:opacity-100"
            style={{
              transformOrigin: `${x}px ${y}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEvent(isSelected ? null : ev.id);
            }}
          />
        );
      })}

      {/* Empty state message */}
      {isEmpty && (
        <text
          x={40}
          y={60}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={3.5}
        >
          No {activeTab} found for this match
        </text>
      )}
    </FullPitchBase>
  );
}
