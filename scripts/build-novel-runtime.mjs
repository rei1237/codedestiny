import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BEAT_FORMS, BEAT_MAX_LENGTH, BEAT_TONES, FORBIDDEN_STORY_NAMES } from "./lib/novel-constraints.mjs";

const ROOT = resolve(import.meta.dirname, "..");
export const SOURCE_PATH = resolve(ROOT, "content/novel/episodes.source.json");
export const LEGACY_SHELL_PATH = resolve(ROOT, "public/codedestiny-novel.html");
export const OUTPUT_DIR = resolve(ROOT, "public/data/novel");
export const CHUNK_DIR = resolve(OUTPUT_DIR, "episodes");
export const MANIFEST_PATH = resolve(OUTPUT_DIR, "manifest.json");
export const READER_OUTPUT_PATH = resolve(ROOT, "lib/stories/vn/episodes.generated.json");
export const SCENE_MATRIX_PATH = resolve(ROOT, "content/novel/scene-matrix.generated.json");
// 옛 책갈피(rev 없음)의 비트 위치표 — 2026-10-02 개편 직전 manifest 에서 얼렸다. 다시 쓴 화(rev 2+)는
// 비트 ID 를 새로 매기므로 계산값이 옛 위치를 잃는다. 그래서 이 표만 manifest 에 싣고, 표에 없는 새 화는 [].
export const LEGACY_RANGES_PATH = resolve(ROOT, "content/novel/legacy-ranges.v1.json");

export const SPEAKERS = new Set(["n", "sys", "yeon", "neo", "mu", "moka", "luna", "rab", "baek", "crow", "geo", "god", "ln", "lns", "pje", "tiger", "yun", "heuk"]);
const CAST_IDS = new Set(["baek", "crow", "ln", "lns", "mirror", "moka", "mu", "neo", "pje", "rab", "yeon", "tiger", "yun"]);
export const EFFECTS = new Set(["burst", "claw", "fire", "flash", "fuse", "hands", "heart", "ink", "metal", "net", "reveal", "root", "script", "shake", "stars", "suck", "tarot", "thread", "transform", "veil", "vortex", "water", "wood"]);
/* 곡 분류(fail-closed). 가사 판정 근거는 가사 등록부 app/music/_data/musicLyrics.ts 다 — musicManifest 의
   hasLyrics 추정은 거의 모두 참이라 근거가 못 된다. TRK 에 새 키를 더하면 둘 중 하나에 반드시 넣는다.
   보컬곡은 재작성 대기 목록 밖의 화에서 쓰지 않는다(2026-10-02 사용자 요청: 명상·가사 없는 곡). */
export const VOCAL_TRACKS = new Set(["novaFlex", "novaSoda", "novaTitle", "novaRider", "novaFlame", "lunaGuest", "teaMoonlight"]);
export const INSTRUMENTAL_TRACKS = new Set([
  "main", "daily", "room", "gloom", "gloom2", "crisis", "crisis2", "neo", "neo2", "riverEnter", "riverEnter2", "siksangEnter", "stillLake",
  "jaeEnter", "riverCross", "warTheme", "templeGate", "memWater", "starsName", "zeroPoint", "rainWindow", "firstLight", "teaHouse", "teaKind",
  "crystalGarden", "templeDawn", "fireFestival", "flowingLight", "focusFlow", "innerFlame", "midnightPulse", "moonDawn", "forestTemple",
  "glassBox", "riverReturn", "sacredFlame", "starDrift", "lakeDawn", "drumCircle", "warDream", "warCommand", "warRoom", "whiteLion",
  "fortuneReveal", "orientalGirl", "destinyRoom", "none",
]);
/* 재작성 대기 목록 — 2026-10-02 개편에서 다시 쓸 옛 화(EP.07~EP.43). 여기 든 화만 옛 규칙의 예외를
   받는다: bg 없는 tone, 백문(baek), 보컬곡. 다시 쓴 화는 rev 2 로 올리며 목록에서 뺀다(남겨 두면 빌드 실패).
   새 이야기가 다 들어가면 목록과 예외를 함께 지운다. */
