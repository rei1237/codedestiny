import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountPopularTop5, mountPopularTop5InShell, popularTop5SkeletonHtml, toPopularRows } from '../../js/core/popular-top5.mjs';

// 2026-11-21 메인 인기 TOP5 → 2026-11-22: 모든 줄에 1~5위 숫자, 추천으로 채운 줄에만 "추천" 꼬리표.
// API 가 실패·지연되면 추천 목록으로 자리를 지키고, 오늘 받은 응답은 캐시로 바로 그린다.
const items = (sources) => [
  'new-year-ai-consultation', 'love-secret-ai-consultation', 'life-book-ai-consultation', 'master-love-codex', 'fortune-tea-house-tarot-consultation',
].map((featureKey, index) => ({ featureKey, rank: index + 1, source: sources[index] }));
const reply = (body, ok = true) => async () => ({ ok, json: async () => body });

function dom() {
  const { window } = new JSDOM('<!doctype html><html lang="ko"><head></head><body><div id="cdHomeFunnel"><section data-yh-home><section class="yh-situations"></section><a class="yh-all" href="/">all</a></section></div></body></html>', { url: 'https://cd.test/ggulggul/' });
  return window;
}

test('모든 줄에 순위 숫자, 추천 자리는 꼬리표와 기간 문구', async () => {
  const window = dom();
  const tracked = [];
  window.cdTrack = (name, params) => tracked.push([name, params]);
  const section = window.document.createElement('section');
  window.document.body.append(section);
  const ok = await mountPopularTop5(section, { fetchImpl: reply({ ok: true, asOf: '2026-11-21', windowDays: 30, items: items(['sales', 'sales', 'curated', 'curated', 'curated']) }) });
  assert.equal(ok, true);
  const ranks = [...section.querySelectorAll('.cd-pop5__rank')].map((node) => node.textContent);
  assert.deepEqual(ranks, ['1', '2', '3', '4', '5']);
  const tagged = [...section.querySelectorAll('.cd-pop5__link')].map((link) => Boolean(link.querySelector('.cd-pop5__tag')));
  assert.deepEqual(tagged, [false, false, true, true, true]);
  assert.match(section.querySelector('.cd-pop5__period .cd-pop5__detail').textContent, /추천/);
  assert.match(section.querySelector('.cd-pop5__period').textContent, /최근 30일 구매 순위 · 11월 21일 기준/);
  assert.equal(section.querySelector('a').getAttribute('href'), '/new-year-ai-consultation/');
  section.querySelectorAll('a')[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.deepEqual(tracked, [['popular_top5_click', { rank: 3, source: 'curated', service_id: 'life-book-ai', surface: 'home' }]]);
});

test('API 실패면 숫자 순위 없이 추천 목록으로 자리를 지킨다(CLS 방지), 이상한 응답은 행으로 쓰지 않는다', async () => {
  for (const fetchImpl of [reply({ ok: false, items: [] }, false), async () => { throw new Error('offline'); }]) {
    const window = dom();
    window.fetch = fetchImpl;
    mountPopularTop5InShell(window.document);
    const section = window.document.querySelector('[data-cd-pop5-shell]');
    assert.ok(section && section.previousElementSibling.classList.contains('yh-situations'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const kept = window.document.querySelector('[data-cd-pop5-shell]');
    assert.ok(kept, '실패해도 예약한 자리를 지운다면 아래 내용이 밀려 올라온다');
    assert.equal(kept.dataset.cdPop5State, 'ready');
    assert.ok('cdPop5Fallback' in kept.dataset);
    assert.deepEqual([...kept.querySelectorAll('.cd-pop5__rank')].map((node) => node.textContent), ['1', '2', '3', '4', '5']);
    assert.equal(kept.querySelectorAll('.cd-pop5__tag').length, 5);
    assert.match(kept.querySelector('.cd-pop5__period').textContent, /운영진이 고른 추천 상담/);
  }
  assert.equal(toPopularRows({ ok: true, items: [{ featureKey: 'unknown', rank: 1, source: 'sales' }, ...items(['sales', 'sales', 'sales', 'sales']).slice(1)] }), null);
  assert.equal(toPopularRows({ ok: true, items: items(['curated', 'sales', 'curated', 'curated', 'curated']) }), null);
});

test('한국어가 아닌 셸·앱 셸에는 넣지 않는다', () => {
  const window = dom();
  window.document.documentElement.lang = 'en';
  mountPopularTop5InShell(window.document);
  assert.equal(window.document.querySelector('[data-cd-pop5-shell]'), null);
  const app = dom();
  app.__cdAppContext = { isApp: () => true };
  mountPopularTop5InShell(app.document);
  assert.equal(app.document.querySelector('[data-cd-pop5-shell]'), null);
});

test('정적 셸이 미리 그린 자리를 재사용하고, 오늘 캐시가 있으면 요청 전에 바로 그린다', async () => {
  const window = dom();
  const situations = window.document.querySelector('.yh-situations');
  situations.insertAdjacentHTML('afterend', `<section class="cd-pop5" data-cd-pop5-shell>${popularTop5SkeletonHtml()}</section>`);
  assert.equal(window.document.querySelectorAll('.cd-pop5__skel--rank').length, 5);
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  window.localStorage.setItem('cd-pop5-cache-v1', JSON.stringify({ day, payload: { ok: true, asOf: day, windowDays: 30, items: items(['sales', 'sales', 'sales', 'curated', 'curated']) } }));
  let release;
  window.fetch = () => new Promise((resolve) => { release = resolve; });
  mountPopularTop5InShell(window.document);
  const sections = window.document.querySelectorAll('[data-cd-pop5-shell]');
  assert.equal(sections.length, 1, '자리를 새로 만들지 않는다');
  assert.equal(sections[0].dataset.cdPop5State, 'ready', '캐시로 요청 전에 그린다');
  assert.equal(sections[0].querySelectorAll('.cd-pop5__tag').length, 2);
  release({ ok: true, json: async () => ({ ok: true, asOf: day, windowDays: 30, items: items(['sales', 'sales', 'sales', 'sales', 'curated']) }) });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sections[0].querySelectorAll('.cd-pop5__tag').length, 1, '새 응답으로 다시 그린다');
});

test('요청이 타임아웃되면 추천 목록으로 채운다', async () => {
  const window = dom();
  const section = window.document.createElement('section');
  window.document.body.append(section);
  const ok = await mountPopularTop5(section, { fetchImpl: () => new Promise(() => {}), timeoutMs: 5 });
  assert.equal(ok, true);
  assert.ok('cdPop5Fallback' in section.dataset);
  assert.equal(section.querySelectorAll('.cd-pop5__rank').length, 5);
});

test('비한국어 셸은 미리 그린 자리도 치운다', () => {
  const window = dom();
  window.document.documentElement.lang = 'en';
  window.document.querySelector('.yh-situations').insertAdjacentHTML('afterend', '<section class="cd-pop5" data-cd-pop5-shell></section>');
  mountPopularTop5InShell(window.document);
  assert.equal(window.document.querySelector('[data-cd-pop5-shell]'), null);
});
