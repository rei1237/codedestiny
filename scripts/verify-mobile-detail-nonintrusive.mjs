#!/usr/bin/env node
/**
 * verify-mobile-detail-nonintrusive
 *
 * 모바일 공용 상세 래퍼(MobileFeatureDetail)가 "인체공학"의 경계를 넘지 못하게 막는다.
 *
 * 왜 필요한가 — 2026-07 이전의 래퍼는 모바일에서 18개 기능의 표면을 --cd-detail-* 팔레트로
 * 재도색하고, 기능 헤더를 sticky 이름판으로 바꾸고, 마크업에 없는 배지를 CSS 로 주입하고,
 * 닫기 버튼을 화면 우상단 고정 원형칩으로 끌어왔다. 그 결과 이름판이 스크롤 내내 본문을
 * 가렸고(닫기칩 10~54px vs 헤더가 비워둔 46px = 8px 확정 겹침), 기능마다 자기 글자색이
 * 남의 표면 위에 떠서 사라지는 회귀를 두 번 땜질해야 했다.
 *
 * 규칙: 모바일 최적화는 탭 타깃·입력 폰트·가로 오버플로·세이프에어리어까지다.
 *       기능 소유 요소의 색·타이포·배경·테두리·위치는 기능이 정한다.
 *
 * 블랙리스트가 아니라 화이트리스트다 — 새로운 종류의 장식이 추가돼도 잡힌다.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CSS_FILES = ["styles/mobile-lite.css", "public/styles/mobile-lite.css"];

const SHELL_FILES = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  // zh-tw 는 뒤늦게 추가된 미러라 이 목록에서 빠져 있었다. 같은 구멍이 auth-event-loop 가드에도
  // 있었다(2026-08-11 수정). 미러가 하나라도 빠지면 "초록불인데 거기는 안 본다"가 된다.
  "public/zh-tw/index.html",
];

/** 이 셀렉터 토큰 중 하나라도 포함하면 "공용 래퍼 규칙"으로 보고 검사한다. */
const WRAPPER_SELECTOR_TOKENS = [
  "data-mobile-detail",
  "MobileFeatureDetail",
  "MobileFeatureBottomSheet",
];

/**
 * 허용 속성 화이트리스트.
 * value 가 함수면 값까지 검사한다(예: font-size 는 입력 확대 방지용 16px 만).
 */
const ALLOWED_PROPERTIES = new Map([
  ["box-sizing", null],
  ["width", null],
  ["min-width", null],
  ["max-width", null],
  ["height", null],
  ["min-height", null],
  ["max-height", null],
  ["margin", null],
  ["padding", null],
  ["padding-bottom", null],
  ["overflow", null],
  ["overflow-x", null],
  ["overflow-y", null],
  ["overscroll-behavior", null],
  ["overscroll-behavior-y", null],
  ["-webkit-overflow-scrolling", null],
  ["touch-action", null],
  ["-webkit-tap-highlight-color", null],
  ["pointer-events", null],
  ["cursor", null],
  ["resize", null],
  ["scroll-margin-bottom", null],
  ["scroll-padding-bottom", null],
  ["align-items", null],
  ["gap", null],
  ["grid-template-columns", null],
  // 레이아웃 맞춤용 display 만. flex/grid 로 기능 헤더 구조를 갈아엎던 사고가 있었다.
  ["display", (value) => /^(grid|flex|none|block)$/.test(value)],
  // 16px 은 iOS 가 포커스 시 화면을 자동 확대하지 않는 하한 — 타이포 취향이 아니라 인체공학이다.
  ["font-size", (value) => value === "16px"],
  // 결제 시트 3종(원설계가 시트)만 라운드를 허용한다. 아래 PAYMENT_SHEET_SELECTORS 참고.
  ["border-radius", null],
]);

/** border-radius 는 결제 시트 규칙에서만 허용한다. */
const PAYMENT_SHEET_SELECTOR_TOKENS = [
  "#cdPaidFeatureGate",
  ".cd-direct-payment-modal",
  ".golden-grain-modal__card",
];

/** 이유를 붙여 명시적으로 막는 것들 — 실패 메시지를 읽고 바로 이해할 수 있게. */
const FORBIDDEN_HINTS = [
  [/^position$/, "기능 헤더를 sticky 이름판으로, 닫기 버튼을 화면 고정칩으로 만들던 원인"],
  [/^content$/, "마크업에 없는 배지를 CSS 로 주입하던 원인"],
  [/^background/, "기능 고유 표면을 남의 색으로 재도색"],
  [/^color$/, "기능 고유 글자색을 덮음 — 표면과 어긋나면 글자가 사라진다"],
  [/^border(?!-radius)/, "기능에 없던 카드 테두리를 씌움"],
  [/^box-shadow$/, "기능 고유 깊이 표현을 덮음"],
  [/backdrop-filter$/, "이름판 블러 — 재디자인"],
  [/^letter-spacing$/, "기능 타이포를 덮음"],
  [/^font-family$/, "기능 서체를 덮음(데스크탑의 Cinzel 등이 사라진다)"],
  [/^font-weight$/, "기능 타이포를 덮음"],
  [/^line-height$/, "기능 타이포를 덮음"],
  [/^-webkit-line-clamp$/, "기능 문구를 임의로 잘라냄"],
  [/^z-index$/, "기능 레이어 순서를 덮음"],
];

const failures = [];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

