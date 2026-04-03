"use client";

import type { SetPiece } from "./types";
import { sbToSvg } from "./set-piece-zones";

interface CornerDotsLayerProps {
  items: SetPiece[];
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
}

/**
 * Small dots at the corner kick delivery positions (location_x, location_y).
 * Only shown for corner kick set pieces.
 */
const CornerDotsLayer = ({
  items,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: CornerDotsLayerProps) => {
  return (
    <>
      {items
        .filter(
          (sp) =>
            sp.sp_type?.toLowerCase().includes("corner") &&
            sp.location_x != null &&
            sp.location_y != null,
        )
        .map((sp) => {
          const { x: cx, y: cy } = sbToSvg(sp.location_x!, sp.location_y!);
          const isSelected = sp.start_event_id === selectedId;
          const isHovered = sp.start_event_id === hoveredId;
          const hasActive = selectedId !== null;
          const hasHover = hoveredId !== null;
          const dimOnSelect = hasActive && !isSelected;
          const dimOnHover = hasHover && !isHovered && !hasActive;
          const opacity = dimOnSelect ? 0.25 : dimOnHover ? 0.6 : 1;

          return (
            <circle
              key={`corner-${sp.start_event_id}`}
              cx={cx}
              cy={cy}
              r={0.6}
              fill="#6b7280"
              stroke="#4b5563"
              strokeWidth={0.15}
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

export default CornerDotsLayer;
