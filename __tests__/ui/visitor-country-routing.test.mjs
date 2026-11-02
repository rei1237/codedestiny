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
const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN'];
const AGENTS = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  yeti: 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
};
const asset = { ASSETS: { fetch: async () => new Response('<html>content</html>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' } }) } };
function edge(fetchImpl = () => { throw Error('Unexpected network'); }) {
  return runInNewContext(source.replace('export default {', 'globalThis.worker = {') + '\nworker;', { URL, Request, Response, Headers, console, fetch: fetchImpl });
}
function visit(path, country, { headers = {}, method = 'GET', body } = {}) {
  const request = new Request('https://code-destiny.test' + path, { method, headers: { Accept: 'text/html', ...headers }, body });
  if (country !== undefined) Object.defineProperty(request, 'cf', { value: { country } });
  return request;
}


const PATHS = ['/', '/?utm_source=test', '/saju/', '/en/', '/zh-tw/sukuyo/', '/contact/', '/?lang=en', '/?question=money', '/?paymentId=x&code=y'];
const snapshot = async response => [response.status, response.headers.get('Location'), await response.text(), response.headers.get('Cache-Control')];
const withoutCountry = (cookie, country) => String(cookie).replace('cd_geo_country=' + country, 'cd_geo_country=<country>');

test('same URL gives the same status, Location, body and Cache-Control for every country and agent', async () => {
  for (const path of PATHS) {
    let expected;
    let expectedCookie;
    for (const country of COUNTRIES) for (const [agent, userAgent] of Object.entries(AGENTS)) {
      const response = await edge().fetch(visit(path, country, { headers: { 'User-Agent': userAgent } }), asset);
      const label = path + ' ' + country + ' ' + agent;
      const cookie = response.headers.get('Set-Cookie');
      assert.doesNotMatch(String(cookie), /cd_geo_locale/, label);
      if (response.status === 200) assert.match(cookie, new RegExp('cd_geo_country=' + country + '(;|$)'), label);
      const current = await snapshot(response);
      expected ??= current;
      expectedCookie ??= withoutCountry(cookie, country);
      assert.deepEqual(current, expected, label);
      assert.equal(withoutCountry(cookie, country), expectedCookie, label);
    }
  }
});

test('overseas visitors get 200 on / and entry paths with no redirect', async () => {
  for (const country of ['US', 'JP', 'TW']) for (const path of ['/', '/saju/', '/today/', '/contact/', '/ggulggul/']) {
    const response = await edge().fetch(visit(path, country), asset);
    assert.equal(response.status, 200, country + path);
    assert.equal(response.headers.get('Location'), null, country + path);
  }
});

