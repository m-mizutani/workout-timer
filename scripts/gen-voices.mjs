#!/usr/bin/env node
// Generate voice-guidance WAVs from text using macOS `say`, converting the
// AIFF output to 16-bit mono WAV with `afconvert`. The resulting WAVs are
// committed under public/voices and shipped with the app.
//
// Usage: node scripts/gen-voices.mjs [voice]
//   voice: macOS voice name (default "Kyoko", a Japanese voice).
//
// The engine is intentionally isolated here so it can be swapped for an
// open-source TTS later without touching the app.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "public", "voices");
const tmpDir = join(here, ".voice-tmp");

// cue id -> spoken text. Keep in sync with timeline voiceIn ids.
const CUES = {
  "squat-start": "スロースクワット、はじめます",
  "to-hiphinge": "姿勢を整えて、つぎはヒップヒンジ",
  "to-march": "ニーアップの準備。その場足踏み",
  rest: "休憩します",
  breathing: "呼吸を整えましょう",
  finish: "おつかれさまでした。水分を補給しましょう",
};

const voice = process.argv[2] ?? "Kyoko";

function hasVoice(name) {
  try {
    const list = execFileSync("say", ["-v", "?"], { encoding: "utf8" });
    return list.split("\n").some((line) => line.startsWith(`${name} `) || line.startsWith(name));
  } catch {
    return false;
  }
}

function main() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  const useVoice = hasVoice(voice) ? voice : null;
  if (!useVoice) {
    console.warn(`Voice "${voice}" not found; falling back to the system default voice.`);
  }

  const manifest = {};
  for (const [cue, text] of Object.entries(CUES)) {
    const aiff = join(tmpDir, `${cue}.aiff`);
    const wav = join(outDir, `${cue}.wav`);
    const sayArgs = ["-o", aiff];
    if (useVoice) sayArgs.unshift("-v", useVoice);
    sayArgs.push(text);
    execFileSync("say", sayArgs, { stdio: "inherit" });
    // 16-bit little-endian, 22.05 kHz, mono WAV.
    execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@22050", "-c", "1", aiff, wav], {
      stdio: "inherit",
    });
    manifest[cue] = { file: `${cue}.wav`, text };
    console.log(`generated ${cue}.wav  «${text}»`);
  }

  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\nWrote ${Object.keys(manifest).length} cues to public/voices/`);
}

main();
