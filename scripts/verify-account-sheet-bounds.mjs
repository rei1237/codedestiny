#!/usr/bin/env node
// 계정 시트(/ggulggul/ 헤더 → dialog#cdAccountSheet)가 모든 폭에서 화면 안에 온전히 뜨는지 rect 로 단언한다.
// 🔴 옛 패널은 nav 안 absolute 상자라 모바일에서 왼쪽이 잘렸다(390px left −102px). 스크린샷이 아니라
//    getBoundingClientRect·elementFromPoint 로 판정해야 다시 깨졌을 때 숫자로 드러난다.
// 사용: npm run verify:account-sheet [-- --widths=320,390]
// /api/* 는 전부 로컬 mock이다. 로그인 회원이 첫 화면에서 하는 기존 보류 주문 읽기와 시트 조작을 구분한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { watchForbiddenRequests } from './design/lib/forbidden-requests.mjs';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const VIEWPORTS = [
  { w: 320, h: 568, mobile: true },
  { w: 360, h: 740, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 430, h: 932, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 1280, h: 900, mobile: false },
];
const widthArg = (process.argv.find((a) => a.startsWith('--widths=')) || '').slice(9);
const widths = widthArg.split(',').map(Number).filter(Boolean);
const viewports = widths.length ? VIEWPORTS.filter((v) => widths.includes(v.w)) : VIEWPORTS;

