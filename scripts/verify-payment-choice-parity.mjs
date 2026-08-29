// 결제수단 선택창(달빛 결제 방식 선택) UI 통일 회귀 방지.
//
// 이 서비스에는 결제창 렌더러가 3종 있다 — 정적 셸 인라인(index.html + 5미러), React(app/_lib/billing-client.ts),
// 독립 정적 페이지 폴백(js/destiny-profile.js + public 사본). 과거에는 넷(celestial-harmony 전용 포함)이 서로
// 다른 디자인이었고, 그중 일부는 "달빛 이용권 상점" 카드 자체가 없어 이용권 전환 경로가 끊겼다.
//
// 여기서 강제하는 계약:
//   1) 세 구현 모두 동일한 정본 CSS(js/core/checkout-entry.js의 PAYMENT_CHOICE_CSS_RULES 배열)를 주입한다.
//   2) 구조 마커가 두 축으로 지켜진다 — 공유 빌더가 뼈대를 방출하는지(실제 렌더로 확인)와
//      각 렌더러 템플릿이 자기 마커를 갖는지(미러 7개 포함 10파일 전수).
//   3) 세 구현 모두 이용권 상점 · 단건 결제 · 월정석 세 옵션을 모두 렌더한다.
//   4) 폐기된 별도 디자인(.cdpc-*, .celestial-pay-*, .cd-react-payment-choice-*)과 자동 조회
//      잔여바 마커가 되살아나지 않는다.
//
// 🔴 2)와 4)는 2026-08-24 까지 **선언만 있고 집행이 없었다**(STRUCTURE_MARKERS ·
// BANNED_BALANCE_MARKERS 배열이 어떤 assert 에도 쓰이지 않았다). 되살리면서 --self-test 를
// 붙였다 — 같은 방식으로 다시 죽으면 그 자기검사가 잡는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sliceFunction } from "./lib/js-source-slice.mjs";
import { assertGlobSelfTest, gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";
import { createRequire } from "node:module";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");
// 카드 뼈대 검사는 소스를 grep 하지 않고 **정본 빌더를 실제로 불러서** 한다(아래 2-a).
// UMD(classic script + module.exports) 라 CJS require 로 가져온다.
const checkoutEntry = createRequire(import.meta.url)(resolve(root, "js/core/checkout-entry.js"));

// 🔴 로케일 셸 미러는 sync:public 이 만드는 4개(en/ja/zh/zh-tw)가 전부다. 2026-08-20 까지 여기에
// zh-tw 만 빠져 있었고, 그 미러도 결제창 함수를 그대로 담고 있으므로 zh-tw 셸만 어긋나도 이 검사가
// 눈치채지 못했다. sync-legacy-static-to-public.mjs 의 localeLandingDirs 가 zh-tw 를 빠뜨려
// public/zh-tw/index.html 이 재생성되지 않던 과거 회귀와 같은 형태의 구멍이다.
const SHELL_MIRRORS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
];
const REACT_CLIENT = "app/_lib/billing-client.ts";
const STANDALONE_FALLBACKS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

// ── 함수 본문 슬라이스 (이름 grep이 아니라 중괄호 균형으로 실제 본문을 연다) ──────────────
// verify-pass-recovery-path.mjs 와 **같은 공용 모듈**을 쓴다(예전엔 같은 구현을 각자 복사해 갖고
// 있었고 둘 다 정규식 리터럴을 문자열로 오인했다 — 경위는 모듈 상단 주석).
// ── 1) 정본 CSS 규칙 집합 ────────────────────────────────────────────────────────────────
// 🔴 2026-08-21: 정본이 셸 인라인 배열에서 js/core/checkout-entry.js 의 PAYMENT_CHOICE_CSS_RULES
// 하나로 옮겨갔다 — 세 렌더러가 각자 배열을 복붙하던 것을 그 배열 하나를 참조하는 것으로 바꿨다.
// 그래서 이제 "값이 같은가"(문자열/딥이퀄 비교)가 아니라 "세 곳 모두 같은 배열을 참조하는가"만
// 확인하면 된다 — 참조 확인만으로 값 동일성이 구조적으로 보장된다.
function canonicalCssRules() {
  const source = read("js/core/checkout-entry.js");
  const match = source.match(/var PAYMENT_CHOICE_CSS_RULES = \[([\s\S]*?)\n {2}\];/);
  assert.ok(match, "checkout-entry.js: PAYMENT_CHOICE_CSS_RULES 배열을 찾지 못함");
  const rules = new Function(`return [${match[1]}]`)();
  assert.ok(Array.isArray(rules) && rules.length >= 40, `checkout-entry.js: CSS 규칙 수가 비정상 (${rules.length})`);
  return rules;
}

const CANONICAL_RULES = canonicalCssRules();
const CANONICAL_CSS = CANONICAL_RULES.join("\n");

const shellRuleSet = new Set(CANONICAL_RULES);

// 세 렌더러(셸/React/독립 폴백×2)가 각자 로컬 배열을 다시 만들지 않고 공유 배열을 참조하는지 확인한다.
for (const [rel, marker] of [
  ["index.html", "  function _cdEnsureDirectPaymentStyles() {"],
  [REACT_CLIENT, "function ensureReactPaymentChoiceStyles() {"],
  ...STANDALONE_FALLBACKS.map((fallbackRel) => [fallbackRel, "  function _dpEnsureStandalonePaymentChoiceStyle() {"]),
]) {
  const fn = sliceFunction(read(rel), marker, `${rel}/css`);
  assert.ok(
    fn.includes("PAYMENT_CHOICE_CSS_RULES"),
    `${rel}: PAYMENT_CHOICE_CSS_RULES 를 참조하지 않습니다 — checkout-entry.js 의 공유 배열 대신 로컬 사본을 쓰고 있을 수 있습니다.`,
  );
}

