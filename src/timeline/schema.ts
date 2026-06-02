// Structured representation of a workout timeline.
//
// `timeline.md` is the human-readable source of truth; the same content is
// expressed here as a block-based program so that additional timelines can be
// added and selected at runtime. A program is expanded into a flat list of
// Segments (see expand.ts) which the scheduler drives.

/** Sound family. Each category maps to a distinct synthesized timbre. */
export type Category =
  | "squat"
  | "hiphinge"
  | "march"
  | "transition"
  | "rest"
  | "breathing"
  | "finish";

/** Sub-phase of a slow squat repetition. */
export type Phase = "down" | "hold" | "up";

/** One sub-phase definition within a squat repetition. */
export interface SquatPhaseDef {
  /** Display name, e.g. "下ろす". */
  name: string;
  /** Duration in seconds. */
  dur: number;
  phase: Phase;
}

/** A slow-squat block: `reps` repetitions, each made of the given phases. */
export interface SquatBlock {
  type: "squat";
  reps: number;
  phases: SquatPhaseDef[];
  /** Base label, defaults to "スロースクワット". */
  label?: string;
  /** Voice cue id fired at the first segment of this block. */
  voiceIn?: string;
}

/** A simple repeated movement, e.g. hip hinge: `count` reps of `dur` seconds. */
export interface RepsBlock {
  type: "reps";
  count: number;
  dur: number;
  label: string;
  category: Category;
  voiceIn?: string;
}

/** A single timed block, e.g. transition / march / rest / breathing / finish. */
export interface TimedBlock {
  type: "timed";
  dur: number;
  label: string;
  category: Category;
  voiceIn?: string;
}

/** Repeats its inner blocks `repeat` times, tagging each pass as a round. */
export interface GroupBlock {
  type: "group";
  repeat: number;
  /** Template for the round prefix, `{n}` is replaced by the round number. */
  roundLabelTemplate?: string;
  blocks: Block[];
}

export type Block = SquatBlock | RepsBlock | TimedBlock | GroupBlock;

/** A complete, selectable timeline. */
export interface Timeline {
  id: string;
  name: string;
  /** Tempo of the constant tick, in beats per minute. */
  bpm: number;
  program: Block[];
}

/** A fully expanded unit of the timeline with an absolute time range. */
export interface Segment {
  /** Position in the expanded list, 0-based. */
  index: number;
  /** Absolute start time in seconds. */
  start: number;
  /** Absolute end time in seconds. */
  end: number;
  /** Duration in seconds (end - start). */
  dur: number;
  category: Category;
  phase?: Phase;
  label: string;
  /** Round number (1-based) when inside a group. */
  round?: number;
  /** Total number of rounds for the enclosing group. */
  totalRounds?: number;
  /** Repetition number (1-based) within an exercise. */
  rep?: number;
  /** Total repetitions in the enclosing exercise instance. */
  repCount?: number;
  /** Voice cue id to play at this segment's start, if any. */
  voiceCue?: string;
}
