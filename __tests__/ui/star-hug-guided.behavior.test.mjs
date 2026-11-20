// /yeon-star-hug/ 연이의 마음 별자리 — 공통 스텝 플로우 입력판(YeonStarHugGuided, 3c-A4).
// 원본 YeonStarHugClient 대신 같은 props 계약을 가진 작은 부모로 감싼다: 값의 정본은 부모 상태이고,
// 플로우는 원본 setter(onChange·onProfileSelect)만 부르며 리딩은 원본 runConsultation(run) 1회로 만든다는 것을 고정한다.
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

const mocks = {
  picker: `import { createElement } from 'react';
export default function Picker({ onSelect }) { return createElement('button', { type: 'button', onClick: () => onSelect({}, globalThis.__profile) }, '저장 프로필'); }`,
  analytics: 'export const trackEvent = (name, params) => { (globalThis.__events ||= []).push([name, params]); };',
};
const MOCK_PATHS = [[/SavedBirthProfilePicker$/, 'picker'], [/\/analytics$/, 'analytics'], [/guided-flow\/flags\.mjs$/, 'flags']];

// 플래그 고정: 실제 flags.mjs 를 그대로 내보내되 넘긴 값만 덮어쓴다(W1 플래그 끔 = 이전 동작 확인용).
const FLAGS_PATH = require('node:path').resolve('lib/guided-flow/flags.mjs').replace(/\\/g, '/');
async function load(flags = {}) {
  mocks.flags = `export * from '${FLAGS_PATH}';\n${Object.entries(flags).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join('\n')}`;
  const output = await build({
    stdin: { contents: "export { default } from './app/yeon-star-hug/YeonStarHugGuided';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node',
    jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    plugins: [{ name: 'star-hug-mocks', setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace === 'mock') return undefined;
        const hit = MOCK_PATHS.find(([re]) => re.test(args.path));
        return hit ? { path: hit[1], namespace: 'mock' } : undefined;
      });
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: process.cwd() }));
      b.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => String(k) });', loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

const { default: LegacyGuided } = await load({ GUIDED_BIRTH_STAR_HUG_ENABLED: false });
let YeonStarHugGuided = LegacyGuided;
const EMOTIONS = [{ key: 'happy', label: '행복해' }, { key: 'calm', label: '편안해' }, { key: 'worried', label: '걱정돼' }];
const SIGNS = [{ sign: '물병자리', period: '1.20~2.18' }, { sign: '황소자리', period: '4.20~5.20' }, { sign: '사자자리', period: '7.23~8.22' }];
const SAMPLES = ['요즘 마음이 자꾸 가라앉아요.', '새로운 시작이 두려워요.'];
const signOf = (date) => (date.slice(4, 6) === '05' ? '황소자리' : date.slice(4, 6) === '02' ? '물병자리' : '');

// 원본 YeonStarHugClient 의 상태·setter·runConsultation 을 흉내 낸 부모(기본 감정 calm, 기본 별자리 오늘 기준).
function Parent() {
  const [values, setValues] = React.useState({ emotion: 'calm', birthDate: '', birthTime: '', name: '', sign: '사자자리', concern: '' });
  const [ready, setReady] = React.useState(false);
  const [step, setStep] = React.useState(null);
  const set = (key) => (value) => setValues((prev) => ({ ...prev, [key]: value }));
  const onChange = React.useMemo(() => ({
    emotion: set('emotion'), birthTime: set('birthTime'), name: set('name'), sign: set('sign'), concern: set('concern'),
    birthDate: (value) => { const date = value.replace(/\D/g, '').slice(0, 8); setValues((prev) => ({ ...prev, birthDate: date, sign: signOf(date) || prev.sign })); },
  }), []);
  const run = () => { globalThis.__runs.push({ ...values }); setTimeout(() => setReady(true), 20); };
  const onProfileSelect = async (_seed, profile) => { setValues((prev) => ({ ...prev, birthDate: profile.date, birthTime: profile.time, name: profile.name, sign: signOf(profile.date) })); };
  return React.createElement(React.Fragment, null,
    React.createElement(YeonStarHugGuided, { emotions: EMOTIONS, signs: SIGNS, samples: SAMPLES, values, onChange, onProfileSelect, profileNote: '프로필 안내', run, ready, onStepChange: setStep }),
    step === 'result' ? React.createElement('section', { id: 'original' }, '원본 입력 패널+결과') : null);
}

