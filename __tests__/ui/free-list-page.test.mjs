import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// R1 /free/ 무료 목록 단독 페이지(FREE_LIST_PAGE_ENABLED). 6단계 카드 목록과 같은 데이터·주소를 쓰고,
// 플래그를 끄면 noindex·사이트맵 제외·/ggulggul/ 링크 숨김이 된다.
const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('/free/ page reuses the stage 6 catalog and ties robots to the flag', async () => {
  const { FREE_LIST_PAGE_ENABLED } = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof FREE_LIST_PAGE_ENABLED, 'boolean');
  const page = read('app/free/page.tsx');
  assert.ok(page.includes("const url='https://code-destiny.com/free/'"));
  assert.ok(page.includes('alternates:{canonical:url}'));
  assert.ok(page.includes('robots:FREE_LIST_PAGE_ENABLED?undefined:{index:false,follow:true}'));
  assert.ok(page.includes('<h1>무료 운세 전체 목록</h1>'));
  for (const name of ['FREE_PROMO_GROUPS', 'FREE_PROMO_CATALOG', 'freePromoItemHref']) assert.ok(page.includes(name), name);
  assert.ok(page.includes('data-cd-free-promo-item={item.id}'));
  assert.doesNotMatch(page, /redirect\(/);
});

test('sitemap lists /free/ only while the page is indexable', async () => {
  const { FREE_LIST_PAGE_ENABLED } = await import('../../lib/guided-flow/flags.mjs');
  assert.ok(read('scripts/generate-sitemap.mjs').includes('...(FREE_LIST_PAGE_ENABLED ? [{ path: "/free"'));
  for (const file of ['sitemap.xml', 'public/sitemap.xml']) {
    assert.equal(read(file).includes('<loc>https://code-destiny.com/free/</loc>'), FREE_LIST_PAGE_ENABLED, file);
  }
});

test('/ggulggul/ banner keeps its areas and adds one Korean-only full list link behind the flag', async () => {
  const { FREE_LIST_PAGE_ENABLED } = await import('../../lib/guided-flow/flags.mjs');
  const { renderFreePromoShellBanner } = await import('../../lib/marketing/free-promo-shell.mjs');
  const banner = new JSDOM(renderFreePromoShellBanner()).window.document;
  const links = banner.querySelectorAll('a[href="/free/"]');
  assert.equal(links.length, FREE_LIST_PAGE_ENABLED ? 1 : 0);
  if (links.length) {
    assert.ok(links[0].hasAttribute('data-cd-korean-only') && links[0].hasAttribute('data-cd-no-trans'));
    assert.ok(links[0].closest('.cdh-promo__foot'));
  }
  // 기존 영역(대표 카드 6·전체 목록 23·CTA)은 그대로다.
  assert.equal(banner.querySelectorAll('#cdQuickServices > a').length, 6);
  assert.equal(banner.querySelectorAll('#cdhFreePromoAll [data-cd-free-promo-item]').length, 23);
  assert.ok(banner.querySelector('.cdh-promo__cta'));
  const shell = new JSDOM(read('index.html')).window.document;
  assert.equal(shell.querySelectorAll('#cdhFreePromo a[href="/free/"]').length, FREE_LIST_PAGE_ENABLED ? 1 : 0);
  // 홈 / 첫 화면(React 배너)은 바꾸지 않는다.
  assert.ok(!read('app/components/FreePromoBanner.tsx').includes('/free/'));
  assert.ok(!read('app/page.js').includes('"/free/"'));
});
