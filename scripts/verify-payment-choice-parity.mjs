// 결제수단 선택창(달빛 결제 방식 선택) UI 통일 회귀 방지.
//
// 이 서비스에는 결제창 렌더러가 3종 있다 — 정적 셸 인라인(index.html + 5미러), React(app/_lib/billing-client.ts),
// 독립 정적 페이지 폴백(js/destiny-profile.js + public 사본). 과거에는 넷(celestial-harmony 전용 포함)이 서로
// 다른 디자인이었고, 그중 일부는 "달빛 이용권 상점" 카드 자체가 없어 이용권 전환 경로가 끊겼다.
//
// 여기서 강제하는 계약:
//   1) 세 구현 모두 동일한 정본 CSS(index.html의 _cdEnsureDirectPaymentStyles 규칙 배열)를 주입한다.
//   2) 세 구현 모두 동일한 구조 마커(달 헤더/카드헤드/추천 배지/금액 강조)를 렌더한다.
//   3) 세 구현 모두 이용권 상점 · 단건 결제 · 월정석 세 옵션을 모두 렌더한다.
//   4) 폐기된 별도 디자인(.cdpc-*, .celestial-pay-*, .cd-react-payment-choice-*)이 되살아나지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sliceFunction } from "./lib/js-source-slice.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

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
  ".cd-direct-payment-option--recommended",
  // 2026-08-11: 떠다니는 CSS 달(moon-crescent)을 걷어내고 상단 골드 헤어라인 + 꽃돼지 안내자로 대체했다.
  // 장식 초점이 둘이면 서로를 깎아먹는다. 마커를 지우지 않고 새 요소로 **교체**해 3렌더러 보호는 유지한다.
  ".cd-direct-payment-hairline",
  ".cd-direct-payment-guide__pig",
  ".cd-direct-payment-go",
  // 2026-08-13: 월정석 카드 아래 온디맨드 [보유 월정석 확인] 버튼 + 결과 줄.
  ".cd-direct-payment-balance-check",
  ".cd-direct-payment-balance-value",
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
  "/icons/app-logo-176.webp",
  'data-mode="pass-store"',
  'data-mode="direct"',
  'data-mode="monthly" data-monthly-option',
  'data-mode="cancel"',
  "data-monthly-hint",
  "data-payment-status",
  // 2026-08-13: 월정석 카드 아래 온디맨드 확인 버튼 + 결과 줄. 세 렌더러가 같은 훅을 써야
  // paid-gate-ui 의 "열 때는 조회 0회, 버튼 뒤에서만 조회" 단언이 세 곳 모두에 걸린다.
  "cd-direct-payment-balance-check",
  "data-monthly-balance-check",
  "data-monthly-balance-text",
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
const BANNED_BALANCE_MARKERS = [
  "cd-direct-payment-moonbal-current",
  'data-mode="monthly-refresh"',
  "data-monthly-current",
];

// 결제창 제목. 셸·독립 폴백은 `payment.directModal.moonTitle` 키로 해결하므로 §4 의 키 단언이
// 덮는다. React 만 아직 자체 ko 전용 표(BILLING_CLIENT_TEXT_TRANSLATIONS)에 이 문구를 리터럴로
// 들고 있어서 **모든 로케일에 한국어로 나간다** — 그 표가 키로 옮겨질 때까지의 임시 고정이다.
// 🔴 이 상수는 늘어나면 안 되고, React 가 moonTitle 키를 채택하는 순간 함께 삭제한다.
const REACT_UNKEYED_TITLE = "이 콘텐츠를 열어볼까요?";

const RENDERERS = [
  ...SHELL_MIRRORS.map((rel) => ({ rel, label: "정적 셸" })),
  { rel: REACT_CLIENT, label: "React" },
  ...STANDALONE_FALLBACKS.map((rel) => ({ rel, label: "독립 폴백" })),
];

assert.ok(
  read(REACT_CLIENT).includes(REACT_UNKEYED_TITLE),
  `${REACT_CLIENT}: 정본 제목("${REACT_UNKEYED_TITLE}") 없음 — moonTitle 키로 옮겼다면 REACT_UNKEYED_TITLE 을 지우고 §4 의 REQUIRED_ALL 에 payment.directModal.moonTitle 을 넣으세요`,
);