const flush = async (rounds = 20) => { for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const waitFor = async (check, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return; await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); }
  assert.fail('시간 안에 조건을 만족하지 못함');
};

async function mount(url = 'http://localhost/yeon-star-hug/') {
  const dom = new JSDOM('<div id="root"></div>', { url });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage; globalThis.sessionStorage = w.sessionStorage;
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = w.HTMLElement; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__runs = []; globalThis.__events = [];
  const root = createRoot(w.document.getElementById('root'));
  await act(async () => root.render(React.createElement(Parent)));
  await flush();
  const setValue = async (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    await act(async () => { el.dispatchEvent(new w.Event('input', { bubbles: true })); });
  };
  return {
    w, setValue,
    q: (sel) => w.document.querySelector(sel),
    heading: () => w.document.querySelector('[id^="gf-title-"]')?.textContent,
    byText: (text) => [...w.document.querySelectorAll('button')].find((b) => b.textContent.includes(text)),
    click: async (el) => { await act(async () => { el.click(); }); await flush(5); },
    close: async () => { await act(async () => root.unmount()); w.close(); },
  };
}

test('랜딩 → 감정 → 생년월일 → 별자리(자동 매칭) → 고민 예시 → 원본 run 1회 → 결과에서는 원본만 그린다', async () => {
  const v = await mount();
  assert.equal(v.q('h1'), null, 'page.tsx 의 h1(연이의 마음 별자리)과 겹치지 않게 랜딩 제목은 h2');
  assert.equal(v.q('h2')?.textContent, '연이가 오늘 마음을 안아 줄게요');
  await v.click(v.byText('마음 별자리 시작'));
  assert.equal(v.heading(), '지금 어떤 마음에 가까워요?');
  assert.equal(v.byText('다음').disabled, true, '감정 없이 못 넘어간다(원본 기본값 calm 을 몰래 쓰지 않는다)');
  await v.click(v.byText('걱정돼')); await v.click(v.byText('다음'));
  assert.equal(v.heading(), '생년월일을 알려 주실래요?');
  await v.setValue(v.q('input[name="birthDate"]'), '19900515');
  await v.setValue(v.q('input[name="name"]'), '달님');
  await v.click(v.byText('다음'));
  assert.equal(v.heading(), '이 별자리가 맞나요?');
  assert.equal(v.q('select[name="sign"]').value, '황소자리', '생년월일로 원본이 맞춘 별자리를 그대로 보여 준다');
  await v.click(v.byText('다음'));
  assert.equal(v.heading(), '연이에게 털어놓고 싶은 고민이 있나요?');
  await v.click(v.byText('새로운 시작이 두려워요.'));
  assert.equal(v.q('textarea[name="concern"]').value, '새로운 시작이 두려워요.');
  await v.click(v.byText('다음'));
  await waitFor(() => v.q('#original'));
  assert.deepEqual(globalThis.__runs, [{ emotion: 'worried', birthDate: '19900515', birthTime: '', name: '달님', sign: '황소자리', concern: '새로운 시작이 두려워요.' }], '원본 runConsultation 이 원본 상태로 1회');
  assert.equal(v.q('[id^="gf-title-"]'), null, '결과는 원본 입력 패널+결과가 그린다');
  assert.match(v.w.location.search, /step=result/);
  assert.ok(!JSON.stringify(globalThis.__events).includes('1990'), '측정에 생년월일을 싣지 않는다');
  await v.close();
});

test('선택 단계는 비워도 넘어가고, 별자리는 직접 고를 수 있다', async () => {
  const v = await mount();
  await v.click(v.byText('마음 별자리 시작'));
  await v.click(v.byText('행복해')); await v.click(v.byText('다음'));
  await v.click(v.byText('다음'));
  assert.equal(v.heading(), '이 별자리가 맞나요?');
  assert.equal(v.q('select[name="sign"]').value, '사자자리', '생년월일 없으면 원본 기본 별자리');
  const select = v.q('select[name="sign"]');
  await act(async () => { select.value = '물병자리'; select.dispatchEvent(new v.w.Event('change', { bubbles: true })); });
  await v.click(v.byText('다음'));
  await v.click(v.byText('다음'));
  await waitFor(() => v.q('#original'));
  assert.deepEqual(globalThis.__runs, [{ emotion: 'happy', birthDate: '', birthTime: '', name: '', sign: '물병자리', concern: '' }]);
  await v.close();
});

