// _patch_auth_buttons.mjs
// 로그인 상태 "보유 코인" & "로그아웃" 버튼 UI 다크 코스믹 테마로 리디자인
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

// ── 1) CSS: auth-btn 클래스 교체 ─────────────────────────────────────────────
const OLD_BTN_CSS =
`.auth-quick-links{display:flex;justify-content:center;gap:12px;margin-top:20px;flex-wrap:wrap}
.auth-btn{display:inline-flex;align-items:center;justify-content:center;min-width:120px;min-height:44px;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;font-size:.9rem}
.auth-btn--signup{color:#fff;background:linear-gradient(135deg,rgba(124,58,237,0.9),rgba(99,102,241,0.85));border:1px solid rgba(180,120,255,0.35)}
.auth-btn--login{color:#e2e8f0;background:rgba(15,23,42,0.8);border:1px solid rgba(234,179,8,0.5)}`;

const NEW_BTN_CSS =
`.auth-quick-links{display:flex;justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap}
.auth-btn{display:inline-flex;align-items:center;justify-content:center;min-width:120px;min-height:44px;padding:10px 22px;border-radius:999px;text-decoration:none;font-weight:700;font-size:.9rem;transition:transform .22s ease,box-shadow .22s ease,filter .22s ease}
.auth-btn--signup{color:#fff;background:linear-gradient(135deg,rgba(124,58,237,0.9),rgba(99,102,241,0.85));border:1px solid rgba(180,120,255,0.35);box-shadow:0 4px 18px rgba(124,58,237,0.35)}
.auth-btn--signup:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(124,58,237,0.5)}
.auth-btn--login{color:#e2e8f0;background:rgba(15,23,42,0.8);border:1px solid rgba(234,179,8,0.5)}
.auth-btn--coin{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:999px;background:linear-gradient(135deg,rgba(18,8,42,0.9),rgba(32,14,68,0.86));border:1px solid rgba(255,200,80,0.32);color:#ffe7a0;font-weight:800;font-size:.9rem;text-decoration:none;box-shadow:0 6px 24px rgba(0,0,0,0.45),0 0 0 1px rgba(200,140,255,0.1),inset 0 1px 0 rgba(255,230,130,0.12);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:default;letter-spacing:.01em}
.auth-btn--coin .coin-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff9d0 0%,#ffd040 46%,#c97a08 100%);border:1.5px solid rgba(255,215,0,0.4);box-shadow:0 0 10px rgba(255,200,50,0.55),inset 0 1px 4px rgba(255,255,200,0.55);font-style:normal;font-size:.75rem;flex-shrink:0}
.auth-btn--coin .coin-amount{font-size:.88rem;font-weight:900;color:#fde68a;text-shadow:0 0 6px rgba(255,200,60,0.4);white-space:nowrap}
.auth-btn--coin .coin-label{font-size:.75rem;font-weight:700;color:rgba(255,220,100,0.7);white-space:nowrap}
.auth-btn--logout{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);color:rgba(226,232,240,0.8);font-weight:700;font-size:.88rem;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.07);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
.auth-btn--logout:hover{transform:translateY(-1px);border-color:rgba(255,100,100,0.4);box-shadow:0 6px 18px rgba(200,50,50,0.2),inset 0 1px 0 rgba(255,255,255,0.07);color:#fca5a5}`;

// ── 2) JS innerHTML: inline 스타일 → 클래스 교체 ────────────────────────────
const OLD_INLINE_JS =
`el.innerHTML =
              '<span class="auth-btn" style="display:inline-flex;align-items:center;gap:8px;' +
              'padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,rgba(255,247,214,.95),rgba(255,227,165,.95));' +
              'border:1px solid rgba(194,120,15,.45);color:#6b3a10;font-weight:800;font-size:.9rem;text-decoration:none;box-shadow:0 6px 14px rgba(128,72,7,.18);">' +
              '🪙\u00a0보유\u00a0' + Number(points || 0).toLocaleString('ko-KR') + '코인</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--login" style="cursor:pointer;">🔓\u00a0로그아웃</button>';`;

const NEW_INLINE_JS =
`el.innerHTML =
              '<span class="auth-btn auth-btn--coin">' +
              '<i class="coin-icon" aria-hidden="true">🪙</i>' +
              '<span class="coin-amount">' + Number(points || 0).toLocaleString('ko-KR') + '</span>' +
              '<span class="coin-label">코인</span>' +
              '</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">🔓\u00a0로그아웃</button>';`;

let patched = 0, skipped = 0;

for (const rel of FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { console.log(`[SKIP] not found: ${rel}`); skipped++; continue; }
  let src = fs.readFileSync(fp, 'utf8');

  const hasOldCss = src.includes(OLD_BTN_CSS);
  const hasOldJs  = src.includes(OLD_INLINE_JS);

  if (!hasOldCss && !hasOldJs) {
    console.log(`[SKIP] already patched or mismatch: ${rel}`);
    skipped++;
    continue;
  }

  if (hasOldCss) src = src.replace(OLD_BTN_CSS, NEW_BTN_CSS);
  if (hasOldJs)  src = src.replace(OLD_INLINE_JS, NEW_INLINE_JS);

  fs.writeFileSync(fp, src, 'utf8');
  console.log(`[OK]   patched (css=${hasOldCss}, js=${hasOldJs}): ${rel}`);
  patched++;
}

console.log(`\nDone: ${patched} patched, ${skipped} skipped.`);
