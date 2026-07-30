// 결제수단 선택창(달빛 결제 방식 선택) UI 통일 회귀 방지.
//
// 이 서비스에는 결제창 렌더러가 3종 있다 — 정적 셸 인라인(index.html + 5미러), React(app/_lib/billing-client.ts),
// 독립 정적 페이지 폴백(js/destiny-profile.js + public 사본). 과거에는 넷(celestial-harmony 전용 포함)이 서로
// 다른 디자인이었고, 그중 일부는 "달빛 이용권 상점" 카드 자체가 없어 이용권 전환 경로가 끊겼다.
//
// 여기서 강제하는 계약:
//   1) 세 구현 모두 동일한 정본 CSS(index.html의 _cdEnsureDirectPaymentStyles 규칙 배열)를 주입한다.
//   2) 세 구현 모두 동일한 구조 마커(달 헤더/카드헤드/추천 배지/금액 강조/월정석 재조회)를 렌더한다.
//   3) 세 구현 모두 이용권 상점 · 단건 결제 · 월정석 세 옵션을 모두 렌더한다.
//   4) 폐기된 별도 디자인(.cdpc-*, .celestial-pay-*, .cd-react-payment-choice-*)이 되살아나지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const SHELL_MIRRORS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];
const REACT_CLIENT = "app/_lib/billing-client.ts";
const STANDALONE_FALLBACKS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

// ── 함수 본문 슬라이스 (이름 grep이 아니라 중괄호 균형으로 실제 본문을 연다) ──────────────
function sliceFunction(source, startMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: 시작 마커 없음 (${startMarker.trim()})`);
  let depth = 0;
  let inLine = false;
  let inBlock = false;
  let quote = "";
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLine) { if (ch === "\n") inLine = false; continue; }
    if (inBlock) { if (ch === "*" && next === "/") { inBlock = false; i += 1; } continue; }
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") { inLine = true; i += 1; continue; }
    if (ch === "/" && next === "*") { inBlock = true; i += 1; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`${label}: 중괄호 불균형`);
}

// ── 1) 정본 CSS 규칙 집합 ────────────────────────────────────────────────────────────────
// 정본은 셸 인라인. 규칙 배열을 실제로 평가해 문자열 집합으로 비교하므로 따옴표 스타일이나
// 줄바꿈(배열 join vs 템플릿 리터럴) 차이는 무시하고 '적용되는 CSS가 같은가'만 본다.
function canonicalCssRules() {
  const fn = sliceFunction(read("index.html"), "  function _cdEnsureDirectPaymentStyles() {", "index.html/css");
  const arrayStart = fn.indexOf("[");
  const arrayEnd = fn.lastIndexOf("].join(");
  assert.ok(arrayStart >= 0 && arrayEnd > arrayStart, "index.html: CSS 규칙 배열을 찾지 못함");
  const rules = new Function(`return ${fn.slice(arrayStart, arrayEnd + 1)}`)();
  assert.ok(Array.isArray(rules) && rules.length >= 40, `index.html: CSS 규칙 수가 비정상 (${rules.length})`);
  return rules;
}

const CANONICAL_RULES = canonicalCssRules();
const CANONICAL_CSS = CANONICAL_RULES.join("\n");

// 주입된 CSS 텍스트를 규칙 단위로 정규화한다(선언 끝 '}' 뒤에서 자르되 media 블록은 통째로 유지).
function normalizeCssText(text) {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^["']|["'],?$/g, "").trim())
    .filter(Boolean)
    .join("\n");
}

const shellRuleSet = new Set(CANONICAL_RULES);

// React: 템플릿 리터럴 한 덩어리로 주입한다.
{
  const fn = sliceFunction(read(REACT_CLIENT), "function ensureReactPaymentChoiceStyles() {", `${REACT_CLIENT}/css`);
  const open = fn.indexOf("`");
  const close = fn.lastIndexOf("`");
  assert.ok(open >= 0 && close > open, `${REACT_CLIENT}: CSS 템플릿 리터럴을 찾지 못함`);
  const injected = normalizeCssText(fn.slice(open + 1, close));
  assert.equal(
    injected,
    CANONICAL_CSS,
    `${REACT_CLIENT}: 주입 CSS가 정본(index.html _cdEnsureDirectPaymentStyles)과 다릅니다. 정본을 바꿨으면 세 구현을 함께 갱신하세요.`,
  );
}

// 독립 폴백: 셸과 동일한 규칙 배열 형태로 주입한다.
for (const rel of STANDALONE_FALLBACKS) {
  const fn = sliceFunction(read(rel), "  function _dpEnsureStandalonePaymentChoiceStyle() {", `${rel}/css`);
  const arrayStart = fn.indexOf("[");
  const arrayEnd = fn.lastIndexOf("].join(");
  assert.ok(arrayStart >= 0 && arrayEnd > arrayStart, `${rel}: CSS 규칙 배열을 찾지 못함`);
  const rules = new Function(`return ${fn.slice(arrayStart, arrayEnd + 1)}`)();
  assert.deepEqual(
    rules,
    CANONICAL_RULES,
    `${rel}: 주입 CSS가 정본(index.html _cdEnsureDirectPaymentStyles)과 다릅니다.`,
  );
}

