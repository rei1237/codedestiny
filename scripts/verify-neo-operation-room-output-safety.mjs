#!/usr/bin/env node
/**
 * 네오 팩폭 작전실 출력 안전성 가드 — mock 전용, LLM 실호출 0회.
 *
 * verify-neo-operation-room-quality.mjs 는 레지스트리(정적 데이터)만 본다. 이 스크립트는
 * **실제 병합 함수에 합성 챕터 응답을 먹여** 결과 객체를 재귀 walk 한다. 필드를 손으로
 * 열거하지 않고 section.schema 에서 전수 발견하므로, 나중에 추가된 필드도 자동으로 검사된다.
 *
 * 단언:
 *  1) 중간 끊김 없음 — 병합 결과의 긴 문자열은 전부 완결 문장으로 끝난다
 *  2) 최후 수단 미도달 — 정상(완결 문장) 입력에서는 말줄임표 경로를 밟지 않는다
 *  3) 분량 계약 — 각 챕터의 상한들이 그 챕터 minChars 를 지탱한다
 *     ← minChars 만 올리고 상한을 안 올린 aedb1edb9 류 사고를 여기서 잡는다
 *  4) 잘린 JSON 복구 — 챕터가 통째로 사라지지 않는다
 *  5) 중복 제거 — 같은 리스트 항목이 하나만 남는다
 *  6) 가드가 안 죽음 — 빈 입력·null·중첩 객체·배열에 throw 하지 않는다
 *
 * 사용: node scripts/verify-neo-operation-room-output-safety.mjs
 */
import {
  NEO_INITIAL_SECTIONS,
  NEO_REFINED_SECTIONS,
  parseNeoSectionResponse,
  mergeNeoInitialSections,
  mergeNeoRefinedSections,
} from "../worker/lib/neo-operation-room-prompt.js";
import { endsWithSentence } from "../lib/llm-text.js";

const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

// 제목·enum·짧은 명칭은 종결부호가 없는 게 정상이다. 이 길이를 넘는 문자열만 문장으로 본다.
// (레지스트리 최대 제목 상한이 160 이므로 그 위로 잡는다.)
const PROSE_MIN_CHARS = 200;

// ── 합성 응답 생성 ────────────────────────────────────────────────────────
// 완결 문장만으로 채운다. 어떤 상한에 걸리더라도 "직전 완결 문장까지"가 남아야 하고,
// 말줄임표가 붙으면 안 된다(붙었다면 상한 안에 문장 경계가 없었다는 뜻 = 설계 오류).
const SENTENCE = "이 자리는 계산값이 가리키는 흐름을 그대로 보여주는 지점이다. ";

function longProse(marker) {
  // 어떤 필드 상한(최대 5000)보다도 확실히 길게.
  // 🔴 marker 로 항목마다 다른 문장을 만든다. 같은 문장을 넣으면 병합의 중복 제거가 먹어치워
  //    분량 단언이 "상한이 좁다"로 오탐한다.
  return `${marker} 지점의 진단을 시작한다. ${SENTENCE.repeat(220)}`.trim();
}

// 챕터가 낼 수 있는 분량이 목표의 몇 배여야 하는가.
// "겨우 맞음"은 가드가 아니다 — 모델이 목표대로 써도 상한에 닿아 잘려나가는 상태를 통과시킨다.
// 예: 30일 전략은 이전에 상한 700 × 정확히 2개 = 1400 으로 목표 1200 을 겨우 넘겼고, 항목마다
// 목표·근거·행동 3요소를 요구해서 상시로 상한에 닿았다.
const VOLUME_HEADROOM = 1.6;

