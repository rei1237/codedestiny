import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { RECIPES, recipePath, recipeImage, recipeJsonLd } from '../../lib/lifestyle/recipes.mjs';

test('all existing recipes retain unique routes, images and matching comic steps', () => {
  assert.ok(RECIPES.length >= 20);
  assert.equal(new Set(RECIPES.map(recipePath)).size, RECIPES.length);
  for (const taste of ['신맛', '쓴맛', '단맛', '매운맛', '짠맛']) assert.ok(RECIPES.filter(r => r.taste === taste).length >= 4);
  for (const r of RECIPES) {
    assert.ok(existsSync(`public${recipeImage(r)}`));
    assert.equal(r.tips.length, r.steps.length);
    assert.equal(r.stages.length, r.steps.length);
    for (const stage of r.stages) assert.ok(existsSync(`public/images/five-elements/yeoni-${stage}-2d.webp`));
    const ld = recipeJsonLd(r, 'https://code-destiny.com');
    assert.deepEqual(ld.recipeIngredient, r.ingredients);
    assert.deepEqual(ld.recipeInstructions.map(s => s.text), r.steps.map(s => s[1]));
    assert.ok(ld.recipeInstructions.every((s,i) => s.url.endsWith(`#step-${i+1}`)));
    assert.equal(ld.aggregateRating, undefined);
  }
});

test('dashboard recipe entry is a direct public link without paid tile attributes', () => {
  const src = readFileSync('js/core/saju/reportDashboard.js', 'utf8');
  const entry = src.match(/<a class=\\?"rpt-recipe-entry[\s\S]*?<\/a>/)?.[0];
  assert.ok(entry);
  assert.ok(entry.includes('/recipes/'));
  assert.ok(entry.includes('무료 공개'));
  assert.doesNotMatch(entry, /data-tile-lock|data-coin-cost|data-action|checkout/);
});

test('all recipe routes are in the canonical sitemap', () => {
  const xml = readFileSync('sitemap-ko.xml','utf8');
  for (const path of ['/recipes/', ...RECIPES.map(recipePath)]) assert.ok(xml.includes(`https://code-destiny.com${path}</loc>`), path);
});
