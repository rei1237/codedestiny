#!/usr/bin/env node
/**
 * 저자 직접 투입 글 검증기.
 *
 * `useOriginalContent`(또는 ORIGINAL_CONTENT_SLUGS)로 원본 본문이 렌더되는 인사이트 글이
 * 애드센스/품질 기준을 충족하는지 삽입 직후 빠르게 확인한다. 배포 최종 게이트는
 * GitHub Actions의 scripts/verify-adsense-readiness.mjs이며, 이 스크립트는 그 사전 점검이다.
 *
 * 사용법:
 *   node scripts/verify-insight-authored.mjs                 # 원본 렌더 글 전체 검사
 *   node scripts/verify-insight-authored.mjs <slug> [<slug>] # 지정 슬러그만 검사
 *   node scripts/verify-insight-authored.mjs --merged old-a,old-b   # 병합 제거+리다이렉트 확인
 *
 * 검사 항목(슬러그별):
 *   - 존재 & 원본 본문 렌더(6섹션 템플릿 아님)
 *   - 렌더 시각 텍스트 >= 1200자(애드센스 eligible 최소치)
 *   - 첫 1800자 지문이 다른 글과 충돌 없음(중복 콘텐츠 방지)
 *   - 본문에 [이미지 자리표시 / → [Code Destiny CTA 줄 없음
 */
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const MIN_VISIBLE = 1200;
const FINGERPRINT_LEN = 1800;
const ROOT = resolve(process.cwd());
const SEED_ENTRY = "app/insights/seed-articles.js";
const REDIRECTS_FILE = join(ROOT, "public", "_redirects");

const args = process.argv.slice(2);
let mergedOld = [];
const slugArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--merged") {
    mergedOld = String(args[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    slugArgs.push(args[i].trim());
  }
}

function getVisibleText(html) {
  return String(html || "")
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(visibleText) {
  return visibleText
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "URL")
    .replace(/[0-9]+/g, "0")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FINGERPRINT_LEN);
}

function isTemplated(contentHtml) {
  return String(contentHtml || "").trimStart().startsWith("<article><h1>");
}

async function loadSeed() {
  const outfile = join(tmpdir(), `insight-seed-bundle-${process.pid}.mjs`);
  await build({
    entryPoints: [SEED_ENTRY],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "error",
  });
  return import(pathToFileURL(outfile).href);
}

const { INSIGHT_SEED_ARTICLES, getInsightSeedBySlug } = await loadSeed();

// 전체 지문 인덱스(원본 렌더 글끼리 충돌 검사에 사용)
const fpBySlug = new Map();
for (const a of INSIGHT_SEED_ARTICLES) {
  fpBySlug.set(a.slug, fingerprint(getVisibleText(a.contentHtml)));
}
function collidesWith(slug) {
  const fp = fpBySlug.get(slug);
  const hits = [];
  for (const [other, otherFp] of fpBySlug) {
    if (other !== slug && otherFp && fp && otherFp === fp) hits.push(other);
  }
  return hits;
}

// 대상 슬러그: 인자 없으면 원본 렌더 글 전체
const targets = slugArgs.length
  ? slugArgs
  : INSIGHT_SEED_ARTICLES.filter((a) => !isTemplated(a.contentHtml)).map((a) => a.slug);

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
};

console.log(`\n== 저자 글 검증: ${targets.length}개 슬러그 ==`);
for (const slug of targets) {
  const a = getInsightSeedBySlug(slug);
  console.log(`\n--- ${slug} ---`);
  if (!a) {
    check(`${slug} 존재`, false);
    continue;
  }
  const vis = getVisibleText(a.contentHtml);
  check(`원본 본문 렌더(템플릿 아님)`, !isTemplated(a.contentHtml));
  check(`렌더 시각 텍스트 >= ${MIN_VISIBLE}자 (${vis.length})`, vis.length >= MIN_VISIBLE);
  const collisions = collidesWith(slug);
  check(`지문 충돌 없음${collisions.length ? " → " + collisions.join(", ") : ""}`, collisions.length === 0);
  check(`[이미지 자리표시 없음`, !a.contentHtml.includes("[이미지"));
  check(`CTA 줄(→ [Code Destiny) 없음`, !a.contentHtml.includes("→ [Code Destiny"));
}

if (mergedOld.length) {
  console.log(`\n== 병합 제거/리다이렉트 검증: ${mergedOld.join(", ")} ==`);
  const redirects = existsSync(REDIRECTS_FILE) ? readFileSync(REDIRECTS_FILE, "utf8") : "";
  for (const old of mergedOld) {
    check(`${old} seed에서 제거됨`, !getInsightSeedBySlug(old));
    check(`${old} _redirects에 301 존재`, new RegExp(`/insights/${old}\\b[\\s\\S]*?301`).test(redirects));
  }
}

console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAIL`}`);
process.exit(failed ? 1 : 0);
