// 연이 정원 개편 전후 비교용 캡처: 6개 폭 × 비로그인/로그인 에서 홈 첫 화면·계정 패널·모든 운세를
// 찍고, 스크린샷이 아니라 요소 rect 로 잘림·가로 넘침·CLS 를 JSON 으로 남긴다.
// 사용: node scripts/design/capture-yeoni-garden.mjs --label=baseline [--root=<체크아웃>] [--widths=390,1280]
// 출력: .tmp/yeoni-garden/<label>/ (스크린샷은 커밋하지 않는다)
// /api/* 는 전부 로컬 mock 이다. 결제·생성 요청은 forbidden-requests 감시기로 0건인지 기록한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { watchForbiddenRequests } from './lib/forbidden-requests.mjs';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const label = arg('label', 'current');
const root = path.resolve(arg('root', process.cwd()));
const publicRoot = path.join(root, 'public');
const out = path.resolve(process.cwd(), '.tmp/yeoni-garden', label);
fs.mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { w: 320, h: 568, mobile: true },
  { w: 360, h: 740, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 430, h: 932, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 1280, h: 900, mobile: false },
];
const widths = arg('widths', '').split(',').map(Number).filter(Boolean);
const viewports = widths.length ? VIEWPORTS.filter((v) => widths.includes(v.w)) : VIEWPORTS;

// 긴 이름·이메일로 줄바꿈 실패를 드러낸다(실제 사용자 정보 아님).
const MEMBER = {
  id: 'u_fixture_yeoni',
  name: '연꽃정원에오래머무는아주긴이름의사용자',
  email: 'very.long.fixture.address.for.wrapping@example.invalid',
  points: 0,
  role: 'user',
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

let authMode = 'guest';
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) {
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/api/auth/me') return authMode === 'member' ? json(200, { authenticated: true, user: MEMBER }) : json(200, { authenticated: false });
    if (url.pathname === '/api/subscription/status') return json(200, { active: false, mock: true });
    if (url.pathname === '/api/reviews') return json(200, { reviews: [], mock: true });
    return json(401, { ok: false, mock: true, code: 'UNAUTHENTICATED' });
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

const browser = await chromium.launch();
const results = [];

async function rectOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height), display: cs.display, visibility: cs.visibility };
  }, selector);
}

try {
  for (const vp of viewports) {
    for (const state of ['guest', 'member']) {
      authMode = state;
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'ko-KR' });
      await context.addInitScript(({ member, user }) => {
        try {
          if (member) localStorage.setItem('fortune_auth_user', JSON.stringify(user));
          window.__cdCls = 0;
          new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cdCls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        } catch (_) {}
      }, { member: state === 'member', user: MEMBER });
      const page = await context.newPage();
      const watch = watchForbiddenRequests(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
      const tag = `${vp.w}-${state}`;
      const row = { width: vp.w, height: vp.h, state };
      try {
        await page.goto(`${origin}/ggulggul/`, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(2500);
        row.metrics = await page.evaluate(() => ({
          innerWidth: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          cls: Math.round((window.__cdCls || 0) * 1000) / 1000,
          theme: document.documentElement.classList.contains('neo-mode') ? 'neo' : 'pig',
        }));
        row.header = await rectOf(page, '.cdh-top');
        row.bottomNav = await rectOf(page, '#cdMobileBottomNav');
        row.themeSwitch = await rectOf(page, '#cdhThemeSlot');
        await page.screenshot({ path: path.join(out, `${tag}-home.png`) });

        // 계정 패널: 새 시트 트리거가 있으면 그걸, 없으면 옛 <details> 를 연다.
        const opener = (await page.$('[data-cd-account-open]:not([hidden])')) || (await page.$('.cdh-account > summary'));
        row.account = { opener: opener ? await opener.evaluate((e) => e.matches('[data-cd-account-open]') ? 'sheet' : 'details') : 'none' };
        if (opener && (await opener.isVisible())) {
          await opener.click();
          await page.waitForTimeout(500);
          const sel = row.account.opener === 'sheet' ? '#cdAccountSheet' : '#cdhAccountSlot';
          row.account.rect = await rectOf(page, sel);
          row.account.clip = await page.evaluate((s) => {
            const el = document.querySelector(s);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const y = Math.min(r.top + 24, innerHeight - 2);
            const probe = (x) => { const hit = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, x)), y); return !!hit && el.contains(hit); };
            return { leftInside: probe(r.left + 6), rightInside: probe(r.right - 6), offLeft: r.left < 0, offRight: r.right > innerWidth, offBottom: r.bottom > innerHeight };
          }, sel);
          row.account.scrollWidthOpen = await page.evaluate(() => document.documentElement.scrollWidth);
          await page.screenshot({ path: path.join(out, `${tag}-account.png`) });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
          if (row.account.opener === 'details') await page.evaluate(() => { const d = document.querySelector('.cdh-account'); if (d) d.open = false; });
        } else {
          row.account.visible = false;
        }

        await page.evaluate(() => { if (typeof window.cdOpenAllFortunes === 'function') window.cdOpenAllFortunes(); });
        await page.waitForTimeout(900);
        row.allFortunes = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, scrollY: Math.round(scrollY) }));
        await page.screenshot({ path: path.join(out, `${tag}-all-fortunes.png`) });
      } catch (e) {
        row.error = String(e.message).slice(0, 300);
      }
      row.pageErrors = errors;
      row.apiRequests = watch.seen.length;
      row.forbidden = watch.forbidden;
      results.push(row);
      console.log(JSON.stringify({ tag, scrollWidth: row.metrics?.scrollWidth, cls: row.metrics?.cls, account: row.account, forbidden: row.forbidden.length }));
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ label, root, capturedAt: new Date().toISOString(), results }, null, 2));
}
const forbiddenTotal = results.reduce((n, r) => n + r.forbidden.length, 0);
console.log(`[capture-yeoni-garden] ${results.length} runs → ${path.relative(process.cwd(), out)} · forbidden=${forbiddenTotal}`);
if (forbiddenTotal) process.exitCode = 1;
