import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../../js/cd-lang-native.js', import.meta.url), 'utf8');
const selectors = '#cdHomeFunnel, #cdMobileBottomNav, .cd-footer-legal';
const korean = value => /[가-힣]/.test(String(value).replace(/꿀꿀\s?운세/g, ''));

for (const locale of ['en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) test(`home ${locale}: native translation covers collapsed guides and accessible names without removing actions`, async () => {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  // JSDOM does not parse all production CSS; script failures still fail the test.
  virtualConsole.on('jsdomError', error => { if (error.message !== 'Could not parse CSS stylesheet') errors.push(error.message); });
  const dom = new JSDOM(html, { url: `https://example.invalid/?lang=${locale}`, runScripts: 'outside-only', virtualConsole });
  const win = dom.window;
  const controls = () => Array.from(win.document.querySelectorAll(selectors.split(',').map(s => s.trim() + ' a[href], ' + s.trim() + ' button').join(', '))).map(el => [el.tagName, el.hasAttribute('data-cd-localized-route') ? el.getAttribute('href')?.replace(/^\/(en|ja|zh|zh-tw)\//, '/').replace(/\?lang=(vi|hi|es|fr|de|nl|ms)$/, '') : el.getAttribute('href'), el.getAttribute('data-action')]);
  const before = controls();
  const benefits = () => win.document.querySelector('[data-pass-benefits="honey"]').textContent.replace(/\s+/g, ' ').trim();
  const originalBenefits = benefits();
  win.fetch = async input => {
    const path = new URL(input, 'https://example.invalid').pathname;
    assert.match(path, /^\/i18n\/[a-z-]+(?:\/[A-Za-z0-9_-]+)?\.json$/);
    return { ok: true, json: async () => JSON.parse(readFileSync(new URL('../../public' + path, import.meta.url), 'utf8')) };
  };
  try {
    win.eval(runtime);
    await win.cdApplyNativeTranslations(locale);
    await new Promise(resolve => win.setTimeout(resolve, 150));
    const leftovers = [];
    for (const root of win.document.querySelectorAll(selectors)) for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('script,style,svg,template')) continue;
      for (const child of el.childNodes) if (child.nodeType === 3 && korean(child.textContent)) leftovers.push(child.textContent.trim());
      for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) if (korean(el.getAttribute(attr))) leftovers.push(attr + ': ' + el.getAttribute(attr));
    }
    assert.deepEqual(leftovers, []);
    const expectedRoute = ['en', 'ja', 'zh-CN', 'zh-TW'].includes(locale) ? '/' + ({'zh-CN':'zh','zh-TW':'zh-tw'}[locale] || locale) + '/yeongnyangi/' : '/yeongnyangi/?lang=' + locale;
    assert.equal(win.document.querySelector('[data-cd-localized-route="yeongnyangi"]').getAttribute('href'), expectedRoute);
    assert.deepEqual(controls(), before);
    assert.equal(win.document.querySelectorAll('#cdHoneyUnlockSheet [data-honey-confirm]').length, 1);
    const amount = win.document.querySelector('.cdh-neo-letter__price [data-cd-vars]').dataset.cdVars;
    assert.ok(win.document.querySelector('.cdh-neo-letter__price').textContent.includes(JSON.parse(amount).amount));
    await win.cdApplyNativeTranslations('ko');
    assert.equal(benefits(), originalBenefits, 'language switching preserves the original pass copy and registry amounts');
    assert.match(win.document.querySelector('#cdHoneySheetTitle').textContent, /꿀방울/);
    assert.deepEqual(controls(), before);
    assert.deepEqual(errors, []);
  } finally { win.close(); }
});
