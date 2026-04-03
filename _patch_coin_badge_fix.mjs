// 1회 X코인 배지에서 🪙 이모지 제거 + 15코인 → 30코인 (십이지신/명리학 타로)
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'C:\\Users\\Neo\\Desktop\\Code Destiny Main';

const targets = [
  'index.html',
  'public/index.html',
  'public/zh-cn/index.html',
  'public/hi-in/index.html',
  'public/en-us/index.html',
  'public/static/index.html',
  'public/fr-fr/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/es-es/index.html',
];

let totalFiles = 0;

for (const rel of targets) {
  const fp = join(BASE, rel);
  let src;
  try {
    src = readFileSync(fp, 'utf8');
  } catch {
    console.log(`SKIP (not found): ${rel}`);
    continue;
  }

  let updated = src;

  // 1. 모든 coin-badge 안의 '🪙 1회' → '1회' (이모지+공백 제거)
  updated = updated.replaceAll('🪙 1회 ', '1회 ');

  // 2. 15코인 → 30코인 (data-coin-cost 포함, 십이지신 천운 & 명리학 타로 모두)
  //    data-coin-cost="15"
  updated = updated.replaceAll('data-coin-cost="15"', 'data-coin-cost="30"');
  //    뱃지 텍스트
  updated = updated.replaceAll('1회 15코인', '1회 30코인');

  // 3. JS 객체 cost:'🪙 15코인' → cost:'30코인' (십이지신/명리학 타로 전용)
  updated = updated.replaceAll("cost:'🪙 15코인'", "cost:'30코인'");

  if (updated !== src) {
    writeFileSync(fp, updated, 'utf8');
    console.log(`PATCHED: ${rel}`);
    totalFiles++;
  } else {
    console.log(`NO_CHANGE: ${rel}`);
  }
}

console.log(`\nDone. ${totalFiles} file(s) patched.`);
