// 정적 VN 엔진이 정본 청크 구조와 핵심 회귀 방지 장치를 계속 보유하는지 검사한다.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { buildNovelPayload, MANIFEST_PATH, SCENE_MATRIX_PATH, readLegacyRanges, EFFECTS, SPEAKERS, INSTRUMENTAL_TRACKS } from "./build-novel-runtime.mjs";
import { FORBIDDEN_STORY_NAMES } from "./lib/novel-constraints.mjs";

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
  // 다른 개정(rev)의 책갈피는 그 화 처음에서 연다 — 다시 쓴 화에서 엉뚱한 대사에 떨어지지 않게.
  "if(((save&&save.rev)||1)!==((EPISODES[ep]&&EPISODES[ep].rev)||1))return 0;",
  "rev:meta.rev||1",
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
// 빌드가 허용하는 fx 는 셸이 모두 그려야 한다 — flash·shake 가 통과만 하고 화면에 안 나오던 회귀(2026-10-02).
const runFxBody = html.match(/function runFx\(name\)\{([\s\S]*?)\n\}/)?.[1];
if (!runFxBody) fail("runFx was not found in the player shell");
/* 로컬 dev 미러에는 NOVEL 호스트 곡과 stillLake 만 있다. 음악 호스트(MUSIC·MED·DCAFE) 곡은 실패하면
   RIVER_FALLBACK 을 따라 그 로컬 곡에 닿아야 한다 — 체인이 없으면 404 뒤 무음으로 남는다. */
