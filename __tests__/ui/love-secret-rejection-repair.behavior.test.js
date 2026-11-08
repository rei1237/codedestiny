// 연애 비책 체크포인트 생성기 — 반려 사유 기록, 표적 수리, 분량 수리(1-2 보정, 2026-11-08).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(ctx, file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const name of names) {
    const fn = ast.statements.find(row => ts.isFunctionDeclaration(row) && row.name?.text === name);
    assert.ok(fn, name); vm.runInContext(fn.getText(ast).replace(/^export /, ''), ctx);
  }
}

async function harness({ savedGroups, attempts = {}, generate, perspective = '' }) {
  const prompt = await import('../../worker/lib/love-secret-ai-prompt.js');
  const groups = ['a', 'b', 'c', 'd', 'e', 'f'].map(key => ({ key, ...(perspective && { perspective }) }));
  const calls = []; const checkpoints = []; const reserved = []; const logs = [];
  const ctx = vm.createContext({ Date, Promise, Map, Set, Number, Object, Array, String,
    LOVE_SECRET_AI_GROUPS: groups, LOVE_SECRET_AI_GROUP_TIMEOUT_MS: 54000, LOVE_SECRET_AI_REPAIR_TIMEOUT_MS: 24000,
    LOVE_SECRET_AI_LLM_DEADLINE_MS: 86000, LOVE_SECRET_AI_REPAIR_MIN_REMAINING_MS: 22000,
    LOVE_SECRET_AI_MIN_USABLE_GROUPS: 6, LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS: 20000,
    LOVE_SECRET_AI_GROUP_MIN_CHARS: 5000, LOVE_SECRET_AI_GROUP_MAX_CHARS: 6500, loveSecretGroupCharRange: prompt.loveSecretGroupCharRange,
    buildLoveSecretRejectionRepairLines: prompt.buildLoveSecretRejectionRepairLines,
    createLlmCacheStore: () => null, cmsPromptText: async () => '', LOVE_SECRET_AI_SYSTEM_PROMPT: '',
    buildLoveSecretGroundingTerms: () => [], logLoveSecretAi(marker, details) { logs.push({ marker, details }); },
    clean: (value, max = 0) => { const text = String(value ?? '').trim(); return max > 0 ? text.slice(0, max) : text; },
    dedupeLoveSecretSections: value => value,
    assembleLoveSecretConsultation: rows => ({ answer: '본문', rows }),
    validateLoveSecretConsultation: value => ({ issues: value.rows.filter(row => !row.ok).map(row => `SECTION_EMPTY:${row.key}`) }),
    mapLoveSecretIssuesToGroups: (_quality, rows) => new Map(rows.filter(row => !row.ok).map(row => [row.key, ['빈 그룹을 채우세요.']])),
    countLoveSecretConsultationBodyChars: value => value.rows.filter(row => row.ok).reduce((sum, row) => sum + Number(row.chars || 0), 0),
    generateLoveSecretGroup: async (_env, options) => { calls.push(options); return generate(options); },
  });
  load(ctx, 'worker/routes/love-secret-ai.js', ['generateFirstConsultation']);
  const result = await ctx.generateFirstConsultation({}, {}, {}, {}, {
    savedGroups, attempts,
    onReserve: async key => { reserved.push(key); },
    onCheckpoint: async row => { checkpoints.push(JSON.parse(JSON.stringify(row))); },
  });
  return { result, calls, checkpoints, reserved, logs, attempts };
}

const okRow = (key, chars) => ({ key, ok: true, chars, sections: [{ title: key, body: '본문' }] });
const flagged = [{ issue: 'UNSAFE_RELATIONSHIP_ADVICE', phrase: '감시하', excerpt: '…그 사람을 감시하면서 기다리세요…' }];

test('반려된 그룹은 사유·이슈·걸린 문맥을 체크포인트에 남긴다', async () => {
  const savedGroups = ['a', 'c', 'd', 'e', 'f'].map(key => okRow(key, 5200));
  const h = await harness({ savedGroups, generate: options => ({ key: options.group.key, ok: false, sections: [], chars: 0, reason: 'UNSAFE_RELATIONSHIP_ADVICE', issues: ['UNSAFE_RELATIONSHIP_ADVICE'], flagged }) });
  assert.deepEqual(h.reserved, ['b']);
  const row = h.checkpoints.find(item => item.key === 'b');
  assert.equal(row.ok, false);
  assert.equal(row.reason, 'UNSAFE_RELATIONSHIP_ADVICE');
  assert.deepEqual(row.rejection.issues, ['UNSAFE_RELATIONSHIP_ADVICE']);
  assert.equal(row.rejection.flagged[0].phrase, '감시하');
  assert.match(row.rejection.flagged[0].excerpt, /감시하면서/);
  assert.equal(h.result.complete, false);
});

