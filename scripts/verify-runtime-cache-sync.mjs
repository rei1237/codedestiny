#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const htmlTargets = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
];

const runtimeFiles = [
  'js/core/index-inline-runtime.js',
  'public/js/core/index-inline-runtime.js',
];

const syncPairs = [
  ['js/sibyl-system.js', 'public/js/sibyl-system.js'],
];

const runtimeTagRe = /index-inline-runtime\.js\?v=([^"'\s>]+)/;
const sajuEngineRe = /\/js\/saju-engine\.js\?v=([^"'\s,]+)/;
const sibylMarkers = [
  /id=["']sibylSystemSection["']/,
  /data-action=["']openSibylModal["']/,
  /id=["']sibylModal["']/,
];
const sibylHtmlTargets = new Set([
  'index.html',
  'public/static/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
]);

let failed = false;

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`[runtime-cache-sync] missing file: ${rel}`);
    failed = true;
    return null;
  }
  return fs.readFileSync(p, 'utf8');
}

const htmlVersions = new Map();
for (const rel of htmlTargets) {
  const txt = read(rel);
  if (!txt) continue;

  if (sibylHtmlTargets.has(rel)) {
    for (const marker of sibylMarkers) {
      if (!marker.test(txt)) {
        console.error(`[runtime-cache-sync] sibyl marker missing (${marker}): ${rel}`);
        failed = true;
      }
    }
  }

  const m = txt.match(runtimeTagRe);
  if (!m) {
    console.error(`[runtime-cache-sync] runtime script tag version not found: ${rel}`);
    failed = true;
    continue;
  }
  htmlVersions.set(rel, m[1]);
}

if (htmlVersions.size > 0) {
  const expected = htmlVersions.get('public/index.html') || htmlVersions.values().next().value;
  for (const [rel, v] of htmlVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] runtime version mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

const sajuVersions = new Map();
for (const rel of runtimeFiles) {
  const txt = read(rel);
  if (!txt) continue;
  const m = txt.match(sajuEngineRe);
  if (!m) {
    console.error(`[runtime-cache-sync] saju-engine loader version not found: ${rel}`);
    failed = true;
    continue;
  }
  sajuVersions.set(rel, m[1]);
}

if (sajuVersions.size > 0) {
  const expected = sajuVersions.values().next().value;
  for (const [rel, v] of sajuVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] saju loader mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

for (const [left, right] of syncPairs) {
  const leftTxt = read(left);
  const rightTxt = read(right);
  if (!leftTxt || !rightTxt) continue;
  if (leftTxt !== rightTxt) {
    console.error(`[runtime-cache-sync] file sync mismatch: ${left} != ${right}`);
    failed = true;
  }
}

if (failed) {
  console.error('\n[runtime-cache-sync] FAILED: stale runtime/saju loader cache-bust versions detected.');
  process.exit(1);
}

const runtimeVer = htmlVersions.get('public/index.html') || 'unknown';
const sajuVer = sajuVersions.get('public/js/core/index-inline-runtime.js') || sajuVersions.values().next().value || 'unknown';
console.log(`[runtime-cache-sync] OK: runtime=${runtimeVer}, saju-engine=${sajuVer}`);