const trackSource = html.match(/var TRK=\{([\s\S]*?)\n\};/)?.[1];
const fallbackSource = html.match(/var RIVER_FALLBACK=(\{[\s\S]*?\});/)?.[1];
if (!trackSource || !fallbackSource) fail("TRK or RIVER_FALLBACK was not found in the player shell");
const trackHosts = new Map([...trackSource.matchAll(/^\s*([A-Za-z]\w*):(?:([A-Z]+)\+enc\(|"")/gm)].map((m) => [m[1], m[2] ?? ""]));
let riverFallback;
try { riverFallback = new Function(`return ${fallbackSource}`)(); } catch (error) { fail(`RIVER_FALLBACK does not parse: ${error.message}`); }
const isLocalTrack = (key) => trackHosts.get(key) === "NOVEL" || key === "stillLake";
for (const [key, host] of trackHosts) {
  if (!["MUSIC", "MED", "DCAFE"].includes(host) || key === "main" || isLocalTrack(key)) continue;
  const seen = new Set([key]);
  let cursor = riverFallback[key];
  while (cursor && !isLocalTrack(cursor) && !seen.has(cursor)) { seen.add(cursor); cursor = riverFallback[cursor]; }
  if (!cursor || !trackHosts.has(cursor) || !isLocalTrack(cursor)) fail(`BGM '${key}' has no RIVER_FALLBACK chain that ends in a local track`);
}
if (trackHosts.get("none") !== "") fail("the silent track key 'none' must map to an empty URL");
for (const hook of ['if(key==="none"){S.bgmKey="none";fadeOutStop();return;}', 'if(on&&S.bgmKey==="none")return;', 'S.bgmOn&&audio.src&&S.bgmKey!=="none"', 'S.bgmOn&&S.bgmKey!=="none"']) {
  if (!html.includes(hook)) fail(`silent-track guard missing: ${hook}`);
}
for (const effect of EFFECTS) if (!runFxBody.includes(`name==="${effect}"`)) fail(`fx '${effect}' is accepted by the build but runFx has no branch for it`);
// 효과음은 WebAudio 로 합성한다 — 맵이 깨지면 빌드가 키를 못 읽고, 기본음 표가 없는 키를 가리키면 조용히 무음이 된다.
const SFX_KEYS = ["chime", "whoosh", "thud", "slash", "drum", "rain", "bell", "heartbeat", "glitch", "page", "coin", "fire", "water", "door", "oink", "sparkle"];
const sfxSource = html.match(/var SFX=(\{[\s\S]*?\n\});/)?.[1];
let sfxMap = null;
try { sfxMap = sfxSource && new Function(`return ${sfxSource}`)(); } catch (error) { fail(`SFX map does not parse: ${error.message}`); }
if (!sfxMap) fail("SFX map was not found in the player shell");
for (const key of SFX_KEYS) {
  const sound = sfxMap[key];
  if (!Array.isArray(sound) || !["sine", "triangle", "square", "sawtooth", "noise"].includes(sound[0]) || !sound.slice(1, 5).every(value => typeof value === "number" && value > 0)) fail(`SFX '${key}' is missing or malformed`);
}
if (!Array.isArray(sfxMap.none) || sfxMap.none.length !== 0) fail("SFX 'none' must be an empty array so a beat can mute its default sound");
for (const key of Object.keys(sfxMap)) if (key !== "none" && !SFX_KEYS.includes(key)) fail(`SFX '${key}' is not in the agreed 16-key list`);
const fxSfxSource = html.match(/var FX_SFX=(\{[^\n]*\});/)?.[1];
let fxSfx = null;
try { fxSfx = fxSfxSource && new Function(`return ${fxSfxSource}`)(); } catch (error) { fail(`FX_SFX does not parse: ${error.message}`); }
if (!fxSfx) fail("FX_SFX was not found in the player shell");
for (const [effect, sound] of Object.entries(fxSfx)) if (!EFFECTS.has(effect) || !SFX_KEYS.includes(sound)) fail(`FX_SFX ${effect} -> ${sound} points outside EFFECTS or SFX`);
for (const hook of ["playSfx(b.sfx||FX_SFX[b.fx]);", "if(!S.bgmOn||S.skip||_hydrating||document.hidden)return;", "if(!c||c.state!==\"running\")return;"]) {
  if (!html.includes(hook)) fail(`sound-effect guard missing: ${hook}`);
}
// 빌드가 받는 화자는 플레이어 이름표와 /stories 본문에 모두 이름이 있어야 한다 — 없으면 대사가 이름 없이 뜬다.
const labelMap = (name) => {
  const source = html.match(new RegExp(`var ${name}=(\\{[\\s\\S]*?\\});`))?.[1];
  try { return new Function(`return ${source}`)(); } catch { fail(`${name} label map does not parse`); }
};
const playerIcons = labelMap("ICON");
const playerNames = labelMap("NAME");
const storySpeakerBlock = readFileSync(resolve(ROOT, "lib/stories/vn/index.ts"), "utf8").match(/export const STORY_SPEAKERS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? "";
const storySpeakers = new Set([...storySpeakerBlock.matchAll(/^\s*([a-z]+):/gm)].map(match => match[1]));
for (const speaker of SPEAKERS) {
  if (!(speaker in playerIcons) || !(speaker in playerNames)) fail(`speaker '${speaker}' has no ICON/NAME label in the player`);
  if (!storySpeakers.has(speaker)) fail(`speaker '${speaker}' has no STORY_SPEAKERS label in lib/stories/vn/index.ts`);
  if (!["n", "sys"].includes(speaker) && !playerNames[speaker] && speaker !== "geo") fail(`speaker '${speaker}' has an empty player name`);
}
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
const EXPECTED_BEAT_COUNT = 7693;
const runtime = buildNovelPayload();
const mobileAssets = JSON.parse(readFileSync(resolve(ROOT, "content/novel/mobile-assets.json"), "utf8"));
const mobileSpriteMap = JSON.parse(html.match(/var MOBILE_SPRITES=(\{[^\n]+\});/)?.[1] || "{}");
for (const asset of mobileAssets.backgrounds) {
  const file = resolve(ROOT, "public", asset.path.slice(1));
  if (!existsSync(file) || statSync(file).size !== asset.bytes || asset.bytes > 300_000 || asset.width > 1280 || asset.height > 960) fail(`mobile background budget or inventory drift: ${asset.key}`);
}
// 휴대폰은 배경을 항상 모바일 사본으로 읽는다(bgUrl). 키를 새 그림으로 옮기고 사본을 다시 만들지
// 않으면 휴대폰에서만 옛 그림이 나온다 — 모든 BG 키에 같은 원본을 가리키는 행이 있어야 한다.
const bgRegistry = runInNewContext(`({${html.match(/var BG=\{([\s\S]*?)\n\};/)?.[1] ?? ""}})`, {
  NOVEL: "https://assets.code-destiny.com/CodeDestinyNovel/",
  enc: (path) => path.split("/").map(encodeURIComponent).join("/"),
});
if (Object.keys(bgRegistry).length === 0) fail("BG registry was not found in the player shell");
const mobileRows = new Map(mobileAssets.backgrounds.map((asset) => [asset.key, asset]));
for (const [key, url] of Object.entries(bgRegistry)) {
  if (mobileRows.get(key)?.source !== url) fail(`mobile background missing or stale for BG '${key}' — node scripts/build-novel-mobile-assets.mjs --keys=${key}`);
  // 레포에 둔 원본은 데스크톱이 그대로 받는다 — 이벤트 배경과 같은 370KB 예산.
  if (url.startsWith("/")) {
    const master = resolve(ROOT, "public", url.slice(1));
    if (!existsSync(master) || statSync(master).size === 0 || statSync(master).size > 370_000) fail(`local background master missing or over 370KB: BG '${key}' → ${url}`);
  }
}
for (const [key, asset] of Object.entries(mobileAssets.sprites)) {
  const file = resolve(ROOT, "public", asset.path.slice(1));
  if (!existsSync(file) || statSync(file).size !== asset.bytes || asset.bytes > 80_000 || asset.width * asset.height > 240_000 || mobileSpriteMap[key] !== asset.path) fail(`mobile sprite budget or binding drift: ${key}`);
}
for (const pose of ["base", "talk", "surprise", "angry", "sad", "water"]) {
  const file = resolve(ROOT, `public/images/novel/hanbi/${pose}.webp`);
  if (!existsSync(file) || statSync(file).size > 80_000) fail(`tiger sprite missing or over budget: ${pose}`);
}
// 서한비 사람 컷 중 레포에 둔 것(개편 2026-10). 별칭이 다시 광기 그림으로 돌아가면 울음 장면이 깨진다.
for (const expr of ["cry", "sad", "smile", "resolve"]) {
  const file = resolve(ROOT, `public/images/novel/remaster/pje/${expr}.webp`);
  if (!existsSync(file) || statSync(file).size === 0 || statSync(file).size > 80_000) fail(`Seo Hanbi sprite missing or over budget: ${expr}`);
  if (!html.includes(`PJE.${expr}="/images/novel/remaster/pje/${expr}.webp"`)) fail(`player does not bind PJE.${expr} to the local sprite`);
}
// 윤달(개편 2026-10): 플레이어의 표정 목록과 레포 낱장이 정확히 맞아야 한다. 없는 표정은 깨진 그림이 된다.
const yunExprMatch = html.match(/var YUN_EXPR=\[([^\]]*)\];/);
const yunExprs = yunExprMatch ? [...yunExprMatch[1].matchAll(/"([a-z]+)"/g)].map(m => m[1]) : [];
if (yunExprs.length < 8 || !yunExprs.includes("base")) fail("player YUN_EXPR list is missing or incomplete");
// nm(이름 모르는 인물의 표시명)은 대사창·로그·텍스트 리더가 모두 화자 이름보다 먼저 읽어야 한다 — 하나라도 빠지면 정체가 미리 드러난다.
if (!html.includes("spkName.textContent=b.nm||NAME[spk]") || !html.includes("escapeHtml(r.nm||NAME[r.s]") || !readFileSync(resolve(ROOT, "app/stories/[episode]/page.tsx"), "utf8").includes("beat.nm ?? STORY_SPEAKERS")) fail("beat display-name override (nm) is not honoured by the player, log, or text reader");
if (!html.includes('if(who==="yun")return {url:"/images/novel/remaster/yun/"+(YUN_EXPR.indexOf(expr)>=0?expr:"base")+".webp",cls:"yun"};')) fail("player does not route yun to the local sprites");
for (const expr of yunExprs) {
  const file = resolve(ROOT, `public/images/novel/remaster/yun/${expr}.webp`);
  if (!existsSync(file) || statSync(file).size === 0 || statSync(file).size > 80_000) fail(`Yundal sprite missing or over budget: ${expr}`);
}
if (runtime.episodes.some(episode => episode.beats.some(beat => !beat.id))) fail("stable story IDs are required");
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const matrix = JSON.parse(readFileSync(SCENE_MATRIX_PATH, "utf8"));
if (manifest.sourceHash !== runtime.sourceHash || manifest.episodeCount !== 70 || manifest.beatCount !== EXPECTED_BEAT_COUNT) {
  fail(`manifest is not synchronized with the 70-episode canonical source (expected ${EXPECTED_BEAT_COUNT} beats, canonical source has ${runtime.beatCount}). 정본에 비트를 더하거나 뺐다면 이 파일의 EXPECTED_BEAT_COUNT 를 같은 커밋에서 갱신할 것.`);
}
// 🔴 emotionPath 가 아예 없으면 undefined < 3 이 false 라 통과했다(fail-open). 배열 여부를 먼저 본다.
if (matrix.sourceHash !== runtime.sourceHash || matrix.episodes?.length !== runtime.episodeCount || matrix.episodes.some((episode) => !Array.isArray(episode.emotionPath) || episode.emotionPath.length < 3 || !episode.visualCues?.every((cue) => cue.accessibility))) {
  fail("scene matrix is stale or missing its three-stage emotion/accessibility cues");
}
/* 옛 책갈피 범위는 얼린 표(content/novel/legacy-ranges.v1.json)가 정본이다. 빌드마다 다시 계산하면 개편 뒤
   옛 위치가 엉뚱한 화로 옮겨 간다. manifest 의 화 순서·rev·범위가 정본·얼린 표와 같아야 한다. */
const frozenRanges = readLegacyRanges();
manifest.episodes.forEach((meta, index) => {
  const episode = runtime.episodes[index];
  if (meta.id !== episode?.id) fail(`manifest episode ${index} is ${meta.id}, canonical is ${episode?.id}`);
  if ((meta.rev ?? 1) !== (episode.rev ?? 1)) fail(`${meta.id}: manifest rev ${meta.rev ?? 1} does not match the canonical rev ${episode.rev ?? 1}`);
  if (JSON.stringify(meta.legacyRanges) !== JSON.stringify(frozenRanges[meta.id] ?? [])) fail(`${meta.id}: manifest legacyRanges drifted from the frozen table`);
});

/* 연이의 모습(사람↔꽃돼지) 마커표는 셸에 손으로 적혀 있다 — 진입 즉시 결정해야 해서 청크 로드를
   기다릴 수 없다. 그 표가 정본과 어긋나면 "쭉 읽으면 사람, 목차로 들어가면 꽃돼지"가 되므로,
   정본 비트를 전수 스캔해 다시 만든 목록과 완전 일치를 요구한다(파싱 실패도 실패). */
const canonicalFormMarks = [];
const neoMarks = runtime.episodes.flatMap((episode, ep) => episode.beats.flatMap((beat, bi) => beat.neoForm ? [{ ep, bi, form: beat.neoForm }] : []));
const neoSource = html.match(/var NEO_FORM_MARKS=(\[[^\]]*\]);/);
if (!neoSource || JSON.stringify(JSON.parse(neoSource[1])) !== JSON.stringify(neoMarks)) fail("Neo appearance registry is not synchronized");
if (neoMarks.length !== 1 || runtime.episodes[neoMarks[0].ep].id !== "ep-27" || neoMarks[0].form !== "human") fail("Neo must return after Yeoni in EP.27 and remain human");
const neoAssets = JSON.parse(readFileSync(resolve(ROOT, "public/images/novel/neo-lion/assets.json"), "utf8"));
if (neoAssets.frames.length !== 8) fail("Neo needs eight expression frames");
for (const asset of neoAssets.frames) {
  const path = resolve(ROOT, "public/images/novel/neo-lion", asset.expression + ".webp");
  if (!existsSync(path) || statSync(path).size !== asset.bytes || asset.bytes > 80_000 || asset.width * asset.height > 240_000) fail(`Neo mobile frame budget or file drift: ${asset.expression}`);
}
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
  fail(`FORM_MARKS in the player shell is out of sync with the canonical source. npm run novel:build 로 셸의 표를 다시 쓰고 같은 커밋에 넣을 것.\n  shell:     ${shellFormKeys.join(", ")}\n  canonical: ${canonicalFormMarks.join(", ")}`);
}
// 이벤트 배경은 개편 때 자리가 옮겨 갈 수 있다 — 고정 컷 대신 정본에서 한 번 이상 쓰이는지만 요구한다.
for (const background of ["memoryVault", "clearMoonWater", "cherryMoonPortal"]) {
  if (!runtime.episodes.some(e => e.beats.some(b => b.bg === background))) fail(`event background is no longer used by any canonical beat: ${background}`);
}
const preservedEarlyVisualCues = [
  [0, 63, "tarotDoor"],
  [4, 143, "river"],
  [5, 0, "islandIn"],
];
for (const [episodeIndex, beatIndex, background] of preservedEarlyVisualCues) {
  if (runtime.episodes.flatMap(e => e.beats).find(b => b.id === `${episodeIndex === 0 ? "prologue" : "ep-" + String(episodeIndex).padStart(2, "0")}:${beatIndex + 1}`)?.bg !== background) {
    fail(`an existing early-scene background was unexpectedly remapped: ${background}`);
  }
}
/* 목차에서 아무 화나 골라 바로 들어와도 첫 화면이 검은 무음이면 안 된다 — 그래서 전 화의
   beats[0] 이 bg 와 bgm 을 함께 갖는 것이 설계다(2026-09-02 실측 44/44). 이 규칙은 가드가
   없었고, 틀려도 **쭉 읽는 경로에서는 앞 화의 배경·음악이 남아 조용하다** — 목차 직진입에서만
   드러난다. 정본에 화를 더하거나 첫 비트를 갈아 끼울 때 실제로 걸리는 자리다. */
