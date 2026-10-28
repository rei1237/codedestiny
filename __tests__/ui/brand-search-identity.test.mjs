import test from 'node:test';
import { brandCopy } from '../../lib/seo/brand-copy.mjs';
import { serpTitleWidth } from '../../lib/fortune/seo-title.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUSINESS_IDENTITY } from '../../lib/site-policy-config.js';
import { BRAND_FACTS, findFormerBrandNames } from '../../lib/brand/brand-facts.mjs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const SERVICE = BRAND_FACTS.service.name;

// 2026-10-15: WebSite 는 서비스(꿀꿀 운세), Organization 은 운영자(CODE DESTINY)로 나눈다.
test('public home schemas distinguish the service from the operator', () => {
  for (const file of ['index.html', 'public/ggulggul/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/zh/index.html', 'public/zh-tw/index.html']) {
    const nodes = [...read(file).matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap(match => { const data = JSON.parse(match[1]); return data['@graph'] || [data]; });
    const site = nodes.filter(item => item['@type'] === 'WebSite');
    const org = nodes.filter(item => item['@type'] === 'Organization');
    assert.equal(site.length, 1, `${file}: WebSite count`);
    assert.equal(org.length, 1, `${file}: Organization count`);
    assert.equal(site[0].name, SERVICE, file);
    assert.deepEqual(site[0].alternateName, [...BRAND_FACTS.service.alternateNames], file);
    assert.equal(org[0].name, BRAND_FACTS.operator.name, file);
    assert.deepEqual(org[0].alternateName, [...BRAND_FACTS.operator.alternateNames], file);
    assert.equal(org[0].legalName, BUSINESS_IDENTITY.companyName, file);
    assert.deepEqual(findFormerBrandNames(JSON.stringify(nodes.map(node => [node.name, node.alternateName]))), [], file);
  }
});

test('locale title dictionaries and manifests use the official service name', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
    const dictionary = JSON.parse(read(`public/i18n/${locale}.json`));
    assert.ok(dictionary.shell.CODEDESTINY.includes(SERVICE), locale);
    assert.equal(dictionary.seo.rssTitle, `${SERVICE} RSS`, locale);
    if (dictionary.seo.homeTitle) assert.ok(dictionary.seo.homeTitle.endsWith(SERVICE), locale);
    if (dictionary.seo.description) assert.doesNotMatch(dictionary.seo.description, /Code Destiny|Honey Pig|旧名称|旧名|舊名|पूर्व/u, locale);
    assert.doesNotMatch(dictionary.shell.CODEDESTINY, /Code Destiny|CODE DESTINY/);
    assert.deepEqual(findFormerBrandNames(dictionary.shell.CODEDESTINY), [], locale);
  }
  for (const file of ['manifest.json', 'manifest-neo.json', 'public/manifest.en.json', 'public/manifest.ja.json', 'public/manifest.zh.json', 'public/manifest.zh-tw.json']) {
    const manifest = JSON.parse(read(file));
    assert.equal(manifest.name, SERVICE, file);
    assert.equal(manifest.short_name, SERVICE, file);
  }
});

test('public entry titles and descriptions fit the build search-width budget', () => {
  const keys = [...read('lib/seo/brand-copy.mjs').matchAll(/\b(\w+(?:Title|Description)):/g)].map(match => match[1]);
  assert.ok(keys.length >= 6, 'entry metadata must be discovered');
  for (const key of keys) {
    const limit = key.endsWith('Title') ? 60 : 160;
    assert.ok(serpTitleWidth(brandCopy(key)) <= limit, key);
  }
});
