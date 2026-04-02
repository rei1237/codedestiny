// _patch_auth_buttons_js.mjs
// 로그인 auth 버튼 innerHTML JS 부분 패치 (locale 파일들)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

const FILES = [
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

// 식별자로 쓸 고유 문자열
const OLD_MARKER = 'padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,rgba(255,247,214,.95),rgba(255,227,165,.95));';

// OLD 블록 (6줄)
const buildOld = () =>
`              el.innerHTML =
              '<span class="auth-btn" style="display:inline-flex;align-items:center;gap:8px;' +
              'padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,rgba(255,247,214,.95),rgba(255,227,165,.95));' +
              'border:1px solid rgba(194,120,15,.45);color:#6b3a10;font-weight:800;font-size:.9rem;text-decoration:none;box-shadow:0 6px 14px rgba(128,72,7,.18);">' +
              '\uD83E\uDE99\u00a0보유\u00a0' + Number(points || 0).toLocaleString('ko-KR') + '코인</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--login" style="cursor:pointer;">\uD83D\uDD13\u00a0로그아웃</button>';`;

const OLD = buildOld();

const NEW =
`              el.innerHTML =
              '<span class="auth-btn auth-btn--coin">' +
              '<i class="coin-icon" aria-hidden="true">\uD83E\uDE99</i>' +
              '<span class="coin-amount">' + Number(points || 0).toLocaleString('ko-KR') + '</span>' +
              '<span class="coin-label">코인</span>' +
              '</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">\uD83D\uDD13\u00a0로그아웃</button>';`;

let patched = 0, skipped = 0;

for (const rel of FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { console.log(`[SKIP] not found: ${rel}`); skipped++; continue; }
  const src = fs.readFileSync(fp, 'utf8');

  if (!src.includes(OLD_MARKER)) {
    console.log(`[SKIP] marker not found / already patched: ${rel}`);
    skipped++;
    continue;
  }

  if (!src.includes(OLD)) {
    // 마커는 있는데 정확한 블록이 다른 경우 - 실제 내용 확인
    const idx = src.indexOf(OLD_MARKER);
    console.log(`[DBG]  marker found at ${idx} but full block mismatch: ${rel}`);
    console.log('---actual 6 lines:');
    const lines = src.split('\n');
    const lineNo = src.substring(0, idx).split('\n').length;
    console.log(lines.slice(lineNo - 2, lineNo + 6).join('\n'));
    skipped++;
    continue;
  }

  fs.writeFileSync(fp, src.replace(OLD, NEW), 'utf8');
  console.log(`[OK]   patched: ${rel}`);
  patched++;
}

console.log(`\nDone: ${patched} patched, ${skipped} skipped.`);
