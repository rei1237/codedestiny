import fs from 'fs';
import path from 'path';

const ROOT = 'c:/Users/Neo/Desktop/Code Destiny Main';

const htmlFiles = [
  'index.html',
  'public/zh-cn/index.html',
  'public/de-de/index.html',
  'public/hi-in/index.html',
  'public/nl-nl/index.html',
  'public/static/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
];

const rep = [
  ['love-secret-v2.js?v=20260407-v2', 'love-secret-v2.js?v=20260408-v3'],
  ['life-book.js?v=20260407-v5', 'life-book.js?v=20260408-v6'],
  ['ziwei-book.js?v=20260407-v2', 'ziwei-book.js?v=20260408-v3'],
];

let updated = 0, skipped = 0;
for (const rel of htmlFiles) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { console.log('[SKIP no file]', rel); skipped++; continue; }
  let c = fs.readFileSync(fp, 'utf8');
  let changed = false;
  for (const [from, to] of rep) {
    if (c.includes(from)) { c = c.split(from).join(to); changed = true; }
  }
  if (changed) { fs.writeFileSync(fp, c, 'utf8'); console.log('[OK]', rel); updated++; }
  else { console.log('[SKIP no match]', rel); skipped++; }
}
console.log('Done:', updated, 'updated,', skipped, 'skipped');
