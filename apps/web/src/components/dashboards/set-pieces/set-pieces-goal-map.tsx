"use client";

import { useState } from "react";

import GoalBase from "@/components/dashboards/GoalBase";

import DirectSetPiecesGoalLayer from "./direct-set-pieces-goal-layer";
import type { SetPiece } from "./types";

interface SetPiecesGoalMapProps {
  items: SetPiece[];
  hoveredId: number | null;
  selectedId: number | null;
  pitchScale: number;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
}

const SetPiecesGoalMap = ({
  items,
  hoveredId,
  selectedId,
  pitchScale,
  onHover,
  onSelect,
}: SetPiecesGoalMapProps) => {
  const [goalScale, setGoalScale] = useState(1);

  return (
    <GoalBase onClick={() => onSelect(null)} onScaleChange={setGoalScale}>
      <DirectSetPiecesGoalLayer
        items={items}
        hoveredId={hoveredId}
        selectedId={selectedId}
        pitchScale={pitchScale}
        goalScale={goalScale}
        onHover={onHover}
        onSelect={onSelect}
      />
    </GoalBase>
  );
};

export default SetPiecesGoalMap;
