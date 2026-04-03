"use client";

import { useState } from "react";

import GoalBase from "@/components/dashboards/GoalBase";

import GoalShotsLayer from "./goal-shots-layer";
import type { Shot } from "./types";

interface GoalMapProps {
  shots: Shot[];
  hoveredShotId: number | null;
  selectedShotId: number | null;
  activeShotId: number | null;
  pitchScale: number;
  onHover: (eventId: number | null) => void;
  onSelect: (eventId: number | null) => void;
}

const GoalMap = ({
  shots,
  hoveredShotId,
  selectedShotId,
  activeShotId,
  pitchScale,
  onHover,
  onSelect,
}: GoalMapProps) => {
  const [goalScale, setGoalScale] = useState(1);

  return (
    <GoalBase onClick={() => onSelect(null)} onScaleChange={setGoalScale}>
      <GoalShotsLayer
        shots={shots}
        hoveredShotId={hoveredShotId}
        selectedShotId={selectedShotId}
        activeShotId={activeShotId}
        pitchScale={pitchScale}
        goalScale={goalScale}
        onHover={onHover}
        onSelect={onSelect}
      />
    </GoalBase>
  );
};

export default GoalMap;
