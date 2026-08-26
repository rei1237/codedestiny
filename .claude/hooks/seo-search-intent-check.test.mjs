#!/usr/bin/env node
/**
 * seo-search-intent-check.mjs 파이프 테스트.
 *
 * 실행: node --test .claude/hooks/seo-search-intent-check.test.mjs
 * `npm run test:node` 의 `.claude/hooks/*.test.mjs` 글롭에 걸려 PR CI 에서도 돈다.
 *
 * 🔴 판정 기준이 guard-costly-commands / guard-image-read 와 다르다. 저것들은 fail-closed 라
 * 입력이 깨지면 `ask` 가 나와야 하지만, 이 훅은 **차단하지 않는 리마인더**다 — 언제나 exit 0 이고
 * 깨진 입력의 기대값은 "ask" 가 아니라 **무출력**이다. 여기서 FAIL 이 뜨는 건 "안전하지 않다"가
 * 아니라 "시끄럽거나 반대로 조용하다"는 뜻이다.
 *
 * QUIET 케이스 절반은 **실측으로 잡은 오탐**이다 — `<title>`(레포 68개 파일)과
 * `alt="`(74개 파일)를 내용 패턴에 두면 SVG 접근성 수정과 순수 UI alt 수정마다 뜬다.
 * 그 케이스를 지우면 패턴을 되살려도 아무도 모른다. 지우지 말 것.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "seo-search-intent-check.mjs");

function run(input) {
  const result = spawnSync(process.execPath, [HOOK], { input, encoding: "utf8" });
  return {
    fired: result.stdout.includes("additionalContext"),
    status: result.status,
    stdout: result.stdout,
  };
}

function edit(filePath, text) {
  return JSON.stringify({
    tool_name: "Edit",
    tool_input: { file_path: filePath, old_string: "", new_string: text },
  });
}

function write(filePath, text) {
  return JSON.stringify({
    tool_name: "Write",
    tool_input: { file_path: filePath, content: text },
  });
}

/** [설명, 페이로드] — 리마인더가 떠야 하는 것 */
const FIRE = [
  // 경로만으로 켠다 (STRONG_PATH_PATTERNS) — 내용이 SEO 와 무관해도 켜야 한다
  ["사이트맵 생성기", edit("scripts/generate-sitemap.mjs", "const a = 1;")],
  ["robots.txt", write("public/robots.txt", "User-agent: *")],
  ["SEO 문맥 문서", edit("docs/context/seo-and-adsense.md", "문단 하나 고침")],
  ["seo- 접두 모듈", edit("lib/seo-site-urls.ts", "export const x = [];")],
  ["구조화 데이터 모듈", edit("lib/structured-data.ts", "const x = 1;")],
  // 아직 레포에 없는 경로다 — Next 규약상 새로 생길 수 있어 패턴을 선제적으로 고정해 둔다
  ["opengraph 이미지", write("app/opengraph-image.tsx", "export default function Image() {}")],

  // 내용으로 켠다 (CONTENT_PATTERNS) — 경로는 평범한 페이지다
  ["generateMetadata", write("app/foo/page.tsx", "export async function generateMetadata() {}")],
  ["metadata export", edit("app/foo/layout.tsx", "export const metadata = { title: 'x' }")],
  ["meta description", edit("index.html", '<meta name="description" content="x">')],
  ["meta keywords", edit("index.html", '<meta name="keywords" content="사주">')],
  ["og:title", edit("index.html", '<meta property="og:title" content="x">')],
  ["twitter:card", edit("index.html", '<meta name="twitter:card" content="summary">')],
  ["ld+json", edit("index.html", '<script type="application/ld+json">{}</script>')],
  ["canonical", edit("index.html", '<link rel="canonical" href="/">')],
  ["schema.org URL", edit("worker/routes.js", 'const s = "https://schema.org/Article";')],
  ["Disallow 지시문", write("some/file.txt", "User-agent: *\nDisallow: /admin")],
  ["Sitemap 지시문", write("some/file.txt", "Sitemap: https://code-destiny.com/sitemap.xml")],
  ["한국어 신호 — 메타 디스크립션", edit("docs/plan.md", "메타 디스크립션을 다시 쓴다")],
  ["한국어 신호 — 구조화 데이터", edit("docs/plan.md", "구조화 데이터를 붙인다")],
];

