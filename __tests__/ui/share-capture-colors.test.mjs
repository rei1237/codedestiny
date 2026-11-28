import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 공유 캡처(html2canvas 1.4.1): color-mix 계산값 때문에 캡처가 실패하고(P1-1), 배경이 투명해 네오 글자가 사라졌다(P1-2).
const source = fs.readFileSync('js/share.js', 'utf8');
const block = source.match(/\/\/ ── h2c-capture-colors:start[\s\S]*?\/\/ ── h2c-capture-colors:end/)[0];
const ctx = vm.createContext({});
vm.runInContext(block, ctx);
const stubRgba = (token) => (token === 'transparent' ? 'rgba(0, 0, 0, 0)' : /^rgba\(/.test(token) ? token : `rgba(1, 2, 3, 1)<${token}>`);

test('unparsable color functions become rgba, nested and repeated, while rgb() and names stay', () => {
  const value = 'linear-gradient(color(srgb 1 0 0 / 0.5), color-mix(in srgb, color(srgb 0 0 1) 40%, white)) , rgb(4, 5, 6), oklch(0.7 0.1 30) 0px 1px 2px, red';
  const seen = [];
  const out = ctx._cdReplaceColorFns(value, (token) => { seen.push(token); return 'rgba(9, 9, 9, 1)'; });
  assert.deepEqual(seen, ['color(srgb 1 0 0 / 0.5)', 'color-mix(in srgb, color(srgb 0 0 1) 40%, white)', 'oklch(0.7 0.1 30)']);
  assert.equal(out, 'linear-gradient(rgba(9, 9, 9, 1), rgba(9, 9, 9, 1)) , rgb(4, 5, 6), rgba(9, 9, 9, 1) 0px 1px 2px, red');
  assert.equal(ctx._cdReplaceColorFns('rgb(1, 2, 3)', () => 'x'), 'rgb(1, 2, 3)');

  // 복제 문서의 하위 요소에서 읽지 못하는 값만 !important 인라인으로 고정한다.
  const set = [];
  const el = (styles) => ({ style: { setProperty: (...args) => set.push(args) }, styles });
  const child = el({ color: 'color(srgb 0.2 0.1 0.3)', 'background-color': 'rgb(0, 0, 0)' });
  const root = el({ 'box-shadow': 'oklch(0.5 0.1 20) 0px 0px 4px' });
  root.ownerDocument = { defaultView: { getComputedStyle: (node) => ({ getPropertyValue: (prop) => node.styles[prop] || '' }) } };
  root.querySelectorAll = () => [child];
  assert.equal(ctx._cdNormalizeCloneColors(root, () => 'rgba(7, 7, 7, 1)'), 2);
  assert.deepEqual(set, [['box-shadow', 'rgba(7, 7, 7, 1) 0px 0px 4px', 'important'], ['color', 'rgba(7, 7, 7, 1)', 'important']]);
});

test('capture background is the first opaque ancestor background, else white, never transparent', () => {
  const doc = { defaultView: { getComputedStyle: (node) => ({ getPropertyValue: () => node.bg }) } };
  const node = (bg, parentElement = null) => ({ nodeType: 1, bg, parentElement, ownerDocument: doc });
  const body = node('rgba(20, 18, 32, 1)');
  const card = node('rgba(255, 255, 255, 0.4)', node('transparent', body));
  assert.equal(ctx._cdOpaqueBackground(card, stubRgba), 'rgb(20, 18, 32)');
  assert.equal(ctx._cdOpaqueBackground(node('transparent'), stubRgba), '#ffffff');
  assert.doesNotMatch(source, /backgroundColor:\s*null/);

  // content-visibility:auto 인 복제 하위만 visible 로 풀어 대상이 잘리지 않게 한다(hidden 은 그대로).
  const cv = [];
  const cvEl = (value) => ({ value, style: { setProperty: (...args) => cv.push([value, ...args]) } });
  const cvRoot = cvEl('auto');
  cvRoot.ownerDocument = { defaultView: { getComputedStyle: (n) => ({ getPropertyValue: () => n.value }) } };
  cvRoot.querySelectorAll = () => [cvEl('visible'), cvEl('hidden'), cvEl('auto')];
  assert.equal(ctx._cdRevealSkippedContent(cvRoot), 2);
  assert.deepEqual(cv, [['auto', 'content-visibility', 'visible', 'important'], ['auto', 'content-visibility', 'visible', 'important']]);

  // 닫힌 <details> 는 summary 만 남기고 나머지 자식을 숨긴다(html2canvas 가 닫힌 내용을 겹쳐 그리던 문제).
  const hid = [];
  const kid = (tagName, next = null) => ({ tagName, nextElementSibling: next, style: { setProperty: (...args) => hid.push([tagName, ...args]) } });
  const details = { firstElementChild: kid('SUMMARY', kid('DIV', kid('P'))) };
  assert.equal(ctx._cdHideClosedDetails({ querySelectorAll: (sel) => { assert.equal(sel, 'details:not([open])'); return [details]; } }), 2);
  assert.deepEqual(hid, [['DIV', 'display', 'none', 'important'], ['P', 'display', 'none', 'important']]);
  assert.equal((source.match(/h2c\((?:target|element), _cdH2cOptions\(/g) || []).length, 2);
});
