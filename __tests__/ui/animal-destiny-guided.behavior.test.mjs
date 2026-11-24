// /saju/animal-destiny/ 12운성 동물 — 공통 스텝 플로우 입력판(AnimalDestinyGuided, 3c-A3).
// 스토어는 진짜(zustand)를 쓰고 계산 어댑터·유료 풀이 확인·저장 프로필 선택기만 가짜로 바꾼다:
// 원본 입력 카드와 같은 스토어 입력 6필드, 같은 calculate() 경로(그 안의 loadPaid 포함), 결과 뒤 다시 하기·뒤로를 고정한다.
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
  adapter: `export const resolveAnimalTwelveResult = async (input) => { (globalThis.__inputs ||= []).push({ ...input });
  if (globalThis.__fail) return { ok: false, error: '날짜를 확인해 주세요' };
  return { ok: true, profile: { id: 'tiger' }, sajuResult: { pillars: {} }, representativeStage: null }; };
export const fetchSajuEngineResult = async () => ({});`,
  paid: `export const ANIMAL_PAID_RETRY_MS = [];
export const fetchAnimalPaidReading = async (input) => { (globalThis.__paid ||= []).push(input.birthDate); return { status: 'login' }; };`,
  mapping: `export const getAnimalBySajuResult = () => ({ animalId: 'tiger' });
export const getAnimalDisplayData = () => ({ id: 'tiger' });
export const calculateAnimalCompatibility = () => null;`,
  stages: 'export const getTwelveStagesForPillars = () => ({ primary: "장생" });',
  narrative: 'export const buildCompatibilityStageEvidence = () => null;',
  picker: `import { createElement } from 'react';
export default function Picker({ onSelect }) { return createElement('button', { type: 'button', onClick: () => onSelect(globalThis.__seed) }, '저장 프로필'); }`,
  analytics: 'export const trackEvent = (name, params) => { (globalThis.__events ||= []).push([name, params]); };',
};
const MOCK_PATHS = [
  [/lib\/sajuAdapter$/, 'adapter'], [/lib\/paidReading$/, 'paid'], [/lib\/animalMapping$/, 'mapping'],
  [/lib\/twelveStages$/, 'stages'], [/lib\/analysisNarrative$/, 'narrative'], [/SavedBirthProfilePicker$/, 'picker'],
  [/\/analytics$/, 'analytics'], [/guided-flow\/flags\.mjs$/, 'flags'],
];

