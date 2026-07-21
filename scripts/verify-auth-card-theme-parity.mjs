/**
 * 로그인 카드(.cd-user-card) 테마 정합 가드
 *
 * 배경:
 *   연이/네오 두 모드를 같은 모습으로 통일하는 규칙이 index.html 문서 끝 블록에 있는데,
 *   실제로는 데스크톱에서 적용되지 않아 "밝은 배경 + 다크용 연보라 글씨"가 나왔다.
 *   원인은 눈으로 읽어서는 잘 안 보이는 두 가지였다.
 *
 *     1) `html html body …` — html 은 html 의 자손이 될 수 없어 어떤 DOM 에서도 매칭되지 않는다.
 *     2) 통일 규칙의 특이도가 배경을 밝히는 기존 규칙보다 낮아 뒤에 있어도 지지 않는다.
 *
 *   배경만 이기고 글자색이 지면 가독성이 오히려 나빠지므로(=반쪽 오버라이드),
 *   배경과 텍스트 계열이 함께 이기는지도 확인한다.
 *
 * 실행: npm run verify:auth-card-theme
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = readFileSync(resolve(root, "index.html"), "utf8");

console.log("=== 로그인 카드 테마 정합 검증 ===\n");

/* [1] 절대 매칭되지 않는 선택자 */
// html 요소는 문서에 하나뿐이므로 `html html`, `body body` 같은 조합은 죽은 규칙이다.
const NEVER_MATCHING = [/html\s+html\s/g, /body\s+body\s/g];
for (const pattern of NEVER_MATCHING) {
  const hits = source.match(pattern) || [];
  assert.equal(
    hits.length,
    0,
    `절대 매칭되지 않는 선택자가 있습니다(${hits.length}건): ${pattern}\n`
    + "  html/body 는 자기 자신의 자손이 될 수 없습니다. 특이도를 올리려면 id·속성·타입 선택자를 쓰세요.",
  );
}
console.log("[1] 죽은 선택자(html html / body body) 없음 OK");

/* 선택자 특이도 (a,b,c) 계산 — :not() 은 괄호 안 내용으로 친다. */
function specificity(selector) {
  let s = String(selector).trim();
  s = s.replace(/::[a-z-]+/g, "");            // 유사요소는 c 로 따로 세지 않는다(비교에 영향 없음)
  s = s.replace(/:not\(([^)]*)\)/g, " $1 ");  // :not() 은 인자 특이도를 그대로 물려받는다
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+/g) || []).length
    + (s.match(/\[[^\]]+\]/g) || []).length
    + (s.match(/:[a-z-]+(\([^)]*\))?/g) || []).length;
  const types = (s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:[a-z-]+(\([^)]*\))?/g, "")
    .match(/\b[a-z][\w-]*/g) || []).length;
  return [ids, classes, types];
}

function compare(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/* [2] 통일 블록이 실제로 이기는가
   비교 대상은 "연이 모드에서 .cd-user-card 계열에 색을 칠하는 모든 규칙"이다.
   같은 특이도면 뒤에 오는 쪽이 이기므로, 통일 블록은 문서 끝에 있어야 한다. */
const parityStart = source.indexOf('<style id="cd-user-card-yeon-pink-v20260721">');
assert.ok(parityStart > 0, "로그인 카드 통일 블록(cd-user-card-yeon-pink-v20260721)을 찾지 못했습니다.");
const parityEnd = source.indexOf("</style>", parityStart);
const parityBlock = source.slice(parityStart, parityEnd);

function cardSelectorsIn(text) {
  return (text.match(/^[^{}\n]*\.cd-user-card(?![\w-])[^{}\n]*(?=[,{])/gm) || [])
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("/*"));
}

const parityAll = cardSelectorsIn(parityBlock);
assert.ok(parityAll.length > 0, "통일 블록에 .cd-user-card 선택자가 없습니다.");

// 특이도가 같으면 뒤에 오는 규칙이 이긴다. 따라서 통일 블록은 연이 전용 규칙보다
// 항상 뒤에 있어야 한다(파일 어디에 두든 순서만 지키면 된다).
const competitorsAll = cardSelectorsIn(source)
  .filter((sel) => sel.includes(":not(.neo-mode)"))
  .filter((sel) => {
    const at = source.indexOf(sel);
    return at >= 0 && (at < parityStart || at > parityEnd);
  });

const lastCompetitorAt = competitorsAll.reduce((max, sel) => Math.max(max, source.lastIndexOf(sel)), -1);
assert.ok(
  parityStart > lastCompetitorAt,
  "통일 블록보다 뒤에 연이 전용 규칙이 있습니다 — 특이도가 같으면 뒤엣것이 이겨 통일이 깨집니다.",
);

/* 모바일 런타임 클래스(html.cd-mobile-runtime.mobile-safe-render)를 요구하는 규칙은
   그 클래스가 붙은 화면에서만 살아난다. 일반 화면(좁은 데스크톱 창 포함)에서는
   그 규칙도, 그것을 겨냥한 통일 선택자도 함께 빠지므로 시나리오를 나눠 비교한다.
   실제 버그가 났던 곳이 바로 이 "일반 화면" 경로였다. */
const SCENARIOS = [
  {
    name: "일반 화면(모바일 런타임 클래스 없음)",
    keep: (sel) => !sel.includes("cd-mobile-runtime"),
  },
  {
    name: "모바일 런타임 화면",
    keep: () => true,
  },
];

for (const scenario of SCENARIOS) {
  const parityHere = parityAll.filter(scenario.keep);
  const competitorsHere = competitorsAll.filter(scenario.keep);
  assert.ok(parityHere.length > 0, `${scenario.name}: 통일 블록에 적용 가능한 선택자가 없습니다.`);

  const best = parityHere.map(specificity).reduce((a, b) => (compare(b, a) > 0 ? b : a));
  const losers = competitorsHere.filter((sel) => compare(best, specificity(sel)) < 0);

  assert.deepEqual(
    losers.map((s) => `(${specificity(s).join(",")}) ${s}`),
    [],
    `${scenario.name}: 통일 블록보다 특이도가 높은 연이 전용 규칙이 남아 있습니다.\n`
    + "  배경만 밝아지고 글자색이 다크로 남아 가독성이 무너집니다.\n"
    + `  통일 블록 최강 선택자 특이도: (${best.join(",")})`,
  );
  console.log(`[2] ${scenario.name}: 통일 (${best.join(",")}) > 경쟁 ${competitorsHere.length}건 OK`);
}

/* [3] 반쪽 오버라이드 금지 — 표면과 글자가 함께 뒤집혀야 한다 */
const TEXT_PARTS = [
  "cd-user-card__greeting",
  "cd-user-card__name",
  "cd-user-card__tagline",
  "cd-user-card__welcome-chip",
  "cd-user-card__pass-line",
];
for (const part of TEXT_PARTS) {
  assert.ok(
    parityBlock.includes(part),
    `통일 블록에 ${part} 가 없습니다 — 배경만 바뀌고 글자색이 남으면 가독성이 더 나빠집니다.`,
  );
}
assert.ok(/background\s*:/.test(parityBlock), "통일 블록이 표면(background)을 정의하지 않습니다.");
console.log(`[3] 표면 + 텍스트 ${TEXT_PARTS.length}종 동시 정의 OK`);

console.log("\n로그인 카드 테마 정합 검증 통과.\n");