export const REWRITE_PENDING = new Set([
  "ep-34", "ep-35", "ep-36", "ep-36a", "ep-37", "ep-38", "ep-38a", "ep-39", "ep-40", "ep-41", "ep-41a", "ep-42",
  "ep-42a", "ep-43",
]);
const BARE_DIALOGUE = new Set(["그래.", "응.", "알겠어.", "좋아."]);
// 작가가 레거시 정본에 남긴 의미값 중, 실물 파일명이 바뀐 경우에만 고정 매핑한다.
// 무작위 선택은 하지 않으며 BG에 없는 값은 검증에서 실패한다.
const BACKGROUND_FALLBACKS = Object.freeze({ market: "jae" });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slugify(no) {
  if (no === "PROLOGUE") return "prologue";
  return no.toLowerCase().replace(".", "-");
}

function namedKeysFromLegacyShell(variableName) {
  const source = readFileSync(LEGACY_SHELL_PATH, "utf8");
  const match = source.match(new RegExp(`var ${variableName}=\\{([\\s\\S]*?)\\n\\};`));
  if (!match) throw new Error(`${variableName} 에셋 맵을 정적 플레이어에서 찾지 못했습니다.`);
  return new Set([...match[1].matchAll(/(?:^|[,\n])\s*([A-Za-z][\w]*)\s*:/g)].map((entry) => entry[1]));
}

export function readLegacyRanges() {
  const frozen = JSON.parse(readFileSync(LEGACY_RANGES_PATH, "utf8"));
  if (frozen?.version !== 1 || !frozen.episodes || typeof frozen.episodes !== "object") throw new Error("얼린 책갈피 범위표의 형식이 맞지 않습니다.");
  return frozen.episodes;
}

function inferScene(beat, priorScene) {
  const background = beat.bg ?? priorScene.background;
  // 플레이어는 배경을 그릴 때만 톤을 바꾸고, 같은 배경을 tone 없이 다시 쓰면 원래 색으로 돌린다.
  const tone = beat.bg ? (beat.tone ?? "natural") : priorScene.tone;
  const ambient = background && /night|moon|river|star|tarot/i.test(background) ? "moonlight" : null;
  const eventEffect = beat.fx ?? null;
  return {
    background,
    backgroundMeaning: beat.backgroundIntent
      ? `작가 지정 배경: ${beat.backgroundIntent} → ${background}`
      : background ? `작가 지정 배경: ${background}` : "직전 장면의 배경 유지",
    transition: beat.bg && beat.bg !== priorScene.background ? "crossfade" : "hold",
    tone,
    ambient,
    eventEffect,
    camera: beat.shot === "close" || beat.im ? "focus" : beat.s === "n" ? "drift" : "steady",
  };
}

function inferAccessibility(beat, scene) {
  const subject = beat.s === "n" ? "서술" : beat.s === "sys" ? "시스템 메시지" : `${beat.s}의 대사`;
  const visual = scene.background ? `${scene.background} 배경` : "이전 배경";
  return { description: `${visual}에서 진행되는 ${subject}` };
}

function inferPacing(beat) {
  const pauseMs = beat.im ? 700 : /[—…]$/.test(beat.t ?? "") ? 350 : 0;
  return pauseMs ? { pauseMs, importance: beat.im ? "impact" : "breath" } : undefined;
}

