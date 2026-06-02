import { describe, expect, it } from "vitest";
import { expandTimeline, TimelineError, totalDuration } from "./expand";
import type { Timeline } from "./schema";

describe("expandTimeline", () => {
  it("expands a squat block into one segment per phase with rep numbering", () => {
    const tl: Timeline = {
      id: "t",
      name: "t",
      bpm: 60,
      program: [
        {
          type: "squat",
          reps: 2,
          voiceIn: "go",
          phases: [
            { name: "下ろす", dur: 3, phase: "down" },
            { name: "上げる", dur: 2, phase: "up" },
          ],
        },
      ],
    };
    const segs = expandTimeline(tl);
    expect(segs).toHaveLength(4);

    expect(segs[0]).toMatchObject({
      index: 0,
      start: 0,
      end: 3,
      dur: 3,
      category: "squat",
      phase: "down",
      rep: 1,
      repCount: 2,
      voiceCue: "go",
    });
    expect(segs[0].label).toContain("1回目");
    expect(segs[0].label).toContain("下ろす");

    // Only the very first segment carries the voice cue.
    expect(segs[1].voiceCue).toBeUndefined();
    expect(segs[1]).toMatchObject({ start: 3, end: 5, phase: "up", rep: 1 });
    expect(segs[2]).toMatchObject({ start: 5, end: 8, phase: "down", rep: 2 });
    expect(segs[3]).toMatchObject({ start: 8, end: 10, phase: "up", rep: 2 });
  });

  it("expands a reps block with sequential numbering and contiguous times", () => {
    const tl: Timeline = {
      id: "t",
      name: "t",
      bpm: 60,
      program: [
        { type: "reps", count: 3, dur: 3, label: "ヒップヒンジ", category: "hiphinge", voiceIn: "hh" },
      ],
    };
    const segs = expandTimeline(tl);
    expect(segs).toHaveLength(3);
    expect(segs.map((s) => s.start)).toEqual([0, 3, 6]);
    expect(segs[0].voiceCue).toBe("hh");
    expect(segs[2].voiceCue).toBeUndefined();
    expect(segs[2].label).toContain("3回目");
    expect(segs.every((s) => s.category === "hiphinge")).toBe(true);
  });

  it("repeats a group and tags rounds with labels and totals", () => {
    const tl: Timeline = {
      id: "t",
      name: "t",
      bpm: 60,
      program: [
        {
          type: "group",
          repeat: 2,
          roundLabelTemplate: "{n}周目",
          blocks: [{ type: "timed", dur: 5, label: "休憩", category: "rest" }],
        },
      ],
    };
    const segs = expandTimeline(tl);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ round: 1, totalRounds: 2, start: 0, end: 5 });
    expect(segs[1]).toMatchObject({ round: 2, totalRounds: 2, start: 5, end: 10 });
    expect(segs[0].label).toBe("1周目 休憩");
    expect(segs[1].label).toBe("2周目 休憩");
  });

  it("keeps indexes and times contiguous across mixed blocks", () => {
    const tl: Timeline = {
      id: "t",
      name: "t",
      bpm: 60,
      program: [
        { type: "timed", dur: 2, label: "a", category: "transition" },
        { type: "reps", count: 2, dur: 3, label: "b", category: "march" },
      ],
    };
    const segs = expandTimeline(tl);
    expect(segs.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(segs.map((s) => s.start)).toEqual([0, 2, 5]);
    expect(segs.map((s) => s.end)).toEqual([2, 5, 8]);
  });

  it("throws on non-positive durations", () => {
    const tl: Timeline = {
      id: "t",
      name: "t",
      bpm: 60,
      program: [{ type: "timed", dur: 0, label: "bad", category: "rest" }],
    };
    expect(() => expandTimeline(tl)).toThrow(TimelineError);
  });

  it("throws on empty timeline", () => {
    const tl: Timeline = { id: "t", name: "t", bpm: 60, program: [] };
    expect(() => expandTimeline(tl)).toThrow(TimelineError);
  });
});

describe("totalDuration", () => {
  it("returns the end of the last segment", () => {
    const tl: Timeline = {
      id: "t",
      name: "t",
      bpm: 60,
      program: [{ type: "timed", dur: 7, label: "a", category: "rest" }],
    };
    expect(totalDuration(expandTimeline(tl))).toBe(7);
  });
});