const MEMBER = {
  id: 'u_fixture_sheet',
  name: '연꽃정원에오래머무는아주긴이름의사용자',
  email: 'very.long.fixture.address.for.wrapping@example.invalid',
  points: 0,
  role: 'user',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

let authMode = 'guest';
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) {
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/api/auth/me') return authMode === 'member' ? json(200, { authenticated: true, user: MEMBER }) : json(200, { authenticated: false });
    if (req.method === 'GET' && url.pathname === '/api/payments/birth-profile-pending') return json(200, { orders: [] });
    if (url.pathname === '/api/subscription/status') return json(200, { active: false, mock: true });
    return json(401, { ok: false, mock: true });
  }
  let rel = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  let file = path.resolve(publicRoot, rel);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(publicRoot + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const fail = (tag, msg) => failures.push(`${tag}: ${msg}`);
const browser = await chromium.launch();

try {
  for (const vp of viewports) {
    for (const state of ['guest', 'member']) {
      authMode = state;
      const tag = `${vp.w} ${state}`;
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'ko-KR' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin === origin || !/^https?:$/.test(url.protocol) ? route.continue() : route.abort();
      });
      if (state === 'member') await context.addInitScript((user) => { try { localStorage.setItem('fortune_auth_user', JSON.stringify(user)); } catch (_) {} }, MEMBER);
      const page = await context.newPage();
      const watch = watchForbiddenRequests(page);
      let recoveryReadOnLoad;
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
      try {
        await page.goto(`${origin}/ggulggul/`, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(1500);
        // 기존 회원 셸은 첫 조작 전에 미수령 주문을 한 번 조회한다. 이후 같은 GET의 중복도 회귀다.
        recoveryReadOnLoad = state === 'member' && watch.forbidden.find(({ method, path }) => method === 'GET' && path === '/api/payments/birth-profile-pending');
        const header = page.locator('#cdHomeFunnel .cdh-top');
        const account = header.locator('#cdhAccountBtn');
        const label = await account.getAttribute('data-auth');
        if (state === 'guest') {
          for (const action of ['login', 'signup']) {
            const link = header.locator('[data-cd-guest-auth="' + action + '"]');
            if (!(await link.isVisible()) || new URL(await link.getAttribute('href'), origin).pathname !== '/' + action + '/') fail(tag, action + ' not available in the header');
          }
          const menu = header.locator('.yh-menu');
          if (!(await menu.evaluate(element => element.open))) await menu.locator('summary').click();
        }
        const openerId = state === 'guest' ? 'cdhGuestGardenBtn' : 'cdhAccountBtn';
        const btn = header.locator('#' + openerId);
        if (!(await btn.isVisible())) { fail(tag, 'garden opener not visible'); continue; }
        if (label !== state) fail(tag, `button data-auth=${label}`);
        await btn.click();
        await page.waitForTimeout(300);
        const m = await page.evaluate(() => {
          const sheet = document.getElementById('cdAccountSheet');
          const body = sheet && sheet.querySelector('.cd-sheet__body');
          const card = document.getElementById('authQuickLinks');
          const r = sheet.getBoundingClientRect();
          const nav = document.getElementById('cdMobileBottomNav');
          let navCovered = null;
          if (nav && nav.getBoundingClientRect().height) {
            const nr = nav.getBoundingClientRect();
            const hit = document.elementFromPoint(Math.round(nr.left + 8), Math.round(nr.top + nr.height / 2));
            navCovered = !hit || !nav.contains(hit);
          }
          return {
            open: sheet.open, modal: sheet.matches(':modal'), parentIsBody: sheet.parentNode === document.body,
            left: r.left, right: r.right, top: r.top, bottom: r.bottom,
            vw: document.documentElement.clientWidth, vh: (window.visualViewport ? visualViewport.height : innerHeight),
            pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            bodyOverflowX: body ? body.scrollWidth - body.clientWidth : -1,
            overflowCulprits: body ? Array.from(body.querySelectorAll('*')).filter((el) => el.getBoundingClientRect().right > body.getBoundingClientRect().right + 0.5).slice(0, 4).map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className || '').split(' ')[0]} w=${Math.round(el.getBoundingClientRect().width)}`) : [],
            cardInSheet: !!(card && sheet.contains(card)),
            hasUserCard: !!(card && card.querySelector('.cd-user-card')),
            hasPassword: !!sheet.querySelector('a[href="/account/password/"]'),
            hasLogout: !!sheet.querySelector('#cdAuthLogoutBtn'),
            focusInSheet: sheet.contains(document.activeElement),
            navCovered,
          };
        });
        if (!m.open || !m.modal) fail(tag, 'sheet not open as modal');
        if (!m.parentIsBody) fail(tag, 'sheet not hoisted to body');
        if (m.left < 0 || m.right > m.vw + 0.5) fail(tag, `off-screen x ${m.left.toFixed(1)}..${m.right.toFixed(1)} / ${m.vw}`);
        if (Math.abs(m.left - (m.vw - m.right)) > 1) fail(tag, `asymmetric margins ${m.left.toFixed(1)} vs ${(m.vw - m.right).toFixed(1)}`);
        if (m.top < 0 || m.bottom > m.vh + 0.5) fail(tag, `off-screen y ${m.top.toFixed(1)}..${m.bottom.toFixed(1)} / ${m.vh}`);
        if (m.pageOverflowX > 0) fail(tag, `page horizontal overflow ${m.pageOverflowX}`);
        if (m.bodyOverflowX > 0) fail(tag, `sheet body horizontal overflow ${m.bodyOverflowX} ${m.overflowCulprits.join(', ')}`);
        if (!m.cardInSheet) fail(tag, '#authQuickLinks not inside the sheet');
        if (!m.focusInSheet) fail(tag, 'focus not moved into the sheet');
        if (m.navCovered === false) fail(tag, 'bottom nav still hit-testable under the sheet');
        if (state === 'member' && !(m.hasUserCard && m.hasPassword && m.hasLogout)) fail(tag, `member card incomplete ${JSON.stringify({ card: m.hasUserCard, password: m.hasPassword, logout: m.hasLogout })}`);
        if (state === 'guest' && m.hasUserCard) fail(tag, 'guest sees a member card');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        const after = await page.evaluate((id) => ({
          open: document.getElementById('cdAccountSheet').open,
          focusBack: document.activeElement && document.activeElement.id === id,
          expanded: document.getElementById(id).getAttribute('aria-expanded'),
          bodyOverflow: document.body.style.overflow,
        }), openerId);
        if (after.open) fail(tag, 'Escape did not close');
        if (!after.focusBack) fail(tag, 'focus did not return to the header button');
        if (after.expanded !== 'false') fail(tag, `aria-expanded=${after.expanded}`);
        if (after.bodyOverflow === 'hidden') fail(tag, 'body scroll lock leaked');

        // 스크롤 위치 복원 + 시트 안 링크가 시트를 먼저 닫는지(프로필 카드 액션).
        const restore = await page.evaluate(async (id) => {
          window.scrollTo({ top: 400, behavior: 'instant' });
          await new Promise((r) => requestAnimationFrame(r));
          const y0 = Math.round(scrollY);
          window.CodeDestinyShellSheet.open('cdAccountSheet', document.getElementById(id));
          await new Promise((r) => setTimeout(r, 100));
          window.CodeDestinyShellSheet.close('cdAccountSheet');
          await new Promise((r) => setTimeout(r, 100));
          return { y0, y1: Math.round(scrollY) };
        }, openerId);
        if (Math.abs(restore.y0 - restore.y1) > 1) fail(tag, `scroll not restored ${restore.y0} → ${restore.y1}`);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        if (vp.w === 1280) {
          await btn.click();
          await page.waitForTimeout(200);
          // 패널(가운데 400px) 밖 확실한 배경 지점. (8,8) 같은 가장자리는 스크롤바 거터라 backdrop 이 안 잡힌다(실측).
          await page.mouse.click(40, Math.round(vp.h / 2));
          await page.waitForTimeout(200);
          if (await page.evaluate(() => document.getElementById('cdAccountSheet').open)) fail(tag, 'backdrop click did not close');
        }
        // 마지막: 시트 안 액션은 시트를 먼저 닫는다(프로필 화면이 열려 헤더를 덮으므로 맨 끝에 둔다).
        await btn.click();
        await page.waitForTimeout(200);
        await page.locator('#cdAccountSheet [data-action="dpOpenList"]').click();
        await page.waitForTimeout(300);
        if (await page.evaluate(() => document.getElementById('cdAccountSheet').open)) fail(tag, 'inner action did not close the sheet');

      } catch (e) {
        fail(tag, String(e.message).slice(0, 200));
      } finally {
        if (errors.length) fail(tag, `page errors: ${errors.join(' | ')}`);
        const unexpected = watch.forbidden.filter(f => f !== recoveryReadOnLoad);
        for (const f of unexpected) fail(tag, `forbidden request ${f.method} ${f.path} (${f.why})`);
        console.log(`[verify-account-sheet] ${tag}: api=${watch.seen.length} initialRecoveryRead=${Number(Boolean(recoveryReadOnLoad))} forbidden=${unexpected.length}`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`[verify-account-sheet] FAIL ${failures.length}\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`[verify-account-sheet] OK ${viewports.length * 2} runs`);
