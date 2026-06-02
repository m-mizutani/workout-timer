import { describe, expect, it } from "vitest";
import { expandTimeline, totalDuration } from "../expand";
import { defaultTimeline } from "./default";

describe("defaultTimeline", () => {
  const segments = expandTimeline(defaultTimeline);

  it("lasts exactly 600 seconds (10:00)", () => {
    expect(totalDuration(segments)).toBe(600);
  });

  it("has contiguous, gap-free segments", () => {
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBe(segments[i - 1].end);
    }
    expect(segments[0].start).toBe(0);
  });

  it("contains 3 rounds", () => {
    const rounds = new Set(segments.filter((s) => s.round).map((s) => s.round));
    expect([...rounds].sort()).toEqual([1, 2, 3]);
    expect(segments.every((s) => s.totalRounds === 3 || s.round === undefined)).toBe(true);
  });

  it("has 6 squat reps x 3 phases per round", () => {
    const squatRound1 = segments.filter((s) => s.category === "squat" && s.round === 1);
    expect(squatRound1).toHaveLength(18);
    expect(new Set(squatRound1.map((s) => s.phase))).toEqual(new Set(["down", "hold", "up"]));
  });

  it("has 15 hip hinge reps per round", () => {
    const hh = segments.filter((s) => s.category === "hiphinge" && s.round === 2);
    expect(hh).toHaveLength(15);
  });

  it("places voice cues at every transition, rest, breathing and finish", () => {
    const cues = segments.filter((s) => s.voiceCue).map((s) => s.voiceCue);
    // 3 rounds x (squat-start, to-hiphinge, to-march, rest) + breathing + finish.
    expect(cues).toEqual([
      "squat-start",
      "to-hiphinge",
      "to-march",
      "rest",
      "squat-start",
      "to-hiphinge",
      "to-march",
      "rest",
      "squat-start",
      "to-hiphinge",
      "to-march",
      "rest",
      "breathing",
      "finish",
    ]);
  });

  it("ends with breathing then finish blocks outside any round", () => {
    const last = segments[segments.length - 1];
    expect(last.category).toBe("finish");
    expect(last.round).toBeUndefined();
    const breathing = segments.find((s) => s.category === "breathing");
    expect(breathing?.round).toBeUndefined();
  });
});
