/** @jest-environment node */
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// worker/index.js 의 scheduled 메서드 본문만 떼어 vm 에서 돌린다(다른 scheduled 테스트와 같은 방식).
// import() 는 __import 로 바꿔 모듈 로드 성공/실패/멈춤을 주입한다. 네트워크·DB·알림 채널은 한 번도 타지 않는다.
const source = readFileSync('worker/index.js', 'utf8');
const ast = ts.createSourceFile('worker/index.js', source, ts.ScriptTarget.Latest, true);
let scheduledNode;
(function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name?.getText(ast) === 'scheduled') scheduledNode = node;
  ts.forEachChild(node, visit);
})(ast);
const scheduledSource = scheduledNode.getText(ast)
  .replace(/^async scheduled/, 'async function scheduled')
  .replace(/\bimport\(/g, '__import(');

// 10분 분기의 태스크: import 경로 → 내보내는 함수 이름. 소스에서 읽어 목록이 새 태스크를 빠뜨리지 않게 한다.
const TASKS = [...scheduledSource.matchAll(/trackTask\("([\w-]+)", __import\(['"]([^'"]+)['"]\)\s*\.then\(\(\{ (\w+) \}\)/g)]
  .map(([, name, spec, fn]) => ({ name, spec, fn }));

function harness({ loadFail = {}, run = {}, notify = jest.fn(async () => ({ sent: [], suppressed: [] })) } = {}) {
  const pending = [];
  const ran = [];
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  const context = vm.createContext({
    console, Date, setTimeout, clearTimeout, PAYMENT_RECONCILE_CRON: '*/10 * * * *',
    __import: async (spec) => {
      if (spec === './lib/cron-tick-failure-alert.js') return { notifyTickFailures: notify };
      const task = TASKS.find((row) => row.spec === spec);
      if (!task) throw new Error(`unexpected import ${spec}`);
      if (loadFail[task.name]) throw new Error(loadFail[task.name]);
      return { [task.fn]: async () => { ran.push(task.name); return run[task.name]?.(); } };
    },
  });
  vm.runInContext(scheduledSource, context);
  const start = () => context.scheduled({ cron: '*/10 * * * *' }, {}, { waitUntil: (work) => pending.push(work) });
  return { start, pending, ran, notify, errors };
}

afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('the task list was read from the source (guards the regex against drifting from the code)', () => {
  expect(TASKS.length).toBeGreaterThanOrEqual(19);
  expect(TASKS.map((row) => row.name)).toEqual(expect.arrayContaining(['payment-reconcile', 'delivery-review-alert', 'threads-daily-jobs']));
});

test('one module-load failure does not stop the other tasks and the alert carries it as a load failure', async () => {
  const h = harness({ loadFail: { 'toss-order-reconciliation': 'syntax boom' } });
  await h.start(); // 예전에는 첫 정적 import 가 던지면 여기서 거절됐다
  await Promise.all(h.pending);
  expect(h.ran).toHaveLength(TASKS.length - 1);
  expect(h.ran).not.toContain('toss-order-reconciliation');
  expect(h.ran).toEqual(expect.arrayContaining(['payment-reconcile', 'payments-v2-reconcile', 'delivery-review-alert']));
  expect(h.notify).toHaveBeenCalledTimes(1);
  const failures = h.notify.mock.calls[0][1];
  expect(failures).toEqual([{ name: 'toss-order-reconciliation', message: 'load: syntax boom' }]);
});

test('a load failure in the last task and a run failure in another are both alerted, once', async () => {
  const h = harness({
    loadFail: { 'delivery-review-alert': 'late load boom' },
    run: { 'payment-reconcile': async () => { throw new Error('db down'); } },
  });
  await h.start();
  await Promise.all(h.pending);
  expect(h.notify).toHaveBeenCalledTimes(1);
  expect(h.notify.mock.calls[0][1]).toEqual(expect.arrayContaining([
    { name: 'delivery-review-alert', message: 'load: late load boom' },
    { name: 'payment-reconcile', message: 'db down' },
  ]));
  expect(h.ran).toContain('payments-v2-reconcile');
});

test('no failures means no alert call', async () => {
  const h = harness();
  await h.start();
  await Promise.all(h.pending);
  expect(h.ran).toHaveLength(TASKS.length);
  expect(h.notify).not.toHaveBeenCalled();
});

test('a task that never settles is reported as timeout at the deadline, a sibling failure is still alerted, and the task is not cancelled', async () => {
  jest.useFakeTimers();
  let finishHung;
  const hung = new Promise((resolveHung) => { finishHung = resolveHung; });
  const h = harness({
    run: {
      'master-love-codex-recovery': () => hung,
      'payment-reconcile': async () => { throw new Error('db down'); },
    },
  });
  // 가짜 타이머 뒤에 만든 컨텍스트의 setTimeout 이 가짜여야 하므로 harness 는 jest.useFakeTimers() 뒤에 만든다.
  await h.start();
  await jest.advanceTimersByTimeAsync(7 * 60_000);
  expect(h.notify).not.toHaveBeenCalled(); // 시한(8분) 전에는 알리지 않는다
  await jest.advanceTimersByTimeAsync(60_000 + 1);
  expect(h.notify).toHaveBeenCalledTimes(1);
  const failures = h.notify.mock.calls[0][1];
  expect(failures).toEqual(expect.arrayContaining([
    { name: 'payment-reconcile', message: 'db down' },
    { name: 'master-love-codex-recovery', message: expect.stringMatching(/^timeout:/) },
  ]));
  expect(failures).toHaveLength(2);
  // 취소되지 않았다: waitUntil 에 등록된 원래 promise 는 아직 대기 중이고, 풀어 주면 끝난다.
  let settled = false;
  const all = Promise.all(h.pending).then(() => { settled = true; });
  await jest.advanceTimersByTimeAsync(0);
  expect(settled).toBe(false);
  finishHung();
  await all;
  expect(settled).toBe(true);
  expect(h.notify).toHaveBeenCalledTimes(1);
});

test('the deadline timer is cleared when the tasks settle first', async () => {
  jest.useFakeTimers();
  const h = harness();
  await h.start();
  await jest.advanceTimersByTimeAsync(0);
  await Promise.all(h.pending);
  expect(jest.getTimerCount()).toBe(0);
  await jest.advanceTimersByTimeAsync(9 * 60_000);
  expect(h.notify).not.toHaveBeenCalled();
});
