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

export function rewriteHeaders(text) {
  if (text.includes("X-Robots-Tag:")) return { text, changed: false };

  const lines = text.split(/\r?\n/);
  const globIndex = lines.findIndex((line) => line.trim() === "/*");
  if (globIndex === -1) return { text, changed: false };

  lines.splice(globIndex + 1, 0, ROBOTS_TAG_HEADER);
  return { text: lines.join("\n"), changed: true };
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
  let headersChanged = false;
  if (existsSync(headersPath)) {
    const result = rewriteHeaders(readFileSync(headersPath, "utf8"));
    if (result.changed) {
      writeFileSync(headersPath, result.text, "utf8");
      headersChanged = true;
    }
  }

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

  const noGlob = rewriteHeaders("/assets/*\n  Cache-Control: max-age=1\n");
  expect(!noGlob.changed, "/* 블록이 없으면 아무것도 하지 않아야 한다.");

  // 디렉터리 전체 적용까지 실제 파일로 확인한다.
  const fixture = mkdtempSync(join(tmpdir(), "staging-noindex-"));
  try {
    mkdirSync(join(fixture, "nested"), { recursive: true });
    writeFileSync(join(fixture, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://code-destiny.com/sitemap.xml\n", "utf8");
    writeFileSync(join(fixture, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n", "utf8");
    writeFileSync(join(fixture, "index.html"), "<html><head></head><body>home</body></html>", "utf8");
    writeFileSync(join(fixture, "nested", "page.html"), "<html><head></head><body>deep</body></html>", "utf8");

    const summary = applyTo(fixture);
    const robots = readFileSync(join(fixture, "robots.txt"), "utf8");
    expect(robots.includes("Disallow: /"), "robots.txt 는 전면 차단이어야 한다.");
    expect(!robots.includes("Sitemap:"), "robots.txt 에 사이트맵이 남으면 안 된다.");
    expect(!robots.includes("Allow: /"), "robots.txt 에 Allow 가 남으면 안 된다.");
    expect(summary.htmlChanged === 2, `하위 디렉터리까지 처리해야 한다 (처리 ${summary.htmlChanged}건).`);
    expect(readFileSync(join(fixture, "nested", "page.html"), "utf8").includes(ROBOTS_META), "중첩 HTML 에도 메타가 있어야 한다.");
    expect(readFileSync(join(fixture, "_headers"), "utf8").includes("X-Robots-Tag"), "_headers 에 X-Robots-Tag 가 있어야 한다.");
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
