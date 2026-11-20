// 무료 힐링 타로(/tarot/healing/, SunHealingTarot) 현재 동작 고정 — 공통 스텝 플로우 이관(3c-A1) 전에 쓴다.
// 이관 뒤에도 플래그를 끄면 이 컴포넌트가 그대로 돌아야 하므로 이 테스트는 계속 초록이어야 한다.
// 잠그는 것: 카드 뽑기(78장 Fisher-Yates → 앞 4장, 정/역 Math.random<0.5)와 그 시드 결과,
// 순서대로만 뒤집히는 4장, 4장 전엔 잠긴 "회복 리딩 열기", 브라우저 결정론 엔진으로 만든 결과 화면,
// AI 프롬프트 패널 마커와 본문 머리, 뒤로가기(result→spread→intro→onExit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');

const MOTION_PROPS = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileInView', 'viewport', 'layout', 'variants'];
const mocks = {
  'framer-motion': `import React from "react";
    const strip = (p) => { const o = { ...p }; for (const k of ${JSON.stringify(MOTION_PROPS)}) delete o[k]; return o; };
    const cache = {};
    export const m = new Proxy({}, { get: (_, tag) => (cache[tag] ||= React.forwardRef((p, ref) => React.createElement(tag, { ...strip(p), ref }))) });
    export const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children);
    export const MotionConfig = ({ children }) => React.createElement(React.Fragment, null, children);
    export const useReducedMotion = () => true;`,
  'next/image': `import React from "react";
    export default function Image({ src, alt, fill, sizes, priority, unoptimized, ...rest }) { return React.createElement("img", { src, alt, ...rest }); }`,
  loadingMessages: 'export const getCurrentLoadingLocale = () => "ko";',
};

