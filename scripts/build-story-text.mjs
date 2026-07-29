// 비주얼 노벨(public/codedestiny-novel.html) 안의 시나리오 데이터를 텍스트 리더용
// JSON 으로 추출한다.
//
// 왜 필요한가: VN 은 42만자에 이르는 창작 텍스트를 단일 <script> 안의 JS 문자열로만
// 갖고 있어 크롤러가 보는 본문이 319자뿐이었다. 브랜드 정체성에 해당하는 최대 자산이
// AdSense 관점에서는 존재하지 않는 것과 같았다.
//
// 데이터는 `EPISODES.push({...})` 형태의 순수 JSON 리터럴이라 정규식 스크래핑이 아니라
// 괄호 균형으로 잘라 JSON.parse 로 무손실 추출한다. 원본이 authoritative source 이며,
// 이 스크립트의 산출물은 파생물이다. 동기화는 scripts/verify-story-text-sync.mjs 가 강제한다.
//
// 사용: node scripts/build-story-text.mjs
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const rootDir = process.cwd();
export const STORY_SOURCE_PATH = resolve(rootDir, "public", "codedestiny-novel.html");
export const STORY_OUTPUT_PATH = resolve(rootDir, "lib", "stories", "vn", "episodes.generated.json");

// 화면 연출 전용 키. 텍스트 리더에는 의미가 없으므로 버린다.
const DROPPED_BEAT_KEYS = new Set(["bg", "bgm", "c", "l", "r", "x", "fx", "form", "tone"]);

/** 문자열 이스케이프를 존중하며 여는 괄호와 짝이 맞는 닫는 괄호 위치를 찾는다. */
function findBalancedEnd(source, openIndex) {
  let depth = 1;
  let cursor = openIndex + 1;
  let quote = null;

  while (cursor < source.length && depth > 0) {
    const ch = source[cursor];
    if (quote) {
      if (ch === "\\") {
        cursor += 2;
        continue;
      }
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
    }
    cursor += 1;
  }

  if (depth !== 0) throw new Error(`unbalanced brackets starting at ${openIndex}`);
  return cursor - 1;
}

/** "EP.07" → "ep-07", "PROLOGUE" → "prologue" */
function toEpisodeSlug(no, index) {
  const raw = String(no || "").trim();
  const match = /^EP\.?\s*(\d+)$/i.exec(raw);
  if (match) return `ep-${String(Number(match[1])).padStart(2, "0")}`;
  if (/prologue/i.test(raw)) return "prologue";
  return `ep-${String(index).padStart(2, "0")}`;
}

export function extractEpisodes(html) {
  const episodes = [];
  const pushToken = "EPISODES.push(";
  let searchFrom = 0;
  let index = 0;

  for (;;) {
    const hit = html.indexOf(pushToken, searchFrom);
    if (hit === -1) break;

    const openIndex = hit + pushToken.length - 1;
    const endIndex = findBalancedEnd(html, openIndex);
    const literal = html.slice(openIndex + 1, endIndex);
    searchFrom = endIndex + 1;

    let parsed;
    try {
      parsed = JSON.parse(literal);
    } catch (error) {
      throw new Error(`episode ${index} is not a JSON literal: ${error.message}`);
    }

    const beatsRaw = Array.isArray(parsed.beats) ? parsed.beats : [];
    let previousBackground = null;
    const beats = [];

    for (const beat of beatsRaw) {
      const text = String(beat?.t || "").trim();
      if (!text) continue;

      // 배경이 바뀌는 지점을 장면 전환으로 승격한다.
      // 42만자를 장면 단위로 끊어 주는 유일한 구조 신호다(창작이 아니라 원본 데이터).
      const background = beat?.bg ? String(beat.bg) : null;
      const sceneBreak = Boolean(background && previousBackground && background !== previousBackground);
      if (background) previousBackground = background;

      const kept = { s: String(beat?.s || "n"), t: text };
      if (sceneBreak) kept.sceneBreak = true;
      if (beat?.im) kept.im = String(beat.im);
      if (beat?.skill && typeof beat.skill === "object") kept.skill = beat.skill;
      for (const key of Object.keys(beat || {})) {
        if (key === "s" || key === "t" || DROPPED_BEAT_KEYS.has(key)) continue;
        if (kept[key] === undefined && key !== "im" && key !== "skill") kept[key] = beat[key];
      }
      beats.push(kept);
    }

    episodes.push({
      no: String(parsed.no || "").trim(),
      slug: toEpisodeSlug(parsed.no, index),
      title: String(parsed.title || "").trim(),
      tag: String(parsed.tag || "").trim(),
      beats,
    });
    index += 1;
  }

  return episodes;
}

export function hashSource(html) {
  return createHash("sha256").update(html, "utf8").digest("hex").slice(0, 16);
}

export function buildStoryPayload(html) {
  const episodes = extractEpisodes(html);
  if (episodes.length === 0) throw new Error("no episodes extracted");

  const slugs = new Set();
  for (const episode of episodes) {
    if (slugs.has(episode.slug)) throw new Error(`duplicate episode slug: ${episode.slug}`);
    slugs.add(episode.slug);
    if (episode.beats.length === 0) throw new Error(`episode ${episode.slug} has no text beats`);
  }

  return { version: 1, sourceHash: hashSource(html), episodes };
}

function main() {
  const html = readFileSync(STORY_SOURCE_PATH, "utf8");
  const payload = buildStoryPayload(html);

  mkdirSync(dirname(STORY_OUTPUT_PATH), { recursive: true });
  writeFileSync(STORY_OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const beatCount = payload.episodes.reduce((sum, episode) => sum + episode.beats.length, 0);
  const koreanCount = payload.episodes.reduce(
    (sum, episode) => sum + episode.beats.reduce((inner, beat) => inner + (beat.t.match(/[가-힣]/g) || []).length, 0),
    0,
  );
  console.log(
    `[story-text] ${payload.episodes.length} episodes, ${beatCount} beats, ${koreanCount.toLocaleString()} Korean chars -> lib/stories/vn/episodes.generated.json`,
  );
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("build-story-text.mjs")) {
  main();
}
