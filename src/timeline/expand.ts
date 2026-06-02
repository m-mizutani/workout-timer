import type {
  Block,
  GroupBlock,
  RepsBlock,
  Segment,
  SquatBlock,
  Timeline,
  TimedBlock,
} from "./schema";

/** Thrown when a program contains structurally invalid data. */
export class TimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineError";
  }
}

interface Cursor {
  time: number;
  index: number;
  round?: number;
  totalRounds?: number;
  roundLabelTemplate?: string;
}

function roundPrefix(cursor: Cursor): string {
  if (cursor.round === undefined || !cursor.roundLabelTemplate) return "";
  return cursor.roundLabelTemplate.replace("{n}", String(cursor.round)) + " ";
}

function push(
  out: Segment[],
  cursor: Cursor,
  part: Omit<Segment, "index" | "start" | "end" | "dur"> & { dur: number },
): void {
  if (part.dur <= 0) {
    throw new TimelineError(`segment "${part.label}" has non-positive duration ${part.dur}`);
  }
  const start = cursor.time;
  const end = start + part.dur;
  out.push({
    index: cursor.index,
    start,
    end,
    dur: part.dur,
    category: part.category,
    phase: part.phase,
    label: part.label,
    round: cursor.round,
    totalRounds: cursor.totalRounds,
    rep: part.rep,
    repCount: part.repCount,
    voiceCue: part.voiceCue,
  });
  cursor.time = end;
  cursor.index += 1;
}

function expandSquat(block: SquatBlock, out: Segment[], cursor: Cursor): void {
  if (block.reps <= 0) throw new TimelineError("squat block needs reps > 0");
  if (block.phases.length === 0) throw new TimelineError("squat block needs phases");
  const base = block.label ?? "スロースクワット";
  const prefix = roundPrefix(cursor);
  for (let rep = 1; rep <= block.reps; rep++) {
    block.phases.forEach((p, pi) => {
      const isFirst = rep === 1 && pi === 0;
      push(out, cursor, {
        category: "squat",
        phase: p.phase,
        label: `${prefix}${base} ${rep}回目：${p.name}`,
        rep,
        repCount: block.reps,
        dur: p.dur,
        voiceCue: isFirst ? block.voiceIn : undefined,
      });
    });
  }
}

function expandReps(block: RepsBlock, out: Segment[], cursor: Cursor): void {
  if (block.count <= 0) throw new TimelineError(`reps block "${block.label}" needs count > 0`);
  const prefix = roundPrefix(cursor);
  for (let i = 1; i <= block.count; i++) {
    push(out, cursor, {
      category: block.category,
      label: `${prefix}${block.label} ${i}回目`,
      rep: i,
      repCount: block.count,
      dur: block.dur,
      voiceCue: i === 1 ? block.voiceIn : undefined,
    });
  }
}

function expandTimed(block: TimedBlock, out: Segment[], cursor: Cursor): void {
  const prefix = roundPrefix(cursor);
  push(out, cursor, {
    category: block.category,
    label: `${prefix}${block.label}`,
    dur: block.dur,
    voiceCue: block.voiceIn,
  });
}

function expandGroup(block: GroupBlock, out: Segment[], cursor: Cursor): void {
  if (block.repeat <= 0) throw new TimelineError("group block needs repeat > 0");
  for (let r = 1; r <= block.repeat; r++) {
    const childCursor: Cursor = {
      ...cursor,
      round: r,
      totalRounds: block.repeat,
      roundLabelTemplate: block.roundLabelTemplate,
    };
    // Sync mutable fields back via the shared object.
    childCursor.time = cursor.time;
    childCursor.index = cursor.index;
    for (const child of block.blocks) {
      expandBlock(child, out, childCursor);
    }
    cursor.time = childCursor.time;
    cursor.index = childCursor.index;
  }
}

function expandBlock(block: Block, out: Segment[], cursor: Cursor): void {
  switch (block.type) {
    case "squat":
      return expandSquat(block, out, cursor);
    case "reps":
      return expandReps(block, out, cursor);
    case "timed":
      return expandTimed(block, out, cursor);
    case "group":
      return expandGroup(block, out, cursor);
  }
}

/** Expand a timeline's block program into a flat, time-ordered segment list. */
export function expandTimeline(timeline: Timeline): Segment[] {
  const out: Segment[] = [];
  const cursor: Cursor = { time: 0, index: 0 };
  for (const block of timeline.program) {
    expandBlock(block, out, cursor);
  }
  if (out.length === 0) throw new TimelineError("timeline produced no segments");
  return out;
}

/** Total duration of an expanded timeline in seconds. */
export function totalDuration(segments: Segment[]): number {
  return segments.length === 0 ? 0 : segments[segments.length - 1].end;
}
