const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../../scripts/measure-android-startup.mjs');

test('only named test packages are allowed; production and lookalike packages are rejected', async () => {
  const { requireBenchmarkPackage } = await load();
  for (const suffix of ['', '.baseline', '.candidate']) assert.equal(requireBenchmarkPackage('com.codedestiny.app.benchmark' + suffix), 'com.codedestiny.app.benchmark' + suffix);
  for (const name of ['com.codedestiny.app', 'com.codedestiny.app.benchmark.production', '', undefined]) assert.throws(() => requireBenchmarkPackage(name));
});

test('locked and unknown phone states cannot produce successful measurements', async () => {
  const { requireUnlockedDevice } = await load();
  assert.doesNotThrow(() => requireUnlockedDevice('KeyguardStateMonitor\n mIsShowing=false'));
  assert.doesNotThrow(() => requireUnlockedDevice('KeyguardServiceDelegate\n showing=false\n'));
  assert.throws(() => requireUnlockedDevice('KeyguardStateMonitor\n mIsShowing=true'), /Unlock/);
  assert.throws(() => requireUnlockedDevice('permission denied'), /Cannot verify/);
});

test('missing and failed launches are never counted as zero milliseconds', async () => {
  const { launchTime } = await load();
  assert.equal(launchTime('Status: ok\nLaunchState: COLD\nTotalTime: 1234\nWaitTime: 1250\nComplete\n'), 1234);
  assert.throws(() => launchTime('Status: timeout\nTotalTime: 1234\n'));
  assert.throws(() => launchTime('Status: ok\nWarning: Activity not started\n'));
  assert.throws(() => launchTime('Status: ok\nTotalTime: 0\n'));
});

test('launch report retains all samples and uses a median with a range', async () => {
  const { summarize } = await load();
  assert.deepEqual(summarize([50, 10, 30, 20, 40]), { samples: [50, 10, 30, 20, 40], median: 30, min: 10, max: 50 });
  assert.equal(summarize([10, 20]).median, 15);
  assert.throws(() => summarize([]));
  assert.throws(() => summarize([NaN]));
});

test('a successful task resume without draw timing is unavailable, never a zero-ms sample', async () => {
  const { warmLaunchTime } = await load();
  assert.equal(warmLaunchTime('Status: ok\nWaitTime: 100\nComplete\n'), null);
  assert.equal(warmLaunchTime('Status: ok\nTotalTime: 0\n'), null);
  assert.equal(warmLaunchTime('Status: ok\nTotalTime: 185\n'), 185);
  assert.throws(() => warmLaunchTime('Status: timeout\n'));
});

test('CLI refuses the real app package before invoking Android tools', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../scripts/measure-android-startup.mjs'), '--package', 'com.codedestiny.app', '--serial', 'unused'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /isolated com\.codedestiny\.app\.benchmark/);
});

test('CLI rejects invalid compilation settings before accessing a device', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../scripts/measure-android-startup.mjs'), '--package', 'com.codedestiny.app.benchmark', '--serial', 'unused', '--compile', 'invalid'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--compile must/);
});
