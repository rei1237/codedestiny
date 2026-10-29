import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderConsultationMethodGuide} from '../../lib/brand/consultation-methods.mjs';
import {localizeNativeHomeHtml} from '../../lib/i18n/native-home-html.mjs';
const copy = JSON.parse(readFileSync(new URL('../../lib/i18n/native-home-copy.json', import.meta.url)));

test('native entry tutorial translates all prose and accessible descriptions in eleven languages', () => {
  const source = renderConsultationMethodGuide('guide', 'entry');
  const original = new JSDOM(source).window.document;
  for (const locale of Object.keys(copy['처음 오셨다면, 이렇게 시작해요'])) {
    const doc = new JSDOM(localizeNativeHomeHtml(source, locale, copy)).window.document;
    assert.equal(/[가-힣]/.test(doc.body.textContent.replaceAll('꿀꿀 운세', '')), false, locale);
    assert.equal(doc.querySelector('aside').getAttribute('aria-label'), copy['이용 안내'][locale]);
    assert.deepEqual([...doc.querySelectorAll('[href]')].map(a => a.getAttribute('href')), [...original.querySelectorAll('[href]')].map(a => a.getAttribute('href')));
    assert.deepEqual([...doc.querySelectorAll('[id]')].map(a => a.id), [...original.querySelectorAll('[id]')].map(a => a.id));
    assert.equal(doc.querySelectorAll('article').length, 2);
    assert.equal(doc.querySelectorAll('ol li').length, 3);
  }
  assert.equal(localizeNativeHomeHtml(source, 'ko', copy), source);
});

test('translations are escaped and never alter destination attributes', () => {
  const html = localizeNativeHomeHtml('<a href="원문" title="원문">원문</a>', 'en', {'원문': {en: '<img src=x onerror=alert(1)>'}});
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelector('a').getAttribute('href'), '원문');
  assert.equal(doc.querySelector('img'), null);
  assert.equal(doc.querySelector('a').textContent, '<img src=x onerror=alert(1)>');
});
