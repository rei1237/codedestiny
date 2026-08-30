/**
 * 편집자 노트 가드 — 얇은 광고 라우트에 사람이 쓴 노트가 실제로 붙어 있는가.
 *
 * 왜 있나: AdSense 가 "가치 없는 콘텐츠" 로 거절했다. 대응으로 얇은 광고 라우트에
 * 편집자 노트를 붙였는데, 손으로 적은 목록으로 관리하면 **새로 얇아진 라우트를 놓친다.**
 * 그래서 대상을 산출물에서 전수 발견하고 미충족을 실패시킨다(CLAUDE.md 원칙 10).
 *
 * 🔴 이 가드의 핵심 한 줄: **노트를 제거한 뒤에 분량을 잰다.**
 *    포함해서 재면 노트가 붙는 순간 임계값을 넘겨 가드가 영원히 침묵한다.
 *
 * 🔴 getVisibleText 는 scripts/verify-adsense-readiness.mjs:582~619 의 문자열 스캔 방식을
 *    그대로 옮긴 것이다. 정규식으로 "개선" 하면 수치가 달라져 그쪽 게이트와 대조가 무의미해진다
 *    (scripts/audit-content-headroom.mjs 도 같은 이유로 복사해서 쓴다).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canLoadAdsense } from "../app/components/adsense-route-policy.js";
import { EDITOR_NOTES } from "../app/_content/editor-notes.js";
import { jaccard, shingles as buildShingles } from "./lib/text-shingles.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const baseDir = "out";

/** 이 길이 미만이면 편집자 노트가 있어야 한다. verify-adsense-readiness 의 1,200/1,800 과 다른 축이다 — 저쪽은 크롬 포함 총량, 이쪽은 크롬을 걷어낸 고유 본문. */
const MIN_UNIQUE_BODY = 1500;
/** 8-gram shingle 이 전체 라우트의 이 비율을 넘게 등장하면 공통 크롬으로 본다. */
const BOILERPLATE_DF_RATIO = 0.1;
const SHINGLE_SIZE = 8;
const shingles = (text) => buildShingles(text, SHINGLE_SIZE);

/**
 * 🔴 이 하한은 **한국어 글자 수** 기준이다. 영어 감각으로 올리지 말 것 — 한국어는 글자당
 * 정보 밀도가 영어의 두 배쯤이라, 영어 120자에 해당하는 분량이 한국어로는 60~70자다.
 * 목적은 "잘 쓴 글"을 강제하는 게 아니라 **한 줄짜리 자동 생성 스텁을 막는 것**이다.
 * 실측(2026-08-17, 노트 18개): lede 최소 101 / 중앙 135, tip body 최소 62 / 중앙 70.
 * 하한을 현재 최솟값에 붙이면 문장을 조금만 다듬어도 가드가 터지므로 여유를 두고 잡았다.
 */
const MIN_LEDE_LENGTH = 90;
const MIN_TIPS = 3;
const MIN_TIP_BODY_LENGTH = 50;
/** 두 노트의 8-gram 자카드가 이 값 이상이면 공용 템플릿으로 본다. */
const MAX_CROSS_ROUTE_OVERLAP = 0.5;

/**
 * 노트를 붙이지 않기로 한 라우트와 그 사유. 비어 있는 것이 기본이다.
 * 🔴 사유가 사라졌는데 항목이 남아 있으면 실패한다(죽은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다).
 */
// 🔴 2026-08-17: `/fortune/` 예외를 지웠다. 이 가드가 스스로 지우라고 요구했다 —
//    단언 F(아래 "쓰이지 않는 예외 선언은 실패")가 걸렸기 때문이다.
//    사유: scripts/gen-daily.mjs 의 일일 문안이 24개 sign 전부 동일하던 것을 날짜×sign 해시
//    선택으로 바꾸자, 광고 게재 대상 `/fortune/{today,tomorrow}/*` 가 전부 1,500자 임계를 넘겼다.
//    즉 예외가 필요 없어졌다. 되살리지 말 것 — 되살리면 단언 F 가 다시 빌드를 세운다.
const DECLARED_EXCEPTIONS = new Map([]);

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

// ── verify-adsense-readiness.mjs 와 동일한 텍스트 추출 ────────────────────
function removeElementBlocks(html, tagName) {
  const lower = tagName.toLowerCase();
  let out = "";
  let index = 0;

  while (index < html.length) {
    const open = html.toLowerCase().indexOf(`<${lower}`, index);
    if (open === -1) {
      out += html.slice(index);
      break;
    }
    out += html.slice(index, open);
    const close = html.toLowerCase().indexOf(`</${lower}>`, open);
    if (close === -1) {
      index = html.length;
      break;
    }
    index = close + lower.length + 3;
  }

  return out;
}

