import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderConsultationMethodGuide, CONSULTATION_METHOD_FAQS } from '../../lib/brand/consultation-methods.mjs';

for (const variant of ['entry', 'full']) {
  test(variant + ' keeps the intended default disclosure state and a named region', () => {
    const doc = new JSDOM(renderConsultationMethodGuide('guide', variant)).window.document;
    assert.equal(doc.querySelector('details').open, variant === 'entry');
    assert.equal(doc.querySelectorAll('a a, summary a').length, 0);
    assert.ok(doc.getElementById(doc.querySelector('section').getAttribute('aria-labelledby')));
    assert.ok(doc.querySelector('a[href="/consultation-samples/"]'));
  });
}

test('entry teaches both workflows without duplicating the primary destinations', () => {
  const doc = new JSDOM(renderConsultationMethodGuide('guide', 'entry')).window.document;
  assert.ok(doc.querySelector('summary').textContent.startsWith('처음 오셨다면, 이렇게 시작해요'));
  assert.equal(doc.querySelector('details').getAttribute('data-home-disclosure'), 'guide');
  assert.equal(doc.querySelectorAll('.consultation-choice').length, 0);
  for (const href of ['/ggulggul/', '/yeongnyangi/', '/neo-consultation/']) assert.equal(doc.querySelector(`a[href="${href}"]`), null);
  const tutorials = [...doc.querySelectorAll('.consultation-tutorial__service')];
  assert.equal(tutorials.length, 2);
  for (const tutorial of tutorials) {
    assert.ok(tutorial.querySelector('.consultation-tutorial__result').textContent.includes('받게 되는 내용'));
    assert.ok(doc.getElementById(tutorial.getAttribute('aria-labelledby')));
  }
  assert.equal(doc.querySelectorAll('.consultation-tutorial__flow ol > li').length, 3);
  assert.match(doc.querySelector('.consultation-tutorial__notes').textContent, /이용권·월정석·단건 결제/);
  assert.match(doc.querySelector('.consultation-tutorial__notes').textContent, /네오가 직접 읽고 작성·검수해 이메일/);
});

test('full guide preserves three destinations and the shared reading disclosures', () => {
  const doc = new JSDOM(renderConsultationMethodGuide('guide', 'full')).window.document;
  assert.equal(doc.querySelectorAll('.consultation-choice').length, 3);
  assert.equal(doc.querySelectorAll('.consultation-memo__notes > div').length, 3);
  for (const index of [0, 2]) assert.ok(doc.querySelector('.consultation-memo').textContent.includes(CONSULTATION_METHOD_FAQS[index].answer));
  for (const href of ['/ggulggul/', '/yeongnyangi/', '/neo-consultation/']) assert.ok(doc.querySelector(`a[href="${href}"]`));
});
