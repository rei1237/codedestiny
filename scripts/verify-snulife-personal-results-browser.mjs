// Local compiled legacy page with synthetic account/profile data only.
// This verifies that every SNULIFE in-page shortcut hydrates its owned server body.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { SNU_SAJU_FEATURES } from '../js/core/snu-campus-policy.mjs';

const root = process.cwd();
const profileId = 'fixture-gift';
const profile = {
  id: profileId, profileId, name: '검증 프로필', birthDate: '1990-05-15',
  birth: { year: 1990, month: 5, day: 15, hour: 12, minute: 0 }, gender: 'F',
  location: { lat: 37.5, lng: 127, tzOffset: 9 },
};
const user = { id: 'fixture-member', _id: 'fixture-member', name: '검증 회원', email: 'fixture@example.test' };
const resultKeys = [
  'rpt_energyCoordCard', 'rpt_villainCard', 'rpt_healthReportCard', 'rpt_specialCharmCard',
];
const targetByKey = {
  rpt_energyCoordCard: 'energyCoordCard',
  rpt_villainCard: 'villainCard',
  rpt_healthReportCard: 'healthReportCard',
  rpt_specialCharmCard: 'specialCharmCard',
};
const requests = [];

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end('{"ok":false,"code":"MOCK_ROUTE_NOT_IMPLEMENTED"}');
    return;
  }
  const leaf = pathname === '/ggulggul/' ? 'index.html' : decodeURIComponent(pathname.slice(1)) + (pathname.endsWith('/') ? 'index.html' : '');
  for (const base of pathname === '/ggulggul/' ? [root] : [resolve('public')]) {
    const file = resolve(base, leaf);
    if (!file.startsWith(base + sep)) continue;
    try {
      const bytes = await readFile(file);
      res.setHeader('content-type', ({
        '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
      })[extname(file)] || 'application/octet-stream');
      res.end(bytes);
      return;
    } catch { /* try the next local asset root */ }
  }
  res.writeHead(404); res.end();
});

await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.addInitScript(userValue => {
    localStorage.setItem('fortune_auth_user', JSON.stringify(userValue));
    localStorage.setItem('fortune_auth_token', 'fixture-only');
    sessionStorage.setItem('privacyAgreed', 'true');
  }, user);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname;
    const body = route.request().postDataJSON() || {};
    const send = (json, status = 200) => route.fulfill({ status, json });
    if (path === '/api/auth/me' || path === '/api/auth/refresh') return send({ ok: true, authenticated: true, user, token: 'fixture-only' });
    if (path.endsWith('/snu/status')) return send({
      ok: true, verified: true, profileId, features: SNU_SAJU_FEATURES,
      unlockedFeatureKeys: SNU_SAJU_FEATURES.map(item => item.featureKey),
    });
    if (path === '/api/profile' || path === '/api/yeongnyangi/profiles') return send({ ok: true, profiles: [profile], currentId: profileId });
    if (path.startsWith('/api/profile/')) return send({ ok: true, profile });
    if (path === '/api/activation-rewards/status') return send({ ok: true, accountId: user.id, tutorial: { eligible: false }, wallet: { balance: 0 }, policy: {}, recommendations: [] });
    if (path === '/api/saju/section') {
      requests.push({ featureKey: body.featureKey, profileId: body.profileId });
      const payload = {
        ok: true, unlocked: true, featureKey: body.featureKey,
        html: `<article data-snu-personalized="${body.featureKey}"><h3>${body.featureKey}</h3><p>${profile.name} personalized result</p></article>`,
      };
      if (body.featureKey === 'rpt_energyCoordCard') payload.energy = { recent: [], renderedAt: new Date(0).toISOString() };
      return send(payload);
    }
    if (path.includes('access-state')) return send({
      ok: true, userId: user.id, profileId, currentProfileId: profileId, authority: 'server', completeness: 'full', degraded: false,
      unlockMap: Object.fromEntries(SNU_SAJU_FEATURES.map(item => [item.featureKey, true])),
    });
    return send({ ok: false, code: 'MOCK_ROUTE_NOT_IMPLEMENTED' }, 503);
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(`${origin}/ggulggul/?action=cdOneStepFreeSajuEntry&entry=snulife`, { waitUntil: 'networkidle' });
  const essential = page.getByRole('button', { name: '필수만 동의', exact: true });
  if (await essential.isVisible()) await essential.click();
  await page.waitForFunction(() => window.__cdGetCurrentDestinyProfile?.()?.id === 'fixture-gift');
  await page.waitForFunction(() => window.G_PILLARS);
  await page.locator('#sajuCalcLoadingOverlay').waitFor({ state: 'hidden' });
  await page.locator('.cd-boot-gate__veil').waitFor({ state: 'hidden' });
  await page.locator('#snuReadingContents').waitFor();
  await page.locator('#snuReadingContents').evaluate(node => { node.open = true; });
  await page.evaluate(() => {
    window.__snuTimeline = [];
    window.addEventListener('cd:saju-section-delivered', event => window.__snuTimeline.push({ type: 'delivered', key: event.detail?.featureKey }));
    const host = document.getElementById('resultPage');
    new MutationObserver(() => {
      const area = document.getElementById('energyCoordSection');
      if (area) window.__snuTimeline.push({ type: 'energy', text: area.textContent.trim().slice(0, 80), personalized: !!area.querySelector('[data-snu-personalized]') });
    }).observe(host, { childList: true, subtree: true });
  });

  for (const featureKey of resultKeys) {
    const target = targetByKey[featureKey];
    await page.locator(`#snuReadingContents nav a[href="#${target}"]`).click();
    const marker = page.locator(`[data-snu-personalized="${featureKey}"]`);
    try {
      await marker.waitFor({ state: 'attached', timeout: 10_000 });
    } catch {
      const targetNode = page.locator(`#${target}`).first();
      throw new Error(`${featureKey} did not hydrate: ${JSON.stringify({ requests, timeline: await page.evaluate(() => window.__snuTimeline), targetHtml: await targetNode.evaluate(node => node.outerHTML.slice(0, 4000)) })}`);
    }
    const call = requests.find(entry => entry.featureKey === featureKey);
    assert.deepEqual(call, { featureKey, profileId }, `${featureKey} must request the bound gift profile`);
    const host = page.locator(`[data-snu-personalized="${featureKey}"]`);
    assert.match(await host.textContent(), /검증 프로필 personalized result/, featureKey);
    assert.equal(await host.isVisible(), true, `${featureKey} result must remain visible`);
    assert.equal(await host.locator('[data-cd-summary-fallback]').count(), 0);
  }
  console.log(JSON.stringify({ ok: true, profileId, delivered: resultKeys, requests: requests.filter(item => resultKeys.includes(item.featureKey)) }));
  await context.close();
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
