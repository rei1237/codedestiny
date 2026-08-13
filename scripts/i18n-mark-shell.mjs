#!/usr/bin/env node
/**
 * 정적 셸(index.html)의 마커 없는 한국어에 data-cd-trans / data-cd-trans-attr 를 붙인다.
 *
 * 왜 자동화하는가: 셸은 3만 줄·2MB 다. 손으로 고치면 누락과 오타가 반드시 생긴다.
 *
 * 🔴 왜 jsdom 이 아니라 parse5 소스 위치인가
 * jsdom 으로 파싱해 outerHTML 로 되쓰면 2MB 문서 전체가 재직렬화된다. 속성 따옴표·
 * 엔티티·공백이 전부 바뀌어 diff 가 파일 전체가 되고, 문서 앞머리의 크리티컬 CSS
 * hoist 와 문서 말미의 확정 오버라이드 블록, verify:locale-main-sync 가 문자열로
 * 대조하는 마커들이 함께 흔들린다. 그래서 파싱은 하되 **원본 바이트에 속성만
 * 끼워 넣는다**. 그 외 단 한 바이트도 바뀌지 않는다.
 *
 * 🔴 리프 노드 원칙
 * 런타임 번역기는 `el.textContent = ...` 로 통째로 갈아끼운다. 자식 엘리먼트를 가진
 * 노드에 마커를 달면 번역되는 순간 자식이 전부 사라진다. 순수 텍스트 요소만 마킹한다.
 *
 * 사용법:
 *   node scripts/i18n-mark-shell.mjs --probe   대상만 보고
 *   node scripts/i18n-mark-shell.mjs           index.html 수정 + 키를 pending 으로
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import * as parse5 from "parse5";

const rootDir = process.cwd();
const shellPath = resolve(rootDir, "index.html");
const probeOnly = process.argv.includes("--probe");

/** 이 안쪽은 런타임 번역 대상이 아니다. */
const SKIP_TAGS = new Set(["script", "style", "template", "svg", "noscript", "code", "pre", "head"]);

/**
 * 명시적 제외 표식. 이 속성이 붙은 요소와 그 자손은 마킹하지 않는다.
 *
 * 왜 필요한가: `<pre>`/`<code>` 가 아닌 태그로 쓰인 코드 아트가 있다. 히어로의
 * 의사(擬似) 코드 블록(`.moon-story-entry__code`)이 그렇고, 그 안의 `??`(널 병합
 * 연산자)는 i18n:check 의 모지바케 가드(`/\?{2,}/`)에 걸려 사전에 넣는 순간 게이트가
 * 깨진다. 가드를 느슨하게 푸는 건 진짜 깨진 문자를 놓치는 대가를 치르는 일이라,
 * 그 한 요소만 대상에서 빼는 쪽이 맞다.
 */
const SKIP_ATTR = "data-cd-trans-skip";

/** 값이 번역 대상인 속성. `content` 는 <meta> 에 한정한다(다른 곳의 content 는 데이터). */
const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title", "alt", "data-tooltip"];

const html = readFileSync(shellPath, "utf8");
const document = parse5.parse(html, { sourceCodeLocationInfo: true });

const camel = (value) =>
  String(value)
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => String(c).toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^(\d)/, "n$1")
    .slice(0, 28) || "text";

/** 한국어는 키에 쓸 수 없으므로 결정론적 짧은 해시로 대체한다. */
const slug = (text) => {
  const trimmed = String(text).replace(/\s+/g, " ").trim().slice(0, 60);
  const ascii = trimmed.replace(/[^a-zA-Z0-9]+/g, "");
  if (ascii.length >= 4) return ascii.slice(0, 20);
  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  return `k${hash.toString(36)}`;
};

const attrOf = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const textOf = (node) =>
  (node.childNodes || []).map((c) => (c.nodeName === "#text" ? c.value : textOf(c))).join("");