function validateBeat(beat, context, bgKeys, trackKeys, sfxKeys) {
  if (!beat || typeof beat !== "object") throw new Error(`${context}: 비트가 객체가 아닙니다.`);
  if (!SPEAKERS.has(beat.s)) throw new Error(`${context}: 알 수 없는 화자 '${beat.s}'입니다.`);
  if (typeof beat.t !== "string" || !beat.t.trim()) throw new Error(`${context}: 대사가 비어 있습니다.`);
  if (beat.t.length > BEAT_MAX_LENGTH) throw new Error(`${context}: 대사가 ${BEAT_MAX_LENGTH}자를 초과합니다. 호흡 단위로 나누어 주세요.`);
  if (beat.s !== "n" && beat.s !== "sys" && BARE_DIALOGUE.has(beat.t.trim())) throw new Error(`${context}: 감정 정보 없는 단답 '${beat.t}'은 보이스에 맞춰 보강해 주세요.`);
  // nm 은 아직 이름을 모르는 인물의 표시명이다(예: 옆집 여자). 서술·시스템에는 이름표가 없다.
  if (beat.nm !== undefined && (typeof beat.nm !== "string" || !beat.nm.trim() || beat.nm.length > 12 || beat.s === "n" || beat.s === "sys")) throw new Error(`${context}: 표시명 nm 은 인물 대사에만 12자 이하로 씁니다.`);
  if (beat.shot && !["wide", "close", "impact", "quiet"].includes(beat.shot)) throw new Error(`${context}: invalid shot`);
  if (beat.bg && !bgKeys.has(beat.bg)) throw new Error(`${context}: 배경 '${beat.bg}'이 BG 맵에 없습니다.`);
  if (beat.bgm && !trackKeys.has(beat.bgm)) throw new Error(`${context}: BGM '${beat.bgm}'이 TRK 맵에 없습니다.`);
  if (beat.fx && !EFFECTS.has(beat.fx)) throw new Error(`${context}: 효과 '${beat.fx}'이 허용 목록에 없습니다.`);
  if (beat.sfx !== undefined && (typeof beat.sfx !== "string" || !sfxKeys.has(beat.sfx))) throw new Error(`${context}: 효과음 '${beat.sfx}'이 SFX 맵에 없습니다.`);
  // form·tone 은 오타가 나도 플레이어가 조용히 무시한다 — 화면은 멀쩡하고 연출만 사라진다.
  if (beat.form && !BEAT_FORMS.has(beat.form)) throw new Error(`${context}: 모습 '${beat.form}'이 허용 목록(${[...BEAT_FORMS].join(", ")})에 없습니다.`);
  if (beat.tone && !BEAT_TONES.has(beat.tone)) throw new Error(`${context}: 톤 '${beat.tone}'이 허용 목록(${[...BEAT_TONES].join(", ")})에 없습니다.`);
  if (beat.c?.who && !CAST_IDS.has(beat.c.who)) throw new Error(`${context}: 중앙 캐릭터 '${beat.c.who}'가 알 수 없는 캐스트입니다.`);
  for (const slot of ["l", "c", "r"]) {
    if (beat[slot]?.who && !CAST_IDS.has(beat[slot].who)) throw new Error(`${context}: ${slot} 슬롯 캐릭터 '${beat[slot].who}'가 알 수 없습니다.`);
  }
}

