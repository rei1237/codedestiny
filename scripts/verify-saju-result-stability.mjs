import './lib/mock-network-guard.cjs';
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { buildSajuSectionHtml } from '../worker/lib/saju-section/report.js';

const root = process.cwd();
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (['/', '/ggulggul/'].includes(pathname) ? '/index.html' : pathname));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file).catch(() => readFile(resolve(root, 'public', '.' + pathname)));
    res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const [name, engine, width] of [...(process.argv.includes('--webkit') ? [] : [['chromium', chromium, 1280], ['chromium', chromium, 390]]), ... (process.argv.includes('--chromium') ? [] : [['webkit', webkit, 390]])]) {
    const browser = await engine.launch();
    try {
      let bundleOwned = false;
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile:width<768, hasTouch:width<768, reducedMotion:'reduce' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
          if (url.pathname === '/api/saju/section') {
            // 묶음 본문은 구매 뒤에만 서버가 준다. 해금 판정은 워커 테스트가 맡고 여기서는 배달 흐름만 본다.
            const body = route.request().postDataJSON() || {}; const birth = body.birth || {};
            if (!bundleOwned) { await route.fulfill({ status: 402, json: { ok: false } }); return; }
            await route.fulfill({ json: { ok: true, unlocked: true, featureKey: body.featureKey, ...buildSajuSectionHtml({ featureKey: body.featureKey, birth: { calendarDate: birth.date, calType: birth.calType, timeKnown: birth.timeKnown !== false, hour: birth.hour, minute: birth.minute }, gender: body.gender, name: body.name, mode: body.mode, lang: body.lang, place: body.place }) } }); return;
          }
          if (url.pathname === '/api/honey/catalog') { await route.fulfill({ json: { ok: true, products: [], otherUses: [] } }); return; }
          await route.fulfill({ json: url.pathname === '/api/auth/me' ? { ok: true, authenticated: true, user: { id: 'mock-stability', name: '검증' } } : { ok: true, profiles: [], unlocks: [], data: {} } }); return;
        }
        if (url.origin !== origin) { await route.abort(); return; }
        await route.continue();
      });
      await context.addInitScript(() => {
        sessionStorage.setItem('privacyAgreed', 'true');
        sessionStorage.setItem('cd_signature_consult_session_closed_v1', '1');
      });
      const page = await context.newPage();
      page.on('dialog', d => d.dismiss());
      page.on('pageerror', e => console.log('pageerror', e.message));
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.cdOneStepFreeSajuEntry === 'function');
      if (await page.locator('#cdhMore:not([open]) > summary').count()) await page.locator('#cdhMore > summary').click();
      await page.locator('#cdQuickServices a[data-action="cdOneStepFreeSajuEntry"]').click();
      await page.locator('#birthDate').fill('19900515');
      await page.locator('#nameInput').fill('안정성검증');
      // 추정: 눌린 직후 계산 오버레이가 버튼을 덮어 클릭 재시도가 시간 초과하는 것으로 보인다(원인은 확인하지 못했다).
      // 시간 초과만 넘기고 기록을 남긴다. 계산이 실제로 시작됐는지는 바로 아래 결과 대기가 확인한다.
      await page.locator('#run-btn').click({ timeout: 5000 }).catch(error => {
        if (error.name !== 'TimeoutError') throw error;
        console.log('run-btn click timed out; the result wait below decides', JSON.stringify({ name, width }));
      });
      await page.waitForFunction(() => window.G_PILLARS && document.getElementById('resultPage')?.style.visibility === 'visible', null, { timeout: 60000 });
      await page.waitForFunction(() => !window.sajuCalculationRun && document.getElementById('sajuCalcLoadingOverlay')?.getAttribute('aria-hidden') === 'true');
      // 잠금 전: 묶음 카드와 유료 문장이 DOM에 없고 한 줄 성향과 묶음 안내만 있다.
      assert.equal(await page.locator('#sajuMonthReading').count(),0,'month reading hidden before unlock');
      assert.equal(await page.locator('#sajuContextReading').count(),0,'personal evidence hidden before unlock');
      assert.equal(await page.evaluate(() => document.body.innerHTML.includes('돈을 다루는 습관')),false,'paid ilju sentence absent before unlock');
      await page.waitForFunction(() => (document.getElementById('sajuNatalOneLiner')?.textContent || '').trim().length > 0);
      await page.locator('#sajuBundleOffer [data-cd-bundle-inline]').waitFor({state:'visible'});
      // 해금 뒤: 서버 본문과 묶음 카드가 나타나고 안내가 사라진다.
      bundleOwned = true;
      await page.evaluate(async () => {
        // 묶음은 저장 프로필 단위 권리다. 입력과 같은 출생 정보의 프로필을 고른 상태로 해금한다.
        const PID = 'mock-stability-profile'; await window.__cdEnsureDestinyProfileLoaded(); const profile = { id: PID, name: '검증', gender: window.__cdActiveBirthProfile.gender, birth: { ...window.__cdActiveBirthProfile.birth }, location: { lat: 37.5665, lng: 126.978, tzOffset: 9, name: '서울' } }; window.DestinyProfileManager.storage.save([profile]); window.DestinyProfileManager.storage.setCurrent(profile.id);
        window.isTileKeyUnlocked = key => key === 'saju_lifetime_bundle';
        window.dispatchEvent(new Event('cd:unlocks-changed'));
      });
      await page.waitForFunction(() => (document.getElementById('sajuIljuRich')?.textContent || '').includes('돈을 다루는 습관'), null, { timeout: 60000 });
      assert.ok(await page.locator('#sajuMonthReading').count(),'month reading rendered');
      assert.ok(await page.locator('#sajuContextReading').count(),'personal evidence rendered');
      assert.equal(await page.locator('#sajuBundleOffer [data-cd-bundle-inline]').count(),0,'offer removed after unlock');
      const beforeModal = await page.evaluate(() => {
        const detail = document.querySelector('#sajuIljuRich details');
        if (detail) detail.open = true;
        document.getElementById('sajuMonthReading').scrollIntoView({block:'start',behavior:'instant'});
        return { scroll: scrollY, birth: document.getElementById('birthDate').value };
      });
      await page.evaluate(() => showTsDetail('비견'));
      await page.locator('#tsModal').waitFor({state:'visible'});
      await page.evaluate(() => closeModal());
      await page.evaluate(() => new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
      assert.deepEqual(await page.evaluate(() => ({ scroll:scrollY, birth:document.getElementById('birthDate').value })),beforeModal,'detail modal preserves input and result scroll');
      // 모달만 닫아서는 본문이 다시 그려지지 않는다. 화자를 바꿔 서버 본문을 실제로 다시 받은 뒤 펼침이 남는지 본다.
      await page.evaluate(() => {
        window.__cdRedrawMark = document.querySelector('#sajuIljuRich details');
        document.querySelector('#sajuReadingHeader [data-saju-mode][aria-pressed="false"]').click();
      });
      await page.waitForFunction(() => !window.__cdRedrawMark.isConnected, null, { timeout: 30000 });
      const redrawn = await page.evaluate(() => document.querySelector('#sajuIljuRich details')?.open);
      console.log('redelivered detail open', JSON.stringify({ name, width, redrawn }));
      assert.equal(redrawn,true,'detail stays expanded after re-delivery');
      await page.evaluate(() => {
        window.dispatchEvent(new ErrorEvent('error', { message: 'mock optional renderer error' }));
        window.dispatchEvent(new Event('pageshow'));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(600);
      const state = await page.evaluate(() => ({ result: getComputedStyle(document.getElementById('resultPage')).display, input: getComputedStyle(document.getElementById('inputPage')).display, url: location.href }));
      console.log(JSON.stringify({ name, width, ...state }));
      assert.notEqual(state.result, 'none');
      assert.equal(state.input, 'none');
      await context.close();
    } finally { await browser.close(); }
  }
} finally { await new Promise(r => server.close(r)); }
