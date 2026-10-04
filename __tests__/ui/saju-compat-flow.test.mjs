import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { requestBody, samplePairs } from '../fixtures/saju-compat-llm-fixture.mjs';
import { normalizeSajuCompatInput } from '../../worker/lib/saju-compat-schema.js';
import {
  buildSajuCompatBody, captureSajuCompatEvidence, createSajuCompatPendingStore, newSajuCompatRequestId, pillarsToWire,
  classifySajuCompatArchiveReply, findSajuCompatDuplicate, normalizeSajuCompatArchiveItems, runSajuCompatGeneration, sajuCompatArchiveDetailPath,
  sajuCompatEvidenceFromGrant, sajuCompatFailureKey, sajuCompatInputKey, SAJU_COMPAT_ARCHIVE_PATH, SAJU_COMPAT_PENDING_TTL_MS,
} from '../../js/saju-compat-flow.mjs';
import { SAJU_COMPAT_KO } from '../../js/saju-compat-render.mjs';

// 클라이언트 생성 흐름 계약: 요청 본문은 서버 검증을 통과하고, 대기 기록은 이중 결제를 막으며, 실패는 상태 코드로 분류된다.
const reader = createRequire(import.meta.url)('../../js/core/paid-narrative-reader.js');
const enginePillars = (text) => Object.fromEntries(text.split(' ').map((pair, index) => ['ymdh'[index], { g: pair[0], j: pair[1], gE: 'x', jE: 'y' }]));
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, String(value)), dump: () => [...map.entries()] };
};

test('요청 본문은 fixture(엔진 facts)와 같고 서버 입력 검증을 통과한다', () => {
  for (const [a, b] of samplePairs(77, 6)) {
    for (const type of ['love', 'business', 'friend']) {
      const expected = requestBody(a, b, type, '하늘');
      const body = buildSajuCompatBody({
        selfPillars: enginePillars(a), partnerPillars: enginePillars(b), compatType: type, partnerName: '하늘',
        compatFacts: { ...expected.facts, pastLife: undefined }, pastLifeFacts: expected.facts.pastLife,
        requestId: 'saju-compat:abc12345', evidence: { transactionId: 'tx-1', purchaseId: 'pur-1', sessionId: 's-1', requestId: 'ignored' },
      });
      assert.deepEqual({ ...body, requestId: undefined, transactionId: undefined, purchaseId: undefined, sessionId: undefined },
        { ...expected, requestId: undefined, transactionId: undefined, purchaseId: undefined, sessionId: undefined });
      assert.equal(body.requestId, 'saju-compat:abc12345');
      assert.deepEqual([body.transactionId, body.purchaseId, body.sessionId], ['tx-1', 'pur-1', 's-1']);
      assert.doesNotThrow(() => normalizeSajuCompatInput(body));
    }
  }
});

test('상대 이름은 20자로 자르고 빈 증빙 필드는 싣지 않는다', () => {
  const [a, b] = samplePairs(5, 1)[0];
  const facts = requestBody(a, b, 'love').facts;
  const body = buildSajuCompatBody({
    selfPillars: enginePillars(a), partnerPillars: enginePillars(b), compatType: 'love', partnerName: '가'.repeat(30),
    compatFacts: facts, pastLifeFacts: facts.pastLife, requestId: 'saju-compat:zzzzzzzz', evidence: { transactionId: '', requestId: 'saju-compat:zzzzzzzz' },
  });
  assert.equal(Array.from(body.partnerName).length, 20);
  assert.equal('transactionId' in body, false);
  assert.deepEqual(pillarsToWire(enginePillars('甲子 乙丑 丙寅 丁卯')).pillars.map((p) => p.gan + p.ji), ['甲子', '乙丑', '丙寅', '丁卯']);
});

