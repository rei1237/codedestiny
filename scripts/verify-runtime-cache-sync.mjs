#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const htmlTargets = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/en-us/index.html',
  'public/ja-jp/index.html',
  'public/zh-cn/index.html',
  'public/hi-in/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
];

const runtimeFiles = [
  'js/core/index-inline-runtime.js',
  'public/js/core/index-inline-runtime.js',
];

const runtimeTagRe = /index-inline-runtime\.js\?v=([^"'\s>]+)/;
const sajuEngineRe = /\/js\/saju-engine\.js\?v=([^"'\s,]+)/;

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

if (failed) {
  console.error('\n[runtime-cache-sync] FAILED: stale runtime/saju loader cache-bust versions detected.');
  process.exit(1);
}

const runtimeVer = htmlVersions.get('public/index.html') || 'unknown';
const sajuVer = sajuVersions.get('public/js/core/index-inline-runtime.js') || sajuVersions.values().next().value || 'unknown';
console.log(`[runtime-cache-sync] OK: runtime=${runtimeVer}, saju-engine=${sajuVer}`);
