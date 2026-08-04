import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LEGACY_PATH = resolve(ROOT, "public/codedestiny-novel.html");
const SOURCE_PATH = resolve(ROOT, "content/novel/episodes.source.json");

function readBalancedObject(source, start) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error("닫히지 않은 EPISODES.push 객체를 찾았습니다.");
}

export function extractLegacyEpisodes(html) {
  const episodes = [];
  const marker = "EPISODES.push(";
  let cursor = 0;
  while (true) {
    const found = html.indexOf(marker, cursor);
    if (found < 0) break;
    const objectStart = html.indexOf("{", found + marker.length);
    if (objectStart < 0) throw new Error("EPISODES.push의 객체 시작점을 찾지 못했습니다.");
    const raw = readBalancedObject(html, objectStart);
    episodes.push(JSON.parse(raw));
    cursor = objectStart + raw.length;
  }
  return episodes;
}

const force = process.argv.includes("--force");
if (existsSync(SOURCE_PATH) && !force) {
  console.log(`정본이 이미 있습니다: ${SOURCE_PATH}`);
  process.exit(0);
}

const episodes = extractLegacyEpisodes(readFileSync(LEGACY_PATH, "utf8"));
if (episodes.length === 0) throw new Error("EPISODES.push 정본을 찾지 못했습니다.");

const payload = {
  schemaVersion: 1,
  source: {
    migratedFrom: "public/codedestiny-novel.html",
    note: "원문 사건 순서와 대사를 보존한 정본. 런타임 산출물은 build-novel-runtime.mjs가 생성합니다.",
  },
  episodes,
};

mkdirSync(dirname(SOURCE_PATH), { recursive: true });
writeFileSync(SOURCE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const beats = episodes.reduce((total, episode) => total + episode.beats.length, 0);
console.log(`정본 생성 완료: ${episodes.length}화 · ${beats.toLocaleString("ko-KR")}비트`);
