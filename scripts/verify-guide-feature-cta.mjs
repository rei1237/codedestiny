#!/usr/bin/env node
/**
 * 기능 가이드 표면이 **실제 기능으로 가는 1차 동선**을 갖고 있는지 본다.
 *
 * 왜 필요한가 — /health-report/guide 는 12개 가이드 중 홀로 기능 링크가 0개였다. 칩 5개가
 * 전부 정책·문서 페이지였고, 그 상태로 색인·광고 심사까지 통과했다. 아무도 몰랐던 이유는
 * 단순하다: "가이드가 자기 기능에 닿는가" 를 단언하는 검사가 하나도 없었다
 * (verify-adsense-readiness 의 내부 링크 검사는 404 페이지 전용이다).
 *
 * fail-closed 설계 (CLAUDE.md 원칙 10 — 손으로 쓴 대상 목록은 가드가 아니다):
 *   ① 대상을 소스에서 전수 발견한다 — app/ 에서 `cd-guide` 를 렌더하는 파일 전부.
 *      배열에 경로를 열거하지 않으므로 새 가이드가 생기면 자동으로 검사 대상이 된다.
 *   ② 발견이 0개면 실패한다(선택자가 바뀌었는데 가드는 초록불인 상태를 막는다).
 *   ③ 발견됐는데 CTA 가 없으면 실패한다.
 *   ④ CTA 표에 있는 라우트가 실제로 렌더되지 않으면 실패한다(죽은 표 항목을 막는다).
 *   ⑤ 표의 목적지가 실재하지 않으면 실패한다 — 셸 딥링크는 index.html 의 [data-action]
 *      타일 존재로, 그 외는 app/ 아래 page 파일 존재로 확인한다. 셸에 타일이 없는
 *      `?action=` 은 클릭해도 조용히 아무 일도 일어나지 않으므로 이게 핵심이다.
 *   ⑥ /tarot/guide 는 로케일 12벌이 살아 있는 유일한 가이드다. 비-ko 로케일은 번역된
 *      navLinks 를 CTA 로 승격하므로, 어느 로케일에서든 그 배열이 비면 CTA 가 사라진다.
 *
 * 실행: npm run verify:guide-feature-cta
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

/** app/ 을 훑어 `cd-guide` 를 렌더하는 소스 파일을 전수 발견한다. */
function findGuideSurfaces(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const abs = path.join(dir, entry);
    if (statSync(abs).isDirectory()) {
      findGuideSurfaces(abs, found);
      continue;
    }
    if (!/\.(js|jsx|ts|tsx)$/.test(entry)) continue;
    const source = readFileSync(abs, "utf8");
    // className 안에서 **정확히** cd-guide 인 토큰만 — cd-guide-index(/insights 목록 패널)와
    // cd-guide-cta(CTA 블록 자신)는 접두사만 같을 뿐 가이드 표면이 아니다. 정규식 \b 는
    // 하이픈을 단어 경계로 보므로 그 둘까지 잡는다.
    const isSurface = [...source.matchAll(/className="([^"]*)"/g)].some((match) =>
      match[1].split(/\s+/).includes("cd-guide"),
    );
    if (isSurface) {
      found.push({ file: path.relative(rootDir, abs).replace(/\\/g, "/"), source });
    }
  }
  return found;
}

const surfaces = findGuideSurfaces(path.join(rootDir, "app"));

// ② 발견 0개 = 가드가 아무것도 안 보고 있다는 뜻이다.
if (surfaces.length === 0) {
  fail('app/ 에서 className 에 "cd-guide" 를 쓰는 파일을 하나도 못 찾았다 — 선택자가 바뀌었거나 가드가 잘못된 곳을 보고 있다.');
}

// ③ 발견된 표면은 전부 CTA 를 렌더해야 한다.
const routePattern = /GUIDE_CTA_TARGETS\[\s*"([^"]+)"\s*\]/g;
const renderedRoutes = new Set();
for (const { file, source } of surfaces) {
  if (!/<GuideCta\b/.test(source)) {
    fail(`${file}: cd-guide 표면인데 <GuideCta /> 를 렌더하지 않는다 — 이 화면에는 기능으로 가는 1차 동선이 없다.`);
    continue;
  }
  for (const match of source.matchAll(routePattern)) renderedRoutes.add(match[1]);
}

// CTA 표 로드
const targetsPath = path.join(rootDir, "app", "components", "guide-cta-targets.js");
if (!existsSync(targetsPath)) {
  fail("app/components/guide-cta-targets.js 가 없다 — CTA 목적지 정본이 사라졌다.");
}

