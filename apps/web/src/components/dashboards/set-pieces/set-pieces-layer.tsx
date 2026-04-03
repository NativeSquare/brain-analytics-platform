"use client";

import type { SetPiece, SetPieceMode } from "./types";
import { sbToSvg, isAttackingHalf } from "./set-piece-zones";

/** Outcome color for direct mode shots */
function directFillColor(outcome: string | null): string | null {
  if (!outcome) return null;
  const lower = outcome.toLowerCase();
  if (lower.includes("goal")) return "#1b5497";
  if (lower.includes("saved")) return "#c21718";
  if (lower.includes("blocked")) return "#9ca3af";
  return null; // off target -> CSS class
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface SetPiecesLayerProps {
  items: SetPiece[];
  mode: SetPieceMode;
  hoveredId: number | null;
  selectedId: number | null;
  highlightedPlayer: string | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
}

const SetPiecesLayer = ({
  items,
  mode,
  hoveredId,
  selectedId,
  highlightedPlayer,
  onHover,
  onSelect,
}: SetPiecesLayerProps) => {
  return (
    <>
      {items.map((sp) => {
        let sbX: number | null;
        let sbY: number | null;

        if (mode === "indirect") {
          // Show first contact position
          sbX = sp.first_phase_first_contact_x;
          sbY = sp.first_phase_first_contact_y;
        } else {
          // Direct: show delivery (shot) position
          sbX = sp.location_x;
          sbY = sp.location_y;
        }

        if (sbX == null || sbY == null) return null;
        if (!isAttackingHalf(sbX)) return null;

        const { x: cx, y: cy } = sbToSvg(sbX, sbY);

        const isSelected = sp.start_event_id === selectedId;
        const isHovered = sp.start_event_id === hoveredId;
        const hasActive = selectedId !== null;
        const hasHover = hoveredId !== null;
        const dimOnSelect = hasActive && !isSelected;
        const dimOnHover = hasHover && !isHovered && !hasActive;

        // Highlight by player (from bar chart click)
        const isPlayerHighlighted =
          highlightedPlayer != null &&
          (mode === "indirect"
            ? sp.first_phase_first_contact_player === highlightedPlayer
            : sp.taker === highlightedPlayer);
        const dimByPlayer =
          highlightedPlayer != null && !isPlayerHighlighted && !isSelected;

        const opacity = dimOnSelect || dimByPlayer ? 0.25 : dimOnHover ? 0.6 : 1;

        let fill: string | undefined;
        let className: string | undefined;
        let r: number;

        if (mode === "indirect") {
          r = 1.2;
          fill = sp.first_contact_won ? "#1b5497" : "#991b1b";
        } else {
          const xg = sp.shot_statsbomb_xg ?? 0;
          r = clamp(0.9 + xg * 3.2, 0.9, 3.2);
          const color = directFillColor(sp.shot_outcome_name);
          if (color) {
            fill = color;
          } else {
            className = "shot-off-target";
          }
        }

        return (
          <circle
            key={sp.start_event_id}
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            className={className}
            stroke="#9ca3af"
            strokeWidth={0.2}
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

export default SetPiecesLayer;
