"use client";

import type { ZoneStats } from "./types";

interface ZonePitchLayerProps {
  zones: ZoneStats[];
  maxCount: number;
}

/**
 * SVG layer that renders zone polygons with opacity proportional to event count,
 * and avgXg labels at centroids.
 */
const ZonePitchLayer = ({ zones, maxCount }: ZonePitchLayerProps) => {
  return (
    <>
      {zones.map((zone) => {
        const opacity =
          maxCount > 0 ? Math.max(0.1, zone.count / maxCount) : 0.1;
        const points = zone.polygon.map((p) => `${p.x},${p.y}`).join(" ");

        return (
          <g key={zone.zoneId}>
            <polygon
              points={points}
              fill="#1b5497"
              fillOpacity={opacity * 0.6}
              stroke="#1b5497"
              strokeWidth={0.3}
              strokeOpacity={0.7}
            />
            {/* Count badge */}
            <text
              x={zone.centroid.x}
              y={zone.centroid.y - 1.2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="2.8"
              fontWeight="bold"
              fill="currentColor"
              className="text-foreground"
            >
              {zone.count}
            </text>
            {/* Avg xG */}
            {zone.avgXg > 0 && (
              <text
                x={zone.centroid.x}
                y={zone.centroid.y + 1.8}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="2"
                fill="currentColor"
                className="text-muted-foreground"
              >
                {zone.avgXg.toFixed(2)} xG
              </text>
            )}
          </g>
        );
      })}
    </>
  );
};

export default ZonePitchLayer;
