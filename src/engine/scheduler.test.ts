import { describe, expect, it } from "vitest";
import type { Segment } from "../timeline/schema";
import {
  boundarySeconds,
  Player,
  segmentAt,
  segmentsStartingIn,
  tickMarksIn,
} from "./scheduler";

function seg(partial: Partial<Segment> & Pick<Segment, "index" | "start" | "end">): Segment {
  return {
    dur: partial.end - partial.start,
    category: "rest",
    label: "x",
    ...partial,
  };
}

const segs: Segment[] = [
  seg({ index: 0, start: 0, end: 3, category: "squat", voiceCue: "a" }),
  seg({ index: 1, start: 3, end: 6, category: "squat" }),
  seg({ index: 2, start: 6, end: 10, category: "hiphinge", voiceCue: "b" }),
];

describe("segmentAt", () => {
  it("returns the segment covering t (start inclusive, end exclusive)", () => {
    expect(segmentAt(segs, 0).index).toBe(0);
    expect(segmentAt(segs, 2.9).index).toBe(0);
    expect(segmentAt(segs, 3).index).toBe(1);
    expect(segmentAt(segs, 6).index).toBe(2);
    expect(segmentAt(segs, 9.9).index).toBe(2);
  });

  it("clamps below and above the range", () => {
    expect(segmentAt(segs, -5).index).toBe(0);
    expect(segmentAt(segs, 100).index).toBe(2);
  });
});

describe("segmentsStartingIn", () => {
  it("returns segments whose start is in [from, to)", () => {
    expect(segmentsStartingIn(segs, 0, 3).map((s) => s.index)).toEqual([0]);
    expect(segmentsStartingIn(segs, 0, 7).map((s) => s.index)).toEqual([0, 1, 2]);
    expect(segmentsStartingIn(segs, 3, 6).map((s) => s.index)).toEqual([1]);
  });
});

describe("tickMarksIn", () => {
  it("emits integer seconds in [from, to) bounded by total", () => {
    expect(tickMarksIn(0, 3, 10)).toEqual([0, 1, 2]);
    expect(tickMarksIn(2.4, 5, 10)).toEqual([3, 4]);
    expect(tickMarksIn(8, 12, 10)).toEqual([8, 9]);
  });
});

describe("boundarySeconds", () => {
  it("collects all segment start seconds", () => {
    expect([...boundarySeconds(segs)].sort((a, b) => a - b)).toEqual([0, 3, 6]);
  });
});

describe("Player", () => {
  interface Recorder {
    ticks: Array<{ at: number; accent: boolean }>;
    segments: Array<{ index: number; at: number }>;
    voices: Array<{ cue: string; at: number }>;
    states: string[];
    finished: number;
  }

  function makePlayer(segments: Segment[]) {
    let clock = 0;
    const rec: Recorder = { ticks: [], segments: [], voices: [], states: [], finished: 0 };
    const player = new Player(segments, {
      now: () => clock,
      autoLoop: false,
      onTick: (at, accent) => rec.ticks.push({ at, accent }),
      onSegment: (s, at) => rec.segments.push({ index: s.index, at }),
      onVoice: (cue, at) => rec.voices.push({ cue, at }),
      onState: (s) => rec.states.push(s),
      onFinish: () => rec.finished++,
    });
    const advance = (to: number) => {
      clock = to;
      player.pump();
    };
    return { player, rec, advance };
  }

  it("schedules tick 0 and segment 0 (with voice) on start", () => {
    const { player, rec } = makePlayer(segs);
    player.start();
    expect(rec.states).toContain("running");
    expect(rec.ticks[0]).toEqual({ at: 0, accent: true });
    expect(rec.segments[0]).toEqual({ index: 0, at: 0 });
    expect(rec.voices[0]).toEqual({ cue: "a", at: 0 });
  });

  it("schedules ticks and segments as the clock advances", () => {
    const { player, rec, advance } = makePlayer(segs);
    player.start();
    advance(3);
    expect(rec.ticks.map((t) => t.at)).toEqual([0, 1, 2, 3]);
    // accent only on boundaries (0 and 3)
    expect(rec.ticks.filter((t) => t.accent).map((t) => t.at)).toEqual([0, 3]);
    expect(rec.segments.map((s) => s.index)).toEqual([0, 1]);
    expect(rec.voices.map((v) => v.cue)).toEqual(["a"]);
  });

  it("does not emit a tick at the very end (total)", () => {
    const { player, rec, advance } = makePlayer(segs);
    player.start();
    advance(10);
    // ticks are at 0..9, not 10
    expect(rec.ticks.map((t) => t.at)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(rec.finished).toBe(1);
    expect(player.getState()).toBe("finished");
  });

  it("pauses and resumes preserving elapsed and event continuity", () => {
    const { player, rec, advance } = makePlayer(segs);
    player.start();
    advance(2);
    player.pause();
    expect(player.elapsed()).toBe(2);
    const ticksAtPause = rec.ticks.length;
    // Resume after wall-clock moved forward by 5s while paused.
    advance(7); // pump while paused: no effect
    expect(rec.ticks.length).toBe(ticksAtPause);
    player.start(); // anchor recomputed: now(7) - offset(2) = 5
    advance(9); // elapsed = 4
    // sec 3 and sec 4 fire at clock 8 and 9 (anchor 5 + sec).
    expect(rec.ticks.map((t) => t.at).slice(ticksAtPause)).toEqual([8, 9]);
    expect(rec.segments.map((s) => s.index)).toEqual([0, 1]);
  });

  it("reset returns to idle and replays from the start", () => {
    const { player, rec, advance } = makePlayer(segs);
    player.start();
    advance(5);
    player.reset();
    expect(player.getState()).toBe("idle");
    expect(player.elapsed()).toBe(0);
    const before = rec.ticks.length;
    player.start();
    expect(rec.ticks.length).toBe(before + 1); // tick 0 again
    expect(rec.ticks[before]).toEqual({ at: 5, accent: true });
  });
});