export function buildNovelPayload() {
  if (!existsSync(SOURCE_PATH)) throw new Error(`정본이 없습니다: ${SOURCE_PATH}. npm run novel:migrate-source를 먼저 실행하세요.`);
  const sourceRaw = readFileSync(SOURCE_PATH, "utf8");
  const source = JSON.parse(sourceRaw);
  if (source.schemaVersion !== 1 || !Array.isArray(source.episodes)) throw new Error("지원하지 않는 VN 정본 스키마입니다.");
  const bgKeys = namedKeysFromLegacyShell("BG");
  const trackKeys = namedKeysFromLegacyShell("TRK");
  const sfxKeys = namedKeysFromLegacyShell("SFX");
  for (const key of trackKeys) {
    if (VOCAL_TRACKS.has(key) === INSTRUMENTAL_TRACKS.has(key)) throw new Error(`TRK '${key}' 는 연주곡·보컬곡 분류 중 정확히 하나에 들어가야 합니다(build-novel-runtime.mjs).`);
  }
  for (const key of [...VOCAL_TRACKS, ...INSTRUMENTAL_TRACKS]) if (!trackKeys.has(key)) throw new Error(`곡 분류의 '${key}' 가 TRK 맵에 없습니다.`);
  const episodeIds = new Set();
  const beatIds = new Set();
  const episodes = source.episodes.map((episode, episodeIndex) => {
    const id = slugify(episode.no);
    if (episodeIds.has(id)) throw new Error(`중복 에피소드 ID: ${id}`);
    episodeIds.add(id);
    if (!episode.no || !episode.tag || !episode.title || !Array.isArray(episode.beats) || episode.beats.length === 0) {
      throw new Error(`에피소드 ${episodeIndex + 1}: no/tag/title/beats가 필요합니다.`);
    }
    // rev 는 화를 통째로 다시 쓸 때 올린다. 저장된 rev 와 다르면 플레이어가 그 화의 처음에서 연다.
    const rev = episode.rev ?? 1;
    if (!Number.isInteger(rev) || rev < 1) throw new Error(`${episode.no}: rev 는 1 이상의 정수여야 합니다.`);
    const pending = REWRITE_PENDING.has(id);
    if (pending && rev >= 2) throw new Error(`${episode.no}: 다시 쓴 화(rev ${rev})는 재작성 대기 목록(REWRITE_PENDING)에서 빼야 합니다.`);
    let priorScene = { background: null, tone: "natural" };
    const beats = episode.beats.map((sourceBeat, beatIndex) => {
      const context = `${episode.no} #${beatIndex + 1}`;
      // 다시 쓴 화가 자동 번호에 기대면 옛 ID 와 겹쳐 엉뚱한 문장으로 이어 읽힌다.
      if (rev >= 2 && !String(sourceBeat?.id ?? "").startsWith(`${id}:`)) throw new Error(`${context}: 다시 쓴 화(rev ${rev})의 비트는 '${id}:' 로 시작하는 ID 를 직접 가져야 합니다.`);
      const rawBeat = sourceBeat.bg && BACKGROUND_FALLBACKS[sourceBeat.bg]
        ? { ...sourceBeat, bg: BACKGROUND_FALLBACKS[sourceBeat.bg], backgroundIntent: sourceBeat.bg }
        : sourceBeat;
      validateBeat(rawBeat, context, bgKeys, trackKeys, sfxKeys);
      for (const name of FORBIDDEN_STORY_NAMES) if (rawBeat.t.includes(name)) throw new Error(`${context}: 대본에 쓰지 않는 이름 '${name}'이 있습니다.`);
      if (!pending) {
        if (VOCAL_TRACKS.has(rawBeat.bgm)) throw new Error(`${context}: 보컬곡 '${rawBeat.bgm}' 는 쓰지 않습니다. 연주곡을 고르세요.`);
        if (rawBeat.tone && !rawBeat.bg) throw new Error(`${context}: tone 은 bg 가 있는 비트에서만 그려집니다. 지금 배경 키를 함께 적으세요.`);
        if (rawBeat.s === "baek" || ["l", "c", "r"].some((slot) => rawBeat[slot]?.who === "baek")) throw new Error(`${context}: 백문(baek)은 새 이야기에 나오지 않습니다(윤달 yun 으로 대체).`);
      }
      const hasSceneDirection = Boolean(rawBeat.shot || rawBeat.bg || rawBeat.bgm || rawBeat.fx || rawBeat.tone || rawBeat.im);
      const scene = hasSceneDirection ? inferScene(rawBeat, priorScene) : undefined;
      const beat = {
        ...rawBeat,
        id: sourceBeat.id || `${id}:${beatIndex + 1}`,
        ...(scene ? { scene, a11y: inferAccessibility(rawBeat, scene) } : {}),
        ...(inferPacing(rawBeat) ? { pacing: inferPacing(rawBeat) } : {}),
      };
      if (scene && !beat.a11y?.description) throw new Error(`${context}: 장면 접근성 설명이 없습니다.`);
      if (!/^[a-z0-9-]+:[a-z0-9-]+$/.test(beat.id)) throw new Error(`invalid stable beat ID: ${beat.id}`);
      if (beatIds.has(beat.id)) throw new Error(`중복 비트 ID: ${beat.id}`);
      beatIds.add(beat.id);
      if (scene) priorScene = scene;
      return beat;
    });
    return { id, no: episode.no, tag: episode.tag, title: episode.title, ...(rev > 1 ? { rev } : {}), beats };
  });
  for (const slug of Object.keys(readLegacyRanges())) {
    if (!episodeIds.has(slug)) throw new Error(`얼린 책갈피 범위표의 화 '${slug}'가 정본에 없습니다. 화 주소는 바꾸거나 지우지 않습니다.`);
  }
  for (const slug of REWRITE_PENDING) {
    if (!episodeIds.has(slug)) throw new Error(`재작성 대기 목록의 화 '${slug}'가 정본에 없습니다. 목록에서 빼세요.`);
  }
  const sourceHash = sha256(sourceRaw);
  const beatCount = episodes.reduce((total, episode) => total + episode.beats.length, 0);
  return { version: 2, sourceHash, episodeCount: episodes.length, beatCount, episodes };
}