/**
 * 아주 작은 CSS 규칙 스캐너.
 * 중첩(@media) 안에서도 "셀렉터 { 선언들 }" 단위만 뽑으면 충분하다 — 이 파일에는
 * @supports 중첩이나 CSS Nesting 이 없다.
 */
function* iterateRules(css) {
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRe.exec(css)) !== null) {
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    if (!selector || selector.startsWith("@")) continue;
    yield { selector, body: match[2], index: match.index };
  }
}

function lineOf(css, index) {
  return css.slice(0, index).split("\n").length;
}

function checkCssFile(relPath) {
  let css;
  try {
    css = readFileSync(path.join(repoRoot, relPath), "utf8");
  } catch (error) {
    fail(relPath, `읽을 수 없음: ${error.message}`);
    return;
  }

  // 팔레트 정의 자체가 사라졌는지 — 재도색은 여기서 다시 시작된다.
  if (/--cd-detail-[a-z-]+\s*:/.test(css)) {
    fail(
      relPath,
      "--cd-detail-* 팔레트 정의가 되살아났다. 이 토큰은 기능 상세 래퍼 전체를 재도색하던 레버다 " +
        "(카드 미리보기 자기 표면용 정의는 index.html 의 .tile-pvw-overlay 안에만 둔다).",
    );
  }

  for (const { selector, body, index } of iterateRules(css)) {
    if (!WRAPPER_SELECTOR_TOKENS.some((token) => selector.includes(token))) continue;
    const line = lineOf(css, index);
    const isPaymentSheet = PAYMENT_SHEET_SELECTOR_TOKENS.some((token) => selector.includes(token));

    const declarations = body.replace(/\/\*[\s\S]*?\*\//g, "").split(";");
    for (const raw of declarations) {
      const declaration = raw.trim();
      if (!declaration) continue;
      const colon = declaration.indexOf(":");
      if (colon < 0) continue;
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration
        .slice(colon + 1)
        .replace(/!important/gi, "")
        .trim()
        .toLowerCase();

      if (property.startsWith("--")) {
        fail(relPath, `${line}행 [${selector}] 커스텀 속성 '${property}' — 래퍼는 토큰을 정의하지 않는다.`);
        continue;
      }

      const hint = FORBIDDEN_HINTS.find(([re]) => re.test(property));
      if (hint) {
        fail(relPath, `${line}행 [${selector}] '${property}' 금지 — ${hint[1]}.`);
        continue;
      }

      if (!ALLOWED_PROPERTIES.has(property)) {
        fail(
          relPath,
          `${line}행 [${selector}] '${property}' 는 인체공학 화이트리스트에 없다. ` +
            "정말 필요하면 이 스크립트의 ALLOWED_PROPERTIES 에 사유와 함께 추가한다.",
        );
        continue;
      }

      if (property === "border-radius" && !isPaymentSheet) {
        fail(
          relPath,
          `${line}행 [${selector}] 'border-radius' 는 결제 시트 3종에만 허용한다 — 기능 모서리는 기능이 정한다.`,
        );
        continue;
      }

      const validate = ALLOWED_PROPERTIES.get(property);
      if (validate && !validate(value)) {
        fail(relPath, `${line}행 [${selector}] '${property}: ${value}' 는 허용 범위를 벗어난다.`);
      }
    }
  }
}

const SHELL_FORBIDDEN = [
  ["data-mobile-detail-badge", "마크업에 없는 배지를 속성으로 심어 CSS 가 주입하게 하던 경로"],
  ["markFallbackHeader", "숨겨진 h3 까지 top 섹션으로 승격시켜 유령 sticky 헤더를 만들던 함수"],
  ["markResultSummary", "모든 기능의 결과 첫 문장에 공용 요약칩을 붙이던 함수"],
  ["data-mobile-detail-result-summary", "공용 요약칩 훅"],
];

function checkShellFile(relPath) {
  let html;
  try {
    html = readFileSync(path.join(repoRoot, relPath), "utf8");
  } catch (error) {
    fail(relPath, `읽을 수 없음: ${error.message}`);
    return;
  }

  const block = html.match(
    /<script data-cd-marker="mobile-feature-detail-template-v20260701">([\s\S]*?)<\/script>/,
  );
  if (!block) {
    fail(relPath, "mobile-feature-detail-template 어노테이터를 찾을 수 없다.");
    return;
  }

  for (const [needle, why] of SHELL_FORBIDDEN) {
    if (block[1].includes(needle)) {
      fail(relPath, `어노테이터에 '${needle}' 이 되살아났다 — ${why}.`);
    }
  }

  if (/badge\s*:/.test(block[1])) {
    fail(relPath, "어노테이터 registry 에 badge 필드가 되살아났다 — 배지는 기능 마크업이 소유한다.");
  }
}

for (const file of CSS_FILES) checkCssFile(file);
for (const file of SHELL_FILES) checkShellFile(file);

if (failures.length) {
  console.error("모바일 상세 래퍼가 인체공학 경계를 넘었습니다:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\n모바일 최적화는 탭 타깃·입력 폰트·가로 오버플로·세이프에어리어까지입니다.\n" +
      "기능 화면은 모바일에서도 데스크탑과 같은 자기 디자인으로 보여야 합니다.\n" +
      "특정 기능의 모바일 문제라면 공용 래퍼가 아니라 그 기능의 CSS 에서 고치세요.\n",
  );
  process.exit(1);
}

console.log(
  `Mobile detail wrapper non-intrusive OK (CSS ${CSS_FILES.length}개, 셸 ${SHELL_FILES.length}개 검사).`,
);
