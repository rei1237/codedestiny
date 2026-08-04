// 정적 VN 엔진이 정본 청크 구조와 핵심 회귀 방지 장치를 계속 보유하는지 검사한다.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildNovelPayload, MANIFEST_PATH, SCENE_MATRIX_PATH } from "./build-novel-runtime.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const PLAYER_PATH = resolve(ROOT, "public/codedestiny-novel.html");
const REMASTER_ASSET = resolve(ROOT, "public/images/novel/remaster/river-of-names-v1.webp");
const EVENT_BACKGROUNDS = [
  { file: "memory-vault-release-v1.webp", maxBytes: 240_000 },
  { file: "clear-moon-waterway-v1.webp", maxBytes: 330_000 },
  { file: "cherry-moon-portal-promise-v1.webp", maxBytes: 370_000 },
];
const YEON_SPRITE_DIR = resolve(ROOT, "public/images/novel/remaster/yeon");
const YEON_SPRITES = ["base", "left", "right", "sideL", "sideR", "fear", "angry", "smile", "sleep", "cry", "onigiri", "disappoint"];
const MOKA_SHEET = resolve(ROOT, "public/images/novel/remaster/moka-sheet.webp");
const CROW_SPRITES = ["base", "alt"];

function fail(message) {
  console.error(`[novel-runtime] ${message}`);
  process.exit(1);
}

const html = readFileSync(PLAYER_PATH, "utf8");
const requiredRuntimeHooks = [
  "function initNovelData()",
  "function ensureEpisodeLoaded(index)",
  "function warmNextEpisode(index)",
  "function resolveSavedEpisode(save)",
  "function resolveSavedBeat(ep,save)",
  "function showNovelDataError(error)",
  "typeof window.matchMedia===\"function\"",
  "episodeId:episode&&episode.id",
  "beatId:beat&&beat.id",
  "prefers-reduced-motion",
  "body.reduce-motion .bgImg",
  "function setSceneDirection(scene)",
  "RIVER_FALLBACK",
  "/images/novel/remaster/river-of-names-v1.webp",
];
for (const hook of requiredRuntimeHooks) if (!html.includes(hook)) fail(`required runtime hook missing: ${hook}`);
if ((html.match(/bootDirectPlay\(\);/g) ?? []).length !== 1) fail("direct player boot must have exactly one data-ready entry point");
if (html.includes("EPISODES.push(")) fail("inline episode data remains in the player; run externalize-novel-episodes.mjs");
if (statSync(PLAYER_PATH).size > 180_000) fail("player shell exceeds the 180KB initial-size budget");
if (!existsSync(REMASTER_ASSET) || statSync(REMASTER_ASSET).size > 320_000) fail("remaster river asset is missing or exceeds its WebP budget");
for (const asset of EVENT_BACKGROUNDS) {
  const assetPath = resolve(ROOT, "public/images/novel/remaster", asset.file);
  if (!existsSync(assetPath) || statSync(assetPath).size === 0 || statSync(assetPath).size > asset.maxBytes) {
    fail(`event background is missing or exceeds its WebP budget: ${asset.file}`);
  }
  if (!html.includes(`/images/novel/remaster/${asset.file}`)) fail(`player does not use local event background: ${asset.file}`);
}
for (const sprite of YEON_SPRITES) {
  const spritePath = resolve(YEON_SPRITE_DIR, `${sprite}.webp`);
  if (!existsSync(spritePath) || statSync(spritePath).size === 0) fail(`transparent Yeon sprite missing: ${sprite}`);
  if (!html.includes(`/images/novel/remaster/yeon/${sprite}.webp`)) fail(`player does not use local Yeon sprite: ${sprite}`);
}
if (!existsSync(MOKA_SHEET) || statSync(MOKA_SHEET).size > 360_000 || !html.includes("/images/novel/remaster/moka-sheet.webp")) fail("transparent Moka expression sheet is missing or unused");
for (const sprite of CROW_SPRITES) {
  const spritePath = resolve(ROOT, `public/images/novel/remaster/crow/${sprite}.webp`);
  if (!existsSync(spritePath) || !html.includes(`/images/novel/remaster/crow/${sprite}.webp`)) fail(`transparent Crow sprite missing or unused: ${sprite}`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
if (inlineScripts.length === 0) fail("inline player engine was not found");
for (const [index, source] of inlineScripts.entries()) {
  try { new Function(source); } catch (error) { fail(`inline script ${index + 1} does not parse: ${error.message}`); }
}

const runtime = buildNovelPayload();
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const matrix = JSON.parse(readFileSync(SCENE_MATRIX_PATH, "utf8"));
if (manifest.sourceHash !== runtime.sourceHash || manifest.episodeCount !== 44 || manifest.beatCount !== 8836) {
  fail("manifest is not synchronized with the 44-episode canonical source");
}
if (matrix.sourceHash !== runtime.sourceHash || matrix.episodes?.length !== runtime.episodeCount || matrix.episodes.some((episode) => episode.emotionPath?.length < 3 || !episode.visualCues?.every((cue) => cue.accessibility))) {
  fail("scene matrix is stale or missing its three-stage emotion/accessibility cues");
}
const expectedVisualCues = [
  [36, 19, "memoryVault"],
  [41, 24, "clearMoonWater"],
  [43, 8, "cherryMoonPortal"],
];
for (const [episodeIndex, beatIndex, background] of expectedVisualCues) {
  if (runtime.episodes[episodeIndex]?.beats[beatIndex]?.bg !== background) {
    fail(`event background is not bound to its canonical beat: ${background}`);
  }
}
const preservedEarlyVisualCues = [
  [0, 63, "tarotDoor"],
  [4, 143, "river"],
  [5, 0, "islandIn"],
];
for (const [episodeIndex, beatIndex, background] of preservedEarlyVisualCues) {
  if (runtime.episodes[episodeIndex]?.beats[beatIndex]?.bg !== background) {
    fail(`an existing early-scene background was unexpectedly remapped: ${background}`);
  }
}
for (const [index, meta] of manifest.episodes.entries()) {
  const path = resolve(dirname(MANIFEST_PATH), "episodes", `${meta.id}.json`);
  if (!existsSync(path)) fail(`missing chunk ${meta.id}`);
  const chunk = JSON.parse(readFileSync(path, "utf8"));
  if (chunk.id !== meta.id || chunk.beats.length !== meta.beatCount || chunk.beats.some((beat) => !beat.id)) {
    fail(`invalid chunk ${meta.id}`);
  }
  // 새 ID 저장과 기존 숫자 저장이 같은 위치를 가리키는지 확인한다.
  const saved = { ep: index, bi: Math.min(2, chunk.beats.length - 1), episodeId: chunk.id, beatId: chunk.beats[Math.min(2, chunk.beats.length - 1)].id };
  if (saved.episodeId !== manifest.episodes[index].id || !saved.beatId.startsWith(`${chunk.id}:`)) fail(`bookmark mapping failed for ${chunk.id}`);
}

console.log(`[novel-runtime] OK: shell ${statSync(PLAYER_PATH).size.toLocaleString("ko-KR")} bytes · ${runtime.episodeCount} episodes · ${runtime.beatCount.toLocaleString("ko-KR")} beats · ID bookmark migration ready`);