test('다음 시도는 직전 반려 표현을 짚는 수리 지시와 마지막 시도 문장 덜어 내기를 싣는다', async () => {
  const savedGroups = [...['a', 'c', 'd', 'e', 'f'].map(key => okRow(key, 5200)),
    { key: 'b', ok: false, sections: [], chars: 0, reason: 'UNSAFE_RELATIONSHIP_ADVICE', rejection: { reason: 'UNSAFE_RELATIONSHIP_ADVICE', issues: ['UNSAFE_RELATIONSHIP_ADVICE'], flagged, attempt: 1 } }];
  const h = await harness({ savedGroups, attempts: { b: 1 }, generate: options => okRow(options.group.key, 5100) });
  assert.equal(h.calls.length, 1);
  const call = h.calls[0];
  assert.equal(call.group.key, 'b');
  assert.ok(call.repairLines.some(line => line.includes("'감시하'")), call.repairLines.join('\n'));
  assert.equal(call.scrubUnsafe, true);
  assert.equal(h.result.complete, true);
});

test('모든 그룹이 통과했는데 합계가 MIN 아래면 가장 짧은 그룹 하나만 분량 수리한다', async () => {
  const savedGroups = ['a', 'b', 'c', 'd', 'e', 'f'].map((key, index) => okRow(key, index === 2 ? 1800 : 3000));
  const h = await harness({ savedGroups, generate: options => okRow(options.group.key, 5600) });
  assert.deepEqual(h.reserved, ['c']);
  assert.equal(h.attempts['length:c'], 1);
  const call = h.calls[0];
  assert.ok(call.repairLines.some(line => line.includes('너무 짧습니다')));
  assert.equal(call.previousResult.key, 'c');
  // 1,800 → 5,600: 15,000 + 5,600 = 20,600 ≥ 20,000 → 완료.
  assert.equal(h.result.complete, true);
});

// 2026-11-08 분량 넉넉: V2 그룹의 분량 수리는 V2 목표(6,000~7,500자)로, V1 그룹은 예전 숫자로 다시 쓰게 한다.
test('분량 수리 지시는 V2 그룹이면 6,000~7,500자, V1 그룹이면 5,000~6,500자를 요구한다', async () => {
  const savedGroups = ['a', 'b', 'c', 'd', 'e', 'f'].map((key, index) => okRow(key, index === 2 ? 1800 : 3000));
  const v2 = await harness({ savedGroups, perspective: '관점', generate: options => okRow(options.group.key, 5600) });
  assert.ok(v2.calls[0].repairLines.some(line => line.includes('6,000~7,500자로 다시 쓰세요')));
  const v1 = await harness({ savedGroups, generate: options => okRow(options.group.key, 5600) });
  assert.ok(v1.calls[0].repairLines.some(line => line.includes('5,000~6,500자로 다시 쓰세요')));
});

test('분량 수리 한도(2회)를 쓰고도 MIN 아래면 분량은 전달을 막지 않는다', async () => {
  const savedGroups = ['a', 'b', 'c', 'd', 'e', 'f'].map(key => okRow(key, 2500));
  const h = await harness({ savedGroups, attempts: { 'length:a': 1, a: 1, 'length:b': 1, b: 1 }, generate: () => { throw new Error('UNEXPECTED_CALL'); } });
  assert.equal(h.calls.length, 0);
  assert.equal(h.result.complete, true);
});

test('분량 수리 후보가 남아 있으면 이번 요청은 미완료로 두어 다음 요청이 이어 쓴다', async () => {
  const savedGroups = ['a', 'b', 'c', 'd', 'e', 'f'].map(key => okRow(key, 2500));
  const h = await harness({ savedGroups, generate: options => okRow(options.group.key, 3000) });
  assert.equal(h.calls.length, 1);
  assert.equal(h.result.complete, false);
});
