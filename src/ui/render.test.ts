import { describe, expect, it } from "vitest";
import { expandTimeline, totalDuration } from "../timeline/expand";
import type { Timeline } from "../timeline/schema";
import { buildViewModel, CATEGORY_LABEL, formatTime } from "./render";

describe("formatTime", () => {
  it("formats seconds as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
  });

  it("clamps negatives to 0:00 and floors fractions", () => {
    expect(formatTime(-3)).toBe("0:00");
    expect(formatTime(9.9)).toBe("0:09");
  });
});

const tl: Timeline = {
  id: "t",
  name: "t",
  bpm: 60,
  program: [
    {
      type: "squat",
      reps: 1,
      voiceIn: "go",
      phases: [
        { name: "下ろす", dur: 3, phase: "down" },
        { name: "止める", dur: 3, phase: "hold" },
        { name: "上げる", dur: 3, phase: "up" },
      ],
    },
    { type: "timed", dur: 6, label: "移行", category: "transition" },
  ],
};
const segments = expandTimeline(tl);
const total = totalDuration(segments); // 15

describe("buildViewModel", () => {
  it("reports the current segment and remaining time", () => {
    const vm = buildViewModel(segments, 1, "running", total);
    expect(vm.current.category).toBe("squat");
    expect(vm.current.phase).toBe("down");
    expect(vm.current.categoryLabel).toBe(CATEGORY_LABEL.squat);
    expect(vm.current.remainingInSegment).toBe(2); // 3 - 1
    expect(vm.current.segmentProgress).toBeCloseTo(1 / 3);
    expect(vm.elapsedClock).toBe("0:01");
    expect(vm.totalClock).toBe("0:15");
  });

  it("exposes the next segment", () => {
    const vm = buildViewModel(segments, 1, "running", total);
    expect(vm.next?.category).toBe("squat");
    expect(vm.next?.phase).toBe("hold");
  });

  it("returns null next at the last segment", () => {
    const vm = buildViewModel(segments, 14, "running", total);
    expect(vm.current.category).toBe("transition");
    expect(vm.next).toBeNull();
  });

  it("computes overall progress and remaining", () => {
    const vm = buildViewModel(segments, 9, "running", total);
    expect(vm.progress).toBeCloseTo(9 / 15);
    expect(vm.remaining).toBe(6);
    expect(vm.remainingClock).toBe("0:06");
  });

  it("clamps elapsed into [0, total]", () => {
    expect(buildViewModel(segments, -5, "idle", total).elapsed).toBe(0);
    expect(buildViewModel(segments, 999, "finished", total).elapsed).toBe(total);
  });
});
