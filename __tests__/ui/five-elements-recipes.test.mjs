import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { RECIPES, recipePath, recipeImage, recipeJsonLd } from '../../lib/lifestyle/recipes.mjs';

test('five flavour recipes have distinct stable URLs and real local assets', () => {
  assert.equal(new Set(RECIPES.map(recipePath)).size, 5);
  assert.deepEqual(RECIPES.map((r) => r.taste), ['신맛', '쓴맛', '단맛', '매운맛', '짠맛']);
  for (const recipe of RECIPES) {
    assert.match(recipePath(recipe), /^\/recipes\/[a-z-]+\/$/);
    assert.ok(existsSync(`public${recipeImage(recipe)}`));
  }
});

test('recipe schema describes the rendered ingredients and steps without fabricated reviews', () => {
  for (const recipe of RECIPES) {
    const schema = recipeJsonLd(recipe, 'https://code-destiny.com');
    assert.equal(schema.totalTime, `PT${recipe.prep + recipe.cook}M`);
    assert.deepEqual(schema.recipeIngredient, recipe.ingredients);
    assert.deepEqual(schema.recipeInstructions.map((s) => s.text), recipe.steps.map((s) => s[1]));
    assert.equal(schema.aggregateRating, undefined);
    assert.equal(schema.nutrition, undefined);
    assert.equal(schema.review, undefined);
    assert.equal(schema.recipeYield, '2');
    assert.ok(schema.recipeInstructions.every((s, i) => s.url.endsWith(`#step-${i + 1}`)));
  }
});

test('lifestyle routes are discoverable and own their page navigation', () => {
  const sitemap = readFileSync('sitemap-ko.xml', 'utf8');
  for (const route of ['/recipes/', '/crystals/', ...RECIPES.map(recipePath)]) assert.ok(sitemap.includes(`<loc>https://code-destiny.com${route}</loc>`), route);
  const hub = readFileSync('app/insights/page.js', 'utf8');
  assert.ok(hub.includes('href: "/recipes/"') && hub.includes('href: "/crystals/"'));
  const chrome = readFileSync('app/components/AppChrome.tsx', 'utf8').split('const IMMERSIVE_FORTUNE_ROUTES = [')[1].split('];')[0];
  assert.ok(chrome.includes('"/recipes"') && chrome.includes('"/crystals"'));
});
