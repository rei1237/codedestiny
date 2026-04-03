// _patch_coin_badge_v2.mjs
// 코인 배지 CSS를 amber/gold 톤으로 재수정
// (페이-퍼-유즈 "1회 N코인" = gold amber, 무료 = green, 고정 해금 = purple)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const TARGET_FILES = [
  'public/index.html',
  'public/static/index.html',
  'index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/zh-cn/index.html',
];

const OLD_COIN_CSS = `.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:3px;padding:4px 10px 4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:linear-gradient(135deg,rgba(12,5,28,.94),rgba(22,10,44,.92));color:#ecdeff;border:1px solid rgba(190,140,255,.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);pointer-events:none}
.tarot-tile__coin-badge--free{background:linear-gradient(135deg,rgba(4,44,26,.94),rgba(8,62,36,.92));border-color:rgba(100,220,168,.38);color:#a7f3d0}`;

// amber/gold 기조: 코인 비용 배지는 황금색, 무료는 에메랄드, 잠금 해금은 보라
const NEW_COIN_CSS = `.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:3px;padding:4px 10px 4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:rgba(14,8,2,.88);color:#fcd262;border:1px solid rgba(250,190,50,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,220,100,.08);pointer-events:none}
.tarot-tile__coin-badge--free{background:rgba(4,28,20,.88);border-color:rgba(90,210,150,.38);color:#6ee7b7}`;

let patched = 0, skipped = 0;
for (const rel of TARGET_FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { skipped++; continue; }
  let src = fs.readFileSync(fp, 'utf8');
  if (src.includes(OLD_COIN_CSS)) {
    src = src.replace(OLD_COIN_CSS, NEW_COIN_CSS);
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`[OK] ${rel}`);
    patched++;
  } else if (src.includes(NEW_COIN_CSS)) {
    console.log(`[SKIP] already patched: ${rel}`);
    skipped++;
  } else {
    console.log(`[MISS] CSS not found in: ${rel}`);
    skipped++;
  }
}
console.log(`\nDone: ${patched} patched, ${skipped} skipped`);
