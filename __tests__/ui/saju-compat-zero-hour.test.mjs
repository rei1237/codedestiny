import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// 기본 사주 궁합: 상대 출생 시각 0시(자시)가 12시로 바뀌던 결함(parseInt(...)||12)의 회귀 방지.
// 실제 runCompatCore 선언을 꺼내 실행하고, 시각이 사주 변환 호출까지 그대로 가는지 본다.
const source = fs.readFileSync(new URL('../../js/saju-engine.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('saju-engine.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let runCompatCoreSrc = '';
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'runCompatCore') runCompatCoreSrc = node.getText(ast);
}
assert.ok(runCompatCoreSrc, 'Production declaration missing: runCompatCore');

async function hourSeenByConversion(hourFieldValue) {
  const seen = [];
  const fields = { compatBirthHour: { value: hourFieldValue }, compatBirthMinute: { value: '0' } };
  const sandbox = {
    document: {
      getElementById: (id) => fields[id] || null,
      getElementsByName: () => [{ checked: true, value: 'solar' }],
    },
    window: {},
    alert: () => {},
    getActualSolarDateWithContext: async (_bd, _cal, opts) => {
      seen.push(opts.hour);
      return null; // 변환 실패 경로로 즉시 종료 — 시각만 확인한다
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(runCompatCoreSrc + '\nthis.__run = runCompatCore;', sandbox, { filename: 'actual-run-compat-core.js' });
  await sandbox.__run(null, '상대', '1990-05-01', 'love');
  return seen;
}

test('궁합 상대 출생 시각 0시는 12시로 바뀌지 않는다', async () => {
  assert.deepEqual(await hourSeenByConversion('0'), [0]);
});

test('궁합 상대 출생 시각이 비었거나 숫자가 아니면 기본 12시', async () => {
  assert.deepEqual(await hourSeenByConversion(''), [12]);
  assert.deepEqual(await hourSeenByConversion('abc'), [12]);
});

test('궁합 상대 출생 시각 1~23시는 그대로', async () => {
  assert.deepEqual(await hourSeenByConversion('23'), [23]);
  assert.deepEqual(await hourSeenByConversion('7'), [7]);
});

test('유명인 프리필도 0시를 12시로 대체하지 않는다', () => {
  const m = source.match(/hour:\s*([^\n]*nameBtn\.dataset\.hour[^\n]*),\n/);
  assert.ok(m, 'celeb prefill hour 식을 찾지 못했다');
  const evalHour = (v) => vm.runInNewContext(m[1].replace(/nameBtn\.dataset/g, 'dataset'), { dataset: { hour: v } });
  assert.equal(evalHour('0'), 0);
  assert.equal(evalHour(undefined), 12);
  assert.equal(evalHour('21'), 21);
});
