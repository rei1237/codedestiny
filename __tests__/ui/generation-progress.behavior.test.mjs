// 유료 상담 생성 대기 화면(공용 GenerationProgress) 계약.
// 실제 완성 수가 있을 때만 막대를 채우고, 없으면 끝을 모르는 막대만 보인다. 퍼센트는 없다.
// 떠나도 안전하다는 안내 원문, 경과 시간 형식, 알림 영역에 경과 시간이 섞이지 않는 것을 잠근다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);

const bundled = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: 'ts',
    contents: "export * from './components/fortune/GenerationProgress.tsx'; export { default } from './components/fortune/GenerationProgress.tsx';",
  },
  bundle: true, write: false, format: 'cjs', platform: 'node', outfile: 'gp-bundle.js',
  jsx: 'automatic', alias: { '@': process.cwd() }, loader: { '.css': 'local-css' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server', 'react-dom/client'],
  logLevel: 'silent',
});
const code = bundled.outputFiles.find((f) => f.path.endsWith('.js')).text;
const mod = { exports: {} };
new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
const { default: GenerationProgress, LEAVE_SAFE_NOTICE, formatElapsed, resolveGenerationCount } = mod.exports;

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const h = React.createElement;

const base = { title: '연애 비책을 쓰고 있어요', status: '일곱 갈래를 함께 쓰고 있어요', progressLabel: '상담 작성 진행' };
const render = (props) => {
  const html = renderToStaticMarkup(h(GenerationProgress, { ...base, ...props }));
  return { html, doc: new JSDOM(`<body>${html}</body>`).window.document };
};

test('실제 완성 수가 있으면 막대를 채우고 progressbar 값과 "N / M" 을 말한다', () => {
  const { html, doc } = render({ completed: 2, total: 7, countUnit: '완성' });
  const bar = doc.querySelector('[role="progressbar"]');
  assert.ok(bar, '완성 수가 있는데 progressbar 가 없다');
  assert.equal(bar.getAttribute('aria-valuemin'), '0');
  assert.equal(bar.getAttribute('aria-valuemax'), '7');
  assert.equal(bar.getAttribute('aria-valuenow'), '2');
  assert.equal(bar.getAttribute('aria-valuetext'), '2 / 7 완성');
  assert.equal(bar.getAttribute('aria-label'), '상담 작성 진행');
  assert.match(bar.getAttribute('style') || '', /--gp-ratio:\s*0\.2857/);
  assert.match(doc.querySelector('[aria-live="polite"]').textContent, /2 \/ 7 완성/);
  assert.match(html, /data-gp-mode="determinate"/);
});

test('실제 완성 수가 없으면 progressbar 도, 숫자도 없이 끝을 모르는 막대만 보인다', () => {
  for (const props of [{}, { completed: 0, total: 0 }, { completed: 3, total: Number.NaN }, { completed: undefined, total: 7 }, { completed: -1, total: 7 }]) {
    const { html, doc } = render(props);
    assert.equal(doc.querySelector('[role="progressbar"]'), null, `가짜 진행 막대가 생겼다: ${JSON.stringify(props)}`);
    assert.equal(doc.querySelectorAll('[aria-valuenow]').length, 0);
    assert.match(html, /data-gp-mode="indeterminate"/);
    assert.doesNotMatch(doc.querySelector('[aria-live="polite"]').textContent, /\d+\s*\/\s*\d+/);
  }
});

test('완성 수는 total 을 넘지 않게 자르고, 0/7 도 실제 수라 막대로 보인다', () => {
  assert.deepEqual(resolveGenerationCount(9, 7), { completed: 7, total: 7 });
  assert.deepEqual(resolveGenerationCount(0, 7), { completed: 0, total: 7 });
  assert.equal(resolveGenerationCount(null, 7), null);
  assert.equal(resolveGenerationCount(2, 0), null);
  const { doc } = render({ completed: 0, total: 7 });
  assert.equal(doc.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '0');
});

test('어떤 상태에서도 퍼센트를 보이지 않는다', () => {
  for (const props of [{ completed: 2, total: 7 }, {}, { completed: 7, total: 7, timing: true, typicalRange: '보통 1~2분' }]) {
    const { html } = render(props);
    assert.doesNotMatch(html, /%/, `퍼센트가 새어 나왔다: ${JSON.stringify(props)}`);
  }
});

