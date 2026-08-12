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
import { sliceFunction } from "./lib/js-source-slice.mjs";

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
// verify-pass-recovery-path.mjs 와 **같은 공용 모듈**을 쓴다(예전엔 같은 구현을 각자 복사해 갖고
// 있었고 둘 다 정규식 리터럴을 문자열로 오인했다 — 경위는 모듈 상단 주석).
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
  // 2026-08-11: 떠다니는 CSS 달(moon-crescent)을 걷어내고 상단 골드 헤어라인 + 꽃돼지 안내자로 대체했다.
  // 장식 초점이 둘이면 서로를 깎아먹는다. 마커를 지우지 않고 새 요소로 **교체**해 3렌더러 보호는 유지한다.
  ".cd-direct-payment-hairline",
  ".cd-direct-payment-guide__pig",
  ".cd-direct-payment-go",
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
  // 달 헤더를 대신하는 상단 골드 헤어라인 + 꽃돼지 헤더 행(제목·안내문을 감싸는 copy 래퍼).
  "cd-direct-payment-hairline",
  "cd-direct-payment-guide__copy",
  "cd-direct-payment-cardhead",
  "cd-direct-payment-badge",
  "cd-direct-payment-glyph",
  "cd-direct-payment-amount",
  "cd-direct-payment-moonbal-current",
  "cd-direct-payment-balance-check",
  "cd-direct-payment-legal",
  "cd-direct-payment-recommend",
  "cd-direct-payment-go",
  // 추천 1개(큰 카드) + 보조 2개(컴팩트 행)의 시각 위계. 셋 다 같은 클래스로 그려야
  // 한 렌더러만 '카드 3개가 전부 동등해 보이는' 예전 모습으로 되돌아가는 일이 없다.
  "cd-direct-payment-option--secondary",
  "cd-direct-payment-desc",
  // 결제창 안내자 꽃돼지. 🔴 같은 출처(/public) 자산이어야 한다 — 결제 경로의 교차출처 이미지는
  // PortOne SDK 와 대역폭을 다툰다(verify-portone-single-payment 가 R2 URL 을 따로 막는다).
  "cd-direct-payment-guide",
  "/images/fortune-tea-house/checkout-guide-pig.webp",
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
  // 🔴 이용권 카드는 '상점 바로가기'가 아니라 '이용권으로 열기'(= 이용권 검사 지점)다.
  // 진입 선검사를 없애면서 세 렌더러가 같은 라벨·같은 동작을 갖도록 고정한다.
  "이용권으로 열기",
  "이용권 등급 올리기",
  "꽃돼지 추천",
  // 3옵션 설명 문구 통일. 예전에는 이 문구들이 렌더러마다 미묘하게 달랐고(월정석 설명·단건 설명),
  // 마커가 없어 패리티 검사를 그대로 통과했다.
  // 🔴 소비자에게 PG사(PortOne·KG이니시스)를 노출하지 않는 문구로 2026-08-11 개정됐다.
  "한 번 결제하고 30일 동안 여러 콘텐츠를 열 수 있어요. 이미 있다면 눌러서 바로 확인돼요.",
  "지금 보고 있는 콘텐츠 하나만 바로 열려요.",
  "이미 가지고 있는 월정석으로 열어요. 추가 지출이 없어요.",
  "월정석 잔량을 확인하고 있어요. 그대로 눌러 봐도 괜찮아요.",
];

// 셸은 i18n 헬퍼 경유라 제목이 키+폴백 형태로 들어간다. 셋 다 같은 정본 문구를 써야 한다.
const TITLE_MARKER = "이 콘텐츠를 열어볼까요?";

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

