import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { FEATURE_KEY_PRICE_TABLE } from '../worker/lib/paid-feature-registry.js';

const base = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14124';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const output = 'build-cache/premium-entry';
await mkdir(output, { recursive: true });
const results = [], fonts = new Map();
const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const browser = await chromium.launch();
try {
  for (const [width, colorScheme, lang] of [[360, 'light', 'ko'], [390, 'light', 'ko'], [430, 'light', 'ko'], [1280, 'light', 'ko'], [390, 'dark', 'ko'], [390, 'light', 'en']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const paidRequests = [], errors = [], consoleMessages = [];
    await context.addCookies([{ name: 'fortune_auth_role', value: 'user', url: base }]);
    await context.addInitScript(locale => localStorage.setItem('cd_lang', locale), lang);
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      if (url.origin === 'https://assets.code-destiny.com' && /^\/fonts\/serif-(kr|latin)\/[a-f0-9]+\.woff2$/.test(path)) {
        if (!fonts.has(path)) fonts.set(path, readFile(`build-cache/premium-fonts/${path.slice('/fonts/'.length)}`));
        return route.fulfill({ body: await fonts.get(path), contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      if (url.origin !== base && !(url.hostname === 'yeongnyangi-qa.example.invalid' && path.startsWith('/api/'))) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      if (!path.startsWith('/api/')) return route.continue();
      if (/(?:generate|prepare|purchase|payment|checkout|confirm)/i.test(path)) paidRequests.push(path);
      const send = (json, status = 200) => route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' } });
      if (path === '/api/auth/me') return send({ ok: true, authenticated: true, user: { id: 'qa-owner', _id: 'qa-owner', name: 'QA', role: 'user' } });
      if (path === '/api/billing/funnel-event') return send({ ok: true });
      if (path === '/api/auth/refresh') return send({ ok: false }, 401);
      return send({ ok: false, reason: 'QA_UNMOCKED_API' }, 503);
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) consoleMessages.push(message.text());
    });
    for (const product of ['life-book-ai', 'love-secret-ai']) {
      await page.goto(`${base}/${product}/?lang=${lang}`, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('main header').first();
      try { await hero.locator('h2').waitFor(); } catch (error) {
        await page.screenshot({ path: `${output}/failure-${product}-${width}-${colorScheme}-${lang}.png` });
        console.error(await page.locator('body').innerText());
        throw error;
      }
      if (lang === 'en') await hero.getByRole('heading', { name: product === 'life-book-ai' ? 'Book of Life Expert Reading' : 'Love Strategy AI', exact: true }).waitFor();
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
      const featureKey = `${product}-consultation`;
      const amount = FEATURE_KEY_PRICE_TABLE[featureKey].amountKRW.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US');
      assert.match(await hero.innerText(), new RegExp(amount));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family === 'CodeDestinySerifKR' && font.status === 'loaded')));
      const backColors = await page.locator('.cd-feature-nav button').first().evaluate(el => {
        const css = getComputedStyle(el);
        return { background: css.backgroundColor.match(/[\d.]+/g).map(Number), ink: css.color.match(/[\d.]+/g).map(Number) };
      });
      const alpha = backColors.background[3] ?? 1;
      const lightestBackground = backColors.background.slice(0, 3).map(channel => channel * alpha + 255 * (1 - alpha));
      const levels = [luminance(backColors.ink.slice(0, 3)), luminance(lightestBackground)].sort((a, b) => b - a);
      assert.ok((levels[0] + .05) / (levels[1] + .05) >= 4.5, 'Back control remains readable even over white paper');
      const artwork = hero.locator('[aria-hidden="true"]').first();
      const art = await artwork.evaluate(async el => {
        const css = getComputedStyle(el), box = el.getBoundingClientRect();
        const url = css.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        const image = new Image(); image.src = url;
        await image.decode();
        return { width: box.width, height: box.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
      });
      assert.ok(Math.abs(art.width / art.height - art.naturalWidth / art.naturalHeight) < .015, 'Artwork keeps original proportions');
      const slug = `${product}-${width}-${colorScheme}-${lang}`;
      await page.screenshot({ path: `${output}/${slug}-entry.png`, caret: 'initial' });
      const start = hero.locator(product === 'life-book-ai' ? 'a[href="#life-book-form"]' : 'button');
      assert.ok((await start.boundingBox()).height >= 44);
      await start.focus(); await page.keyboard.press('Enter');
      const form = page.locator(product === 'life-book-ai' ? '#life-book-form' : '#love-secret-form');
      await page.waitForFunction(id => { const r = document.getElementById(id)?.getBoundingClientRect(); return r && r.top >= 60 && r.top < 200; }, await form.getAttribute('id'));
      assert.ok((await form.boundingBox()).width > (width >= 1000 ? 500 : width - 80), 'Form has usable reading width');
      if (product === 'life-book-ai') {
        await form.getByRole('radio').nth(1).click();
        const changed = FEATURE_KEY_PRICE_TABLE['life-fortune-ai-consultation'].amountKRW.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US');
        await hero.getByText(new RegExp(changed)).first().waitFor();
        assert.match(await hero.innerText(), new RegExp(changed));
      } else {
        await form.getByRole('button', { name: lang === 'ko' ? '다음' : 'Next', exact: true }).click();
        assert.match(await form.innerText(), /상담 스타일과 질문|Reading Style|Style|Question/);
      }
      await form.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
      await page.screenshot({ path: `${output}/${slug}-form.png`, caret: 'initial' });
      assert.deepEqual(paidRequests, [], 'Entry CTA only moves to the form');
      assert.deepEqual(errors, []);
      assert.deepEqual(consoleMessages.filter(message => /hydrated|hydration|didn't match/i.test(message)), [], 'No hydration mismatch');
      results.push({ product, width, colorScheme, lang, passed: true, consoleMessages: [...consoleMessages] });
      console.log(`PASS ${slug}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
console.log(`${results.length}/12 entry scenarios passed`);