// section.schema 의 리프를 채운 합성 응답을 만든다. 문자열 리프만 채우고 숫자 리프는 보존한다.
// 리스트는 section.counts 가 선언한 "규칙이 요구하는 최소 개수"만큼 채운다 — 그게 실전 하한이다.
// (병합의 .slice(0, N) 까지 채우면 천장만 재게 되어, 상한이 좁아진 것을 못 잡는다.)
function fillSchema(node, marker, counts, path = "") {
  if (typeof node === "string") return longProse(marker);
  if (typeof node === "number") return node;
  if (Array.isArray(node)) {
    const count = counts[path];
    if (!(count > 0)) {
      failures.push(`리스트 필드 "${path}" 에 counts 선언이 없다 — 레지스트리에 최소 개수를 적어야 한다.`);
      return [];
    }
    seenCountKeys.add(path);
    return Array.from({ length: count }, (_, index) => fillSchema(node[0], `${marker} ${index + 1}`, counts, path));
  }
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [
      key,
      fillSchema(value, marker, counts, path ? `${path}.${key}` : key),
    ]));
  }
  return node;
}

// counts 에 선언됐는데 스키마에 대응 배열이 없는 항목(사문화)을 잡기 위한 기록.
const seenCountKeys = new Set();

function fillSection(section) {
  seenCountKeys.clear();
  const parsed = fillSchema(section.schema, section.title, section.counts || {});
  for (const key of Object.keys(section.counts || {})) {
    ok(seenCountKeys.has(key), `${section.id}: counts 의 "${key}" 에 대응하는 스키마 배열이 없다(사문화된 선언).`);
  }
  return parsed;
}

function buildResults(sections) {
  return sections.map((section) => ({
    id: section.id,
    parsed: fillSection(section),
    provider: "mock",
    model: "mock",
    ok: true,
  }));
}

