// /yeongnyangi/room/ 영냥이 출석 운세 16종 — 공통 스텝 플로우판(FreeFortuneGuided, 3c-A5).
// 원본 FreeFortune 대신 같은 props 계약을 가진 작은 부모로 감싼다: 분야·질문의 정본은 부모 상태이고,
// 플로우는 원본 setter(onCategory·onDraft)만 부르며 읽기는 원본 read(run) 1회, 결과 본문은 부모가 그린다는 것을 고정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const boot = new JSDOM('');
globalThis.window = boot.window; globalThis.document = boot.window.document;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');

const mocks = { analytics: 'export const trackEvent = (name, params) => { (globalThis.__events ||= []).push([name, params]); };' };
const output = await build({
  stdin: { contents: "export { default } from './app/yeongnyangi/_components/FreeFortuneGuided';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node',
  jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  plugins: [{ name: 'yn-free-mocks', setup(b) {
    b.onResolve({ filter: /\/analytics$/ }, () => ({ path: 'analytics', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: process.cwd() }));
    b.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => String(k) });', loader: 'js' }));
  } }],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
const FreeFortuneGuided = mod.exports.default;

const CATEGORIES = [{ id: 'saju', label: '사주' }, { id: 'tarot', label: '타로' }, { id: 'horary', label: '시간 질문' }];
const BIRTH = new Set(['saju']);

// 원본 FreeFortune 의 category·draft·reading 상태와 read() 를 흉내 낸 부모.
function Parent({ readings: initial = {}, fail = false, profile = true }) {
  const [category, setCategory] = React.useState('saju');
  const [draft, setDraft] = React.useState({});
  const [readings, setReadings] = React.useState(initial);
  const [error, setError] = React.useState('');
  const [step, setStep] = React.useState(null);
  const run = async () => {
    globalThis.__runs.push({ category, ...draft });
    await new Promise((r) => setTimeout(r, 20));
    if (fail) { setError('읽기에 실패했어'); return false; }
    setReadings((prev) => ({ ...prev, [category]: `${category} 본문` })); return true;
  };
  const isBirth = BIRTH.has(category);
  return React.createElement(React.Fragment, null,
    step === 'result' ? React.createElement('section', { id: 'original' }, readings[category] || '') : null,
    React.createElement(FreeFortuneGuided, {
      categories: CATEGORIES, category, onCategory: setCategory, label: CATEGORIES.find((c) => c.id === category).label,
      description: `${category} 소개`, extra: category === 'tarot' ? [{ id: 'card', label: '카드 단서' }] : [], isBirth,
      needsProfile: isBirth && !profile, draft, onDraft: setDraft, hasReading: Boolean(readings[category]),
      isHorary: category === 'horary', error, run, onStepChange: setStep,
    }));
}

const flush = async (rounds = 20) => { for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const waitFor = async (check, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return; await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); }
  assert.fail('시간 안에 조건을 만족하지 못함');
};

async function mount(props = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/yeongnyangi/room/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage; globalThis.sessionStorage = w.sessionStorage;
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = w.HTMLElement; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__runs = []; globalThis.__events = [];
  const root = createRoot(w.document.getElementById('root'));
  await act(async () => root.render(React.createElement(Parent, props)));
  await flush();
  const setValue = async (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    await act(async () => { el.dispatchEvent(new w.Event('input', { bubbles: true })); });
  };
  const byText = (text) => [...w.document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
  const heading = () => w.document.querySelector('[id^="gf-title-"]')?.textContent;
  return {
    w, setValue, byText, heading,
    q: (sel) => w.document.querySelector(sel),
    click: async (el) => { await act(async () => { el.click(); }); await flush(5); },
    // 고른 뒤 다음(자동 넘김은 동작 줄이기 환경에서 꺼진다).
    pick: async (text) => {
      await act(async () => { byText(text).click(); }); await flush(5);
      if (heading() === '어떤 이야기를 볼까?') { await act(async () => { byText('다음').click(); }); }
      await flush(5);
    },
    close: async () => { await act(async () => root.unmount()); w.close(); },
  };
}

test('랜딩 → 분야 → 질문(원본 draft) → 원본 read 1회 → 결과 본문은 원본이 그리고 여기에는 다음 행동만', async () => {
  const v = await mount();
  assert.equal(v.q('h1'), null, '방 화면의 제목과 겹치지 않게 랜딩 제목은 h2');
  await v.click(v.byText('오늘의 이야기 고르기'));
  assert.equal(v.heading(), '어떤 이야기를 볼까?');
  await v.pick('타로');
  assert.equal(v.heading(), '타로');
  await v.setValue(v.q('textarea[name="question"]'), '오늘 고를 길은?');
  await v.setValue(v.q('#yn-free-card'), '별');
  await v.click(v.byText('오늘의 이야기 읽기'));
  await waitFor(() => v.q('#original'));
  assert.deepEqual(globalThis.__runs, [{ category: 'tarot', question: '오늘 고를 길은?', card: '별' }], '원본 read 가 원본 상태로 1회');
  assert.equal(v.q('#original').textContent, 'tarot 본문');
  assert.equal(v.q('[id^="gf-title-"]'), null, '결과 단계에는 셸이 없다');
  assert.match(v.w.location.search, /step=result/);
  assert.ok(!JSON.stringify(globalThis.__events).includes('오늘 고를 길'), '측정에 질문 글을 싣지 않는다');
  await v.click(v.byText('다른 분야 고르기'));
  assert.equal(v.heading(), '어떤 이야기를 볼까?');
  assert.match(v.w.location.search, /step=category/);
  await v.close();
});

test('읽기가 실패하면 질문 단계로 돌아가 원본 오류를 보여 준다', async () => {
  const v = await mount({ fail: true });
  await v.click(v.byText('오늘의 이야기 고르기'));
  await v.pick('타로');
  await v.click(v.byText('오늘의 이야기 읽기'));
  await waitFor(() => v.heading() === '타로' && v.w.document.body.textContent.includes('읽기에 실패했어'));
  assert.equal(globalThis.__runs.length, 1);
  assert.equal(v.q('#original'), null);
  await v.close();
});

test('오늘 이미 읽은 분야와 시간 질문은 질문 폼 없이 결과로 간다(원본과 같다)', async () => {
  const v = await mount({ readings: { tarot: '보관된 타로' } });
  await v.click(v.byText('오늘의 이야기 고르기'));
  await v.pick('타로');
  await waitFor(() => v.q('#original'));
  assert.equal(v.q('#original').textContent, '보관된 타로');
  await v.click(v.byText('다른 분야 고르기'));
  await v.pick('시간 질문');
  await waitFor(() => v.q('#original'));
  assert.equal(globalThis.__runs.length, 0, '다시 읽지 않는다(멸치·생성 없음)');
  await v.close();
});

test('출생 분야인데 프로필이 없으면 원본처럼 읽기를 막는다', async () => {
  const v = await mount({ profile: false });
  await v.click(v.byText('오늘의 이야기 고르기'));
  await v.pick('사주');
  assert.equal(v.heading(), '사주');
  assert.equal(v.byText('오늘의 이야기 읽기').disabled, true);
  assert.ok(v.w.document.body.textContent.includes('위의 프로필에서 본인을 고르거나'));
  await v.close();
});
