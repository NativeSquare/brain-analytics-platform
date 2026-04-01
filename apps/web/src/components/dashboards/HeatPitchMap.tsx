"use client";

import { useEffect, useRef, useState } from "react";
import FullPitchBase from "./FullPitchBase";
import simpleheat from "@/lib/simpleheat";
import type { SimpleHeatInstance } from "@/lib/simpleheat";
import type { PitchEvent, EventType } from "./types";

interface HeatPitchMapProps {
  events: PitchEvent[];
  isPlayerFiltered?: boolean;
  eventType?: EventType;
}

export default function HeatPitchMap({
  events,
  isPlayerFiltered,
  eventType,
}: HeatPitchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatMapRef = useRef<SimpleHeatInstance | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    if (!heatMapRef.current) {
      heatMapRef.current = simpleheat(canvas);
      heatMapRef.current.resize();
      // Gradient matches Sampdoria theme
      heatMapRef.current.gradient({
        0.4: "#1b5497", // Sampdoria Blue
        0.6: "cyan",
        0.8: "yellow",
        1.0: "red",
      });
    } else {
      heatMapRef.current.resize();
    }

    const data: [number, number, number][] = events
      .filter((ev) => ev.location_x != null && ev.location_y != null)
      .map((ev) => {
        // Map StatsBomb (X: 0-120, Y: 0-80) to vertical pitch SVG (width: 80, height: 120)
        // X from StatsBomb (0-120) maps to SVG Y (120-0) -> SVG Y = 120 - sx
        // Y from StatsBomb (0-80) maps to SVG X (0-80) -> SVG X = sy
        // Since canvas uses width/height instead of 80/120 directly, we scale by dimension
        const x = (ev.location_y / 80) * dimensions.width;
        const y = ((120 - ev.location_x) / 120) * dimensions.height;
        return [x, y, 1];
      });

    // Make the heat map more obvious when filtering by a specific player
    const radius = isPlayerFiltered ? 40 : 25;
    const blur = isPlayerFiltered ? 25 : 15;
    const minOpacity = isPlayerFiltered ? 0.15 : 0.05;

    heatMapRef.current.data(data);

    // Auto-scale density based on event type frequency
    // Pressures happen constantly (high volume), build-up passes are medium,
    // interceptions and under pressure are lower
    let densityMultiplier = 0.05;
    let baseOpacityMultiplier = 1;
    let baseRadiusMultiplier = 1;

    if (eventType === "pressures") {
      densityMultiplier = 0.02; // Requires more points to become "red hot"
    } else if (eventType === "buildup") {
      densityMultiplier = 0.04;
    } else if (eventType === "underPressure") {
      densityMultiplier = 0.2; // Super high scaling since these are rare events
      baseOpacityMultiplier = 2; // Make the rare dots fundamentally darker/more visible
      baseRadiusMultiplier = 1.3; // Make rare dots slightly larger out of the gate
    } else if (eventType === "interceptions") {
      densityMultiplier = 0.4; // Super high scaling since these are rare events
      baseOpacityMultiplier = 4; // Make the rare dots fundamentally darker/more visible
      baseRadiusMultiplier = 2; // Make rare dots slightly larger out of the gate
    }

    if (isPlayerFiltered) {
      // Individual players have a fraction of the data, so make it much easier to hit max density
      densityMultiplier *= 3;
    }

    heatMapRef.current.radius(
      radius * baseRadiusMultiplier,
      blur * baseRadiusMultiplier,
    );

    const maxDensity = Math.max(1, data.length * densityMultiplier);
    heatMapRef.current.max(maxDensity);

    heatMapRef.current.draw(minOpacity * baseOpacityMultiplier);
  }, [events, dimensions, isPlayerFiltered, eventType]);

  return (
    <FullPitchBase
      overlay={
        <div
          ref={containerRef}
          className="pointer-events-none absolute inset-0 z-10 mix-blend-multiply opacity-80"
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      }
    />
  );
}