test('결제 증빙은 게이트 응답(소비·접근권한 층)과 모바일 복귀 grant 에서 같은 모양으로 모인다', () => {
  assert.deepEqual(
    captureSajuCompatEvidence('', { consume: { transactionId: 'tx-9' }, accessGrant: { purchaseId: 'pur-9', sessionId: 'ses-9' } }, 'rid-1'),
    { transactionId: 'tx-9', purchaseId: 'pur-9', sessionId: 'ses-9', requestId: 'rid-1' },
  );
  assert.deepEqual(captureSajuCompatEvidence('tx-1', null, 'rid-2'), { transactionId: 'tx-1', purchaseId: 'tx-1', sessionId: '', requestId: 'rid-2' });
  assert.deepEqual(
    sajuCompatEvidenceFromGrant({ transactionId: 'tx-3', payload: { accessGrant: { purchaseId: 'pur-3' } }, merchantUid: 'm-1' }),
    { transactionId: 'tx-3', purchaseId: 'pur-3', sessionId: '', requestId: 'm-1' },
  );
  assert.equal(sajuCompatEvidenceFromGrant(null), null);
  assert.match(newSajuCompatRequestId(), /^saju-compat:[0-9a-z]+-[0-9a-z]+$/);
  assert.ok(newSajuCompatRequestId().length >= 8 && newSajuCompatRequestId().length <= 180);
});

test('입력 키는 내 사주·상대 폼·유형이 모두 같을 때만 같다', () => {
  const base = { selfPillars: enginePillars('甲子 乙丑 丙寅 丁卯'), name: '하늘', birth: '1990-01-01', calType: 'solar', hour: '0', minute: '0', type: 'love' };
  const key = sajuCompatInputKey(base);
  assert.equal(sajuCompatInputKey({ ...base }), key);
  for (const change of [{ name: '바다' }, { birth: '1990-01-02' }, { calType: 'lunar' }, { hour: '12' }, { minute: '30' }, { type: 'business' }, { selfPillars: enginePillars('甲子 乙丑 丙寅 戊辰') }]) {
    assert.notEqual(sajuCompatInputKey({ ...base, ...change }), key, JSON.stringify(Object.keys(change)));
  }
  assert.notEqual(sajuCompatInputKey({ ...base, hour: '' }), sajuCompatInputKey({ ...base, hour: '0' }));
});

test('대기 기록: 저장·갱신·삭제·만료·계정 분리·개수 상한, 상대 정보는 평문으로 남지 않는다', () => {
  const storage = memoryStorage();
  let clock = 1_000_000;
  const store = createSajuCompatPendingStore({ storage, ownerId: 'u1', now: () => clock });
  assert.equal(store.enabled, true);
  const key = '甲子乙丑丙寅丁卯|하늘|1990-01-01|solar|0|0|love';
  assert.equal(store.get(key), null);
  store.put(key, { requestId: 'saju-compat:one', evidence: { transactionId: 'tx-1' } });
  assert.equal(store.get(key).requestId, 'saju-compat:one');
  store.update(key, { body: { resumeResultId: 'r-1' }, resultId: 'r-1' });
  assert.deepEqual(store.get(key).body, { resumeResultId: 'r-1' });
  assert.equal(store.get(key).evidence.transactionId, 'tx-1');
  assert.doesNotMatch(JSON.stringify(storage.dump()), /하늘|1990-01-01/);
  assert.equal(createSajuCompatPendingStore({ storage, ownerId: 'u2', now: () => clock }).get(key), null);
  store.update('없는 키', { body: {} });
  assert.equal(store.get('없는 키'), null);
  clock += SAJU_COMPAT_PENDING_TTL_MS + 1;
  assert.equal(store.get(key), null, '만료된 기록은 이중 결제 방지 대상에서 빠진다');
  clock += 1;
  for (let i = 0; i < 8; i += 1) { clock += 10; store.put(`k${i}`, { requestId: `saju-compat:${i}0000000` }); }
  assert.equal(store.get('k0'), null);
  assert.equal(store.get('k2'), null);
  assert.ok(store.get('k3') && store.get('k7'));
  store.clear('k7');
  assert.equal(store.get('k7'), null);
  assert.equal(createSajuCompatPendingStore({ storage, ownerId: '' }).enabled, false);
  assert.equal(createSajuCompatPendingStore({ ownerId: 'u1' }).enabled, false);
  createSajuCompatPendingStore({ storage: { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }, ownerId: 'u1' }).put('k', {});
});

