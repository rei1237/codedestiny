import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['public/index.html'];
for (const f of files) {
  const p = resolve(root, f);
  let s = readFileSync(p, 'utf8');
  const OPEN = '<section class="fg-group fg-group--godlife"';
  const CLOSE = '</section><!-- /fg-group--godlife -->';
  const si = s.indexOf(OPEN);
  if (si < 0) { console.log('[SKIP already gone]', f); continue; }
  const ci = s.indexOf(CLOSE, si) + CLOSE.length;
  s = s.slice(0, si).trimEnd() + '\n' + s.slice(ci);
  writeFileSync(p, s, 'utf8');
  console.log('[OK]', f);
}
