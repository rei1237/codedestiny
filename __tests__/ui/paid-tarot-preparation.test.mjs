import '../../tools/oracle/next-delivery/guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import { pinTarotNarrativeSeed, assertTarotNarrativeSnapshot } from '../../worker/lib/tarot-fact-consumer.js';
import { buildMindscanDeliveryFacts } from '../../lib/tarot/mindscan-reading.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const bundle = await build({
  entryPoints: ['./worker/lib/paid-tarot-draw.js'], platform: 'node', format: 'cjs', bundle: true, write: false,
  plugins: [{ name: 'memory-only', setup(b) {
    b.onResolve({ filter: /^\.\/(db|paid-tarot-draw-store)\.js$/ }, arg => ({ path: arg.path, namespace: 'test-store' }));
    b.onLoad({ filter: /.*/, namespace: 'test-store' }, () => ({
      contents: 'export const withMongoRetry = (_, work) => work(); export const paidTarotDrawCollection = () => globalThis.store;'
    }));
    b.onResolve({ filter: /^\.\.\/gemini-(model-policy\.js|input-token-limit\.mjs)$/ }, arg => ({ path: arg.path, namespace: 'deny-provider' }));
    b.onLoad({ filter: /.*/, namespace: 'deny-provider' }, () => ({ contents: "export const selectGeminiModel = () => {throw Error('LLM_BLOCKED')}; export const assertGeminiInputTokenLimit = selectGeminiModel;" }));
    b.onResolve({ filter: /swiss|sweph|ephemeris|jyotish|mongoose|gemini/i }, arg => { throw Error('BLOCKED:' + arg.path); });
  } }],
});
function fixture() {
  let row = null, inserts = 0;
  const store = {
    findOne: async ({ _id }) => row?._id === _id ? clone(row) : null,
    async updateOne(filter, update) {
      if (update.$setOnInsert && !row) { row = clone(update.$setOnInsert); inserts++; }
      if (update.$set && row?._id === filter._id && row.owner === filter.owner) Object.assign(row, update.$set);
    },
  };
  const ctx = vm.createContext({ module: { exports: {} }, store, crypto: webcrypto, TextEncoder,
    require: name => { assert.equal(name, 'node:crypto'); return { createHash }; } });
  vm.runInContext(bundle.outputFiles[0].text, ctx);
  return { ...ctx.module.exports, get row() { return row; }, get inserts() { return inserts; } };
}

for (const family of ['tarot-love-relationship', 'tarot-mindscan']) {
  test(family + ' retains the dealt presentation through checkout, OFF, retries and narrative storage', async () => {
    const f = fixture(), on = { TAROT_CONSUMER_FACTS_V1: 'true' };
    const request = { featureKey: family, drawId: 'test-original-deal', auto: true };
    const first = await Promise.all(Array.from({ length: 8 }, () => f.createPaidTarotDraw(on, request)));
    assert.equal(f.inserts, 1);
    for (const result of first) assert.deepEqual(clone(result), clone(first[0]));
    const prepared = first[0], cards = prepared.cards;
    const input = family === 'tarot-mindscan'
      ? { pairs: cards.slice(0, 5).map((main, i) => ({ mainCardId: main.numericId, subCardId: cards[i + 5].numericId })), question: '관계를 살피고 싶어요.' }
      : { cards };
    const bound = await f.bindPaidTarotDraw({}, { owner: 'owner', featureKey: family, body: { ...input, drawId: request.drawId } });
    const facts = family === 'tarot-mindscan' ? buildMindscanDeliveryFacts(input.pairs, input.question, 'ko') : { base: { cards } };
    if (facts.sectionInputs) assert.deepEqual(clone(facts.sectionInputs.map(s => s.orientation)), clone(cards.slice(0, 5).map(c => c.orientation)));
    const seed = pinTarotNarrativeSeed({ ...facts, prompt: 'mock question' }, {}, input, bound);
    const source = seed.engineFacts.options.preparedPresentation;
    assert.equal(source.digest, prepared.presentationDigest);
    assert.deepEqual(source.cards.map(c => [c.cardId, c.orientation, c.interpretation]), clone(cards.map(c => [c.cardId, c.orientation, c.interpretation])));
    assert.ok(seed.prompt.includes(source.digest));
    assertTarotNarrativeSnapshot(clone(seed));
    const saved = JSON.stringify(f.row);
    assert.deepEqual(clone(await f.createPaidTarotDraw({}, request)), clone(prepared));
    await assert.rejects(f.bindPaidTarotDraw({}, { owner: 'other', featureKey: family, body: { ...input, drawId: request.drawId } }));
    assert.equal(JSON.stringify(f.row), saved);
    f.row.presentationFacts.facts.cards[0].orientation = 'tamper';
    await assert.rejects(f.createPaidTarotDraw({}, request), /SNAPSHOT_INVALID/);
    delete f.row.presentationFacts;
    await assert.rejects(f.createPaidTarotDraw(on, request), /SNAPSHOT_INVALID/);
  });
}

test('a previously stored legacy deal stays legacy after ON', async () => {
  const f = fixture(), request = { featureKey: 'tarot-love-relationship', drawId: 'test-old-deal', auto: true };
  const original = await f.createPaidTarotDraw({}, request), stored = JSON.stringify(f.row);
  assert.equal(original.version, 'paid-tarot-draw-v1');
  assert.deepEqual(clone(await f.createPaidTarotDraw({ TAROT_CONSUMER_FACTS_V1: 'true' }, request)), clone(original));
  assert.equal(JSON.stringify(f.row), stored);
});
