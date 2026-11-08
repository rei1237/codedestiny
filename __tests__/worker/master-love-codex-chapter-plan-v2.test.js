/** @jest-environment node */
import { jest } from '@jest/globals';
// 5단계(2026-11-08): V2 장 구성 · 마지막 시도 구제 · 장 삭제 금지 · 한 장 안 말투/질문 재인용.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let docs, route, provider, refund, fetchBlock, lib;
const uid = '64b7f2a1c3d4e5f601234567';
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
const get = (doc, key) => key.split('.').reduce((value, field) => value?.[field], doc);
function assign(doc, fields) { for (const [key, value] of Object.entries(fields)) { const keys = key.split('.'); let target = doc; for (const part of keys.slice(0, -1)) target = target[part] ||= {}; target[keys.at(-1)] = clone(value); } }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(row => matches(doc, row));
    if (key === '$and') return value.every(row => matches(doc, row));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$ne' in value) return get(doc, key) !== value.$ne;
      if ('$nin' in value) return !value.$nin.includes(get(doc, key));
      if ('$in' in value) return value.$in.includes(get(doc, key));
      if ('$exists' in value) return (get(doc, key) !== undefined) === value.$exists;
      if ('$lt' in value) return new Date(get(doc, key)) < value.$lt;
      if ('$lte' in value) return new Date(get(doc, key)) <= value.$lte;
    }
    return String(get(doc, key)) === String(value);
  });
}
const model = {
  findOne: filter => query(docs.find(doc => matches(doc, filter)) || null),
  create: async fields => { const doc = { ...clone(fields), createdAt: new Date() }; docs.push(doc); return clone(doc); },
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
  findOneAndUpdate: (filter, update) => { const doc = docs.find(row => matches(row, filter)); if (doc) assign(doc, update.$set); return query(doc || null); },
  updateOne: async (filter, update) => { const doc = docs.find(row => matches(row, filter)); if (doc) assign(doc, update.$set); return { matchedCount: doc ? 1 : 0 }; },
};

beforeAll(async () => {
  const db = await import('../../worker/lib/db.js'); const auth = await import('../../worker/lib/auth.js'); const models = await import('../../worker/lib/models.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_e, fn) => fn() }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId: uid }), getAccessTokenSecret: () => 'test-only' }));
  jest.unstable_mockModule('../../worker/lib/jwt.js', () => ({ signJwt: async () => 'test-token', verifyJwt: async () => ({}) }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ...models, MasterLoveCodexSession: model, Payment: { findOne: () => query(null) },
    PaidExecutionRecord: { findOne: () => query(null), updateOne: async () => ({ matchedCount: 1 }) }, PointHistory: { findOne: () => query(null) }, MonthlyCreditLedger: { findOne: () => query(null) } }));
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ callGeminiText: async () => { throw new Error('Live provider blocked'); } }));
  lib = await import('../../worker/routes/master-love-codex.js');
  route = lib.handleMasterLoveCodexRoutes;
});

const body = (chapter, ending = '정합니다.') => {
  let text = '';
  for (let i = 0; text.length < (chapter.minChars || 2400) + 300; i++) text += `${chapter.id}의 ${i}번째 계산 근거를 바탕으로 생활에서 반복되는 선택과 반대 조건을 구체적으로 살펴보고 실행할 행동을 ${ending}\n`;
  return text;
};
const okChapter = (chapter, text = body(chapter)) => ({ status: 'ok', chapter: { id: chapter.id, title: chapter.title, order: chapter.order, symbol: chapter.symbol, body: text, chars: text.length, ok: true } });

