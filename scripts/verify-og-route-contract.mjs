#!/usr/bin/env node
/**
 * 동적 OG 카드(`GET /api/og`) 계약 가드.
 *
 * 네트워크도 wasm 도 타지 않는다 — 판정 로직은 worker/lib/og-card.js 에 갈라져 있고
 * 이 스크립트는 그 순수 함수를 그대로 실행한다. 렌더 자체(satori/resvg)는 대상이 아니다.
 *
 * 고정하는 성질:
 *   ① image 파라미터를 받지 않는다 (SSRF)
 *   ② badge·theme 은 화이트리스트뿐
 *   ③ 길이 상한이 실제로 걸린다
 *   ④ 사용자 입력이 마크업에 이스케이프되어 들어간다
 *   ⑤ 배치는 모서리를 못박는다 — 이 파서에서 space-between 은 조용히 무시된다
 *   ⑥ OG URL 헬퍼는 공유 SEO 모듈 밖에 있어야 한다
 *   ⑦ robots.txt 가 /api/og 만 연다
 *   ⑧ 라우트 배선 — 있고, CORS 래퍼를 안 거친다
 *   ⑨ 폴백 정적 카드가 실재한다
 *   ⑩ OG 소스에 리터럴 제어문자가 없다
 *
 * 실행: npm run verify:og-route-contract
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const {
  BADGES,
  DEFAULT_BADGE,
  DEFAULT_TITLE,
  DESC_MAX,
  OG_HEIGHT,
  OG_WIDTH,
  THEMES,
  TITLE_MAX,
  buildOgCardHtml,
  collectGlyphs,
  parseOgParams,
} = await import("../worker/lib/og-card.js");

const cardSource = fs.readFileSync(path.join(ROOT, "worker/lib/og-card.js"), "utf8");
const routeSource = fs.readFileSync(path.join(ROOT, "worker/routes/og.js"), "utf8");

function params(query) {
  return parseOgParams(new URLSearchParams(query));
}

/* ① image 파라미터를 받지 않는다 (SSRF) */
{
  const parsed = params("image=https://evil.example/x.png&title=hi");
  assert.ok(!("image" in parsed), "parseOgParams 가 image 를 통과시킨다 — 워커가 임의 URL 을 fetch 하게 된다");

  const html = buildOgCardHtml(parsed, "code-destiny.com");
  assert.ok(
    !html.includes("evil.example"),
    "카드 마크업에 요청이 준 원격 URL 이 들어갔다 — SSRF 경로가 열린다",
  );
  const ogSource = routeSource + cardSource;
  assert.ok(
    !ogSource.includes('searchParams.get("image")'),
    "OG 소스가 image 파라미터를 읽는다 — 원격 URL 을 받는 순간 SSRF 다",
  );
}

/* ② badge·theme 은 화이트리스트뿐 */
{
  // 🔴 대상이 0개면 통과시키는 검사는 가드가 아니다(CLAUDE.md 원칙 10).
  const badgeKeys = Object.keys(BADGES);
  assert.ok(badgeKeys.length >= 5, "badge 프리셋을 " + badgeKeys.length + "개만 찾았다 — 파서가 깨졌다");

  for (const key of badgeKeys) {
    assert.equal(params("badge=" + key).badge, BADGES[key], "프리셋 badge " + key + " 가 반영되지 않는다");
  }
  assert.equal(params("badge=<script>").badge, DEFAULT_BADGE, "모르는 badge 가 기본값으로 안 떨어진다");
  assert.equal(params("badge=").badge, DEFAULT_BADGE, "빈 badge 가 기본값으로 안 떨어진다");
  assert.equal(params("badge=SAJU").badge, BADGES.saju, "badge 대소문자 정규화가 안 된다");
  // 🔴 프로토타입 키. 단순 조회면 Object.prototype 이 truthy 로 통과해 배지가 객체가 된다.
  assert.equal(params("badge=__proto__").badge, DEFAULT_BADGE, "badge=__proto__ 가 화이트리스트를 통과했다");
  assert.equal(params("badge=constructor").badge, DEFAULT_BADGE, "badge=constructor 가 화이트리스트를 통과했다");
  assert.equal(typeof params("badge=__proto__").badge, "string", "badge 가 문자열이 아니다");

  assert.equal(params("theme=light").theme, "light");
  assert.equal(params("theme=__proto__").theme, "dark", "모르는 theme 이 기본값으로 안 떨어진다");
  assert.ok(THEMES[params("theme=nope").theme], "기본 theme 이 팔레트에 없다");
}