const seenKeys = new Set();
function deriveKey(node, ancestors, text) {
  const scope = [];
  for (let i = ancestors.length - 1; i >= 0 && scope.length < 2; i -= 1) {
    const id = attrOf(ancestors[i], "id");
    if (id) { scope.unshift(camel(id)); break; }
    const cls = (attrOf(ancestors[i], "class") || "").split(/\s+/).filter(Boolean)[0];
    if (cls) scope.unshift(camel(cls));
  }
  const base = ["shell", ...scope].join(".");
  let key = `${base}.${camel(slug(text))}`;
  let n = 2;
  while (seenKeys.has(key)) key = `${base}.${camel(slug(text))}${n++}`;
  seenKeys.add(key);
  return key;
}

const textTargets = [];
const attrTargets = [];
const skipped = [];

function walk(node, ancestors) {
  for (const child of node.childNodes || []) {
    if (!child.tagName) continue;
    if (SKIP_TAGS.has(child.tagName)) continue;
    if (child.attrs.some((a) => a.name === SKIP_ATTR)) continue;
    if (!child.sourceCodeLocation?.startTag) { walk(child, [...ancestors, child]); continue; }

    const text = textOf(child).trim();
    const marked = child.attrs.some((a) => a.name === "data-cd-trans")
      || (attrOf(child, "class") || "").split(/\s+/).includes("custom-trans");

    if (!marked && /[가-힣]/.test(text)) {
      const isLeaf = (child.childNodes || []).every((c) => c.nodeName === "#text");
      if (isLeaf) {
        textTargets.push({ node: child, ancestors: [...ancestors], text });
      } else {
        // 자식이 있는 요소는 마킹하면 번역 시 자식이 날아간다. 다만 대부분은 한국어가
        // 자식 쪽에 있어 그 자식이 따로 마킹되므로 문제가 아니다. 정말 곤란한 건
        // **자기 직속 텍스트 노드**에 한국어가 있는 경우 — 이건 리프로 감싸야 한다.
        const ownText = (child.childNodes || [])
          .filter((c) => c.nodeName === "#text")
          .map((c) => c.value)
          .join("")
          .trim();
        if (/[가-힣]/.test(ownText)) {
          skipped.push({ text: ownText.slice(0, 60), tag: child.tagName });
        }
      }
    }

    const attrSpec = attrOf(child, "data-cd-trans-attr") || "";
    const markedAttrs = new Set(attrSpec.split(",").map((s) => s.split(":")[0].trim()).filter(Boolean));
    for (const attr of TRANSLATABLE_ATTRS) {
      const value = attrOf(child, attr);
      if (!value || !/[가-힣]/.test(value) || markedAttrs.has(attr)) continue;
      attrTargets.push({ node: child, ancestors: [...ancestors], attr, value: value.trim(), hasSpec: !!attrSpec });
    }

    walk(child, [...ancestors, child]);
  }
}
walk(document, []);

console.log(`[mark-shell] 마커 없는 한국어 텍스트 리프 : ${textTargets.length}`);
console.log(`[mark-shell] 마커 없는 한국어 속성        : ${attrTargets.length}`);
console.log(`[mark-shell] 자식 보유로 건너뜀           : ${skipped.length}`);
skipped.slice(0, 10).forEach((s) => console.log(`[mark-shell]    <${s.tag}> ${s.text}`));

if (probeOnly) {
  console.log("\n[mark-shell] 표본:");
  for (const t of textTargets.slice(0, 12)) {
    console.log(`   ${deriveKey(t.node, t.ancestors, t.text)}  ←  ${t.text.slice(0, 46)}`);
  }
  console.log("\n[mark-shell] --probe: 파일을 수정하지 않았습니다.");
  process.exit(0);
}

