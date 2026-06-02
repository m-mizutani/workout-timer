import { segmentAt } from "../engine/scheduler";
import type { PlayerState } from "../engine/scheduler";
import type { Category, Segment } from "../timeline/schema";

/** Japanese display label for each sound/movement category. */
export const CATEGORY_LABEL: Record<Category, string> = {
  squat: "スクワット",
  hiphinge: "ヒップヒンジ",
  march: "足踏み",
  transition: "移行",
  rest: "休憩",
  breathing: "呼吸",
  finish: "終了",
};

/** Format seconds as "m:ss". */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export interface SegmentView {
  label: string;
  category: Category;
  categoryLabel: string;
  phase?: Segment["phase"];
  round?: number;
  totalRounds?: number;
  rep?: number;
  repCount?: number;
  /** Whole seconds remaining in the current segment. */
  remainingInSegment: number;
  /** Progress through the current segment, 0..1. */
  segmentProgress: number;
}

export interface ViewModel {
  state: PlayerState;
  elapsed: number;
  total: number;
  remaining: number;
  /** Overall progress, 0..1. */
  progress: number;
  elapsedClock: string;
  remainingClock: string;
  totalClock: string;
  current: SegmentView;
  next: SegmentView | null;
}

function toSegmentView(seg: Segment, elapsed: number): SegmentView {
  const clamped = Math.min(Math.max(elapsed, seg.start), seg.end);
  const view: SegmentView = {
    label: seg.label,
    category: seg.category,
    categoryLabel: CATEGORY_LABEL[seg.category],
    remainingInSegment: Math.ceil(seg.end - clamped),
    segmentProgress: seg.dur > 0 ? (clamped - seg.start) / seg.dur : 1,
  };
  if (seg.phase !== undefined) view.phase = seg.phase;
  if (seg.round !== undefined) view.round = seg.round;
  if (seg.totalRounds !== undefined) view.totalRounds = seg.totalRounds;
  if (seg.rep !== undefined) view.rep = seg.rep;
  if (seg.repCount !== undefined) view.repCount = seg.repCount;
  return view;
}

/** Build the display model for the current playback position. */
export function buildViewModel(
  segments: Segment[],
  elapsed: number,
  state: PlayerState,
  total: number,
): ViewModel {
  const e = Math.min(Math.max(elapsed, 0), total);
  const current = segmentAt(segments, e);
  const nextSeg = segments[current.index + 1] ?? null;
  return {
    state,
    elapsed: e,
    total,
    remaining: total - e,
    progress: total > 0 ? e / total : 0,
    elapsedClock: formatTime(e),
    remainingClock: formatTime(total - e),
    totalClock: formatTime(total),
    current: toSegmentView(current, e),
    next: nextSeg ? toSegmentView(nextSeg, nextSeg.start) : null,
  };
}