/* ③ 길이 상한이 실제로 걸린다 */
{
  const longTitle = "가".repeat(500);
  const longDesc = "나".repeat(500);
  const parsed = params("title=" + encodeURIComponent(longTitle) + "&desc=" + encodeURIComponent(longDesc));

  assert.equal(parsed.title.length, TITLE_MAX, "제목 상한이 안 걸린다");
  assert.equal(parsed.description.length, DESC_MAX, "설명 상한이 안 걸린다");
  assert.equal(params("").title, DEFAULT_TITLE, "제목이 비면 기본값이 나와야 한다");
  assert.equal(params("title=%20%20").title, DEFAULT_TITLE, "공백뿐인 제목이 기본값으로 안 떨어진다");

  // 제어문자는 걷어낸다.
  const withControl = params("title=" + encodeURIComponent("a\u0007b\u0000c"));
  assert.ok(!new RegExp("[\\u0000-\\u001f\\u007f]").test(withControl.title), "제어문자가 제목에 남았다");
}

/* ④ 사용자 입력이 마크업에 이스케이프되어 들어간다 */
{
  const parsed = params("title=" + encodeURIComponent('"><div style="x') + "&desc=" + encodeURIComponent("a & b"));
  const html = buildOgCardHtml(parsed, "code-destiny.com");

  assert.ok(!html.includes('"><div style="x'), "제목이 이스케이프 없이 마크업에 들어갔다");
  assert.ok(html.includes("&quot;&gt;&lt;div"), "제목 이스케이프 결과가 마크업에 없다");
  assert.ok(html.includes("a &amp; b"), "설명의 & 가 이스케이프되지 않았다");
  assert.ok(html.includes(String(OG_WIDTH) + "px") && html.includes(String(OG_HEIGHT) + "px"),
    "카드 크기가 1200x630 이 아니다");

  // 설명이 없으면 그 블록 자체가 빠져야 한다(빈 줄이 남으면 제목 위치가 흔들린다).
  const noDesc = buildOgCardHtml(params("title=hi"), "code-destiny.com");
  assert.ok(!noDesc.includes("margin-top:24px"), "설명이 없는데 설명 블록이 남았다");

  // 폰트 서브셋에 실제로 쓰인 글자가 다 들어간다.
  const glyphs = collectGlyphs(parsed, "code-destiny.com");
  for (const ch of parsed.title + parsed.badge) {
    assert.ok(glyphs.includes(ch), "서브셋 글자 목록에 " + JSON.stringify(ch) + " 가 빠졌다 — 그 글자가 두부로 렌더된다");
  }
}

/* ⑤ 배치는 모서리를 못박는다 — 이 파서에서 space-between 은 조용히 무시된다 */
{
  const html = buildOgCardHtml(params("title=hi&desc=there"), "code-destiny.com");
  assert.ok(
    !html.includes("space-between"),
    "카드 마크업이 justify-content:space-between 을 쓴다 — workers-og 파서에서 조용히 무시돼 "
      + "푸터가 가운데로 몰린다(2026-08-28 로컬 렌더 4회로 확인). left/right/top/bottom 으로 못박을 것",
  );
  for (const anchor of ["left:80px", "right:80px", "top:72px", "bottom:72px"]) {
    assert.ok(html.includes(anchor), "카드 마크업에 " + anchor + " 가 없다 — 모서리 고정이 풀렸다");
  }
}

