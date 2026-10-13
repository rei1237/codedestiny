import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUSINESS_IDENTITY } from '../../lib/site-policy-config.js';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('public home schemas distinguish the brand from the registered operator', () => {
  for (const file of ['index.html', 'public/ggulggul/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/zh/index.html', 'public/zh-tw/index.html']) {
    const nodes = [...read(file).matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap(match => { const data = JSON.parse(match[1]); return data['@graph'] || [data]; });
    for (const type of ['WebSite', 'Organization']) {
      const node = nodes.find(item => item['@type'] === type);
      assert.ok(node, `${file}: ${type} missing`);
      assert.equal(node.name, '꿀꿀 운세', `${file}: ${type}`);
      assert.deepEqual(node.alternateName, ['꿀꿀운세'], `${file}: obsolete brand aliases`);
      if (type === 'Organization') assert.equal(node.legalName, BUSINESS_IDENTITY.companyName);
    }
  }
});

test('locale title dictionaries and manifests cannot restore an obsolete public brand', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
    const dictionary = JSON.parse(read(`public/i18n/${locale}.json`));
    assert.ok(dictionary.shell.CODEDESTINY.includes('꿀꿀 운세'), locale);
    assert.equal(dictionary.seo.rssTitle, '꿀꿀 운세 RSS', locale);
    if (dictionary.seo.homeTitle) assert.ok(dictionary.seo.homeTitle.endsWith('꿀꿀 운세'), locale);
    if (dictionary.seo.description) assert.doesNotMatch(dictionary.seo.description, /Code Destiny|Honey Pig|旧名称|旧名|舊名|पूर्व/u, locale);
    assert.doesNotMatch(dictionary.shell.CODEDESTINY, /Code Destiny|CODE DESTINY|꿀꿀 사주/);
  }
  for (const file of ['manifest.json', 'public/manifest.en.json', 'public/manifest.ja.json', 'public/manifest.zh.json', 'public/manifest.zh-tw.json']) {
    const manifest = JSON.parse(read(file));
    assert.equal(manifest.name, '꿀꿀 운세', file);
    assert.equal(manifest.short_name, '꿀꿀 운세', file);
  }
});