const openersMissingCues = runtime.episodes.flatMap((episode) => {
  const opener = episode.beats[0];
  // 무음 none 은 곡이 아니다 — 목차로 들어오자마자 정적이면 BGM 이 빠진 것과 같다.
  const missing = [!opener?.bg && "bg", (!opener?.bgm || opener.bgm === "none") && "bgm"].filter(Boolean);
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
  if (saved.episodeId !== manifest.episodes[index].id || !chunk.beats.some(beat => beat.id === saved.beatId)) fail(`bookmark mapping failed for ${chunk.id}`);
  // 빌드 규칙이 실제 배포 청크에도 지켜졌는지 다시 본다(빌드를 건너뛴 손 편집·CMS 오버라이드 대비).
  for (const beat of chunk.beats) {
    const name = FORBIDDEN_STORY_NAMES.find((forbidden) => String(beat.t ?? "").includes(forbidden));
    if (name) fail(`${beat.id}: 대본에 쓰지 않는 이름 '${name}'`);
    if (beat.bgm && !INSTRUMENTAL_TRACKS.has(beat.bgm)) fail(`${beat.id}: 연주곡 목록 밖의 곡 '${beat.bgm}'`);
    if (beat.tone && !beat.bg) fail(`${beat.id}: bg 없는 tone 은 그려지지 않는다`);
    if (beat.s && !SPEAKERS.has(beat.s)) fail(`${beat.id}: 등록되지 않은 화자 '${beat.s}'`);
  }
}

console.log(`[novel-runtime] OK: shell ${statSync(PLAYER_PATH).size.toLocaleString("ko-KR")} bytes · ${runtime.episodeCount} episodes · ${runtime.beatCount.toLocaleString("ko-KR")} beats · ID bookmark migration ready`);