// 정본 CSS 자체가 갖춰야 할 규칙(스크린샷 규격의 시각 요소).
for (const needle of [
  ".cd-direct-payment-cardhead",
  ".cd-direct-payment-recommend",
  ".cd-direct-payment-amount",
  ".cd-direct-payment-moonbal-current",
  ".cd-direct-payment-option--recommended",
  ".cd-direct-payment-balance-check",
  ".cd-direct-payment-moon-crescent",
]) {
  assert.ok(CANONICAL_CSS.includes(needle), `정본 CSS에 ${needle} 규칙이 없습니다`);
}
// 배지가 absolute로 돌아가면 카드 제목이 배지 아래로 밀려 옛 레이아웃이 된다.
assert.ok(
  !shellRuleSet.has('.cd-direct-payment-badge{position:absolute;left:14px;top:12px;display:inline-flex;align-items:center;min-height:22px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,242,184,.28);background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(219,234,254,.07));backdrop-filter:blur(8px);font-size:11px;font-weight:900;color:#fff7db;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 18px rgba(250,230,160,.08)}'),
  "정본 CSS: 배지가 absolute 배치로 회귀했습니다(카드헤드 flex 규격이어야 함)",
);
// 상점 카드 규칙은 단건 카드 규칙보다 먼저 선언되어야 한다(verify-paid-gate-ui-regression의 assertBefore 근거).
assert.ok(
  CANONICAL_CSS.indexOf('[data-mode="pass-store"]') < CANONICAL_CSS.indexOf('[data-mode="direct"]'),
  "정본 CSS: pass-store 규칙이 direct 규칙보다 뒤에 선언되었습니다",
);

// ── 2) 구조 마커 · 3옵션 패리티 ──────────────────────────────────────────────────────────
const STRUCTURE_MARKERS = [
  "cd-direct-payment-dialog",
  "cd-direct-payment-moon-header",
  "cd-direct-payment-cardhead",
  "cd-direct-payment-badge",
  "cd-direct-payment-glyph",
  "cd-direct-payment-amount",
  "cd-direct-payment-moonbal-current",
  "cd-direct-payment-balance-check",
  "cd-direct-payment-legal",
  "cd-direct-payment-recommend",
  'data-mode="pass-store"',
  'data-mode="direct"',
  'data-mode="monthly" data-monthly-option',
  'data-mode="monthly-refresh"',
  'data-mode="cancel"',
  "data-monthly-balance-text",
  "data-monthly-current",
  "data-monthly-hint",
  "data-payment-status",
  "월정석 재조회",
  "달빛 이용권 상점",
  "달빛 이용권 업그레이드",
  "추천",
];

// 셸은 i18n 헬퍼 경유라 제목이 키+폴백 형태로 들어간다. 셋 다 같은 정본 문구를 써야 한다.
const TITLE_MARKER = "달빛 결제 방식 선택";

const RENDERERS = [
  ...SHELL_MIRRORS.map((rel) => ({ rel, label: "정적 셸" })),
  { rel: REACT_CLIENT, label: "React" },
  ...STANDALONE_FALLBACKS.map((rel) => ({ rel, label: "독립 폴백" })),
];

for (const renderer of RENDERERS) {
  const source = read(renderer.rel);
  assert.ok(source.includes(TITLE_MARKER), `${renderer.label} ${renderer.rel}: 정본 제목("${TITLE_MARKER}") 없음`);
  for (const marker of STRUCTURE_MARKERS) {
    assert.ok(source.includes(marker), `${renderer.label} ${renderer.rel}: 구조 마커 누락 — ${marker}`);
  }
  // 상점 카드는 결제 처리 없이 이용권 상점으로 보내야 한다(모든 결제창의 이용권 전환 경로).
  assert.ok(
    /__cdOpenChargeModal|openMembershipPassStore/.test(source),
    `${renderer.label} ${renderer.rel}: 이용권 상점 바로가기 경로가 없습니다`,
  );
}

// ── 3) 폐기된 별도 디자인 부활 금지 ──────────────────────────────────────────────────────
const RETIRED = [
  { needle: "cdpc-", why: "구형 독립 폴백 디자인(.cdpc-*)" },
  { needle: "celestial-pay", why: "celestial-harmony 전용 2옵션 결제창(.celestial-pay-*)" },
  // 하이픈 접미까지 봐야 모달 식별용 data 속성(data-cd-react-payment-choice)과 구분된다.
  { needle: "cd-react-payment-choice-", why: "React 전용 결제창 프리픽스(.cd-react-payment-choice-*)" },
];
const RETIRED_SCAN = [
  ...SHELL_MIRRORS,
  REACT_CLIENT,
  ...STANDALONE_FALLBACKS,
  "celestial-harmony.html",
  "public/celestial-harmony.html",
];
for (const rel of RETIRED_SCAN) {
  const source = read(rel);
  for (const retired of RETIRED) {
    assert.ok(!source.includes(retired.needle), `${rel}: ${retired.why}가 되살아났습니다 — 정본 결제창으로 통일하세요`);
  }
}

// celestial-harmony는 정본 폴백(destiny-profile.js)에 위임해야 한다 — 자체 chooser 설치 금지.
for (const rel of ["celestial-harmony.html", "public/celestial-harmony.html"]) {
  const source = read(rel);
  assert.ok(
    !source.includes("window._cdChooseServicePaymentMode ="),
    `${rel}: 페이지 전용 결제창을 다시 설치하고 있습니다(정본 폴백 destiny-profile.js에 위임하세요)`,
  );
  assert.ok(source.includes("/js/destiny-profile.js"), `${rel}: 정본 폴백 런타임을 로드하지 않습니다`);
}

console.log(`[verify-payment-choice-parity] PASS (${RENDERERS.length} renderers, ${CANONICAL_RULES.length} css rules)`);
