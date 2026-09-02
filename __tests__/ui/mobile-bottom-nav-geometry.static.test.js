/**
 * App Router 하단 탭바(.cd-mnav)의 높이 토큰이 실제 바보다 짧아지는 것을 막는다.
 *
 * 🔴 실제로 났던 사고(2026-09-03 실측): `--cd-mnav-bar-h: 56px` 은 바 자신의 세로 패딩
 *    (위 6px + 아래 8px)을 빼먹은 값이었다. 바의 실제 바깥 높이는 64.1px 이었고,
 *    - `--cd-mnav-offset`(= bar-h + safe-area)을 쓰는 14곳의 플로팅 UI 가 전부 8.1px 씩 바에 걸쳤고,
 *    - `body.cd-mnav-mounted` 의 여백(56+8=64px)이 바 높이와 같아 본문 여유가 0px 이었다.
 *    두 값 다 "손으로 계산한 상수"라 아무 검사도 물지 않았다.
 *
 * 🔴 한계: CSS 만 읽으므로 `.cd-mnav__link` 의 **내용물**이 min-height 를 넘겨 자라는 경우는
 *    못 본다(실측 49~50px 로 48px 을 조금 넘긴다). 여기서 막는 것은 "토큰이 선언된 부품의
 *    합보다 짧은" 경우다 — 56 < 6+48+8 이었던 그 사고가 정확히 이 형태였다.
 *    렌더 실측은 `node scripts/measure-mobile-routes.mjs --routes=/about/ --insets=0,47` 로 한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CSS_PATH = path.join(process.cwd(), "styles", "mobile-bottom-nav.css");
/** measure-mobile-routes.mjs 의 MIN_GAP 과 같은 값. 둘이 갈라지면 스캐너가 경고를 낸다. */
const MIN_GAP_PX = 12;

const css = fs.readFileSync(CSS_PATH, "utf8");

/** 선택자 하나의 선언 블록을 통째로 꺼낸다. 못 찾으면 실패한다(fail-closed). */
function block(selector) {
  const index = css.indexOf(`\n${selector} {`);
  assert.notEqual(index, -1, `${CSS_PATH}: 선택자 '${selector}' 블록을 못 찾았다 — 이름이 바뀌었으면 이 검사도 함께 고친다`);
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  assert.notEqual(end, -1, `${CSS_PATH}: '${selector}' 블록이 안 닫혔다`);
  return css.slice(start + 1, end);
}

/** `calc(<N>px + env(safe-area-inset-bottom...` 형태에서 N 을 꺼낸다. */
function safeAreaBase(text, what) {
  const match = text.match(/calc\(\s*(-?[\d.]+)px\s*\+\s*env\(safe-area-inset-bottom/);
  assert.ok(match, `${CSS_PATH}: ${what} 에서 calc(Npx + env(safe-area-inset-bottom ...) 를 못 읽었다`);
  return Number(match[1]);
}

function pxDeclaration(text, property, what) {
  const match = text.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*(-?[\\d.]+)px`));
  assert.ok(match, `${CSS_PATH}: ${what} 의 ${property} 를 px 값으로 못 읽었다`);
  return Number(match[1]);
}

test("탭바 자신의 하단 여유가 MIN_GAP 이상이다", () => {
  const nav = block(".cd-mnav");
  const bottomBase = safeAreaBase(nav, ".cd-mnav 의 padding");
  assert.ok(
    bottomBase >= MIN_GAP_PX,
    `.cd-mnav 하단 패딩 기본값 ${bottomBase}px < ${MIN_GAP_PX}px — 탭 라벨이 safe-area 경계에 붙는다`,
  );
});

test("본문 여백이 탭바를 덮고도 MIN_GAP 이 남는다", () => {
  const body = block("body.cd-mnav-mounted");
  const match = body.match(/padding-bottom:\s*calc\(\s*var\(--cd-mnav-bar-h\)\s*\+\s*(-?[\d.]+)px/);
  assert.ok(match, `${CSS_PATH}: body.cd-mnav-mounted 의 padding-bottom 이 var(--cd-mnav-bar-h) + Npx 꼴이 아니다`);
  const clearance = Number(match[1]);
  assert.ok(
    clearance >= MIN_GAP_PX,
    `body.cd-mnav-mounted 여유 ${clearance}px < ${MIN_GAP_PX}px — 본문 마지막 줄이 탭바에 붙는다`,
  );
});

test("--cd-mnav-bar-h 가 선언된 부품의 합보다 짧지 않다", () => {
  const root = block(":root");
  const barH = pxDeclaration(root, "--cd-mnav-bar-h", ":root");
  const nav = block(".cd-mnav");
  const topPad = pxDeclaration(nav, "padding", ".cd-mnav"); // shorthand 의 첫 값 = 상단
  const bottomBase = safeAreaBase(nav, ".cd-mnav 의 padding");
  const linkMinHeight = pxDeclaration(block(".cd-mnav__link"), "min-height", ".cd-mnav__link");
  const parts = topPad + linkMinHeight + bottomBase;
  assert.ok(
    barH >= parts,
    `--cd-mnav-bar-h ${barH}px < 상단패딩 ${topPad} + 링크 ${linkMinHeight} + 하단여유 ${bottomBase} = ${parts}px.\n` +
      "  이 토큰은 --cd-mnav-offset 을 거쳐 플로팅 UI 14곳의 bottom 이 되므로, 짧으면 그만큼 전부 탭바에 걸친다.",
  );
});
