"use client";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

function xgToRadius(xg: number): number {
  return clamp(0.9 + xg * 3.2, 0.9, 3.2);
}

const LegendXgSize = () => {
  const size1 = Math.max(xgToRadius(0.05) * 2 * 5, 10);
  const size2 = Math.max(xgToRadius(0.15) * 2 * 5, 16);
  const size3 = Math.max(xgToRadius(0.35) * 2 * 5, 24);

  return (
    <div>
      <div className="font-semibold">xG Size</div>
      <div className="mt-1 grid grid-cols-3 gap-6 text-center">
        <span>0.05</span>
        <span>0.15</span>
        <span>0.35</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-6 place-items-center">
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
  );
};

export default LegendXgSize;