function getVisibleText(html) {
  let text = removeElementBlocks(html, "script");
  text = removeElementBlocks(text, "style");
  text = removeElementBlocks(text, "svg");
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** data-cd-editor-note 를 단 <aside> 블록을 통째로 들어낸다. */
function stripEditorNote(html) {
  let out = html;
  for (;;) {
    const marker = out.indexOf("data-cd-editor-note");
    if (marker === -1) return out;
    const open = out.lastIndexOf("<aside", marker);
    const close = out.indexOf("</aside>", marker);
    if (open === -1 || close === -1) return out.slice(0, marker) + out.slice(marker + 1);
    out = out.slice(0, open) + out.slice(close + "</aside>".length);
  }
}

function hasEditorNote(html) {
  return html.includes("data-cd-editor-note");
}

function collectIndexHtmlFiles(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) collectIndexHtmlFiles(absolute, files);
    else if (entry === "index.html") files.push(absolute);
  }
  return files;
}

function routeFromHtmlPath(absolutePath) {
  const rel = relative(resolve(rootDir, baseDir), absolutePath).replace(/\\/g, "/");
  const route = `/${rel.replace(/index\.html$/, "")}`.replace(/\/+$/, "");
  return route || "/";
}

function noteText(note) {
  return [note.lede, ...note.tips.map((tip) => `${tip.label} ${tip.body}`)].join(" ");
}

// ── 1. 산출물이 없으면 즉시 실패 (검사 대상 0으로 통과하는 것을 막는다) ────
const outDir = resolve(rootDir, baseDir);
if (!existsSync(outDir)) {
  console.error(
    `[editor-notes] ${baseDir}/ 가 없다. 이 가드는 산출물을 읽으므로 \`npm run build:cf\` 뒤에 실행할 것.`,
  );
  process.exit(1);
}

// ── 2. 대상 발견: 광고 게재 가능 라우트를 소스 정책에서 파생 ──────────────
const htmlFiles = collectIndexHtmlFiles(outDir);
const pages = new Map();
for (const absolutePath of htmlFiles) {
  const route = routeFromHtmlPath(absolutePath);
  if (!canLoadAdsense(route)) continue;
  pages.set(route, readFileSync(absolutePath, "utf8"));
}

assert(pages.size > 0, "[editor-notes] 광고 게재 가능 라우트를 하나도 못 찾았다 — 발견 로직이 깨졌다.");

// ── 3. 노트를 제거한 뒤 고유 본문 길이 계산 ───────────────────────────────
const strippedText = new Map();
for (const [route, html] of pages) {
  strippedText.set(route, getVisibleText(stripEditorNote(html)));
}

const documentFrequency = new Map();
const pageShingles = new Map();
for (const [route, text] of strippedText) {
  const set = shingles(text);
  pageShingles.set(route, set);
  for (const shingle of set) documentFrequency.set(shingle, (documentFrequency.get(shingle) || 0) + 1);
}

const total = strippedText.size;
function uniqueBodyLength(route) {
  const set = pageShingles.get(route);
  if (!set || set.size === 0) return strippedText.get(route).length;
  let unique = 0;
  for (const shingle of set) {
    if (documentFrequency.get(shingle) <= total * BOILERPLATE_DF_RATIO) unique += 1;
  }
  return Math.round(strippedText.get(route).length * (unique / set.size));
}

function exceptionFor(route) {
  for (const [prefix] of DECLARED_EXCEPTIONS) {
    if (route === prefix.replace(/\/$/, "") || route.startsWith(prefix)) return prefix;
  }
  return null;
}

// ── 4. 단언 A: 얇은데 노트가 없으면 실패 ──────────────────────────────────
const thinRoutes = [];
const usedExceptions = new Set();
for (const route of [...pages.keys()].sort()) {
  const length = uniqueBodyLength(route);
  if (length >= MIN_UNIQUE_BODY) continue;

  const exception = exceptionFor(route);
  if (exception) {
    usedExceptions.add(exception);
    continue;
  }

  thinRoutes.push(route);
  assert(
    hasEditorNote(pages.get(route)),
    `[editor-notes] 고유 본문 ${length}자(<${MIN_UNIQUE_BODY})인데 편집자 노트가 없다: ${route}`,
  );
}