test('떠나도 안전 안내는 원문 그대로 기본으로 보이고, null 이면 숨기고, 다른 문장을 넘기면 그 문장만 보인다', () => {
  assert.equal(
    LEAVE_SAFE_NOTICE,
    '화면을 닫아도 결제한 상담은 사라지지 않아요. 다시 열면 이어서 쓰고, 오래 비워 두면 서버가 마저 완성해 기록함에 저장해요.',
  );
  assert.ok(render({}).doc.body.textContent.includes(LEAVE_SAFE_NOTICE));
  assert.ok(!render({ leaveNotice: null }).doc.body.textContent.includes('화면을 닫아도'));
  const variant = render({ leaveNotice: '다시 열면 이어서 써요.' }).doc.body.textContent;
  assert.ok(variant.includes('다시 열면 이어서 써요.'));
  assert.ok(!variant.includes(LEAVE_SAFE_NOTICE));
});

test('경과 시간은 m:ss 로 내림해 적는다', () => {
  assert.equal(formatElapsed(0), '0:00');
  assert.equal(formatElapsed(999), '0:00');
  assert.equal(formatElapsed(61_000), '1:01');
  assert.equal(formatElapsed(600_000), '10:00');
  assert.equal(formatElapsed(3_665_000), '61:05');
  assert.equal(formatElapsed(-5_000), '0:00');
  assert.equal(formatElapsed(Number.NaN), '0:00');
});

test('경과 시간·보통 시간은 알림 영역 밖에 있고, 알림 영역 조상에 aria-busy 가 없다', () => {
  const { doc } = render({ completed: 1, total: 7, timing: true, typicalRange: '보통 1~2분' });
  const live = doc.querySelector('[aria-live="polite"]');
  assert.ok(live);
  assert.equal(doc.querySelectorAll('[aria-live]').length, 1, '알림 영역은 하나만');
  assert.equal(live.querySelector('time'), null, '1초마다 바뀌는 경과 시간이 알림 영역에 들어갔다');
  assert.doesNotMatch(live.textContent, /보통/);
  const time = doc.querySelector('time');
  assert.ok(time, 'timing 인데 경과 시간이 없다');
  assert.equal(time.textContent, '0:00');
  assert.ok(doc.body.textContent.includes('보통 1~2분'));
  for (let node = live; node; node = node.parentElement) {
    assert.equal(node.getAttribute?.('aria-busy'), null, '알림 영역 조상에 aria-busy 가 있다');
  }
});

test('timing 이 아니면 경과 시간을 숨기고, 보통 시간은 넘긴 상품만 보인다', () => {
  const { doc } = render({});
  assert.equal(doc.querySelector('time'), null);
  assert.ok(!doc.body.textContent.includes('보통'));
});

test('단계 목록은 호출한 상태를 그대로 칠하고 현재 단계에 aria-current 를 단다', () => {
  const { doc } = render({
    steps: [
      { label: '정보 확인', state: 'done' },
      { label: '일곱 갈래 쓰기', state: 'current' },
      { label: '정리', state: 'pending' },
    ],
  });
  const items = [...doc.querySelectorAll('ol > li')];
  assert.deepEqual(items.map((li) => li.getAttribute('data-state')), ['done', 'current', 'pending']);
  assert.deepEqual(items.map((li) => li.getAttribute('aria-current')), [null, 'step', null]);
  assert.match(items[0].textContent, /완료/);
  assert.match(items[1].textContent, /진행 중/);
});

test('상담사 그림은 장식이라 alt 가 비어 있고 넘긴 에셋만 쓴다', () => {
  const { doc } = render({ persona: 'neo', counselor: { src: '/images/master-profiles/neo-new-year-portrait.webp', srcSet: 'a 360w, b 600w' } });
  const img = doc.querySelector('img');
  assert.equal(img.getAttribute('alt'), '');
  assert.equal(img.getAttribute('src'), '/images/master-profiles/neo-new-year-portrait.webp');
  assert.equal(img.closest('[aria-hidden="true"]') !== null, true);
  assert.equal(doc.querySelector('section').getAttribute('data-persona'), 'neo');
});
