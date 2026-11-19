// 2026-11-19 다시 시도 우선: 네오 수정 라운드가 서버에서 실패로 끝나면(포함 횟수 미차감) 결과 화면은
// 첫 브리핑을 그대로 두고 '같은 답변으로 다시 시도' 버튼을 보인다. 버튼은 sessionId 만 보내 서버가 저장된 답변으로
// 실패한 라운드를 이어 쓰게 하고(neo-operation-room.js resumeFailed), 다시 실패해도 같은 안내로 돌아와 반복할 수 있다.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const load = (file, extra = {}) => { const ctx = { exports: {}, require: () => ({}), ...extra }; vm.runInNewContext(transpile(fs.readFileSync(file, 'utf8')), ctx); return ctx.exports; };
const page = fs.readFileSync('src/features/neo-war-room/NeoOperationRoomResultPage.tsx', 'utf8').replace(/\r\n/g, '\n');

test('다시 시도 안내는 완성된 첫 브리핑의 실패한 수정 라운드에만, 남은 포함 횟수가 있을 때만 열린다', () => {
  const { neoRefinementRetryable } = load('src/features/neo-war-room/paid-delivery.ts');
  const cases = [
    [{ status: 'completed', refinementStatus: 'generation_failed', refinementAllowance: { remaining: 2 } }, true],
    [{ status: 'completed', refinementStatus: 'generation_failed' }, true],
    [{ status: 'completed', refinementStatus: 'generation_failed', refinementAllowance: { remaining: 0 } }, false],
    [{ status: 'completed', refinementStatus: 'generating', refinementAllowance: { remaining: 1 } }, false],
    [{ status: 'completed', refinementStatus: 'completed', refinementAllowance: { remaining: 1 } }, false],
    [{ status: 'generation_failed', refinementStatus: 'generation_failed' }, false],
    [null, false],
  ];
  for (const [session, expected] of cases) assert.equal(neoRefinementRetryable(session), expected, JSON.stringify(session));
});

test('결과 화면은 실패한 수정 라운드에 같은 답변 다시 시도 버튼과 무료 안내를 보이고, 버튼은 sessionId 만 보낸다', () => {
  const notice = page.match(/\{!isGenerating && briefing && neoRefinementRetryable\(session\) \? \(([\s\S]*?)\) : null\}/);
  assert.ok(notice, '다시 시도 안내 블록');
  assert.match(notice[1], /onClick=\{\(\) => void handleRefine\(\{ sameAnswer: true \}\)\}/);
  assert.match(notice[1], /resultCopy\.refineRetrySameAnswer/);
  assert.match(notice[1], /resultCopy\.refineRetryFreeNote/);
  assert.match(notice[1], /disabled=\{refining\}/);
  assert.match(page, /JSON\.stringify\(sameAnswer \? \{ sessionId: session\.sessionId \} : \{/);
  // 같은 답변 다시 시도는 답변 입력 검사를 건너뛴다(입력란이 비어 있어도 저장된 답변으로 이어 쓴다).
  assert.match(page, /if \(!sameAnswer && !selectedChecks\.length && freeform\.trim\(\)\.length < 4\)/);
});

test('서버 실패 확정·폴링 실패·새로고침 뒤 실패는 원시 오류 코드 대신 다시 시도 안내로 돌아와 반복할 수 있다', () => {
  assert.match(page, /if \(refinementFailed\) \{ markRefinementFailed\(\); return; \}/);
  assert.match(page, /else if \(caught instanceof Error && caught\.message === "LLM_ERROR"\) markRefinementFailed\(\);/);
  assert.match(page, /if \(phase === "refinement" && code === "LLM_ERROR" && !tossDenied\) \{ setSession\(current => current \? \{ \.\.\.current, refinementStatus: "generation_failed" \} : current\); return; \}/);
  const mark = page.match(/function markRefinementFailed\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(mark);
  assert.match(mark[1], /refinementStatus: "generation_failed"/);
});

test('다시 시도 문구는 다섯 저작 로케일 모두에 있다', () => {
  const { getNeoResultCopy } = load('src/features/neo-war-room/data/result-copy.ts');
  const tables = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'].map(getNeoResultCopy);
  assert.equal(new Set(tables).size, 5);
  for (const table of tables) for (const key of ['refineRetrySameAnswer', 'refineRetryFreeNote', 'refineGenericErrorRetry']) assert.ok(String(table[key] || '').trim(), key);
});
