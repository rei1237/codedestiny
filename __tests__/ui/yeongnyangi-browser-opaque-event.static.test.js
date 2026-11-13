const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const source = readFileSync('scripts/lib/yeongnyangi-mobile-payment.mjs', 'utf8');

test('WebKit opaque navigation events are ignored only after complete paid delivery', () => {
  assert.match(source, /message==='\[object Event\]'/);
  assert.match(source, /f\.state\.approved && f\.row\.paid && f\.state\.activates>0/);
  assert.match(source, /f\.row\.chapters\.length===product\.chapterCount/);
  assert.match(source, /\['\/checkout\/','\/yeongnyangi\/result\/'\]\.includes\(detail\?\.page\)/);
  assert.match(source, /if\(browser\.browserType\(\)\.name\(\)!=='webkit'\)return true/);
});

test('WebKit review reads are classified only with fulfilled HTTP proof and complete paid delivery', () => {
  assert.match(source, /new Set\(\['\/api\/reviews\/products','\/api\/reviews\/eligibility'\]\)/);
  assert.match(source, /reviewBannerReads\.has\(path\)&&detail\?\.page==='\/yeongnyangi\/result\/'/);
  assert.match(source, /f\.state\.approved&&f\.row\.paid&&f\.row\.state==='COMPLETED'/);
  assert.match(source, /f\.state\.http\.some\(response=>response\.path===path&&response\.method==='GET'&&response\.status===200\)/);
});