const { GUIDE_CTA_TARGETS } = failures.length && !existsSync(targetsPath)
  ? { GUIDE_CTA_TARGETS: {} }
  : await import(`file://${targetsPath.replace(/\\/g, "/")}`);

const shellPath = path.join(rootDir, "index.html");
const shell = existsSync(shellPath) ? readFileSync(shellPath, "utf8") : "";
if (!shell) fail("index.html 을 읽지 못했다 — 셸 딥링크 목적지를 확인할 수 없다.");

const pageFileNames = ["page.js", "page.jsx", "page.ts", "page.tsx"];

function destinationExists(href) {
  if (href.startsWith("/?action=")) {
    const action = href.slice("/?action=".length);
    if (!/^[A-Za-z0-9_-]+$/.test(action)) return `action 이름이 이상하다: ${action}`;
    const tiles = shell.split(`data-action="${action}"`).length - 1;
    return tiles > 0 ? null : `셸에 [data-action="${action}"] 타일이 없다 — 클릭해도 아무 일도 일어나지 않는다.`;
  }
  if (!href.startsWith("/")) return `내부 경로가 아니다: ${href}`;
  const dir = path.join(rootDir, "app", ...href.replace(/^\/|\/$/g, "").split("/"));
  const found = pageFileNames.some((name) => existsSync(path.join(dir, name)));
  return found ? null : `app${href} 아래에 page 파일이 없다.`;
}

for (const [route, target] of Object.entries(GUIDE_CTA_TARGETS)) {
  // ④ 표에는 있는데 아무도 안 쓰는 항목 = 죽은 항목
  if (!renderedRoutes.has(route)) {
    fail(`GUIDE_CTA_TARGETS["${route}"] 를 렌더하는 파일이 없다 — 표 항목이 죽었거나 페이지 배선이 빠졌다.`);
  }
  if (!target || !target.primary || !target.primary.href || !target.primary.label) {
    fail(`GUIDE_CTA_TARGETS["${route}"]: primary.href/label 이 없다.`);
    continue;
  }
  if (!target.from) fail(`GUIDE_CTA_TARGETS["${route}"]: data-cd-cross-sell 표식(from)이 없다 — 클릭 계측이 붙지 않는다.`);

  const links = [target.primary, ...(target.secondary || [])];
  for (const link of links) {
    const problem = destinationExists(link.href);
    if (problem) fail(`GUIDE_CTA_TARGETS["${route}"] -> ${link.href}: ${problem}`);
  }
}

// 렌더는 하는데 표에 없는 라우트
for (const route of renderedRoutes) {
  if (!GUIDE_CTA_TARGETS[route]) {
    fail(`GUIDE_CTA_TARGETS["${route}"] 를 렌더하는 페이지가 있는데 표에 그 키가 없다 — CTA 가 조용히 사라진다.`);
  }
}

// ⑥ /tarot/guide 로케일 12벌 — 비-ko 는 navLinks 를 CTA 로 승격한다.
const tarotPath = path.join(rootDir, "app", "tarot", "guide", "TarotGuideContent.jsx");
if (existsSync(tarotPath)) {
  const tarotSource = readFileSync(tarotPath, "utf8");
  const localeBlocks = [...tarotSource.matchAll(/^ {2}"?([a-z]{2}(?:-[A-Z]{2})?)"?:\s*\{$/gm)].map((m) => m[1]);
  if (localeBlocks.length === 0) {
    fail("TarotGuideContent.jsx: GUIDE_COPY 로케일 블록을 못 찾았다 — 가드가 잘못된 곳을 보고 있다.");
  }
  for (const locale of localeBlocks) {
    const blockStart = tarotSource.indexOf(`\n  ${locale}: {`) >= 0
      ? tarotSource.indexOf(`\n  ${locale}: {`)
      : tarotSource.indexOf(`\n  "${locale}": {`);
    if (blockStart < 0) continue;
    const nav = tarotSource.slice(blockStart).match(/navLinks:\s*\[/);
    if (!nav) {
      fail(`TarotGuideContent.jsx: 로케일 "${locale}" 에 navLinks 가 없다 — 이 언어에서 CTA 가 사라진다.`);
    }
  }
  notes.push(`tarot 로케일 ${localeBlocks.length}벌 확인`);
}

const routeCount = Object.keys(GUIDE_CTA_TARGETS).length;
if (failures.length) {
  console.error("[verify-guide-feature-cta] FAIL");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(
  `[verify-guide-feature-cta] OK: cd-guide 표면 ${surfaces.length}개, CTA 라우트 ${routeCount}개, 목적지 전수 실재${notes.length ? `, ${notes.join(", ")}` : ""}`,
);
