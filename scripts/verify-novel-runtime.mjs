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
  // 배경 안정화 장치(2026-08-28). 카메라 연출은 .bgStage 의 transform 으로만 준다 —
  // .bgImg 의 animation-name 을 갈아끼우면 transform 이 새 키프레임 시작값으로 스냅한다.
  '.bgLayer[data-camera="focus"] .bgStage',
  "function restartKenburns(el)",
  "function shownBg()",
  "if(token!==_bgReq)return;",
  "var _hydrating=false",
  "function hydrateFlush()",
  "function applyReduceMotion()",
  // 연이의 모습은 화 경계를 넘어 유지되는 상태다. 진입 경로가 저마다 복원하면 경로별로 다른 모습이 나온다.
  "function formAt(ep,bi)",
  "var FORM_MARKS=",
  // 챕터 카드 타이머(닫기 1600ms + hidden 700ms)를 진입마다 두 겹 다 끊는 자리.
  "function clearCardTimers()",
  "function closeChapterCard()",
];
// 되살아나면 안 되는 패턴 — 각각이 실제로 났던 배경 흔들림의 원인이다.
const forbiddenRuntimePatterns = [
  ["kenburnsFocus", "카메라 연출이 .bgImg 의 animation 을 교체하면 배경이 스냅한다"],
  ["S.curBg=null", "curBg 리셋은 같은 배경으로 되돌아오는 헛 크로스페이드를 만든다"],
  ["S.form=(ep", "모습 복원에 화 범위를 손으로 박으면 진입 경로마다 연이가 달라진다 — formAt() 하나만 쓴다"],
  ['setTimeout(function(){cc.classList.add("hidden");},700)', '추적되지 않는 카드 hide 타이머는 다음 화의 카드를 숨긴다 — closeChapterCard() 를 쓴다'],
];
for (const hook of requiredRuntimeHooks) if (!html.includes(hook)) fail(`required runtime hook missing: ${hook}`);
for (const [pattern, why] of forbiddenRuntimePatterns) if (html.includes(pattern)) fail(`forbidden pattern is back: ${pattern} — ${why}`);
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

// 정본(content/novel/episodes.source.json)의 총 비트 수. 비트를 더하거나 빼는 개편마다 같은 커밋에서 갱신한다.
const EXPECTED_BEAT_COUNT = 8844;
const runtime = buildNovelPayload();
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const matrix = JSON.parse(readFileSync(SCENE_MATRIX_PATH, "utf8"));
if (manifest.sourceHash !== runtime.sourceHash || manifest.episodeCount !== 44 || manifest.beatCount !== EXPECTED_BEAT_COUNT) {
  fail(`manifest is not synchronized with the 44-episode canonical source (expected ${EXPECTED_BEAT_COUNT} beats, canonical source has ${runtime.beatCount}). 정본에 비트를 더하거나 뺐다면 이 파일의 EXPECTED_BEAT_COUNT 를 같은 커밋에서 갱신할 것.`);
}
// 🔴 emotionPath 가 아예 없으면 undefined < 3 이 false 라 통과했다(fail-open). 배열 여부를 먼저 본다.
if (matrix.sourceHash !== runtime.sourceHash || matrix.episodes?.length !== runtime.episodeCount || matrix.episodes.some((episode) => !Array.isArray(episode.emotionPath) || episode.emotionPath.length < 3 || !episode.visualCues?.every((cue) => cue.accessibility))) {
  fail("scene matrix is stale or missing its three-stage emotion/accessibility cues");
}

/* 연이의 모습(사람↔꽃돼지) 마커표는 셸에 손으로 적혀 있다 — 진입 즉시 결정해야 해서 청크 로드를
   기다릴 수 없다. 그 표가 정본과 어긋나면 "쭉 읽으면 사람, 목차로 들어가면 꽃돼지"가 되므로,
   정본 비트를 전수 스캔해 다시 만든 목록과 완전 일치를 요구한다(파싱 실패도 실패). */
const canonicalFormMarks = [];
runtime.episodes.forEach((episode, episodeIndex) => {
  episode.beats.forEach((beat, beatIndex) => {
    if (beat.form) canonicalFormMarks.push(`${episodeIndex}:${beatIndex}:${beat.form}`);
  });
});
if (canonicalFormMarks.length === 0) fail("the canonical source declares no form markers; the shell table would be unverifiable");
const formMarkSource = html.match(/var FORM_MARKS=(\[[^\]]*\]);/);
if (!formMarkSource) fail("FORM_MARKS table was not found in the player shell");
let shellFormMarks;
try {
  shellFormMarks = new Function(`return ${formMarkSource[1]}`)();
} catch (error) {
  fail(`FORM_MARKS does not parse: ${error.message}`);
}
if (!Array.isArray(shellFormMarks) || shellFormMarks.length === 0) fail("FORM_MARKS must be a non-empty array");
const shellFormKeys = shellFormMarks.map((mark) => {
  if (!Number.isInteger(mark?.ep) || !Number.isInteger(mark?.bi) || typeof mark?.form !== "string") {
    fail(`FORM_MARKS entry is malformed: ${JSON.stringify(mark)}`);
  }
  return `${mark.ep}:${mark.bi}:${mark.form}`;
});
if (shellFormKeys.join("|") !== canonicalFormMarks.join("|")) {
  fail(`FORM_MARKS in the player shell is out of sync with the canonical source. 정본에 변신을 더하거나 옮겼다면 셸의 표를 같은 커밋에서 갱신할 것.\n  shell:     ${shellFormKeys.join(", ")}\n  canonical: ${canonicalFormMarks.join(", ")}`);
}
const expectedVisualCues = [
  [36, 20, "memoryVault"],
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
/* 목차에서 아무 화나 골라 바로 들어와도 첫 화면이 검은 무음이면 안 된다 — 그래서 전 화의
   beats[0] 이 bg 와 bgm 을 함께 갖는 것이 설계다(2026-09-02 실측 44/44). 이 규칙은 가드가
   없었고, 틀려도 **쭉 읽는 경로에서는 앞 화의 배경·음악이 남아 조용하다** — 목차 직진입에서만
   드러난다. 정본에 화를 더하거나 첫 비트를 갈아 끼울 때 실제로 걸리는 자리다. */
const openersMissingCues = runtime.episodes.flatMap((episode) => {
  const opener = episode.beats[0];
  const missing = [!opener?.bg && "bg", !opener?.bgm && "bgm"].filter(Boolean);
  return missing.length ? [`${episode.id}(${missing.join("·")})`] : [];
});
if (openersMissingCues.length > 0) {
  fail(`목차 직진입용 첫 비트에 배경·BGM 이 없습니다: ${openersMissingCues.join(", ")}. 정본의 각 화 beats[0] 에 bg 와 bgm 을 함께 둘 것.`);
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
