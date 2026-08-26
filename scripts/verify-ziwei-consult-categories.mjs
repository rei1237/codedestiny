#!/usr/bin/env node
/**
 * 자미두수 상담 주제(카테고리) 정합성 가드.
 *
 * 주제 목록이 **손으로 맞춘 네 벌**로 흩어져 있다:
 *   ① worker/lib/ziwei-ai-prompt-templates.mjs — ZIWEI_PROMPT_TEMPLATES / FOCUS_AREA_TO_DOMAIN
 *   ② worker/routes/ziwei-ai.js               — FOCUS_AREA_LABELS
 *   ③ worker/routes/ziwei-ai.js               — TOPICS (라벨 화이트리스트)
 *   ④ app/ziwei-ai/ZiweiAiClient.tsx          — FocusArea 타입 / FOCUS_OPTIONS
 *
 * 한 곳만 늘리면 조용히 어긋난다. 실제로 lawsuit·life_direction 은 템플릿이 다 쓰여 있는데도
 * ②④ 에 없어서 **도달 자체가 불가능**했다(2026-08-27 발견). 서버만 늘리면 고를 길이 없고,
 * 클라이언트만 늘리면 "상담 주제를 다시 선택해 주세요" 로 되돌아온다.
 *
 * 여기에 더해 각 도메인의 primaryPalaces 가 자미두수 삼방사정 규칙과 맞는지 **계산으로** 본다.
 * 손으로 적은 궁 이름은 눈으로 못 거른다 — lawsuit 이 천이궁의 삼합을 재백궁·관록궁(그건 명궁의
 * 삼합이다)으로 적고 있었던 것도 이 검사로 나왔다.
 *
 * 실행: npm run verify:ziwei-consult-categories
 */
import { readFileSync } from "node:fs";
import { ZIWEI_PROMPT_TEMPLATES, resolveZiweiDomainFromFocus, classifyQuestionToZiweiDomain } from "../worker/lib/ziwei-ai-prompt-templates.mjs";

const failures = [];
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
}
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
}

const routeSrc = readFileSync("worker/routes/ziwei-ai.js", "utf8");
const clientSrc = readFileSync("app/ziwei-ai/ZiweiAiClient.tsx", "utf8");

