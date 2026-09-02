#!/usr/bin/env node
/**
 * verify-locale-text-fit
 *
 * 로케일이 바뀌면 같은 칸에 1.4배 긴 글자가 들어온다. 이 레포는 셸 언어 스위처로 12개 UI
 * 로케일을 노출하는데(lib/i18n/locale-normalize.js 의 RUNTIME_LOCALES), 사전 렌더 셸은
 * public/{en,ja,zh,zh-tw} 4개뿐이고 나머지 7개(de·es·fr·nl·vi·hi·ms)는 **한국어 기준으로
 * 레이아웃된 셸**에 런타임 DOM 치환으로 더 긴 문자열을 꽂는다. 그런데 로케일별 타이포 완충이
 * 코드베이스에 하나도 없다(전체 추적 파일 `git grep ":lang(|\[lang=|html\[lang"` → 0건).
 *
 * 기존 i18n 가드는 키 패리티·금액 정합·잔존 한글만 본다. **기하(잘림·겹침·넘침)를 보는 장치가
 * 없어서** 결제창 배지가 잘리고 탭 라벨이 글자 중간에서 끊긴 채로 머지됐다.
 *
 * 이 가드가 보는 것 — 정적으로 확인 가능한 두 축뿐이다.
 *   규칙 A: 텍스트를 담는 요소에 "늘어날 수 없게 만드는" 선언(nowrap·ellipsis·line-clamp·
 *           px 고정 height/width·flex:0 0)이 붙으면, 한국어 사유가 달린 ACCEPTED 항목이
 *           아닌 한 실패한다. 새 규칙은 기본 실패 → fail-closed.
 *   규칙 B: 폭 예산이 좁은 키(하단 탭 라벨·결제 카드 헤드)에 대해 12개 사전의 근사 렌더 폭을
 *           재고 예산을 넘으면 실패한다. **CSS 를 안 건드리고 사전만 고쳐도 잡힌다.**
 *
 * 🔴 이 가드가 보지 않는 것 — 실제 브라우저 기하다. 폭 계산은 폰트 메트릭이 아니라 근사
 *    모델(ADVANCE)이고, 겹침·세로 잘림은 아예 못 본다. **정본은 measure:locale-text-fit** 이며
 *    이 가드는 그보다 앞에서 싸게 거르는 체다. 이 파일을 verify:* 로 둔 이유는 dist 빌드도
 *    브라우저도 필요 없기 때문이다(브라우저가 필요한 계측은 measure:* 여야 한다 —
 *    scripts/measure-mobile-routes.mjs:8-11 의 같은 사유).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_LOCALES } from "../lib/i18n/locale-normalize.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
function fail(where, message) {
  failures.push(`${where}: ${message}`);
}

const read = (relPath) => readFileSync(path.join(repoRoot, relPath), "utf8");

/* ------------------------------------------------------------------ *
 * 규칙 A — "늘어날 수 없는" 선언 전수 분류
 * ------------------------------------------------------------------ */

/** 결제창 CSS 정본. 렌더러 3종이 전부 이 배열을 주입한다. */
const PAYMENT_CSS_SOURCE = "js/core/checkout-entry.js";

const CSS_FILES = ["styles/mobile-bottom-nav.css"];

const SHELL_FILES = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  // zh-tw 는 뒤늦게 추가된 미러다. 이 목록에서 미러가 하나라도 빠지면
  // "초록불인데 거기는 안 본다"가 된다(verify-mobile-detail-nonintrusive.mjs:34 와 같은 사유).
  "public/zh-tw/index.html",
];

/** 이 토큰이 선택자에 있으면 "로케일 팽창에 노출된 표면"으로 보고 검사한다. */
const SELECTOR_TOKENS = [
  ".cd-mobile-bottom-nav", // 셸 하단 탭바
  ".cd-mnav", // App Router 하단 탭바
  ".cd-direct-payment", // 결제 선택창
  ".saju-loader", // 결제 대기·성공·실패 오버레이
];

