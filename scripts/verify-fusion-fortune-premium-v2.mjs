// 초융합 v2(체계 6장 + 영역별 8장) 계약 — 목소리·묶음·전달 우선을 모델 호출 없이 확인한다.
import assert from 'node:assert/strict';
import { FUSION_NARRATOR_BY_KEY, FUSION_PREMIUM_VERSION, FUSION_PREMIUM_V2 as version, FUSION_PREMIUM_TARGETS_V2 as targets, FUSION_DOMAIN_CHAPTERS, FUSION_DOMAIN_KEYS, premiumGroupTarget } from '../lib/fusion-premium-report.js';
import { FUSION_EXPERT_VERSION, fusionEvidenceReferences } from '../worker/lib/fusion-expert-contract.js';
import { fusionGroupsForStage, buildFusionSectionGroupPrompt } from '../worker/lib/fusion-fortune-prompt.js';
import { generateFusionFortuneWithRealLLM, generateFusionFortuneWithMockLLM, normalizeFusionFortuneInput, resolveFusionFortuneDelivery, FUSION_DOMAIN_MISSING_NOTICE, fusionReportMeetsTotalFloor } from '../worker/lib/fusion-fortune.js';
import { FUSION_VOICE_KO } from '../worker/lib/expert-character-persona-text.js';

const systems = ['saju', 'ziwei', 'vedic', 'sukuyo', 'astrology', 'tarot'];
const context = { version: FUSION_EXPERT_VERSION, reportVersion: version, locale: 'ko', birthTimeKnown: true, birthPlaceKnown: true, topic: '이직', customerQuestion: '지금 옮길지 준비부터 할지', systems: Object.fromEntries(systems.map(system => [system, system === 'tarot' ? { cards: [{ name: '바보', orientation: 'upright', positionKey: 'current', meaningSummary: '시작' }] } : { expertEvidence: { theme: '준비', pattern: '책임' } }])), tarotSpread: { cards: [] } };
const plan = { version: FUSION_PREMIUM_VERSION, question: '이직을 결정하기 전에 무엇을 확인할까요?', questions: [{ id: 'q1', title: '내 일하는 성향은?' }, { id: 'q2', title: '옮길 조건은?' }, { id: 'q3', title: '어떻게 준비할까?' }] };
function prose(seed, n) { const lines = []; for (let i = 0; lines.join('\n\n').length < n; i++) lines.push(`${seed}의 ${i}번째 장면에서는 준비와 책임의 근거를 살펴 역할을 나누고, 비교한 조건을 기록하여 스스로 확인할 다음 행동을 정합니다.`); return lines.join('\n\n'); }
function payload(group) {
  const out = {};
  for (const key of group.keys) {
    if (key === 'visualization') continue;
    if (key === 'consultationPlan') { out[key] = plan; continue; }
    if (key === 'title' || key === 'shareText') { out[key] = '내 선택의 기준'; continue; }
    const content = prose(key, targets[key] || 100);
    if (key === 'finalVerdict') { out[key] = { headline: '조건부터 확인해요', confidence: 0, rationale: content, systemVerdicts: systems.map(key => ({ key, stance: 'conditional', note: '준비할 조건을 확인해요' })), doNow: ['기록하기', '비교하기', '확인하기'], avoid: ['재촉하기', '과장하기'] }; continue; }
    if (!key.endsWith('Section') && !['integratedReading', 'timingAndAction'].includes(key)) { out[key] = content; continue; }
    const system = group.systems[0] || 'saju'; const refs = fusionEvidenceReferences(system, context.systems[system]);
    const count = content.split('\n\n').length;
    out[key] = { title: '질문에 맞춘 ' + key, content, keyPoints: ['준비의 범위', '책임의 조건', '행동의 기준'], subchapters: Array.from({ length: 4 }, (_, i) => ({ title: `${key} ${i + 1}번째 확인`, start: Math.floor(i * count / 4), end: Math.floor((i + 1) * count / 4), questionIds: [`q${i % 3 + 1}`], evidenceKeys: refs, artKey: system })), signals: [{ domain: 'work', period: 'current', stance: 'adapt', summary: '준비할 조건을 확인해요', evidenceKeys: refs }], luckyActions: ['기록', '비교', '확인'], cautionPatterns: ['재촉', '과장', '단정'] };
  }
  return out;
}

