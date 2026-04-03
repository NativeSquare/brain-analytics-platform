"use client";

import type { SetPieceMode } from "./types";

interface LegendOutcomeProps {
  mode: SetPieceMode;
}

const LegendOutcome = ({ mode }: LegendOutcomeProps) => {
  if (mode === "indirect") {
    return (
      <div>
        <div className="font-semibold">First Contact</div>
        <div className="mt-1 grid grid-cols-2 gap-4 text-center">
          <span>Won</span>
          <span>Lost</span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-4 place-items-center">
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "9999px",
              backgroundColor: "#1b5497",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "9999px",
              backgroundColor: "#991b1b",
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="font-semibold">Outcome</div>
      <div className="mt-1 grid grid-cols-4 gap-4 text-center">
        <span>Goal</span>
        <span>Saved</span>
        <span>Blocked</span>
        <span>Off Target</span>
      </div>
      <div className="mt-1 grid grid-cols-4 gap-4 place-items-center">
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "9999px",
            backgroundColor: "#1b5497",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "9999px",
            backgroundColor: "#c21718",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "9999px",
            backgroundColor: "#9ca3af",
            flexShrink: 0,
          }}
        />
        <div
          className="shot-off-target"
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "9999px",
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
};

export default LegendOutcome;
