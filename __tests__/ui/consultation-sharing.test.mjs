import '../../scripts/lib/mock-network-guard.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const output = await build({ entryPoints: ['lib/consultation-sharing.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { teaHouseShareChoices, neoShareChoices, masterLoveCodexShareChoices, consultationInvitationUrl, trimShareText } = await import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));
const tea = { resultId: 'PRIVATE_ID', questionSummary: 'PRIVATE_QUESTION', birthDate: 'PRIVATE_BIRTH', synthesis: { summary: '내 속도를 지켜도 괜찮아요.' }, actionPrescription: '오늘 한 가지를 적어보세요.', closingLine: '조금씩 나아가요.' };
const neo = { sessionId: 'PRIVATE_ID', status: 'completed', question: 'PRIVATE_QUESTION', initialBriefing: { frontlineSummary: '먼저 기준을 세워라.', actionOrders: ['작은 실행부터 시작해라.'] }, pendingRefinedOrder: { thisWeekFirstStep: 'PRIVATE_PENDING' } };

test('every canonical tea product shares only saved excerpts, without private fields', async () => {
  const pricing = await build({ entryPoints: ['src/features/fortune-tea-house/data/consultPricing.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
  const { fortuneTeaHouseConsultPricing } = await import('data:text/javascript;base64,' + Buffer.from(pricing.outputFiles[0].text).toString('base64'));
  assert.equal(Object.keys(fortuneTeaHouseConsultPricing).length, 5);
  for (const [consultationMode, { featureKey }] of Object.entries(fortuneTeaHouseConsultPricing)) {
    const choices = teaHouseShareChoices({ ...tea, consultationMode, featureKey });
    assert.equal(choices.length, 3);
    assert.equal(choices[0].text, tea.synthesis.summary);
    assert.doesNotMatch(JSON.stringify(choices), /PRIVATE_/);
  }
});
test('tea placeholders, empty text and results without a saved identity are excluded', () => {
  assert.deepEqual(teaHouseShareChoices({ ...tea, resultId: undefined }), []);
  assert.deepEqual(teaHouseShareChoices({ resultId: 'saved', synthesis: { summary: ' ' }, closingLine: {} }), []);
});
test('all four Neo methods share the stored briefing; pending refinements never leak', () => {
  for (const selectedMethod of ['saju', 'vedic', 'ziwei', 'astrology']) {
    const choices = neoShareChoices({ ...neo, selectedMethod });
    assert.equal(choices.length, 2);
    assert.doesNotMatch(JSON.stringify(choices), /PRIVATE_/);
  }
});
test('Neo requires a completed identified result, including during refinement', () => {
  for (const status of ['generating', 'generation_failed', undefined]) assert.deepEqual(neoShareChoices({ ...neo, status }), []);
  assert.deepEqual(neoShareChoices({ ...neo, refinementStatus: 'generating' }), []);
  assert.deepEqual(neoShareChoices({ ...neo, sessionId: undefined }), []);
  assert.deepEqual(neoShareChoices(null), []);
});
test('completed Neo refinement offers the first step before verdict and briefing', () => {
  const choices = neoShareChoices({ ...neo, refinedOrder: { thisWeekFirstStep: '오늘 선택지 두 개를 적어라.', verdict: { statement: '작게 시작해라.' } } });
  assert.deepEqual(choices.map(choice => choice.id), ['first-step', 'verdict', 'frontline', 'action']);
  assert.equal(choices[0].text, '오늘 선택지 두 개를 적어라.');
});

test('Codex shares saved editorial excerpts only after every chapter is present', () => {
  const result = { sessionId: 'PRIVATE_ID', status: 'completed', question: 'PRIVATE_QUESTION', name: 'PRIVATE_NAME', chapters: [
    { content: { keySentence: '관계의 속도를 다시 맞춰 보세요.', actions: ['이번 주 대화 시간을 정해 보세요.'], insight: '서로의 신호를 천천히 읽어 보세요.' } },
    { content: { keySentence: '두 번째 장의 문장' } },
  ] };
  const choices = masterLoveCodexShareChoices(result, 2);
  assert.deepEqual(choices.map(choice => choice.id), ['sentence', 'action', 'insight']);
  assert.doesNotMatch(JSON.stringify(choices), /PRIVATE_/);
  assert.deepEqual(masterLoveCodexShareChoices(result, 20), []);
  assert.deepEqual(masterLoveCodexShareChoices({ ...result, status: 'partial' }, 2), []);
  assert.deepEqual(masterLoveCodexShareChoices({ ...result, sessionId: undefined }, 2), []);
});
test('invitation links contain only a public service and allowlisted attribution', () => {
  for (const [brand, path] of [['tea', '/fortune-tea-house/'], ['neo', '/neo-operation-room/'], ['codex', '/master-love-codex/']]) {
    for (const channel of ['copy', 'kakao', 'native', 'image', 'PRIVATE_QUERY']) {
      const url = new URL(consultationInvitationUrl(brand, channel));
      assert.equal(url.origin, 'https://code-destiny.com'); assert.equal(url.pathname, path);
      assert.equal(url.hash, ''); assert.deepEqual([...url.searchParams.keys()], ['utm_source', 'utm_medium', 'utm_campaign']);
      assert.doesNotMatch(url.href, /PRIVATE|sessionId|resultId|question|birth/);
    }
  }
});
test('edited snippets preserve Unicode and bound long group-chat excerpts', () => {
  assert.equal(Array.from(trimShareText('🐈'.repeat(400))).length, 360);
  assert.equal(Array.from(trimShareText('가'.repeat(400), 180)).length, 180);
  assert.equal(trimShareText('  짧은 이야기  '), '짧은 이야기');
});
