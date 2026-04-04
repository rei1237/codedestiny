// 프리미엄 헤더 섹션 CSS 가시성 개선
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));

const OLD_EYEBROW = `.pf-showcase__eyebrow{font-size:.62rem;font-weight:900;letter-spacing:.24em;color:#f8bb25;text-transform:uppercase;margin-bottom:10px}`;
const OLD_TITLE   = `.pf-showcase__title{font-size:clamp(1.15rem,4vw,1.5rem);font-weight:900;background:linear-gradient(135deg,#f0ebff 0%,#c4b5fd 60%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 10px;line-height:1.35}`;
const OLD_SUB     = `.pf-showcase__sub{font-size:.84rem;color:rgba(196,181,253,.78);margin:0;line-height:1.55}`;

// 개선된 CSS:
// 1. eyebrow: 장식 라인 추가 (::before/::after), 글자 간격·크기 보정
// 2. title: 흰색 시작 고대비 그래디언트, 크기 상향, letter-spacing 보정
// 3. sub: 밝기·크기 소폭 상향, line-height 확보
const NEW_EYEBROW =
  `.pf-showcase__eyebrow{font-size:.68rem;font-weight:900;letter-spacing:.3em;color:#f8bb25;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:10px}` +
  `.pf-showcase__eyebrow::before,.pf-showcase__eyebrow::after{content:'';display:inline-block;width:32px;height:1px;background:#f8bb2555;flex-shrink:0}`;
const NEW_TITLE =
  `.pf-showcase__title{font-size:clamp(1.35rem,4.5vw,1.9rem);font-weight:900;background:linear-gradient(135deg,#fff 0%,#e9e0ff 30%,#c4a8ff 65%,#9b6ef5 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 12px;line-height:1.4;letter-spacing:-.02em}`;
const NEW_SUB =
  `.pf-showcase__sub{font-size:.88rem;color:rgba(220,208,255,.9);margin:0;line-height:1.6;letter-spacing:.01em}`;

const targets = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/ja-jp/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
  'public/de-de/index.html',
];

let updated = 0;
let skipped = 0;

for (const rel of targets) {
  const abs = join(__dir, rel);
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { console.warn(`skip (not found): ${rel}`); skipped++; continue; }

  let out = src;
  if (out.includes(OLD_EYEBROW)) {
    out = out.replace(OLD_EYEBROW, NEW_EYEBROW);
  } else {
    console.warn(`  eyebrow: no match in ${rel}`);
  }
  if (out.includes(OLD_TITLE)) {
    out = out.replace(OLD_TITLE, NEW_TITLE);
  } else {
    console.warn(`  title: no match in ${rel}`);
  }
  if (out.includes(OLD_SUB)) {
    out = out.replace(OLD_SUB, NEW_SUB);
  } else {
    console.warn(`  sub: no match in ${rel}`);
  }

  if (out !== src) {
    writeFileSync(abs, out, 'utf8');
    console.log(`✓ updated: ${rel}`);
    updated++;
  } else {
    console.log(`— unchanged: ${rel}`);
    skipped++;
  }
}
console.log(`\n완료: ${updated}개 수정, ${skipped}개 스킵`);
