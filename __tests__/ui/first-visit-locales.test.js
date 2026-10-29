const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { renderGuide } = require('../fixtures/first-visit-render.cjs');
for (const locale of ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']) {
  test(`${locale}: actual guide renders every scene and profile state in its selected language`, () => {
    for (const scene of [0,1,2]) for (const selected of [false,true]) {
      const dom = new JSDOM(renderGuide(locale, {scene,selected}));
      const doc = dom.window.document;
      assert.equal(doc.querySelector('[data-profile-locale]').getAttribute('data-profile-locale'), locale);
      assert.equal(doc.querySelectorAll('nav button').length, 3);
      assert.ok(doc.querySelector('.speech p').textContent.length > 30);
      assert.ok(doc.querySelector('a[href="#questions"]'));
      assert.ok(doc.querySelector('a[href="/yeongnyangi/room/#daily"]'));
      if (locale !== 'ko') assert.doesNotMatch(doc.body.textContent, /[가-힣]|Translation pending/);
      dom.window.close();
    }
    const dom = new JSDOM(renderGuide(locale, {active:false}));
    assert.ok(dom.window.document.querySelector('button.primary'));
    dom.window.close();
  });
}
