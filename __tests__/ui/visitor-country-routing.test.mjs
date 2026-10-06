import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const source = readFileSync('public/_worker.js', 'utf8');
const dictionary = readFileSync('lib/i18n/dictionary.ts', 'utf8');
const normalizer = readFileSync('lib/i18n/locale-normalize.js', 'utf8').replaceAll('export ', '');
const native = readFileSync('js/cd-lang-native.js', 'utf8');
const routes = JSON.parse(readFileSync('public/_routes.json', 'utf8'));
const asset = { ASSETS: { fetch: async () => new Response('<html>content</html>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' } }) } };
function edge(fetchImpl = () => { throw Error('Unexpected network'); }) {
  return runInNewContext(source.replace('export default {', 'globalThis.worker = {') + '\nworker;', { URL, Response, Headers, console, fetch: fetchImpl });
}
function visit(path, country, { headers = {}, method = 'GET', body } = {}) {
  const request = new Request('https://code-destiny.test' + path, { method, headers: { Accept: 'text/html', ...headers }, body });
  if (country !== undefined) Object.defineProperty(request, 'cf', { value: { country } });
  return request;
}

test('fresh country arrivals select a supported language, never browser Korean; assets bypass the Worker', async () => {
  assert.ok(routes.include.includes('/*'));
  assert.ok(routes.exclude.includes('/_next/*'));
  for (const [country, lang, path] of [['KR','ko','ggulggul'],['JP','ja','ja'],['CN','zh-CN','zh'],['TW','zh-TW','zh-tw'],['HK','zh-TW','zh-tw'],['MO','zh-TW','zh-tw'],['US','en','en'],['GB','en','en'],['BR','en','en'],['TH','en','en'],['XX','en','en'],[undefined,'en','en']]) {
    const response = await edge().fetch(visit('/?utm_source=test', country, { headers: { 'Accept-Language': 'ko-KR', Cookie: 'cd_locale=ko; cd_locale_ack=1' } }), asset);
    assert.equal(response.status, 302, country);
    assert.equal(response.headers.get('Location'), `https://code-destiny.test/${path}/?utm_source=test`);
    assert.match(response.headers.get('Set-Cookie'), new RegExp(`cd_geo_locale=${encodeURIComponent(lang)}`));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('country locale reaches deep HTML visits and uses all supported runtime languages', async () => {
  for (const [country, locale] of [['FR','fr'],['DE','de'],['NL','nl'],['VN','vi'],['IN','hi'],['MY','ms'],['ES','es']]) {
    const response = await edge().fetch(visit('/checkout/?product=existing', country), asset);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Set-Cookie'), new RegExp(`cd_geo_locale=${locale}`));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('all automatically selected public destinations are real indexable translated URLs', async () => {
  const sitemap = readFileSync('sitemap.xml', 'utf8');
  for (const country of ['JP','CN','TW','US']) for (const path of ['/today/','/saju/','/vedic/','/tarot/','/terms/','/privacy/','/saju/compatibility/','/contact/']) {
    const response = await edge().fetch(visit(path,country),asset);
    const destination = response.headers.get('Location');
    if (destination) assert.ok(sitemap.includes('https://code-destiny.com'+new URL(destination).pathname), destination);
  }
});

test('explicit languages, query bytes, payment returns and crawler discovery remain stable', async () => {
  const worker = edge();
  for (const [path, headers, expected] of [
    ['/ggulggul/?lang=ko', {}, null],
    ['/en/', {}, null], ['/ja/', {}, null],
    ['/ggulggul/', { Cookie: 'cd_locale=ko; cd_locale_explicit=1' }, null],
    ['/?question=money&ref=a%2Bb', {}, '/ja/yeongnyangi/?question=money&ref=a%2Bb'],
    ['/?paymentId=existing&code=success&value=a%2Bb', {}, '/ja/?paymentId=existing&code=success&value=a%2Bb'],
    ['/?lang=en', {}, '/en/?lang=en'],
  ]) {
    const response = await worker.fetch(visit(path, 'JP', { headers }), asset);
    assert.equal(response.headers.get('Location'), expected && 'https://code-destiny.test' + expected);
  }
  const bot = await worker.fetch(visit('/', 'US', { headers: { 'User-Agent': 'Googlebot' } }), asset);
  assert.equal(bot.status, 301);
  assert.equal(bot.headers.get('Location'), 'https://code-destiny.test/ggulggul/');
  assert.equal(bot.headers.get('Set-Cookie'), null);
  const image = await worker.fetch(visit('/logo.png', 'JP'), asset);
  assert.equal(image.headers.get('Set-Cookie'), null);
});

test('overseas order APIs reject domestic methods before any upstream call, including passes and packs', async () => {
  for (const path of ['/api/payments/orders','/api/payments/prepare','/api/billing/checkout','/api/payments/subscription/prepare','/api/payments/service-packs/prepare']) {
    for (const method of ['card_general','kakaopay','bank_transfer','gift_culture']) {
      const request = visit(path, 'JP', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-IPCountry': 'KR' }, body: JSON.stringify({ paymentMethod: method, country: 'KR', lang: 'ko' }) });
      const response = await edge().fetch(request, asset);
      assert.equal(response.status, 403, path + method);
      assert.equal((await response.json()).code, 'PAYPAL_REQUIRED_FOR_REGION');
    }
  }
});

test('PayPal purchases, existing entitlement use, confirmation and KR purchases keep working', async () => {
  let calls = 0;
  const worker = edge(async () => { calls++; return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } }); });
  for (const [path, country, paymentMethod] of [
    ['/api/payments/prepare','JP','paypal'], ['/api/payments/subscription/prepare','CN','paypal'],
    ['/api/payments/service-packs/prepare','US','paypal'], ['/api/payments/prepare','KR','card_general'],
    ['/api/payments/orders/old/confirm','JP','card_general'], ['/api/payments/moonstone/spend','JP','monthly'],
    ['/api/payments/service-packs/consume','JP','pass'],
  ]) assert.equal((await worker.fetch(visit(path,country,{method:'POST',body:JSON.stringify({paymentMethod})}),asset)).status,200);
  assert.equal(calls, 7);
});

test('public payment config gets the visitor edge country and cannot be shared across countries', async () => {
  const worker = edge(async () => new Response('{"ok":true,"paypalChannelKey":"fixture","paymentRegion":{"country":"US","paypalOnly":true}}', { headers: { 'Content-Type':'application/json', 'Cache-Control':'public' } }));
  for (const country of ['KR','JP','CN','US']) {
    const response = await worker.fetch(visit('/api/payments/config',country),asset);
    assert.deepEqual((await response.json()).paymentRegion,{country,paypalOnly:country!=='KR'});
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  }
});

test('static and React language detection honor country over old automatic Korean without overriding explicit choices', async () => {
  for (const [path, stored, cookie, expected] of [
    ['/checkout/', {cd_lang:'ko',cd_locale_ack:'1'}, 'cd_geo_locale=ja', 'ja'],
    ['/checkout/', {cd_lang:'ko',cd_lang_explicit:'1',cd_locale_ack:'1'}, 'cd_geo_locale=ja', 'ko'],
    ['/zh-tw/', {cd_lang:'ko'}, 'cd_geo_locale=ja', 'zh-TW'],
    ['/checkout/?lang=en', {cd_lang:'ko'}, 'cd_geo_locale=ja', 'en'],
    ['/ggulggul/', {}, 'cd_geo_locale=en', 'en'],
  ]) {
    const dom = new JSDOM('<html><body></body></html>', {url:'https://code-destiny.test'+path,runScripts:'outside-only'});
    for (const [key,value] of Object.entries(stored)) dom.window.localStorage.setItem(key,value);
    dom.window.document.cookie=cookie+'; Path=/';
    const detect = dictionary.slice(dictionary.indexOf('export function detectLocale'));
    const code = ts.transpileModule(normalizer+'\n'+detect.replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    dom.window.eval(code);
    assert.equal(dom.window.detectLocale(),expected,'React '+path);
    dom.window.fetch=async()=>({ok:true,json:async()=>({})});
    dom.window.eval(native);
    assert.equal(dom.window.cdGetCurrentLanguage(),expected,'static '+path);
    dom.window.close();
  }
});

test('missing static locale editions fall back to an existing English page', async () => {
  for (const country of ['TW','HK','MO','FR','DE','VN']) {
    const response = await edge().fetch(visit('/contact/',country),asset);
    assert.equal(response.status,302);
    assert.equal(response.headers.get('Location'),'https://code-destiny.test/en/contact/');
  }
});