/**
 * 위험 선언 분류기.
 * max-width 는 일부러 뺐다 — 상한은 줄바꿈을 막지 않으므로 팽창에 안전하고,
 * 오히려 이 가드가 권하는 패턴이다. max-height 는 세로로 잘라내므로 위험으로 센다.
 */
const RISK_CHECKS = [
  ["nowrap", /white-space\s*:\s*nowrap/, "줄바꿈 불가 — 긴 로케일에서 칸 밖으로 밀린다"],
  ["ellipsis", /text-overflow\s*:\s*ellipsis/, "가로 말줄임 — 의미가 잘린다"],
  ["line-clamp", /-webkit-line-clamp\s*:/, "줄 수 고정 — 노출 정보량이 로케일마다 달라진다"],
  ["fixed-height", /(^|;)\s*height\s*:\s*[\d.]+px/, "세로 고정 — 2줄이 되면 잘린다"],
  ["capped-height", /(^|;)\s*max-height\s*:\s*[\d.]+px/, "세로 상한 — 2줄이 되면 잘린다"],
  ["fixed-width", /(^|;)\s*width\s*:\s*[\d.]+px/, "가로 고정 — 넓어질 수 없다"],
  ["flex-rigid", /(^|;)\s*flex\s*:\s*0\s+0/, "축소·확장 불가 — 형제와 같이 밀려난다"],
];

/**
 * 위험 선언 예외 목록. 키는 `주체|위험` 이고 값은 { why, needs? } 다.
 * `needs` 가 있으면 그 조건이 아직 참인지도 검사한다 — 전제가 사라지면 예외도 무효다.
 *
 * 🔴 원칙 10: 이 표는 "발견 목록"이 아니라 "분류표"다. 스캔에서 나온 주체가 여기 없으면
 *    실패하고, 여기 있는데 스캔에서 안 나오면 낡은 항목으로 보고 역시 실패한다.
 */
