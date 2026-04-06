/**
 * UNSETAMA2.webp를 직접 img 태그로 포함하도록 타일 수정
 * data-img-src lazy 방식 → eager img 직접 삽입
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OLD_WRAP = `<div class="tarot-tile__img-wrap" data-img-src="/fuctionassets/UNSETAMA2.webp" data-img-alt="다마고치 운명의 알 — 나만의 사주 캐릭터 키우기">
                    <div class="tarot-tile__img-placeholder" aria-hidden="true"><span class="tile-ph-gem">🥚</span></div>
                    <span class="tarot-tile__badge tarot-tile__badge--new">NEW</span>
                    <span class="tarot-tile__coin-badge tarot-tile__coin-badge--free">무료</span>
                  </div>`;

const NEW_WRAP = `<div class="tarot-tile__img-wrap" data-img-src="/fuctionassets/UNSETAMA2.webp" data-img-alt="다마고치 운명의 알 — 나만의 사주 캐릭터 키우기">
                    <img class="tarot-tile__img is-loaded" src="/fuctionassets/UNSETAMA2.webp" alt="다마고치 운명의 알" width="200" height="150" loading="eager" decoding="async">
                    <span class="tarot-tile__badge tarot-tile__badge--new">NEW</span>
                    <span class="tarot-tile__coin-badge tarot-tile__coin-badge--free">무료</span>
                  </div>`;

const targets = [
  join(__dirname, 'index.html'),
  join(__dirname, 'public', 'index.html'),
  join(__dirname, 'public', 'de-de', 'index.html'),
  join(__dirname, 'public', 'en-us', 'index.html'),
  join(__dirname, 'public', 'es-es', 'index.html'),
  join(__dirname, 'public', 'fr-fr', 'index.html'),
  join(__dirname, 'public', 'hi-in', 'index.html'),
  join(__dirname, 'public', 'ja-jp', 'index.html'),
  join(__dirname, 'public', 'ms-my', 'index.html'),
  join(__dirname, 'public', 'nl-nl', 'index.html'),
  join(__dirname, 'public', 'static', 'index.html'),
  join(__dirname, 'public', 'zh-cn', 'index.html'),
];

let count = 0;
for (const f of targets) {
  let c;
  try { c = readFileSync(f, 'utf8'); } catch { console.log(`SKIP: ${f}`); continue; }
  if (!c.includes(OLD_WRAP)) { console.log(`NO_MATCH: ${f}`); continue; }
  writeFileSync(f, c.replaceAll(OLD_WRAP, NEW_WRAP), 'utf8');
  console.log(`PATCHED: ${f}`);
  count++;
}
console.log(`\n완료: ${count}개 파일 수정됨`);
