import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { BASE_ANIMALS, GANJI_CHARACTERS, SPIRITS, characterForPillar, spriteUrl, spiritExp } from '../js/core/profile-characters.mjs';
import { profileCharacterPreview } from '../worker/lib/profile-character-preview.js';
import { calculateLifeBookAiSaju } from '../worker/lib/life-book-ai-saju.js';
import { elementBadgeMarkup } from '../js/core/profile-element-badge.mjs';
const root = new URL('../', import.meta.url);
const ids = BASE_ANIMALS.map(row => row.id).concat(SPIRITS.map(row => row.id));
assert.equal(ids.length, 24); assert.equal(new Set(ids).size, 24);
for (const pillar of GANJI_CHARACTERS) assert.equal(characterForPillar(pillar.hanja,'male').id,characterForPillar(pillar.hanja,'female').id);
for (const pillar of GANJI_CHARACTERS) {
  const expected = ['목','목','화','화','토','토','금','금','수','수'][pillar.index % 10];
  assert.equal(pillar.element, expected);
  assert.match(elementBadgeMarkup(pillar.element), /타고난 오행/);
}
assert.equal(new Set(['목','화','토','금','수'].map(elementBadgeMarkup)).size, 5);
assert.equal(elementBadgeMarkup(''), '');
assert.equal(elementBadgeMarkup('<script>'), '');
assert.equal(spiritExp('quest', 15, ['spirit-00'], 'spirit-00'), 18);
assert.equal(spiritExp('paid', 30, ['spirit-00'], 'spirit-00'), 30);
const today = { year: 2026, month: 10, day: 17 };
for (const gender of ['male','female']) for (const calendarType of ['solar','lunar','lunar_leap']) for (const birthTimeUnknown of [true,false]) {
  const birthDate = calendarType === 'lunar_leap' ? '2023-02-10' : '1990-01-15';
  const input = { gender, birthDate, birthTime: birthTimeUnknown ? '' : '23:30', birthTimeUnknown, calendarType };
  const result = profileCharacterPreview(input, today);
  const natal = calculateLifeBookAiSaju({ ...input, calendarType: calendarType === 'solar' ? 'solar' : 'lunar', isLeapMonth: calendarType === 'lunar_leap' });
  assert.equal(result.character.hanja, natal.dayPillar);
  assert.ok(result.fortune?.headline); assert.ok(result.fortune?.advice);
}
for (const input of [{}, { birthDate:'1990-01-15', gender:'', birthTimeUnknown:true }, { birthDate:'1990-01-15', gender:'male', birthTime:'25:00' }]) assert.throws(() => profileCharacterPreview(input, today));
const css = await readFile(new URL('styles/profile-characters.css', root), 'utf8');
assert.match(css, /prefers-reduced-motion/); assert.match(css, /step-end/);
const legacy = await readFile(new URL('tadagochi.html', root), 'utf8');
assert.match(legacy, /\/ggulggul\/#dpMasterCard/); assert.doesNotMatch(legacy, /api\/user\/tamagotchi/);
const userRoute = await readFile(new URL('worker/routes/user.js', root), 'utf8');
assert.doesNotMatch(userRoute, /tamagotchi/i);
if (!process.argv.includes('--skip-assets')) {
  const hashes = new Set();
  for (const id of ids) {
    const buffer = await readFile(new URL(`public${spriteUrl(id)}`, root));
    const meta = await sharp(buffer).metadata();
    assert.equal(meta.width, 512, id); assert.equal(meta.height, 128, id); assert.equal(meta.hasAlpha, true, id);
    assert.ok(buffer.length < 150_000, `${id} must be a small profile asset`);
    const stats = await sharp(buffer).stats();
    assert.ok(stats.channels[3].min === 0 && stats.channels[3].max > 0, `${id} must have actual transparent pixels and visible art`);
    const hash = createHash('sha256').update(buffer).digest('hex');
    assert.ok(!hashes.has(hash), `${id} duplicates another character`); hashes.add(hash);
  }
}
console.log('Profile characters: 12 animals + 12 spirits, canonical birth mapping, growth policy and legacy redirect OK. Sprite assets: ' + (process.argv.includes('--skip-assets') ? 'SKIPPED' : '24 verified') + '.');