const harness = (replies, extra = {}) => {
  const calls = [];
  const progress = [];
  const persisted = [];
  const queue = [...replies];
  const send = async (body) => {
    calls.push(body === undefined ? 'GET' : body);
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return next;
  };
  return {
    calls, progress, persisted,
    run: (body = { requestId: 'rid' }) => runSajuCompatGeneration({
      reader, body, post: send, get: () => send(), wait: async () => {}, persist: (b, id) => persisted.push([b, id]),
      onProgress: (data) => progress.push(data), ...extra,
    }),
  };
};
const part = (done) => ({ status: 202, payload: { ok: true, saved: false, status: 'in_progress', retryable: true, resultId: 'res-1', resumeBody: { resumeResultId: 'res-1' }, completedParts: done, totalParts: 4, retryAfterMs: 1 } });
const done = { status: 200, payload: { ok: true, saved: true, status: 'completed', resultId: 'res-1', schemaVersion: 1, facts: { score: { display: 80 } }, narrative: {} } };

test('시작 POST → 이어받기 POST 를 거쳐 완료 스냅샷을 돌려주고 진행 상황과 이어받기 본문을 알린다', async () => {
  const h = harness([part(1), part(2), part(3), done]);
  const result = await h.run();
  assert.equal(result.ok, true);
  assert.equal(result.resultId, 'res-1');
  assert.equal(result.snapshot.facts.score.display, 80);
  assert.deepEqual(h.calls, [{ requestId: 'rid' }, { resumeResultId: 'res-1' }, { resumeResultId: 'res-1' }, { resumeResultId: 'res-1' }]);
  assert.deepEqual(h.progress.map((p) => p.completedParts), [1, 2, 3]);
  assert.deepEqual(h.persisted[0], [{ resumeResultId: 'res-1' }, 'res-1']);
});

test('실패는 마지막 응답으로 분류된다: 환불·한도·불일치·미확인 결제·전송 오류', async () => {
  const cases = [
    [[{ status: 403, payload: { ok: false } }], 'REVOKED', false, true],
    [[part(1), { status: 202, payload: { ok: true, saved: false, retryable: false, code: 'DELIVERY_REVIEW_REQUIRED', resultId: 'res-1', resumeBody: { resumeResultId: 'res-1' } } }], 'REVIEW_REQUIRED', false, false],
    [[{ status: 503, payload: { ok: false, retryable: false, reason: 'RESULT_STORAGE_UNAVAILABLE', resultId: 'res-9' } }], 'REVIEW_REQUIRED', false, false],
    [[{ status: 409, payload: { ok: false } }], 'INPUT_MISMATCH', false, true],
    [[{ status: 404, payload: { ok: false } }], 'NOT_FOUND', false, true],
    [[{ status: 402, payload: { ok: false, code: 'PAYMENT_REQUIRED' } }], 'PAYMENT_UNCONFIRMED', true, false],
    [[{ status: 401, payload: { ok: false } }], 'AUTH', true, false],
    [[new Error('network')], 'TRANSPORT', true, false],
    [[{ status: 500, payload: { ok: false, message: '서버 오류' } }], 'TRANSPORT', true, false],
  ];
  for (const [replies, code, retryable, clearPending] of cases) {
    const result = await harness(replies).run();
    assert.equal(result.ok, false, code);
    assert.deepEqual([result.code, result.retryable, result.clearPending], [code, retryable, clearPending], JSON.stringify(replies));
  }
  assert.equal((await harness([{ status: 503, payload: { ok: false, retryable: false, resultId: 'res-9' } }]).run()).resultId, 'res-9');
});

test('화면이 비활성·숨김이면 중단으로 돌려주고, 완료 응답 없이 끝나면 재시도 가능으로 본다', async () => {
  const hidden = await harness([part(1)], { visible: () => false }).run();
  assert.deepEqual([hidden.ok, hidden.code, hidden.retryable], [false, 'INTERRUPTED', true]);
  const inactive = await harness([part(1)], { active: () => false }).run();
  assert.deepEqual([inactive.ok, inactive.code], [false, 'INTERRUPTED']);
});

test('실패 코드별 안내 문구 키는 모두 번역 정본(SAJU_COMPAT_KO)에 있다', () => {
  for (const code of ['REVOKED', 'REVIEW_REQUIRED', 'INPUT_MISMATCH', 'NOT_FOUND', 'PAYMENT_UNCONFIRMED', 'AUTH', 'TRANSPORT', 'INTERRUPTED', 'EMPTY']) {
    assert.ok(SAJU_COMPAT_KO[sajuCompatFailureKey(code)], code);
  }
});

