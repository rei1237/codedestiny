#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

const targetFiles = [
  'public/static/index.html',
  'public/index.html',
  'index.html',
  'public/en-us/index.html',
  'public/ja-jp/index.html',
  'public/zh-cn/index.html',
];

const requiredMarkers = [
  '.prem-card>div:first-child *{pointer-events:none}',
  'data-action="gotoZiweiPremium"',
  'data-action="gotoAstrologyPremium"',
  'data-action="gotoSukuyoPremium"',
  'data-action="gotoVedicPremium"',
  '/fuctionassets/jamipremiun.webp',
  '/fuctionassets/premiumstar.webp',
  '/fuctionassets/sukyo_premium.webp',
  '/fuctionassets/premium veda.webp',
];

let hasError = false;

for (const relPath of targetFiles) {
  const fullPath = path.join(workspaceRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    hasError = true;
    console.error(`[locale-main-sync] missing file: ${relPath}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const marker of requiredMarkers) {
    if (!content.includes(marker)) {
      hasError = true;
      console.error(`[locale-main-sync] missing marker in ${relPath}: ${marker}`);
    }
  }
}

if (hasError) {
  console.error('\n[locale-main-sync] FAILED: premium main linkage markers are not fully mirrored.');
  process.exit(1);
}

console.log('[locale-main-sync] OK: premium linkage markers are mirrored across static + locales.');
