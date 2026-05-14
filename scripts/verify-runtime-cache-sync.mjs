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
const canonicalRedirectTagRe = /canonical-redirect\.js\?v=([^"'\s>]+)/;
const mobileLiteCssRe = /\/styles\/mobile-lite\.css\?v=([^"'\s>]+)/;
const mobileInteractionPatchRe = /\/js\/mobile-interaction-patch\.js\?v=([^"'\s>]+)/;
const shareScriptRe = /\/js\/share\.js\?v=([^"'\s>]+)/;
const manifestTagRe = /\/manifest\.json\?v=([^"'\s>]+)/;
const sajuEngineRe = /\/js\/saju-engine\.js\?v=([^"'\s,]+)/;
const sibylScriptTagRe = /\/js\/sibyl-system\.js\?v=([^"'\s>]+)/;
const premiumReportScripts = [
  'ziwei-book',
  'astro-book',
  'sukuyo-book',
  'vedic-book',
];
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
const canonicalRedirectVersions = new Map();
const mobileLiteCssVersions = new Map();
const mobileInteractionPatchVersions = new Map();
const shareScriptVersions = new Map();
const manifestVersions = new Map();
const premiumReportVersions = new Map();
const sibylScriptVersions = new Map();
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

  const cm = txt.match(canonicalRedirectTagRe);
  if (!cm) {
    console.error(`[runtime-cache-sync] canonical redirect script tag version not found: ${rel}`);
    failed = true;
  } else {
    canonicalRedirectVersions.set(rel, cm[1]);
  }

  const mobileCssMatch = txt.match(mobileLiteCssRe);
  if (!mobileCssMatch) {
    console.error(`[runtime-cache-sync] mobile-lite css version not found: ${rel}`);
    failed = true;
  } else {
    mobileLiteCssVersions.set(rel, mobileCssMatch[1]);
  }

  const mobilePatchMatch = txt.match(mobileInteractionPatchRe);
  if (!mobilePatchMatch) {
    console.error(`[runtime-cache-sync] mobile interaction patch version not found: ${rel}`);
    failed = true;
  } else {
    mobileInteractionPatchVersions.set(rel, mobilePatchMatch[1]);
  }

  const shareMatch = txt.match(shareScriptRe);
  if (!shareMatch) {
    console.error(`[runtime-cache-sync] share script version not found: ${rel}`);
    failed = true;
  } else {
    shareScriptVersions.set(rel, shareMatch[1]);
  }

  const manifestMatch = txt.match(manifestTagRe);
  if (!manifestMatch) {
    console.error(`[runtime-cache-sync] manifest version not found: ${rel}`);
    failed = true;
  } else {
    manifestVersions.set(rel, manifestMatch[1]);
  }

  for (const scriptName of premiumReportScripts) {
    const matches = Array.from(txt.matchAll(new RegExp(`/js/${scriptName}\\.js\\?v=([^"'\\s>]+)`, 'g')));
    if (matches.length === 0) {
      console.error(`[runtime-cache-sync] premium report script version not found: ${scriptName} in ${rel}`);
      failed = true;
      continue;
    }
    const versions = new Set(matches.map((match) => match[1]));
    if (versions.size !== 1) {
      console.error(`[runtime-cache-sync] premium report duplicate version mismatch: ${scriptName} in ${rel} has ${Array.from(versions).join(', ')}`);
      failed = true;
    }
    premiumReportVersions.set(`${rel}:${scriptName}`, matches[0][1]);
  }

  if (sibylHtmlTargets.has(rel)) {
    const sm = txt.match(sibylScriptTagRe);
    if (!sm) {
      console.error(`[runtime-cache-sync] sibyl script tag version not found: ${rel}`);
      failed = true;
    } else {
      sibylScriptVersions.set(rel, sm[1]);
    }
  }
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

if (canonicalRedirectVersions.size > 0) {
  const expected = canonicalRedirectVersions.get('index.html') || canonicalRedirectVersions.values().next().value;
  for (const [rel, v] of canonicalRedirectVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] canonical redirect version mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

if (mobileLiteCssVersions.size > 0) {
  const expected = mobileLiteCssVersions.get('index.html') || mobileLiteCssVersions.values().next().value;
  for (const [rel, v] of mobileLiteCssVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] mobile-lite css version mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

if (mobileInteractionPatchVersions.size > 0) {
  const expected = mobileInteractionPatchVersions.get('index.html') || mobileInteractionPatchVersions.values().next().value;
  for (const [rel, v] of mobileInteractionPatchVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] mobile interaction patch version mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

if (shareScriptVersions.size > 0) {
  const expected = shareScriptVersions.get('index.html') || shareScriptVersions.values().next().value;
  for (const [rel, v] of shareScriptVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] share script version mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

if (manifestVersions.size > 0) {
  const expected = manifestVersions.get('index.html') || manifestVersions.values().next().value;
  for (const [rel, v] of manifestVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] manifest version mismatch: ${rel} has ${v}, expected ${expected}`);
      failed = true;
    }
  }
}

for (const scriptName of premiumReportScripts) {
  const rootVersion = premiumReportVersions.get(`index.html:${scriptName}`);
  const expected = rootVersion || premiumReportVersions.values().next().value;
  for (const rel of htmlTargets) {
    const v = premiumReportVersions.get(`${rel}:${scriptName}`);
    if (!v) continue;
    if (v !== expected) {
      console.error(`[runtime-cache-sync] premium report script version mismatch: ${scriptName} in ${rel} has ${v}, expected ${expected}`);
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

if (sibylScriptVersions.size > 0) {
  const expected = sibylScriptVersions.get('public/static/index.html') || sibylScriptVersions.values().next().value;
  for (const [rel, v] of sibylScriptVersions.entries()) {
    if (v !== expected) {
      console.error(`[runtime-cache-sync] sibyl script version mismatch: ${rel} has ${v}, expected ${expected}`);
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
const sibylVer = sibylScriptVersions.get('public/static/index.html') || sibylScriptVersions.values().next().value || 'unknown';
const mobileLiteVer = mobileLiteCssVersions.get('public/static/index.html') || mobileLiteCssVersions.values().next().value || 'unknown';
const shareVer = shareScriptVersions.get('public/static/index.html') || shareScriptVersions.values().next().value || 'unknown';
console.log(`[runtime-cache-sync] OK: runtime=${runtimeVer}, saju-engine=${sajuVer}, sibyl=${sibylVer}, mobile-lite=${mobileLiteVer}, share=${shareVer}`);