test('the URL decides the language: ?lang= and explicit cookie still redirect, privately', async () => {
  const worker = edge();
  for (const [path, headers, expected] of [
    ['/?lang=en', {}, '/en/?lang=en'],
    ['/saju/?lang=zh-Hant', {}, '/zh-tw/saju/?lang=zh-Hant'],
    ['/saju/', { Cookie: 'cd_locale=en; cd_locale_explicit=1' }, '/en/saju/'],
  ]) {
    const response = await worker.fetch(visit(path, 'US', { headers }), asset);
    assert.equal(response.status, 302, path);
    assert.equal(response.headers.get('Location'), 'https://code-destiny.test' + expected);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
  const ko = await worker.fetch(visit('/ggulggul/', 'US', { headers: { Cookie: 'cd_locale=ko; cd_locale_explicit=1' } }), asset);
  assert.equal(ko.status, 200);
});

test('explicit languages, query bytes, payment returns and crawler discovery remain stable', async () => {
  const worker = edge();
  for (const [path, headers, expected] of [
    ['/ggulggul/?lang=ko', {}, null],
    ['/en/', {}, null], ['/ja/', {}, null],
    ['/ggulggul/', { Cookie: 'cd_locale=ko; cd_locale_explicit=1' }, null],
    ['/?question=money&ref=a%2Bb', {}, '/yeongnyangi/?question=money&ref=a%2Bb'],
    ['/?paymentId=existing&code=success&value=a%2Bb', {}, '/ggulggul/?paymentId=existing&code=success&value=a%2Bb'],
    ['/?lang=en', {}, '/en/?lang=en'],
  ]) {
    const response = await worker.fetch(visit(path, 'JP', { headers }), asset);
    assert.equal(response.headers.get('Location'), expected && 'https://code-destiny.test' + expected);
  }
});

async function htmlCacheControl(assetCacheControl) {
  const headers = { 'Content-Type': 'text/html' };
  if (assetCacheControl !== null) headers['Cache-Control'] = assetCacheControl;
  const env = { ASSETS: { fetch: async () => new Response('<html>content</html>', { headers }) } };
  return (await edge().fetch(visit('/saju/', 'JP'), env)).headers.get('Cache-Control');
}

test('HTML keeps the asset cache directives under private', async () => {
  assert.equal(await htmlCacheControl('no-cache'), 'private, no-cache');
  assert.equal(await htmlCacheControl('public, max-age=3600, s-maxage=60'), 'private, max-age=3600');
  assert.equal(await htmlCacheControl(null), 'private, no-cache');
});

test('keeps no-store on private HTML', async () => {
  assert.equal(await htmlCacheControl('no-store'), 'private, no-store');
});

test('a conditional 304 passes through without a body or geo cookie', async () => {
  const env = { ASSETS: { fetch: async request => request.headers.get('If-None-Match')
    ? new Response(null, { status: 304, headers: { ETag: '"a"' } })
    : new Response('<html>content</html>', { headers: { 'Content-Type': 'text/html' } }) } };
  const response = await edge().fetch(visit('/saju/', 'JP', { headers: { 'If-None-Match': '"a"' } }), env);
  assert.equal(response.status, 304);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('ETag'), '"a"');
});

