import { describe, it, expect } from "vitest";

import { calculateVideoTimestamp } from "../api";

describe("calculateVideoTimestamp", () => {
  it("computes absolute timestamps with default 5s padding", () => {
    // Event at 32.5s into the period, period starts at offset 100s
    const result = calculateVideoTimestamp(32.5, 100);

    expect(result.startTimestamp).toBe(127.5); // 100 + 32.5 - 5
    expect(result.endTimestamp).toBe(137.5); // 100 + 32.5 + 5
  });

  it("computes absolute timestamps with custom padding", () => {
    const result = calculateVideoTimestamp(60, 2700, 10, 15);

    expect(result.startTimestamp).toBe(2750); // 2700 + 60 - 10
    expect(result.endTimestamp).toBe(2775); // 2700 + 60 + 15
  });

  it("clamps startTimestamp to 0 when padding would go negative", () => {
    // Event at 2s into the period, offset 0, padding 5s
    const result = calculateVideoTimestamp(2, 0, 5, 5);

    expect(result.startTimestamp).toBe(0); // max(0, 0 + 2 - 5) = 0
    expect(result.endTimestamp).toBe(7); // 0 + 2 + 5
  });

  it("handles zero event timestamp (start of period)", () => {
    const result = calculateVideoTimestamp(0, 2700, 5, 5);

    expect(result.startTimestamp).toBe(2695); // 2700 + 0 - 5
    expect(result.endTimestamp).toBe(2705); // 2700 + 0 + 5
  });

  it("handles second half with typical period offset", () => {
    // 2H typically starts around offset 2700s (45 min)
    // Event at 15:30 into the second half = 930s
    const result = calculateVideoTimestamp(930, 2700);

    expect(result.startTimestamp).toBe(3625); // 2700 + 930 - 5
    expect(result.endTimestamp).toBe(3635); // 2700 + 930 + 5
  });

  it("handles extra time periods", () => {
    // ET1 starts at offset ~5700 (95 min), event at 8 min = 480s
    const result = calculateVideoTimestamp(480, 5700);

    expect(result.startTimestamp).toBe(6175); // 5700 + 480 - 5
    expect(result.endTimestamp).toBe(6185); // 5700 + 480 + 5
  });

  it("handles zero padding", () => {
    const result = calculateVideoTimestamp(100, 500, 0, 0);

    expect(result.startTimestamp).toBe(600);
    expect(result.endTimestamp).toBe(600);
  });
});