// ── 소스에서 목록을 뽑는다. 정규식이 아무것도 못 찾으면 실패다(대상 0 은 통과가 아니다). ──
function parsePairs(src, startMarker, endMarker, label) {
  const start = src.indexOf(startMarker);
  ok(`${label} 블록을 찾았다`, start >= 0);
  if (start < 0) return [];
  const end = src.indexOf(endMarker, start);
  ok(`${label} 블록의 끝을 찾았다`, end > start);
  if (end <= start) return [];
  const body = src.slice(start, end);
  const out = [];
  for (const m of body.matchAll(/(?:^|[\s{,])([a-z_]+)\s*:\s*"([^"]+)"/gm)) out.push([m[1], m[2]]);
  ok(`${label} 에서 항목을 뽑았다`, out.length > 0, `0개 — 정규식이 소스 모양을 못 따라가고 있다`);
  return out;
}

const serverLabels = parsePairs(routeSrc, "const FOCUS_AREA_LABELS = Object.freeze({", "});", "FOCUS_AREA_LABELS");
const clientOptions = [...clientSrc.matchAll(/\{\s*value:\s*"([a-z_]+)"\s*,\s*label:\s*"([^"]+)"\s*\}/g)].map((m) => [m[1], m[2]]);
ok("FOCUS_OPTIONS 에서 항목을 뽑았다", clientOptions.length > 0);

const topicsBlock = routeSrc.slice(routeSrc.indexOf("const TOPICS = new Set(["), routeSrc.indexOf("]);", routeSrc.indexOf("const TOPICS = new Set([")));
const topics = new Set([...topicsBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
ok("TOPICS 에서 항목을 뽑았다", topics.size > 0);

const focusTypeBlock = clientSrc.slice(clientSrc.indexOf("type FocusArea ="), clientSrc.indexOf(";", clientSrc.indexOf("type FocusArea =")));
const typeKeys = new Set([...focusTypeBlock.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));
ok("FocusArea 타입에서 항목을 뽑았다", typeKeys.size > 0);

console.log(`[verify:ziwei-consult-categories] 서버 라벨 ${serverLabels.length} · 클라이언트 옵션 ${clientOptions.length} · TOPICS ${topics.size} · 타입 ${typeKeys.size} · 템플릿 ${Object.keys(ZIWEI_PROMPT_TEMPLATES).length}`);

// ── ① 서버 라벨 ↔ 클라이언트 옵션: 키 순서와 라벨 글자가 모두 같아야 한다 ──
// 라벨이 한 글자라도 다르면 클라이언트가 올린 topic 이 TOPICS 화이트리스트를 통과 못 한다.
check("서버 FOCUS_AREA_LABELS 와 클라이언트 FOCUS_OPTIONS 가 키·라벨·순서까지 같다", clientOptions, serverLabels);

// ── ② FocusArea 타입이 같은 키 집합을 갖는다 ──
check(
  "FocusArea 타입 키 집합이 서버 라벨과 같다",
  [...typeKeys].sort(),
  serverLabels.map(([k]) => k).sort(),
);

// ── ③ 모든 라벨이 TOPICS 화이트리스트에 있다 ──
for (const [key, label] of serverLabels) {
  ok(`TOPICS 가 "${label}"(${key}) 를 허용한다`, topics.has(label));
}

// ── ④ custom 을 뺀 모든 focusArea 가 실제 템플릿으로 이어진다 ──
// resolveZiweiDomainFromFocus 는 못 찾으면 "overall" 로 조용히 떨어진다. 그래서 매핑 누락은
// 에러가 아니라 "전부 총론으로 상담되는" 침묵한 회귀가 된다 — 여기서 잡는다.
for (const [key] of serverLabels) {
  if (key === "custom" || key === "overall") continue;
  const domain = resolveZiweiDomainFromFocus(key, "");
  ok(`focusArea "${key}" 가 자기 도메인으로 이어진다 (overall 로 새지 않는다)`, domain === key, `→ ${domain}`);
  ok(`도메인 "${key}" 템플릿이 존재한다`, !!ZIWEI_PROMPT_TEMPLATES[key]);
}

// ── ⑤ 템플릿 필드가 전부 채워져 있다 ──
const REQUIRED = ["domain", "domainKo", "keywordWeights", "analysisAngles", "questionPatterns", "primaryPalaces", "readingChain", "mustCheckStars", "avoid"];
for (const [key, t] of Object.entries(ZIWEI_PROMPT_TEMPLATES)) {
  const missing = REQUIRED.filter((f) => !t[f] || (Array.isArray(t[f]) && !t[f].length));
  ok(`템플릿 "${key}" 에 빠진 필드가 없다`, missing.length === 0, `빠진 필드: ${missing.join(", ")}`);
  check(`템플릿 "${key}" 의 domain 필드가 키와 같다`, t.domain, key);
}

// ── ⑥ primaryPalaces 가 삼방사정 규칙과 맞는다 (계산으로 검사) ──
// 궁은 명궁에서 역행으로 배치되므로(b_i = mengIdx - i), 지지 +4·+8·+6 은 각각 offset -4·-8·-6 이다.
const PALACE_RING = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const PALACE_ALIAS = { 교우궁: "노복궁", 부처궁: "부부궁" };
const canon = (n) => PALACE_ALIAS[n] || n;
const mod12 = (n) => ((n % 12) + 12) % 12;

check("궁 링은 12궁 전부를 덮는다", new Set(PALACE_RING).size, 12);

for (const [key, t] of Object.entries(ZIWEI_PROMPT_TEMPLATES)) {
  const p = t.primaryPalaces;
  if (!p) continue;
  const i = PALACE_RING.indexOf(canon(p.main));
  ok(`템플릿 "${key}" 의 주궁이 실제 궁 이름이다`, i >= 0, `main=${p.main}`);
  if (i < 0) continue;
  check(`템플릿 "${key}": ${p.main} 의 대궁`, canon(p.opposite), PALACE_RING[mod12(i - 6)]);
  check(
    `템플릿 "${key}": ${p.main} 의 삼합궁`,
    [...(p.triad || [])].map(canon).sort(),
    [PALACE_RING[mod12(i - 4)], PALACE_RING[mod12(i - 8)]].sort(),
  );
  ok(`템플릿 "${key}": 보조궁이 주궁·대궁·삼합과 겹치지 않는다`, (() => {
    const core = new Set([canon(p.main), canon(p.opposite), ...(p.triad || []).map(canon)]);
    return (p.support || []).every((s) => !core.has(canon(s)));
  })());
}

// ── ⑦ custom 질문 분류가 신규 도메인에 실제로 닿는다 ──
// 키워드를 넣어 놓고 순서 때문에 앞 도메인이 먼저 물어 가면 그 도메인은 영영 안 쓰인다.
const CLASSIFY_CASES = [
  ["다음 시험 준비를 어떻게 해야 할까요", "study"],
  ["자녀 육아가 너무 힘듭니다", "children"],
  ["부동산 매매를 고민 중입니다", "property"],
  ["해외 이주를 생각하고 있어요", "move"],
  ["부모님과의 관계가 어렵습니다", "family"],
  ["소송을 준비해야 할까요", "lawsuit"],
  ["앞으로 인생 방향을 모르겠어요", "life_direction"],
];
for (const [question, expected] of CLASSIFY_CASES) {
  check(`custom 분류: "${question}"`, classifyQuestionToZiweiDomain(question), expected);
}

// 🔴 한 글자 키워드는 부분 문자열로 엉뚱한 단어를 문다. "법" 하나가 "방법·요법·법인"까지
// 걸려서 평범한 "가장 좋은 방법이 뭔가요" 를 송사 상담으로 보냈다.
// 새로 한 글자를 넣으려면 아래 허용 목록에 **왜 안전한지와 함께** 적는다. 빈 목록으로 통과시키는
// 대신 예외를 명시적으로 남기는 쪽이, 다음 사람이 무심코 하나 더 넣는 것을 막는다.
const ALLOWED_SHORT_KEYWORDS = new Set([
  "돈", // money. 한국어에서 "돈"으로 시작·포함하는 흔한 오탐 단어가 거의 없고, 재물 질문의 1순위 표현이다.
]);
const srcTemplates = readFileSync("worker/lib/ziwei-ai-prompt-templates.mjs", "utf8");
const mapBlock = srcTemplates.slice(srcTemplates.indexOf("const map = {"), srcTemplates.indexOf("};", srcTemplates.indexOf("const map = {")));
const allKeywords = [...mapBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
ok("분류 키워드를 실제로 뽑아냈다", allKeywords.length > 20, `${allKeywords.length}개`);
check(
  "허용 목록에 없는 한 글자 분류 키워드가 없다",
  allKeywords.filter((k) => k.length < 2 && !ALLOWED_SHORT_KEYWORDS.has(k)),
  [],
);

// 규칙만으로는 부족하다 — 실제로 새는지 질문으로 확인한다.
const FALSE_POSITIVE_CASES = [
  ["가장 좋은 방법이 뭔가요", "lawsuit"],
  ["요법을 바꿔야 할까요", "lawsuit"],
  ["법인을 세우는 게 나을까요", "lawsuit"],
];
for (const [question, mustNotBe] of FALSE_POSITIVE_CASES) {
  const got = classifyQuestionToZiweiDomain(question);
  ok(`"${question}" 는 ${mustNotBe} 로 새지 않는다`, got !== mustNotBe, `→ ${got}`);
}

if (failures.length) {
  console.error(`[verify:ziwei-consult-categories] ${failures.length}/${checks} FAILED`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`[verify:ziwei-consult-categories] ok — ${checks} checks`);
