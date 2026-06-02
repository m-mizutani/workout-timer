import "./styles/app.css";
import { scheduleCue } from "./audio/cues";
import { AudioEngine } from "./audio/engine";
import { scheduleTick } from "./audio/tick";
import { VoicePlayer } from "./audio/voice";
import { Player } from "./engine/scheduler";
import type { PlayerState } from "./engine/scheduler";
import { expandTimeline, totalDuration } from "./timeline/expand";
import { timelines } from "./timeline/index";
import type { Segment, Timeline } from "./timeline/schema";
import { buildViewModel } from "./ui/render";
import type { ViewModel } from "./ui/render";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing element #${id}`);
  return node as T;
}

const dom = {
  select: el<HTMLSelectElement>("timeline-select"),
  now: el<HTMLElement>("now"),
  badge: el("category-badge"),
  round: el("round"),
  label: el("current-label"),
  sub: el("current-sub"),
  remaining: el("segment-remaining"),
  segBar: el("segment-bar"),
  next: el("next-label"),
  elapsed: el("elapsed"),
  total: el("total"),
  progress: el("progress-bar"),
  overallRemaining: el("remaining"),
  toggle: el<HTMLButtonElement>("toggle"),
  reset: el<HTMLButtonElement>("reset"),
  notice: el("notice"),
};

const engine = new AudioEngine();
const voice = new VoicePlayer(engine);

// AudioContext.currentTime when available, otherwise a wall clock so the
// visual timer keeps working even without Web Audio support.
const clock = (): number => {
  const ctx = engine.context();
  return ctx ? ctx.currentTime : performance.now() / 1000;
};

let timeline: Timeline = timelines[0];
let segments: Segment[] = expandTimeline(timeline);
let total = totalDuration(segments);
let player: Player = buildPlayer();
let voicesLoaded = false;

function buildPlayer(): Player {
  return new Player(segments, {
    now: clock,
    onTick: (at, accent) => scheduleTick(engine, at, accent),
    onSegment: (seg, at) => scheduleCue(engine, seg, at),
    onVoice: (cue, at) => voice.play(cue, at),
    onState: render,
    onFinish: render,
  });
}

function loadTimeline(t: Timeline): void {
  timeline = t;
  segments = expandTimeline(t);
  total = totalDuration(segments);
  player.reset();
  player = buildPlayer();
  render();
}

async function ensureAudio(): Promise<void> {
  if (!engine.available) return;
  // Resume on every start: mobile browsers suspend the context in the
  // background, so a once-only guard would leave audio silent after resuming.
  await engine.resume();
  if (!voicesLoaded) {
    await voice.load(import.meta.env.BASE_URL);
    voicesLoaded = true;
  }
}

async function onToggle(): Promise<void> {
  if (player.getState() === "running") {
    player.pause();
    return;
  }
  try {
    await ensureAudio();
  } catch (err) {
    showNotice(`音声を初期化できませんでした: ${String(err)}`);
  }
  player.start();
}

function onReset(): void {
  player.reset();
  render();
}

function showNotice(message: string): void {
  dom.notice.textContent = message;
  dom.notice.hidden = false;
}

const PHASE_HINT: Record<NonNullable<Segment["phase"]>, string> = {
  down: "ゆっくり下ろす",
  hold: "キープ",
  up: "ゆっくり上げる",
};

function toggleLabel(state: PlayerState): string {
  switch (state) {
    case "running":
      return "中断";
    case "paused":
      return "再開";
    case "finished":
      return "もう一度";
    default:
      return "開始";
  }
}

function apply(vm: ViewModel): void {
  dom.now.dataset.category = vm.current.category;
  dom.badge.textContent = vm.current.categoryLabel;
  dom.round.textContent =
    vm.current.round && vm.current.totalRounds
      ? `${vm.current.round} / ${vm.current.totalRounds} 周目`
      : "";
  dom.label.textContent = vm.current.label;

  const parts: string[] = [];
  if (vm.current.rep && vm.current.repCount) {
    parts.push(`${vm.current.rep} / ${vm.current.repCount} 回`);
  }
  if (vm.current.phase) parts.push(PHASE_HINT[vm.current.phase]);
  dom.sub.textContent = parts.join("　");

  dom.remaining.textContent = String(vm.current.remainingInSegment);
  dom.segBar.style.width = `${Math.round(vm.current.segmentProgress * 100)}%`;
  dom.next.textContent = vm.next ? `次は ${vm.next.categoryLabel}` : "まもなく終了";

  dom.elapsed.textContent = vm.elapsedClock;
  dom.total.textContent = vm.totalClock;
  dom.overallRemaining.textContent = vm.remainingClock;
  dom.progress.style.width = `${Math.round(vm.progress * 100)}%`;

  dom.toggle.textContent = toggleLabel(vm.state);
}

function render(): void {
  apply(buildViewModel(segments, player.elapsed(), player.getState(), total));
}

function tick(): void {
  if (player.getState() === "running") render();
  requestAnimationFrame(tick);
}

function init(): void {
  for (const t of timelines) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    dom.select.appendChild(opt);
  }
  dom.select.value = timeline.id;
  dom.select.addEventListener("change", () => {
    const chosen = timelines.find((t) => t.id === dom.select.value);
    if (chosen) loadTimeline(chosen);
  });
  dom.toggle.addEventListener("click", () => void onToggle());
  dom.reset.addEventListener("click", onReset);

  if (!engine.available) {
    showNotice("このブラウザは Web Audio API に未対応のため、音は鳴りませんが進行表示は動作します。");
  }

  render();
  requestAnimationFrame(tick);
}

init();
