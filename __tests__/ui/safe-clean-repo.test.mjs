import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createPlan, applyPlan, checkedPath } from '../../scripts/safe-clean-repo.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-cleanup-'));
  execFileSync('git', ['init', '-q', root]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, body = 'temporary') => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), body);
  };
  return { root, write };
}
test('planning is read-only and excludes tracked, state and final files', t => {
  const { root, write } = fixture(t);
  ['scratch.log', 'tracked.log', '.wrangler/state.log', 'output/final.log', '.env.local', 'source.js'].forEach(n => write(n));
  execFileSync('git', ['add', 'tracked.log'], { cwd: root });
  const before = fs.readdirSync(root);
  const plan = createPlan(root, ['scratch.log', 'tracked.log', '.wrangler/state.log', 'output/final.log', '.env.local', 'source.js']);
  assert.deepEqual(plan.candidates.map(x => x.path), ['scratch.log']);
  assert.equal(plan.skipped.length, 5);
  assert.deepEqual(fs.readdirSync(root), before);
});
test('changed file aborts the whole batch before any removal', t => {
  const { root, write } = fixture(t);
  write('a.log'); write('b.log');
  const plan = createPlan(root);
  write('b.log', 'another session is writing');
  assert.throws(() => applyPlan(root, plan), /changed/);
  assert.ok(fs.existsSync(path.join(root, 'a.log')));
});
test('apply removes only manifest files, preserving newly created siblings', t => {
  const { root, write } = fixture(t);
  write('.tmp/old.log');
  const plan = createPlan(root, ['.tmp/old.log']);
  write('.tmp/new.log');
  assert.deepEqual(applyPlan(root, plan).deleted, ['.tmp/old.log']);
  assert.ok(fs.existsSync(path.join(root, '.tmp/new.log')));
});
test('traversal, absolute paths, directories and junctions are rejected', t => {
  const { root, write } = fixture(t);
  write('tmp/data.log');
  for (const value of ['../a.log', '/tmp/a.log', 'C:/tmp/a.log', 'tmp/../data.log', 'tmp']) assert.throws(() => checkedPath(root, value));
  fs.symlinkSync(path.join(root, 'tmp'), path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => checkedPath(root, 'linked/data.log'), /junction/);
});
test('wrong workspace, duplicate or newly tracked candidates cannot be applied', t => {
  const { root, write } = fixture(t);
  write('a.log');
  const plan = createPlan(root);
  assert.throws(() => applyPlan(root, { ...plan, root: 'elsewhere' }), /workspace/);
  assert.throws(() => applyPlan(root, { ...plan, candidates: [...plan.candidates, ...plan.candidates] }), /duplicate/);
  execFileSync('git', ['add', 'a.log'], { cwd: root });
  assert.throws(() => applyPlan(root, plan), /tracked/);
});