beforeEach(() => {
  docs = [{ id: 'saved-codex', userId: uid, idempotencyKey: 'run', billingRequestId: 'run', paymentId: 'pay', inputHash: 'input', mode: 'solo', accessType: 'paid',
    status: 'generating', chapters: [], generationProgress: null, deliveryMeta: { chapterPlanVersion: 2 } }];
  refund = jest.fn(async () => ({ refunded: false }));
  provider = jest.fn(async (_env, { chapter }) => okChapter(chapter));
  fetchBlock = jest.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('External fetch blocked'); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
const generate = () => route(new Request('https://mock.test/api/master-love-codex/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 'saved-codex' }) }), {},
  { generateChapter: provider, refundPassCoverage: refund, runCoinRefund: refund, runMonthlyCreditRefund: refund, runPaymentCancel: refund });
const runToEnd = async (limit = 12) => { for (let i = 0; i < limit && docs[0].status !== 'completed'; i++) await generate(); };

describe('V2 chapter tables', () => {
  it('keep chapter count, ids and order; add perspective and generous targets; V1 untouched', async () => {
    const solo = await import('../../worker/lib/master-love-codex-prompt.mjs');
    const compat = await import('../../worker/lib/master-love-codex-compat-prompt.mjs');
    const { codexV2PromptLines, codexBodyTarget } = await import('../../worker/lib/master-love-codex-quality.js');
    for (const [v1, v2, first] of [[solo.MASTER_LOVE_CODEX_CHAPTERS, solo.MASTER_LOVE_CODEX_CHAPTERS_V2, 'gate'], [compat.MASTER_LOVE_CODEX_COMPAT_CHAPTERS, compat.MASTER_LOVE_CODEX_COMPAT_CHAPTERS_V2, 'facing']]) {
      expect(v2).toHaveLength(20);
      expect(v2.map(row => [row.id, row.order, row.title, row.minChars])).toEqual(v1.map(row => [row.id, row.order, row.title, row.minChars]));
      for (const row of v2) {
        expect(row.planVersion).toBe(2);
        expect(row.perspective?.length).toBeGreaterThan(10);
        expect(row.targetChars[0]).toBeGreaterThanOrEqual(row.minChars + 800);
        expect(codexBodyTarget(row)).toEqual(row.targetChars);
        expect(codexV2PromptLines(row).length).toBeGreaterThan(0);
      }
      for (const row of v1) {
        expect(row.perspective).toBeUndefined();
        expect(codexV2PromptLines(row)).toEqual([]);
        expect(codexBodyTarget(row)).toEqual([row.minChars + 500, row.minChars + 900]);
      }
      const opener = v2.find(row => row.id === first);
      expect(opener.scope).toMatch(/기질/);
      expect(opener.scope).toMatch(/일상 장면 2~3개/);
      expect(opener.avoid.join(' ')).toMatch(/상담 질문/);
    }
  });

  it('new sessions pin plan 2; legacy sessions without a version stay on V1', async () => {
    const solo = await import('../../worker/lib/master-love-codex-prompt.mjs');
    expect(lib.CODEX_CHAPTER_PLAN_VERSION).toBe(2);
    expect(lib.codexChaptersForPlan('solo', 2)).toBe(solo.MASTER_LOVE_CODEX_CHAPTERS_V2);
    expect(lib.codexChaptersForPlan('solo', undefined)).toBe(solo.MASTER_LOVE_CODEX_CHAPTERS);
    await generate();
    expect(provider.mock.calls.every(([, input]) => input.chapter.perspective)).toBe(true);
    provider.mockClear();
    docs[0] = { ...docs[0], chapters: [], deliveryMeta: {}, generationProgress: null };
    await generate();
    expect(provider.mock.calls.length).toBeGreaterThan(0);
    expect(provider.mock.calls.every(([, input]) => input.chapter.perspective === undefined)).toBe(true);
  });
});

describe('delivery never fails on length or repeats', () => {
  it('the last paid attempt for an unsaved chapter is marked final so it is salvaged, not refunded', async () => {
    docs[0].deliveryMeta.attempts = { gate: 1 };
    await generate();
    const gate = provider.mock.calls.find(([, input]) => input.chapter.id === 'gate')[1];
    expect(gate.finalAttempt).toBe(true);
    const other = provider.mock.calls.find(([, input]) => input.chapter.id !== 'gate')[1];
    expect(other.finalAttempt).toBe(false);
  });

  it('a chapter repeating an earlier passage is trimmed and saved, without an extra paid call', async () => {
    const shared = '두 사람은 같은 장면에서 서로 다른 속도로 마음을 열기 때문에 기다림의 길이를 먼저 맞추는 편이 좋습니다.';
    provider.mockImplementation(async (_env, { chapter }) => okChapter(chapter, `${shared}\n${body(chapter)}`));
    await runToEnd();
    expect(docs[0].status).toBe('completed');
    expect(provider).toHaveBeenCalledTimes(20);
    expect(docs[0].chapters).toHaveLength(20);
    expect(docs[0].chapters.filter(row => row.body.includes(shared))).toHaveLength(1);
    expect(refund).not.toHaveBeenCalled();
  });

  it('assembly never removes a chapter that de-duplication would empty', async () => {
    const chapters = lib.codexChaptersForPlan('solo', 2).map(spec => okChapter(spec).chapter);
    chapters[5] = { ...chapters[5], body: chapters[4].body, chars: chapters[4].body.length };
    Object.assign(docs[0], { chapters, deliveryMeta: { chapterPlanVersion: 2, savedChapters: chapters } });
    await runToEnd(3);
    expect(provider).not.toHaveBeenCalled();
    expect(docs[0].status).toBe('completed');
    expect(docs[0].chapters.map(row => row.id)).toEqual(chapters.map(row => row.id));
    expect(refund).not.toHaveBeenCalled();
  });
});

describe('V2 soft issues: register drift and re-quoted questions', () => {
  it('detects mixed 요/니다 endings in one chapter only for V2 chapters', async () => {
    const { detectCodexSoftIssues } = await import('../../worker/lib/master-love-codex-quality.js');
    const [v2] = lib.codexChaptersForPlan('solo', 2);
    const [v1] = lib.codexChaptersForPlan('solo', 1);
    const mixed = Array.from({ length: 6 }, (_, i) => i % 2 ? `${i}번째 장면에서는 마음을 먼저 확인해요.` : `${i}번째 장면에서는 마음을 먼저 확인합니다.`).join(' ');
    expect(detectCodexSoftIssues(mixed, v2).map(row => row.code)).toEqual(['REGISTER_DRIFT']);
    expect(detectCodexSoftIssues(mixed, v1)).toEqual([]);
    const uniform = Array.from({ length: 8 }, (_, i) => `${i}번째 장면에서는 마음을 먼저 확인합니다.`).join(' ');
    expect(detectCodexSoftIssues(uniform, v2)).toEqual([]);
  });

  it('re-quoted question sentences outside the owning chapter are flagged and scrubbed only while 85% survives', async () => {
    const { detectCodexSoftIssues, scrubCodexSoftIssues } = await import('../../worker/lib/master-love-codex-quality.js');
    const gate = lib.codexChaptersForPlan('solo', 2)[0];
    const question = '헤어진 전 연인에게 다시 연락해도 괜찮을지, 연락한다면 언제가 좋을지 알고 싶어요';
    const consultation = { situation: '', questions: [{ text: question, chapterOrder: 15 }] };
    const quoted = [1, 2, 3].map(i => `당신은 헤어진 전 연인에게 다시 연락해도 괜찮을지 ${i}번 물었습니다.`).join(' ');
    const text = `${quoted}\n${body(gate)}`;
    expect(detectCodexSoftIssues(text, gate, consultation).map(row => row.code)).toContain('QUESTION_REQUOTED');
    const owner = { ...gate, order: 15 };
    expect(detectCodexSoftIssues(text, owner, consultation)).toEqual([]);
    const scrubbed = scrubCodexSoftIssues(text, gate, consultation);
    expect(scrubbed).not.toMatch(/다시 연락해도 괜찮을지 1번/);
    expect(scrubbed.length).toBeGreaterThan(text.length * 0.85);
    const mostlyQuoted = `${quoted}\n짧은 본문입니다.`;
    expect(scrubCodexSoftIssues(mostlyQuoted, gate, consultation)).toBe(mostlyQuoted);
  });

  it('a soft-issue chapter is delivered, gets one repair with a hint, and the fix replaces it', async () => {
    const mixed = chapter => body(chapter).split('\n').map((line, i) => i % 2 ? line.replace(/정합니다\.$/u, '정해요.') : line).join('\n');
    provider.mockImplementation(async (_env, { chapter, previousError }) => okChapter(chapter, chapter.id === 'gate' && !previousError ? mixed(chapter) : body(chapter)));
    await generate();
    expect(docs[0].deliveryMeta.savedChapters.find(row => row.id === 'gate').softIssues).toEqual(['REGISTER_DRIFT']);
    expect(docs[0].chapters.find(row => row.id === 'gate').softIssues).toBeUndefined();
    await runToEnd();
    expect(docs[0].status).toBe('completed');
    const repairs = provider.mock.calls.filter(([, input]) => input.chapter.id === 'gate');
    expect(repairs).toHaveLength(2);
    expect(repairs[1][1].previousError).toBe('LLM_SOFT_ISSUES');
    expect(repairs[1][1].repairHint).toMatch(/종결어미/);
    expect(docs[0].chapters.find(row => row.id === 'gate').body).not.toMatch(/정해요\./);
    expect(provider).toHaveBeenCalledTimes(21);
    expect(refund).not.toHaveBeenCalled();
  });

  it('a repair that still drifts keeps the delivered draft and does not loop', async () => {
    const mixed = chapter => body(chapter).split('\n').map((line, i) => i % 2 ? line.replace(/정합니다\.$/u, '정해요.') : line).join('\n');
    provider.mockImplementation(async (_env, { chapter }) => okChapter(chapter, chapter.id === 'gate' ? mixed(chapter) : body(chapter)));
    await runToEnd();
    expect(docs[0].status).toBe('completed');
    expect(provider.mock.calls.filter(([, input]) => input.chapter.id === 'gate')).toHaveLength(2);
    expect(docs[0].chapters).toHaveLength(20);
    expect(refund).not.toHaveBeenCalled();
  });
});

describe('final-attempt salvage and evidence sub-paths', () => {
  const person = { birthDate: '1990-05-12', birthTime: '09:30', gender: 'female', calendarType: 'solar' };
  async function contractFor(chapter) {
    const { calculateLifeBookAiSaju } = await import('../../worker/lib/life-book-ai-saju.js');
    const { calculateZiweiAiChart } = await import('../../worker/lib/ziwei-ai-chart.js');
    const { buildCodexEvidence } = await import('../../worker/lib/master-love-codex-evidence.js');
    return buildCodexEvidence({ chapter, saju: calculateLifeBookAiSaju(person, { year: 2026 }), ziweiChart: calculateZiweiAiChart({ birthInfo: person }, { year: 2026 }) });
  }

  it('a body-only reply fails normally but is salvaged into a deliverable chapter on the final attempt', async () => {
    const { generateCodexChapterResponse, assertCodexChapterQuality } = await import('../../worker/lib/master-love-codex-quality.js');
    const chapter = lib.codexChaptersForPlan('solo', 2)[1];
    const evidenceContract = await contractFor(chapter);
    const text = JSON.stringify({ body: body(chapter) });
    const call = async () => ({ text });
    await expect(generateCodexChapterResponse(call, 'p', { chapter, metricDefs: [], evidenceContract, maxAttempts: 1, allowShort: true })).rejects.toThrow();
    const result = await generateCodexChapterResponse(call, 'p', { chapter, metricDefs: [], evidenceContract, maxAttempts: 1, allowShort: true, finalAttempt: true });
    expect(result.salvaged).toBeTruthy();
    expect(() => assertCodexChapterQuality(result.parsed, chapter, [], evidenceContract, { allowShort: true })).not.toThrow();
    expect(result.parsed.body.length).toBeGreaterThan(chapter.minChars);
  });

  it('a truncated final reply keeps its whole sentences instead of failing', async () => {
    const { generateCodexChapterResponse } = await import('../../worker/lib/master-love-codex-quality.js');
    const chapter = lib.codexChaptersForPlan('solo', 2)[1];
    const evidenceContract = await contractFor(chapter);
    const text = JSON.stringify({ body: body(chapter) }).slice(0, -40);
    const result = await generateCodexChapterResponse(async () => ({ text, truncated: true }), 'p', { chapter, metricDefs: [], evidenceContract, maxAttempts: 1, allowShort: true, finalAttempt: true });
    expect(result.parsed.body).toMatch(/[.!?]$/u);
  });

  it('evidence citing a sub-path or index resolves to its record', async () => {
    const { normalizeCodexEvidence } = await import('../../worker/lib/master-love-codex-evidence.js');
    const chapter = lib.codexChaptersForPlan('solo', 2)[1];
    const contract = await contractFor(chapter);
    const record = contract.records[0];
    const parsed = { evidence: [
      { path: `${record.path}.detail[0]`, subject: record.subject, system: record.system, explanation: '하위 경로 인용' },
      { evidenceId: `${record.id}[2]`, explanation: '색인 인용' },
      { evidenceId: 'self.saju.nothing.here', explanation: '없는 근거' },
    ] };
    normalizeCodexEvidence(parsed, contract);
    expect(parsed.evidence.map(row => row.evidenceId)).toEqual([record.id, record.id]);
  });
});
