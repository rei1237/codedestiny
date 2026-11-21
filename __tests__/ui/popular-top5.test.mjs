import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountPopularTop5, mountPopularTop5InShell, toPopularRows } from '../../js/core/popular-top5.mjs';

// 2026-11-21 메인 인기 TOP5: 판매 순위는 숫자, 표본 부족 자리는 "추천", API 가 실패하면 추천 목록으로 자리를 지킨다(F2).
const items = (sources) => [
  'new-year-ai-consultation', 'love-secret-ai-consultation', 'life-book-ai-consultation', 'master-love-codex', 'fortune-tea-house-tarot-consultation',
].map((featureKey, index) => ({ featureKey, rank: index + 1, source: sources[index] }));
const reply = (body, ok = true) => async () => ({ ok, json: async () => body });

function dom() {
  const { window } = new JSDOM('<!doctype html><html lang="ko"><head></head><body><div id="cdHomeFunnel"><section data-yh-home><section class="yh-situations"></section><a class="yh-all" href="/">all</a></section></div></body></html>');
  return window;
}

test('판매 순위는 숫자 배지, 추천 자리는 "추천" 배지와 기간 문구', async () => {
  const window = dom();
  const tracked = [];
  window.cdTrack = (name, params) => tracked.push([name, params]);
  const section = window.document.createElement('section');
  window.document.body.append(section);
  const ok = await mountPopularTop5(section, { fetchImpl: reply({ ok: true, asOf: '2026-11-21', windowDays: 30, items: items(['sales', 'sales', 'curated', 'curated', 'curated']) }) });
  assert.equal(ok, true);
  const badges = [...section.querySelectorAll('.cd-pop5__badge')].map((node) => node.textContent);
  assert.deepEqual(badges, ['1', '2', '추천', '추천', '추천']);
  assert.match(section.querySelector('.cd-pop5__period').textContent, /최근 30일 구매 기준 · 11월 21일 기준/);
  assert.equal(section.querySelector('a').getAttribute('href'), '/new-year-ai-consultation/');
  assert.ok(window.document.getElementById('cd-popular-top5-style'));
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
    assert.deepEqual([...kept.querySelectorAll('.cd-pop5__badge')].map((node) => node.textContent), ['추천', '추천', '추천', '추천', '추천']);
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
