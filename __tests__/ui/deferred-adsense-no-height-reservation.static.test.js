/**
 * DeferredAdsense 의 래퍼가 **높이를 예약하지 않는지** 검증한다.
 *
 * 왜 이 가드가 있나 (2026-08-28 프로덕션 실측):
 * 이 컴포넌트는 서버에서 null 을 돌려주고 하이드레이션 뒤에야 나타난다. 그래서 래퍼에 높이를
 * 예약하면 그 예약이 곧 레이아웃 이동이 된다 — `<main>` 이 y=61 -> y=311 로 밀리면서
 * /fortune/today/ 와 /insights/ 의 CLS 가 **0.275** 였다(기준 0.1, "poor" 구간).
 *
 * 예약이 값을 하지도 못했다. 래퍼가 감싸는 것은 `next/script` 하나뿐이고 그 스크립트는 문서
 * 전역에 주입되므로 이 자리에는 아무것도 그려지지 않는다. 15초를 기다려도 박스는 자식 0개 ·
 * innerHTML 0바이트였고, 같은 페이지의 실제 광고는 `ins.adsbygoogle` 1개 + 구글 iframe 2개로
 * 바깥에 떠 있었다. minHeight 는 원래 CLS 를 막으려고 8f43f883b 에서 들어왔는데 정반대로
 * 동작하고 있었다.
 *
 * 🔴 광고가 실제로 이 자리에 들어오게 되면 이 가드를 지우기 전에 **서버에서도 같은 높이를
 *    렌더하도록** 먼저 고칠 것. 클라이언트에서만 나타나는 예약은 언제나 이동을 만든다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const file = path.join(root, "app", "components", "DeferredAdsense.tsx");

/** 주석을 걷어낸 소스. 주석에는 "minHeight 를 두지 말 것" 같은 설명이 일부러 들어 있다. */
function codeWithoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\n)\s*\/\/[^\n]*/g, "$1");
}

test("DeferredAdsense 래퍼는 높이를 예약하지 않는다 (CLS 0.275 재발 방지)", () => {
  const source = fs.readFileSync(file, "utf8");
  assert.ok(source.includes("export default function DeferredAdsense"), "검사 대상을 못 찾았다 — 가드가 헛돌고 있다");

  const code = codeWithoutComments(source);
  for (const property of ["minHeight", "min-height", "height:", "aspectRatio", "aspect-ratio"]) {
    assert.ok(
      !code.includes(property),
      `DeferredAdsense 가 ${property} 로 높이를 예약한다 — 서버에서 null 을 돌려주는 컴포넌트라 그 예약이 곧 CLS 다`,
    );
  }
});

test("DeferredAdsense 는 여전히 서버에서 렌더되지 않는다 (가드의 전제)", () => {
  const source = fs.readFileSync(file, "utf8");
  assert.ok(source.startsWith('"use client"'), "클라이언트 컴포넌트가 아니게 됐다 — 위 가드의 전제를 다시 볼 것");
  assert.match(
    source,
    /if \(!documentAllowsAdsense \|\| !viewerAllowsAdsense\) return null;/,
    "하이드레이션 전 null 반환 경로가 사라졌다 — 사라졌다면 높이 예약이 오히려 옳을 수 있으니 실측부터 할 것",
  );
});
