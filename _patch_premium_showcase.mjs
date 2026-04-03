/**
 * 프리미엄 쇼케이스 섹션 동기화 스크립트
 * - public/index.html 기준으로 로케일 파일 + 루트 index.html에 동일 적용
 * - CSS 재설계 반영
 * - 가격 오류 수정: "1회 약 500원" → "약 5,000원"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = __dirname;

const OLD_CSS = `.pf-showcase{padding:24px 20px 28px;background:linear-gradient(160deg,rgba(12,6,32,.97) 0%,rgba(20,8,50,.96) 100%);border:1px solid rgba(160,100,255,.18)}
.pf-showcase__header{text-align:center;margin-bottom:24px}
.pf-showcase__eyebrow{font-size:.6rem;font-weight:900;letter-spacing:.22em;color:#fbbf24;text-transform:uppercase;margin-bottom:8px}
.pf-showcase__title{font-size:clamp(1.15rem,4vw,1.45rem);font-weight:900;color:#f5f0ff;margin:0 0 8px;line-height:1.3}
.pf-showcase__sub{font-size:.84rem;color:rgba(196,181,253,.75);margin:0;line-height:1.5}
.pf-showcase__grid{display:grid;gap:16px}
@media(min-width:680px){.pf-showcase__grid{grid-template-columns:repeat(3,1fr)}}
.pf-card{display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(8,4,24,.82);border:1px solid rgba(140,90,255,.22);box-shadow:0 6px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s ease}
.pf-card:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(100,40,220,.45),0 0 0 1px rgba(180,140,255,.35),inset 0 1px 0 rgba(255,255,255,.09)}
.pf-card__icon-wrap{font-size:2.4rem;padding:20px 20px 0;line-height:1;text-align:center}
.pf-card--daewun .pf-card__icon-wrap{background:linear-gradient(160deg,rgba(109,40,217,.18),transparent)}
.pf-card--summary .pf-card__icon-wrap{background:linear-gradient(160deg,rgba(14,116,144,.18),transparent)}
.pf-card--compat .pf-card__icon-wrap{background:linear-gradient(160deg,rgba(190,24,93,.18),transparent)}
.pf-card__body{padding:14px 18px 20px;display:flex;flex-direction:column;gap:10px;flex:1}
.pf-card__badge{display:inline-block;font-size:.58rem;font-weight:900;letter-spacing:.14em;color:#fde68a;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.32);border-radius:4px;padding:3px 8px;text-transform:uppercase;width:max-content}
.pf-card__title{font-size:1.05rem;font-weight:900;color:#f0ebff;margin:0;letter-spacing:.02em}
.pf-card__desc{font-size:.82rem;color:rgba(210,200,245,.8);line-height:1.6;margin:0}
.pf-card__desc strong{color:#ddd6fe}
.pf-card__points{margin:0;padding:0 0 0 2px;list-style:none;display:flex;flex-direction:column;gap:5px}
.pf-card__points li{font-size:.78rem;color:rgba(200,190,240,.85);display:flex;gap:6px;align-items:flex-start;line-height:1.45}
.pf-card__price-row{display:flex;flex-direction:column;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid rgba(140,90,255,.14)}
.pf-card__price{display:flex;align-items:center;gap:6px}
.pf-coin-icon{display:inline-block;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#fffde0 0%,#ffd040 48%,#c97a08 100%);border:1.5px solid rgba(255,200,50,.55);box-shadow:0 0 6px rgba(255,195,40,.5),inset 0 1px 2px rgba(255,255,200,.6);flex-shrink:0}
.pf-coin-amount{font-size:.9rem;font-weight:900;color:#fcd262;letter-spacing:.02em}
.pf-coin-note{font-size:.72rem;color:rgba(200,170,255,.65)}
.pf-card__cta{width:100%;border:none;border-radius:10px;padding:11px 14px;background:linear-gradient(135deg,rgba(109,40,217,.9),rgba(79,70,229,.85));color:#fff;font-size:.85rem;font-weight:800;cursor:pointer;letter-spacing:.03em;transition:filter .2s,transform .2s;box-shadow:0 4px 16px rgba(80,30,180,.35)}
.pf-card__cta:hover{filter:brightness(1.1);transform:translateY(-1px)}`;

const NEW_CSS = `.pf-showcase{padding:28px 20px 32px;background:linear-gradient(160deg,#090719 0%,#10082c 55%,#0c0622 100%);border:1px solid rgba(139,92,246,.25);box-shadow:0 0 80px rgba(109,40,217,.1),inset 0 1px 0 rgba(255,255,255,.04)}
.pf-showcase__header{text-align:center;margin-bottom:28px}
.pf-showcase__eyebrow{font-size:.62rem;font-weight:900;letter-spacing:.24em;color:#f8bb25;text-transform:uppercase;margin-bottom:10px}
.pf-showcase__title{font-size:clamp(1.15rem,4vw,1.5rem);font-weight:900;background:linear-gradient(135deg,#f0ebff 0%,#c4b5fd 60%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 10px;line-height:1.35}
.pf-showcase__sub{font-size:.84rem;color:rgba(196,181,253,.78);margin:0;line-height:1.55}
.pf-showcase__grid{display:grid;gap:18px}
@media(min-width:680px){.pf-showcase__grid{grid-template-columns:repeat(3,1fr)}}
.pf-card{display:flex;flex-direction:column;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,rgba(14,8,32,.94) 0%,rgba(9,4,22,.97) 100%);border:1px solid rgba(140,90,255,.2);box-shadow:0 4px 24px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.07);transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s ease}
.pf-card:hover{transform:translateY(-5px);box-shadow:0 20px 52px rgba(100,40,220,.42),0 0 0 1px rgba(180,140,255,.32),inset 0 1px 0 rgba(255,255,255,.1)}
.pf-card__icon-wrap{font-size:2.5rem;padding:22px 20px 6px;line-height:1;text-align:center}
.pf-card--daewun{border-top:2px solid rgba(139,92,246,.8)}
.pf-card--summary{border-top:2px solid rgba(6,182,212,.7)}
.pf-card--compat{border-top:2px solid rgba(244,63,94,.7)}
.pf-card--daewun .pf-card__icon-wrap{background:linear-gradient(160deg,rgba(109,40,217,.22),transparent)}
.pf-card--summary .pf-card__icon-wrap{background:linear-gradient(160deg,rgba(14,116,144,.22),transparent)}
.pf-card--compat .pf-card__icon-wrap{background:linear-gradient(160deg,rgba(190,24,93,.22),transparent)}
.pf-card__body{padding:14px 18px 20px;display:flex;flex-direction:column;gap:10px;flex:1}
.pf-card__badge{display:inline-flex;align-items:center;font-size:.6rem;font-weight:900;letter-spacing:.12em;color:#fde68a;background:linear-gradient(135deg,rgba(250,204,21,.18),rgba(251,191,36,.08));border:1px solid rgba(250,204,21,.38);border-radius:20px;padding:3px 10px;text-transform:uppercase;width:max-content}
.pf-card__title{font-size:1.08rem;font-weight:900;color:#f0ebff;margin:0;letter-spacing:.02em}
.pf-card__desc{font-size:.82rem;color:rgba(210,200,245,.82);line-height:1.62;margin:0}
.pf-card__desc strong{color:#ddd6fe}
.pf-card__points{margin:0;padding:0 0 0 2px;list-style:none;display:flex;flex-direction:column;gap:5px}
.pf-card__points li{font-size:.78rem;color:rgba(200,190,240,.88);display:flex;gap:6px;align-items:flex-start;line-height:1.45}
.pf-card__price-row{display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-top:14px;border-top:1px solid rgba(140,90,255,.16)}
.pf-card__price{display:flex;align-items:center;gap:8px;background:rgba(90,40,200,.12);border:1px solid rgba(140,90,255,.12);border-radius:10px;padding:8px 12px}
.pf-coin-icon{display:inline-block;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#fffde0 0%,#ffd040 48%,#c97a08 100%);border:1.5px solid rgba(255,200,50,.55);box-shadow:0 0 8px rgba(255,195,40,.55),inset 0 1px 2px rgba(255,255,200,.6);flex-shrink:0}
.pf-coin-amount{font-size:.95rem;font-weight:900;color:#fcd262;letter-spacing:.02em}
.pf-coin-note{font-size:.74rem;color:rgba(210,190,255,.78);font-weight:500;margin-left:auto}
.pf-card__cta{width:100%;border:none;border-radius:10px;padding:12px 14px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;font-size:.88rem;font-weight:800;cursor:pointer;letter-spacing:.04em;transition:filter .2s,transform .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(109,40,217,.4),inset 0 1px 0 rgba(255,255,255,.18)}
.pf-card__cta:hover{filter:brightness(1.12);transform:translateY(-2px);box-shadow:0 8px 28px rgba(109,40,217,.55)}`;

const OLD_PRICE = '영구 해금 · 1회 약 500원';
const NEW_PRICE = '영구 해금 · 약 5,000원';

const targets = [
  join(BASE, 'index.html'),
  join(BASE, 'public', 'static', 'index.html'),
  join(BASE, 'public', 'en-us', 'index.html'),
  join(BASE, 'public', 'ja-jp', 'index.html'),
  join(BASE, 'public', 'zh-cn', 'index.html'),
  join(BASE, 'public', 'hi-in', 'index.html'),
  join(BASE, 'public', 'es-es', 'index.html'),
  join(BASE, 'public', 'fr-fr', 'index.html'),
  join(BASE, 'public', 'de-de', 'index.html'),
  join(BASE, 'public', 'nl-nl', 'index.html'),
  join(BASE, 'public', 'ms-my', 'index.html'),
];

let updated = 0;
let skipped = 0;

for (const fp of targets) {
  if (!existsSync(fp)) { console.log(`[SKIP] 없음: ${fp}`); skipped++; continue; }

  const orig = readFileSync(fp, 'utf8');
  let content = orig;

  const hasCss = content.includes(OLD_CSS);
  const hasPrice = content.includes(OLD_PRICE);

  if (!hasCss && !hasPrice) {
    // 이미 최신이거나 구조가 다른 파일
    if (content.includes(NEW_PRICE)) {
      console.log(`[SKIP] 이미 적용됨: ${fp}`);
    } else {
      console.log(`[WARN] 패턴 미발견: ${fp}`);
    }
    skipped++;
    continue;
  }

  if (hasCss) content = content.replaceAll(OLD_CSS, NEW_CSS);
  if (hasPrice) content = content.replaceAll(OLD_PRICE, NEW_PRICE);

  writeFileSync(fp, content, 'utf8');
  console.log(`[OK] 수정됨: ${fp} (css=${hasCss}, price=${hasPrice})`);
  updated++;
}

console.log(`\n완료: ${updated}개 수정, ${skipped}개 스킵`);
