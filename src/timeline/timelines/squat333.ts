import type { Block, Timeline } from "../schema";

// 3-3-3 slow squat (down 3s / hold 3s / up 3s = 9s per rep), 8 reps per set.
// 5 sets with a 48s rest between them, closing with a breathing block.
// Total: 5 x 72s + 4 x 48s + 48s = 600s (10:00).
const SETS = 5;
const REPS_PER_SET = 8;
const REST_SECONDS = 48;

function squatSet(set: number): Block {
  return {
    type: "squat",
    reps: REPS_PER_SET,
    label: `3-3-3 スロースクワット（${set}セット目）`,
    voiceIn: "squat-start",
    phases: [
      { name: "下ろす", dur: 3, phase: "down" },
      { name: "止める", dur: 3, phase: "hold" },
      { name: "上げる", dur: 3, phase: "up" },
    ],
  };
}

const program: Block[] = [];
for (let set = 1; set <= SETS; set++) {
  program.push(squatSet(set));
  if (set < SETS) {
    program.push({ type: "timed", dur: REST_SECONDS, label: "休憩", category: "rest", voiceIn: "rest" });
  }
}
program.push({
  type: "timed",
  dur: REST_SECONDS,
  label: "呼吸を整える",
  category: "breathing",
  voiceIn: "breathing",
});

export const squat333Timeline: Timeline = {
  id: "squat-333-10min",
  name: "3-3-3 スロースクワット 5セット 10分",
  bpm: 60,
  program,
};
