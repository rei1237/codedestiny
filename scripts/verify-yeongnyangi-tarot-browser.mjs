import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { fixtures } from './lib/yeongnyangi-mobile-payment.mjs';

const base = process.env.YEONGNYANGI_TEST_BASE || 'http://127.0.0.1:18126';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const built = await build({ stdin: { contents: "export {products} from './worker/yeongnyangi/payments/catalog'; export {readingCharts} from './worker/yeongnyangi/fortune/reading-presentation'; export {TAROT_CARDS} from './lib/tarot/tarot-cards.mjs';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false });
const { products, readingCharts, TAROT_CARDS } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const product = products.find(p => p.domain === 'tarot' && p.fishId === 'mackerel');
assert(product);
const output = 'build-cache/yeongnyangi-tarot';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }), results = [];
try {
  const cases = [3, 6].flatMap(count => [360, 390, 430, 1280].map(width => ({ count, width, failure: false }))).concat([{ count: 3, width: 390, failure: true }]);
  for (const { count, width, failure } of cases) {
    const f = await fixtures(browser, base, product, width);
    try {
      const cards = ['M00', 'W10', 'C02', 'S13', 'P06', 'P14'].slice(0, count).map((code, i) => ({ ...TAROT_CARDS.find(c => c.code === code), cardId: code, positionLabel: `자리 ${i + 1}`, orientation: i % 2 ? 'reversed' : 'upright', imageUrl: '/old-deck.jpg' }));
      const before = JSON.stringify(cards);
      const charts = readingCharts({ contexts: { tarot: { domain: 'tarot', facts: [{ id: 'tarot.cards', label: 'cards', value: cards }], limitations: [] } } }, []);
      assert.equal(JSON.stringify(cards), before, 'saved cards remain immutable');
      Object.assign(f.row, { state: 'COMPLETED', paid: true, charts, locale: 'ko', chapters: f.row.manifest.map(() => ({ title: '저장된 상담', summary: '카드에 담긴 흐름을 살펴보세요.', analysis: ['지금의 선택을 차분히 정리해 보세요.'] })) });
      if (failure) await f.context.route('**/assets/yeongnyangi/tarot/v1/W10-*', route => route.fulfill({ status: 404, body: 'fixture missing image' }));
      await f.page.goto(`${base}/yeongnyangi/result/?id=${f.row.id}`);
      const panel = f.page.getByRole('region', { name: '질문 위에 펼친 카드', exact: true });
      await panel.scrollIntoViewIfNeeded();
      const images = panel.locator('img');
      assert.equal(await images.count(), count);
      await images.evaluateAll(imgs => imgs.forEach(img => { img.loading = 'eager'; }));
      await f.page.waitForFunction(() => [...document.querySelectorAll('picture img')].every(img => img.complete && img.naturalWidth > 0));
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (let i = 0; i < count; i++) {
        const img = images.nth(i), src = await img.evaluate(el => el.currentSrc);
        assert(src.includes(`/assets/yeongnyangi/tarot/v1/${failure && i === 1 ? 'back' : cards[i].code}-600.`));
        assert(await img.getAttribute('alt'));
        const transform = await img.evaluate(el => getComputedStyle(el).transform);
        assert.equal(transform, i % 2 ? 'matrix(-1, 0, 0, -1, 0, 0)' : 'none');
        const bounds = await img.boundingBox();
        assert(Math.abs(bounds.width / bounds.height - 2 / 3) < .01);
        const button = panel.getByRole('button').nth(i);
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
      }
      if (failure) assert(await panel.getByRole('button').nth(1).innerText().then(text => text.includes('완드 10')));
      await panel.scrollIntoViewIfNeeded();
      await f.page.screenshot({ path: `${output}/${count}-${width}${failure ? '-fallback' : ''}.png` });
      await f.page.reload();
      await panel.waitFor();
      assert.equal(await panel.locator('img').count(), count);
      assert.equal(f.state.generates, 0);
      assert.equal(f.state.sdk.length, 0);
      assert.deepEqual(f.state.unknown, []);
      assert.deepEqual(f.state.errors, []);
      results.push({ count, width, failure, status: 'PASS' });
    } finally { await f.context.close(); }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ cases: results, realPgCalls: 0, realLlmCalls: 0, productionDbWrites: 0 }, null, 2));
}
console.log(`PASS ${results.length} mock result cases: saved order/orientation, 2:3 art, selection, reload, own-back fallback; no real PG/LLM/DB calls`);
