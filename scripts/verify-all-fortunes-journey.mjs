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
import './lib/mock-network-guard.cjs';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const evidence = path.join(root, '.tmp', 'service-search');
fs.mkdirSync(evidence, { recursive: true });
const VIEWPORTS = [
  { w: 320, h: 568, mobile: true },
  { w: 375, h: 812, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 430, h: 932, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 820, h: 1180, mobile: true },
  { w: 1024, h: 768, mobile: true },
  { w: 1280, h: 900, mobile: false },
  { w: 1440, h: 900, mobile: false },
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
  // Returning-session race: the real bottom tab is usable while the deferred finder is still downloading.
  const earlyContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  let releaseFinder;
  const finderReady = new Promise(resolve => { releaseFinder = resolve; });
  await earlyContext.addInitScript(() => {
    sessionStorage.setItem('cdBootGateShownV1', '1');
    localStorage.setItem('cd:first-visit:v1:ggulggul:guest', JSON.stringify({ status: 'dismissed', step: 0 }));
  });
  await earlyContext.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' }));
  await earlyContext.route(/\/js\/core\/home-service-finder\.js/, async route => { await finderReady; await route.continue(); });
  try {
    const earlyPage = await earlyContext.newPage();
    await earlyPage.goto(`${origin}/ggulggul/`, { waitUntil: 'commit' });
    await earlyPage.waitForFunction(() => typeof window.cdOpenAllFortunes === 'function');
    await earlyPage.locator('#cdMobileBottomNav [data-nav-key="fortunes"]').click();
    releaseFinder();
    await earlyPage.locator('#cdAllFortunesSearch').waitFor({ state: 'visible', timeout: 15000 });
    await earlyPage.waitForFunction(() => document.querySelectorAll('#cdAllFortunesResults .fortune-gateway__rec').length > 20);
    console.log('[all-fortunes] delayed finder: first bottom-tab tap recovered');
  } finally { releaseFinder(); await earlyContext.close(); }

  for (const vp of viewports) {
    const tag = String(vp.w);
    const host = vp.mobile ? 'overview' : 'sheet';
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, locale: 'ko-KR' });
    await context.addInitScript(() => localStorage.setItem('cd:first-visit:v1:ggulggul:guest', JSON.stringify({ status: 'dismissed', step: 0 })));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      return route.continue();
    });
    const page = await context.newPage();
    const watch = watchForbiddenRequests(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
    try {
      // 1) 딥링크로 연다.
      await page.goto(`${origin}/ggulggul/?action=cdOpenAllFortunes`, { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => !document.documentElement.classList.contains('cd-boot-gate'), null, { timeout: 20000 });
      await page.waitForTimeout(1200);
      if (!(await waitRoot(page, `${tag} deeplink`, host))) continue;

      // 2) 전체에는 레지스트리와 컬렉션이 모두 포함되고 첫 결과는 첫 화면에 보인다.
      const registryCount = await page.evaluate(() => window.CodeDestinyAllFortunes.filter({}).length);
      const full = await page.locator(CARDS).count();
      if (full !== registryCount || full < 20) fail(tag, `default cards ${full} != registry ${registryCount}`);
      const firstTop = await page.locator(CARDS).first().evaluate(node => node.getBoundingClientRect().top);
      if (firstTop >= vp.h - 60) fail(tag, `first results below fold: ${firstTop}`);
      await page.screenshot({ path: path.join(evidence, `${tag}-search.png`) });
      if (vp.mobile) {
        // The bug lived above 768px on touch tablets; every chrome category must expose real cards.
        const ids = await page.locator('#cdMobileCollectionChromeBar [data-collection-id]').evaluateAll(nodes => nodes.map(node => node.dataset.collectionId).filter(id => id !== '__overview'));
        for (const id of ids) {
          await page.locator(`#cdMobileCollectionChromeBar [data-collection-id="${id}"]`).click();
          const visible = await page.waitForFunction(id => {
            const node = document.getElementById(id), box = node.getBoundingClientRect();
            const cards = [...node.querySelectorAll('.tarot-tile,.prem-card,.feature-card,.moon-preview-card,.lifebook-tile,.lovebible-tile,.lovesim-tile,.sibyl-entry-tile')];
            return box.left >= -1 && box.top >= 0 && box.width >= innerWidth - 2 && box.height > innerHeight / 2
              && cards.some(card => card.getClientRects().length && getComputedStyle(card).visibility === 'visible');
          }, id, { timeout: 2500 }).then(() => true).catch(() => false);
          if (!visible) {
            const detail = await page.locator(`#${id}`).evaluate(node => ({ rect: node.getBoundingClientRect().toJSON(), cards: [...node.querySelectorAll('.tarot-tile,.prem-card')].map(card => ({ rect: card.getBoundingClientRect().toJSON(), visibility: getComputedStyle(card).visibility })) }));
            fail(tag, `category ${id} has no visible card surface: ${JSON.stringify(detail)}`);
          }
          if (await page.locator(`#cdMobileCollectionChromeBar [data-collection-id="${id}"][aria-current="page"]`).count() !== 1) fail(tag, `category ${id} selected tab mismatch`);
          if (id === 'animalCollection' || id === 'cosmicCollection') {
            await page.waitForFunction(id => {
              const node = document.getElementById(id), first = node.querySelector('.tarot-tile,.prem-card');
              const images = [...node.querySelectorAll('img')].filter(image => { const rect = image.getBoundingClientRect(); return rect.width > 0 && rect.top < innerHeight && rect.bottom > 0; });
              return first && Number(getComputedStyle(first).opacity) >= 0.99 && images.every(image => image.complete);
            }, id, { timeout: 10000 });
            await page.mouse.move(0, 0);
            await page.screenshot({ path: path.join(evidence, `${tag}-${id}.png`) });
          }
        }
        await page.locator('#cdMobileCollectionChromeBar [data-collection-id="__overview"]').click();
      }

      // 3) 동의어: '이직'(직장·진로 표기), '자미'(자미두수), '별자리'(점성술).
      for (const q of ['남친', '여친', '돈', '이직', '재회', '내년', '자미', '별자리', '나크샤트라']) {
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
      await page.click(`${ROOT} .cd-af__fchip[data-method="saju"]`);
      await page.click(`${ROOT} .cd-af__fchip[data-method="tarot"]`);
      await page.waitForTimeout(250);
      const tarot = await page.locator(CARDS).count();
      if (!tarot || tarot >= full) fail(tag, `tarot chip count ${tarot}/${full}`);
      if (await page.locator(`${ROOT} [data-method="saju"][aria-pressed="true"]`).count()) fail(tag, 'previous method remained selected');
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
      const link = page.locator('#cdAllFortunesResults a.fortune-gateway__rec[href^="/"]:not([data-pvw-paid]):not([data-action])').first();
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

      // 10) 유료 카드는 상세 시트(#tilePvwOverlay)를 맨 위에 연다 — 데스크톱 모달 시트가 최상위 레이어에 남아 덮으면 안 된다.
      await page.evaluate(() => window.cdOpenAllFortunes());
      if (await waitRoot(page, `${tag} paid`, host)) {
        await typeQuery(page, '');
        const today = page.locator(`${ROOT} .cd-af__chip[data-purpose="today"][aria-pressed="true"]`);
        if (await today.count()) await today.click();
        await page.waitForTimeout(300);
        const paid = page.locator('#cdAllFortunesResults [data-pvw-paid]').first();
        if (!(await paid.count())) fail(tag, 'no paid card to open');
        else {
          await paid.click();
          await page.waitForTimeout(1200);
          const top = await page.evaluate(() => {
            const o = document.getElementById('tilePvwOverlay');
            const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
            return { sheetOpen: !!document.getElementById('cdAllFortunes')?.open, overlay: !!o && getComputedStyle(o).display !== 'none', onTop: !!(el && el.closest('#tilePvwOverlay')) };
          });
          if (!top.overlay || !top.onTop || top.sheetOpen) fail(tag, `paid card detail not on top ${JSON.stringify(top)}`);
        }
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
