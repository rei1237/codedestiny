// /saju/free/ 무료 명식 계산 — 원본 폼(FreeSajuForm) 동작 고정(3c-A2 이전 기준선).
// 엔진은 가짜로 바꿔 넘겨받은 입력만 본다: 같은 입력 계약·측정 이벤트·결과 문구를 공통 스텝 판도 그대로 지켜야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
// react-dom 은 불러올 때 window 유무로 input 이벤트 지원을 정한다 → 먼저 전역 DOM 을 깐다.
const boot = new JSDOM('');
globalThis.window = boot.window; globalThis.document = boot.window.document;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');

const READING = { pillars: { year: '庚午', month: '辛巳', day: '甲子', hour: '' }, elements: { wood: 2, fire: 2, earth: 1, metal: 2, water: 1 } };
const mocks = {
  analytics: 'export const trackEvent = (name, params) => { (globalThis.__events ||= []).push([name, params]); };',
  engine: `export const preloadFreeSajuEngine = () => Promise.resolve({});
export const computeFreeSaju = async (input) => { (globalThis.__inputs ||= []).push(input); if (globalThis.__fail) throw new Error('bad'); return globalThis.__reading; };`,
};

async function load(entry) {
  const output = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node',
    jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    plugins: [{ name: 'free-saju-mocks', setup(b) {
      b.onResolve({ filter: /(\/analytics|free-saju\/engine)$/ }, (args) => ({ path: args.path.endsWith('engine') ? 'engine' : 'analytics', namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: process.cwd() }));
      b.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => String(k) });', loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports.default;
}

const flush = async (rounds = 20) => { for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

async function mount(Component, url = 'http://localhost/saju/free/') {
  const dom = new JSDOM('<div id="root"></div>', { url });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = w.HTMLElement; globalThis.FormData = w.FormData; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__events = []; globalThis.__inputs = []; globalThis.__fail = false; globalThis.__reading = READING;
  const root = createRoot(w.document.getElementById('root'));
  await act(async () => root.render(React.createElement(Component)));
  await flush();
  const setValue = async (el, value, type = 'input') => {
    const proto = el.tagName === 'SELECT' ? w.HTMLSelectElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    await act(async () => { el.dispatchEvent(new w.Event(type, { bubbles: true })); });
  };
  return {
    w, setValue,
    q: (sel) => w.document.querySelector(sel),
    byText: (text) => [...w.document.querySelectorAll('button')].find((b) => b.textContent.includes(text)),
    click: async (el) => { await act(async () => { el.click(); }); await flush(5); },
    text: () => w.document.body.textContent,
    close: async () => { await act(async () => root.unmount()); w.close(); },
  };
}

const RESULT_LINE = '년주 庚午 · 월주 辛巳 · 일주 甲子 · 시주 미상';

{
  const FreeSajuForm = await load('app/saju/free/FreeSajuForm.tsx');

  test('원본 폼: 날짜·달력·시각 → 엔진 입력, 측정 2건, 결과 한 줄', async () => {
    const v = await mount(FreeSajuForm);
    assert.equal(v.q('h2')?.textContent, '생년월일로 내 명식 보기');
    await v.setValue(v.q('input[name="date"]'), '19900515');
    assert.equal(v.q('input[name="date"]').value, '1990-05-15', '숫자만 쳐도 하이픈 마스크');
    await v.setValue(v.q('select[name="calendar"]'), 'leap', 'change');
    await v.click(v.byText('명식 보기')); await flush();
    assert.deepEqual(globalThis.__inputs, [{ birthDate: '1990-05-15', birthTime: null, calendarType: 'lunar', leapMonth: true }]);
    assert.deepEqual(globalThis.__events, [
      ['free_saju_chart_started', { surface: 'saju_free', time_known: false }],
      ['free_saju_chart_completed', { surface: 'saju_free', time_known: false }],
    ]);
    assert.ok(v.text().includes(RESULT_LINE));
    assert.ok(v.text().includes('가장 많아서'), '오행 한 줄(elementBalanceLine)');
    await v.close();
  });

  test('원본 폼: 출생시각이 있으면 time_known=true·HH:MM 전달, 실패하면 안내 문구만', async () => {
    const v = await mount(FreeSajuForm);
    await v.setValue(v.q('input[name="date"]'), '1990-05-15');
    await v.setValue(v.q('input[name="time"]'), '07:30');
    await v.click(v.byText('명식 보기')); await flush();
    assert.deepEqual(globalThis.__inputs[0], { birthDate: '1990-05-15', birthTime: '07:30', calendarType: 'solar', leapMonth: false });
    assert.equal(globalThis.__events[0][1].time_known, true);
    globalThis.__fail = true; globalThis.__events = [];
    await v.click(v.byText('명식 보기')); await flush();
    assert.ok(v.text().includes('입력한 날짜와 달력 구분을 확인해 주세요.'));
    assert.deepEqual(globalThis.__events.map(([n]) => n), ['free_saju_chart_started'], '실패하면 completed 는 나가지 않는다');
    await v.close();
  });
}