const ACCEPTED = new Map([
  // --- 결제창: 전제가 살아있는 동안만 유효한 예외 ---
  [
    ".cd-direct-payment-recommend|flex-rigid",
    {
      why:
        "추천 리본 — 짧은 고정 문구이고, 부모 .cd-direct-payment-cardhead 가 flex-wrap:wrap 이라 " +
        "한 줄에 못 들어가면 다음 줄로 내려간다(2026-09-03 PR-2). 축소를 허용하면 " +
        "border-radius:999px 모서리가 글자를 먹으므로 flex:0 0 auto 를 유지한다. 같은 행의 " +
        "배지는 flex:0 1 auto 로 바꿔 축소를 허용했다(min-width 는 auto=min-content 로 둔다).",
      needs: {
        file: "js/core/checkout-entry.js",
        test: /.cd-direct-payment-option .cd-direct-payment-cardhead{[^}]*flex-wrap:wrap/,
        note: ".cd-direct-payment-cardhead 의 flex-wrap:wrap 이 사라졌다 — 리본이 다시 헤드를 넘긴다",
      },
    },
  ],

  // --- 탭바: nowrap 을 유지하고 문자열 길이로 푼 자리 ---
  [
    ".cd-mobile-bottom-nav__item|nowrap",
    {
      why:
        "탭 칸은 58px 고정이고 두 줄이 들어갈 높이가 없다 — nowrap 을 유지하고 라벨 문자열 자체를 " +
        "칸에 맞춘다(규칙 B 가 사전 쪽에서 폭을 지킨다). 🔴 여기엔 App Router 쪽과 달리 " +
        "text-overflow 가 없어, 예산이 뚫리면 말줄임 없이 하드 클립된다 — 규칙 B 를 느슨하게 만들지 말 것.",
    },
  ],
  [
    ".cd-mnav__label|nowrap",
    {
      why:
        "위 셸 탭바와 같은 판단 — App Router 탭 칸도 58px 다(2026-09-03 dist 실측). 다만 이쪽 " +
        "글꼴이 11px 로 셸(10.36px)보다 커서 같은 문자열이 먼저 잘린다.",
    },
  ],
  [
    ".cd-mnav__label|ellipsis",
    { why: "예산이 뚫렸을 때의 안전망 — 하드 클립보다 낫다. 안 뚫리게 하는 것은 규칙 B 다." },
  ],

  // --- 검토 대기 (P1) ---
  [
    ".cd-direct-payment-desc|line-clamp",
    {
      why:
        "P1 검토 대기: line-clamp:1 이 의도된 압축인지 확인 필요. ko 문구조차 264px 폭에서 " +
        "이미 잘리므로 로케일 문제가 아니라 설계 문제일 수 있다.",
    },
  ],

  // --- 텍스트를 담지 않는 요소 (정당한 고정) ---
  [
    ".cd-direct-payment-giftchip-glyph|flex-rigid",
    { why: "상품권 아이콘 — 글자를 담지 않는다. 옆의 label 이 min-width:0 으로 줄어든다." },
  ],
  [
    ".cd-direct-payment-guide__pig|fixed-width",
    { why: "꽃돼지 일러스트 — 이미지라 팽창하지 않는다." },
  ],
  [".cd-direct-payment-guide__pig|flex-rigid", { why: "위와 같은 일러스트." }],
  [".cd-direct-payment-hairline|fixed-height", { why: "구분선 장식 — 글자를 담지 않는다." }],
  [".cd-direct-payment-hairline::after|fixed-height", { why: "구분선 장식의 의사요소." }],
  [".cd-direct-payment-hairline::after|fixed-width", { why: "구분선 장식의 의사요소." }],
  [
    ".cd-direct-payment-modal.is-open::before|fixed-height",
    { why: "모달 진입 장식(빛 번짐) 의사요소 — 글자를 담지 않는다." },
  ],
  [".cd-direct-payment-modal.is-open::before|fixed-width", { why: "위와 같은 장식 의사요소." }],
  [".cd-direct-payment-modal.is-open::after|fixed-height", { why: "위와 같은 장식 의사요소." }],
  [".cd-direct-payment-modal.is-open::after|fixed-width", { why: "위와 같은 장식 의사요소." }],
  [".cd-mnav__chevron|fixed-height", { why: "펼침 화살표 아이콘 — 글자를 담지 않는다." }],
  [".cd-mnav__chevron|fixed-width", { why: "펼침 화살표 아이콘." }],
  [".cd-mnav__handle|fixed-width", { why: "탭바 드래그 핸들 — 글자를 담지 않는다." }],
  [".cd-mnav__icon|fixed-height", { why: "탭 아이콘 24x24 — 글자를 담지 않는다." }],
  [".cd-mnav__icon|fixed-width", { why: "탭 아이콘 24x24." }],
  [
    ".cd-mobile-bottom-nav__chevron|fixed-height",
    { why: "셸 탭바 접기 화살표 — 글자를 담지 않는다." },
  ],
  [".cd-mobile-bottom-nav__chevron|fixed-width", { why: "셸 탭바 접기 화살표." }],
  [
    ".cd-mobile-bottom-nav__item::before|fixed-height",
    { why: "선택 상태 배경 장식 의사요소 — 글자를 담지 않는다." },
  ],
  [".cd-mobile-bottom-nav__item::before|fixed-width", { why: "위와 같은 장식 의사요소." }],
  [
    ".cd-mobile-bottom-nav__toggle|fixed-height",
    {
      why:
        "탭바 접기/펼치기 손잡이 — 안에 aria-hidden 인 chevron span 하나뿐이고 보이는 글자가 " +
        "없다. 접근성 이름은 aria-label 이라 폭을 차지하지 않는다.",
    },
  ],
  [".cd-mobile-bottom-nav__toggle|fixed-width", { why: "위와 같은 손잡이." }],
  [".saju-loader-progress|fixed-height", { why: "진행 막대 — 글자를 담지 않는다." }],
  [".saju-loader-visual|fixed-height", { why: "로고·연이 스프라이트 자리 — 이미지다." }],
  [".saju-loader-visual|fixed-width", { why: "로고·연이 스프라이트 자리 — 이미지다." }],
  [".saju-loader-visual|flex-rigid", { why: "로고·연이 스프라이트 자리 — 이미지다." }],
  [
    ".saju-loader-visual::after|fixed-height",
    { why: "결제 완료 시 로고 우하단에 붙는 34px 금색 원형 뱃지 장식 — content:'' 이라 글자가 없다." },
  ],
  [".saju-loader-visual::after|fixed-width", { why: "위와 같은 원형 뱃지 장식." }],
  [
    ".saju-loader-yeon-sprite::after|fixed-height",
    { why: "연이 스프라이트에 붙는 같은 계열의 원형 뱃지 장식 — content:'' 이라 글자가 없다." },
  ],
  [".saju-loader-yeon-sprite::after|fixed-width", { why: "위와 같은 원형 뱃지 장식." }],

  // --- 전제가 살아있는 동안만 유효한 예외 ---
  [
    ".cd-mobile-bottom-nav__chip|nowrap",
    {
      why:
        "빠른 이동 칩 행은 현재 렌더되지 않는다(부모 .cd-mobile-bottom-nav__quick 이 " +
        "display:none!important). 되살리면 이 행을 다시 판단할 것 — 칩은 텍스트를 담는다.",
      needs: {
        file: "index.html",
        test: /\.cd-mobile-bottom-nav__quick\{[^}]*display:none!important/,
        note: ".cd-mobile-bottom-nav__quick 의 display:none!important 가 사라졌다",
      },
    },
  ],
  [
    ".cd-mobile-bottom-nav__chip|flex-rigid",
    {
      why: "위와 같은 칩 행 — 렌더되지 않는 동안만 유효하다.",
      needs: {
        file: "index.html",
        test: /\.cd-mobile-bottom-nav__quick\{[^}]*display:none!important/,
        note: ".cd-mobile-bottom-nav__quick 의 display:none!important 가 사라졌다",
      },
    },
  ],

  // --- 폭 예산 가드로 넘긴 항목 ---
  [
    ".cd-direct-payment-giftchip-label|nowrap",
    {
      why:
        "상품권 칩 라벨. 지금은 칩 예산 안에 들어가지만 여유가 좁다 — 길이 회귀는 아래 규칙 B 의 " +
        "폭 예산이 사전 편집 시점에 잡는다.",
    },
  ],
  [".cd-direct-payment-giftchip-label|ellipsis", { why: "위와 같은 칩 라벨." }],
]);

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** HTML 에서 <style> 블록 본문만 뽑는다. 이걸 안 하면 </style><style ...> 가 선택자로 잡힌다. */
function* styleBlocks(html) {
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    yield { css: match[1], offset: match.index + match[0].indexOf(match[1]) };
  }
}