const archiveRow = (id, createdAt, extra = {}) => ({ resultId: id, createdAt, generatedAt: createdAt, compatType: 'love', partnerName: '하늘', selfKey: '甲子 乙丑 丙寅 丁卯', partnerKey: '戊辰 己巳 庚午 辛未', score: 71, grade: 'B', pastLifeGrade: 'C', ...extra });

test('보관함 경로와 응답 분류: 401 로그인·403 철회·404 없음·본문 이상·그 밖 오류를 가른다', () => {
  assert.equal(SAJU_COMPAT_ARCHIVE_PATH, '/api/saju-compat-basic/archive');
  assert.equal(sajuCompatArchiveDetailPath('exec/1 2'), '/api/saju-compat-basic/archive/exec%2F1%202');
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 401, payload: {} }, 'list'), { state: 'login' });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 403, payload: { ok: false, reason: 'PAYMENT_REVOKED' } }, 'detail'), { state: 'revoked' });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 404, payload: {} }, 'detail'), { state: 'notFound' });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 200, payload: { ok: true, resultId: 'r1', createdAt: '2026-10-04T01:00:00Z', result: { schemaVersion: 1 } } }, 'detail'),
    { state: 'detail', resultId: 'r1', createdAt: '2026-10-04T01:00:00Z', result: { schemaVersion: 1 } });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 200, payload: { ok: true, resultId: 'r1' } }, 'detail'), { state: 'unreadable' });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 503, payload: { ok: false, retryable: true } }, 'list'), { state: 'error', retryable: true });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 500, payload: { ok: false, retryable: false } }, 'list'), { state: 'error', retryable: false });
  assert.deepEqual(classifySajuCompatArchiveReply({ status: 0, payload: {} }, 'list'), { state: 'error', retryable: true });
  assert.equal(classifySajuCompatArchiveReply({ status: 200, payload: { ok: true, items: [archiveRow('a', '2026-10-01T00:00:00Z')] } }, 'list').items.length, 1);
});

test('보관함 목록 정규화: resultId 없는 행은 버리고 최신순으로 두며 점수는 숫자·없으면 null', () => {
  const items = normalizeSajuCompatArchiveItems([
    archiveRow('old', '2026-10-01T00:00:00Z'), null, { createdAt: '2026-10-09T00:00:00Z' },
    archiveRow('new', '2026-10-03T00:00:00Z', { score: null }), archiveRow('mid', '2026-10-02T00:00:00Z', { score: '88' }),
  ]);
  assert.deepEqual(items.map((item) => item.resultId), ['new', 'mid', 'old']);
  assert.deepEqual(items.map((item) => item.score), [null, 88, 71]);
  assert.deepEqual(normalizeSajuCompatArchiveItems(undefined), []);
});

test('결제 전 중복 판정: 내 사주·유형·상대 이름이 같은 가장 최근 결과만 돌려주고, 기둥이 없으면 null', () => {
  const items = [archiveRow('older', '2026-10-01T00:00:00Z'), archiveRow('newer', '2026-10-02T00:00:00Z'),
    archiveRow('other-type', '2026-10-03T00:00:00Z', { compatType: 'friend' }), archiveRow('other-name', '2026-10-03T00:00:00Z', { partnerName: '바다' }),
    archiveRow('other-self', '2026-10-03T00:00:00Z', { selfKey: '癸亥 乙丑 丙寅 丁卯' })];
  const self = enginePillars('甲子 乙丑 丙寅 丁卯');
  assert.equal(findSajuCompatDuplicate(items, { selfPillars: self, compatType: 'love', partnerName: '하늘' }).resultId, 'newer');
  assert.equal(findSajuCompatDuplicate(items, { selfPillars: self, compatType: 'friend', partnerName: '하늘' }).resultId, 'other-type');
  assert.equal(findSajuCompatDuplicate(items, { selfPillars: self, compatType: 'business', partnerName: '하늘' }), null);
  assert.equal(findSajuCompatDuplicate(items, { selfPillars: {}, compatType: 'love', partnerName: '하늘' }), null);
  assert.equal(findSajuCompatDuplicate([], { selfPillars: self, compatType: 'love', partnerName: '하늘' }), null);
});
