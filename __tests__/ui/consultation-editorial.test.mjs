import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderCraftedDetail} from '../../js/feature-detail-panels.mjs';
import {craftedMasters} from '../../scripts/lib/build-visual-details.mjs';
import {FUSION_NARRATOR_BY_KEY} from '../../lib/fusion-premium-report.js';

test('editorial editions publish the authored text and valid master identities', () => {
  let count = 0;
  for (const id of fs.readdirSync('content/product-details')) {
    const file = `content/product-details/${id}/manifest.json`;
    if (!fs.existsSync(file)) continue;
    const source = JSON.parse(fs.readFileSync(file));
    if (source.layout !== 'editorial') continue;
    count++;
    const published = JSON.parse(fs.readFileSync(`public/feature-details/crafted/${id}/manifest.json`));
    assert.deepEqual(published.panels, source.panels, id);
    assert.deepEqual(published.masters, JSON.parse(JSON.stringify(craftedMasters(source))), id);
    const dom = JSDOM.fragment(renderCraftedDetail(published, {eager:false}));
    assert.equal(dom.querySelectorAll('.craftedMaster').length, source.masters.length, id);
    for (const panel of source.panels) {
      assert.ok(dom.textContent.includes(panel.text), id);
      assert.ok(fs.existsSync('public' + panel.src), panel.src);
      assert.ok(!panel.src.includes('/crafted/'), 'old text-baked panels must not return');
    }
    assert.ok(!dom.querySelector('.craftedDetailTranscript'), 'text must not require disclosure');
    assert.ok(dom.textContent.includes('편집 예시'));
    assert.equal(dom.querySelector('header img').getAttribute('loading'), 'lazy');
  }
  assert.equal(count, 21);
  const fusion = JSON.parse(fs.readFileSync('content/product-details/fusion-fortune/manifest.json'));
  assert.deepEqual(new Set(fusion.masters), new Set(Object.values(FUSION_NARRATOR_BY_KEY)));
});

test('editorial HTML escapes copy and never renders unsafe artwork', () => {
  const fragment = JSDOM.fragment(renderCraftedDetail({layout:'editorial',notice:'<script>x</script>',panels:[
    {src:'javascript:alert(1)',title:'bad',text:'bad'},
    {src:'/safe.webp',title:'<b>title</b>',text:'<img onerror=bad>'},
  ]}));
  assert.equal(fragment.querySelector('script'), null);
  assert.equal(fragment.querySelector('h3 b'), null);
  assert.equal(fragment.querySelectorAll('img').length, 1);
  assert.ok(fragment.textContent.includes('<img onerror=bad>'));
});
