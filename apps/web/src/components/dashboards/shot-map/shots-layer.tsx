"use client";

import type { Shot } from "./types";
import { outcomeColor, xgToRadius, sbToPitchSvg, isAttackingHalf, phaseShape } from "./constants";

interface ShotsLayerProps {
  shots: Shot[];
  hoveredShotId: number | null;
  selectedShotId: number | null;
  activeShotId: number | null;
  onHover: (eventId: number | null) => void;
  onSelect: (eventId: number | null) => void;
}

const ShotsLayer = ({
  shots,
  hoveredShotId,
  selectedShotId,
  activeShotId,
  onHover,
  onSelect,
}: ShotsLayerProps) => {
  return (
    <>
      {shots.map((shot) => {
        if (shot.location_x === null || shot.location_y === null) return null;
        if (!isAttackingHalf(shot.location_x)) return null;

        const { x: sx, y: sy } = sbToPitchSvg(shot.location_x, shot.location_y);
        const isSelected = shot.event_id === selectedShotId;
        const isHovered = shot.event_id === hoveredShotId;
        const isActive = shot.event_id === activeShotId;
        const dimOnHover = hoveredShotId !== null && !isHovered;
        const dimOnSelect = activeShotId !== null && !isActive;
        const opacity = dimOnSelect ? 0.25 : dimOnHover ? 0.6 : 1;
        const fill = outcomeColor(shot.shot_outcome_name);
        const isOffTarget = fill === null;
        const stroke = "#9ca3af";
        const strokeWidth = 0.2;
        const xg = shot.shot_statsbomb_xg ?? 0;
        const radius = xgToRadius(xg);
        const shape = phaseShape(shot.phase);

        const commonProps = {
          fill: fill || undefined,
          className: isOffTarget ? "shot-off-target" : undefined,
          stroke,
          strokeWidth,
          opacity,
          style: { cursor: "pointer" as const },
          onMouseEnter: () => onHover(shot.event_id),
          onMouseLeave: () => onHover(null),
          onClick: (event: React.MouseEvent) => {
            event.stopPropagation();
            onSelect(isSelected ? null : shot.event_id);
          },
        };

        if (shape === "square") {
          return (
            <rect
              key={shot.event_id}
              {...commonProps}
              x={sx - radius}
              y={sy - radius}
              width={radius * 2}
              height={radius * 2}
            />
          );
        }

        if (shape === "triangle") {
          const points = `${sx},${sy - radius} ${sx - radius},${sy + radius} ${sx + radius},${sy + radius}`;
          return <polygon key={shot.event_id} {...commonProps} points={points} />;
        }

        if (shape === "diamond") {
          const points = `${sx},${sy - radius} ${sx - radius},${sy} ${sx},${sy + radius} ${sx + radius},${sy}`;
          return <polygon key={shot.event_id} {...commonProps} points={points} />;
        }

        return <circle key={shot.event_id} {...commonProps} cx={sx} cy={sy} r={radius} />;
      })}
    </>
  );
};

export default ShotsLayer;
