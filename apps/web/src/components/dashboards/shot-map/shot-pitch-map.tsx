"use client";

import { useEffect, useRef } from "react";

import PitchBase from "@/components/dashboards/PitchBase";

import ShotArrow from "./shot-arrow";
import ShotsLayer from "./shots-layer";
import type { Shot } from "./types";

interface ShotPitchMapProps {
  shots: Shot[];
  hoveredShotId: number | null;
  selectedShotId: number | null;
  activeShotId: number | null;
  onHover: (eventId: number | null) => void;
  onSelect: (eventId: number | null) => void;
  onScaleChange?: (scale: number) => void;
}

const ShotPitchMap = ({
  shots,
  hoveredShotId,
  selectedShotId,
  activeShotId,
  onHover,
  onSelect,
  onScaleChange,
}: ShotPitchMapProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeShot = activeShotId
    ? (shots.find((shot) => shot.event_id === activeShotId) ?? null)
    : null;

  useEffect(() => {
    if (!svgRef.current || !onScaleChange) return;
    const svg = svgRef.current;

    const updateScale = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0) {
        onScaleChange(rect.width / 80);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(svg);

    return () => observer.disconnect();
  }, [onScaleChange]);

  return (
    <PitchBase svgRef={svgRef} onClick={() => onSelect(null)}>
      <defs>
        <marker
          id="shot-arrow"
          markerWidth="4"
          markerHeight="4"
          refX="3"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L4,2 L0,4 Z" fill="currentColor" className="text-foreground" />
        </marker>
      </defs>
      <ShotsLayer
        shots={shots}
        hoveredShotId={hoveredShotId}
        selectedShotId={selectedShotId}
        activeShotId={activeShotId}
        onHover={onHover}
        onSelect={onSelect}
      />
      <ShotArrow activeShot={activeShot} />
    </PitchBase>
  );
};

export default ShotPitchMap;
