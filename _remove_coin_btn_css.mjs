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

// auth-btn--coin 관련 CSS 4줄 제거 (뒤에 다른 CSS가 이어지므로 줄바꿈 유지)
const CSS_RE = /\.auth-btn--coin\{[^}]+\}\s*\.auth-btn--coin \.coin-icon\{[^}]+\}\s*\.auth-btn--coin \.coin-amount\{[^}]+\}\s*\.auth-btn--coin \.coin-label\{[^}]+\}\s*/g;

let changed = 0;
for (const rel of targets) {
  const p = join(base, rel);
  let src;
  try { src = readFileSync(p, 'utf8'); } catch { console.warn('skip:', rel); continue; }
  const updated = src.replace(CSS_RE, '');
  if (updated !== src) {
    writeFileSync(p, updated, 'utf8');
    console.log('css cleaned:', rel);
    changed++;
  } else {
    console.log('no css match:', rel);
  }
}
console.log(`\nDone. ${changed} file(s) updated.`);