// 정본 CSS 자체가 갖춰야 할 규칙(스크린샷 규격의 시각 요소).
for (const needle of [
  ".cd-direct-payment-cardhead",
  ".cd-direct-payment-recommend",
  ".cd-direct-payment-amount",
  ".cd-direct-payment-option--recommended",
  // 2026-08-11: 떠다니는 CSS 달(moon-crescent)을 걷어내고 상단 골드 헤어라인 + 꽃돼지 안내자로 대체했다.
  // 장식 초점이 둘이면 서로를 깎아먹는다. 마커를 지우지 않고 새 요소로 **교체**해 3렌더러 보호는 유지한다.
  ".cd-direct-payment-hairline",
  ".cd-direct-payment-guide__pig",
  ".cd-direct-payment-go",
  // 2026-08-13: 월정석 카드 아래 온디맨드 [보유 월정석 확인] 버튼 + 결과 줄.
  ".cd-direct-payment-balance-check",
  ".cd-direct-payment-balance-value",
  // 2026-08-24: 단건결제 2단계(결제수단 고르기) 패널. 1단계 그리드와 클래스를 나눈 이유는
  // verify-checkout-pass-card 가 `.cd-direct-payment-choice-grid [data-mode]` 의 첫 요소를
  // 이용권 카드로 단언하기 때문이다 — 같은 클래스를 재사용하면 2단계 버튼이 거기 끼어든다.
  ".cd-direct-payment-method-grid",
  ".cd-direct-payment-method-back",
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
//
// 🔴 2026-08-24: 이 절이 **죽어 있었다.** 단일 배열 STRUCTURE_MARKERS 가 선언만 되고 어떤
// assert 에도 쓰이지 않았다 — 카드 조립이 buildPaymentChoiceOptionHtml 로 옮겨간 순간 절반의
// 마커가 렌더러 소스에 리터럴로 존재하지 않게 됐고(예: 'data-mode="monthly" data-monthly-option'
// 은 dataMode 와 extraDataAttrs 로 쪼개져 있어 **어느 파일에도 없다**), 그때 검사를 되살리지
// 않은 채 배열만 남았다. 그래서 마커를 지워도 이 가드는 초록이었다.
//
// 되살리면서 축을 둘로 나눈다. 리터럴 grep 이 통하는 것과 안 통하는 것이 실제로 다르기 때문이다:
//   BUILDER  — 공유 빌더가 **만들어 내는** 뼈대. 소스에 리터럴로 없으므로 실제로 렌더해서 본다.
//   RENDERER — 각 렌더러가 **자기 다이얼로그 템플릿에** 직접 쓰는 것. 10개 파일 전수로 본다.
//
// 이 절의 고유 가치는 커버 범위다: 실행 하네스는 독립 정적 렌더러 하나만 띄울 수 있고
// (verify-checkout-pass-card), verify-paid-gate-ui 는 원본 3파일만 문자열로 본다. 미러 7개는
// 어느 쪽도 열지 않는다 — zh-tw 미러만 어긋나도 눈치채지 못했던 과거가 그 형태다(위 주석).

// 공유 빌더(js/core/checkout-entry.js)가 반드시 방출해야 하는 뼈대.
// 🔴 값이 아니라 **구조**만 본다. 문구·금액은 §4 의 i18n 키 단언이 소유한다.
const BUILDER_MARKERS = [
  "cd-direct-payment-cardhead",
  "cd-direct-payment-badge",
  "cd-direct-payment-glyph",
  "cd-direct-payment-recommend",
  "cd-direct-payment-go",
  // 추천 1개(큰 카드) + 보조 2개(컴팩트 행)의 시각 위계. 한 렌더러만 '카드 3개가 전부
  // 동등해 보이는' 예전 모습으로 되돌아가는 일이 없어야 한다.
  "cd-direct-payment-option--recommended",
  "cd-direct-payment-option--secondary",
  "cd-direct-payment-desc",
  'data-mode="pass-store"',
  'data-mode="direct"',
  // 🔴 쪼개진 마커의 재조립. dataMode + extraDataAttrs 가 이 순서로 붙어야 하고,
  // 이건 소스 grep 으로는 절대 볼 수 없다(그래서 옛 배열이 조용히 죽었다).
  'data-mode="monthly" data-monthly-option',
  "data-monthly-hint",
  // 단건결제 2단계(결제수단 고르기). data-mode 가 **아닌** 훅이어야 한다 —
  // [data-mode] 는 "고르면 모달을 닫는" 노드다(붙이면 수단 선택이 창을 닫는다).
  "cd-direct-payment-method-grid",
  "cd-direct-payment-method-back",
  'data-pay-method="CARD"',
  'data-pay-step="back"',
];

// 각 렌더러가 자기 다이얼로그 템플릿에 직접 쓰는 것. 10개 파일 전수(미러 포함)로 본다.
const RENDERER_MARKERS = [
  "cd-direct-payment-dialog",
  // 달 헤더를 대신하는 상단 골드 헤어라인 + 꽃돼지 헤더 행(제목·안내문을 감싸는 copy 래퍼).
  "cd-direct-payment-hairline",
  "cd-direct-payment-guide",
  "cd-direct-payment-guide__copy",
  // 결제창 안내자 꽃돼지. 🔴 같은 출처(/public) 자산이어야 한다 — 결제 경로의 교차출처 이미지는
  // PortOne SDK 와 대역폭을 다툰다(verify-portone-single-payment 가 R2 URL 을 따로 막는다).
  "/icons/app-logo-176.webp",
  // 금액 강조는 호출부가 titleHtml 에 조립해 넘긴다 — 빌더가 아니라 렌더러 소유다.
  "cd-direct-payment-amount",
  "cd-direct-payment-legal",
  'data-mode="cancel"',
  "data-payment-status",
  // 2026-08-13: 월정석 카드 아래 온디맨드 확인 버튼 + 결과 줄. 세 렌더러가 같은 훅을 써야
  // paid-gate-ui 의 "열 때는 조회 0회, 버튼 뒤에서만 조회" 단언이 세 곳 모두에 걸린다.
  "cd-direct-payment-balance-check",
  "data-monthly-balance-check",
  "data-monthly-balance-text",
  // 2026-08-24: 1단계↔2단계는 노드 교체가 아니라 hidden 토글이다. 두 단계 래퍼가 모두 있어야
  // [뒤로] 복귀가 원래 카드를 잃지 않는다.
  'data-choice-step="options"',
  'data-choice-step="methods"',
];
// 🔴 2026-08-20: 이 배열에 있던 한국어 리터럴 7건("이용권으로 열기" · "이용권 등급 올리기" ·
// "꽃돼지 추천" · 3옵션 설명 3건 · 월정석 잔량 안내)을 **키 단언으로 옮겼다**(아래 §4).
// 그 리터럴들은 정확히 passBuyTitle · passUpgradeTitle · recommendBadge · passHint.store ·
// directHint · monthlyHint.use · monthlyHint.checking 의 ko 값이라 커버리지 손실이 없고,
// 대신 "세 렌더러가 같은 **문구**를 하드코딩했는가"에서 "세 렌더러가 같은 **키**를 쓰고
// 그 키의 ko 값이 사전과 일치하는가"로 판정 축이 바뀐다.
//
// 리터럴로 재발견한 실제 결함: `monthlyHint.checking` 은 세 렌더러의 폴백이 2026-08-12 개정
// 문구인데 public/i18n/*.json 12개는 개정 **이전** 문구를 담고 있었다. ko 사용자는 폴백을
// 보므로 멀쩡했고(cdTranslate 는 ko 일 때 사전을 무시한다), 비한국어 사용자만 "잔량을
// 확인하고 있어요"— 이제는 일어나지 않는 자동 조회 —를 계속 봤다. 리터럴 단언은 이 어긋남을
// 구조적으로 볼 수 없다. 아래 §4 의 "폴백 == ko.json" 단언이 그 자리를 대신한다.

// 🔴 결제창은 **열릴 때** 월정석 잔량을 조회하지 않는다(2026-08-12). /api/billing/balance 왕복이 간헐
// 503·22초 타임아웃과 "잔량 확인 중" 고착의 원인이었고, 월정석을 고르면 서버 coin-gate 가 어차피 같은
// 왕복 안에서 확인+차감한다. 그 금지는 그대로다.
//
// 2026-08-13 개정: 사용자가 **직접 누르는** [보유 월정석 확인] 버튼은 허용한다. 모달 열림을 막지 않고,
// 실패해도 사용자가 누른 결과라 원인이 분명하며, 월정석 카드의 활성 상태를 건드리지 않기 때문이다.
// 아래 목록에 남은 것은 **자동 조회 시절의 잔여바** 형태다 — 이게 돌아오면 열 때의 왕복도 함께 돌아온다.
// `data-mode="monthly-refresh"` 는 특히 금지 유지: 세 렌더러 모두 [data-mode] 를 "고르면 모달을 닫는"
// 노드로 일괄 처리하므로, 확인 버튼에 그 값을 주면 누를 때 결제창이 닫힌다.
//
// 🔴 이 배열도 2026-08-24 까지 선언만 되고 쓰이지 않았다. verify-paid-gate-ui 가 앞의 두 개를
// 원본 3파일에서 막고 있었지만 `data-monthly-current` 는 아무도 안 봤고, 미러 7개는 어느
// 가드도 열지 않았다. 아래에서 10개 렌더러 + 공유 코어 전수로 집행한다.
const BANNED_BALANCE_MARKERS = [
  "cd-direct-payment-moonbal-current",
  'data-mode="monthly-refresh"',
  "data-monthly-current",
];

const RENDERERS = [
  ...SHELL_MIRRORS.map((rel) => ({ rel, label: "정적 셸" })),
  { rel: REACT_CLIENT, label: "React" },
  ...STANDALONE_FALLBACKS.map((rel) => ({ rel, label: "독립 폴백" })),
];

// ── 2-a) 공유 빌더가 뼈대를 실제로 방출하는가 ────────────────────────────────────────
//
// 🔴 소스를 grep 하지 않고 **렌더해서** 본다. 카드 마크업이 빌더 안으로 들어간 뒤로는
// 리터럴 검사가 성립하지 않는다(옛 STRUCTURE_MARKERS 가 죽은 이유 그대로).
//
// 아래 spec 은 세 렌더러가 넘기는 것의 **구조만** 재현한 픽스처다 — 문구·금액은 넣지 않는다
// (그 정합성은 §4 의 키 단언이 소유한다). 그래서 이 검사가 고정하는 것은 "빌더가 배지·추천
// 리본·go 스트립·variant 클래스·data 훅을 붙이는가" 하나다.
const renderedSkeleton = (() => {
  const escape = (value) => String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const card = (dataMode, extra) => Object.assign({
    allow: true, dataMode, glyph: "*", badgeLabel: "badge", titleHtml: "title", descHtml: "desc",
  }, extra || {});
  return checkoutEntry.buildPaymentChoiceCardsHtml({
    order: ["pass", "direct", "monthly"],
    recommendedOption: "pass",
    escape,
    recommendLabel: "recommend",
    goLabel: "go",
    cards: {
      pass: card("pass-store", { extraClass: " is-store" }),
      direct: card("direct"),
      // 렌더러 셋이 실제로 넘기는 형태 그대로 — 이 두 조각이 붙어야 쪼개진 마커가 재조립된다.
      monthly: card("monthly", { extraDataAttrs: " data-monthly-option", descAttr: " data-monthly-hint" }),
    },
  }) + checkoutEntry.buildDirectPayMethodStepHtml({ escape });
})();
/**
 * 마커 전수 검사. 🔴 순수 함수로 둔 이유는 --self-test 가 **디스크를 건드리지 않고** 이 판정을
 * 검증할 수 있어야 하기 때문이다. 파일을 깨뜨려 보는 음성 테스트를 CI 에 두면 중간에 죽었을 때
 * 작업 트리가 오염된 채 남는다.
 *
 * 알려진 한계: 부분문자열 판정이라 마커를 **더 긴 이름으로** 바꾸면(예: data-payment-status →
 * data-payment-status-v2) 통과한다. 이름을 늘리는 변경은 CSS 정본·렌더러가 함께 깨지므로 다른
 * 단언에 걸리고, 여기서 정규식으로 조이면 정상적인 속성 조합까지 오탐한다.
 */
function assertMarkersPresent(label, text, markers, hint) {
  for (const marker of markers) {
    assert.ok(text.includes(marker), `${label}: ${hint} ${marker} 가 없습니다.`);
  }
}

/** 폐기된 자동 조회 잔여바 마커가 되살아나지 않았는지. 되살아나면 열 때의 왕복도 함께 온다. */
function assertNoBannedMarkers(label, text) {
  for (const banned of BANNED_BALANCE_MARKERS) {
    assert.ok(
      !text.includes(banned),
      `${label}: 폐기된 잔량 마커 ${banned} 가 되살아났습니다(열 때 자동 조회 금지).`,
    );
  }
}

assertMarkersPresent(
  "js/core/checkout-entry.js",
  renderedSkeleton,
  BUILDER_MARKERS,
  "공유 빌더가 방출해야 하는 뼈대",
);

// ── 2-b) 각 렌더러 템플릿의 구조 마커 (미러 7개 포함 전수) ──────────────────────────
for (const { rel, label } of RENDERERS) {
  const source = read(rel);
  assertMarkersPresent(`${label} ${rel}`, source, RENDERER_MARKERS, "결제창 구조 마커");
  assertNoBannedMarkers(`${label} ${rel}`, source);
}
assertNoBannedMarkers("js/core/checkout-entry.js", read("js/core/checkout-entry.js"));

// 🔴 단건결제 2단계(결제수단) 패널도 정본은 하나다 — js/core/checkout-entry.js 의
// buildDirectPayMethodStepHtml. 렌더러가 각자 마크업을 손으로 그리면 PG 승인이 떨어졌을 때
// 한 렌더러만 '준비 중' 목록이 낡은 채 남는다(CSS 배열이 정확히 그 이유로 공유로 옮겨졌다).
// 마커 리터럴이 아니라 **참조**를 보는 이유도 같다: 마크업이 빌더 안으로 들어가는 순간
// 리터럴 검사는 조용히 무력해진다(이 파일의 STRUCTURE_MARKERS 가 그렇게 죽어 있다).
for (const { rel, label } of RENDERERS) {
  assert.ok(
    read(rel).includes("buildDirectPayMethodStepHtml"),
    `${label} ${rel}: 결제수단 2단계 패널을 공유 빌더(buildDirectPayMethodStepHtml)에 위임하지 않습니다.`,
  );
}

// 세 렌더러가 **모두** 써야 하는 키. 조건 분기와 무관하게 항상 렌더되는 문구다.
const REQUIRED_ALL = [
  // 결제창 제목·취소. 2026-08-20 에 React 가 ko 전용 표(BILLING_CLIENT_TEXT_TRANSLATIONS)를
  // 버리고 이 키를 채택하면서 세 렌더러 공통이 됐다.
  "payment.directModal.moonTitle",
  "common.cancel",
  // 호출부가 제목을 주지 않았을 때 뜨는 기본 제목. 2026-08-20 이전에는 세 렌더러가 각자
  // 한국어 리터럴로 들고 있었다.
  "payment.directModal.defaultTitle",
  // 청약철회 고지. 독립 폴백만 자체 표(_dpText)에 **다른 주장**을 담고 있었다 —
  // "환불이 불가능합니다"(절대 단정) vs 셸·React 의 "청약철회가 제한될 수 있습니다".
  // 게다가 그 표는 5개 언어뿐이라 나머지 7개 로케일은 영어 원문을 봤다.
  "payment.directModal.legal.provisionTiming",
  // 꽃돼지 말풍선 문구 3종(추천 상태별). moonSubtitle 을 대체했다 — 이제 결제창 소개문은
  // 고정 안내가 아니라 "지금 당신에게 무엇이 가장 나은가"를 말한다.
  "payment.directModal.guide.pass",
  "payment.directModal.guide.direct",
  "payment.directModal.guide.monthly",
  "payment.directModal.recommendBadge",
  // 추천 카드 하단 골드 액션 스트립 문구.
  "payment.directModal.goLabel",
  // 이용권 카드 — '상점 바로가기'가 아니라 '이용권으로 열기'(= 이용권 검사 지점)다.
  "payment.directModal.passBadge",
  "payment.directModal.passBuyTitle",
  "payment.directModal.passUpgradeTitle",
  "payment.directModal.passHint.store",
  "payment.directModal.passHint.upgrade",
  "payment.directModal.passCheckRetry",
  // 단건 카드. 🔴 소비자에게 PG사(PortOne·KG이니시스)를 노출하지 않는 문구로 2026-08-11 개정됐다.
  "payment.directModal.directTitleLabel",
  "payment.directModal.directHint",
  "payment.directModal.directHintApp",
  "payment.directModal.pgBadge",
  "payment.directModal.pgBadgeApp",
  // 월정석 카드.
  "payment.directModal.monthlyBadge",
  "payment.directModal.monthlyTitle",
  "payment.directModal.monthlyUnit",
  "payment.directModal.monthlyHint.use",
  "payment.directModal.monthlyHint.checking",
  "payment.directModal.monthlyHint.insufficient",
  "payment.directModal.currentMonthly",
  // 잔량 문구 키(monthlyBalance.*)는 2026-08-12 에 자동 조회와 함께 사라졌다가, 2026-08-13 에
  // **온디맨드 확인 버튼** 용도로 돌아왔다. 열 때가 아니라 누를 때만 쓰이는 문구다.
  "payment.directModal.monthlyBalance.checkButton",
  "payment.directModal.monthlyBalance.recheckButton",
  "payment.directModal.monthlyBalance.checking",
  "payment.directModal.monthlyBalance.error",
  "payment.directModal.monthlyBalance.signedOut",
  // 하단 안내.
  "payment.directModal.note.basis",
  "payment.directModal.note.withPass",
];

// 렌더러마다 다른 분기를 갖고 있어 그쪽에만 등장하는 키.
// 🔴 이 표는 **줄어드는 방향으로만** 바뀐다. 여기 있는 키가 REQUIRED_ALL 로 올라가면
//    세 렌더러가 같은 문구를 쓰게 됐다는 뜻이고, 반대로 새 키가 여기 늘면 렌더러가
//    다시 갈라지고 있다는 뜻이다.
const RENDERER_EXTRA_KEYS = {
  shell: [
    // 셸만 갖는 "단건만 가능" 분기(이용권 결제가 불가능한 D유형 등)와 이용권 검사 진행 상태.
    "payment.directModal.subtitle.directOnly",
    "payment.directModal.note.directOnly",
    "payment.directModal.passChecking",
    "payment.directModal.passMissGoStore",
    // 셸만 갖는 결제창 상태 문구 3종. React 는 자체 토스트 표(billingClient.message.*)를,
    // 독립 폴백은 이 분기 자체를 갖고 있지 않다.
    "payment.directModal.passApplyFailed",
    "payment.directModal.monthlyInsufficient",
    "payment.directModal.monthlyUnknown",
  ],
  react: [
    // React 만 호출부에서 월정석 잔량 스냅샷을 받아 "사용 후 남는 양"을 말할 수 있다.
    "payment.directModal.monthlyHint.after",
    // 음원 결제는 React 경로에만 있다(셸·독립은 music-track 결제를 열지 않는다).
    "payment.directModal.musicTrackSub",
    // 월정석 카드에 aria-label 을 붙이는 것도 React 뿐이다.
    "payment.directModal.monthlyAria.insufficient",
    "payment.directModal.monthlyAria.unknown",
  ],
  // 🔴 비어 있는 것이 목표 상태다 — 독립 폴백이 결제창에서 쓰는 키가 나머지 둘의 부분집합이라는 뜻.
  standalone: [],
};

// 각 렌더러의 결제창 함수 본문과, 그 안에서 i18n 을 부르는 래퍼 이름.
// 래퍼는 셋 다 다르지만(셸 _cdPaymentI18n / React checkoutEntry.text / 독립 _dpCheckoutText)
// 셋 다 js/core/checkout-entry.js 의 checkoutText 와 같은 (key, fallback, vars) 시그니처다.
const KEYED_RENDERERS = [
  ...SHELL_MIRRORS.map((rel) => ({
    rel,
    label: "정적 셸",
    marker: "  async function _cdChooseServicePaymentMode(options) {",
    wrapper: "_cdPaymentI18n",
    extra: RENDERER_EXTRA_KEYS.shell,
    hardcodedLocaleCeiling: 0,
  })),
  {
    rel: REACT_CLIENT,
    label: "React",
    marker: "async function openReactPaymentChoiceModalInner(",
    wrapper: "checkoutEntry\\.text",
    extra: RENDERER_EXTRA_KEYS.react,
    hardcodedLocaleCeiling: 0,
  },
  ...STANDALONE_FALLBACKS.map((rel) => ({
    rel,
    label: "독립 폴백",
    marker: "  function _dpRenderStandalonePaymentChoice(",
    wrapper: "_dpCheckoutText",
    extra: RENDERER_EXTRA_KEYS.standalone,
    hardcodedLocaleCeiling: 0,
  })),
];

/**
 * `wrapper('key', 'fallback', …)` 호출을 전부 뽑아 key → ko 폴백 맵으로 돌려준다.
 *
 * 🔴 같은 키가 한 본문에 두 번 나오면 **뒤엣것이 이긴다.** 앞선 폴백이 갈라져도 여기서는
 *    보이지 않는다 — 그 판정은 verify-payment-copy-dictionary 의 '같은 키에 서로 다른 ko
 *    폴백' 검사가 소유하며 같은 게이트에서 함께 돈다. 여기에 같은 검사를 또 두지 말 것.
 */
function extractKeyedCopy(body, wrapper) {
  const pattern = new RegExp(
    `${wrapper}\\(\\s*(["'])(.*?)\\1\\s*,\\s*(["'])((?:\\\\.|(?!\\3).)*)\\3`,
    "g",
  );
  const found = new Map();
  let match;
  while ((match = pattern.exec(body))) found.set(match[2], unescapeJsString(match[4]));
  return found;
}

// 🔴 소스에서 읽은 것은 **문자열 리터럴의 표기**이고 사전에 든 것은 **값**이다. 풀지 않으면
// 폴백에 `\n` 이나 U+00A0 를 쓰는 순간 같은 문구인데도 다르다고 실패한다 — 결제 오버레이
// 본문 4개와 로그아웃/나가기 라벨이 정확히 그 형태다.
function unescapeJsString(raw) {
  const SHORT = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0" };
  return raw.replace(
    /\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([nrtbfv0])|(.))/g,
    (_, uBrace, u4, x2, short, other) => {
      if (uBrace) return String.fromCodePoint(parseInt(uBrace, 16));
      if (u4) return String.fromCharCode(parseInt(u4, 16));
      if (x2) return String.fromCharCode(parseInt(x2, 16));
      if (short) return SHORT[short];
      return other;
    },
  );
}

const KO_DICTIONARY = JSON.parse(read("public/i18n/ko.json"));
const readI18nKey = (data, key) => key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), data);

