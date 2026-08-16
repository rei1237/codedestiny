#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const htmlFiles = {
  main: path.join(root, "public", "index.html"),
  stat: path.join(root, "public", "static", "index.html"),
};

const requiredHtmlMarkers = [
  'class="post-saju-services-intro"',
  'data-action="openTarotHealingModal"',
  'href="/naming-ai/"',
  'href="/privacy-policy/"',
  'id="cdAdminFlowerBtn"',
];

const jsMirrorPairs = [
  ["js/core/index-inline-runtime.js", "public/js/core/index-inline-runtime.js"],
  ["js/mobile-performance-bootstrap.js", "public/js/mobile-performance-bootstrap.js"],
  ["js/sibyl-system.js", "public/js/sibyl-system.js"],
  ["js/mobile-interaction-patch.js", "public/js/mobile-interaction-patch.js"],
  ["js/oracle-kcg.js", "public/js/oracle-kcg.js"],
];

const runtimeVersionRegex = /index-inline-runtime\.js\?v=([^"'\s>]+)/;

let failed = false;

function normalizeText(content) {
  let text = content;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[verify-public-parity] missing file: ${path.relative(root, filePath)}`);
    failed = true;
    return null;
  }
  return normalizeText(fs.readFileSync(filePath, "utf8"));
}

const mainHtml = readText(htmlFiles.main);
const statHtml = readText(htmlFiles.stat);

if (mainHtml && statHtml) {
  for (const marker of requiredHtmlMarkers) {
    if (!mainHtml.includes(marker)) {
      console.error(`[verify-public-parity] marker missing in public/index.html: ${marker}`);
      failed = true;
    }
    if (!statHtml.includes(marker)) {
      console.error(`[verify-public-parity] marker missing in public/static/index.html: ${marker}`);
      failed = true;
    }
  }

  const mainRuntime = mainHtml.match(runtimeVersionRegex)?.[1] || "";
  const statRuntime = statHtml.match(runtimeVersionRegex)?.[1] || "";
  if (!mainRuntime || !statRuntime) {
    console.error("[verify-public-parity] runtime script version marker not found in one of html files");
    failed = true;
  } else if (mainRuntime !== statRuntime) {
    console.error(
      `[verify-public-parity] runtime version mismatch: public/index.html=${mainRuntime} public/static/index.html=${statRuntime}`,
    );
    failed = true;
  }
}

for (const [left, right] of jsMirrorPairs) {
  const leftPath = path.join(root, left);
  const rightPath = path.join(root, right);
  const leftText = readText(leftPath);
  const rightText = readText(rightPath);

  if (!leftText || !rightText) {
    continue;
  }

  if (leftText !== rightText) {
    console.error(`[verify-public-parity] js mirror mismatch: ${left} != ${right}`);
    failed = true;
  }
}

if (failed) {
  console.error("\n[verify-public-parity] FAILED: public parity checks detected regressions.");
  process.exit(1);
}

console.log(
  `[verify-public-parity] OK: html markers=${requiredHtmlMarkers.length}, jsPairs=${jsMirrorPairs.length}`,
);
