/**
 * _patch_admin_coingate_fix.mjs
 * 로케일 파일에 관리자 코인 게이트 보안 수정 적용:
 *  1) __cdRenderAuthSummary: isAdmin 파라미터 + ADMIN 배지 렌더링
 *  2) __cdAuthState: flower_admin_token 전용 UI + !t 조기 반환 개선
 *  3) 로그아웃 핸들러: sessionStorage.removeItem('flower_admin_token') 추가
 *  4) isAdminUser(): fortune_auth_role 쿠키 체크 제거 + regex 수정
 *
 * NOTE: 실제 `public/index.html`은 이미 multi_replace_string_in_file로 수정됨.
 *       이 스크립트는 나머지 10개 로케일 파일만 대상으로 함.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const LOCALE_FILES = [
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

// ── Replacement 1: __cdRenderAuthSummary ──────────────────────────────────
const R1_OLD = `          function __cdRenderAuthSummary(name, points) {
            var el = document.getElementById('authQuickLinks');
            if (!el) return;
            el.innerHTML =
              '<span class="auth-btn auth-btn--coin">' +
              '<i class="coin-icon" aria-hidden="true">🪙</i>' +
              '<span class="coin-amount">' + Number(points || 0).toLocaleString('ko-KR') + '</span>' +
              '<span class="coin-label">코인</span>' +
              '</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">🔓\\u00a0로그아웃</button>';`;

const R1_NEW = `          function __cdRenderAuthSummary(name, points, isAdmin) {
            var el = document.getElementById('authQuickLinks');
            if (!el) return;
            var adminBadgeHtml = isAdmin
              ? '<span class="admin-badge" title="관리자 모드 활성화 — 코인 제한 없음">'
                + '<i class="admin-badge__crown" aria-hidden="true">👑</i>'
                + '<span class="admin-badge__text">ADMIN</span>'
                + '</span> '
              : '';
            el.innerHTML =
              adminBadgeHtml +
              '<span class="auth-btn auth-btn--coin">' +
              '<i class="coin-icon" aria-hidden="true">🪙</i>' +
              '<span class="coin-amount">' + Number(points || 0).toLocaleString('ko-KR') + '</span>' +
              '<span class="coin-label">코인</span>' +
              '</span>' +
              '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">🔓\\u00a0로그아웃</button>';`;

// ── Replacement 2: __cdAuthState (locale version: already has isAdm detection
//    but has "if (!t) return;" before it — replace whole function) ──────────

// 로케일 파일의 __cdAuthState: isAdm 있고 if(!t) return 있는 버전
const R2_OLD_WITH_ISADM = `          function __cdAuthState() {
            try {
              var t = localStorage.getItem('fortune_auth_token');
              var el = document.getElementById('authQuickLinks');
              if (!el) return;
              if (!t) return;
              var us = localStorage.getItem('fortune_auth_user');
              var n = '사용자', p = 0, r = 'user';
              try { var u = JSON.parse(us || '{}'); n = u.name || n; p = Number(u.points || 0); r = u.role || 'user'; } catch (_) {}
              var isAdm = r === 'admin' || (function() {
                try { var tok = sessionStorage.getItem('flower_admin_token'); return !!(tok && /^[A-Za-z0-9_\\-]{20,}\\.[0-9a-f]{64}$/.test(tok)); } catch(_){return false;}
              }());
              __cdRenderAuthSummary(n, p, isAdm);

              fetch('/api/payments/me', {
                method: 'GET',
                headers: { Authorization: 'Bearer ' + t },
              })
                .then(function (response) {
                  if (!response.ok) throw new Error('auth_sync_failed');
                  return response.json();
                })
                .then(function (payload) {
                  var nextPoints = Number((((payload || {}).user || {}).points) || 0);
                  if (!Number.isFinite(nextPoints) || nextPoints < 0) return;

                  try {
                    var raw = localStorage.getItem('fortune_auth_user');
                    var user = raw ? JSON.parse(raw) : {};
                    if (typeof user !== 'object' || user === null) user = {};
                    user.name = user.name || n;
                    user.points = nextPoints;
                    localStorage.setItem('fortune_auth_user', JSON.stringify(user));
                  } catch (_) {}

                  __cdRenderAuthSummary(n, nextPoints, isAdm);
                  if (typeof window.__cdSetGoldenBalance === 'function') {
                    window.__cdSetGoldenBalance(nextPoints);
                  }
                })
                .catch(function () {});
            } catch (_) {}
          }`;

// isAdm 없는 구버전도 대응
const R2_OLD_WITHOUT_ISADM = `          function __cdAuthState() {
            try {
              var t = localStorage.getItem('fortune_auth_token');
              var el = document.getElementById('authQuickLinks');
              if (!el) return;
              if (!t) return;
              var us = localStorage.getItem('fortune_auth_user');
              var n = '사용자', p = 0;
              try { var u = JSON.parse(us || '{}'); n = u.name || n; p = Number(u.points || 0); } catch (_) {}
              __cdRenderAuthSummary(n, p);

              fetch('/api/payments/me', {
                method: 'GET',
                headers: { Authorization: 'Bearer ' + t },
              })
                .then(function (response) {
                  if (!response.ok) throw new Error('auth_sync_failed');
                  return response.json();
                })
                .then(function (payload) {
                  var nextPoints = Number((((payload || {}).user || {}).points) || 0);
                  if (!Number.isFinite(nextPoints) || nextPoints < 0) return;

                  try {
                    var raw = localStorage.getItem('fortune_auth_user');
                    var user = raw ? JSON.parse(raw) : {};
                    if (typeof user !== 'object' || user === null) user = {};
                    user.name = user.name || n;
                    user.points = nextPoints;
                    localStorage.setItem('fortune_auth_user', JSON.stringify(user));
                  } catch (_) {}

                  __cdRenderAuthSummary(n, nextPoints);
                  if (typeof window.__cdSetGoldenBalance === 'function') {
                    window.__cdSetGoldenBalance(nextPoints);
                  }
                })
                .catch(function () {});
            } catch (_) {}
          }`;

const R2_NEW = `          function __cdAuthState() {
            try {
              var t = localStorage.getItem('fortune_auth_token');
              var el = document.getElementById('authQuickLinks');
              if (!el) return;
              // flower_admin_token 포맷 검증 (서명 형식: payloadB64.hex64)
              var _adminTok = (function(){ try { return sessionStorage.getItem('flower_admin_token'); } catch(_){return null;} })();
              var _adminTokValid = !!(_adminTok && /^[A-Za-z0-9_\\-]{20,}\\.[0-9a-f]{64}$/.test(_adminTok));
              // 일반 인증 없이 관리자 패널 토큰만 있는 경우 — 관리자 표시 + 나가기 버튼
              if (!t) {
                if (_adminTokValid) {
                  el.innerHTML =
                    '<span class="admin-badge" title="관리자 패널 세션 — 코인 제한 없음">'
                    + '<i class="admin-badge__crown" aria-hidden="true">👑</i>'
                    + '<span class="admin-badge__text">ADMIN</span>'
                    + '</span> '
                    + '<button type="button" id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout">🔓\\u00a0나가기</button>';
                  var _abtn = document.getElementById('cdAuthLogoutBtn');
                  if (_abtn) {
                    _abtn.addEventListener('click', function () {
                      try { sessionStorage.removeItem('flower_admin_token'); } catch (_) {}
                      try { window.__cdAdminBypass = false; } catch (_) {}
                      location.reload();
                    });
                  }
                }
                return;
              }
              var us = localStorage.getItem('fortune_auth_user');
              var n = '사용자', p = 0, r = 'user';
              try { var u = JSON.parse(us || '{}'); n = u.name || n; p = Number(u.points || 0); r = u.role || 'user'; } catch (_) {}
              var isAdm = r === 'admin' || _adminTokValid;
              __cdRenderAuthSummary(n, p, isAdm);

              fetch('/api/payments/me', {
                method: 'GET',
                headers: { Authorization: 'Bearer ' + t },
              })
                .then(function (response) {
                  if (!response.ok) throw new Error('auth_sync_failed');
                  return response.json();
                })
                .then(function (payload) {
                  var nextPoints = Number((((payload || {}).user || {}).points) || 0);
                  if (!Number.isFinite(nextPoints) || nextPoints < 0) return;

                  try {
                    var raw = localStorage.getItem('fortune_auth_user');
                    var user = raw ? JSON.parse(raw) : {};
                    if (typeof user !== 'object' || user === null) user = {};
                    user.name = user.name || n;
                    user.points = nextPoints;
                    localStorage.setItem('fortune_auth_user', JSON.stringify(user));
                  } catch (_) {}

                  __cdRenderAuthSummary(n, nextPoints, isAdm);
                  if (typeof window.__cdSetGoldenBalance === 'function') {
                    window.__cdSetGoldenBalance(nextPoints);
                  }
                })
                .catch(function () {});
            } catch (_) {}
          }`;

// ── Replacement 3: 로그아웃 핸들러 (sessionStorage 추가) ─────────────────
const R3_OLD = `              btn.addEventListener('click', function () {
                ['fortune_auth_token', 'fortune_auth_user', 'fortune_auth_role'].forEach(function (k) {
                  try { localStorage.removeItem(k); } catch (_) {}
                });
                document.cookie = 'fortune_auth_token=;max-age=0;path=/;SameSite=Lax';
                document.cookie = 'fortune_auth_role=;max-age=0;path=/;SameSite=Lax';
                location.reload();
              });`;

const R3_NEW = `              btn.addEventListener('click', function () {
                ['fortune_auth_token', 'fortune_auth_user', 'fortune_auth_role'].forEach(function (k) {
                  try { localStorage.removeItem(k); } catch (_) {}
                });
                document.cookie = 'fortune_auth_token=;max-age=0;path=/;SameSite=Lax';
                document.cookie = 'fortune_auth_role=;max-age=0;path=/;SameSite=Lax';
                // 관리자 패널 세션 토큰도 반드시 제거 (핵심 보안 Fix)
                try { sessionStorage.removeItem('flower_admin_token'); } catch (_) {}
                try { window.__cdAdminBypass = false; } catch (_) {}
                location.reload();
              });`;

// ── Replacement 4: isAdminUser() — 쿠키 체크 제거 + regex fix ───────────
// 로케일 파일의 broken regex: \\- and \\. and \$
const R4_OLD_BROKEN_REGEX = `  function isAdminUser() {
    try {
      // 1) localStorage fortune_auth_user의 role 확인
      var user = readAuthUser();
      if (user && user.role === 'admin') return true;
      // 2) fortune_auth_role 쿠키 확인 (관리자 세션 쿠키)
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var pair = cookies[i].trim().split('=');
        if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;
      }
      // 3) flower_admin_token: admin panel login -> all features available without coins
      try {
        var tok = sessionStorage.getItem('flower_admin_token');
        if (tok && /^[A-Za-z0-9_\\\\-]{20,}\\\\.[0-9a-f]{64}\\$/.test(tok)) return true;
      } catch (_ss) {}
    } catch (_e) {}
    return false;
  }`;

// 정상 regex 버전 (이미 수정된 경우)
const R4_OLD_COOKIE = `  function isAdminUser() {
    try {
      // 1) localStorage fortune_auth_user의 role 확인
      var user = readAuthUser();
      if (user && user.role === 'admin') return true;
      // 2) fortune_auth_role 쿠키 확인 (관리자 세션 쿠키)
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var pair = cookies[i].trim().split('=');
        if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;
      }
      // 3) flower_admin_token: admin panel login -> all features available without coins
      try { if (sessionStorage.getItem('flower_admin_token')) return true; } catch (_ss) {}
    } catch (_e) {}
    return false;
  }`;

const R4_NEW = `  function isAdminUser() {
    try {
      // 1) fortune_auth_user.role 확인 (서버 발급 JWT 기반 — 신뢰)
      var user = readAuthUser();
      if (user && user.role === 'admin') return true;
      // 2) flower_admin_token: 관리자 패널 로그인 (서명 포맷 검증 필수 — 단순 truthy 차단)
      try {
        var _tok = sessionStorage.getItem('flower_admin_token');
        if (_tok && /^[A-Za-z0-9_\\-]{20,}\\.[0-9a-f]{64}$/.test(_tok)) return true;
      } catch (_ss) {}
    } catch (_e) {}
    return false;
  }`;

function applyPatches(filePath) {
  if (!existsSync(filePath)) {
    console.log(`SKIP (not found): ${filePath}`);
    return;
  }

  let content = readFileSync(filePath, 'utf8');
  let patchCount = 0;

  function replace(label, oldStr, newStr) {
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      patchCount++;
      return true;
    }
    return false;
  }

  // 1) __cdRenderAuthSummary
  replace('R1:renderAuthSummary', R1_OLD, R1_NEW);

  // 2) __cdAuthState (isAdm 있는 버전 우선, 없는 버전 폴백)
  if (!replace('R2:authState(isAdm)', R2_OLD_WITH_ISADM, R2_NEW)) {
    replace('R2:authState(legacy)', R2_OLD_WITHOUT_ISADM, R2_NEW);
  }

  // 3) 로그아웃 핸들러
  replace('R3:logout', R3_OLD, R3_NEW);

  // 4) isAdminUser (broken regex 버전 우선, cookie 버전 폴백)
  if (!replace('R4:isAdminUser(broken)', R4_OLD_BROKEN_REGEX, R4_NEW)) {
    replace('R4:isAdminUser(cookie)', R4_OLD_COOKIE, R4_NEW);
  }

  if (patchCount > 0) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`PATCHED (${patchCount} replacements): ${filePath}`);
  } else {
    console.log(`NO MATCH (${patchCount}): ${filePath}`);
  }
}

for (const f of LOCALE_FILES) {
  applyPatches(f);
}
console.log('Done.');
