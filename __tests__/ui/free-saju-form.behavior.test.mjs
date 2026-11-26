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

// 플래그 고정: 실제 flags.mjs 를 그대로 내보내되 넘긴 값만 덮어쓴다(W1 플래그 끔 = 이전 동작 확인용).
const FLAGS_PATH = require('node:path').resolve('lib/guided-flow/flags.mjs').replace(/\\/g, '/');
async function load(entry, flags = {}) {
  const output = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node',
    jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    plugins: [{ name: 'free-saju-mocks', setup(b) {
      b.onResolve({ filter: /(\/analytics|free-saju\/engine)$/ }, (args) => ({ path: args.path.endsWith('engine') ? 'engine' : 'analytics', namespace: 'mock' }));
      b.onResolve({ filter: /guided-flow\/flags\.mjs$/ }, (args) => (args.namespace === 'mock' ? undefined : { path: 'flags', namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
        contents: args.path === 'flags'
          ? `export * from '${FLAGS_PATH}';\n${Object.entries(flags).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join('\n')}`
          : mocks[args.path],
        loader: 'js', resolveDir: process.cwd(),
      }));
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

// ── 공통 스텝 플로우 판(FreeSajuGuided, 3c-A2): 원본과 같은 엔진 입력·측정·결과 문구 ──
{
  const FreeSajuGuided = await load('app/saju/free/FreeSajuGuided.tsx', { GUIDED_BIRTH_FREE_SAJU_ENABLED: false });
  const heading = (v) => v.q('[id^="gf-title-"]')?.textContent;
  async function walk(v, { date = '19900515', calendar = '음력 윤달', time = '' } = {}) {
    await v.click(v.byText('명식 보기 시작'));
    assert.equal(heading(v), '생년월일을 알려 주세요');
    assert.equal(v.byText('다음').disabled, true, '날짜 없이 못 넘어간다');
    await v.setValue(v.q('input[name="date"]'), date);
    await v.click(v.byText('다음'));
    assert.equal(heading(v), '어떤 달력 기준인가요?');
    await v.click(v.byText(calendar)); await v.click(v.byText('다음'));
    assert.equal(heading(v), '태어난 시각을 아세요?');
    assert.equal(v.byText('다음').disabled, false, '출생시각은 비워도 넘어간다');
    if (time) await v.setValue(v.q('input[name="time"]'), time);
    await v.click(v.byText('다음')); await flush();
  }

  test('공통 플로우판: 랜딩 → 날짜 → 달력 → 시각(선택) → 결과, 원본과 같은 엔진 입력·측정·결과', async () => {
    const v = await mount(FreeSajuGuided);
    assert.equal(v.q('h1'), null, 'SEO 랜딩의 h1 과 겹치지 않게 랜딩 제목은 h2');
    assert.equal(v.q('h2')?.textContent, '생년월일로 내 명식 보기');
    await walk(v);
    assert.equal(heading(v), '내 명식');
    assert.deepEqual(globalThis.__inputs, [{ birthDate: '1990-05-15', birthTime: null, calendarType: 'lunar', leapMonth: true }]);
    const chart = globalThis.__events.filter(([n]) => n.startsWith('free_saju_chart_'));
    assert.deepEqual(chart, [
      ['free_saju_chart_started', { surface: 'saju_free', time_known: false }],
      ['free_saju_chart_completed', { surface: 'saju_free', time_known: false }],
    ]);
    assert.ok(v.text().includes(RESULT_LINE));
    assert.ok(v.text().includes('가장 많아서'));
    assert.match(v.w.location.search, /step=result/);
    assert.ok(!JSON.stringify(globalThis.__events).includes('1990'), '측정에 생년월일을 싣지 않는다');
    await v.close();
  });

  test('공통 플로우판: 시각을 넣으면 time_known=true, 계산 실패면 날짜 단계로 돌아가 원본 문구', async () => {
    const v = await mount(FreeSajuGuided);
    await walk(v, { calendar: '양력', time: '07:30' });
    assert.deepEqual(globalThis.__inputs[0], { birthDate: '1990-05-15', birthTime: '07:30', calendarType: 'solar', leapMonth: false });
    assert.equal(globalThis.__events.find(([n]) => n === 'free_saju_chart_started')[1].time_known, true);
    await v.close();

    const f = await mount(FreeSajuGuided);
    globalThis.__fail = true;
    await walk(f);
    assert.equal(heading(f), '생년월일을 알려 주세요');
    assert.ok(f.text().includes('입력한 날짜와 달력 구분을 확인해 주세요.'));
    assert.deepEqual(globalThis.__events.filter(([n]) => n.startsWith('free_saju_chart_')).map(([n]) => n), ['free_saju_chart_started']);
    await f.close();
  });
}

// ── W1 공용 출생 입력(GUIDED_BIRTH_FREE_SAJU_ENABLED): 년·월·일 칸 → 달력 → 시진 칩 → 확인 요약, 엔진 입력은 같다 ──
{
  const FreeSajuGuided = await load('app/saju/free/FreeSajuGuided.tsx', { GUIDED_BIRTH_FREE_SAJU_ENABLED: true, GUIDED_BIRTH_INPUT_V2_ENABLED: false });
  const heading = (v) => v.q('[id^="gf-title-"]')?.textContent;

  test('W1 출생 입력: 칸 자동 이동·즉시 검증 → 시진 칩 → 확인 요약(수정하기) → 같은 엔진 입력·결과', async () => {
    const v = await mount(FreeSajuGuided);
    await v.click(v.byText('명식 보기 시작'));
    assert.equal(heading(v), '생년월일을 알려 주세요');
    const year = v.q('input[name="birth-year"]');
    assert.equal(year.getAttribute('inputmode'), 'numeric');
    await v.setValue(year, '1990');
    assert.equal(v.w.document.activeElement, v.q('input[name="birth-month"]'), '연도 네 자리 뒤 월 칸으로');
    await v.setValue(v.q('input[name="birth-month"]'), '02');
    await v.setValue(v.q('input[name="birth-day"]'), '30');
    assert.ok(v.text().includes('날짜를 다시 확인해 주세요'), '없는 날짜는 바로 알려 준다');
    assert.equal(v.byText('다음').disabled, true);
    await v.setValue(v.q('input[name="birth-month"]'), '05');
    await v.setValue(v.q('input[name="birth-day"]'), '15');
    await v.click(v.byText('다음'));
    assert.equal(heading(v), '어떤 달력 기준인가요?');
    await v.click(v.byText('음력 윤달')); await v.click(v.byText('다음'));
    assert.equal(heading(v), '태어난 시각을 아세요?');
    await v.click(v.byText('묘시'));
    await v.click(v.byText('다음'));
    assert.equal(heading(v), '입력한 정보가 맞나요?');
    assert.ok(v.text().includes('1990년 5월 15일') && v.text().includes('묘시 (05:30~07:29)'));
    assert.equal(v.q('input[name="birth-place"]'), null, '태어난 장소는 이 흐름에서 묻지 않는다');
    await v.click(v.q('button[aria-label="태어난 시각 수정하기"]'));
    assert.equal(heading(v), '태어난 시각을 아세요?');
    await v.click(v.byText('시간을 몰라요'));
    assert.equal(heading(v), '입력한 정보가 맞나요?');
    assert.ok(v.text().includes('모름'));
    await v.click(v.byText('확인')); await flush();
    assert.equal(heading(v), '내 명식');
    assert.deepEqual(globalThis.__inputs, [{ birthDate: '1990-05-15', birthTime: null, calendarType: 'lunar', leapMonth: true }]);
    assert.ok(v.text().includes(RESULT_LINE));
    await v.close();
  });

  test('W1 출생 입력: 직접 입력 시각은 HH:mm 로 엔진에 간다(time_known=true)', async () => {
    const v = await mount(FreeSajuGuided);
    await v.click(v.byText('명식 보기 시작'));
    await v.setValue(v.q('input[name="birth-year"]'), '19900515');
    await v.click(v.byText('다음'));
    await v.click(v.byText('양력')); await v.click(v.byText('다음'));
    await v.setValue(v.q('input[name="time"]'), '0730');
    assert.equal(v.q('input[name="time"]').value, '07:30');
    await v.click(v.byText('다음'));
    await v.click(v.byText('확인')); await flush();
    assert.deepEqual(globalThis.__inputs[0], { birthDate: '1990-05-15', birthTime: '07:30', calendarType: 'solar', leapMonth: false });
    assert.equal(globalThis.__events.find(([n]) => n === 'free_saju_chart_started')[1].time_known, true);
    await v.close();
  });
}

// ── 출생 입력 확대(GUIDED_BIRTH_INPUT_V2_ENABLED): 생년월일 한 칸(0000.00.00) → 달력 → 시각 → 태어난 장소(선택, 기록만) → 확인 ──
{
  const FreeSajuV2 = await load('app/saju/free/FreeSajuGuided.tsx', { GUIDED_BIRTH_FREE_SAJU_ENABLED: true, GUIDED_BIRTH_INPUT_V2_ENABLED: true });
  const heading = (v) => v.q('[id^="gf-title-"]')?.textContent;

  test('출생 입력 확대: 한 칸 날짜 자동 형식·1900~오늘 검증 → 장소 기록 → 확인 요약·브라우저 안내 → 엔진 입력은 장소 없이 같다', async () => {
    const calls = []; const realFetch = globalThis.fetch;
    globalThis.fetch = (...args) => { calls.push(args); return Promise.reject(new Error('no network')); };
    const v = await mount(FreeSajuV2);
    await v.click(v.byText('명식 보기 시작'));
    assert.equal(heading(v), '생년월일을 알려 주세요');
    assert.equal(v.q('input[name="birth-year"]'), null, '년·월·일 세 칸 대신 한 칸');
    const date = v.q('input[name="birth-date"]');
    assert.equal(date.getAttribute('inputmode'), 'numeric');
    assert.equal(date.getAttribute('placeholder'), '0000.00.00');
    await v.setValue(date, '199005');
    assert.equal(date.value, '1990.05', '숫자만 쳐도 점이 들어간다');
    await v.setValue(date, '19900230');
    assert.ok(v.text().includes('날짜를 다시 확인해 주세요'), '없는 날짜는 바로 알려 준다');
    assert.equal(v.byText('다음').disabled, true);
    await v.setValue(date, '18991231');
    assert.equal(v.byText('다음').disabled, true, '1900년 전은 받지 않는다');
    await v.setValue(date, '1990.5.15');
    assert.equal(date.value, '1990.05.15');
    await v.click(v.byText('다음'));
    await v.click(v.byText('음력 윤달')); await v.click(v.byText('다음'));
    await v.click(v.byText('묘시')); await v.click(v.byText('다음'));
    assert.equal(heading(v), '태어난 곳을 알려 주세요');
    assert.ok(v.text().includes('4 / 6 단계'), '장소가 늘어 진행 표시는 6단계');
    assert.ok(v.text().includes('서울 기준 시각으로 계산해요'), '장소가 계산을 바꾸지 않는다고 알린다');
    await v.setValue(v.q('input[name="birth-place"]'), '대한민국 부산');
    await v.click(v.byText('다음'));
    assert.equal(heading(v), '입력한 정보가 맞나요?');
    assert.ok(v.text().includes('대한민국 부산 (계산은 서울 기준)'));
    assert.ok(v.text().includes('입력한 정보는 브라우저에서만 계산돼요'));
    await v.click(v.byText('확인')); await flush();
    assert.equal(heading(v), '내 명식');
    assert.deepEqual(globalThis.__inputs, [{ birthDate: '1990-05-15', birthTime: '06:30', calendarType: 'lunar', leapMonth: true }], '장소는 엔진에 가지 않는다');
    assert.ok(v.text().includes('년주 庚午'));
    assert.deepEqual(calls.map(([u]) => String(u)).filter((u) => !u.startsWith('/i18n/')), [], '문구 사전 말고는 네트워크 호출(/api/geocode 등)이 없다');
    const events = JSON.stringify(globalThis.__events);
    assert.ok(!events.includes('부산') && !events.includes('1990'), '측정에 출생 정보를 싣지 않는다');
    globalThis.fetch = realFetch;
    await v.close();
  });

  test('출생 입력 확대: 장소를 건너뛰면 서울 기준 표시, 엔진 입력·결과는 장소 단계 없는 W1 과 같다', async () => {
    const v = await mount(FreeSajuV2);
    await v.click(v.byText('명식 보기 시작'));
    await v.setValue(v.q('input[name="birth-date"]'), '19900515');
    await v.click(v.byText('다음'));
    await v.click(v.byText('양력')); await v.click(v.byText('다음'));
    await v.click(v.byText('시간을 몰라요'));
    assert.equal(heading(v), '태어난 곳을 알려 주세요');
    await v.click(v.byText('잘 몰라요, 건너뛸게요'));
    assert.equal(heading(v), '입력한 정보가 맞나요?');
    assert.ok(v.text().includes('서울 기준'));
    await v.click(v.byText('확인')); await flush();
    const inputsV2 = globalThis.__inputs;
    const resultV2 = v.text().slice(v.text().indexOf('년주'));
    await v.close();
    const W1 = await load('app/saju/free/FreeSajuGuided.tsx', { GUIDED_BIRTH_FREE_SAJU_ENABLED: true, GUIDED_BIRTH_INPUT_V2_ENABLED: false });
    const o = await mount(W1);
    await o.click(o.byText('명식 보기 시작'));
    await o.setValue(o.q('input[name="birth-year"]'), '19900515');
    await o.click(o.byText('다음'));
    await o.click(o.byText('양력')); await o.click(o.byText('다음'));
    await o.click(o.byText('시간을 몰라요'));
    await o.click(o.byText('확인')); await flush();
    assert.deepEqual(globalThis.__inputs, inputsV2, '엔진 입력이 같다');
    assert.deepEqual(inputsV2, [{ birthDate: '1990-05-15', birthTime: null, calendarType: 'solar', leapMonth: false }]);
    assert.equal(o.text().slice(o.text().indexOf('년주')), resultV2, '결과 본문이 같다');
    await o.close();
  });
}

// ── 신살 요약(선택 필드, SAJU_SHINSAL_FACTS_V1 의 'free-saju'): 꺼지면 필드가 없고 결과 화면은 옛 그대로 ──
async function loadModule(entry, rollout) {
  const ROLLOUT_PATH = require('node:path').resolve('worker/lib/engine-rollout.js').replace(/\\/g, '/');
  const output = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node',
    alias: { '@': process.cwd() }, logLevel: 'silent', loader: { '.json': 'json' },
    plugins: rollout === undefined ? [] : [{ name: 'rollout', setup(b) {
      b.onResolve({ filter: /engine-rollout\.js$/ }, (args) => (args.namespace === 'mock' ? undefined : { path: 'rollout', namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `export * from '${ROLLOUT_PATH}';\nexport const ENGINE_ROLLOUT_FLAGS = ${JSON.stringify({ SAJU_SHINSAL_FACTS_V1: rollout })};`,
        loader: 'js', resolveDir: process.cwd(),
      }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}
{
  const { summarizeFreeSajuShinsal } = await loadModule('lib/free-saju/shinsal.ts');
  const { shinsalSummaryLine, FREE_SAJU_SHINSAL_MAX } = await loadModule('lib/free-saju/copy.ts');

  test('신살 요약: 귀인·길신·주의만, 원국 자리만, 정본 이름 그대로 — 실패하면 빈 배열', () => {
    const items = summarizeFreeSajuShinsal({ year: '甲子', month: '丁卯', day: '甲午', hour: '丙寅' });
    assert.ok(items.length > 0);
    assert.ok(items.every((it) => ['gwiin', 'gil', 'hyung'].includes(it.category)), '12신살·관계는 만세력 표가 맡는다');
    assert.ok(items.every((it) => it.places.length > 0 && it.places.every((pl) => /^(년|월|일|시)(간|지|주)(·(년|월|일|시)지)*$/.test(pl))));
    const noHour = summarizeFreeSajuShinsal({ year: '甲子', month: '丁卯', day: '甲午', hour: null });
    assert.ok(noHour.every((it) => it.places.every((pl) => !pl.includes('시'))), '시간 미상이면 시주 자리는 없다');
    assert.deepEqual(summarizeFreeSajuShinsal({ year: '??', month: '', day: '甲午', hour: null }), []);
    assert.deepEqual(summarizeFreeSajuShinsal(null), []);
  });

  test('신살 한 줄: 없으면 없다고만, 많으면 앞 몇 개와 남은 수', () => {
    assert.match(shinsalSummaryLine([]), /없어요/);
    const many = Array.from({ length: FREE_SAJU_SHINSAL_MAX + 2 }, (_, i) => ({ id: `r${i}`, name: `신살${i}`, category: 'gwiin', places: ['일지', '시지'] }));
    const line = shinsalSummaryLine(many);
    assert.ok(line.includes(`신살 ${many.length}가지`) && line.includes('신살0(일지·시지)') && line.includes('외 2가지'));
    assert.ok(!line.includes(`신살${FREE_SAJU_SHINSAL_MAX}(`), '상한 밖 이름은 적지 않는다');
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(line), '이모지 없음');
  });

  test('엔진: 플래그가 꺼지면 shinsal 필드가 없고, free-saju 가 켜지면 원국 신살 요약이 붙는다', async () => {
    const input = { birthDate: '1990-05-15', birthTime: '14:30', calendarType: 'solar', leapMonth: false };
    const off = await (await loadModule('lib/free-saju/engine.ts', '')).computeFreeSaju(input);
    assert.equal('shinsal' in off, false);
    const other = await (await loadModule('lib/free-saju/engine.ts', 'prompt-hub')).computeFreeSaju(input);
    assert.equal('shinsal' in other, false, '다른 소비처 id 로는 켜지지 않는다');
    const on = await (await loadModule('lib/free-saju/engine.ts', 'free-saju')).computeFreeSaju(input);
    assert.deepEqual({ ...on, shinsal: undefined }, { ...off, shinsal: undefined }, '명식 결과는 그대로다');
    assert.ok(Array.isArray(on.shinsal));
    assert.deepEqual(on.shinsal, summarizeFreeSajuShinsal(on.pillars));
  });
}
{
  const FreeSajuForm = await load('app/saju/free/FreeSajuForm.tsx');
  const FreeSajuGuided = await load('app/saju/free/FreeSajuGuided.tsx', { GUIDED_BIRTH_FREE_SAJU_ENABLED: false });
  const SHINSAL = [{ id: 'cheoneul', name: '천을귀인', category: 'gwiin', places: ['일지'] }];

  test('신살 한 줄: 원본 폼과 공통 플로우판 모두 필드가 있을 때만 보인다', async () => {
    for (const [Component, run] of [
      [FreeSajuForm, async (v) => { await v.setValue(v.q('input[name="date"]'), '1990-05-15'); await v.click(v.byText('명식 보기')); await flush(); }],
      [FreeSajuGuided, async (v) => {
        await v.click(v.byText('명식 보기 시작')); await v.setValue(v.q('input[name="date"]'), '19900515'); await v.click(v.byText('다음'));
        await v.click(v.byText('양력')); await v.click(v.byText('다음')); await v.click(v.byText('다음')); await flush();
      }],
    ]) {
      const off = await mount(Component); await run(off);
      assert.ok(off.text().includes(RESULT_LINE) && !/신살 \d+가지를 찾았어요|신살은 없어요/.test(off.text()), '필드가 없으면 옛 결과 그대로');
      await off.close();
      const on = await mount(Component); globalThis.__reading = { ...READING, shinsal: SHINSAL }; await run(on);
      assert.ok(on.text().includes('원국에서 신살 1가지를 찾았어요') && on.text().includes('천을귀인(일지)'));
      await on.close();
    }
  });
}
