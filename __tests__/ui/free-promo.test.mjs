import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FREE_PROMO, FREE_PROMO_COPY_KO, freePromoDaysLeft, freePromoDayLabel } from '../../lib/marketing/free-promo.mjs';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('free promo countdown follows the KST calendar and is display-only', () => {
  const end = FREE_PROMO.endsAt;
  assert.equal(end, '2027-02-12T23:59:59+09:00');
  assert.equal(freePromoDaysLeft(end, Date.parse('2026-11-12T09:00:00+09:00')), 92);
  assert.equal(freePromoDayLabel(92), 'D-92');
  // Late on the eve and early on the final day of the promotion.
  assert.equal(freePromoDaysLeft(end, Date.parse('2027-02-11T23:59:00+09:00')), 1);
  assert.equal(freePromoDaysLeft(end, Date.parse('2027-02-12T00:01:00+09:00')), 0);
  assert.equal(freePromoDayLabel(0), 'D-DAY');
  assert.equal(freePromoDaysLeft(end, Date.parse('2027-02-13T00:00:00+09:00')), null);
  assert.equal(freePromoDayLabel(null), '');
});

test('free promo Korean copy, authored i18n and baked shell stay in sync', () => {
  const authored = JSON.parse(read('i18n/authored/freePromo-01.json'));
  for (const [key, ko] of Object.entries(FREE_PROMO_COPY_KO)) {
    const entry = authored['freePromo.' + key];
    assert.ok(entry, 'missing authored key freePromo.' + key);
    assert.equal(entry.ko, ko, 'ko drift: freePromo.' + key);
    assert.equal(Object.keys(entry).length, 12, 'freePromo.' + key + ' must cover 12 locales');
  }
  const shell = read('index.html');
  assert.ok(shell.includes(`data-ends="${FREE_PROMO.endsAt}"`), 'index.html banner must carry FREE_PROMO.endsAt');
  assert.ok(shell.includes('data-cd-trans="freePromo.tileBadge">' + FREE_PROMO_COPY_KO.tileBadge + '<'));
});

test('free promo end date never gates access', () => {
  for (const path of ['lib/payment/free-fortune-policy.mjs', 'worker/lib/paid-feature-registry.js']) {
    assert.ok(!read(path).includes('free-promo'), path + ' must not read the display-only promo');
  }
});

test('entry and Yeongnyangi surfaces reuse the policy banner with their own character treatment', () => {
  const root = read('app/page.js');
  const yeongnyangi = read('app/yeongnyangi/_home/FortuneHome.tsx');
  const banner = read('app/components/FreePromoBanner.tsx');
  assert.match(root, /<FreePromoBanner\s*\/>/);
  assert.match(yeongnyangi, /<FreePromoBanner variant="yeongnyangi" compact\/>/);
  assert.match(banner, /yeoni-cheer\.webp|FREE_PROMO_YEONI\.image/);
  assert.match(banner, /hero-480\.webp/);
  assert.match(banner, /!compact && <div className=\{styles\.groups\}/);
});

test('free promo list shows only features that are already free and reachable', async () => {
  const { FREE_PROMO_GROUPS, FREE_PROMO_SAJU_ACTION, FREE_PROMO_YEONI, freePromoItemHref } = await import('../../lib/marketing/free-promo.mjs');
  const { isFreeFortuneFeatureKey } = await import('../../lib/payment/free-fortune-policy.mjs');
  const { existsSync } = await import('node:fs');
  const vm = await import('node:vm');
  const win = {};
  vm.runInNewContext(read('js/core/service-registry.js'), { window: win });
  const registry = win.__cdServiceRegistry;
  const authored = JSON.parse(read('i18n/authored/freePromo-01.json'));
  const shell = read('index.html');
  const actionOk = (action) => action === FREE_PROMO_SAJU_ACTION || registry.some(entry => entry.action === action);
  const seen = new Set();
  for (const group of FREE_PROMO_GROUPS) {
    assert.ok(FREE_PROMO_COPY_KO[group.labelKey], 'group label ' + group.labelKey);
    for (const item of group.items) {
      assert.ok(!seen.has(item.id), 'duplicate item ' + item.id);
      seen.add(item.id);
      if (item.policyKey) {
        assert.ok(isFreeFortuneFeatureKey(item.policyKey), item.id + ': ' + item.policyKey + ' is not free in policy');
      } else {
        const entry = registry.find(e => e.id === item.freeStart);
        assert.ok(entry && ['무료 시작', '무료', '차트 공개'].includes(entry.price), item.id + ' must be a free-start service');
        if (item.action) assert.equal(entry.action, item.action, item.id + ' action drift');
      }
      const href = freePromoItemHref(item);
      if (item.action) assert.ok(actionOk(item.action), item.id + ' unknown action');
      else assert.ok(['js', 'jsx', 'tsx'].some(ext => existsSync(new URL('../../app' + href + 'page.' + ext, import.meta.url))), item.id + ' route missing: ' + href);
      const entry = authored['freePromo.item.' + item.id];
      assert.ok(entry && entry.ko === item.ko && Object.keys(entry).length === 12, 'authored drift: freePromo.item.' + item.id);
      assert.ok(shell.includes(`href="${href}" data-cd-free-promo-item="${item.id}"`), 'index.html chip missing: ' + item.id);
    }
  }
  for (const paid of ['section_summary', 'section_daewun', 'saju_lifetime_bundle', 'saju_light']) {
    assert.ok(!FREE_PROMO_GROUPS.some(g => g.items.some(i => i.policyKey === paid)), paid + ' must not be advertised');
  }
  assert.ok(shell.includes(`href="${FREE_PROMO_YEONI.href}" data-cd-free-promo-yeoni`), 'index.html Yeoni entry missing');
});

test('free promo chips for other readings open their explanation pages', async () => {
  const { FREE_PROMO_GROUPS, freePromoItemHref } = await import('../../lib/marketing/free-promo.mjs');
  const hrefOf = Object.fromEntries(FREE_PROMO_GROUPS.flatMap(g => g.items).map(item => [item.id, freePromoItemHref(item)]));
  const expected = {
    tarot: '/tarot/', ziwei: '/ziwei/', sukuyo: '/sukuyo/', vedic: '/vedic/', astro: '/astrology/',
    compat: '/saju/compatibility/', humanDesign: '/human-design/guide/',
    manse: '/manse/', today: '/today/', career: '/saju/career-style/',
    bias: '/saju/destiny-bias/', animal: '/saju/animal-destiny/', promptHub: '/fortune/prompt-hub/',
  };
  for (const [id, href] of Object.entries(expected)) assert.equal(hrefOf[id], href, id);
});