// ── 결과 walk ─────────────────────────────────────────────────────────────
function walkStrings(value, path, visit) {
  if (typeof value === "string") {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${path}[${index}]`, visit));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walkStrings(item, path ? `${path}.${key}` : key, visit);
  }
}

// 프롬프트가 "공백 포함 최소 N자"로 계약하므로 여기도 공백을 센다.
function countTextChars(value) {
  let total = 0;
  walkStrings(value, "", (text) => { total += text.length; });
  return total;
}

// ── 1·2) 중간 끊김 없음 + 최후 수단 미도달 ───────────────────────────────
const initialBriefing = mergeNeoInitialSections(
  buildResults(NEO_INITIAL_SECTIONS),
  { selectedMethod: "ziwei" },
  { evidenceSummary: "명궁: 자미(묘)", evidenceTokens: ["자미"] },
);
const refinedOrder = mergeNeoRefinedSections(buildResults(NEO_REFINED_SECTIONS), { selectedMethod: "ziwei" });

for (const [label, merged] of [["1차", initialBriefing], ["2차", refinedOrder]]) {
  walkStrings(merged, "", (text, path) => {
    if (text.length < PROSE_MIN_CHARS) return;
    ok(endsWithSentence(text), `${label} ${path}: 문장이 중간에 끊겼다 — …${JSON.stringify(text.slice(-40))}`);
    ok(!text.endsWith("…"), `${label} ${path}: 말줄임표 최후 수단 경로를 밟았다(상한 안에 문장 경계가 없음)`);
  });
}

// ── 3) 분량 계약: 상한들이 챕터 minChars 를 지탱하는가 ────────────────────
// 🔴 minChars 만 올리고 clean/cleanProse 상한을 그대로 두면(= aedb1edb9) 여기서 실패한다.
for (const [label, sections, merge, mergeArgs] of [
  ["1차", NEO_INITIAL_SECTIONS, mergeNeoInitialSections, [{ selectedMethod: "ziwei" }, {}]],
  ["2차", NEO_REFINED_SECTIONS, mergeNeoRefinedSections, [{ selectedMethod: "ziwei" }]],
]) {
  for (const section of sections) {
    // 이 챕터만 채우고 나머지는 비운 채 병합 → 이 챕터가 결과에 싣는 실제 분량을 잰다.
    const merged = merge([{ id: section.id, parsed: fillSection(section), ok: true }], ...mergeArgs);
    const chars = countTextChars(merged);
    const required = Math.round(section.minChars * VOLUME_HEADROOM);
    ok(
      chars >= required,
      `${label} ${section.id}: 상한 여유가 없다 — 최대 ${chars}자 < 필요 ${required}자(minChars ${section.minChars} × ${VOLUME_HEADROOM}). `
        + "minChars 를 올렸다면 mergeNeo*Sections 의 해당 필드 상한(또는 .slice 개수)도 같이 올려야 한다.",
    );
  }
}

// ── 4) 잘린 JSON 복구 ─────────────────────────────────────────────────────
const truncatedJson = '{"innateNature":{"title":"타고난 성향의 핵","description":"중심이 단단한 구조다.","keyTraits":["끝까지 밀어붙인다","여기서 잘린';
const salvaged = parseNeoSectionResponse(truncatedJson);
ok(Object.keys(salvaged).length > 0, "잘린 JSON 이 빈 객체로 떨어졌다 — 챕터가 통째로 사라진다");
ok(salvaged?.innateNature?.description === "중심이 단단한 구조다.", "잘린 JSON 에서 완결 필드를 못 건졌다");
ok(parseNeoSectionResponse("설명만 있고 JSON 이 없다") && Object.keys(parseNeoSectionResponse("설명만 있고 JSON 이 없다")).length === 0,
  "JSON 이 아예 없는 응답은 빈 객체여야 한다");

// ── 5) 중복 제거 ──────────────────────────────────────────────────────────
const duplicated = mergeNeoInitialSections([
  { id: "todayOrders", ok: true, parsed: { actionOrders: ["오늘은 연락을 먼저 하지 마라.", "오늘은  연락을 먼저 하지 마라", "지출 한 건을 취소해라."] } },
  { id: "innateCore", ok: true, parsed: { innateNature: { keyTraits: ["끝까지 밀어붙인다.", "끝까지 밀어붙인다.", "쉽게 물러서지 않는다."] } } },
], { selectedMethod: "ziwei" }, {});
ok(duplicated.actionOrders.length === 2, `actionOrders 중복이 안 지워졌다 — ${duplicated.actionOrders.length}개`);
ok(duplicated.innateNature.keyTraits.length === 2, `keyTraits 중복이 안 지워졌다 — ${duplicated.innateNature.keyTraits.length}개`);

// ── 6) 가드가 죽지 않음 ───────────────────────────────────────────────────
for (const [label, results] of [
  ["빈 배열", []],
  ["null 항목", [null, undefined]],
  ["parsed 누락", [{ id: "opening", ok: false }]],
  ["문자열 자리에 객체", [{ id: "opening", ok: true, parsed: { neoOpening: { title: "제목", description: "본문이다." } } }]],
  ["문자열 자리에 배열", [{ id: "todayOrders", ok: true, parsed: { actionOrders: [["중첩", "배열"]] } }]],
]) {
  try {
    const a = mergeNeoInitialSections(results, { selectedMethod: "ziwei" }, {});
    const b = mergeNeoRefinedSections(results, { selectedMethod: "ziwei" });
    let leaked = false;
    walkStrings([a, b], "", (text) => { if (text.includes("[object Object]")) leaked = true; });
    ok(!leaked, `${label}: 병합 결과에 [object Object] 가 남았다`);
  } catch (error) {
    failures.push(`${label}: 병합이 throw 했다 — ${error?.message}`);
  }
}

if (failures.length) {
  console.error("[verify-neo-output-safety] 실패:");
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log(
  `[verify-neo-output-safety] OK — 1차 ${NEO_INITIAL_SECTIONS.length}챕터 / 2차 ${NEO_REFINED_SECTIONS.length}챕터, `
  + "중간 끊김 0 · 말줄임 최후수단 0 · 분량 계약 충족 · 잘린 JSON 복구 · 중복 제거",
);
