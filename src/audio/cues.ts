import type { Segment } from "../timeline/schema";
import type { AudioEngine } from "./engine";

// Distinct timbre per movement category so the family is recognizable by ear,
// with squat sub-phases (down/hold/up) further distinguished by pitch contour.
export function scheduleCue(engine: AudioEngine, segment: Segment, at: number): void {
  switch (segment.category) {
    case "squat":
      // Squat sub-phases use distinct motifs so they are recognizable by ear
      // without looking: a falling pair, a flat triple, and a rising pair.
      switch (segment.phase) {
        case "down":
          // 下ろす: clear high -> low two-note fall ("ピンポン↓").
          engine.tone({ at, freq: 698, dur: 0.26, type: "sine", gain: 0.42 });
          engine.tone({ at: at + 0.24, freq: 330, freqEnd: 247, dur: 0.5, type: "sine", gain: 0.45 });
          break;
        case "hold":
          // 止める: three flat equal pulses = "stay still".
          engine.tone({ at, freq: 440, dur: 0.12, type: "triangle", gain: 0.4 });
          engine.tone({ at: at + 0.2, freq: 440, dur: 0.12, type: "triangle", gain: 0.4 });
          engine.tone({ at: at + 0.4, freq: 440, dur: 0.18, type: "triangle", gain: 0.4 });
          break;
        case "up":
          // 上げる: clear low -> high two-note rise ("ピンポン↑").
          engine.tone({ at, freq: 330, dur: 0.26, type: "sine", gain: 0.42 });
          engine.tone({ at: at + 0.24, freq: 698, freqEnd: 880, dur: 0.5, type: "sine", gain: 0.45 });
          break;
        default:
          engine.tone({ at, freq: 392, dur: 0.3, type: "sine", gain: 0.35 });
      }
      break;
    case "hiphinge":
      // Mid triangle, one chirp per rep.
      engine.tone({ at, freq: 330, dur: 0.2, type: "triangle", gain: 0.32 });
      break;
    case "march":
      // Crisp high square, light and rhythmic.
      engine.tone({ at, freq: 587, dur: 0.1, type: "square", gain: 0.22 });
      break;
    case "transition":
      // Gentle two-note rising marker (a voice cue usually plays alongside).
      engine.tone({ at, freq: 523, dur: 0.18, type: "sine", gain: 0.22 });
      engine.tone({ at: at + 0.18, freq: 659, dur: 0.22, type: "sine", gain: 0.22 });
      break;
    case "rest":
      engine.tone({ at, freq: 174, dur: 0.5, type: "sine", gain: 0.25 });
      break;
    case "breathing":
      engine.tone({ at, freq: 147, dur: 0.8, type: "sine", gain: 0.22 });
      break;
    case "finish":
      // Ascending chime arpeggio.
      engine.tone({ at, freq: 523, dur: 0.3, type: "sine", gain: 0.3 });
      engine.tone({ at: at + 0.18, freq: 659, dur: 0.3, type: "sine", gain: 0.3 });
      engine.tone({ at: at + 0.36, freq: 784, dur: 0.5, type: "sine", gain: 0.32 });
      break;
  }
}
