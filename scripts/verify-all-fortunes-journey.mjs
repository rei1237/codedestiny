#!/usr/bin/env node
// 모든 운세 화면(/ggulggul/ → 모바일 '모든 운세' 개요 패널 맨 위, 데스크톱 dialog#cdAllFortunes)의 여정을 브라우저로 단언한다.
// 딥링크로 열기 → 레지스트리 전체 카드 → 동의어 검색 → 빈 상태와 초기화 → 방식·고민 칩 → 카드로 떠났다가 뒤로 오면
// 다시 열리고 검색어·칩이 남는다 → 새로고침은 자동으로 열지 않되 다시 열면 상태가 남는다.
// 사용: npm run verify:all-fortunes-journey [-- --widths=390,1280]
// /api/* 는 전부 로컬 mock. 결제·생성 요청이 한 건이라도 나가면 실패.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { watchForbiddenRequests } from './design/lib/forbidden-requests.mjs';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const VIEWPORTS = [
  { w: 320, h: 568, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 1280, h: 900, mobile: false },
];
const widthArg = (process.argv.find((a) => a.startsWith('--widths=')) || '').slice(9);
const widths = widthArg.split(',').map(Number).filter(Boolean);
const viewports = widths.length ? VIEWPORTS.filter((v) => widths.includes(v.w)) : VIEWPORTS;

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(url.pathname === '/api/auth/me' ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(url.pathname === '/api/auth/me' ? { authenticated: false } : { ok: false, mock: true }));
    return;
  }
  let rel = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  let file = path.resolve(publicRoot, rel);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  // 정적 셸 밖(App Router) 목적지는 빈 문서로 받는다 — 이 검사는 "떠났다가 돌아오기"만 본다.
  if (!file.startsWith(publicRoot + path.sep) || !fs.existsSync(file)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>stub</title><p>stub</p>');
    return;
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const fail = (tag, msg) => failures.push(`${tag}: ${msg}`);
const browser = await chromium.launch();

const ROOT = '#cdAllFortunesRoot';
const CARDS = '#cdAllFortunesResults .fortune-gateway__rec';

async function rootVisible(page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: false, host: null };
    const r = el.getBoundingClientRect();
    const host = el.closest('#cdMobileFortuneOverview') ? 'overview' : el.closest('dialog[open]#cdAllFortunes') ? 'sheet' : 'none';
    return { ok: r.width > 0 && r.height > 0 && host !== 'none', host };
  }, ROOT);
}

async function waitRoot(page, tag, expectHost) {
  for (let i = 0; i < 30; i += 1) {
    const v = await rootVisible(page);
    if (v.ok) {
      if (v.host !== expectHost) fail(tag, `host=${v.host}, expected ${expectHost}`);
      return true;
    }
    await page.waitForTimeout(200);
  }
  fail(tag, 'all-fortunes block not visible');
  return false;
}

async function typeQuery(page, text) {
  await page.fill('#cdAllFortunesSearch', text);
  await page.waitForTimeout(400);
}