// 1) 목표·묶음
assert.equal(Object.values(targets).reduce((a, b) => a + b, 0), 70800);
const stageOne = fusionGroupsForStage(1, context), stageTwo = fusionGroupsForStage(2, context), all = [...stageOne, ...stageTwo];
assert.equal(all.length, 14);
assert.equal(all.reduce((sum, g) => sum + premiumGroupTarget(g, context), 0), 70800);
assert.deepEqual(stageTwo.filter(g => g.optional).flatMap(g => g.keys).sort(), [...FUSION_DOMAIN_KEYS].sort(), 'every domain chapter belongs to one optional group');
assert.equal(fusionGroupsForStage(2, { ...context, reportVersion: FUSION_PREMIUM_VERSION }).length, 3, 'v1 stage two is untouched');
// 🔴 무성은 미성년 캐릭터 — 연애·결혼·건강 장을 맡지 않는다.
for (const key of ['loveSection', 'marriageSection', 'healthSection']) assert.notEqual(FUSION_NARRATOR_BY_KEY[key], 'musung', key);

// 2) 버전 통과
assert.equal(normalizeFusionFortuneInput({ birthDate: '1995-04-18', reportVersion: version }).reportVersion, version);
assert.equal(normalizeFusionFortuneInput({ birthDate: '1995-04-18', reportVersion: 'fusion-premium.v9' }).reportVersion, undefined);

// 3) 프롬프트: 시스템 프롬프트·접두사는 묶음마다 같고, 화자는 한국어 그룹 꼬리에만 있다
for (const stageGroups of [stageOne, stageTwo]) {
  const built = stageGroups.map(group => buildFusionSectionGroupPrompt({ context, group, priorSections: { consultationPlan: plan } }));
  assert.equal(new Set(built.map(p => p.systemPrompt)).size, 1, 'system prompt is byte-identical across groups');
  assert.equal(new Set(built.map(p => p.promptPrefix)).size, 1, 'cache prefix is byte-identical across groups');
  for (const [index, group] of stageGroups.entries()) {
    const narrator = group.keys.map(key => FUSION_NARRATOR_BY_KEY[key]).find(Boolean);
    const voiced = Object.keys(FUSION_VOICE_KO).filter(name => built[index].userPrompt.includes(FUSION_VOICE_KO[name]));
    assert.deepEqual(voiced, narrator ? [narrator] : [], `${group.id} voice`);
    assert(!built[index].promptPrefix.includes('[이 장의 화자'), 'voice never enters the shared prefix');
    const en = buildFusionSectionGroupPrompt({ context: { ...context, locale: 'en' }, group, priorSections: { consultationPlan: plan } });
    assert(!en.userPrompt.includes('[이 장의 화자'), `${group.id}: voices are Korean only`);
  }
}
const v1Prompt = buildFusionSectionGroupPrompt({ context: { ...context, reportVersion: FUSION_PREMIUM_VERSION }, group: stageOne[0], priorSections: {} });
assert(!v1Prompt.userPrompt.includes('[이 장의 화자'), 'v1 reports keep the neutral narrator');
for (const chapter of FUSION_DOMAIN_CHAPTERS) {
  const group = stageTwo.find(g => g.keys.includes(chapter.key));
  const built = buildFusionSectionGroupPrompt({ context, group, priorSections: { consultationPlan: plan } });
  assert.deepEqual(built.geminiSchema.properties[chapter.key].properties.subchapters.items.properties.artKey.enum, [chapter.id]);
}

