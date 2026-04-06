import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const base = 'c:/Users/Neo/Desktop/Code Destiny Main';

const targets = [
  'index.html',
  'public/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
];

// 제거할 코인 버튼 블록 패턴 (다양한 localeString 변형 처리)
const COIN_BLOCK_RE = /\s*'<span class="auth-btn auth-btn--coin">' \+\s*'<i class="coin-icon" aria-hidden="true">[^']*<\/i>' \+\s*'<span class="coin-amount">' \+ [^+]+ \+ '<\/span>' \+\s*'<span class="coin-label">[^']*<\/span>' \+\s*'<\/span>' \+/g;

let changed = 0;
for (const rel of targets) {
  const p = join(base, rel);
  let src;
  try { src = readFileSync(p, 'utf8'); } catch { console.warn('skip (not found):', rel); continue; }
  const updated = src.replace(COIN_BLOCK_RE, '');
  if (updated !== src) {
    writeFileSync(p, updated, 'utf8');
    console.log('patched:', rel);
    changed++;
  } else {
    console.log('no match:', rel);
  }
}
console.log(`\nDone. ${changed} file(s) updated.`);
