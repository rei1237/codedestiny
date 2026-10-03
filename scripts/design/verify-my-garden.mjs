// Actual generated shell, local HTTP fixtures only; no provider or database access.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { watchForbiddenRequests } from './lib/forbidden-requests.mjs';

const root = path.resolve('public');
const out = path.resolve('build-cache/my-garden');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end('{"ok":false,"mock":true}'); return; }
  let rel = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const user = { id: 'garden-fixture', _id: 'garden-fixture', name: '달빛 정원', nickname: '달빛 정원', email: 'garden@example.invalid', hasLocalAuth: true };
const profile = { id: 'garden-profile', name: '연꽃', gender: 'F', birth: { year: 1995, month: 5, day: 15, hour: 12, minute: 0, calType: 'solar' }, location: { label: '대한민국 · 서울', country: 'KR', tz: 'Asia/Seoul', lat: 37.5665, lng: 126.978 } };
const results = [];
try {
  const scenarios = [
    ...[360, 390, 430, 1280].flatMap(width => ['pig', 'neo'].map(theme => ({ width, theme, member: true, profiles: [profile] }))),
    { width: 390, theme: 'pig', member: false, profiles: [] },
    { width: 390, theme: 'neo', member: true, profiles: [] },
    { width: 390, theme: 'pig', member: true, profiles: [profile], levelUp: true },
  ];
  for (const scenario of process.argv.includes('--draft') ? scenarios.filter(s => s.levelUp) : scenarios) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.width === 1280 ? 960 : 844 }, reducedMotion: scenario.levelUp ? 'no-preference' : 'reduce', serviceWorkers: 'block' });
    await context.addInitScript(({ user, scenario }) => {
      localStorage.setItem('fortuneThemeModeStateV1', scenario.theme);
      if (scenario.levelUp) localStorage.setItem('cd_level_v1', JSON.stringify({ v: 1, totalExp: 145, curveVersion: 2, days: {}, legacyMerged: true }));
      if (scenario.member) {
        localStorage.setItem('fortune_auth_user', JSON.stringify(user));
        localStorage.setItem('fortune_auth_token', 'mock-garden-token');
      }
    }, { user, scenario });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      let data = { ok: true, mock: true };
      if (url.pathname === '/api/auth/me') data = scenario.member ? { ok: true, authenticated: true, user } : { ok: true, authenticated: false };
      else if (url.pathname.startsWith('/api/profile')) data = { ok: true, profiles: scenario.profiles, currentId: scenario.profiles[0]?.id || '', subscription: { tier: 'none', isActive: false, profileLimit: 1 } };
      else if (/access-state|subscription|pass/.test(url.pathname)) data = { ok: true, user, profiles: scenario.profiles, currentId: scenario.profiles[0]?.id || '', subscription: { tier: 'none', isActive: false }, access: { unlocked: [], features: {} }, entitlements: [] };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage();
    const watch = watchForbiddenRequests(page);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const tag = `${scenario.width}-${scenario.theme}-${scenario.levelUp ? 'draft' : scenario.member ? scenario.profiles.length ? 'member' : 'empty' : 'guest'}`;
    try {
      await page.goto(origin + '/ggulggul/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.CDLevel && window.cdOpenAccount);
      if (scenario.profiles.length) await page.waitForFunction(() => document.querySelector('#dpMasterCard .dp-mc-name')?.textContent === '연꽃');
      await page.locator('#cdhAccountBtn').click();
      await page.waitForSelector('#cdAccountSheet[open]');
      assert.equal(await page.locator('[data-my-profile-name]').textContent(), scenario.profiles.length ? '연꽃' : '나의 달빛 정원');
      assert.ok(await page.locator('.my-garden-open').isVisible());
      assert.ok(await page.locator('.my-garden-open').evaluate(el => {
        const button = el.getBoundingClientRect();
        const hero = el.closest('.my-garden-hero').getBoundingClientRect();
        return button.bottom <= hero.bottom && button.bottom <= innerHeight && button.height >= 44;
      }), 'primary profile action is not clipped and is in the first viewport');
      const bounds = await page.locator('#cdAccountSheet').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }));
      assert.ok(bounds.left >= 0 && bounds.right <= scenario.width && bounds.scroll <= bounds.width + 1, `${tag} account overflow`);
      await page.screenshot({ path: path.join(out, `${tag}-my.png`) });
      await page.locator('.my-garden-settings summary').click();
      if (scenario.member) assert.ok(await page.locator('#cdAuthLogoutBtn').isVisible());
      await page.locator('.my-garden-open').click();
      await page.waitForSelector('#dpListSheet.dp-sheet--open');
      assert.equal(await page.locator('#cdAccountSheet').evaluate(el => el.open), false, 'account dialog closes before profile');
      assert.equal(await page.locator('#dpMasterCard').count(), 1, 'one authoritative profile card');
      await page.locator('#dpListSheet .dp-lvl__quests').waitFor({ state: 'visible' });
      const profileBounds = await page.locator('#dpListSheet').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right, height: el.getBoundingClientRect().height }));
      assert.ok(profileBounds.scroll <= profileBounds.width + 1 && profileBounds.right <= scenario.width, `${tag} profile overflow`);
      assert.ok(profileBounds.height > 750, 'profile uses the available screen');
      await page.screenshot({ path: path.join(out, `${tag}-profile.png`) });
      const before = await page.evaluate(() => window.CDLevel.snapshot().totalExp);
      if (scenario.levelUp) console.log('Draft initial EXP:', before);
      const quest = page.locator('#dpListSheet [data-dp-quest]:not([disabled])').first();
      await quest.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.CDLevel.snapshot().totalExp), before + await page.evaluate(() => window.CDLevel.awardRules.quest.exp), 'one quest awards existing EXP');
      assert.equal(await page.locator('.dp-lvl__feedback').textContent(), scenario.levelUp ? '한 단계 성장했어요. 달빛 정원에 꽃빛이 더해졌어요.' : '오늘의 실천이 쌓였어요.');
      if (scenario.levelUp) {
        assert.equal(await page.evaluate(() => window.CDLevel.snapshot().currentLevel), 2);
        assert.ok(await page.locator('.dp-lvl__yeoni').evaluate(el => el.getAnimations().length > 0), 'Yeoni celebrates a level-up');
        await page.screenshot({ path: path.join(out, `${tag}-levelup.png`) });
      }
      assert.ok(await page.evaluate(() => document.querySelector('#dpListSheet .dp-lvl__toggle') === document.activeElement), 'focus remains in growth panel after completion');
      await page.locator('.dp-lvl__toggle').click();
      assert.equal(await page.locator('#dpLvlQuests').isVisible(), false, 'collapse hides quests');
      await page.locator('.dp-lvl__toggle').click();
      await page.locator('#dpListSheet .dp-sheet-close').click();
      await page.waitForFunction(() => !!document.querySelector('#dpDestinyPanel #dpMasterCard'));
      await page.locator('#cdhAccountBtn').click();
      assert.ok((await page.locator('[data-my-growth] p').textContent()).includes('1/3'), 'summary refreshes after quest');
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#cdhAccountBtn').evaluate(el => el === document.activeElement), 'Escape returns focus');
      assert.equal(watch.forbidden.length, 0, 'no payment/LLM requests');
      results.push({ tag, bounds, profileBounds, errors, mockOnly: true, forbidden: watch.forbidden, passed: true });
      console.log(`PASS ${tag}`);
    } catch (error) {
      await page.screenshot({ path: path.join(out, `${tag}-failure.png`) });
      results.push({ tag, errors, failure: error.message });
      throw error;
    } finally { await context.close(); }
  }
} finally {
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(results, null, 2));
  await browser.close(); server.close();
}
