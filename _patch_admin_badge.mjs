/**
 * 관리자 로그인 배지 패치 — 로케일 파일들에 적용
 */
import fs from 'node:fs';
import path from 'node:path';

const root = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main';

const targets = [
  'public/en-us/index.html',
  'public/de-de/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/zh-cn/index.html',
  'public/static/index.html',
];

// CSS 삽입 위치 (logout hover 다음 줄에)
const CSS_OLD = `.auth-btn--logout:hover{transform:translateY(-1px);border-color:rgba(255,100,100,0.4);box-shadow:0 6px 18px rgba(200,50,50,0.2),inset 0 1px 0 rgba(255,255,255,0.07);color:#fca5a5}`;
const CSS_NEW = CSS_OLD + `
.admin-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 12px 5px 8px;border-radius:999px;background:linear-gradient(135deg,rgba(30,5,60,0.95),rgba(80,20,10,0.9));border:1px solid rgba(255,180,40,0.55);color:#fde68a;font-size:.78rem;font-weight:800;letter-spacing:.03em;box-shadow:0 0 0 1px rgba(255,120,0,0.18),0 4px 16px rgba(200,80,0,0.28),inset 0 1px 0 rgba(255,220,100,0.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);white-space:nowrap;cursor:default;animation:adminBadgePulse 3s ease-in-out infinite}
@keyframes adminBadgePulse{0%,100%{box-shadow:0 0 0 1px rgba(255,120,0,0.18),0 4px 16px rgba(200,80,0,0.28),inset 0 1px 0 rgba(255,220,100,0.18)}50%{box-shadow:0 0 0 2px rgba(255,160,0,0.35),0 4px 22px rgba(240,120,0,0.45),inset 0 1px 0 rgba(255,240,160,0.28)}}
.admin-badge__crown{font-style:normal;font-size:.9rem;line-height:1}
.admin-badge__text{font-size:.76rem;font-weight:900;background:linear-gradient(90deg,#fde68a,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}`;

// function 시그니처 + 내부 교체
const FN_OLD = `function __cdRenderAuthSummary(name, points) {
            var el = document.getElementById('authQuickLinks');
            if (!el) return;
            el.innerHTML =
              '<span class="auth-btn auth-btn--coin">' +
              '<i class="coin-icon" aria-hidden="true">\uD83E\uDE99</i>' +
              '<span class="coin-amount">' + Number(points || 0).toLocaleString('ko-KR') + '</span>' +
              '<span class="coin-label">\ucf54\uc778</span>' +
              '</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">\uD83D\uDD13\u00a0\ub85c\uADF8\uc544\uc6c3</button>';`;

const FN_NEW = `function __cdRenderAuthSummary(name, points, isAdmin) {
            var el = document.getElementById('authQuickLinks');
            if (!el) return;
            var adminBadgeHtml = isAdmin
              ? '<span class="admin-badge" title="\uad00\ub9ac\uc790 \ubaa8\ub4dc \ud65c\uc131\ud654 \u2014 \ucf54\uc778 \uc81c\ud55c \uc5c6\uc74c">' +
                '<i class="admin-badge__crown" aria-hidden="true">\uD83D\uDC51</i>' +
                '<span class="admin-badge__text">ADMIN</span>' +
                '</span> '
              : '';
            el.innerHTML =
              adminBadgeHtml +
              '<span class="auth-btn auth-btn--coin">' +
              '<i class="coin-icon" aria-hidden="true">\uD83E\uDE99</i>' +
              '<span class="coin-amount">' + Number(points || 0).toLocaleString('ko-KR') + '</span>' +
              '<span class="coin-label">\ucf54\uc778</span>' +
              '</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">\uD83D\uDD13\u00a0\ub85c\uADF8\uc544\uc6c3</button>';`;

// var n, p → var n, p, r + isAdm 추가
const STATE_OLD = `              var n = '\uc0ac\uc6a9\uc790', p = 0;
              try { var u = JSON.parse(us || '{}'); n = u.name || n; p = Number(u.points || 0); } catch (_) {}
              __cdRenderAuthSummary(n, p);`;

const STATE_NEW = `              var n = '\uc0ac\uc6a9\uc790', p = 0, r = 'user';
              try { var u = JSON.parse(us || '{}'); n = u.name || n; p = Number(u.points || 0); r = u.role || 'user'; } catch (_) {}
              var isAdm = r === 'admin' || (function() {
                try { var tok = sessionStorage.getItem('flower_admin_token'); return !!(tok && /^[A-Za-z0-9_\\-]{20,}\\.[0-9a-f]{64}$/.test(tok)); } catch(_){return false;}
              }());
              __cdRenderAuthSummary(n, p, isAdm);`;

// nextPoints 재호출
const NP_OLD = `                  __cdRenderAuthSummary(n, nextPoints);`;
const NP_NEW = `                  __cdRenderAuthSummary(n, nextPoints, isAdm);`;

let total = 0;
for (const rel of targets) {
  const abs = path.join(root, rel.replace(/\//g, path.sep));
  if (!fs.existsSync(abs)) { console.log(`SKIP (missing): ${rel}`); continue; }

  let text = fs.readFileSync(abs, 'utf8');
  let changed = 0;

  if (text.includes(CSS_OLD) && !text.includes('.admin-badge{')) {
    text = text.replace(CSS_OLD, CSS_NEW); changed++;
  }
  if (text.includes(FN_OLD)) {
    text = text.replace(FN_OLD, FN_NEW); changed++;
  }
  if (text.includes(STATE_OLD)) {
    text = text.replace(STATE_OLD, STATE_NEW); changed++;
  }
  if (text.includes(NP_OLD)) {
    text = text.replace(NP_OLD, NP_NEW); changed++;
  }

  if (changed > 0) {
    fs.writeFileSync(abs, text, 'utf8');
    console.log(`PATCHED (${changed} replacements): ${rel}`);
    total++;
  } else {
    console.log(`NO MATCH: ${rel}`);
  }
}
console.log(`\nDone. ${total} files patched.`);
