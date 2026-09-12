import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.startsWith('/api/')) { res.writeHead(200, {'content-type':'application/json'}); res.end('{"ok":true,"unlocks":[],"profiles":[]}'); return; }
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});

async function assertSummaryVisible(page, label) {
  await page.locator('#summaryArea .saju-summary-report').waitFor({state:'visible'});
  const metrics = await page.locator('#summaryArea').evaluate(el => {
    const gateBody = el.closest('.cd-section-gate__body');
    const style = getComputedStyle(el);
    return {
      length: el.textContent.length,
      height: el.getBoundingClientRect().height,
      overflow: el.scrollWidth > el.clientWidth + 1,
      hidden: gateBody ? gateBody.getAttribute('aria-hidden') : '',
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
    };
  });
  // fate-scroll-reveal 의 IntersectionObserver 콜백은 스크롤 직후가 아니라 한 틱 뒤에 클래스를
  // 붙인다. 대기 없이 읽으면 회귀가 있어도 아직 'card' 상태라 단정이 항상 통과한다(실측).
  await page.waitForTimeout(400);
  // 🔴 데스크탑 전용 회귀: 해금 본문이 배달되면 #summaryCard 가 뷰포트보다 훨씬 커져
  // fate-scroll-reveal 의 비율 임계값(7%)에 영원히 도달하지 못하고 opacity:0 으로 굳었다.
  // 본문은 DOM 에 정상 배달된 채 화면에서만 사라지므로 길이 단정만으로는 잡힐 수 없다.
  const reveal = await page.locator('#summaryCard').evaluate(el => ({
    opacity: getComputedStyle(el).opacity,
    hiddenClass: el.classList.contains('fate-scroll-section-hidden'),
  }));
  assert.equal(reveal.hiddenClass, false, `${label}: scroll-reveal left the summary card hidden`);
  assert.notEqual(reveal.opacity, '0', `${label}: summary card faded out by scroll-reveal`);
  assert.ok(metrics.length > 24000 && metrics.height > 500, `${label}: summary body collapsed`);
  assert.equal(metrics.hidden, 'false', `${label}: summary gate relocked`);
  assert.equal(metrics.display, 'block', `${label}: summary display changed`);
  assert.notEqual(metrics.visibility, 'hidden', `${label}: summary hidden by CSS`);
  assert.notEqual(metrics.opacity, '0', `${label}: summary faded out`);
  assert.equal(metrics.overflow, false, `${label}: horizontal overflow`);
  return metrics;
}