for (const renderer of RENDERERS) {
  const source = read(renderer.rel);
  for (const marker of STRUCTURE_MARKERS) {
    assert.ok(source.includes(marker), `${renderer.label} ${renderer.rel}: 구조 마커 누락 — ${marker}`);
  }
  for (const marker of BANNED_BALANCE_MARKERS) {
    assert.ok(
      !source.includes(marker),
      `${renderer.label} ${renderer.rel}: 제거된 월정석 잔량 UI 가 되살아났습니다 — ${marker} (결제창은 /api/billing/balance 를 부르지 않는다)`,
    );
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

// ── 4) 결제창 문구는 3렌더러가 **같은 i18n 키**로 해결한다 ────────────────────────────────
// 독립 정적 폴백은 결제창 제목·월정석 카드·잔량 상태 문구를 한국어로 하드코딩하고 있어서,
// /en·/ja·/zh 등 비한국어 사용자에게 결제창만 한국어로 보였다(2026-08-01). 셸이 이미 쓰던 키를
// 그대로 쓰게 하고, 되돌아가지 않도록 키 사용을 강제한다.
//
// 2026-08-20 확대: 예전에는 독립 폴백 2파일만 검사했다. 셸·React 는 검사 대상이 아니었고,
// 그 자리는 위 STRUCTURE_MARKERS 의 한국어 리터럴이 대신 지키고 있었다 — 그래서 "세 렌더러가
// 같은 문구를 쓰는가"만 보였고 "그 문구가 사전과 같은가"는 아무도 보지 않았다.
// 이제 세 렌더러의 함수 본문을 각각 슬라이스해 **키 집합을 정확히** 비교하고, 각 호출의 ko
// 폴백이 public/i18n/ko.json 값과 일치하는지까지 본다.
//
// 🔴 ko 폴백이 곧 ko 정본이다 — cdTranslate(js/cd-lang-native.js)는 lang === "ko" 일 때
//    사전을 아예 보지 않고 폴백을 그대로 돌려준다. 그래서 폴백과 사전이 어긋나면 한국어
//    사용자만 정상이고 나머지 11개 로케일이 조용히 옛 문구를 본다.

// 세 렌더러가 **모두** 써야 하는 키. 조건 분기와 무관하게 항상 렌더되는 문구다.
const REQUIRED_ALL = [
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
    "payment.directModal.moonTitle",
    "payment.directModal.subtitle.directOnly",
    "payment.directModal.note.directOnly",
    "payment.directModal.passChecking",
    "payment.directModal.passMissGoStore",
    "payment.directModal.legal.provisionTiming",
    "common.cancel",
  ],
  react: [
    // React 만 호출부에서 월정석 잔량 스냅샷을 받아 "사용 후 남는 양"을 말할 수 있다.
    "payment.directModal.monthlyHint.after",
  ],
  standalone: [
    "payment.directModal.moonTitle",
    // 셸은 이 키를 결제창 함수 **바깥**(formatWon)에서 쓴다.
    "payment.currency.krw",
    "common.cancel",
  ],
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
  })),
  {
    rel: REACT_CLIENT,
    label: "React",
    marker: "async function openReactPaymentChoiceModalInner(",
    wrapper: "checkoutEntry\\.text",
    extra: RENDERER_EXTRA_KEYS.react,
  },
  ...STANDALONE_FALLBACKS.map((rel) => ({
    rel,
    label: "독립 폴백",
    marker: "  function _dpRenderStandalonePaymentChoice(",
    wrapper: "_dpCheckoutText",
    extra: RENDERER_EXTRA_KEYS.standalone,
  })),
];

/** `wrapper('key', 'fallback', …)` 호출을 전부 뽑아 key → ko 폴백 맵으로 돌려준다. */
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

// 🔴 렌더러 파일만이 아니라 **이 스크립트가 열어서 단언하는 파일 전부**가 트리거에 있어야 한다.
// 2026-08-20 부터 결제창 문구의 12로케일 값을 public/i18n/*.json 에서 직접 읽으므로, 사전만
// 바꾼 PR 에서도 이 게이트가 깨어나야 한다. 넣지 않으면 결제창 문구를 사전에서 지워도 게이트가
// 초록인 채로 통과한다 — 위 주석이 경고하는 것과 정확히 같은 형태의 구멍이다.
const GATED_PATHS = [
  ...SHELL_MIRRORS,
  REACT_CLIENT,
  ...STANDALONE_FALLBACKS,
  ...I18N_LOCALES.map((locale) => `public/i18n/${locale}.json`),
];
for (const rel of GATED_PATHS) {
  assert.ok(
    gateCovers(rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 결제창 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(`[verify-payment-choice-parity] PASS (${RENDERERS.length} renderers, ${CANONICAL_RULES.length} css rules, ${REQUIRED_I18N_KEYS.length} copy keys x ${I18N_LOCALES.length} locales, ${GATED_PATHS.length} gate-triggered paths)`);
