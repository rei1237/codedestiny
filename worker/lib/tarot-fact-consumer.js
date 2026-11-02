import { createEngineFactSnapshot, readEngineFactSnapshot, engineFactPrompt, engineFactDigest } from './engine-fact-snapshot.js';
const stateFacts = state => Object.fromEntries(['base', 'input', 'sectionInputs'].filter(key => state[key] !== undefined).map(key => [key, state[key]]));
const hash = engineFactDigest;
// The caller's existing atomic seed storage owns this metadata. Never re-seed a saved result.
export function pinTarotNarrativeSeed(state, env, body, draw = null) {
  if (env?.TAROT_CONSUMER_FACTS_V1 !== 'true') return state;
  const facts = stateFacts(state);
  const snapshot = createEngineFactSnapshot('tarot', facts, body, { options: {
    spreadId: state.base?.spreadType || state.input?.spreadType || (draw?.featureKey === 'tarot-mindscan' ? 'mindscan-five-pairs' : 'custom-positions'),
    questionMode: state.base?.questionType || state.input?.questionType || body.category || '',
    locale: state.locale || body.locale || 'ko',
    ...(draw ? { drawVersion: draw.version, deckVersion: draw.deckVersion, cards: draw.cards } : {}),
    stateDigest: hash(facts),
  } });
  return { ...state, factSnapshotProtocol: 'engine-facts-v1', engineFacts: snapshot, prompt: state.prompt + '\n[Stored tarot facts]\n' + JSON.stringify(engineFactPrompt(snapshot)) };
}
export function assertTarotNarrativeSnapshot(state) {
  if (!state.engineFacts) {
    if (state.factSnapshotProtocol === 'engine-facts-v1') throw new Error('ENGINE_FACT_SNAPSHOT_REQUIRED');
    return;
  }
  const saved = readEngineFactSnapshot(state.engineFacts, { system: 'tarot' });
  if (saved.options.stateDigest !== hash(stateFacts(state))) throw Object.assign(new Error('TAROT_FACTS_CONFLICT'), { code: 'TAROT_FACTS_CONFLICT' });
}

/** Basic deterministic reading and its existing year-result storage share this exact payload. */
export function pinTarotBasicResult(payload, env, input) {
  if (env?.TAROT_CONSUMER_FACTS_V1 !== 'true') return payload;
  const engineFacts = createEngineFactSnapshot('tarot', { cards: payload.cards, reading: payload.reading }, input,
    { options: { spreadType: payload.spreadType, questionType: payload.engineMeta?.questionType || '' } });
  return { ...payload, engineMeta: { ...payload.engineMeta, engineFacts } };
}
