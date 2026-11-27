// 액땜 카드(RemedyCaseCards) 화면 계약. 실제 컴포넌트를 브라우저 번들로 묶어 JSDOM 에서 그린다(네트워크·결제 없음).
// 볼 것: 결과가 없거나 ko 가 아니면 아무것도 그리지 않는다, 3장을 넘으면 접고 버튼으로 편다, 그림은 고정 틀·즉시 로딩이다.
// 그림 틀 표(frames.mjs)는 public/ 원본 픽셀·투명도와 같아야 한다(그림을 바꾸면 표가 낡는다).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { computeRemedyCases, REMEDY_IMAGES, REMEDY_NARRATORS } from '../../lib/saju/remedy/index.mjs';
import { REMEDY_IMAGE_FRAMES } from '../../lib/saju/remedy/frames.mjs';

// 합성 입력: __tests__/saju/remedy-cases.test.mjs 와 같은 고정 natalCore·12궁 명반.
const core = (avoid) => ({
  status: 'ok',
  counts: { byEl: { wood: 2, fire: 2, earth: 2, metal: 2, water: 1 } },
  yongsinMethods: { final: { yongsin: 'water', useful: ['water'], avoid }, johu: { status: 'ok', urgent: false } },
});
const BASE = { year: '乙丑', month: '戊寅', day: '乙卯', hour: '丁亥' };
const PALACES = ['명궁', '형제궁', '부처궁', '자녀궁', '재백궁', '질액궁', '천이궁', '노복궁', '관록궁', '전택궁', '복덕궁', '부모궁'];
const ziwei = (patch) => ({
  palaces: PALACES.map((name) => ({ name, mainStars: ['자미'], maleficStars: [], transformations: [], ...(patch[name] || {}) })),
  lunar: { year: 1990 }, majorLuck: [], uncertainty: { birthTimeUnknown: false },
});
const MANY = {
  saju: { pillars: { ...BASE, day: '甲子', year: '甲辰' }, natalCore: core(['fire']), daewoon: { pillar: '丁丑', startYear: 2022, endYear: 2031 } },
  ziwei: ziwei({ 명궁: { maleficStars: ['경양'] }, 질액궁: { transformations: ['화기:태음'] } }),
  refYear: 2026,
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const FIVE = plain(computeRemedyCases(MANY, { limit: 5 }));
const THREE = plain(computeRemedyCases(MANY, { limit: 3 }));

const bundle = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';
      import RemedyCaseCards from './components/fortune/remedy/RemedyCaseCards';
      const root=createRoot(document.getElementById('root'));root.render(React.createElement(RemedyCaseCards, window.testProps));
      window.unmountCards=()=>root.unmount();`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'remedy-css-module', setup(builder) {
    builder.onLoad({ filter: /remedy-case-cards\.module\.css$/ }, () => ({ contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js' }));
  } }],
});
const script = bundle.outputFiles[0].text;

async function render(props, lang = 'ko') {
  const dom = new JSDOM('<html lang="ko"><body><div id="root"></div></body></html>', { url: `https://example.test/saju/?lang=${lang}`, runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window;
  win.testProps = props;
  win.eval(script);
  const settle = async () => { for (let i = 0; i < 6; i++) await new Promise((resolve) => setTimeout(resolve, 5)); };
  await settle();
  const root = win.document.getElementById('root');
  return { win, root, settle, close: () => { win.unmountCards?.(); win.close(); } };
}
const cardsIn = (node) => Array.from(node.querySelectorAll('article[data-remedy-case]'));

test('결과가 없거나 틀리거나 ko 가 아니면 아무것도 그리지 않는다', async () => {
  for (const [props, lang] of [[{ remedyCases: null }, 'ko'], [{ remedyCases: {} }, 'ko'], [{ remedyCases: { ...FIVE, valid: false } }, 'ko'], [{ remedyCases: { ...FIVE, cases: [] } }, 'ko'], [{ remedyCases: FIVE }, 'en']]) {
    const view = await render(props, lang);
    try { assert.equal(view.root.innerHTML, '', `${lang} ${JSON.stringify(props).slice(0, 40)}`); } finally { view.close(); }
  }
});

