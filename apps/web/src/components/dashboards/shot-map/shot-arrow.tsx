"use client";

import type { Shot } from "./types";
import { sbToPitchSvg } from "./constants";

interface ShotArrowProps {
  activeShot: Shot | null;
}

const ShotArrow = ({ activeShot }: ShotArrowProps) => {
  if (
    !activeShot ||
    activeShot.location_x == null ||
    activeShot.location_y == null ||
    activeShot.shot_end_location_x == null ||
    activeShot.shot_end_location_y == null
  ) {
    return null;
  }

  const start = sbToPitchSvg(activeShot.location_x, activeShot.location_y);
  const end = sbToPitchSvg(activeShot.shot_end_location_x, activeShot.shot_end_location_y);

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="currentColor"
      className="text-foreground"
      strokeWidth={0.3}
      markerEnd="url(#shot-arrow)"
    />
  );
};

export default ShotArrow;
