import type { Timeline } from "../schema";

// Default full-body menu.
// 3 rounds of: slow squat (6 reps x down/hold/up) -> hip hinge (15 reps)
// -> march / knee-up (right leg then left leg) -> rest, followed by breathing
// and a finish block.
// Total: 195s x 3 + 30s + 30s = 645s (10:45).
export const defaultTimeline: Timeline = {
  id: "full-body-10min",
  name: "全身ワークアウト 10分",
  bpm: 60,
  program: [
    {
      type: "group",
      repeat: 3,
      roundLabelTemplate: "{n}周目",
      blocks: [
        {
          type: "squat",
          reps: 6,
          label: "スロースクワット",
          voiceIn: "squat-start",
          phases: [
            { name: "下ろす", dur: 3, phase: "down" },
            { name: "止める", dur: 3, phase: "hold" },
            { name: "上げる", dur: 3, phase: "up" },
          ],
        },
        {
          type: "timed",
          dur: 6,
          label: "移行：姿勢を整える",
          category: "transition",
          voiceIn: "to-hiphinge",
        },
        {
          type: "reps",
          count: 15,
          dur: 3,
          label: "ヒップヒンジ",
          category: "hiphinge",
        },
        {
          type: "timed",
          dur: 5,
          label: "移行：ニーアップ準備",
          category: "transition",
          voiceIn: "to-march",
        },
        {
          type: "timed",
          dur: 30,
          label: "その場足踏み／ニーアップ（右足）",
          category: "march",
        },
        {
          type: "timed",
          dur: 30,
          label: "その場足踏み／ニーアップ（左足）",
          category: "march",
          voiceIn: "march-left",
        },
        {
          type: "timed",
          dur: 25,
          label: "休憩",
          category: "rest",
          voiceIn: "rest",
        },
      ],
    },
    {
      type: "timed",
      dur: 30,
      label: "呼吸を整える",
      category: "breathing",
      voiceIn: "breathing",
    },
    {
      type: "timed",
      dur: 30,
      label: "終了・水分補給・記録",
      category: "finish",
      voiceIn: "finish",
    },
  ],
};
