import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

test('mobile preview collapse leaves expanded saju chapter text readable', () => {
  const source = fs.readFileSync('js/mobile-performance-bootstrap.js', 'utf8');
  const start = source.indexOf('function setupTextCollapse()');
  const end = source.indexOf('function __canWarmupHeavyFeature()', start);
  const dom = new JSDOM('<div id="summaryArea"><div class="prem-text saju-summary-chapter__body"></div></div><div id="other" class="prem-text"></div>');
  dom.window.document.querySelectorAll('.prem-text').forEach(el => el.textContent = '확장 문단의 실제 내용입니다. '.repeat(80));
  vm.runInNewContext(source.slice(start, end) + '\nsetupTextCollapse();', { document: dom.window.document, __runChunked: (items, apply) => items.forEach(apply) });
  assert.equal(dom.window.document.querySelector('#summaryArea .prem-text').style.maxHeight, '');
  assert.equal(dom.window.document.querySelector('#summaryArea button'), null);
  assert.equal(dom.window.document.querySelector('#other').style.maxHeight, '6.2em');
  dom.window.close();
});
