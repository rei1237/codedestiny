#!/usr/bin/env node
/**
 * 홈 셸/로케일 문구에 노출되는 "N곡"을 실제 플레이리스트 길이와 동기화한다.
 *
 * 정본은 app/music/_data/musicManifest.ts 의 artistAudioManifests 배열 하나뿐이다
 * (= 런타임 allTracks.length). 이 스크립트는 그 값을 읽어 표시 문구에만 주입하며,
 * 표시 문구 쪽에서 곡 수를 직접 세거나 손으로 적는 일이 없도록 한다.
 *
 *   node scripts/sync-music-track-count.mjs           # 주입(자가치유)
 *   node scripts/sync-music-track-count.mjs --check   # 불일치 시 exit 1 (배포 가드)
 *
 * ensure-ads-txt.mjs 와 같은 "주입 + --check" 패턴을 따른다.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const manifestPath = resolve(rootDir, "app", "music", "_data", "musicManifest.ts");
const shellPath = resolve(rootDir, "index.html");
const i18nDir = resolve(rootDir, "public", "i18n");
const translateSourcePath = resolve(rootDir, "scripts", "i18n-translate-remaining.mjs");

const checkOnly = process.argv.includes("--check");
const LABEL = "[sync-music-track-count]";

/**
 * artistAudioManifests 안의 audioFileNames 배열 원소를 센다.
 * 원소는 문자열("x.mp3") 또는 객체({ fileName: "x.mp3", audioFolder: "..." }) 이며,
 * null 은 매니페스트에서 flatMap 으로 걸러지므로 트랙 수에 포함하지 않는다.
 */
function countTracks(source) {
  const arrayStart = source.indexOf("const artistAudioManifests");
  if (arrayStart < 0) throw new Error(`${LABEL} musicManifest.ts 에서 artistAudioManifests 를 찾지 못했습니다.`);

  let total = 0;
  let cursor = arrayStart;
  for (;;) {
    const keyIndex = source.indexOf("audioFileNames:", cursor);
    if (keyIndex < 0) break;
    const open = source.indexOf("[", keyIndex);
    if (open < 0) break;
    const close = matchBracket(source, open);
    total += countArrayItems(source.slice(open + 1, close));
    cursor = close + 1;
  }

  if (total === 0) throw new Error(`${LABEL} 트랙을 하나도 세지 못했습니다 — 매니페스트 형식이 바뀐 것 같습니다.`);
  return total;
}

/** open 위치의 대괄호와 짝을 이루는 닫는 대괄호 인덱스. 문자열 리터럴 안의 괄호는 무시한다. */
function matchBracket(source, open) {
  let depth = 0;
  let quote = "";
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "[" || ch === "{") depth += 1;
    else if (ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`${LABEL} audioFileNames 배열이 닫히지 않았습니다.`);
}

/** 최상위 콤마로 원소를 쪼개고, 비어있지 않으면서 null 이 아닌 원소만 센다. */
function countArrayItems(body) {
  const items = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "[" || ch === "{") depth += 1;
    else if (ch === "]" || ch === "}") depth -= 1;
    else if (ch === "," && depth === 0) {
      items.push(body.slice(start, i));
      start = i + 1;
    }
  }
  items.push(body.slice(start));

  return items.filter((item) => {
    const trimmed = item.replace(/\/\/[^\n]*/g, "").trim();
    return trimmed.length > 0 && trimmed !== "null";
  }).length;
}

/** 문구 안의 첫 정수만 교체한다 — 로케일마다 앞뒤 조사/단위가 달라도 안전하다. */
function withCount(text, count) {
  return text.replace(/\d+/, String(count));
}

function readCurrentCount(text) {
  const found = text.match(/\d+/);
  return found ? Number(found[0]) : null;
}

const edits = [];
const drift = [];

function applyText(path, label, original, next, currentCount, expected) {
  if (original === next) return;
  drift.push(`${label}: ${currentCount ?? "?"} → ${expected}`);
  if (!checkOnly) {
    writeFileSync(path, next, "utf8");
    edits.push(label);
  }
}

const expected = countTracks(readFileSync(manifestPath, "utf8"));

// 1) 정적 셸의 인라인 폴백 문구 (data-key="home.music.hint")
{
  const html = readFileSync(shellPath, "utf8");
  const hintPattern = /(<span class="moon-music-entry__hint"[^>]*>)([^<]*)(<\/span>)/;
  const match = html.match(hintPattern);
  if (!match) throw new Error(`${LABEL} index.html 에서 moon-music-entry__hint 를 찾지 못했습니다.`);
  const next = html.replace(hintPattern, (_all, open, body, close) => `${open}${withCount(body, expected)}${close}`);
  applyText(shellPath, "index.html", html, next, readCurrentCount(match[2]), expected);
}

// 2) 12개 로케일 JSON 의 home.music.hint
for (const file of readdirSync(i18nDir).filter((name) => name.endsWith(".json")).sort()) {
  const path = join(i18nDir, file);
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw);
  const hint = json?.home?.music?.hint;
  if (typeof hint !== "string") continue;
  const updated = withCount(hint, expected);
  if (updated === hint) continue;
  // 원본 포매팅을 보존하기 위해 JSON 재직렬화 대신 해당 문자열만 치환한다.
  const next = raw.replace(JSON.stringify(hint), JSON.stringify(updated));
  applyText(path, `public/i18n/${file}`, raw, next, readCurrentCount(hint), expected);
}

// 3) 번역 백필 스크립트의 영문 원문 (재실행 시 옛 숫자가 되돌아오는 것을 막는다)
{
  const raw = readFileSync(translateSourcePath, "utf8");
  const pattern = /("home\.music\.hint":\s*")([^"]*)(")/;
  const match = raw.match(pattern);
  if (match) {
    const next = raw.replace(pattern, (_all, open, body, close) => `${open}${withCount(body, expected)}${close}`);
    applyText(translateSourcePath, "scripts/i18n-translate-remaining.mjs", raw, next, readCurrentCount(match[2]), expected);
  }
}

if (checkOnly) {
  if (drift.length > 0) {
    console.error(`${LABEL} 표시 곡 수가 매니페스트(${expected}곡)와 어긋납니다:`);
    for (const line of drift) console.error(`  - ${line}`);
    console.error(`${LABEL} 해결: npm run sync:music-track-count`);
    process.exit(1);
  }
  console.log(`${LABEL} OK — 표시 곡 수가 매니페스트와 일치합니다 (${expected}곡).`);
} else if (edits.length > 0) {
  console.log(`${LABEL} ${expected}곡으로 동기화했습니다: ${edits.join(", ")}`);
} else {
  console.log(`${LABEL} 이미 최신입니다 (${expected}곡).`);
}