// ── 삽입 지점 계산 ────────────────────────────────────────────────────────
/**
 * 🔴 번역이 준비된 키만 마킹한다.
 * i18n:check 는 셸의 모든 마커 키가 **12개 로케일 전부**에서 문자열로 풀리기를 요구한다.
 * 아직 번역이 없는 키에 마커를 달면 그 순간 배포 게이트가 깨진다. 그래서 순서는
 *   1) 이 스크립트가 원문을 i18n/pending 으로 추출  →  2) 번역 배치  →  3) 다시 실행해 마킹
 * 이다. 매 실행이 "지금 번역된 만큼만" 마킹하므로 어느 시점에 멈춰도 트리가 성하다.
 * --force 는 번역과 마킹을 한 커밋에 넣을 때만 쓴다.
 */
const forceMark = process.argv.includes("--force");
const enDictionary = JSON.parse(readFileSync(resolve(rootDir, "public", "i18n", "en.json"), "utf8"));
const hasTranslation = (key) => {
  const value = key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), enDictionary);
  return typeof value === "string";
};

const extracted = {};
let deferred = 0;
/** { offset, text } — 원본에 끼워 넣을 조각. 오프셋 역순으로 적용한다. */
const insertions = [];

/** 여는 태그의 `>` 직전 오프셋. `/>` 로 끝나면 슬래시 앞. */
function insertPoint(node) {
  const { endOffset } = node.sourceCodeLocation.startTag;
  let at = endOffset - 1; // '>' 위치
  if (html[at - 1] === "/") at -= 1;
  return at;
}

for (const { node, ancestors, text } of textTargets) {
  const key = deriveKey(node, ancestors, text);
  extracted[key] = text;
  if (!forceMark && !hasTranslation(key)) { deferred += 1; continue; }
  insertions.push({ offset: insertPoint(node), text: ` data-cd-trans="${key}"` });
}

// 같은 요소에 속성이 여러 개면 하나의 data-cd-trans-attr 로 합쳐야 한다.
const attrByNode = new Map();
for (const target of attrTargets) {
  if (!attrByNode.has(target.node)) attrByNode.set(target.node, []);
  attrByNode.get(target.node).push(target);
}
for (const [node, targets] of attrByNode) {
  const { ancestors } = targets[0];
  const baseKey = deriveKey(node, ancestors, targets[0].value);
  const specs = targets.map(({ attr, value }) => {
    const key = `${baseKey}.${camel(attr)}`;
    extracted[key] = value;
    if (!forceMark && !hasTranslation(key)) { deferred += 1; return null; }
    return `${attr}:${key}`;
  }).filter(Boolean);
  if (!specs.length) continue;
  const existing = attrOf(node, "data-cd-trans-attr");
  if (existing) {
    // 이미 있는 속성 값 끝에 덧붙인다 — 값의 닫는 따옴표 직전에 삽입
    const loc = node.sourceCodeLocation.startTag.attrs["data-cd-trans-attr"];
    insertions.push({ offset: loc.endOffset - 1, text: `, ${specs.join(", ")}` });
  } else {
    insertions.push({ offset: insertPoint(node), text: ` data-cd-trans-attr="${specs.join(", ")}"` });
  }
}

// ── 원본 바이트에 삽입 ────────────────────────────────────────────────────
insertions.sort((a, b) => b.offset - a.offset);
let output = html;
for (const { offset, text } of insertions) {
  output = output.slice(0, offset) + text + output.slice(offset);
}

writeFileSync(shellPath, output, "utf8");
mkdirSync(resolve(rootDir, "i18n", "pending"), { recursive: true });
writeFileSync(
  resolve(rootDir, "i18n", "pending", "shell.ko.json"),
  `${JSON.stringify(extracted, null, 2)}\n`,
  "utf8",
);

const grew = output.length - html.length;
console.log(`[mark-shell] 삽입 ${insertions.length}건 (+${grew}바이트), 추출 키 ${Object.keys(extracted).length}개`);
if (deferred) console.log(`[mark-shell] 번역 대기로 보류: ${deferred}건 — 번역 배치 후 다시 실행하면 마킹된다`);
console.log("[mark-shell] i18n/pending/shell.ko.json 기록");
