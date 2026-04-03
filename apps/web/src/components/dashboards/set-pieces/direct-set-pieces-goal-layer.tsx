"use client";

import { GOAL_HEIGHT } from "@/components/dashboards/GoalBase";

import type { SetPiece } from "./types";

const GOAL_LEFT = 36;

function sbToGoalSvg(endY: number, endZ: number): { x: number; y: number } {
  return {
    x: endY - GOAL_LEFT,
    y: GOAL_HEIGHT - endZ,
  };
}

function directFillColor(outcome: string | null): string | null {
  if (!outcome) return null;
  const lower = outcome.toLowerCase();
  if (lower.includes("goal")) return "#1b5497";
  if (lower.includes("saved")) return "#c21718";
  if (lower.includes("blocked")) return "#9ca3af";
  return null;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

interface DirectSetPiecesGoalLayerProps {
  items: SetPiece[];
  hoveredId: number | null;
  selectedId: number | null;
  pitchScale: number;
  goalScale: number;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
}

const DirectSetPiecesGoalLayer = ({
  items,
  hoveredId,
  selectedId,
  pitchScale,
  goalScale,
  onHover,
  onSelect,
}: DirectSetPiecesGoalLayerProps) => {
  return (
    <>
      {items.map((sp) => {
        if (
          sp.shot_end_location_y == null ||
          sp.shot_end_location_z == null
        )
          return null;

        const { x, y } = sbToGoalSvg(
          sp.shot_end_location_y,
          sp.shot_end_location_z,
        );

        const isSelected = sp.start_event_id === selectedId;
        const isHovered = sp.start_event_id === hoveredId;
        const hasActive = selectedId !== null;
        const hasHover = hoveredId !== null;
        const dimOnSelect = hasActive && !isSelected;
        const dimOnHover = hasHover && !isHovered && !hasActive;
        const opacity = dimOnSelect ? 0.25 : dimOnHover ? 0.6 : 1;

        const xg = sp.shot_statsbomb_xg ?? 0;
        const radiusPx = clamp(0.9 + xg * 3.2, 0.9, 3.2) * pitchScale;
        const radius = goalScale > 0 ? radiusPx / goalScale : clamp(0.9 + xg * 3.2, 0.9, 3.2);

        const fill = directFillColor(sp.shot_outcome_name);

        return (
          <circle
            key={sp.start_event_id}
            cx={x}
            cy={y}
            r={radius}
            fill={fill ?? undefined}
            className={fill == null ? "shot-off-target" : undefined}
            stroke="#9ca3af"
            strokeWidth={0.03}
            opacity={opacity}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => onHover(sp.start_event_id)}
            onMouseLeave={() => onHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(isSelected ? null : sp.start_event_id);
            }}
          />
        );
      })}
    </>
  );
};

export default DirectSetPiecesGoalLayer;
