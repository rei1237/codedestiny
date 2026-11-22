import assert from 'node:assert/strict';
import {RECIPES} from '../../../lib/lifestyle/recipes.mjs';

export async function verifyRecipeComics(origin, context) {
  const page = await context.newPage();
  try {
    await page.goto(origin);
    await page.locator('.world-entry-ggulggul').click();
    await page.getByRole('searchbox').fill('사주 요리 웹툰');
    await page.getByRole('button', {name: /사주 요리 웹툰/}).click();
    const reader = page.locator('.recipe-mobile');
    for (const recipe of RECIPES) {
      await reader.getByRole('heading', {name:'사주 요리 웹툰'}).waitFor();
      const group = reader.locator('details').filter({has: page.getByText(recipe.element + ' · ' + recipe.taste, {exact:true})});
      if (!await group.evaluate(el => el.open)) await group.locator('summary').click();
      await group.locator('a[href="/recipes/?dish=' + encodeURIComponent(recipe.slug) + '"]').click();
      await reader.getByRole('heading', {name:recipe.name, exact:true}).waitFor();
      assert.deepEqual(await reader.locator('#ingredients li').allTextContents(), recipe.ingredients);
      const panels = reader.locator('#method ol > li');
      assert.deepEqual(await panels.locator('h3').allTextContents(), recipe.steps.map(([title])=>title));
      for (const img of await reader.locator('img').all()) await img.evaluate(el=>el.decode());
      assert.ok((await reader.innerText()).includes(recipe.rescue));
      await reader.getByRole('link', {name:'전체 요리법 보기'}).click();
    }
    console.log(JSON.stringify({guestRecipeComics:RECIPES.length, panels:RECIPES.reduce((total,r)=>total+r.steps.length,0)}));
  } finally { await page.close(); }
}