export function readerPayload(runtime) {
  return {
    version: runtime.version,
    sourceHash: runtime.sourceHash,
    episodes: runtime.episodes.map((episode) => {
      let previousBackground = null;
      return {
        no: episode.no,
        slug: episode.id,
        tag: episode.tag,
        title: episode.title,
        beats: episode.beats.map((beat) => {
          const background = beat.bg ?? null;
          const sceneBreak = Boolean(background && previousBackground && background !== previousBackground);
          if (background) previousBackground = background;
          return {
            s: beat.s,
            t: beat.t,
            ...(beat.nm ? { nm: beat.nm } : {}),
            ...(sceneBreak ? { sceneBreak: true } : {}),
            ...(beat.im ? { im: String(beat.im) } : {}),
            ...(beat.skill ? { skill: beat.skill } : {}),
          };
        }),
      };
    }),
  };
}

export function sceneMatrix(runtime) {
  return {
    version: runtime.version,
    sourceHash: runtime.sourceHash,
    note: "정본 비트에서 생성한 연출 검수 매트릭스입니다. 목적과 갈등은 각 화 제목/사건 신호를 보존하며, 장면·감정 호흡·접근성 큐를 한 곳에서 검수합니다.",
    episodes: runtime.episodes.map((episode) => {
      const marked = episode.beats.filter((beat) => beat.scene);
      const opening = episode.beats[0];
      const turning = episode.beats.find((beat, index) => index >= Math.floor(episode.beats.length / 3) && (beat.im || beat.fx || beat.scene?.eventEffect)) ?? episode.beats[Math.floor(episode.beats.length / 2)];
      const closing = episode.beats.at(-1);
      const conflict = episode.beats.find((beat) => beat.fx || beat.im || beat.s === "sys") ?? turning;
      return {
        id: episode.id,
        title: episode.title,
        purpose: episode.title,
        conflictBeatId: conflict.id,
        emotionPath: [
          { phase: "진입", beatId: opening.id, pacing: opening.pacing?.importance ?? "normal" },
          { phase: "압력·전환", beatId: turning.id, pacing: turning.pacing?.importance ?? "normal" },
          { phase: "정리·다음 걸음", beatId: closing.id, pacing: closing.pacing?.importance ?? "normal" },
        ],
        visualCues: marked.map((beat) => ({
          beatId: beat.id,
          background: beat.scene.background,
          transition: beat.scene.transition,
          tone: beat.scene.tone,
          ambient: beat.scene.ambient,
          eventEffect: beat.scene.eventEffect,
          camera: beat.scene.camera,
          accessibility: beat.a11y.description,
        })),
      };
    }),
  };
}

