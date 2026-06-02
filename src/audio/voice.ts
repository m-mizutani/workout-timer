import type { AudioEngine } from "./engine";

interface VoiceManifestEntry {
  file: string;
  text: string;
}
type VoiceManifest = Record<string, VoiceManifestEntry>;

// Plays pre-generated voice WAVs (see scripts/gen-voices.mjs). Missing cues are
// skipped with a warning so a generation gap never stops the timer.
export class VoicePlayer {
  private manifest: VoiceManifest = {};
  private buffers = new Map<string, AudioBuffer>();
  private loaded = false;

  constructor(private readonly engine: AudioEngine) {}

  /** Fetch the manifest and decode all WAVs. Safe to call more than once. */
  async load(baseUrl: string): Promise<void> {
    if (this.loaded || !this.engine.available) return;
    const ctx = this.engine.context();
    if (!ctx) return;
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    try {
      const res = await fetch(`${base}voices/manifest.json`);
      if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
      this.manifest = (await res.json()) as VoiceManifest;
    } catch (err) {
      console.warn("voice manifest could not be loaded; voice guidance disabled", err);
      this.loaded = true;
      return;
    }
    await Promise.all(
      Object.entries(this.manifest).map(async ([cue, entry]) => {
        try {
          const res = await fetch(`${base}voices/${entry.file}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.arrayBuffer();
          this.buffers.set(cue, await ctx.decodeAudioData(data));
        } catch (err) {
          console.warn(`voice cue "${cue}" (${entry.file}) failed to load`, err);
        }
      }),
    );
    this.loaded = true;
  }

  /** Schedule a voice cue at absolute AudioContext time `at`. */
  play(cue: string, at: number): void {
    const ctx = this.engine.context();
    const dest = this.engine.destination();
    const buffer = this.buffers.get(cue);
    if (!ctx || !dest || !buffer) {
      if (!buffer) console.warn(`voice cue "${cue}" not available`);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(dest);
    src.start(Math.max(at, ctx.currentTime));
  }
}
