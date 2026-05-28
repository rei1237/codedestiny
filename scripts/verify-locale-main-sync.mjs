#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

const targetFiles = [
  'public/static/index.html',
  'public/index.html',
  'index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
];

const requiredMarkers = [
  '.prem-card>div:first-child *{pointer-events:none}',
  'href="/blood-type-app.html"',
  'alt="혈액형 테스트 대표 이미지"',
  'id="authQuickLinks"',
  'cd-user-card__avatar-ring::before',
  'animation:cdPlanetRingDrift 5.4s ease-in-out infinite',
  'id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout"',
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
  console.error('\n[locale-main-sync] FAILED: required static shell markers are not fully mirrored.');
  process.exit(1);
}

console.log('[locale-main-sync] OK: required static shell markers are mirrored across static + locales.');
