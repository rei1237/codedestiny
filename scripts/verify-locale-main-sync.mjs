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
  // 2026-10-17 "직관성" 단순화로 혈액형 대표 이미지 타일은 홈에서 빠져 /mini-games/ 로 옮겼다.
  // 셸에는 전체 운세 시트의 링크(위 href)만 남으므로 이미지 alt 표식은 더 묻지 않는다.
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