assert(
  thinRoutes.length > 0 || usedExceptions.size > 0,
  "[editor-notes] 임계값 미만 라우트가 하나도 없다 — 검사 대상 0인 가드는 가드가 아니다. "
    + "임계값이나 발견 로직을 확인할 것.",
);

// ── 5. 단언 F: 쓰이지 않는 예외 선언은 실패 ───────────────────────────────
for (const [prefix, reason] of DECLARED_EXCEPTIONS) {
  assert(
    usedExceptions.has(prefix),
    `[editor-notes] 예외 선언 "${prefix}" 가 더 이상 필요 없다(해당 라우트가 임계값을 넘었거나 사라졌다). `
      + `지울 것. 사유: ${reason}`,
  );
}

// ── 6. 단언 B/C: 렌더 ↔ 레지스트리 정합 ───────────────────────────────────
const renderedNoteRoutes = new Set();
for (const [route, html] of pages) if (hasEditorNote(html)) renderedNoteRoutes.add(route);

for (const route of renderedNoteRoutes) {
  assert(
    Object.prototype.hasOwnProperty.call(EDITOR_NOTES, route),
    `[editor-notes] 노트가 렌더됐는데 EDITOR_NOTES 에 "${route}" 키가 없다 — 레지스트리와 렌더가 갈렸다.`,
  );
}

for (const route of Object.keys(EDITOR_NOTES)) {
  assert(
    renderedNoteRoutes.has(route),
    `[editor-notes] EDITOR_NOTES 에 "${route}" 가 선언됐는데 ${baseDir}${route}/ 산출물에 노트가 없다 — `
      + "렌더러에 안 꽂혔거나 죽은 선언이다.",
  );
}

// ── 7. 단언 D: 자동 생성 방지 ─────────────────────────────────────────────
for (const [route, note] of Object.entries(EDITOR_NOTES)) {
  assert(
    typeof note.lede === "string" && note.lede.length >= MIN_LEDE_LENGTH,
    `[editor-notes] ${route}: lede 가 ${MIN_LEDE_LENGTH}자 미만이다(${note.lede?.length ?? 0}자).`,
  );
  assert(
    Array.isArray(note.tips) && note.tips.length >= MIN_TIPS,
    `[editor-notes] ${route}: tips 가 ${MIN_TIPS}개 미만이다(${note.tips?.length ?? 0}개).`,
  );
  for (const tip of note.tips || []) {
    assert(
      String(tip.body || "").length >= MIN_TIP_BODY_LENGTH,
      `[editor-notes] ${route}: 팁 "${tip.label}" 의 본문이 ${MIN_TIP_BODY_LENGTH}자 미만이다.`,
    );
  }

  // 같은 페이지 본문을 그대로 복사한 노트(= summary/description 복붙)를 잡는다.
  const body = strippedText.get(route);
  if (body) {
    const bodyWithoutNote = body;
    assert(
      !bodyWithoutNote.includes(note.lede.slice(0, 60)),
      `[editor-notes] ${route}: lede 가 페이지 본문의 부분 문자열이다 — 기존 카피를 복사한 노트는 값이 없다.`,
    );
  }
}

const noteShingles = new Map();
for (const [route, note] of Object.entries(EDITOR_NOTES)) {
  noteShingles.set(route, shingles(noteText(note)));
}
const noteRoutes = [...noteShingles.keys()];
for (let i = 0; i < noteRoutes.length; i += 1) {
  for (let j = i + 1; j < noteRoutes.length; j += 1) {
    const overlap = jaccard(noteShingles.get(noteRoutes[i]), noteShingles.get(noteRoutes[j]));
    assert(
      overlap < MAX_CROSS_ROUTE_OVERLAP,
      `[editor-notes] "${noteRoutes[i]}" 와 "${noteRoutes[j]}" 의 노트 중복률이 ${overlap.toFixed(2)}다 `
        + `(${MAX_CROSS_ROUTE_OVERLAP} 이상) — 공용 템플릿을 돌려쓴 것으로 본다.`,
    );
  }
}

if (failures.length > 0) {
  console.error("[editor-notes] 실패:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `[editor-notes] OK — 광고 라우트 ${pages.size}개, 임계값 미만 ${thinRoutes.length}개 전부 노트 보유, `
    + `레지스트리 ${Object.keys(EDITOR_NOTES).length}개 정합, 예외 ${usedExceptions.size}개.`,
);
