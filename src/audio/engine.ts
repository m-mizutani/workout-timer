// Thin wrapper around the Web Audio API. All tick and movement sounds are
// synthesized here, so no audio files are needed for them (only the voice
// guidance uses pre-generated WAVs, see voice.ts).

// Synthesized tones are kept at modest per-call gains for clean mixing, then
// boosted globally so the workout is clearly audible. A limiter on the master
// bus catches the resulting peaks so the boost stays loud without harsh clipping.
const TONE_BOOST = 2.8;

export interface ToneOptions {
  /** Absolute AudioContext time to start the tone. */
  at: number;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional end frequency for a glide. */
  freqEnd?: number;
  /** Duration in seconds. */
  dur: number;
  type?: OscillatorType;
  /** Peak gain, 0..1. */
  gain?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private volume = 1.0;

  /** Whether the Web Audio API is usable in this environment. */
  get available(): boolean {
    return typeof window !== "undefined" && "AudioContext" in window;
  }

  /** Lazily create and resume the context (must be called from a user gesture). */
  async resume(): Promise<void> {
    if (!this.available) throw new Error("Web Audio API is not available");
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      // Brick-wall-ish limiter so the loud boost does not clip harshly.
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -3;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.12;
      this.master.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  /** Node that synthesized and decoded sources should connect to. */
  destination(): AudioNode | null {
    return this.master;
  }

  context(): AudioContext | null {
    return this.ctx;
  }

  /** Schedule a single enveloped oscillator tone. */
  tone(opts: ToneOptions): void {
    if (!this.ctx || !this.master) return;
    const { at, freq, freqEnd, dur, type = "sine", gain = 0.3 } = opts;
    const peak = gain * TONE_BOOST;
    const start = Math.max(at, this.ctx.currentTime);
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + dur);
    }
    // Short attack then exponential decay to avoid clicks.
    const attack = Math.min(0.01, dur * 0.2);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env);
    env.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}