const usedKeys = new Set();
for (const renderer of KEYED_RENDERERS) {
  const body = sliceFunction(read(renderer.rel), renderer.marker, `${renderer.rel}/payment-choice`);
  const copy = extractKeyedCopy(body, renderer.wrapper);
  const expected = [...REQUIRED_ALL, ...renderer.extra].sort();

  // 🔴 문구만 사전으로 옮기고 숫자를 `toLocaleString("ko-KR")` 로 굳혀 두면 영어 화면에
  //    한국식 자릿수와 통화가 그대로 남는다 — 번역이 끝난 것처럼 보이는데 금액만 한국어인
  //    상태다. 로케일 정본은 js/core/checkout-entry.js 의 displayLocale() 하나다.
  const hardcodedLocales = (body.match(/["']ko-KR["']/g) || []).length;
  assert.ok(
    hardcodedLocales <= renderer.hardcodedLocaleCeiling,
    `${renderer.label} ${renderer.rel}: 결제창 본문에 굳은 "ko-KR" 이 ${hardcodedLocales}곳입니다`
      + ` (상한 ${renderer.hardcodedLocaleCeiling}). checkoutEntry.displayLocale() 를 쓰세요.`,
  );


  assert.deepEqual(
    [...copy.keys()].sort(),
    expected,
    `${renderer.label} ${renderer.rel}: 결제창 i18n 키 집합이 계약과 다릅니다.\n`
      + `  누락: ${expected.filter((key) => !copy.has(key)).join(", ") || "(없음)"}\n`
      + `  초과: ${[...copy.keys()].filter((key) => !expected.includes(key)).join(", ") || "(없음)"}\n`
      + `  키를 새로 쓴다면 REQUIRED_ALL(세 렌더러 공통) 또는 RENDERER_EXTRA_KEYS(분기 전용) 에 등록하세요.`,
  );

  for (const [key, fallback] of copy) {
    usedKeys.add(key);
    const koValue = readI18nKey(KO_DICTIONARY, key);
    assert.equal(
      fallback,
      koValue,
      `${renderer.label} ${renderer.rel}: ${key} 의 ko 폴백이 public/i18n/ko.json 과 다릅니다.\n`
        + `  코드   : ${JSON.stringify(fallback)}\n`
        + `  ko.json: ${JSON.stringify(koValue)}\n`
        + `  cdTranslate 는 ko 일 때 사전을 보지 않으므로, 어긋나면 한국어 사용자만 새 문구를 보고\n`
        + `  나머지 11개 로케일은 옛 문구의 번역을 계속 봅니다. 사전 값을 함께 갱신하세요.`,
    );
  }
}

// 🔴 결제창 문구가 렌더러 본문에만 있는 시대는 끝났다 — 2단계 결제수단 문구는 세 렌더러가
// 공유하는 js/core/checkout-entry.js 안에서 checkoutText() 로 조회된다. 위 루프는 렌더러
// 함수 본문만 훑으므로 그 키들은 **어느 가드에도 안 잡힌다**. 여기서 같은 계약(집합 고정 +
// ko 폴백 == ko.json + 12로케일)을 코어에도 건다.
const CORE_METHOD_KEYS = [
  "payment.directModal.method.prompt",
  "payment.directModal.method.card",
  "payment.directModal.method.transfer",
  "payment.directModal.method.mobile",
  "payment.directModal.method.giftCultureland",
  "payment.directModal.method.giftBooknlife",
  "payment.directModal.method.giftSmartMunsang",
  "payment.directModal.method.comingSoon",
  "payment.directModal.method.back",
];
const coreCopy = extractKeyedCopy(read("js/core/checkout-entry.js"), "checkoutText");
assert.deepEqual(
  [...coreCopy.keys()].filter((key) => key.startsWith("payment.directModal.method.")).sort(),
  [...CORE_METHOD_KEYS].sort(),
  "js/core/checkout-entry.js: 결제수단 2단계 문구 키 집합이 계약과 다릅니다."
    + " 키를 늘렸다면 CORE_METHOD_KEYS 에도 등록하세요(12로케일 검사가 그 목록을 탑니다).",
);
for (const [key, fallback] of coreCopy) {
  usedKeys.add(key);
  assert.equal(
    fallback,
    readI18nKey(KO_DICTIONARY, key),
    `js/core/checkout-entry.js: ${key} 의 ko 폴백이 public/i18n/ko.json 과 다릅니다.`,
  );
}

// 쓰이는 키는 12개 런타임 로케일 전부에 값이 있어야 한다. 하나라도 비면 그 로케일 사용자는
// 결제창에서 "Translation pending"(js/cd-lang-native.js missingText)을 보게 된다.
const I18N_LOCALES = ["ko", "en", "ja", "zh-cn", "zh-tw", "es", "fr", "de", "nl", "vi", "ms", "hi"];
const REQUIRED_I18N_KEYS = [...usedKeys].sort();
for (const locale of I18N_LOCALES) {
  const data = JSON.parse(read(`public/i18n/${locale}.json`));
  for (const key of REQUIRED_I18N_KEYS) {
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
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));

// 🔴 글롭 판정은 scripts/lib/gate-trigger-coverage.mjs 하나다. 예전에는 이 파일과
// verify-payment-copy-dictionary.mjs 가 같은 변환을 각자 복사해 갖고 있었고, 이쪽 사본은
// `**` 센티널로 **리터럴 NUL 바이트**를 썼다 — 실행은 됐지만 git 이 이 파일을 바이너리로
// 취급해 diff 가 리뷰에서 사라졌다(grep 도 -a 없이는 안 먹었다). 공용 모듈은 센티널 없는
// 단일 패스라 그 문제 자체가 없다.
assertGlobSelfTest(assert);
const gateCovers = (rel) => gateCoversAny(gatePatterns, rel);

// ── 결제 런타임 캐시 핀 ────────────────────────────────────────────────────────────────
//
// 🔴 `sync:public` 은 index.html 계열만 다시 쓴다. 독립 정적 페이지(celestial-harmony.html 등)의
//    `?v=build-…` 는 **손으로 유지하는 값**이고, `_headers` 의 `/js/*.js` 는 max-age=604800 +
//    stale-while-revalidate=2592000 이다 — 핀을 안 돌리면 결제 런타임 수정이 최대 7일(SWR 30일)
//    동안 도달하지 않는다. 실제로 두 번 낡았고(sync-legacy-static-to-public.mjs 머리주석),
//    2026-08-20 의 checkout-entry.js 변경도 핀이 그대로인 채 나갔다.
//
// 손으로 쓴 대상 목록은 가드가 아니므로(원칙 10) 참조 파일은 git ls-files 에서 전수 발견하고,
// 기대값은 대상 파일 **내용**에서 유도한다. 통과하는 핀은 둘뿐이다:
//   ① index.html 이 지금 들고 있는 값 — sync 가 관리하는 자리(같은 값이면 어느 파일이든 허용)
//   ② derivePinKey() 가 유도한 콘텐츠 키 — 손으로 유지하는 자리
// 🔴 `build-` 접두 핀만 본다. app/layout.js 는 2026-08-20 에 이름 있는 핀(`20260804-core-runtime-v1`)
//    을 쓰다가 이 검사 밖에 있었고, 그래서 checkout-entry.js 가 바뀌어도 아무도 안 잡았다.
//    같은 유도 키로 옮겨 검사 안으로 들여놨다 — 새로 이름 핀을 쓰면 다시 사각지대가 된다.
const PIN_GROUPS = [
  { label: "독립 결제 런타임", assets: ["js/destiny-profile.js"] },
  // 이 둘은 한 핀을 함께 쓴다. 갈라지면 아래 '핀이 갈라졌습니다' 로 잡힌다.
  { label: "core 런타임", assets: ["js/core/checkout-entry.js", "js/core/pass-verdict.js"] },
];

const normalizeForPin = (text) => text.replace(/\?v=[a-zA-Z0-9_-]+/g, "?v=__CACHE_KEY__").replace(/\r\n/g, "\n");
function derivePinKey(assets) {
  const hash = createHash("sha1");
  for (const rel of assets) {
    hash.update(rel);
    hash.update("\n");
    hash.update(normalizeForPin(read(rel)));
    hash.update("\n---\n");
  }
  return `build-${hash.digest("hex").slice(0, 12)}`;
}

const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((rel) => /\.(html|ts|tsx|js|mjs)$/.test(rel));
assert.ok(
  trackedFiles.length > 100,
  `git ls-files 가 ${trackedFiles.length}개만 돌려줬습니다 — 핀 검사가 대상 없이 통과할 뻔했습니다.`,
);

function collectPins(asset) {
  const found = [];
  const re = new RegExp(`${asset.replace(/[.\/]/g, "\\$&")}\\?v=(build-[A-Za-z0-9_-]+)`, "g");
  for (const rel of trackedFiles) {
    const raw = read(rel);
    if (!raw.includes(asset)) continue;
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(raw))) found.push({ pin: match[1], rel });
  }
  return found;
}

for (const group of PIN_GROUPS) {
  const expected = derivePinKey(group.assets);
  const all = group.assets.flatMap((asset) => collectPins(asset));
  assert.ok(all.length > 0, `${group.label}: ${group.assets.join(" + ")} 를 ?v= 로 참조하는 곳을 찾지 못했습니다.`);
  // sync 가 관리하는 값 = index.html 계열이 들고 있는 값. 파일명 목록이 아니라 **값**으로 가른다.
  const syncManaged = new Set(all.filter((h) => /(^|\/)index\.html$/.test(h.rel)).map((h) => h.pin));
  const handMaintained = all.filter((h) => !syncManaged.has(h.pin));
  const stale = [...new Map(handMaintained.filter((h) => h.pin !== expected).map((h) => [h.pin, h.rel]))];
  assert.equal(
    stale.length,
    0,
    `${group.label} 캐시 핀이 낡았습니다: ${stale.map(([pin, rel]) => `${pin} (예: ${rel})`).join(", ")}\n`
      + `  기대: ${expected}  ← ${group.assets.join(" + ")} 내용에서 유도\n`
      + `  독립 정적 페이지의 ?v= 는 sync:public 이 돌리지 않습니다. 그 핀 전부를 위 값으로 바꾸세요.\n`
      + `  안 바꾸면 _headers 의 /js/*.js (max-age 7일 · SWR 30일) 때문에 이 변경이 도달하지 않습니다.`,
  );
  const distinct = new Set(handMaintained.map((h) => h.pin));
  assert.ok(
    distinct.size <= 1,
    `${group.label} 핀이 갈라졌습니다: ${[...distinct].join(", ")} — 한 그룹은 한 값이어야 합니다.`,
  );
}

// 🔴 렌더러 파일만이 아니라 **이 스크립트가 열어서 단언하는 파일 전부**가 트리거에 있어야 한다.
// 2026-08-20 부터 결제창 문구의 12로케일 값을 public/i18n/*.json 에서 직접 읽으므로, 사전만
// 바꾼 PR 에서도 이 게이트가 깨어나야 한다. 넣지 않으면 결제창 문구를 사전에서 지워도 게이트가
// 초록인 채로 통과한다 — 위 주석이 경고하는 것과 정확히 같은 형태의 구멍이다.
const GATED_PATHS = [
  ...SHELL_MIRRORS,
  REACT_CLIENT,
  ...STANDALONE_FALLBACKS,
  // 캐시 핀의 기대값을 유도하는 원본. 이 파일들이 바뀔 때 게이트가 안 깨어나면
  // 핀이 낡은 채로 머지된다 — 위 핀 검사가 정확히 그 사고를 막으려는 것이다.
  ...PIN_GROUPS.flatMap((group) => group.assets),
  ...I18N_LOCALES.map((locale) => `public/i18n/${locale}.json`),
];
for (const rel of GATED_PATHS) {
  assert.ok(
    gateCovers(rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 결제창 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

// ── 자기검사 ────────────────────────────────────────────────────────────────────────
//
// 🔴 이 가드의 구조 마커 절은 2026-08-24 까지 **배열만 남고 집행이 사라진 상태**였다. 그게
// 조용했던 이유는 "검사가 통과했다"와 "검사가 없다"가 출력에서 구분되지 않았기 때문이다.
// 그래서 두 가지를 넣는다: ① 아래 요약에 마커 개수를 찍는다 ② --self-test 로 판정 자체가
// 정말 실패하는지 확인한다. 파일을 깨뜨리지 않고 합성 입력만 쓴다.
if (process.argv.includes("--self-test")) {
  const shouldThrow = (label, fn) => {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(`self-test: ${label} — 깨진 입력인데 판정이 통과했습니다`);
  };
  // 뼈대가 하나라도 빠지면 실패해야 한다.
  shouldThrow("빌더 마커 누락", () =>
    assertMarkersPresent("fixture", renderedSkeleton.split("cd-direct-payment-cardhead").join("x"), BUILDER_MARKERS, "h"));
  // 쪼개진 마커: dataMode 와 extraDataAttrs 사이에 무언가 끼면 재조립이 깨진다.
  shouldThrow("쪼개진 monthly 마커 순서", () =>
    assertMarkersPresent("fixture", renderedSkeleton.split('data-mode="monthly" data-monthly-option').join('data-monthly-option data-mode="monthly"'), BUILDER_MARKERS, "h"));
  // 렌더러 템플릿 마커가 빠지면 실패해야 한다(미러 한 곳만 어긋나는 형태).
  shouldThrow("렌더러 마커 누락", () =>
    assertMarkersPresent("fixture", read("public/zh-tw/index.html").split("data-payment-status").join("data-payment-STATE"), RENDERER_MARKERS, "h"));
  // 폐기 마커가 되살아나면 실패해야 한다.
  for (const banned of BANNED_BALANCE_MARKERS) {
    shouldThrow(`폐기 마커 ${banned}`, () => assertNoBannedMarkers("fixture", `<div>${banned}</div>`));
  }
  // 정상 입력은 통과해야 한다(가드가 무조건 던지면 그것도 가드가 아니다).
  assertMarkersPresent("fixture", renderedSkeleton, BUILDER_MARKERS, "h");
  assertNoBannedMarkers("fixture", "<div>clean</div>");
  console.log(`[verify-payment-choice-parity] self-test OK — ${3 + BANNED_BALANCE_MARKERS.length}개 음성 케이스 + 정상 2건`);
}

// 🔴 마커 개수를 요약에 찍는다. 검사가 죽었는지 알아채는 신호는 이 줄뿐이다 — 옛
// STRUCTURE_MARKERS 는 배열만 남고 집행이 사라진 채 이 줄이 계속 초록이었다.
console.log(
  `[verify-payment-choice-parity] PASS (${RENDERERS.length} renderers, ${CANONICAL_RULES.length} css rules, `
  + `${BUILDER_MARKERS.length} builder + ${RENDERER_MARKERS.length} renderer markers, ${BANNED_BALANCE_MARKERS.length} banned, `
  + `${REQUIRED_I18N_KEYS.length} copy keys x ${I18N_LOCALES.length} locales, ${GATED_PATHS.length} gate-triggered paths)`,
);