function writeJson(path, value, pretty = false) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`, "utf8");
}

export function writeNovelRuntime(runtime = buildNovelPayload()) {
  mkdirSync(CHUNK_DIR, { recursive: true });
  const wantedChunks = new Set(runtime.episodes.map((episode) => `${episode.id}.json`));
  for (const file of readdirSync(CHUNK_DIR)) {
    if (file.endsWith(".json") && !wantedChunks.has(file)) rmSync(resolve(CHUNK_DIR, file));
  }
  const legacyRanges = readLegacyRanges();
  const manifest = {
    version: runtime.version,
    sourceHash: runtime.sourceHash,
    episodeCount: runtime.episodeCount,
    beatCount: runtime.beatCount,
    episodes: runtime.episodes.map((episode) => ({
      id: episode.id,
      no: episode.no,
      tag: episode.tag,
      title: episode.title,
      ...(episode.rev ? { rev: episode.rev } : {}),
      beatCount: episode.beats.length,
      legacyRanges: legacyRanges[episode.id] ?? [],
      path: `/data/novel/episodes/${episode.id}.json`,
    })),
  };
  writeJson(MANIFEST_PATH, manifest);
  runtime.episodes.forEach((episode) => writeJson(resolve(CHUNK_DIR, `${episode.id}.json`), {
    version: runtime.version,
    sourceHash: runtime.sourceHash,
    ...episode,
  }));
  writeJson(READER_OUTPUT_PATH, readerPayload(runtime));
  writeJson(SCENE_MATRIX_PATH, sceneMatrix(runtime), true);
  syncShellFormMarks(runtime);
  return manifest;
}

// 플레이어의 연이 모습 표(FORM_MARKS)는 (화 색인, 컷 색인)이라 화를 다시 쓰면 손으로 맞추기 어렵다.
// 정본의 form 마커에서 그 한 줄만 다시 쓴다. verify-novel-runtime 이 같은 표를 다시 대조한다.
export function formMarks(runtime) {
  const marks = [];
  runtime.episodes.forEach((episode, ep) => episode.beats.forEach((beat, bi) => {
    if (beat.form) marks.push({ ep, bi, form: beat.form });
  }));
  return marks;
}

function syncShellFormMarks(runtime) {
  const shell = readFileSync(LEGACY_SHELL_PATH, "utf8");
  const pattern = /var FORM_MARKS=\[[^\]]*\];/;
  if (!pattern.test(shell)) throw new Error("플레이어 셸에서 'var FORM_MARKS=[...];' 한 줄을 찾지 못했습니다.");
  const next = shell.replace(pattern, `var FORM_MARKS=${JSON.stringify(formMarks(runtime))};`);
  if (next !== shell) writeFileSync(LEGACY_SHELL_PATH, next);
}

// 다시 쓴 화(rev≥2)의 분량·연출 밀도 보고. 경고만 하고 빌드는 막지 않는다 — 한글 하한(1,800자)은
// verify-story-text-sync 가 오류로 지킨다. 알파벳이 붙은 화(EP.12A 등)는 막간이라 기준이 짧다.
export function lengthWarnings(runtime) {
  const warnings = [];
  for (const episode of runtime.episodes) {
    if (!episode.rev || episode.rev < 2) continue;
    const interlude = /[A-Z]$/.test(episode.no);
    const chars = episode.beats.reduce((total, beat) => total + beat.t.length, 0);
    const images = episode.beats.filter((beat) => beat.im).length;
    const effects = episode.beats.filter((beat) => beat.fx).length;
    const [minChars, maxChars] = interlude ? [2000, 4000] : [4000, 8000];
    const note = (message) => warnings.push(`${episode.no}: ${message}`);
    if (chars < minChars || chars > maxChars) note(`본문 ${chars.toLocaleString("ko-KR")}자 (기준 ${minChars.toLocaleString("ko-KR")}~${maxChars.toLocaleString("ko-KR")})`);
    if (!interlude && (images < 8 || images > 12)) note(`im ${images}개 (기준 8~12)`);
    const perThousand = chars ? (effects * 1000) / chars : 0;
    if (perThousand < 1 || perThousand > 3) note(`fx 1천 자당 ${perThousand.toFixed(2)}개 (기준 1~3)`);
    const longBeats = episode.beats.filter((beat) => beat.t.length > 150).map((beat) => beat.id);
    if (longBeats.length) note(`150자 초과 비트 ${longBeats.join(", ")}`);
    episode.beats.forEach((beat, index) => {
      if (beat.fx === "flash" && episode.beats[index - 1]?.fx === "flash") note(`flash 연속 ${beat.id}`);
    });
  }
  return warnings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runtime = buildNovelPayload();
  writeNovelRuntime(runtime);
  console.log(`VN 산출물 생성 완료: ${runtime.episodeCount}화 · ${runtime.beatCount.toLocaleString("ko-KR")}비트`);
  const warnings = lengthWarnings(runtime);
  if (warnings.length) console.warn(`[분량 경고 ${warnings.length}건 — 빌드는 통과]\n  ${warnings.join("\n  ")}`);
}