try {
  for (const vp of viewports) {
    const tag = String(vp.w);
    const host = vp.mobile ? 'overview' : 'sheet';
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'ko-KR' });
    const page = await context.newPage();
    const watch = watchForbiddenRequests(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
    try {
      // 1) 딥링크로 연다.
      await page.goto(`${origin}/ggulggul/?action=cdOpenAllFortunes`, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(1200);
      if (!(await waitRoot(page, `${tag} deeplink`, host))) continue;

      // 2) 아무것도 고르지 않으면 레지스트리 전체.
      const registryCount = await page.evaluate(() => (window.__cdServiceRegistry || []).length);
      const full = await page.locator(CARDS).count();
      if (full !== registryCount || full < 20) fail(tag, `default cards ${full} != registry ${registryCount}`);

      // 3) 동의어: '이직'(직장·진로 표기), '자미'(자미두수), '별자리'(점성술).
      for (const q of ['이직', '자미', '별자리', '나크샤트라']) {
        await typeQuery(page, q);
        const n = await page.locator(CARDS).count();
        if (!n) fail(tag, `synonym query "${q}" found nothing`);
      }

      // 4) 빈 상태와 초기화.
      await typeQuery(page, '없는운세쿼리zz');
      const empty = page.locator('#cdAllFortunesResults .cd-af__empty');
      if (!(await empty.isVisible())) fail(tag, 'empty state not visible');
      else if (!/찾는 운세가 없어요/.test(await empty.innerText())) fail(tag, 'empty state copy');
      await page.click('#cdAllFortunesResults .cd-af__empty-reset');
      await page.waitForTimeout(300);
      if ((await page.inputValue('#cdAllFortunesSearch')) !== '') fail(tag, 'reset did not clear query');
      if ((await page.locator(CARDS).count()) !== full) fail(tag, 'reset did not restore full list');

      // 5) 방식 칩 → 고민 칩으로 좁힌다.
      await page.click(`${ROOT} .cd-af__fchip[data-method="tarot"]`);
      await page.waitForTimeout(250);
      const tarot = await page.locator(CARDS).count();
      if (!tarot || tarot >= full) fail(tag, `tarot chip count ${tarot}/${full}`);
      await page.click(`${ROOT} .cd-af__chip[data-purpose="love"]`);
      await page.waitForTimeout(250);
      const tarotLove = await page.locator(CARDS).count();
      if (!tarotLove || tarotLove > tarot) fail(tag, `tarot+love count ${tarotLove}/${tarot}`);
      // '기타' 방식은 레지스트리 밖 컬렉션 타일만 받는다(고민 칩이 켜져 있으면 0이 맞다).
      await page.click(`${ROOT} .cd-af__chip[data-purpose="love"]`);
      await page.click(`${ROOT} .cd-af__fchip[data-method="tarot"]`);
      await page.click(`${ROOT} .cd-af__fchip[data-method="etc"]`);
      await page.waitForTimeout(400);
      const etc = await page.locator(CARDS).count();
      if (!etc) fail(tag, 'etc method chip found no collection tiles');
      await page.click(`${ROOT} .cd-af__fchip[data-method="etc"]`);

      // 6) 가로 넘침 없음.
      const overflow = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return { doc: document.documentElement.scrollWidth - window.innerWidth, block: el.scrollWidth - el.clientWidth };
      }, ROOT);
      if (overflow.doc > 1 || overflow.block > 1) fail(tag, `horizontal overflow ${JSON.stringify(overflow)}`);

      // 7) 카드로 떠났다가 뒤로 오면 다시 열리고 상태가 남는다.
      await typeQuery(page, '오늘');
      await page.click(`${ROOT} .fortune-gateway__chip, ${ROOT} .cd-af__chip[data-purpose="today"]`);
      await page.waitForTimeout(300);
      const link = page.locator('#cdAllFortunesResults a.fortune-gateway__rec[href^="/"]:not([data-pvw-paid])').first();
      if (!(await link.count())) { fail(tag, 'no free same-origin card to follow'); continue; }
      await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/ggulggul'), { timeout: 15000 }), link.click()]);
      await page.goBack({ waitUntil: 'load' });
      await page.waitForTimeout(1500);
      if (await waitRoot(page, `${tag} back`, host)) {
        if ((await page.inputValue('#cdAllFortunesSearch')) !== '오늘') fail(tag, 'query not restored after back');
        const pressed = await page.locator(`${ROOT} .cd-af__chip[data-purpose="today"][aria-pressed="true"]`).count();
        if (pressed !== 1) fail(tag, 'purpose chip not restored after back');
      }

      // 8) 새로고침은 자동으로 열지 않는다. 다시 열면 상태가 남아 있다.
      await page.goto(`${origin}/ggulggul/`, { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(1500);
      if ((await rootVisible(page)).ok) fail(tag, 'reload reopened the screen by itself');
      await page.evaluate(() => window.cdOpenAllFortunes());
      if (await waitRoot(page, `${tag} reopen`, host)) {
        if ((await page.inputValue('#cdAllFortunesSearch')) !== '오늘') fail(tag, 'query not restored on reopen');
      }

      // 9) 데스크톱 시트는 Escape 로 닫힌다.
      if (!vp.mobile) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        if (await page.evaluate(() => document.getElementById('cdAllFortunes').open)) fail(tag, 'Escape did not close the sheet');
      }

      if (watch.forbidden.length) fail(tag, `forbidden requests ${JSON.stringify(watch.forbidden)}`);
      if (errors.length) fail(tag, `page errors ${JSON.stringify(errors.slice(0, 3))}`);
      console.log(`[all-fortunes] ${tag}: cards ${full}, tarot ${tarot}, tarot+love ${tarotLove}, etc ${etc}, api ${watch.seen.length}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`[all-fortunes] FAIL ${failures.length}`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log(`[all-fortunes] OK ${viewports.length} viewports`);
