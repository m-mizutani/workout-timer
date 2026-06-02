import { describe, expect, it } from "vitest";
import { expandTimeline, totalDuration } from "../expand";
import { squat333Timeline } from "./squat333";

describe("squat333Timeline", () => {
  const segments = expandTimeline(squat333Timeline);

  it("lasts exactly 600 seconds (10:00)", () => {
    expect(totalDuration(segments)).toBe(600);
  });

  it("has contiguous, gap-free segments starting at 0", () => {
    expect(segments[0].start).toBe(0);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBe(segments[i - 1].end);
    }
  });

  it("has 5 sets of 8 reps x 3 phases = 120 squat segments", () => {
    const squat = segments.filter((s) => s.category === "squat");
    expect(squat).toHaveLength(120);
    const firstSet = squat.filter((s) => s.label.includes("1セット目"));
    expect(firstSet).toHaveLength(24);
    expect(new Set(firstSet.map((s) => s.phase))).toEqual(new Set(["down", "hold", "up"]));
  });

  it("each squat set lasts 72 seconds", () => {
    const set1 = segments.filter((s) => s.label.includes("1セット目"));
    const start = set1[0].start;
    const end = set1[set1.length - 1].end;
    expect(end - start).toBe(72);
  });

  it("has 4 rests of 48s between sets and a closing breathing block", () => {
    const rests = segments.filter((s) => s.category === "rest");
    expect(rests).toHaveLength(4);
    expect(rests.every((s) => s.dur === 48)).toBe(true);

    const breathing = segments.filter((s) => s.category === "breathing");
    expect(breathing).toHaveLength(1);
    expect(breathing[0]).toMatchObject({ dur: 48, end: 600 });
  });

  it("places voice cues: (squat-start, rest) x4, squat-start, breathing", () => {
    const cues = segments.filter((s) => s.voiceCue).map((s) => s.voiceCue);
    expect(cues).toEqual([
      "squat-start",
      "rest",
      "squat-start",
      "rest",
      "squat-start",
      "rest",
      "squat-start",
      "rest",
      "squat-start",
      "breathing",
    ]);
  });
});
