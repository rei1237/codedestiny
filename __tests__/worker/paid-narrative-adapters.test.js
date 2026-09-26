/** @jest-environment node */
import { PAID_COMPLETED_RESULT_ACCESS_FIXTURES } from '../fixtures/paid-completed-result-access-fixtures.mjs';
import {
  loadPaidNarrativeAdapter,
  PAID_NARRATIVE_SERVER_RESUME_EXCLUSIONS,
  PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS,
  PAID_NARRATIVE_SERVER_RESUME_KEYS,
} from '../../worker/lib/paid-narrative-adapters.js';

const env = { NODE_ENV: 'test' };
const narrativeProducts = PAID_COMPLETED_RESULT_ACCESS_FIXTURES
  .filter(fixture => fixture.marker === 'runPaidNarrativeDelivery').flatMap(fixture => fixture.products);

test('every shared paid-narrative product has a server resume adapter', () => {
  expect([...PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS].sort()).toEqual([...narrativeProducts].sort());
});

test.each(PAID_NARRATIVE_SERVER_RESUME_KEYS)('%s loads the route adapter', async key => {
  const [featureKey, reportType] = key.split('|');
  const adapter = await loadPaidNarrativeAdapter(env, featureKey, reportType, 'user-1');
  expect(adapter).toMatchObject({ reportType, render: expect.any(Function) });
  if (!reportType.startsWith('pet')) expect(adapter.produce).toEqual(expect.any(Function));
  expect(adapter).not.toHaveProperty('verify');
  expect(adapter).not.toHaveProperty('seed');
  // Refunds are bound to the route request's payment context; a server resume
  // leaves an exhausted execution for review instead of claiming one.
  expect(adapter).not.toHaveProperty('onExhausted');
});

test('unlisted, excluded and mismatched pairs fail closed', async () => {
  for (const key of [...Object.keys(PAID_NARRATIVE_SERVER_RESUME_EXCLUSIONS), 'geomancy|loveTarot', 'unknown|geomancyOracle', 'saju_ai_question_prompt|featureQuestionConsultation']) {
    const [featureKey, reportType] = key.split('|');
    await expect(loadPaidNarrativeAdapter(env, featureKey, reportType, 'user-1')).resolves.toBeNull();
  }
});

test('guardian turns are not resumed while the real model is off', async () => {
  await expect(loadPaidNarrativeAdapter({ NODE_ENV: 'production' }, 'fortune-chat-consultation', 'guardianPaidTurn', 'user-1')).resolves.toBeNull();
});