// 4) 전체 흐름 — 14묶음, 사주 먼저, 영역 묶음은 Flash, 필수 묶음이 먼저
const env = { GEMINI_API_KEY: 'mock-not-a-real-key', ENABLE_FUSION_FORTUNE_REAL_LLM: 'true', ALLOW_FUSION_FORTUNE_REAL_LLM: 'true' };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const path = new URL(String(url)).pathname;
  if (path.endsWith(':countTokens')) return Response.json({ totalTokens: 1000 });
  if (path.endsWith('/cachedContents') && init.method === 'POST') return Response.json({ name: 'cachedContents/mock' });
  if (path.includes('/cachedContents/') && init.method === 'DELETE') return new Response(null, { status: 204 });
  throw new Error('Network prohibited in premium v2 mock');
};
async function run({ fail = () => false } = {}) {
  let prior = {}; const attempts = {}; const calls = []; let generated;
  for (const stage of [1, 2]) for (let wave = 0; wave < 12; wave++) {
    generated = await generateFusionFortuneWithRealLLM({ context, stage, requestId: 'premium-v2', env, priorResult: prior, priorSnapshot: { attempts }, onCheckpoint: async result => { prior = { ...prior, ...result }; }, onAttempt: async id => { attempts[id] = (attempts[id] || 0) + 1; return attempts[id]; }, providerCall: async (_env, _prompt, options) => {
      const id = options.logContext.sectionGroup; calls.push(id);
      assert.equal(options.model, ['integration', 'verdict'].includes(id) ? 'gemini-2.5-pro' : 'gemini-2.5-flash', id);
      if (fail(id)) return { ok: false, error: 'timeout' };
      return { ok: true, text: JSON.stringify(payload(all.find(g => g.id === id))), provider: 'gemini', model: options.model };
    } });
    prior = generated.result;
    if (generated.deliverable) break;
    assert(wave < 11, 'must finish within bounded waves');
  }
  return { generated, calls, attempts };
}
try {
  const full = await run();
  assert.equal(full.calls[0], 'saju');
  assert.equal(full.calls.length, 14, 'every group is called once');
  const stageTwoCalls = full.calls.slice(6);
  assert.deepEqual(stageTwoCalls.slice(0, 3).sort(), ['action', 'integration', 'verdict'], 'required stage-two groups run before domain chapters');
  assert.equal(full.generated.deliverable, true); assert.equal(full.generated.qualityTier, 'full');
  assert.equal(full.generated.result.reportVersion, version);
  for (const key of FUSION_DOMAIN_KEYS) assert(full.generated.result[key]?.content, key);
  assert(fusionReportMeetsTotalFloor(full.generated.result));

  // 5) 전달 우선 — 영역 묶음이 끝내 실패해도 나머지는 강등 배달된다
  const failing = await run({ fail: id => id === 'domainYeoni' });
  assert.equal(failing.generated.deliverable, true, 'a failed domain group never blocks delivery');
  assert.equal(failing.generated.qualityTier, 'degraded');
  assert(failing.generated.qualityIssues.includes('domain_chapter_missing'));
  assert.equal(failing.generated.qualityNotice, FUSION_DOMAIN_MISSING_NOTICE);
  assert.equal(failing.generated.result.loveSection, undefined);
  assert.equal(failing.attempts.domainYeoni, 2, 'the optional group spends its bounded attempts, then stops');
  assert(failing.generated.result.wealthSection?.content);
  // 필수 묶음이 실패하면 여전히 배달하지 않는다.
  const required = await run({ fail: id => id === 'verdict' }).catch(error => error);
  assert(required instanceof Error || required.generated.deliverable === false, 'a required group still blocks delivery');

  // 6) 배달 판정: v1 리포트는 영역 장을 요구하지 않는다
  const v1 = { ...full.generated.result, reportVersion: FUSION_PREMIUM_VERSION };
  for (const key of FUSION_DOMAIN_KEYS) delete v1[key];
  assert(!resolveFusionFortuneDelivery(v1, { ignoreLength: true }).issues.includes('domain_chapter_missing'));

  // 7) mock 경로도 영역 장을 만든다
  const mock = await generateFusionFortuneWithMockLLM({ context });
  for (const key of FUSION_DOMAIN_KEYS) assert(mock[key]?.content?.length > 1000, `mock ${key}`);
  const mockV1 = await generateFusionFortuneWithMockLLM({ context: { ...context, reportVersion: FUSION_PREMIUM_VERSION } });
  assert.equal(mockV1.loveSection, undefined);
  console.log('[fusion-premium-v2] PASS: 70.8k targets, 14 groups (saju first, required before domains, domains on Flash), shared system prompt and cache prefix, Korean-only master voices, degraded delivery on a failed domain chapter (mock only)');
} finally { globalThis.fetch = originalFetch; }
