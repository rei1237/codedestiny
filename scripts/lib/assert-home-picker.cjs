const assert = require('node:assert/strict');
module.exports = async function assertHomePicker(page, width) {
  assert.equal(await page.locator('#cdSignatureConsult').count(), 1, 'one consultation entry');
  assert.equal(await page.locator('.yh-choices,.cd-concern__cards').count(), 0, 'no duplicate concern selectors');
  assert.equal(await page.locator('[data-yh-concern]').count(), 6, 'five broad groups and all');
  const cards = page.locator('[data-picker-card]:visible');
  assert.equal(await cards.count(), 3, 'three cards initially');
  for (const group of await page.locator('[data-yh-concern]').all()) {
    await group.click();
    assert.equal(await group.getAttribute('aria-pressed'), 'true');
    assert.ok(await cards.count() > 0 && await cards.count() <= 3, 'each concern has compact results');
  }
  const more = page.locator('[data-picker-more]');
  await more.click();
  assert.ok(await cards.count() > 3, 'more exposes all retained services');
  assert.equal(await more.getAttribute('aria-expanded'), 'true');
  const ids = await page.locator('.cd-picker-main').evaluateAll(nodes => nodes.map(node=>node.dataset.cdPriceKey || node.dataset.pickerServiceId));
  assert.equal(new Set(ids).size, ids.length, 'no repeated service card');
  for (const topic of await page.locator('[data-picker-topic]:not([data-picker-topic="all"])').all()) {
    await topic.click();
    assert.equal(await topic.getAttribute('aria-pressed'), 'true');
    assert.ok(await cards.count() > 0, 'each original question category remains reachable');
  }
  await page.locator('[data-yh-concern="love"]').click();
  const selected = page.locator('[data-yh-concern="love"]');
  await selected.focus(); await selected.press('ArrowRight');
  assert.equal(await page.locator('[data-yh-concern="work"]').getAttribute('aria-pressed'), 'true', 'arrow key selects next concern');
  await page.locator('[data-yh-concern="love"]').click();
  const sizes = await page.locator('.cdh-free-card__medal').first().evaluate(n=>({frame:n.getBoundingClientRect().width,image:n.querySelector('img').getBoundingClientRect().width}));
  assert.deepEqual(sizes, width <= 640 ? {frame:80,image:68} : {frame:88,image:76}, 'free image and frame grow together');
  assert.equal(await page.locator('#cdQuickServices').isVisible(), true, 'free methods visible on mobile too');
  assert.ok(await page.locator('#cdQuickServices').evaluate(n=>Boolean(n.compareDocumentPosition(document.querySelector('#cdSignatureConsult')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'free comes before consultation');
  assert.equal(await page.locator('[data-sig-next],[data-sig-pause]').count(), 0, 'comparison stays still');
};
