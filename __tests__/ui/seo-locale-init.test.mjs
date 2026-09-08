import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync('js/cd-lang-native.js', 'utf8');
const locales = [['en', 'en'], ['ja', 'ja'], ['zh', 'zh-CN'], ['zh-tw', 'zh-TW']];

async function boot(path, stored = {}, cookie = '') {
  const dom = new JSDOM('<html><body><span id="langLabel"></span><h1 data-cd-trans="title" data-cd-origin-text="한국어 제목">Prerendered</h1><div id="modal" hidden><p data-cd-trans="modal">상담 안내</p></div></body></html>', {
    url: `https://code-destiny.test${path}`, runScripts: 'outside-only',
  });
  for (const [key, value] of Object.entries(stored)) dom.window.localStorage.setItem(key, value);
  for (const part of cookie.split(';').filter(Boolean)) dom.window.document.cookie = `${part.trim()}; path=/`;
  dom.window.fetch = async url => {
    assert.match(url, /^\/i18n\//, 'Only mock dictionaries may be requested');
    const lang = url.split('/')[2].replace('.json', '');
    return { ok: true, json: async () => ({ title: `${lang} title`, modal: `${lang} consultation` }) };
  };
  dom.window.eval(source);
  await new Promise(resolve => dom.window.setTimeout(resolve, 20));
  return dom;
}

for (const [path, lang] of locales) {
  test(`${path}: URL language wins on fresh, stored Korean, and cookie-only visits`, async () => {
    for (const [stored, cookie] of [[{}, ''], [{ cd_lang: 'ko', cd_lang_ack: '1', cd_lang_explicit: '1' }, ''], [{ cd_lang: 'ja', cd_lang_ack: '1' }, ''], [{}, 'cd_locale=ko; cd_locale_ack=1']]) {
      const dom = await boot(`/${path}/`, stored, cookie);
      try {
        assert.equal(dom.window.cdGetCurrentLanguage(), lang);
        assert.equal(dom.window.document.documentElement.lang, lang);
        assert.doesNotMatch(dom.window.document.querySelector('h1').textContent, /[가-힣]/);
        dom.window.document.querySelector('#modal').hidden = false;
        assert.doesNotMatch(dom.window.document.querySelector('#modal').textContent, /[가-힣]/);
      } finally { dom.window.close(); }
    }
  });
}

test('explicit query wins on entry; current-page language choice stays consistent', async () => {
  const dom = await boot('/ja/?lang=en&action=openSukuyoModal&merchantUid=mock-order#result');
  try {
    assert.equal(dom.window.cdGetCurrentLanguage(), 'en');
    const originalUrl = dom.window.location.href;
    dom.window.changeLanguage('ko');
    await new Promise(resolve => dom.window.setTimeout(resolve, 80));
    assert.equal(dom.window.cdGetCurrentLanguage(), 'ko');
    assert.equal(dom.window.document.documentElement.lang, 'ko');
    assert.equal(dom.window.document.querySelector('h1').textContent, '한국어 제목');
    assert.equal(dom.window.cdTranslate('title', {}, '한국어 제목'), '한국어 제목');
    assert.equal(dom.window.localStorage.getItem('cd_lang'), 'ko');
    assert.equal(dom.window.location.href, originalUrl, 'payment and route parameters are preserved');
  } finally { dom.window.close(); }
});

test('unprefixed home retains acknowledged preference; explicit Korean query wins', async () => {
  for (const [path, stored, expected] of [['/', {}, 'ko'], ['/', { cd_lang: 'ja', cd_lang_ack: '1' }, 'ja'], ['/?lang=ko', { cd_lang: 'ja', cd_lang_ack: '1' }, 'ko'], ['/', { cd_lang: 'ja' }, 'ko']]) {
    const dom = await boot(path, stored);
    try { assert.equal(dom.window.cdGetCurrentLanguage(), expected); }
    finally { dom.window.close(); }
  }
});
