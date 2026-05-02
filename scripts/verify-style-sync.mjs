#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "styles");
const dstDir = path.join(root, "public", "styles");
const staticOnlyOverrides = new Set(["globals.css"]);
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
  `[verify-style-sync] OK: checked ${checked} mirrored CSS files, matched ${matched}, overrides=${[...staticOnlyOverrides].join(",")}, skippedPointer=${skippedPointer}, skippedTailwindSource=${skippedTailwindSource}`,
);