test('저장 프로필을 고르면 원본 onProfileSelect 로 생년월일·이름·별자리를 채운다', async () => {
  globalThis.__profile = { date: '19880203', time: '2310', name: '별' };
  const v = await mount();
  await v.click(v.byText('마음 별자리 시작'));
  await v.click(v.byText('편안해')); await v.click(v.byText('다음'));
  await v.click(v.byText('저장 프로필'));
  assert.equal(v.q('input[name="birthDate"]').value, '19880203');
  assert.equal(v.q('input[name="birthTime"]').value, '23:10');
  assert.equal(v.q('input[name="name"]').value, '별');
  await v.click(v.byText('다음'));
  assert.equal(v.q('select[name="sign"]').value, '물병자리');
  await v.close();
});

// ── W1 공용 출생 입력(GUIDED_BIRTH_STAR_HUG_ENABLED): 감정 → 이름 → 생년월일(선택) → 시각 → 확인 → 별자리 → 고민, 원본 상태·run 은 같다 ──
{
  const { default: BirthGuided } = await load({ GUIDED_BIRTH_STAR_HUG_ENABLED: true });

  test('W1 출생 입력: 이름 → 년·월·일 → 시진 → 확인 → 별자리(자동 매칭) → 원본 run 1회, 원본 값 형식(8·4자리) 유지', async () => {
    YeonStarHugGuided = BirthGuided;
    globalThis.__profile = undefined;
    const v = await mount();
    await v.click(v.byText('마음 별자리 시작'));
    await v.click(v.byText('걱정돼')); await v.click(v.byText('다음'));
    assert.equal(v.heading(), '어떻게 불러 드릴까요?');
    await v.setValue(v.q('input[name="name"]'), '달님');
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '생년월일을 알려 주세요');
    await v.setValue(v.q('input[name="birth-year"]'), '1990');
    await v.setValue(v.q('input[name="birth-month"]'), '5');
    await v.setValue(v.q('input[name="birth-day"]'), '15');
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '태어난 시각을 아세요?');
    await v.click(v.byText('묘시'));
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '입력한 정보가 맞나요?');
    await v.click(v.byText('확인'));
    assert.equal(v.heading(), '이 별자리가 맞나요?');
    assert.equal(v.q('select[name="sign"]').value, '황소자리');
    await v.click(v.byText('다음'));
    await v.click(v.byText('다음'));
    await waitFor(() => v.q('#original'));
    assert.deepEqual(globalThis.__runs, [{ emotion: 'worried', birthDate: '19900515', birthTime: '0630', name: '달님', sign: '황소자리', concern: '' }]);
    assert.ok(!JSON.stringify(globalThis.__events).includes('1990'), '측정에 생년월일을 싣지 않는다');
    await v.close();
  });

  test('W1 출생 입력: 저장 프로필은 원본 onProfileSelect 로 채우고 확인 요약으로 간다', async () => {
    YeonStarHugGuided = BirthGuided;
    globalThis.__profile = { date: '19880203', time: '2310', name: '별' };
    const v = await mount();
    await v.click(v.byText('마음 별자리 시작'));
    await v.click(v.byText('편안해')); await v.click(v.byText('다음'));
    await v.click(v.byText('저장 프로필')); await flush();
    await waitFor(() => v.heading() === '입력한 정보가 맞나요?');
    const text = v.w.document.body.textContent;
    assert.ok(text.includes('별') && text.includes('1988년 2월 3일') && text.includes('23:10'), '원본이 받은 프로필 값이 요약에 보인다');
    await v.click(v.byText('확인'));
    assert.equal(v.q('select[name="sign"]').value, '물병자리');
    await v.click(v.byText('다음')); await v.click(v.byText('다음'));
    await waitFor(() => v.q('#original'));
    assert.deepEqual(globalThis.__runs[0], { emotion: 'calm', birthDate: '19880203', birthTime: '2310', name: '별', sign: '물병자리', concern: '' });
    await v.close();
  });
}
