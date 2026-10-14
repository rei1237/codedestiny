import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAssetCacheKeys} from '../../scripts/lib/asset-cache-keys.mjs';

test('home result samples use their content hash under immutable CSS caching', () => {
  const key=createAssetCacheKeys(process.cwd()).resolve('/styles/result-samples.css','index.html').key;
  assert.ok(key);
  for(const file of ['index.html','public/ggulggul/index.html','public/en/index.html']) {
    const html=readFileSync(file,'utf8');
    assert.ok(html.includes(`/styles/result-samples.css?v=${key}`),file);
    assert.ok(!html.includes('href="/styles/result-samples.css"'),file);
  }
});
