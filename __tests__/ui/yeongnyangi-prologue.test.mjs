import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PROLOGUE, PROLOGUE_WIDTHS, prologuePage } from '../../lib/yeongnyangi/prologue.mjs';

test('the prologue has 24 pages in order, each with a script alt and both image formats at every width', () => {
  assert.equal(PROLOGUE.pages.length, 24);
  assert.deepEqual(PROLOGUE.pages.map(page => page.n), Array.from({ length: 24 }, (_, i) => i + 1));
  for (const page of PROLOGUE.pages) {
    assert.ok(page.alt.trim().length > 0, `page ${page.n} alt`);
    for (const w of PROLOGUE_WIDTHS) {
      for (const ext of ['avif', 'webp']) {
        const file = `public${prologuePage(page.n)}-${w}.${ext}`;
        assert.ok(existsSync(file), file);
      }
    }
  }
});

test('the story shelf features the prologue and keeps the latest episode outside the card', () => {
  const source = readFileSync('app/consultations/StoryDiscovery.tsx', 'utf8');
  assert.ok(source.includes('href={PROLOGUE.href}'));
  assert.ok(source.includes('data-serial-latest'));
  assert.equal(PROLOGUE.href, '/yeongnyangi/season-1/prologue/');
  assert.ok(existsSync('app/yeongnyangi/season-1/prologue/page.tsx'));
});