/* ⑥ OG URL 헬퍼는 공유 SEO 모듈 밖에 있어야 한다 */
{
  const seoV2 = fs.readFileSync(path.join(ROOT, "lib/seo.v2.ts"), "utf8");
  assert.ok(
    !seoV2.includes("buildDynamicOgImageUrl"),
    "buildDynamicOgImageUrl 이 lib/seo.v2.ts 에 있다 — 그 파일은 118개 페이지의 import 클로저에 "
      + "들어 있어서 한 줄만 더해도 사이트맵 lastmod 118건이 오늘로 밀린다(구글에 거짓 신선도 신호). "
      + "2026-08-28 에 실제로 verify:sitemap-drift 가 PR CI 를 막았다. lib/seo/dynamicOgImage.ts 에 둘 것",
  );

  const helper = fs.readFileSync(path.join(ROOT, "lib/seo/dynamicOgImage.ts"), "utf8");
  assert.ok(
    helper.includes("export function buildDynamicOgImageUrl"),
    "lib/seo/dynamicOgImage.ts 가 buildDynamicOgImageUrl 을 내보내지 않는다",
  );
  assert.ok(
    helper.includes("/api/og?"),
    "OG URL 헬퍼가 /api/og 를 가리키지 않는다 — 워커 라우트와 어긋났다",
  );
}

/* ⑦ robots.txt 가 /api/og 만 연다 */
{
  const robots = fs.readFileSync(path.join(ROOT, "app/robots.ts"), "utf8");
  assert.ok(
    robots.includes('"/api/og"'),
    "app/robots.ts 가 /api/og 를 허용하지 않는다 — 구글이 og:image 를 못 읽어 리치 결과 썸네일이 죽는다",
  );
  assert.ok(
    robots.includes('"/api/",'),
    "app/robots.ts 의 /api/ Disallow 가 사라졌다 — 나머지 API 가 색인 대상이 된다",
  );
  // 훈련 전용 크롤러 전면 차단은 그대로여야 한다.
  assert.ok(robots.includes('disallow: ["/"],'), "TRAINING_ONLY_CRAWLERS 차단이 사라졌다");
}

/* ⑧ 라우트 배선 — 있고, CORS 래퍼를 안 거친다 */
{
  const workerIndex = fs.readFileSync(path.join(ROOT, "worker/index.js"), "utf8");
  const marker = 'url.pathname === "/api/og"';
  assert.ok(workerIndex.includes(marker), "worker/index.js 에 /api/og 분기가 없다 — 라우트가 도달 불가다");

  const block = workerIndex.split(marker)[1].split("}")[0];
  assert.ok(
    !block.includes("withCorsHeaders"),
    "/api/og 가 withCorsHeaders 를 거친다 — 그 래퍼는 Cache-Control 이 없을 때 no-store 를 붙인다",
  );
  assert.ok(
    routeSource.includes('"public, max-age=31536000, immutable"'),
    "OG 응답에 장기 캐시 헤더가 없다 — 스크래퍼가 올 때마다 다시 렌더한다",
  );
}

/* ⑨ 폴백 정적 카드가 실재한다 */
{
  const match = routeSource.match(/FALLBACK_OG_PATH = "([^"]+)"/);
  assert.ok(match, "FALLBACK_OG_PATH 를 찾지 못했다 — 이 가드가 낡았다");

  const fallbackFile = path.join(ROOT, "public", match[1].replace(/^\//, ""));
  assert.ok(
    fs.existsSync(fallbackFile),
    "폴백 OG 이미지가 없다: " + match[1] + " — 렌더가 실패하면 공유 카드가 통째로 깨진다",
  );
  assert.ok(routeSource.includes("status: 302"), "렌더 실패 시 폴백으로 넘기지 않는다");
}

/* ⑩ OG 소스에 리터럴 제어문자가 없다 */
{
  const STRAY = new RegExp("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]", "g");
  for (const [name, source] of [["worker/lib/og-card.js", cardSource], ["worker/routes/og.js", routeSource]]) {
    const stray = source.match(STRAY);
    assert.ok(
      !stray,
      name + " 에 리터럴 제어문자가 " + (stray || []).length + "개 있다 — git 이 바이너리로 취급해 diff 가 사라진다",
    );
  }
}

console.log("[verify-og-route-contract] 통과 — image 미수용 · 프리셋 화이트리스트 · 길이 상한 · 이스케이프 · 모서리 고정 · 헬퍼 격리 · robots 예외 · 배선/캐시 · 폴백 실재 · 제어문자 0");
