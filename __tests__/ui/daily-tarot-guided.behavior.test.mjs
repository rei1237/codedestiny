// /today/ 연이 오늘의 세 장 — 공통 스텝 플로우 판(DailyTarotGuided, 3c-A1) 동작 고정.
// 원본(DailyTarot)과 같은 저장 키·형식, 고르기 취소, 세 장 뒤 결과, daily_tarot_* 이벤트, 새로고침 복원을 잠근다.
// reduced-motion 으로 돌린다(자동 진행 없이 '다음'으로 넘어가고 카드가 한 번에 열린다).
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');

const mocks = {
  'useT': 'export const useLocale = () => "ko"; export const useT = () => (k) => k;',
  'analytics': 'export const trackEvent = (name, params) => { (globalThis.__events ||= []).push([name, params]); };',
  'PublicInsightCard': 'export default function PublicInsightCard() { return null; }',
  'QuestionJourney': 'export function FreeQuestionNext() { return null; }',
};
const output = await build({
  entryPoints: ['app/today/DailyTarotGuided.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node',
  jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  plugins: [{ name: 'daily-mocks', setup(b) {
    b.onResolve({ filter: /(\/useT|\/analytics|PublicInsightCard|QuestionJourney)$/ }, (args) => ({ path: args.path.split('/').pop(), namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: process.cwd() }));
    b.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => String(k) });', loader: 'js' }));
  } }],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
const DailyTarotGuided = mod.exports.default;
const KEY = 'cd:yeoni:daily-three:v1';
const cards = Array.from({ length: 22 }, (_, id) => ({ id, name: `카드${id}`, code: ['fool', 'magician', 'highpriestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'wheel', 'justice', 'hangedman', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world'][id], thumb: `/t${id}.webp`, image: `/i${id}.webp`, fallback: `/f${id}.webp` }));

const flush = async (rounds = 30) => { for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

async function mount(url = 'http://localhost/today/', storage = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url });
  const w = dom.window;
  Object.assign(w.localStorage, {});
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = w.HTMLElement; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__events = [];
  const root = createRoot(w.document.getElementById('root'));
  await act(async () => root.render(React.createElement(DailyTarotGuided, { cards })));
  await flush();
  const buttons = () => [...w.document.querySelectorAll('button')];
  return {
    w,
    byText: (text) => buttons().find((b) => b.textContent.includes(text)),
    picks: () => buttons().filter((b) => b.hasAttribute('aria-pressed')),
    heading: () => w.document.querySelector('[id^="gf-title-"]')?.textContent,
    click: async (el) => { await act(async () => { el.click(); }); await flush(5); },
    saved: () => JSON.parse(w.localStorage.getItem(KEY)),
    close: async () => { await act(async () => root.unmount()); w.close(); },
  };
}

test('랜딩 → 고르기(취소 가능) → 펼치기 → 결과, 원본과 같은 키·형식으로 저장한다', async () => {
  const v = await mount();
  assert.equal(v.w.document.querySelector('h1'), null, '페이지 h1 과 겹치지 않게 랜딩 제목은 h2 다');
  await v.click(v.byText('오늘의 세 장 펼치기'));
  await flush(); // 셔플 대기(reduced 0ms) 뒤 고르기
  assert.equal(v.heading(), '마음이 머무는 카드 세 장을 골라 주세요');
  assert.equal(v.picks().length, 22);
  await v.click(v.picks()[0]); await v.click(v.picks()[5]);
  await v.click(v.picks()[0]); // 취소
  assert.deepEqual(v.saved().picks, [5]);
  assert.equal(v.byText('다음').disabled, true);
  await v.click(v.picks()[1]); await v.click(v.picks()[2]);
  const saved = v.saved();
  assert.deepEqual(Object.keys(saved).sort(), ['date', 'deck', 'picks', 'revealed', 'version']);
  assert.deepEqual(saved.picks, [5, 1, 2]);
  await v.click(v.byText('다음'));
  assert.equal(v.heading(), '세 장을 펼쳐요');
  assert.equal(v.saved().revealed, 3, 'reduced-motion 이면 한 번에 열린다');
  await v.click(v.byText('다음'));
  await flush();
  assert.equal(v.heading(), '오늘의 세 장');
  assert.ok(v.w.document.body.textContent.includes('자리별 읽기'));
  const names = globalThis.__events.map(([n]) => n);
  for (const n of ['daily_tarot_start', 'daily_tarot_complete']) assert.ok(names.includes(n), `${n} 누락: ${names}`);
  assert.ok(globalThis.__events.every(([n, p]) => !n.startsWith('daily_tarot_') || p.service === 'yeoni_daily'));
  await v.close();
});

