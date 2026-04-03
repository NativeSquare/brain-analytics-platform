"use client";

import type { Shot } from "./types";
import { outcomeColor, xgToRadius, sbToGoalSvg, phaseShape } from "./constants";

interface GoalShotsLayerProps {
  shots: Shot[];
  hoveredShotId: number | null;
  selectedShotId: number | null;
  activeShotId: number | null;
  pitchScale: number;
  goalScale: number;
  onHover: (eventId: number | null) => void;
  onSelect: (eventId: number | null) => void;
}

const GoalShotsLayer = ({
  shots,
  hoveredShotId,
  selectedShotId,
  activeShotId,
  pitchScale,
  goalScale,
  onHover,
  onSelect,
}: GoalShotsLayerProps) => {
  return (
    <>
      {shots.map((shot) => {
        if (shot.shot_end_location_y === null || shot.shot_end_location_z === null) return null;

        const { x, y } = sbToGoalSvg(shot.shot_end_location_y, shot.shot_end_location_z);
        const isSelected = shot.event_id === selectedShotId;
        const isHovered = shot.event_id === hoveredShotId;
        const isActive = shot.event_id === activeShotId;
        const dimOnHover = hoveredShotId !== null && !isHovered;
        const dimOnSelect = activeShotId !== null && !isActive;
        const opacity = dimOnSelect ? 0.25 : dimOnHover ? 0.6 : 1;
        const fill = outcomeColor(shot.shot_outcome_name);
        const isOffTarget = fill === null;
        const stroke = "#9ca3af";
        const strokeWidth = 0.03;
        const xg = shot.shot_statsbomb_xg ?? 0;
        const radiusPx = xgToRadius(xg) * pitchScale;
        const radius = goalScale > 0 ? radiusPx / goalScale : xgToRadius(xg);
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
              x={x - radius}
              y={y - radius}
              width={radius * 2}
              height={radius * 2}
            />
          );
        }

        if (shape === "triangle") {
          const points = `${x},${y - radius} ${x - radius},${y + radius} ${x + radius},${y + radius}`;
          return <polygon key={shot.event_id} {...commonProps} points={points} />;
        }

        if (shape === "diamond") {
          const points = `${x},${y - radius} ${x - radius},${y} ${x},${y + radius} ${x + radius},${y}`;
          return <polygon key={shot.event_id} {...commonProps} points={points} />;
        }

        return <circle key={shot.event_id} {...commonProps} cx={x} cy={y} r={radius} />;
      })}
    </>
  );
};

export default GoalShotsLayer;