/** [설명, 페이로드] — 조용해야 하는 것 */
const QUIET = [
  // 평범한 작업
  ["UI 클래스 수정", edit("components/Button.tsx", "className='px-3'")],
  ["워커 로직", edit("worker/lib/vedic-chart.js", "const deg = 360;")],
  ["결제 모듈", write("lib/payment/pass.ts", "export function hasPass() { return false; }")],
  // JSON 사전의 "description" 키는 <meta name="description"> 이 아니다
  ["로케일 사전의 description 키", edit("locales/ko.json", '"description": "타로 카드 해설"')],
  // `/structured-data/i` 는 하이픈 형태만 잡는다. 이름이 비슷하지만 SEO 와 무관한 파일을 끌고 오면 안 된다
  ["structured-consultation (이름만 비슷)", edit("worker/lib/structured-consultation.js", "const x = 1;")],

  // 🔴 실측 오탐 — 2026-08-26 에 이 두 패턴을 뺀 이유다. 되살리면 여기서 걸린다
  ["SVG 접근성 title", edit("components/Icon.tsx", "<title>닫기</title>")],
  ["SVG 로고 title", edit("components/Logo.tsx", "<svg><title>로고</title></svg>")],
  ["이미지 alt (접근성)", edit("components/Card.tsx", '<img alt="연이 캐릭터" src="/a.png" />')],
  ["next/image alt", edit("app/gallery/page.tsx", "<Image alt='타로 카드' />")],

  // 매처 밖 도구는 건드리지 않는다
  ["Read 는 무시", JSON.stringify({ tool_name: "Read", tool_input: { file_path: "scripts/generate-sitemap.mjs" } })],
  ["Bash 는 무시", JSON.stringify({ tool_name: "Bash", tool_input: { command: "node scripts/generate-sitemap.mjs" } })],
];

/** 입력이 망가져도 차단하지 않는다 — 리마인더 훅이라 fail-OPEN 이 맞다. */
const MALFORMED = [
  ["깨진 JSON", "{not json"],
  ["빈 입력", ""],
  ["tool_input 누락", JSON.stringify({ tool_name: "Edit" })],
  ["tool_name 누락", JSON.stringify({ tool_input: { file_path: "sitemap.xml" } })],
  ["tool_input 이 배열", JSON.stringify({ tool_name: "Edit", tool_input: [] })],
];

for (const [label, payload] of FIRE) {
  test(`발동: ${label}`, () => {
    const out = run(payload);
    assert.equal(out.status, 0, "훅은 절대 죽으면 안 된다");
    assert.ok(out.fired, "리마인더가 떠야 한다");
  });
}

for (const [label, payload] of QUIET) {
  test(`침묵: ${label}`, () => {
    const out = run(payload);
    assert.equal(out.status, 0, "훅은 절대 죽으면 안 된다");
    assert.ok(!out.fired, "무관한 편집에 리마인더가 뜨면 안 읽히게 된다");
  });
}

test("MultiEdit 은 edits[] 안의 new_string 을 본다", () => {
  const out = run(
    JSON.stringify({
      tool_name: "MultiEdit",
      tool_input: {
        file_path: "app/foo/page.tsx",
        edits: [
          { old_string: "a", new_string: "b" },
          { old_string: "c", new_string: 'export const metadata = { title: "x" }' },
        ],
      },
    })
  );
  assert.equal(out.status, 0);
  assert.ok(out.fired);
});

test("MultiEdit 이라도 SEO 신호가 없으면 조용하다", () => {
  const out = run(
    JSON.stringify({
      tool_name: "MultiEdit",
      tool_input: {
        file_path: "components/Button.tsx",
        edits: [{ old_string: "px-2", new_string: "px-3" }],
      },
    })
  );
  assert.equal(out.status, 0);
  assert.ok(!out.fired);
});

test("alt 완화가 과하지 않다 — 같은 파일이라도 진짜 메타데이터면 켜진다", () => {
  const out = run(edit("components/Card.tsx", '<img alt="x"><meta name="description" content="y">'));
  assert.equal(out.status, 0);
  assert.ok(out.fired);
});

for (const [label, input] of MALFORMED) {
  test(`fail-open: ${label}`, () => {
    const out = run(input);
    assert.equal(out.status, 0, "리마인더 훅은 입력이 깨져도 통과시켜야 한다");
    assert.equal(out.stdout.trim(), "", "판단 근거가 없을 때 리마인더를 띄우면 안 된다");
  });
}

test("빠뜨린 패턴이 없다 — 훅의 패턴 개수를 고정한다", async () => {
  const src = await import("node:fs").then((fs) => fs.readFileSync(HOOK, "utf8"));
  const strong = src.split("STRONG_PATH_PATTERNS = [")[1].split("];")[0];
  const content = src.split("CONTENT_PATTERNS = [")[1].split("];")[0];
  // 패턴을 늘리거나 줄이면 여기서 걸린다 — 위 케이스 표도 함께 갱신하라는 신호다.
  assert.equal(strong.split("\n").filter((l) => l.trim().startsWith("/")).length, 7);
  assert.equal(content.split("\n").filter((l) => l.trim().startsWith("/")).length, 12);
});
