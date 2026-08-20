#!/usr/bin/env node
/**
 * 스테이징 배포본을 색인·광고에서 빼낸다. 빌드 산출물(dist/)만 고치고 소스는 건드리지 않는다.
 *
 * 왜 dist 단계인가 — 홈은 정적 셸의 승격본이고 나머지는 Next 정적 export 라 로봇 메타의
 * 출처가 한 곳이 아니다. 산출물에서 한 번에 처리하면 출처를 따질 필요가 없고, 소스와 미러가
 * 그대로 남아 셸을 문자열로 읽는 가드들이 계속 원본을 본다.
 *
 * 🔴 광고를 따로 끄지 않는다. app/components/DeferredAdsense.tsx 의 currentDocumentAllowsAdsense
 *    가 이미 `<meta name="robots">` 에 noindex/nofollow 가 있으면 스크립트를 **로드조차 하지
 *    않는다.** 여기서 메타를 넣는 것이 곧 광고 차단이다. 별도 계층을 덧대면 같은 판정이 두 곳이
 *    되고, 언젠가 한쪽만 바뀐다(CLAUDE.md 코딩 원칙 6).
 *
 * 실행: 프로덕션 빌드에서는 돌지 않는다. scripts/run-postbuild.mjs 가 CD_DEPLOY_TARGET=staging
 * 일 때만 마지막 단계로 추가하며, 그 값은 scripts/deploy-safe.mjs 가 --stage 에서 직접 넣는다.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const TAG = "[apply-staging-noindex]";

const ROBOTS_BODY = [
  "# 스테이징 배포본입니다. 색인 대상이 아닙니다.",
  "# 정본은 https://code-destiny.com 이며, 이 파일은 scripts/apply-staging-noindex.mjs 가 씁니다.",
  "",
  "User-agent: *",
  "Disallow: /",
  "",
].join("\n");

const ROBOTS_META = '<meta name="robots" content="noindex,nofollow">';
const ROBOTS_TAG_HEADER = "  X-Robots-Tag: noindex, nofollow";

/** 이미 있는 robots/googlebot 메타는 통째로 갈아끼운다. 남겨 두면 index 가 함께 선언된다. */
const EXISTING_ROBOTS_META_RE = /<meta[^>]+name=["'](?:robots|googlebot)["'][^>]*>/gi;

export function rewriteHtml(html) {
  let next = html.replace(EXISTING_ROBOTS_META_RE, "");

  const headIndex = next.search(/<head[^>]*>/i);
  if (headIndex === -1) {
    // <head> 가 없는 조각 파일은 건드리지 않는다. 헤더(X-Robots-Tag)가 덮는다.
    return { html, changed: false };
  }

  const insertAt = next.indexOf(">", headIndex) + 1;
  next = next.slice(0, insertAt) + ROBOTS_META + next.slice(insertAt);
  return { html: next, changed: true };
}

/**
 * `_headers` 의 `/*` 블록 본문 줄 범위(헤더 줄은 들여쓰기로 이어진다). 블록이 없으면 null.
 */
function globBlockRange(lines) {
  const start = lines.findIndex((line) => line.trim() === "/*");
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && /^[ \t]/.test(lines[end])) end += 1;
  return { start, end };
}

function globHasRobotsTag(lines, range) {
  return lines.slice(range.start + 1, range.end).some((line) => /^\s*X-Robots-Tag:\s*noindex/i.test(line));
}

/**
 * `/*` 블록에 전역 X-Robots-Tag 를 넣는다.
 *
 * 🔴 존재 판정은 반드시 `/*` 블록 **안에서만** 한다. 예전에는 파일 전체에
 * `text.includes("X-Robots-Tag:")` 를 했는데, 이 레포의 `_headers` 에는 얇은 화면 20여
 * 경로(`/premium*`·`/pdf*`·`/maya` …)에 그 헤더가 **이미** 있다. 그래서 스테이징 빌드는
 * 매번 "이미 있음"으로 건너뛰었고 전역 헤더는 한 번도 붙지 않았다 — 스크립트는 OK 를
 * 찍었고 배포도 성공했는데 `/` 응답에만 헤더가 없었다(2026-08-20 run 32359573695).
 *
 * 🔴 `/*` 블록이 없으면 조용히 넘기지 않는다. 넣을 자리가 없다는 것은 스테이징이 전역
 * 헤더 없이 나간다는 뜻이고, 그걸 통과시키는 것은 가드가 아니다.
 */
