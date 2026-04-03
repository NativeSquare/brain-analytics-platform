"use client";

import { useRef } from "react";

import PitchBase from "@/components/dashboards/PitchBase";

import CornerDotsLayer from "./corner-dots-layer";
import SetPiecesLayer from "./set-pieces-layer";
import ZonePitchLayer from "./zone-pitch-layer";
import type { SetPiece, SetPieceMode, PitchViewMode, ZoneStats } from "./types";

interface SetPiecesPitchMapProps {
  items: SetPiece[];
  mode: SetPieceMode;
  pitchView: PitchViewMode;
  hoveredId: number | null;
  selectedId: number | null;
  highlightedPlayer: string | null;
  zoneStats: ZoneStats[];
  maxZoneCount: number;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
}

const SetPiecesPitchMap = ({
  items,
  mode,
  pitchView,
  hoveredId,
  selectedId,
  highlightedPlayer,
  zoneStats,
  maxZoneCount,
  onHover,
  onSelect,
}: SetPiecesPitchMapProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  return (
    <PitchBase svgRef={svgRef} onClick={() => onSelect(null)}>
      {mode === "indirect" && pitchView === "zones" ? (
        <ZonePitchLayer zones={zoneStats} maxCount={maxZoneCount} />
      ) : (
        <>
          <SetPiecesLayer
            items={items}
            mode={mode}
            hoveredId={hoveredId}
            selectedId={selectedId}
            highlightedPlayer={highlightedPlayer}
            onHover={onHover}
            onSelect={onSelect}
          />
          {mode === "indirect" && (
            <CornerDotsLayer
              items={items}
              hoveredId={hoveredId}
              selectedId={selectedId}
              onHover={onHover}
              onSelect={onSelect}
            />
          )}
        </>
      )}
    </PitchBase>
  );
};

export default SetPiecesPitchMap;