// 플래그 고정: 실제 flags.mjs 를 그대로 내보내되 넘긴 값만 덮어쓴다(W1 플래그 끔 = 이전 동작 확인용).
const FLAGS_PATH = require('node:path').resolve('lib/guided-flow/flags.mjs').replace(/\\/g, '/');
async function load(flags = {}) {
  mocks.flags = `export * from '${FLAGS_PATH}';\n${Object.entries(flags).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join('\n')}`;
  const output = await build({
    stdin: {
      contents: `export { default } from './app/saju/animal-destiny/components/AnimalDestinyGuided';
export { useAnimalDestinyStore } from './app/saju/animal-destiny/store/useAnimalDestinyStore';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, write: false, format: 'cjs', platform: 'node',
    jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
    external: ['react', 'react/jsx-runtime', 'react-dom', 'zustand'],
    plugins: [{ name: 'animal-mocks', setup(b) {
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

const flush = async (rounds = 20) => { for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const waitFor = async (check, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return; await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); }
  assert.fail('시간 안에 조건을 만족하지 못함');
};

const { default: AnimalDestinyGuided, useAnimalDestinyStore } = await load({ GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED: false });
let Component = AnimalDestinyGuided;
let useStore = useAnimalDestinyStore;
const store = () => useStore.getState();

async function mount(url = 'http://localhost/saju/animal-destiny/') {
  const dom = new JSDOM('<div id="root"></div>', { url });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage; globalThis.sessionStorage = w.sessionStorage;
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = w.HTMLElement; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__inputs = []; globalThis.__paid = []; globalThis.__events = []; globalThis.__fail = false;
  store().reset();
  const root = createRoot(w.document.getElementById('root'));
  await act(async () => root.render(React.createElement(Component)));
  await flush();
  const setValue = async (el, value) => {
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
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

async function walk(v, { date = '19900515', calendar = '음력 윤달', time = '', gender = '여성', name = '' } = {}) {
  await v.click(v.byText('동물 찾기 시작'));
  assert.equal(v.heading(), '생년월일을 알려 주세요');
  assert.equal(v.byText('다음').disabled, true, '날짜 없이 못 넘어간다');
  if (date) await v.setValue(v.q('input[name="date"]'), date);
  await v.click(v.byText('다음'));
  assert.equal(v.heading(), '어떤 달력 기준인가요?');
  await v.click(v.byText(calendar)); await v.click(v.byText('다음'));
  assert.equal(v.heading(), '태어난 시각을 아세요?');
  if (time) await v.setValue(v.q('input[name="time"]'), time);
  await v.click(v.byText('다음'));
  assert.equal(v.heading(), '성별을 골라 주세요');
  await v.click(v.byText(gender)); await v.click(v.byText('다음'));
  assert.equal(v.heading(), '결과 카드에 어떤 이름을 쓸까요?');
  if (name) await v.setValue(v.q('input[name="name"]'), name);
  await v.click(v.byText('다음'));
}

test('랜딩 → 날짜 → 달력 → 시각 → 성별 → 이름 → 스토어 calculate(유료 확인 포함) → 결과에서는 아무것도 그리지 않는다', async () => {
  const v = await mount();
  assert.equal(v.q('h1'), null, 'SSR 페이지 h1(운명의 동물 도감)과 겹치지 않게 랜딩 제목은 h2');
  assert.equal(v.q('h2')?.textContent, '내 운명의 동물 찾기');
  await walk(v, { time: '07:30', name: '호랑' });
  await waitFor(() => store().status === 'result');
  await flush();
  assert.deepEqual(globalThis.__inputs[0], {
    name: '호랑', birthDate: '1990-05-15', birthTime: '07:30', gender: 'female', calendarType: 'lunar', lunarLeap: true,
  }, '원본 입력 카드와 같은 6필드');
  assert.deepEqual(globalThis.__paid, ['1990-05-15'], '유료 풀이 확인(loadPaid)은 스토어 calculate 안에서 원본대로 1회');
  assert.equal(store().paid.status, 'login', '로그인 안내 게이트 상태가 원본 결과 화면으로 그대로 간다');
  assert.equal(v.q('[id^="gf-title-"]'), null, '결과는 AnimalDestinyPage 의 원본 AnimalResultScreen 이 그린다');
  assert.match(v.w.location.search, /step=result/);
  assert.ok(!JSON.stringify(globalThis.__events).includes('1990'), '측정에 생년월일을 싣지 않는다');
  await v.close();
});

test('비운 선택값은 원본 기본값(시각 "", 성별 unknown, 양력)으로 간다', async () => {
  const v = await mount();
  await walk(v, { calendar: '양력', gender: '선택 안 함' });
  await waitFor(() => store().status === 'result');
  assert.deepEqual(globalThis.__inputs[0], {
    name: '', birthDate: '1990-05-15', birthTime: '', gender: 'unknown', calendarType: 'solar', lunarLeap: false,
  });
  await v.close();
});

test('원본 다시 하기(reset) → 생년월일 단계로, 계산 실패 → 생년월일 단계 + 스토어 오류 문구 유지', async () => {
  const v = await mount();
  await walk(v);
  await waitFor(() => store().status === 'result');
  await act(async () => { store().reset(); }); await flush();
  assert.equal(v.heading(), '생년월일을 알려 주세요');
  await v.close();

  const f = await mount();
  globalThis.__fail = true;
  await walk(f);
  await waitFor(() => store().status === 'error');
  await flush();
  assert.equal(f.heading(), '생년월일을 알려 주세요');
  assert.equal(store().error, '날짜를 확인해 주세요', '오류 문구는 페이지의 원본 오류 블록이 보여 준다');
  await f.close();
});

test('저장 프로필을 고르면 원본 매핑으로 스토어를 채우고 시각·이름 입력을 미리 채운다', async () => {
  globalThis.__seed = { name: '달', birthDate: '1988-02-03', birthTime: '23:10', birthTimeUnknown: false, gender: 'male', calendarType: 'lunar', isLeapMonth: false };
  const v = await mount();
  await v.click(v.byText('동물 찾기 시작'));
  await v.click(v.byText('저장 프로필'));
  assert.equal(v.q('input[name="date"]').value, '1988-02-03');
  assert.deepEqual({ ...store().input }, { ...store().input, name: '달', birthDate: '1988-02-03', birthTime: '23:10', gender: 'male', calendarType: 'lunar', lunarLeap: false });
  await v.click(v.byText('다음'));
  await v.click(v.byText('음력')); await v.click(v.byText('다음'));
  assert.equal(v.q('input[name="time"]').value, '23:10');
  await v.click(v.byText('다음'));
  await v.click(v.byText('남성')); await v.click(v.byText('다음'));
  assert.equal(v.q('input[name="name"]').value, '달');
  await v.close();
});

// ── W1 공용 출생 입력(GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED): 이름 → 성별 → 생년월일 → 달력 → 시각 → 확인, 스토어 입력 6필드는 같다 ──
{
  const birth = await load({ GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED: true, GUIDED_BIRTH_INPUT_V2_ENABLED: false });

  test('W1 출생 입력: 이름 → 성별 → 년·월·일 → 달력 → 시진 → 확인 → 같은 스토어 입력·유료 확인 1회', async () => {
    Component = birth.default; useStore = birth.useAnimalDestinyStore;
    const v = await mount();
    await v.click(v.byText('동물 찾기 시작'));
    assert.equal(v.heading(), '결과 카드에 어떤 이름을 쓸까요?');
    await v.setValue(v.q('input[name="name"]'), '호랑');
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '성별을 골라 주세요');
    await v.click(v.byText('여성')); await v.click(v.byText('다음'));
    assert.equal(v.heading(), '생년월일을 알려 주세요');
    await v.setValue(v.q('input[name="birth-year"]'), '1990');
    await v.setValue(v.q('input[name="birth-month"]'), '5');
    await v.setValue(v.q('input[name="birth-day"]'), '15');
    await v.click(v.byText('다음'));
    await v.click(v.byText('음력 윤달')); await v.click(v.byText('다음'));
    assert.equal(v.heading(), '태어난 시각을 아세요?');
    await v.setValue(v.q('input[name="time"]'), '07:30');
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '입력한 정보가 맞나요?');
    await v.click(v.byText('확인'));
    await waitFor(() => store().status === 'result');
    await flush();
    assert.deepEqual(globalThis.__inputs[0], {
      name: '호랑', birthDate: '1990-05-15', birthTime: '07:30', gender: 'female', calendarType: 'lunar', lunarLeap: true,
    }, '원본 입력 카드와 같은 6필드');
    assert.deepEqual(globalThis.__paid, ['1990-05-15']);
    assert.equal(v.q('[id^="gf-title-"]'), null, '결과는 원본 AnimalResultScreen 이 그린다');
    await v.close();
  });

  test('W1 출생 입력: 저장 프로필을 고르면 원본 매핑으로 스토어를 채우고 확인 요약으로 바로 간다', async () => {
    Component = birth.default; useStore = birth.useAnimalDestinyStore;
    globalThis.__seed = { name: '달', birthDate: '1988-02-03', birthTime: '23:10', birthTimeUnknown: false, gender: 'male', calendarType: 'lunar', isLeapMonth: false };
    const v = await mount();
    await v.click(v.byText('동물 찾기 시작'));
    await v.click(v.byText('저장 프로필')); await flush();
    assert.equal(v.heading(), '입력한 정보가 맞나요?');
    const text = v.w.document.body.textContent;
    assert.ok(text.includes('달') && text.includes('1988년 2월 3일') && text.includes('23:10') && text.includes('남성'));
    assert.deepEqual({ ...store().input }, { ...store().input, name: '달', birthDate: '1988-02-03', birthTime: '23:10', gender: 'male', calendarType: 'lunar', lunarLeap: false });
    await v.click(v.byText('확인'));
    await waitFor(() => store().status === 'result');
    assert.deepEqual(globalThis.__inputs[0], { name: '달', birthDate: '1988-02-03', birthTime: '23:10', gender: 'male', calendarType: 'lunar', lunarLeap: false });
    await v.close();
  });
}

// ── 출생 입력 확대(GUIDED_BIRTH_INPUT_V2_ENABLED): 한 칸 날짜, 시각 다음 태어난 장소(기록만) — 스토어 입력 6필드·유료 확인은 같다 ──
{
  const birthV2 = await load({ GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED: true, GUIDED_BIRTH_INPUT_V2_ENABLED: true });

  test('출생 입력 확대: 8단계 안내 → 한 칸 날짜 → 장소 기록 → 확인(서울 기준) → 같은 스토어 입력·유료 확인 1회, 브라우저 안내는 없다', async () => {
    Component = birthV2.default; useStore = birthV2.useAnimalDestinyStore;
    const v = await mount();
    const landing = v.w.document.body.textContent;
    assert.ok(landing.includes('모두 8단계로 진행돼요') && landing.includes('(5~7단계)'), '장소가 늘어난 단계 수를 첫 화면도 같이 말한다');
    await v.click(v.byText('동물 찾기 시작'));
    await v.setValue(v.q('input[name="name"]'), '호랑');
    await v.click(v.byText('다음'));
    await v.click(v.byText('여성')); await v.click(v.byText('다음'));
    assert.equal(v.heading(), '생년월일을 알려 주세요');
    assert.equal(v.q('input[name="birth-year"]'), null, '년·월·일 세 칸 대신 한 칸');
    const date = v.q('input[name="birth-date"]');
    await v.setValue(date, '1990515');
    assert.equal(date.value, '1990.05.15');
    await v.click(v.byText('다음'));
    await v.click(v.byText('음력 윤달')); await v.click(v.byText('다음'));
    await v.setValue(v.q('input[name="time"]'), '07:30');
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '태어난 곳을 알려 주세요');
    assert.ok(v.w.document.body.textContent.includes('6 / 8 단계'));
    await v.setValue(v.q('input[name="birth-place"]'), '부산');
    await v.click(v.byText('다음'));
    assert.equal(v.heading(), '입력한 정보가 맞나요?');
    const confirm = v.w.document.body.textContent;
    assert.ok(confirm.includes('부산 (계산은 서울 기준)'));
    assert.ok(!confirm.includes('브라우저에서만 계산'), '유료 풀이 확인이 서버로 가는 흐름이라 안내하지 않는다');
    await v.click(v.byText('확인'));
    await waitFor(() => store().status === 'result');
    await flush();
    assert.deepEqual(globalThis.__inputs[0], {
      name: '호랑', birthDate: '1990-05-15', birthTime: '07:30', gender: 'female', calendarType: 'lunar', lunarLeap: true,
    }, '장소는 스토어 입력에 들어가지 않는다(원본 6필드)');
    assert.deepEqual(globalThis.__paid, ['1990-05-15']);
    await v.close();
  });
}
