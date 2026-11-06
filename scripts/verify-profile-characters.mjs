import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { BASE_ANIMALS, GANJI_CHARACTERS, SPIRITS, characterForPillar, spriteUrl, mobileSpriteUrl, spiritExp } from '../js/core/profile-characters.mjs';
import { profileCharacterPreview } from '../worker/lib/profile-character-preview.js';
import { calculateLifeBookAiSaju } from '../worker/lib/life-book-ai-saju.js';
import { elementBadgeMarkup } from '../js/core/profile-element-badge.mjs';
import { loadProfileCharacterPreview } from '../js/core/profile-character-card.mjs';
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
const cacheProfile = { gender:'female', birth:{ year:1991, month:2, day:20, hour:8, minute:47, calType:'solar' }, location:{ tz:'Asia/Seoul', lat:37.5, lng:127 } };
let previewCalls = 0;
const previewPayload = { ok:true, data:{ ok:true, character:{ id:'animal-pig', name:'달빛 복숭아 돼지', ganji:'신해', element:'금' }, fortune:{} } };
const cached = await Promise.all([
  loadProfileCharacterPreview(cacheProfile, { request:async () => { previewCalls += 1; return previewPayload; } }),
  loadProfileCharacterPreview(cacheProfile, { request:async () => { previewCalls += 1; return previewPayload; } }),
]);
assert.equal(previewCalls, 1, 'card and selector share one in-flight preview');
assert.equal(cached[0], cached[1]);
const retryProfile = { ...cacheProfile, birth:{ ...cacheProfile.birth, minute:48 } };
let retryCalls = 0;
await assert.rejects(loadProfileCharacterPreview(retryProfile, { request:async () => { retryCalls += 1; return { ok:false, data:null }; } }));
const recovered = await loadProfileCharacterPreview(retryProfile, { request:async () => { retryCalls += 1; return previewPayload; } });
assert.equal(retryCalls, 2, 'a rejected preview is evicted so fallback can recover');
assert.equal(recovered.character.id, 'animal-pig');
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
  for (const animal of BASE_ANIMALS) {
    const buffer = await readFile(new URL(`public${mobileSpriteUrl(animal.id)}`, root));
    const meta = await sharp(buffer).metadata();
    assert.equal(meta.width, 320, `${animal.id} mobile`); assert.equal(meta.height, 80, `${animal.id} mobile`); assert.equal(meta.hasAlpha, true, `${animal.id} mobile`);
    assert.ok(buffer.length < 50_000, `${animal.id} mobile asset must stay below 50KB`);
    const stats = await sharp(buffer).stats();
    assert.ok(stats.channels[3].min === 0 && stats.channels[3].max > 0, `${animal.id} mobile asset needs transparent pixels and visible art`);
  }
}
console.log('Profile characters: 12 animals + 12 spirits, canonical birth mapping, growth policy and legacy redirect OK. Sprite assets: ' + (process.argv.includes('--skip-assets') ? 'SKIPPED' : '24 desktop + 12 mobile verified') + '.');