test('오늘 다 본 카드가 있으면 결과로 바로 열리고 reopen 이벤트를 남긴다', async () => {
  const first = await mount();
  await first.click(first.byText('오늘의 세 장 펼치기')); await flush();
  for (const i of [3, 4, 9]) await first.click(first.picks()[i]);
  await first.click(first.byText('다음')); await first.click(first.byText('다음')); await flush();
  const stored = first.w.localStorage.getItem(KEY);
  await first.close();
  const again = await mount('http://localhost/today/', { [KEY]: stored });
  assert.equal(again.heading(), '오늘의 세 장');
  assert.ok(globalThis.__events.some(([n, p]) => n === 'daily_tarot_reopen' && p.complete === true));
  assert.match(again.w.location.search, /step=result/);
  await again.close();
});

test('지난날 카드는 새 하루 안내와 함께 랜딩에서 새로 시작한다', async () => {
  const old = JSON.stringify({ version: 1, date: '2020-01-01', deck: Array.from({ length: 22 }, (_, i) => i), picks: [0, 1, 2], revealed: 3 });
  const v = await mount('http://localhost/today/?step=result', { [KEY]: old });
  assert.equal(v.heading(), undefined);
  assert.ok(v.byText('오늘의 세 장 펼치기'));
  assert.doesNotMatch(v.w.location.search, /step=/);
  assert.ok(globalThis.__events.some(([n]) => n === 'daily_tarot_return'));
  await v.close();
});

test('지난날 카드는 "어제 카드 마저 보기"로 이어 읽고, 첫 CTA 는 오늘 새 카드를 연다(원본 DailyTarot 와 같은 선택지)', async () => {
  const half = JSON.stringify({ version: 1, date: '2020-01-01', deck: Array.from({ length: 22 }, (_, i) => i), picks: [0, 1, 2], revealed: 0 });
  const v = await mount('http://localhost/today/', { [KEY]: half });
  const resume = v.byText('어제 카드 마저 보기');
  assert.ok(resume, '어제 카드 이어 보기 버튼이 있어야 한다');
  await v.click(resume); await flush();
  assert.equal(v.heading(), '세 장을 펼쳐요', '세 장을 고른 지난 카드는 펼치기에서 이어진다');
  assert.equal(v.saved().date, '2020-01-01', '이어 보기는 지난 날짜를 지킨다');
  await v.close();

  const done = JSON.stringify({ version: 1, date: '2020-01-01', deck: Array.from({ length: 22 }, (_, i) => i), picks: [0, 1, 2], revealed: 3 });
  const r = await mount('http://localhost/today/', { [KEY]: done });
  await r.click(r.byText('어제 카드 마저 보기')); await flush();
  assert.equal(r.heading(), '오늘의 세 장');
  assert.equal(r.saved().date, '2020-01-01');
  await r.close();

  const n = await mount('http://localhost/today/', { [KEY]: done });
  await n.click(n.byText('오늘의 세 장 펼치기')); await flush();
  assert.notEqual(n.saved().date, '2020-01-01', '첫 CTA 는 오늘 날짜로 새로 시작한다');
  assert.equal(n.saved().picks.length, 0);
  await n.close();
});
