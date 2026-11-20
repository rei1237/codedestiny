import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDED_FLOW_TIMING, LANDING, createStepController, resolveRestoreIndex, progressSteps,
  stepFromSearch, urlWithStep, historyStateFor, readHistoryState, snapshotKey, serializeSnapshot, parseSnapshot,
} from '../../lib/guided-flow/step-controller.mjs';

// 명세 docs/context/guided-step-flow-spec.md §2 의 확정값을 고정한다.
const STEPS = [
  { id: 'topic', kind: 'choice' },
  { id: 'detail', kind: 'input' },
  { id: 'reading', kind: 'wait', history: 'none', transient: true, restoreTo: 'result' },
  { id: 'result', kind: 'result' },
];

function fakeScheduler() {
  let now = 0, seq = 0;
  const queue = new Map();
  return {
    set(fn, ms) { const handle = ++seq; queue.set(handle, { fn, at: now + ms }); return handle; },
    clear(handle) { queue.delete(handle); },
    tick(ms) {
      const end = now + ms;
      for (;;) {
        let due = null;
        for (const entry of queue) if (entry[1].at <= end && (!due || entry[1].at < due[1].at)) due = entry;
        if (!due) break;
        queue.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
    get pending() { return queue.size; },
  };
}

function setup(options = {}) {
  const scheduler = fakeScheduler();
  const controller = createStepController({ steps: STEPS, scheduler, ...options });
  const events = [];
  controller.on((event) => events.push({ type: event.type, step: event.step.id, advance: event.advance, restored: event.restored }));
  return { scheduler, controller, events, id: () => (controller.getState().index >= 0 ? STEPS[controller.getState().index].id : 'landing') };
}

test('timing constants match the approved spec', () => {
  assert.deepEqual({ ...GUIDED_FLOW_TIMING }, { autoAdvanceMs: 450, minWaitMs: 1200, slowWaitMs: 3000 });
  assert.equal(progressSteps(STEPS).length, 3);
});

test('single choice auto-advances after exactly 450ms', () => {
  const { scheduler, controller, events, id } = setup();
  assert.equal(id(), 'landing');
  controller.next();
  assert.equal(id(), 'topic');
  controller.select('love');
  assert.equal(controller.getState().pendingAuto, true);
  scheduler.tick(449);
  assert.equal(id(), 'topic');
  scheduler.tick(1);
  assert.equal(id(), 'detail');
  assert.equal(controller.getState().pendingAuto, false);
  const complete = events.find((event) => event.type === 'stepComplete');
  assert.deepEqual(complete, { type: 'stepComplete', step: 'topic', advance: 'auto', restored: undefined });
});

test('re-selecting another chip restarts the 450ms timer; same chip cancels it', () => {
  const { scheduler, controller, id } = setup();
  controller.next();
  controller.select('love');
  scheduler.tick(300);
  controller.select('money');
  scheduler.tick(300);
  assert.equal(id(), 'topic', 'old timer must not fire after a re-select');
  scheduler.tick(150);
  assert.equal(id(), 'detail');
  assert.equal(controller.getState().answers.topic, 'money');

  controller.back();
  assert.equal(id(), 'topic');
  controller.select('money');
  assert.equal(controller.getState().answers.topic, undefined, 'tapping the selected chip clears it');
  assert.equal(scheduler.pending, 0);
  scheduler.tick(1000);
  assert.equal(id(), 'topic');

  controller.select('career');
  assert.equal(controller.cancelAutoAdvance(), true);
  scheduler.tick(1000);
  assert.equal(id(), 'topic');
  assert.equal(controller.getState().answers.topic, 'career');
});

test('input steps only advance by CTA and need an answer', () => {
  const { controller, id } = setup();
  controller.next();
  controller.select('love');
  controller.next();
  assert.equal(id(), 'detail');
  assert.equal(controller.next(), false);
  controller.setAnswer('   ');
  assert.equal(controller.next(), false);
  controller.setAnswer('이직 고민');
  assert.equal(controller.select('x'), false, 'select is for choice steps only');
});

test('wait step holds 1.2s, raises the slow line at 3s, and tap skips the minimum', () => {
  const { scheduler, controller, events, id } = setup();
  controller.next(); controller.select('love'); controller.next(); controller.setAnswer('a');
  controller.next();
  assert.equal(id(), 'reading');
  scheduler.tick(1199);
  assert.equal(id(), 'reading');
  scheduler.tick(1);
  assert.equal(id(), 'result');
  assert.ok(events.some((event) => event.type === 'flowComplete'));

  const sched = fakeScheduler();
  const work = createStepController({ steps: [{ id: 'calc', kind: 'wait', awaitWork: true }, { id: 'done', kind: 'result' }], scheduler: sched });
  work.next();
  sched.tick(2999);
  assert.equal(work.getState().waiting.slow, false);
  sched.tick(1);
  assert.equal(work.getState().waiting.slow, true, 'character line after 3s');
  work.workDone();
  assert.equal(work.getState().index, 1);

  const tap = setup();
  tap.controller.next(); tap.controller.select('love'); tap.controller.next(); tap.controller.setAnswer('a'); tap.controller.next();
  tap.controller.skipWait();
  assert.equal(tap.id(), 'result');
  assert.equal(tap.events.filter((event) => event.type === 'stepComplete').at(-1).advance, 'skip');
});

test('back keeps answers and skips transient steps; back from the first step returns to landing', () => {
  const { scheduler, controller, id } = setup();
  controller.next(); controller.select('love'); scheduler.tick(450);
  controller.setAnswer('a'); controller.next(); scheduler.tick(1200);
  assert.equal(id(), 'result');
  controller.back();
  assert.equal(id(), 'detail', 'result → back skips the wait step');
  assert.equal(controller.getState().direction, 'back');
  assert.equal(controller.getState().answers.detail, 'a');
  controller.back();
  controller.back();
  assert.equal(id(), 'landing');
  assert.equal(controller.getState().index, LANDING);
  assert.equal(controller.back(), false);
  assert.equal(controller.getState().answers.topic, 'love');
});

test('reduced motion: no auto-advance, no staged wait, and switching it on cancels a pending timer', () => {
  const reduced = setup({ reducedMotion: true });
  reduced.controller.next();
  reduced.controller.select('love');
  assert.equal(reduced.controller.getState().pendingAuto, false);
  reduced.scheduler.tick(5000);
  assert.equal(reduced.id(), 'topic');
  reduced.controller.next();
  reduced.controller.setAnswer('a');
  reduced.controller.next();
  assert.equal(reduced.id(), 'result', 'deterministic wait finishes immediately');

  const toggled = setup();
  toggled.controller.next();
  toggled.controller.select('love');
  toggled.controller.setReducedMotion(true);
  assert.equal(toggled.scheduler.pending, 0);
  toggled.scheduler.tick(1000);
  assert.equal(toggled.id(), 'topic');
});

test('refresh restore: result comes back without the wait; transient and incomplete URLs are corrected', () => {
  const first = setup();
  first.controller.next(); first.controller.select('love'); first.scheduler.tick(450);
  first.controller.setAnswer('a'); first.controller.next(); first.scheduler.tick(1200);
  const raw = serializeSnapshot(first.controller.getState(), STEPS);

  const reload = setup();
  const saved = parseSnapshot(raw, STEPS);
  assert.deepEqual(saved, { stepId: 'result', answers: { topic: 'love', detail: 'a' } });
  reload.controller.restore({ stepId: stepFromSearch('?step=result'), answers: saved.answers });
  assert.equal(reload.id(), 'result');
  assert.equal(reload.scheduler.pending, 0, 'no loading timer on restore');
  assert.deepEqual(reload.events.map((event) => [event.type, event.step, event.restored]), [['stepView', 'result', true], ['flowComplete', 'result', true]]);

  assert.equal(resolveRestoreIndex(STEPS, 'reading', saved.answers), 3, 'wait step restores to result');
  assert.equal(resolveRestoreIndex(STEPS, 'result', {}), 0, 'shared ?step=result without answers → first step');
  assert.equal(resolveRestoreIndex(STEPS, 'result', { topic: 'love' }), 1);
  assert.equal(resolveRestoreIndex(STEPS, null, saved.answers), LANDING);
  assert.equal(resolveRestoreIndex(STEPS, 'nope', saved.answers), LANDING);

  const popped = setup();
  popped.controller.restore({ stepId: 'topic', answers: {} });
  assert.equal(popped.controller.goTo('result', { source: 'history' }), false, 'history to an unreachable step stays put');
  assert.equal(popped.id(), 'topic');
});

test('snapshot parser rejects malformed or foreign data', () => {
  for (const raw of ['', null, '{', '[]', JSON.stringify({ version: 2, stepId: null, answers: {} }),
    JSON.stringify({ version: 1, stepId: 'evil', answers: {} }),
    JSON.stringify({ version: 1, stepId: 'topic', answers: { topic: { html: '<b>' } } })]) {
    assert.equal(parseSnapshot(raw, STEPS), null, String(raw));
  }
  assert.deepEqual(parseSnapshot(JSON.stringify({ version: 1, stepId: 'topic', answers: { topic: 'love', other: 'x' } }), STEPS), { stepId: 'topic', answers: { topic: 'love' } });
  assert.equal(snapshotKey('demo'), 'cd:demo:guided:v1');
});

test('URL and history helpers keep other params and reject junk', () => {
  assert.equal(urlWithStep('/dev/guided-flow/?utm_source=x#top', 'topic'), '/dev/guided-flow/?utm_source=x&step=topic#top');
  assert.equal(urlWithStep('/dev/guided-flow/?step=topic&utm_source=x', null), '/dev/guided-flow/?utm_source=x');
  assert.equal(stepFromSearch('?step=topic'), 'topic');
  assert.equal(stepFromSearch('?step=<script>'), null);
  assert.equal(stepFromSearch(''), null);
  const state = historyStateFor('demo', 'detail', 2);
  assert.deepEqual(readHistoryState(state, 'demo'), { step: 'detail', position: 2 });
  assert.equal(readHistoryState(state, 'other'), null);
  assert.equal(readHistoryState(null, 'demo'), null);
});

test('invalid step definitions fail closed', () => {
  assert.throws(() => createStepController({ steps: [] }));
  assert.throws(() => createStepController({ steps: [{ id: 'a', kind: 'choice' }, { id: 'a', kind: 'input' }] }));
  assert.throws(() => createStepController({ steps: [{ id: 'a', kind: 'carousel' }] }));
  assert.throws(() => createStepController({ steps: [{ id: 'a', kind: 'wait', restoreTo: 'missing' }] }));
});
