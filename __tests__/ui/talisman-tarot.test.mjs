import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  entryPoints: ['app/app/talismans/tarot-talisman-data.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  define: { 'process.env.NEXT_PUBLIC_ASSETS_BASE_URL': '"https://assets.code-destiny.com"' },
});
const tarot = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

test('영냥이와 운명의 찻집 타로 부적은 같은 78장 정본과 상담 해설을 사용한다', () => {
  const cards = tarot.tarotTalismanCards;
  assert.equal(cards.length, 78);
  assert.equal(new Set(cards.map(card => card.id)).size, 78);
  assert.equal(new Set(cards.map(card => card.code)).size, 78);
  assert.deepEqual(
    Object.fromEntries(['major', 'wands', 'cups', 'swords', 'pentacles'].map(group => [group, cards.filter(card => card.group === group).length])),
    { major: 22, wands: 14, cups: 14, swords: 14, pentacles: 14 },
  );
  const fool = tarot.findTarotTalismanCard('M00');
  assert.equal(fool.id, 'major_00_fool');
  assert.equal(tarot.findTarotTalismanCard('major_00_fool').code, 'M00');
  for (const orientation of ['upright', 'reversed']) {
    const reading = tarot.tarotTalismanReading(fool, orientation);
    for (const key of ['coreSymbol', 'relationshipShadow', 'emotionalPattern', 'advice', 'avoidAction', 'timingNuance', 'yesNoNuance', 'yeoniMetaphor']) {
      assert.equal(typeof reading[key], 'string');
      assert.ok(reading[key].trim(), `${orientation}.${key}`);
    }
  }
  assert.match(tarot.tarotTalismanImageCandidates(fool, 'yeongnyangi')[0], /assets\/yeongnyangi\/tarot\/v1\/M00-/);
  assert.match(tarot.tarotTalismanImageCandidates(fool, 'teahouse')[0], /^https:\/\/assets\.code-destiny\.com\/DestinyCafe\/caretaro\//);
});