/** 아주 작은 CSS 규칙 스캐너 — @media 안의 규칙도 개별로 잡힌다(@ 로 시작하는 헤더는 건너뛴다). */
function* iterateRules(css) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const selector = match[1].replace(/\s+/g, " ").trim();
    if (!selector || selector.startsWith("@")) continue;
    yield { selector, body: match[2], index: match.index };
  }
}

/**
 * 선택자에서 "제약을 받는 주체"를 뽑는다 — 마지막 복합 선택자의 클래스/ID + 의사요소.
 * `.a .b::before` → `.b::before`. 콤마 목록은 주체별로 나눠 각각 분류한다.
 * 이렇게 키를 잡으면 조상 선택자에 한정자가 붙어도 예외가 조용히 풀리지 않는다.
 */
function subjectsOf(selector) {
  const out = new Set();
  for (const part of selector.split(",").map((s) => s.trim()).filter(Boolean)) {
    const last = part.split(/\s+|>|\+|~/).filter(Boolean).pop() || part;
    const pseudo = last.match(/::[a-z-]+/);
    const tokens = last.replace(/::[a-z-]+/g, "").match(/[.#][A-Za-z0-9_-]+/g);
    out.add((tokens ? tokens.join("") : last) + (pseudo ? pseudo[0] : ""));
  }
  return [...out];
}

const seenAccepted = new Set();

function scanCss(where, css, lineBase) {
  const clean = stripComments(css);
  for (const { selector, body, index } of iterateRules(clean)) {
    if (!SELECTOR_TOKENS.some((token) => selector.includes(token))) continue;
    const declarations = body.toLowerCase().replace(/!important/g, "");
    const risks = RISK_CHECKS.filter(([, re]) => re.test(declarations));
    if (!risks.length) continue;
    const line = lineBase + clean.slice(0, index).split("\n").length - 1;
    for (const subject of subjectsOf(selector)) {
      for (const [risk, , why] of risks) {
        const key = `${subject}|${risk}`;
        const accepted = ACCEPTED.get(key);
        if (!accepted) {
          fail(
            where,
            `${line}행 [${subject}] '${risk}' 미분류 — ${why}. 팽창에 안전하다면 이 스크립트의 ` +
              `ACCEPTED 에 "${key}" 를 한국어 사유와 함께 등재하고, 안전하지 않다면 CSS 를 고치세요 ` +
              "(고정 px → min-width/min-height + flex:1 1 auto, nowrap → 줄바꿈 허용).",
          );
          continue;
        }
        seenAccepted.add(key);
        if (accepted.needs && !accepted.needs.test.test(read(accepted.needs.file))) {
          fail(
            where,
            `[${subject}] '${risk}' 예외의 전제가 깨졌다 — ${accepted.needs.note}. ` +
              "예외 사유를 다시 판단하세요.",
          );
        }
      }
    }
  }
}

/** checkout-entry.js 의 PAYMENT_CHOICE_CSS_RULES 배열을 CSS 텍스트로 되살린다. */
function paymentChoiceCss() {
  const source = read(PAYMENT_CSS_SOURCE);
  const block = source.match(/var PAYMENT_CHOICE_CSS_RULES = \[([\s\S]*?)\n {2}\];/);
  if (!block) {
    fail(
      PAYMENT_CSS_SOURCE,
      "PAYMENT_CHOICE_CSS_RULES 배열을 찾을 수 없다 — 결제창 CSS 정본이 옮겨졌다면 이 가드의 " +
        "추출 패턴을 함께 고쳐야 한다(못 찾으면 결제창 전체가 미검사로 남는다).",
    );
    return { css: "", line: 1 };
  }
  const css = block[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("'"))
    .map((line) => line.replace(/,$/, "").slice(1, -1).replace(/\\'/g, "'"))
    .join("\n");
  return { css, line: source.slice(0, block.index).split("\n").length };
}

/* ------------------------------------------------------------------ *
 * 규칙 B — 폭 예산
 * ------------------------------------------------------------------ */

/**
 * 표시 폭 근사(em 단위 advance). 실제 폰트 메트릭이 아니다 — 정본은 measure:locale-text-fit 이고,
 * 이 표는 "사전을 고치는 순간" 싸게 거르는 용도다.
 *
 * 🔴 가중치는 추측이 아니라 실측 보정값이다(2026-09-03). 셸 / 의 하단 탭 라벨 60표본
 * (12 로케일 × 5탭)을 Playwright 로 렌더해 Range.getBoundingClientRect() 로 잉크 폭을 재고
 * 맞췄다: 평균 절대오차 1.51px, 최대 과소평가 −2.9px, 58px 칸 기준 판정 불일치 0/60.
 * 보정 전(공백 .28 / 대문자 .62 / 소문자 일괄 .52)은 같은 표본에서 3/60 을 틀렸고, 실제로는
 * 들어가는 de·nl·en 라벨을 초과로 봤다.
 * 재현: node scripts/measure-locale-text-fit.mjs --routes=/ --target=source --viewports=360x800
 */
const NARROW_GLYPHS = new Set([..."ijltfrI"]);
const WIDE_GLYPHS = new Set([..."mwMW"]);
function widthEm(text) {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (ch === " ") em += 0.35;
    else if (/[.,:;'!|·]/.test(ch)) em += 0.28;
    else if (code >= 0x1100 && code <= 0x11ff) em += 1.0; // 한글 자모
    else if (code >= 0x3000 && code <= 0x9fff) em += 1.0; // 가나·한자·CJK 구두점
    else if (code >= 0xac00 && code <= 0xd7af) em += 1.0; // 한글 음절
    else if (code >= 0xff00 && code <= 0xffef) em += 1.0; // 전각
    else if (NARROW_GLYPHS.has(ch)) em += 0.3;
    else if (WIDE_GLYPHS.has(ch)) em += 0.82;
    else if (/[A-Z0-9]/.test(ch)) em += 0.65;
    else if (/[a-z]/.test(ch)) em += 0.55;
    else em += 0.55; // 데바나가리 등 그 외(결합 표시도 이 폰트에서는 폭을 차지한다)
  }
  return em;
}

const widthPx = (text, fontPx) => Math.round(widthEm(text) * fontPx * 10) / 10;

/**
 * 하단 탭 라벨 예산 — 🔴 산술 유도가 아니라 **실측**이다(2026-09-03, 360x800 셸 /).
 * .cd-mobile-bottom-nav__item 의 clientWidth 는 12개 로케일 전부 58px 이고 computed
 * font-size 는 10.36px 다(루트 폰트가 유동이라 0.6875rem 이 11px 가 아니다 — 이걸 11px 로
 * 가정한 것이 보정 전 오판의 절반이었다).
 * 임계는 칸 58px 에서 2px 를 뺀 56px 로 둔다: 모델의 최대 과소평가가 −2.9px 이라 칸값을
 * 그대로 쓰면 경계에서 놓칠 수 있다. 이 임계에서 60표본 중 적발 1건(ms "Empat Tiang",
 * 실측 58.84px)이고 그 1건이 실제로 유일하게 잘리는 라벨이다.
 * 🔴 이 값은 **셸 탭바** 기준이고, 더 빡빡한 쪽은 App Router 탭바다 — 2026-09-03 실측
 * (dist /points/ 360x800): .cd-mnav__label 의 가용폭도 **58px** 인데 computed font-size 가
 * **11px** 라 셸(10.36px)보다 6.2% 크게 그려진다. 즉 같은 문자열이 App Router 에서 먼저 잘린다
 * (같은 측정에서 es "Cuatro Pilares" +11px, fr "Quatre Piliers" +9px, ms "Empat Tiang" +4px
 * 말줄임. 셸에서 잘리던 것은 ms 하나뿐이었다).
 * 🔴 그런데도 이 상수를 11px 로 올리지 않는다 — 근사 모델의 오차대(±3.6px)가 칸 폭보다 먼저
 * 터져서, 실제로 3px 여유를 두고 들어가는 en "Four Pillars"(모델 55.4px, 셸 실측 잉크 51.8px)를
 * 오탐으로 잡는다. 이 상수는 **사전을 고치는 순간 싸게 거르는 프록시**로 남기고, 이 표면의
 * 판정 정본은 measure:locale-text-fit 이다:
 *   npm run build:cf && npm run measure:locale-text-fit -- --routes=/points/ --target=dist --viewports=360x800
 */
const TAB_LABEL_BUDGET_PX = 56;
const TAB_LABEL_FONT_PX = 10.36; // 실측 computed font-size (360px 뷰포트)

/**
 * 결제창 카드 헤드 예산.
 *   360px 뷰포트 − .cd-direct-payment-dialog padding 20px×2 = 320
 *   − .cd-direct-payment-option padding 14px×2 + border 1px×2 = 290px
 * 헤드는 [배지] + gap 8px + [추천 리본] 이고 셋 다 줄바꿈하지 않는다.
 */
const CARDHEAD_BUDGET_PX = 290;
const CARDHEAD_GAP_PX = 8;
const BADGE_FONT_PX = 11; // .cd-direct-payment-badge{font-size:11px}
const BADGE_PADDING_PX = 26; // padding:0 11px 0 15px
const RIBBON_FONT_PX = 10.5; // .cd-direct-payment-recommend{font-size:10.5px}
const RIBBON_PADDING_PX = 20; // padding:3px 10px
/** 이용권 등급 보유자는 배지 앞에 등급명이 붙는다(index.html 의 passTierBadgeLabel). */
const TIER_PREFIX = "VVIP ";

const dictionaryCache = new Map();
function dictionary(locale) {
  if (!dictionaryCache.has(locale)) {
    // 사전 파일명은 소문자다(zh-CN → public/i18n/zh-cn.json).
    dictionaryCache.set(locale, JSON.parse(read(`public/i18n/${locale.toLowerCase()}.json`)));
  }
  return dictionaryCache.get(locale);
}

const lookup = (dict, key) => key.split(".").reduce((node, part) => (node ? node[part] : undefined), dict);

/**
 * 폭 예산 예외. 키는 i18n 키 하나이고, "어느 로케일에서" 넘치는지는 담지 않는다 —
 * 근사 모델이라 경계 로케일이 흔들리기 때문이다. 대신 "이 키는 아직 어딘가에서 넘친다"만
 * 예외로 두고, 아무 데서도 안 넘치게 되면 낡은 항목으로 보고 실패시킨다.
 */
const ACCEPTED_BUDGET = new Map([]);

function checkTabLabelBudgets() {
  const source = read("app/_lib/mobile-tabs.ts");
  const block = source.match(/export const MOBILE_TABS[^=]*=\s*\[([\s\S]*?)\n\] as const;/);
  if (!block) {
    fail(
      "app/_lib/mobile-tabs.ts",
      "MOBILE_TABS 배열을 찾을 수 없다 — 탭 라벨 폭 예산이 통째로 미검사로 남는다. " +
        "탭 정의 구조가 바뀌었다면 이 가드의 추출 패턴을 함께 고치세요.",
    );
    return;
  }
  const keys = [...block[1].matchAll(/\btransKey:\s*"([^"]+)"/g)].map((m) => m[1]);
  // 탭 하나가 transKey 를 잃으면 그 라벨만 조용히 미검사로 남는다 — 개수로 짝을 맞춘다.
  const tabCount = [...block[1].matchAll(/\bkey:\s*"[^"]+"/g)].length;
  if (!keys.length || keys.length !== tabCount) {
    fail(
      "app/_lib/mobile-tabs.ts",
      `탭 ${tabCount}개 중 transKey 가 ${keys.length}개뿐이다 — 나머지 라벨은 폭 예산 검사를 ` +
        "받지 못한다. 모든 탭에 transKey 를 주거나 이 가드의 추출 패턴을 함께 고치세요.",
    );
    return;
  }
  const over = new Map();
  for (const key of new Set(keys)) {
    for (const locale of RUNTIME_LOCALES) {
      const text = lookup(dictionary(locale), key);
      if (typeof text !== "string" || !text) continue;
      const px = widthPx(text, TAB_LABEL_FONT_PX);
      if (px <= TAB_LABEL_BUDGET_PX) continue;
      if (!over.has(key)) over.set(key, []);
      over.get(key).push(`${locale} "${text}" ${px}px`);
    }
  }
  for (const [key, hits] of over) {
    if (ACCEPTED_BUDGET.has(key)) continue;
    fail(
      "탭 라벨 폭 예산",
      `'${key}' 가 칸 예산 ${TAB_LABEL_BUDGET_PX}px 를 넘는다 — ${hits.join(", ")}. ` +
        "더 짧은 번역을 쓰거나 짧은 라벨 전용 키를 만드세요(폰트 축소는 탭 타깃 인체공학 위반).",
    );
  }
  for (const key of ACCEPTED_BUDGET.keys()) {
    if (!keys.includes(key)) continue;
    if (over.has(key)) continue;
    fail(
      "탭 라벨 폭 예산",
      `'${key}' 는 이제 어느 로케일에서도 예산을 넘지 않는다 — ACCEPTED_BUDGET 에서 지우세요.`,
    );
  }
  return over;
}

function checkCardheadBudget() {
  const shell = read("index.html");
  const badgeKey = shell.match(/_cdPaymentI18n\(\s*'(payment\.directModal\.passBadge)'/);
  const ribbonKey = shell.match(/_cdPaymentI18n\(\s*'(payment\.directModal\.recommendBadge)'/);
  if (!badgeKey || !ribbonKey) {
    fail(
      "index.html",
      "결제창 배지·추천 리본의 i18n 키 호출부를 찾을 수 없다 — 카드 헤드 폭 예산이 미검사로 " +
        "남는다. 키가 바뀌었다면 이 가드를 함께 고치세요.",
    );
    return [];
  }
  const rows = [];
  for (const locale of RUNTIME_LOCALES) {
    const dict = dictionary(locale);
    const badgeText = lookup(dict, badgeKey[1]);
    const ribbonText = lookup(dict, ribbonKey[1]);
    if (typeof badgeText !== "string" || typeof ribbonText !== "string") continue;
    const ribbon = widthPx(ribbonText, RIBBON_FONT_PX) + RIBBON_PADDING_PX;
    for (const [label, text] of [
      ["등급 없음", badgeText],
      ["등급 보유", TIER_PREFIX + badgeText],
    ]) {
      const badge = widthPx(text, BADGE_FONT_PX) + BADGE_PADDING_PX;
      const total = Math.round((badge + CARDHEAD_GAP_PX + ribbon) * 10) / 10;
      rows.push({ locale, label, total, over: total > CARDHEAD_BUDGET_PX });
    }
  }
  const over = rows.filter((row) => row.over);
  // 2026-09-03(PR-2)부터 헤드는 flex-wrap:wrap 이라 넘쳐도 잘리지 않고 두 줄이 된다. 그래서
  // 이 예산은 "잘림" 이 아니라 "레이아웃이 한 줄 늘어나는 지점" 을 지킨다 — 카드 높이가 커지면
  // 목록 전체가 밀리므로 여전히 회귀로 본다.
  for (const row of over) {
    fail(
      "결제 카드 헤드 폭 예산",
      `${row.locale}(${row.label}) 배지+리본 ${row.total}px 가 헤드 예산 ${CARDHEAD_BUDGET_PX}px 를 ` +
        "넘는다 — 헤드가 두 줄이 되어 카드가 세로로 커진다. 더 짧은 배지·리본 문구를 쓰거나, " +
        "그 높이를 감수할 수 있다면 CARDHEAD_BUDGET_PX 를 실측 근거와 함께 올리세요.",
    );
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * 실행
 * ------------------------------------------------------------------ */

const payment = paymentChoiceCss();
scanCss(PAYMENT_CSS_SOURCE, payment.css, payment.line);
for (const relPath of CSS_FILES) scanCss(relPath, read(relPath), 1);
for (const relPath of SHELL_FILES) {
  const html = read(relPath);
  for (const { css, offset } of styleBlocks(html)) {
    scanCss(relPath, css, html.slice(0, offset).split("\n").length);
  }
}

for (const key of ACCEPTED.keys()) {
  if (seenAccepted.has(key)) continue;
  fail(
    "ACCEPTED",
    `"${key}" 예외가 더 이상 어떤 규칙에도 걸리지 않는다 — 낡은 항목이므로 지우세요 ` +
      "(선택자가 바뀌었다면 예외가 조용히 풀린 것이니 새 주체로 다시 등재해야 한다).",
  );
}

const tabOver = checkTabLabelBudgets();
const cardhead = checkCardheadBudget();

if (failures.length) {
  console.error("로케일 텍스트 팽창에 취약한 지점이 있습니다:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\n로케일이 바뀌면 같은 칸에 최대 1.4배 긴 글자가 들어옵니다(fr 1.44 · de 1.43 · es 1.43).\n" +
      "고정 px 대신 min-width/min-height + flex:1 1 auto 또는 clamp() 를, 버튼에는 고정 height 대신\n" +
      "white-space:normal + min-height 를 쓰세요. 실제 기하 확인은 npm run measure:locale-text-fit 입니다.\n",
  );
  process.exit(1);
}

const cardheadWorst = cardhead.reduce((max, row) => Math.max(max, row.total), 0);
console.log(
  `Locale text fit OK — 위험 선언 ${ACCEPTED.size}건 분류 완료(결제 CSS 1 · CSS ${CSS_FILES.length} · ` +
    `셸 ${SHELL_FILES.length}), 탭 라벨 예산 초과 ${tabOver ? tabOver.size : 0}키(예외 ${ACCEPTED_BUDGET.size}건), ` +
    `카드 헤드 최대 ${cardheadWorst}px / ${CARDHEAD_BUDGET_PX}px, 로케일 ${RUNTIME_LOCALES.length}개.`,
);