try {
 // 모바일만 돌리면 데스크탑 전용 스크롤 리빌 회귀를 구조적으로 못 잡는다 — 두 셰을 모두 돌린다.
 for (const shell of [{width:390,height:844,label:'mobile'},{width:1280,height:900,label:'desktop'}])
 for (const alreadyUnlocked of [false, true]) {
  const context = await browser.newContext({viewport:{width:shell.width,height:shell.height}});
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => sessionStorage.setItem('privacyAgreed', 'true'));
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss());
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', message => { if (message.type() === 'error' && /Summary|renderSummary/.test(message.text())) console.log(message.text()); });
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]').click();
  await page.locator('#nameInput').fill('회귀검증');
  await page.locator('#birthDate').fill('1990-05-15');
  if (alreadyUnlocked) await page.evaluate(() => { window.unlockedFeatureMap.section_summary = true; });
  await page.locator('#run-btn').click();
  await page.waitForFunction(() => window.__cdLastSummaryArgs, {timeout:30000});
  if (!alreadyUnlocked) {
  const mismatchedProfileUnlock = await page.evaluate(() => {
    const grantsKey = 'cd_verified_unlock_grants_v1';
    try { localStorage.removeItem(grantsKey); } catch (_) {}
    window.__cdCurrentDestinyProfile = {
      id: 'stored-profile',
      profileId: 'stored-profile',
      gender: 'F',
      birth: {year: 1988, month: 8, day: 8, hour: 8, minute: 0}
    };
    window.__cdActiveBirthProfile = {
      gender: 'F',
      birth: {year: 1990, month: 5, day: 15, hour: 12, minute: 0}
    };
    const finalized = window._cdFinalizeUnlockState('section_summary', {
      ok: true,
      status: 'paid',
      featureKey: 'section_summary',
      accessGrant: {ok: true, featureKey: 'section_summary', evidenceId: 'pay-without-profile'}
    });
    const grants = JSON.parse(localStorage.getItem(grantsKey) || '{}');
    return {
      finalized,
      unlocked: window.isTileKeyUnlocked('section_summary'),
      grantKeys: Object.keys(grants)
    };
  });
  assert.equal(mismatchedProfileUnlock.finalized, false, 'profile-scoped saju unlock must not finalize without a matching profile');
  assert.equal(mismatchedProfileUnlock.unlocked, false, 'mismatched active profile must not inherit the stored profile unlock');
  assert.deepEqual(mismatchedProfileUnlock.grantKeys, [], 'profile-scoped saju unlock must not write an unscoped grant');
  assert.equal(await page.locator('#summaryArea').textContent(), '');
  await page.evaluate(() => {
    // Simulate a restored profile with current engine data but no transient calculate arguments.
    delete window.__cdLastSummaryArgs;
    window.__cdCurrentDestinyProfile = { profileId: 'profile-summary-race' };
    window.__cdActiveBirthProfile = { profileId: 'profile-summary-race', birth: {year: 1990, month: 5, day: 15, hour: 12, minute: 0} };
    window.unlockedFeatureMap.section_summary = true;
  });
  await page.locator('#summaryGate button[data-unlock-key]').click();
  }
  await page.locator('#summaryArea .saju-summary-report').waitFor({state:'visible'});
  await page.evaluate((alreadyUnlocked) => {
    if (alreadyUnlocked) return;
    window.__cdCurrentDestinyProfile = { profileId: 'profile-summary-race' };
    try {
      window._cdFinalizeUnlockState('section_summary', {
        data: {
          featureKey: 'section_summary',
          profileId: 'profile-summary-race',
          requestId: 'summary-race-payment',
          accessGranted: true,
          accessGrant: {
            featureKey: 'section_summary',
            profileId: 'profile-summary-race',
            evidenceId: 'summary-race-payment'
          }
        }
      });
      window.CodeDestinyAccessStore.applyAccessStateSnapshot({
        data: {
          userId: 'summary-race-user',
          profileId: 'profile-summary-race',
          currentProfileId: 'profile-summary-race',
          completeness: 'full',
          authority: 'server',
          degraded: false,
          unlockMap: { section_summary: false },
          accessUnlocks: {
            profileId: 'profile-summary-race',
            unlocks: { 'saju.fullReading': { unlocked: false } }
          }
        }
      }, { userId: 'summary-race-user', profileId: 'profile-summary-race' });
    } catch (error) {
      throw new Error('failed to simulate stale summary unlock snapshot: ' + error.message);
    }
  }, alreadyUnlocked);
  await page.waitForTimeout(900);
  // alreadyUnlocked 경로는 여기까지 오는 동안 #summaryGate 버튼 클릭(자동 스크롤 유발)을 거치지
  // 않는다 — run-btn 클릭이 유발하는 스크롤은 #resultPage 맨 위(block:'start')로 가지 #summaryCard
  // 위치까지 보장하지 않는다. 실사용자도 스크롤해야 도달하는 지점이니 뒤쪽 폭 루프(줄 168)와
  // 같은 방식으로 명시적으로 스크롤한 뒤 단정한다 — 그렇지 않으면 섹션 높이·뷰포트 조합에 따라
  // IntersectionObserver 가 아직 관찰조차 못 한 상태를 "리빌 실패"로 오판한다(실측: 데스크탑 셸에서만
  // 우연히 초기 뷰포트가 summaryCard 를 비껴가 실패했다).
  await page.locator('#summaryArea').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await assertSummaryVisible(page, `${shell.label} ${alreadyUnlocked ? 'previously unlocked stable' : 'restored stable after stale snapshot'}`);
  if (!alreadyUnlocked) {
    await page.evaluate(() => {
      // AccessStore/system bootstrap can replace the legacy global map after the body has rendered.
      // Verified profile-scoped grants must be merged before the next section-gate pass relocks the DOM.
      window.unlockedFeatureMap = {};
      window.dispatchEvent(new CustomEvent('cd:unlocks-changed', { detail: { source: 'forced-empty-legacy-map' } }));
    });
    await page.waitForTimeout(120);
    await assertSummaryVisible(page, `${shell.label} restored stable after legacy map replacement`);
  }
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    await page.locator('#summaryArea').scrollIntoViewIfNeeded();
    const metrics = await assertSummaryVisible(page, `${shell.label} ${alreadyUnlocked ? 'previously unlocked' : 'restored'} ${width}px`);
    const chapter = page.locator('#summaryArea .saju-summary-chapter__body').first();
    await chapter.locator('.saju-reading-depth').first().scrollIntoViewIfNeeded();
    assert.equal(await chapter.evaluate(el => getComputedStyle(el).maxHeight), 'none');
    assert.equal(await page.locator('#summaryArea .btn-sub').count(), 0);
    console.log(`PASS ${shell.label} ${alreadyUnlocked ? 'previously unlocked' : 'restored'} summary ${width}px: ${metrics.length} characters`);
  }
  await context.close();
 }
} finally { await browser.close(); server.close(); }