test('3장을 넘으면 앞 3장만 펼치고 나머지는 aria-expanded 버튼 뒤에 접는다', async () => {
  const view = await render({ remedyCases: FIVE, narrator: 'neo', theme: 'dark' });
  try {
    const section = view.root.querySelector('section[data-remedy-cards]');
    assert.ok(section);
    assert.equal(section.getAttribute('data-narrator'), 'neo');
    assert.equal(section.getAttribute('data-theme'), 'dark');
    const [head, rest] = section.querySelectorAll('ol');
    assert.equal(cardsIn(head).length, 3);
    assert.equal(cardsIn(rest).length, 2);
    assert.equal(rest.hidden, true);
    assert.equal(rest.getAttribute('start'), '4');
    const button = section.querySelector('button');
    assert.equal(button.getAttribute('type'), 'button');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(button.getAttribute('aria-controls'), rest.id);
    assert.equal(button.getAttribute('data-html2canvas-ignore'), 'true');
    assert.equal(button.textContent, '+2 더 보기');
    button.click(); await view.settle();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(rest.hidden, false);
    assert.equal(button.textContent, '접기');
    button.click(); await view.settle();
    assert.equal(rest.hidden, true);
    // 카드마다 제목·근거·생활 방법 2~3개·풍속 하나·면책 한 줄.
    for (const card of cardsIn(section)) {
      assert.ok(card.querySelector('h3')?.textContent);
      const methods = card.querySelectorAll('ul > li');
      assert.ok(methods.length >= 2 && methods.length <= 3, `${card.dataset.remedyCase} 방법 ${methods.length}개`);
      assert.match(card.textContent, /전해 내려오는 풍속/);
      assert.match(card.textContent, /효과를 보장하지 않아요/);
    }
  } finally { view.close(); }
});

test('3장 이하면 버튼이 없고, 그림은 고정 틀에 즉시 로딩한다', async () => {
  const view = await render({ remedyCases: THREE, narrator: 'musung', headingLevel: 4 });
  try {
    const section = view.root.querySelector('section[data-remedy-cards]');
    assert.equal(cardsIn(section).length, 3);
    assert.equal(section.querySelector('button'), null);
    assert.equal(section.querySelectorAll('ol').length, 1);
    assert.equal(section.querySelectorAll('h4').length, 3);
    const frame = REMEDY_IMAGE_FRAMES.musung;
    for (const img of section.querySelectorAll('img')) {
      assert.equal(img.getAttribute('loading'), 'eager');
      assert.equal(img.getAttribute('width'), String(frame.width));
      assert.equal(img.getAttribute('height'), String(frame.height));
      assert.match(img.getAttribute('alt'), /무성이 액땜 방법을 알려 주는 그림/);
      assert.equal(img.parentElement.style.aspectRatio, `${frame.width} / ${frame.height}`);
      assert.equal(img.closest('[data-fit]').getAttribute('data-fit'), 'card');
    }
  } finally { view.close(); }
});

test('그림 틀 표는 public/ 원본 픽셀·투명도와 같다', async () => {
  assert.deepEqual(Object.keys(REMEDY_IMAGE_FRAMES).sort(), [...REMEDY_NARRATORS].sort());
  for (const narrator of REMEDY_NARRATORS) {
    const frame = REMEDY_IMAGE_FRAMES[narrator];
    for (const src of new Set(Object.values(REMEDY_IMAGES[narrator]))) {
      const meta = await sharp(path.join('public', src)).metadata();
      assert.equal(meta.width, frame.width, `${src} width`);
      assert.equal(meta.height, frame.height, `${src} height`);
      assert.equal(Boolean(meta.hasAlpha), frame.fit === 'cutout', `${src} alpha`);
    }
  }
});