// ── 결제창 문구는 3렌더러가 **같은 i18n 키**로 해결한다 ──────────────────────────────────
// 독립 정적 폴백은 결제창 제목·월정석 카드·잔량 상태 문구를 한국어로 하드코딩하고 있어서,
// /en·/ja·/zh 등 비한국어 사용자에게 결제창만 한국어로 보였다(2026-08-01). 셸이 이미 쓰던 키를
// 그대로 쓰게 하고, 되돌아가지 않도록 키 사용을 강제한다. 키 자체의 12로케일 존재는 아래에서 확인.
const STANDALONE_REQUIRED_KEYS = [
  "payment.directModal.moonTitle",
  // 꽃돼지 말풍선 문구 3종(추천 상태별). moonSubtitle 을 대체했다 — 이제 결제창 소개문은
  // 고정 안내가 아니라 "지금 당신에게 무엇이 가장 나은가"를 말한다.
  "payment.directModal.guide.pass",
  "payment.directModal.guide.direct",
  "payment.directModal.guide.monthly",
  "payment.directModal.recommendBadge",
  // 추천 카드 하단 골드 액션 스트립 문구.
  "payment.directModal.goLabel",
  "payment.directModal.monthlyBadge",
  "payment.directModal.monthlyTitle",
  "payment.directModal.monthlyUnit",
  "payment.directModal.note.basis",
  "payment.directModal.note.withPass",
  // owned/short = 카드에 싣는 '충분/모자람'. 정확한 잔량은 ready(재조회 바)에만 남는다.
  "payment.directModal.monthlyBalance.owned",
  "payment.directModal.monthlyBalance.short",
  "payment.directModal.monthlyBalance.ownedUnknown",
  "payment.directModal.monthlyBalance.ready",
  "payment.directModal.monthlyBalance.checking",
  "payment.directModal.monthlyBalance.refresh",
  "payment.directModal.monthlyBalance.refreshing",
  "payment.directModal.monthlyBalance.signedOut",
  "payment.directModal.monthlyBalance.unconfirmed",
  "payment.directModal.monthlyBalance.staleAfterError",
  "payment.currency.krw",
  "payment.currency.monthlyCredits",
  "common.cancel",
];
for (const rel of STANDALONE_FALLBACKS) {
  const modal = sliceFunction(read(rel), "  function _dpRenderStandalonePaymentChoice(", `${rel}/standalone-modal`);
  for (const key of STANDALONE_REQUIRED_KEYS) {
    assert.ok(
      modal.includes(`'${key}'`),
      `${rel}: 독립 결제창이 ${key} 를 i18n 키로 해결하지 않습니다(한국어 하드코딩 회귀 — 비한국어 로케일에 한글이 노출됩니다)`,
    );
  }
}

const I18N_LOCALES = ["ko", "en", "ja", "zh-cn", "zh-tw", "es", "fr", "de", "nl", "vi", "ms", "hi"];
const readI18nKey = (data, key) => key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), data);
for (const locale of I18N_LOCALES) {
  const data = JSON.parse(read(`public/i18n/${locale}.json`));
  for (const key of STANDALONE_REQUIRED_KEYS) {
    const value = readI18nKey(data, key);
    assert.ok(typeof value === "string" && value.trim(), `public/i18n/${locale}.json: 결제창 문구 키 ${key} 가 없습니다`);
  }
}

// ── CI 트리거 커버리지 ────────────────────────────────────────────────────────
//
// 🔴 검사기가 멀쩡한 것과 검사기가 **실행되는** 것은 다른 문제다. 2026-08-11 까지 정본인
// 셸 인라인 렌더러(index.html + 5미러)만 paid-flow-gates 트리거 목록에서 빠져 있었다.
// 나머지 두 렌더러는 등록돼 있었기 때문에 목록만 훑어서는 정상으로 보였고, 그래서 셸에서
// 이용권 카드를 지우거나 3옵션 문구를 바꿔도 이 스크립트가 아예 호출되지 않았다.
//
// 위에서 실제로 읽는 렌더러 파일은 전부 그 트리거 목록에 있어야 한다. 여기서 강제하지 않으면
// 같은 구멍이 조용히 다시 열린다 — 증상이 "게이트가 초록"이라 아무도 눈치채지 못한다.
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = read(GATE_WORKFLOW)
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*-\s*"([^"]+)"\s*$/)?.[1])
  .filter(Boolean);

/** 글롭(`lib/payment/**`)도 커버로 인정한다. `**` 는 경계를 넘고 `*` 는 한 세그먼트 안에서만 넓힌다. */
function gateCovers(rel) {
  return gatePatterns.some((pattern) => {
    if (pattern === rel) return true;
    if (!pattern.includes("*")) return false;
    const source = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, " ")
      .replace(/\*/g, "[^/]*")
      .replace(/ /g, ".*");
    return new RegExp(`^${source}$`).test(rel);
  });
}

const GATED_RENDERERS = [...SHELL_MIRRORS, REACT_CLIENT, ...STANDALONE_FALLBACKS];
for (const rel of GATED_RENDERERS) {
  assert.ok(
    gateCovers(rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 결제창 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(`[verify-payment-choice-parity] PASS (${RENDERERS.length} renderers, ${CANONICAL_RULES.length} css rules, ${STANDALONE_REQUIRED_KEYS.length} copy keys x ${I18N_LOCALES.length} locales, ${GATED_RENDERERS.length} gate-triggered paths)`);