export function rewriteHeaders(text) {
  const lines = text.split(/\r?\n/);
  const range = globBlockRange(lines);
  if (!range) {
    throw new Error("_headers 에 `/*` 블록이 없습니다. 전역 X-Robots-Tag 를 넣을 자리가 없으면 스테이징이 헤더 없이 나갑니다.");
  }
  if (globHasRobotsTag(lines, range)) return { text, changed: false };

  lines.splice(range.start + 1, 0, ROBOTS_TAG_HEADER);
  return { text: lines.join("\n"), changed: true };
}

/**
 * 쓰고 난 산출물을 **다시 읽어** 확인한다. 이번 사고의 본체는 잘못된 판정이 아니라,
 * 그 판정이 틀렸는데도 스크립트가 OK 를 찍고 넘어간 것이다.
 */
function assertGlobRobotsTag(text) {
  const lines = text.split(/\r?\n/);
  const range = globBlockRange(lines);
  if (!range || !globHasRobotsTag(lines, range)) {
    throw new Error("_headers 의 `/*` 블록에 X-Robots-Tag: noindex 가 없습니다. 스테이징 응답에 전역 색인 차단 헤더가 붙지 않습니다.");
  }
}

function listHtmlFiles(distDir) {
  return readdirSync(distDir, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.toLowerCase().endsWith(".html"))
    .map((entry) => join(distDir, entry));
}

function applyTo(distDir) {
  const robotsPath = join(distDir, "robots.txt");
  writeFileSync(robotsPath, ROBOTS_BODY, "utf8");

  const headersPath = join(distDir, "_headers");
  if (!existsSync(headersPath)) {
    throw new Error(`${headersPath} 가 없습니다. 전역 X-Robots-Tag 를 넣을 파일이 없으면 스테이징이 헤더 없이 나갑니다.`);
  }
  const headersResult = rewriteHeaders(readFileSync(headersPath, "utf8"));
  if (headersResult.changed) writeFileSync(headersPath, headersResult.text, "utf8");
  const headersChanged = headersResult.changed;
  assertGlobRobotsTag(readFileSync(headersPath, "utf8"));

  let htmlChanged = 0;
  let htmlSkipped = 0;
  for (const filePath of listHtmlFiles(distDir)) {
    const result = rewriteHtml(readFileSync(filePath, "utf8"));
    if (!result.changed) {
      htmlSkipped += 1;
      continue;
    }
    writeFileSync(filePath, result.html, "utf8");
    htmlChanged += 1;
  }

  return { headersChanged, htmlChanged, htmlSkipped };
}

// ── self-test ────────────────────────────────────────────────────────────────

