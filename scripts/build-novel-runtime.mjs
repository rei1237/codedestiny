import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BEAT_FORMS, BEAT_MAX_LENGTH, BEAT_TONES } from "./lib/novel-constraints.mjs";

const ROOT = resolve(import.meta.dirname, "..");
export const SOURCE_PATH = resolve(ROOT, "content/novel/episodes.source.json");
export const LEGACY_SHELL_PATH = resolve(ROOT, "public/codedestiny-novel.html");
export const OUTPUT_DIR = resolve(ROOT, "public/data/novel");
export const CHUNK_DIR = resolve(OUTPUT_DIR, "episodes");
export const MANIFEST_PATH = resolve(OUTPUT_DIR, "manifest.json");
export const READER_OUTPUT_PATH = resolve(ROOT, "lib/stories/vn/episodes.generated.json");
export const SCENE_MATRIX_PATH = resolve(ROOT, "content/novel/scene-matrix.generated.json");

const SPEAKERS = new Set(["n", "sys", "yeon", "neo", "mu", "moka", "luna", "rab", "baek", "crow", "geo", "god", "ln", "lns", "pje"]);
const CAST_IDS = new Set(["baek", "crow", "ln", "lns", "mirror", "moka", "mu", "neo", "pje", "rab", "yeon"]);
const EFFECTS = new Set(["burst", "claw", "fire", "flash", "fuse", "hands", "heart", "ink", "metal", "net", "reveal", "root", "script", "shake", "stars", "suck", "tarot", "thread", "transform", "veil", "vortex", "water", "wood"]);
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

function inferScene(beat, priorScene) {
  const background = beat.bg ?? priorScene.background;
  const tone = beat.tone ?? priorScene.tone ?? "natural";
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
    camera: beat.im ? "focus" : beat.s === "n" ? "drift" : "steady",
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

function validateBeat(beat, context, bgKeys, trackKeys) {
  if (!beat || typeof beat !== "object") throw new Error(`${context}: 비트가 객체가 아닙니다.`);
  if (!SPEAKERS.has(beat.s)) throw new Error(`${context}: 알 수 없는 화자 '${beat.s}'입니다.`);
  if (typeof beat.t !== "string" || !beat.t.trim()) throw new Error(`${context}: 대사가 비어 있습니다.`);
  if (beat.t.length > BEAT_MAX_LENGTH) throw new Error(`${context}: 대사가 ${BEAT_MAX_LENGTH}자를 초과합니다. 호흡 단위로 나누어 주세요.`);
  if (beat.s !== "n" && beat.s !== "sys" && BARE_DIALOGUE.has(beat.t.trim())) throw new Error(`${context}: 감정 정보 없는 단답 '${beat.t}'은 보이스에 맞춰 보강해 주세요.`);
  if (beat.bg && !bgKeys.has(beat.bg)) throw new Error(`${context}: 배경 '${beat.bg}'이 BG 맵에 없습니다.`);
  if (beat.bgm && !trackKeys.has(beat.bgm)) throw new Error(`${context}: BGM '${beat.bgm}'이 TRK 맵에 없습니다.`);
  if (beat.fx && !EFFECTS.has(beat.fx)) throw new Error(`${context}: 효과 '${beat.fx}'이 허용 목록에 없습니다.`);
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
  const episodeIds = new Set();
  const beatIds = new Set();
  const episodes = source.episodes.map((episode, episodeIndex) => {
    const id = slugify(episode.no);
    if (episodeIds.has(id)) throw new Error(`중복 에피소드 ID: ${id}`);
    episodeIds.add(id);
    if (!episode.no || !episode.tag || !episode.title || !Array.isArray(episode.beats) || episode.beats.length === 0) {
      throw new Error(`에피소드 ${episodeIndex + 1}: no/tag/title/beats가 필요합니다.`);
    }
    let priorScene = { background: null, tone: "natural" };
    const beats = episode.beats.map((sourceBeat, beatIndex) => {
      const context = `${episode.no} #${beatIndex + 1}`;
      const rawBeat = sourceBeat.bg && BACKGROUND_FALLBACKS[sourceBeat.bg]
        ? { ...sourceBeat, bg: BACKGROUND_FALLBACKS[sourceBeat.bg], backgroundIntent: sourceBeat.bg }
        : sourceBeat;
      validateBeat(rawBeat, context, bgKeys, trackKeys);
      const hasSceneDirection = Boolean(rawBeat.bg || rawBeat.bgm || rawBeat.fx || rawBeat.tone || rawBeat.im);
      const scene = hasSceneDirection ? inferScene(rawBeat, priorScene) : undefined;
      const beat = {
        ...rawBeat,
        id: `${id}:${beatIndex + 1}`,
        ...(scene ? { scene, a11y: inferAccessibility(rawBeat, scene) } : {}),
        ...(inferPacing(rawBeat) ? { pacing: inferPacing(rawBeat) } : {}),
      };
      if (scene && !beat.a11y?.description) throw new Error(`${context}: 장면 접근성 설명이 없습니다.`);
      if (beatIds.has(beat.id)) throw new Error(`중복 비트 ID: ${beat.id}`);
      beatIds.add(beat.id);
      if (scene) priorScene = scene;
      return beat;
    });
    return { id, no: episode.no, tag: episode.tag, title: episode.title, beats };
  });
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
      beatCount: episode.beats.length,
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
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runtime = buildNovelPayload();
  writeNovelRuntime(runtime);
  console.log(`VN 산출물 생성 완료: ${runtime.episodeCount}화 · ${runtime.beatCount.toLocaleString("ko-KR")}비트`);
}
