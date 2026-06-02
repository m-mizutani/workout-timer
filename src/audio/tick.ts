import type { AudioEngine } from "./engine";

// The constant 60 BPM tick. A short high blip; accented beats (segment
// boundaries) are louder and higher so they stand out over movement sounds.
export function scheduleTick(engine: AudioEngine, at: number, accent: boolean): void {
  engine.tone({
    at,
    freq: accent ? 1760 : 1175,
    dur: accent ? 0.05 : 0.035,
    type: "square",
    gain: accent ? 0.32 : 0.16,
  });
}
