"use client";

import { xgToRadius } from "./constants";

interface XgSizeLegendProps {
  pitchScale: number;
}

const XgSizeLegend = ({ pitchScale }: XgSizeLegendProps) => {
  const displayScale = Math.max(pitchScale || 1, 1);

  const size1 = Math.max(xgToRadius(0.05) * 2 * displayScale, 10);
  const size2 = Math.max(xgToRadius(0.15) * 2 * displayScale, 16);
  const size3 = Math.max(xgToRadius(0.35) * 2 * displayScale, 24);

  return (
    <div>
      <div className="font-semibold">xG Size</div>
      <div className="mt-1">
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-6 text-center">
          <span>0.05</span>
          <span>0.15</span>
          <span>0.35</span>
        </div>
        <div className="mt-1 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-6 place-items-center">
          <div
            style={{
              width: `${size1}px`,
              height: `${size1}px`,
              borderRadius: "9999px",
              backgroundColor: "var(--foreground)",
              minWidth: "10px",
              minHeight: "10px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: `${size2}px`,
              height: `${size2}px`,
              borderRadius: "9999px",
              backgroundColor: "var(--foreground)",
              minWidth: "16px",
              minHeight: "16px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: `${size3}px`,
              height: `${size3}px`,
              borderRadius: "9999px",
              backgroundColor: "var(--foreground)",
              minWidth: "24px",
              minHeight: "24px",
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default XgSizeLegend;
