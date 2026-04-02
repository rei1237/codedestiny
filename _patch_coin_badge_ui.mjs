// _patch_coin_badge_ui.mjs
// golden-grain-badge 코인 위젯 UI를 다크 코스믹 테마로 업그레이드
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

const FILES = [
  'public/index.html',
  'public/static/index.html',
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

const OLD_BADGE_CSS =
`.golden-grain-badge{position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:999px;border:1px solid rgba(255,210,130,0.66);background:linear-gradient(145deg,rgba(255,247,230,0.97),rgba(255,226,173,0.95));box-shadow:0 10px 30px rgba(176,98,21,0.22),inset 0 2px 10px rgba(255,255,255,0.42);color:#6e350b;font-weight:800;font-size:.84rem;letter-spacing:.01em;z-index:4}
.golden-grain-badge__coin{position:relative;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 26% 22%,#fff8ce 0%,#ffd14d 48%,#df920b 100%);border:1px solid rgba(164,90,8,0.44);box-shadow:inset 0 2px 8px rgba(255,255,255,0.56),0 6px 12px rgba(150,76,11,0.24)}
.golden-grain-badge__coin::before{content:'';width:16px;height:16px;border-radius:50%;border:2px solid rgba(133,69,8,0.58);box-shadow:inset 0 2px 5px rgba(255,245,201,0.72)}
.golden-grain-badge__coin::after{content:'';position:absolute;top:7px;left:7px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.72)}
.golden-grain-badge__value{display:flex;flex-direction:column;line-height:1.1;font-variant-numeric:tabular-nums}
.golden-grain-badge__label{font-size:.67rem;font-weight:700;color:#8e5a2f;letter-spacing:.03em;text-transform:uppercase}
.golden-grain-badge__balance{font-size:.86rem;font-weight:900;color:#5f2e08;white-space:nowrap}
.golden-grain-badge__charge{margin-left:2px;border:none;border-radius:999px;padding:7px 11px;background:linear-gradient(135deg,#ff8a5b,#ff5a77);color:#fff;font-size:.74rem;font-weight:900;cursor:pointer;transition:transform .22s ease,filter .22s ease,box-shadow .22s ease;box-shadow:0 6px 14px rgba(219,89,55,0.32)}
.golden-grain-badge__charge:hover{transform:translateY(-1px) scale(1.03);filter:brightness(1.04)}`;

const NEW_BADGE_CSS =
`.golden-grain-badge{position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 10px;border-radius:999px;border:1px solid rgba(255,200,80,0.28);background:linear-gradient(135deg,rgba(18,8,42,0.92),rgba(30,12,60,0.88));box-shadow:0 8px 32px rgba(0,0,0,0.55),0 0 0 1px rgba(160,100,255,0.12),inset 0 1px 0 rgba(255,220,140,0.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#f0e8ff;font-weight:700;font-size:.84rem;letter-spacing:.01em;z-index:4}
.golden-grain-badge__coin{position:relative;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff9d6 0%,#ffd14d 46%,#c97a08 100%);border:1.5px solid rgba(255,215,0,0.45);box-shadow:0 0 14px rgba(255,200,50,0.5),inset 0 2px 6px rgba(255,255,200,0.6),0 4px 10px rgba(140,80,8,0.28)}
.golden-grain-badge__coin::before{content:'';width:14px;height:14px;border-radius:50%;border:2px solid rgba(120,60,5,0.4);box-shadow:inset 0 2px 4px rgba(255,250,200,0.6)}
.golden-grain-badge__coin::after{content:'';position:absolute;top:6px;left:7px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.75)}
.golden-grain-badge__value{display:flex;flex-direction:column;line-height:1.15;font-variant-numeric:tabular-nums}
.golden-grain-badge__label{font-size:.62rem;font-weight:700;color:rgba(255,210,110,0.88);letter-spacing:.04em}
.golden-grain-badge__balance{font-size:.85rem;font-weight:900;color:#f5e8ff;white-space:nowrap;text-shadow:0 0 8px rgba(200,160,255,0.35)}
.golden-grain-badge__charge{margin-left:4px;border:none;border-radius:999px;padding:7px 13px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:.73rem;font-weight:900;letter-spacing:.02em;cursor:pointer;transition:transform .22s ease,filter .22s ease,box-shadow .22s ease;box-shadow:0 4px 16px rgba(124,58,237,0.48),inset 0 1px 0 rgba(255,255,255,0.18)}
.golden-grain-badge__charge:hover{transform:translateY(-1px) scale(1.04);filter:brightness(1.1);box-shadow:0 6px 22px rgba(168,85,247,0.6),inset 0 1px 0 rgba(255,255,255,0.18)}`;

let patched = 0, skipped = 0;

for (const rel of FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { console.log(`[SKIP] not found: ${rel}`); skipped++; continue; }
  const src = fs.readFileSync(fp, 'utf8');
  if (!src.includes(OLD_BADGE_CSS)) {
    console.log(`[SKIP] already patched or mismatch: ${rel}`);
    skipped++;
    continue;
  }
  fs.writeFileSync(fp, src.replace(OLD_BADGE_CSS, NEW_BADGE_CSS), 'utf8');
  console.log(`[OK]   patched: ${rel}`);
  patched++;
}

console.log(`\nDone: ${patched} patched, ${skipped} skipped.`);