function runSelfTest() {
  const failures = [];
  const expect = (condition, message) => { if (!condition) failures.push(message); };

  const injected = rewriteHtml('<!doctype html><html><head><title>x</title></head><body>b</body></html>');
  expect(injected.changed, "head 가 있으면 메타를 넣어야 한다.");
  expect(injected.html.includes(ROBOTS_META), "noindex 메타가 들어가야 한다.");

  const replaced = rewriteHtml('<html><head><meta name="robots" content="index,follow"></head></html>');
  expect(!/content="index,follow"/.test(replaced.html), "기존 index 메타는 남으면 안 된다.");
  expect((replaced.html.match(/name="robots"/g) || []).length === 1, "robots 메타는 하나만 남아야 한다.");

  const googlebot = rewriteHtml('<html><head><meta name="googlebot" content="index"></head></html>');
  expect(!/name="googlebot"/.test(googlebot.html), "googlebot 메타도 갈아끼워야 한다.");

  const headless = rewriteHtml("<div>fragment</div>");
  expect(!headless.changed, "head 가 없으면 건드리지 않아야 한다.");

  const headers = rewriteHeaders("/*\n  X-Content-Type-Options: nosniff\n");
  expect(headers.changed, "/* 블록에 X-Robots-Tag 를 넣어야 한다.");
  expect(headers.text.split("\n")[1] === ROBOTS_TAG_HEADER, "X-Robots-Tag 는 /* 바로 아래여야 한다.");

  const twice = rewriteHeaders(headers.text);
  expect(!twice.changed, "이미 있으면 두 번 넣지 않아야 한다.");

  // 🔴 이 레포의 실제 _headers 모양. 다른 경로에 이미 X-Robots-Tag 가 있어도 전역 블록에는
  //    반드시 넣어야 한다. 예전 픽스처에 이 경우가 없어서 결함이 그대로 통과했다.
  const perPathOnly = rewriteHeaders(
    "/premium*\n  X-Robots-Tag: noindex, nofollow\n\n/pdf*\n  X-Robots-Tag: noindex, nofollow\n\n/*\n  X-Content-Type-Options: nosniff\n",
  );
  expect(perPathOnly.changed, "다른 경로에 X-Robots-Tag 가 있어도 /* 블록에는 넣어야 한다.");
  {
    const lines = perPathOnly.text.split("\n");
    const globAt = lines.findIndex((line) => line.trim() === "/*");
    expect(lines[globAt + 1] === ROBOTS_TAG_HEADER, "전역 헤더는 /* 바로 아래에 있어야 한다.");
  }

  let globMissingThrew = false;
  try {
    rewriteHeaders("/assets/*\n  Cache-Control: max-age=1\n");
  } catch {
    globMissingThrew = true;
  }
  expect(globMissingThrew, "/* 블록이 없으면 조용히 넘기지 말고 실패해야 한다.");

  // 디렉터리 전체 적용까지 실제 파일로 확인한다.
  const fixture = mkdtempSync(join(tmpdir(), "staging-noindex-"));
  try {
    mkdirSync(join(fixture, "nested"), { recursive: true });
    writeFileSync(join(fixture, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://code-destiny.com/sitemap.xml\n", "utf8");
    writeFileSync(
      join(fixture, "_headers"),
      "/premium*\n  X-Robots-Tag: noindex, nofollow\n\n/*\n  X-Content-Type-Options: nosniff\n",
      "utf8",
    );
    writeFileSync(join(fixture, "index.html"), "<html><head></head><body>home</body></html>", "utf8");
    writeFileSync(join(fixture, "nested", "page.html"), "<html><head></head><body>deep</body></html>", "utf8");

    const summary = applyTo(fixture);
    const robots = readFileSync(join(fixture, "robots.txt"), "utf8");
    expect(robots.includes("Disallow: /"), "robots.txt 는 전면 차단이어야 한다.");
    expect(!robots.includes("Sitemap:"), "robots.txt 에 사이트맵이 남으면 안 된다.");
    expect(!robots.includes("Allow: /"), "robots.txt 에 Allow 가 남으면 안 된다.");
    expect(summary.htmlChanged === 2, `하위 디렉터리까지 처리해야 한다 (처리 ${summary.htmlChanged}건).`);
    expect(readFileSync(join(fixture, "nested", "page.html"), "utf8").includes(ROBOTS_META), "중첩 HTML 에도 메타가 있어야 한다.");
    // 파일 어디든이 아니라 **전역 블록에** 있어야 한다. 이 구분이 이번 결함의 전부다.
    {
      const written = readFileSync(join(fixture, "_headers"), "utf8").split(/\r?\n/);
      const globAt = written.findIndex((line) => line.trim() === "/*");
      expect(globAt !== -1 && /^\s*X-Robots-Tag:\s*noindex/i.test(written[globAt + 1] || ""), "_headers 의 /* 블록에 X-Robots-Tag 가 있어야 한다.");
      expect(summary.headersChanged, "다른 경로에만 있던 경우 전역 헤더를 추가했어야 한다.");
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length) {
    console.error(`${TAG} self-test 실패 ${failures.length}건:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`${TAG} self-test passed.`);
}

// ── 진입점 ───────────────────────────────────────────────────────────────────

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  // 🔴 프로덕션 산출물에 실수로 돌면 사이트가 색인에서 빠진다. 마커가 정확히 staging 일 때만 돈다.
  const deployTarget = String(process.env.CD_DEPLOY_TARGET || "").trim().toLowerCase();
  if (deployTarget !== "staging") {
    console.error(`${TAG} FAIL: CD_DEPLOY_TARGET 이 "staging" 이 아닙니다 (현재 "${deployTarget || "<미설정>"}"). 이 스크립트는 스테이징 빌드에서만 돌아야 합니다.`);
    process.exit(1);
  }

  const distDir = resolve(process.cwd(), "dist");
  if (!existsSync(distDir)) {
    console.error(`${TAG} FAIL: dist/ 가 없습니다. 빌드 뒤에 실행되어야 합니다.`);
    process.exit(1);
  }

  const summary = applyTo(distDir);
  console.log(`${TAG} OK — robots.txt 전면 차단, HTML ${summary.htmlChanged}건에 noindex 메타 주입(head 없음 ${summary.htmlSkipped}건), _headers X-Robots-Tag ${summary.headersChanged ? "추가" : "이미 있음"}.`);
  console.log(`${TAG} 광고는 별도 처리가 없다 — DeferredAdsense 가 noindex 메타를 보고 스스로 로드하지 않는다.`);
}

main();
