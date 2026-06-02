import type { Segment } from "../timeline/schema";

// --- Pure time -> event helpers (unit-tested) ------------------------------

/** Find the segment active at absolute time `t` (seconds). */
export function segmentAt(segments: Segment[], t: number): Segment {
  if (segments.length === 0) throw new Error("no segments");
  if (t <= segments[0].start) return segments[0];
  const last = segments[segments.length - 1];
  if (t >= last.end) return last;
  // Segments are contiguous and sorted; binary search by start.
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segments[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return segments[lo];
}

/** Segments whose start falls in [from, to). */
export function segmentsStartingIn(segments: Segment[], from: number, to: number): Segment[] {
  return segments.filter((s) => s.start >= from && s.start < to);
}

/** Set of absolute seconds that are segment boundaries (for tick accents). */
export function boundarySeconds(segments: Segment[]): Set<number> {
  return new Set(segments.map((s) => s.start));
}

/** Integer-second tick marks in [from, to), bounded by total (exclusive). */
export function tickMarksIn(from: number, to: number, total: number): number[] {
  const marks: number[] = [];
  const start = Math.max(0, Math.ceil(from));
  for (let n = start; n < to && n < total; n++) {
    marks.push(n);
  }
  return marks;
}

// --- Real-time player ------------------------------------------------------

export type PlayerState = "idle" | "running" | "paused" | "finished";

export interface PlayerDeps {
  /** Monotonic clock in seconds (e.g. AudioContext.currentTime). */
  now: () => number;
  /** Schedule a tick sound at absolute clock time `at`. */
  onTick: (at: number, accent: boolean) => void;
  /** Schedule a segment's action sound at absolute clock time `at`. */
  onSegment: (segment: Segment, at: number) => void;
  /** Schedule a voice cue at absolute clock time `at`. */
  onVoice: (cue: string, at: number) => void;
  /** Notify state transitions. */
  onState?: (state: PlayerState) => void;
  /** Called once when playback reaches the end. */
  onFinish?: () => void;
  /** Disable the internal setInterval loop (for tests; drive pump() manually). */
  autoLoop?: boolean;
}

const LOOKAHEAD = 0.12; // seconds scheduled ahead of the clock
const TICK_INTERVAL_MS = 25;

export class Player {
  private state: PlayerState = "idle";
  private anchor = 0; // clock time corresponding to elapsed = 0
  private elapsedOffset = 0; // elapsed accumulated before the current run
  private nextTickSec = 0;
  private nextSegIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly total: number;
  private readonly boundaries: Set<number>;

  constructor(
    private readonly segments: Segment[],
    private readonly deps: PlayerDeps,
  ) {
    this.total = segments.length === 0 ? 0 : segments[segments.length - 1].end;
    this.boundaries = boundarySeconds(segments);
  }

  getState(): PlayerState {
    return this.state;
  }

  /** Current elapsed time in seconds. */
  elapsed(): number {
    if (this.state === "running") {
      return Math.min(this.total, this.deps.now() - this.anchor);
    }
    return this.elapsedOffset;
  }

  totalDuration(): number {
    return this.total;
  }

  start(): void {
    if (this.state === "running") return;
    if (this.state === "finished") this.reset();
    this.anchor = this.deps.now() - this.elapsedOffset;
    this.setState("running");
    if (this.deps.autoLoop !== false) {
      this.timer = setInterval(() => this.pump(), TICK_INTERVAL_MS);
    }
    this.pump();
  }

  pause(): void {
    if (this.state !== "running") return;
    this.elapsedOffset = this.elapsed();
    this.stopTimer();
    this.setState("paused");
  }

  toggle(): void {
    if (this.state === "running") this.pause();
    else this.start();
  }

  reset(): void {
    this.stopTimer();
    this.elapsedOffset = 0;
    this.anchor = 0;
    this.nextTickSec = 0;
    this.nextSegIndex = 0;
    this.setState("idle");
  }

  /** Schedule any events that fall within the look-ahead window. */
  pump(): void {
    if (this.state !== "running") return;
    const clock = this.deps.now();
    const horizon = clock + LOOKAHEAD;

    while (this.nextTickSec < this.total && this.anchor + this.nextTickSec <= horizon) {
      const at = this.anchor + this.nextTickSec;
      this.deps.onTick(at, this.boundaries.has(this.nextTickSec));
      this.nextTickSec += 1;
    }

    while (
      this.nextSegIndex < this.segments.length &&
      this.anchor + this.segments[this.nextSegIndex].start <= horizon
    ) {
      const seg = this.segments[this.nextSegIndex];
      const at = this.anchor + seg.start;
      this.deps.onSegment(seg, at);
      if (seg.voiceCue) this.deps.onVoice(seg.voiceCue, at);
      this.nextSegIndex += 1;
    }

    if (clock - this.anchor >= this.total) {
      this.elapsedOffset = this.total;
      this.stopTimer();
      this.setState("finished");
      this.deps.onFinish?.();
    }
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private setState(s: PlayerState): void {
    this.state = s;
    this.deps.onState?.(s);
  }
}