test('non-HTML assets get no geo cookie', async () => {
  assert.ok(routes.include.includes('/*'));
  assert.ok(routes.exclude.includes('/_next/*'));
  const image = await edge().fetch(visit('/logo.png', 'JP'), asset);
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

test('static and React language detection follow the URL and saved language, never a stale geo cookie', async () => {
  for (const [path, stored, cookie, expected] of [
    ['/checkout/', {}, 'cd_geo_locale=ja', 'ko'],
    ['/checkout/', {cd_lang:'ko',cd_locale_ack:'1'}, 'cd_geo_locale=ja', 'ko'],
    ['/checkout/', {cd_lang:'en',cd_locale_ack:'1'}, 'cd_geo_locale=ja', 'en'],
    ['/zh-tw/', {cd_lang:'ko'}, 'cd_geo_locale=ja', 'zh-TW'],
    ['/checkout/?lang=en', {cd_lang:'ko'}, 'cd_geo_locale=ja', 'en'],
    ['/ggulggul/', {}, '', 'ko'],
  ]) {
    const dom = new JSDOM('<html><body></body></html>', {url:'https://code-destiny.test'+path,runScripts:'outside-only'});
    for (const [key,value] of Object.entries(stored)) dom.window.localStorage.setItem(key,value);
    if (cookie) dom.window.document.cookie=cookie+'; Path=/';
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

// Pages-like asset fixture: slashless directory URLs answer with a relative 308 that carries the request search.
function pagesAssets() {
  const heads = [];
  const html = () => new Response('<html>content</html>', { headers: { 'Content-Type': 'text/html' } });
  const ASSETS = { fetch: async request => {
    const u = new URL(request.url);
    if (request.method === 'HEAD') heads.push(u.pathname + u.search);
    if (['/saju', '/fortune/tomorrow/pig', '/ggulggul'].includes(u.pathname)) return new Response(null, { status: 308, headers: { Location: u.pathname + '/' + u.search } });
    if (['/saju/', '/ggulggul/', '/fortune/tomorrow/pig/', '/'].includes(u.pathname)) return html();
    if (u.pathname === '/moved') return new Response(null, { status: 301, headers: { Location: '/new/' } });
    if (u.pathname === '/temp') return new Response(null, { status: 302, headers: { Location: '/elsewhere/' } });
    return new Response('missing', { status: 404 });
  } };
  return { env: { ASSETS }, heads };
}
const BASE = 'https://code-destiny.test';

test('one absolute 301 for slashless, version and double-slash URLs', async () => {
  const worker = edge();
  for (const [path, expected] of [
    ['/fortune/tomorrow/pig', '/fortune/tomorrow/pig/'],
    ['/saju?utm_source=a', '/saju/?utm_source=a'],
    ['/saju/?v=1', '/saju/'],
    ['/saju?v=1&utm_source=a', '/saju/?utm_source=a'],
    ['//ggulggul/', '/ggulggul/'],
    ['//ggulggul?x=1', '/ggulggul/?x=1'],
  ]) for (const method of ['GET', 'HEAD']) for (const country of COUNTRIES) for (const [agent, userAgent] of Object.entries(AGENTS)) {
    const { env } = pagesAssets();
    const label = method + ' ' + path + ' ' + country + ' ' + agent;
    const response = await worker.fetch(visit(path, country, { method, headers: { 'User-Agent': userAgent } }), env);
    assert.equal(response.status, 301, label);
    assert.equal(response.headers.get('Location'), BASE + expected, label);
    assert.equal(response.headers.get('Cache-Control'), 'no-store', label);
    assert.equal(response.headers.get('Set-Cookie'), null, label);
    const next = await worker.fetch(visit(response.headers.get('Location').slice(BASE.length), country, { method, headers: { 'User-Agent': userAgent } }), env);
    assert.equal(next.status, 200, label + ' second hop');
  }
});

test('version removal asks ASSETS at most once', async () => {
  const versioned = pagesAssets();
  await edge().fetch(visit('/saju?v=1', 'KR'), versioned.env);
  assert.deepEqual(versioned.heads, ['/saju']);
  const clean = pagesAssets();
  await edge().fetch(visit('/saju/', 'KR'), clean.env);
  assert.deepEqual(clean.heads, []);
});

test('a failing HEAD still redirects to the cleaned URL', async () => {
  const env = { ASSETS: { fetch: async request => { if (request.method === 'HEAD') throw new Error('boom'); return new Response('x'); } } };
  const response = await edge().fetch(visit('/saju?v=1', 'KR'), env);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), BASE + '/saju');
});

test('//evil.com/x stays on this host', async () => {
  const response = await edge().fetch(visit('//evil.com/x', 'KR'), pagesAssets().env);
  assert.equal(response.status, 301);
  const location = new URL(response.headers.get('Location'));
  assert.equal(location.host, 'code-destiny.test');
  assert.equal(location.pathname, '/evil.com/x');
});

test('signed queries keep their full URL', async () => {
  const response = await edge().fetch(visit('/saju/?v=1&sig=a%2Bb', 'KR'), pagesAssets().env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Location'), null);
});

test('asset redirects become absolute 301 and keep the query', async () => {
  const { env } = pagesAssets();
  const moved = await edge().fetch(visit('/moved?a=1', 'KR'), env);
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('Location'), BASE + '/new/?a=1');
  assert.equal(moved.headers.get('Cache-Control'), 'no-store');
  const temp = await edge().fetch(visit('/temp', 'KR'), env);
  assert.equal(temp.status, 302);
  assert.equal(temp.headers.get('Location'), '/elsewhere/');
});

test('POST and API paths are not normalized', async () => {
  const { env } = pagesAssets();
  const post = await edge().fetch(visit('/saju', 'KR', { method: 'POST', body: '{}' }), env);
  assert.equal(post.status, 308);
  assert.equal(post.headers.get('Location'), '/saju/');
  const seen = [];
  const forwarded = await edge().fetch(visit('//x', 'KR', { method: 'POST', body: '{}' }), { ASSETS: { fetch: async request => { seen.push(new URL(request.url).pathname); return new Response('ok'); } } });
  assert.equal(forwarded.status, 200);
  assert.deepEqual(seen, ['//x']);
  const upstream = [];
  const api = await edge(async input => { upstream.push(String(input.url || input)); return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } }); }).fetch(visit('/api//x', 'KR'), env);
  assert.notEqual(api.status, 301);
  assert.equal(upstream.length, 1);
});