const output = await build({
  entryPoints: ['app/components/SunHealingTarot.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node',
  jsx: 'automatic', alias: { '@': process.cwd() }, logLevel: 'silent',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  plugins: [{ name: 'healing-mocks', setup(b) {
    b.onResolve({ filter: /^framer-motion$|^next\/image$|loadingMessages$/ }, (args) => ({
      path: Object.keys(mocks).find((k) => args.path === k || args.path.endsWith('/' + k)), namespace: 'mock',
    }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js', resolveDir: process.cwd() }));
    b.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
  } }],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
const SunHealingTarot = mod.exports.default;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const flush = async (rounds = 20) => {
  for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

async function mount(props = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/tarot/healing/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(SunHealingTarot, props)));
  const buttons = () => [...document.querySelectorAll('button')];
  const byText = (text) => buttons().find((b) => b.textContent.includes(text));
  return {
    byText,
    flipButtons: () => buttons().filter((b) => /^[1-4]\. /.test(b.getAttribute('aria-label') || '')),
    click: async (el) => { await act(async () => { el.click(); }); },
    close: async () => { await act(async () => root.unmount()); dom.window.close(); },
  };
}

async function startWithSeed(view, seed) {
  const realRandom = Math.random;
  Math.random = seeded(seed);
  try { await view.click(view.byText('태양 리딩 시작')); } finally { Math.random = realRandom; }
}

test('시작하면 78장 중 서로 다른 4장을 자리 순서대로 뽑고, 같은 시드는 같은 카드·방향을 낸다', async () => {
  const seen = [];
  for (const seed of [7, 7, 20261120]) {
    const view = await mount();
    await startWithSeed(view, seed);
    const flips = view.flipButtons();
    assert.equal(flips.length, 4, '펼침 단계의 카드 버튼은 4장이다');
    assert.deepEqual(flips.map((b) => b.getAttribute('aria-label')), ['1. 마음이 지친 자리', '2. 감정의 온도', '3. 회복의 단서', '4. 오늘의 회복 행동']);
    for (const b of flips) await view.click(b);
    await view.click(view.byText('회복 리딩 열기'));
    await flush();
    const imgs = [...document.querySelectorAll('article img')].map((img) => img.getAttribute('src'));
    const dirs = [...document.querySelectorAll('article h4')].slice(0, 4).map((h) => (h.textContent.match(/(정방향|역방향)$/) || ['?'])[0]);
    seen.push(imgs.join(',') + '|' + dirs.join(','));
    assert.equal(imgs.length, 4, `결과 카드 4장에 이미지가 붙는다: ${imgs.join(' ')}`);
    assert.equal(new Set(imgs).size, 4, '같은 카드가 두 번 나오지 않는다');
    for (const src of imgs) assert.match(src, /^\/tarot-cards\/[a-z]+\.webp$/i);
    await view.close();
  }
  // 시드 7 의 고정 결과 — 뽑기(Fisher-Yates·카드 풀 순서·앞 4장)가 바뀌면 여기서 걸린다.
  assert.equal(seen[0], '/tarot-cards/knightofswords.webp,/tarot-cards/thehighpriestess.webp,/tarot-cards/tenofcups.webp,/tarot-cards/judgement.webp|역방향,정방향,역방향,정방향');
  assert.equal(seen[0], seen[1], '같은 시드인데 다른 카드가 나왔다 — 뽑기 알고리즘이 바뀌었다');
  assert.notEqual(seen[0], seen[2]);
});

test('카드는 왼쪽부터 한 장씩만 뒤집히고, 4장을 다 뒤집기 전엔 리딩 열기가 잠겨 있다', async () => {
  const view = await mount();
  await startWithSeed(view, 11);
  const open = () => view.byText('회복 리딩 열기');
  assert.equal(open().disabled, true);
  let flips = view.flipButtons();
  assert.deepEqual(flips.map((b) => b.disabled), [false, true, true, true]);
  await view.click(flips[2]);
  assert.deepEqual(view.flipButtons().map((b) => b.disabled), [false, true, true, true], '순서를 건너뛰어 뒤집혔다');
  for (let i = 0; i < 4; i += 1) {
    await view.click(view.flipButtons()[i]);
  }
  assert.equal(open().disabled, false);
  await view.close();
});

test('리딩을 열면 결정론 엔진 결과(카드 4장·종합 흐름·AI 프롬프트 패널)를 보여 준다', async () => {
  const view = await mount();
  await startWithSeed(view, 3);
  for (let i = 0; i < 4; i += 1) await view.click(view.flipButtons()[i]);
  await view.click(view.byText('회복 리딩 열기'));
  await flush();
  const cards = [...document.querySelectorAll('article h4')];
  assert.ok(cards.length >= 4, `결과 카드가 부족하다: ${cards.length}`);
  for (const h of cards.slice(0, 4)) assert.match(h.textContent, /(정방향|역방향)$/);
  const panel = document.querySelector('[data-marker="tarot-healing-ai-prompt-bottom-v20260621"]');
  assert.ok(panel, 'AI 프롬프트 패널 마커가 사라졌다');
  const prompt = document.getElementById('tarotHealingAiPromptOutput');
  assert.ok(prompt, '프롬프트 textarea id 가 사라졌다');
  assert.match(prompt.value || prompt.textContent, /^태양 회복 타로에서 받은 아래 흐름을 바탕으로/);
  assert.match(prompt.value || prompt.textContent, /\[펼쳐진 카드\]\n1\. /);
  for (const label of ['공유', '다시', '다른']) assert.ok(view.byText(label), `결과 버튼(${label})이 없다`);
  await view.close();
});

test('뒤로가기 신호는 결과→펼침→처음→나가기 순서로 물러난다', async () => {
  let back = null;
  let exited = 0;
  const view = await mount({ listenBack: (cb) => { back = cb; return () => { if (back === cb) back = null; }; }, onExit: () => { exited += 1; } });
  await startWithSeed(view, 5);
  for (let i = 0; i < 4; i += 1) await view.click(view.flipButtons()[i]);
  await view.click(view.byText('회복 리딩 열기'));
  await flush();
  assert.ok(document.getElementById('tarotHealingAiPromptOutput'));
  await act(async () => back());
  assert.equal(view.flipButtons().length, 4, '결과에서 뒤로가면 펼침 단계여야 한다');
  await act(async () => back());
  assert.ok(view.byText('태양 리딩 시작'), '펼침에서 뒤로가면 처음 화면이어야 한다');
  await act(async () => back());
  assert.equal(exited, 1);
  await view.close();
});
