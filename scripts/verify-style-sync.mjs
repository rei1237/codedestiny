#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "styles");
const dstDir = path.join(root, "public", "styles");
const staticOnlyOverrides = new Set(["globals.css"]);
// 🔴 public/styles/static-policy.css 는 미러가 아니라 생성물이다.
//    scripts/design/build-static-policy-pages.mjs:50-54 가
//      build-cache/static-policies/pages.css (app/** CSS 모듈 컴파일본) + "\n" + styles/<파일>
//    을 이어 붙여 쓰고, sync-legacy-static-to-public.mjs:1252 주석이 "root 미러링 다음에
//    생성해야 컴파일된 스타일시트가 덮이지 않는다"고 순서를 못박는다. 그래서 바이트 동일
//    비교는 구조적으로 영영 실패한다(실측 root 9,711B vs 미러 18,918B).
//    대신 "미러가 root 원본으로 끝나고 그보다 길다"를 단언한다 — 낡은 미러(root 를 고치고
//    생성기를 안 돌림)와 잘린 미러(sync 가 복사만 하고 죽어 접두부 유실)를 둘 다 여전히 문다.
//    새 CSS 가 같은 방식으로 생성되기 시작하면 여기에 올리기 전까지는 바이트 비교로 실패한다(fail-closed).
const concatGeneratedMirrors = new Set(["static-policy.css"]);
const pointerRe = /@import\s+url\s*\(\s*["']?\.\.\/public\/styles\//;
const tailwindRe = /^@tailwind\s+(base|components|utilities)\s*;/m;

let failed = false;

function normalizeText(content) {
  let text = content;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readNormalized(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return normalizeText(raw);
}

function listCssFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => entry.name)
    .sort();
}

if (!fs.existsSync(srcDir)) {
  console.error(`[verify-style-sync] missing directory: ${srcDir}`);
  process.exit(1);
}
if (!fs.existsSync(dstDir)) {
  console.error(`[verify-style-sync] missing directory: ${dstDir}`);
  process.exit(1);
}

const srcCss = listCssFiles(srcDir);
const dstCss = listCssFiles(dstDir);
const dstSet = new Set(dstCss);

let checked = 0;
let matched = 0;
let skippedPointer = 0;
let skippedTailwindSource = 0;
let checkedGenerated = 0;
let matchedGenerated = 0;

for (const file of srcCss) {
  const srcPath = path.join(srcDir, file);
  const dstPath = path.join(dstDir, file);

  if (!dstSet.has(file)) {
    if (staticOnlyOverrides.has(file)) {
      continue;
    }
    console.error(`[verify-style-sync] missing mirrored file: public/styles/${file}`);
    failed = true;
    continue;
  }

  if (staticOnlyOverrides.has(file)) {
    continue;
  }

  const srcText = readNormalized(srcPath);
  const dstText = readNormalized(dstPath);

  if (concatGeneratedMirrors.has(file)) {
    checkedGenerated += 1;
    if (!dstText.endsWith(srcText) || dstText.length <= srcText.length) {
      console.error(
        `[verify-style-sync] generated mirror broken: public/styles/${file} must be <generated prefix> + styles/${file} (regenerate via scripts/design/build-static-policy-pages.mjs)`,
      );
      failed = true;
      continue;
    }
    matchedGenerated += 1;
    continue;
  }

  if (pointerRe.test(srcText)) {
    skippedPointer += 1;
    continue;
  }

  if (tailwindRe.test(srcText) && !tailwindRe.test(dstText)) {
    skippedTailwindSource += 1;
    continue;
  }

  checked += 1;
  if (srcText !== dstText) {
    console.error(`[verify-style-sync] content mismatch: styles/${file} != public/styles/${file}`);
    failed = true;
    continue;
  }

  matched += 1;
}

for (const file of staticOnlyOverrides) {
  const srcPath = path.join(srcDir, file);
  const dstPath = path.join(dstDir, file);
  if (!fs.existsSync(srcPath) || !fs.existsSync(dstPath)) {
    console.error(`[verify-style-sync] missing override pair file: ${file}`);
    failed = true;
  }
}

if (failed) {
  console.error("\n[verify-style-sync] FAILED: style source/mirror parity is broken.");
  process.exit(1);
}

console.log(
  `[verify-style-sync] OK: checked ${checked} mirrored CSS files, matched ${matched}, generated=${matchedGenerated}/${checkedGenerated}, overrides=${[...staticOnlyOverrides].join(",")}, skippedPointer=${skippedPointer}, skippedTailwindSource=${skippedTailwindSource}`,
);
