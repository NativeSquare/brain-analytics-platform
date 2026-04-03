"use client";

import { OUTCOME_COLORS } from "./constants";

const OutcomeLegend = () => {
  return (
    <div>
      <div className="font-semibold">Outcome</div>
      <div className="mt-1">
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-4 text-center">
          <span>Goal</span>
          <span>On Target</span>
          <span>Blocked</span>
          <span>Off Target</span>
        </div>
        <div className="mt-1 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-4 place-items-center">
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "9999px",
              backgroundColor: OUTCOME_COLORS.Goal,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "9999px",
              backgroundColor: OUTCOME_COLORS["On Target"],
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "9999px",
              backgroundColor: OUTCOME_COLORS.Blocked,
              flexShrink: 0,
            }}
          />
          <div
            className="shot-off-target"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "9999px",
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default OutcomeLegend;
