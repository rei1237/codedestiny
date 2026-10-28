const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { JSDOM } = require('jsdom');

const source = readFileSync(resolve(__dirname, '../../js/core/home-funnel.js'), 'utf8');

async function setup(hash) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <a href="/ggulggul/" data-cdh-input-return><span>홈으로 돌아가기</span></a>
    <main id="cdHomeFunnel"><a class="cdh-primary" href="#services">상담 고르기</a></main>
    <section id="dpDestinyPanel"><button id="dpDestinyFormToggle" aria-expanded="false">입력</button>
      <form id="destinyCardForm"><input value="작성 중인 이름"></form>
    </section><a href="#destinyCardForm" data-cdh-free>사주 보기</a>
  </body></html>`, { url: 'https://code-destiny.com/ggulggul/?utm_source=test' + hash, runScripts: 'outside-only' });
  const { window } = dom;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.requestAnimationFrame = () => 0;
  window.__cdOpenDestinyForm = () => {
    window.document.getElementById('dpDestinyPanel').classList.add('is-form-open');
    window.document.getElementById('dpDestinyFormToggle').setAttribute('aria-expanded', 'true');
  };
  window.eval(source);
  await new Promise(resolveReady => window.document.readyState === 'loading'
    ? window.document.addEventListener('DOMContentLoaded', resolveReady, { once: true }) : resolveReady());
  return dom;
}

for (const hash of ['', '#home', '#destinyCardForm']) {
  test(`profile return restores home repeatedly from ${hash || 'no hash'}`, async () => {
    const dom = await setup(hash);
    const { window } = dom;
    try {
      const doc = window.document;
      for (let repeat = 0; repeat < 2; repeat += 1) {
        doc.querySelector('[data-cdh-free]').click();
        await Promise.resolve();
        assert.ok(doc.documentElement.classList.contains('cdh-input-open'));
        doc.querySelector('[data-cdh-input-return]').focus();
        doc.querySelector('[data-cdh-input-return] span').click();
        await Promise.resolve();
        assert.equal(doc.documentElement.classList.contains('cdh-input-open'), false);
        assert.equal(doc.getElementById('dpDestinyPanel').classList.contains('is-form-open'), false);
        assert.equal(doc.getElementById('dpDestinyFormToggle').getAttribute('aria-expanded'), 'false');
        assert.equal(doc.getElementById('cdHomeFunnel').hidden, false);
        assert.equal(window.location.hash, '');
        assert.equal(window.location.search, '?utm_source=test');
        assert.equal(doc.activeElement, doc.querySelector('.cdh-primary'));
        assert.equal(doc.querySelector('input').value, '작성 중인 이름');
      }
    } finally { window.close(); }
  });
}
