import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderConsultationMethodGuide, CONSULTATION_METHOD_FAQS } from '../../lib/brand/consultation-methods.mjs';

for (const variant of ['entry', 'full']) {
  test(variant + ' keeps a native closed disclosure and accurate reading notes', () => {
    const doc = new JSDOM(renderConsultationMethodGuide('guide', variant)).window.document;
    assert.equal(doc.querySelector('details').open, false);
    assert.equal(doc.querySelectorAll('.consultation-choice').length, variant === 'entry' ? 2 : 3);
    assert.equal(doc.querySelectorAll('.consultation-memo').length, 1);
    assert.equal(doc.querySelectorAll('.consultation-memo__notes > div').length, 3);
    for (const index of [0, 2]) assert.ok(doc.querySelector('.consultation-memo').textContent.includes(CONSULTATION_METHOD_FAQS[index].answer));
    for (const href of ['/ggulggul/', '/yeongnyangi/', '/neo-consultation/']) assert.ok(doc.querySelector('a[href="' + href + '"]'));
    assert.equal(doc.querySelectorAll('a a, summary a').length, 0);
    assert.ok(doc.getElementById(doc.querySelector('section').getAttribute('aria-labelledby')));
    if (variant === 'entry') {
      assert.equal(doc.querySelector('summary').textContent.startsWith('어디로 가면 좋을까요?'), true);
      assert.equal(doc.querySelector('.consultation-choice a').getAttribute('href'), '/ggulggul/');
      assert.ok(doc.querySelector('.consultation-choice--night[data-yn-night]'));
    }
  });
}
