import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, verifyLicenses } from '../verify-licenses.mjs';
import { validateInput, utcInstant } from '../contract.mjs';
import { buildAdapter, evaluateBundle, verifyServiceSources } from '../service-runner.mjs';

const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/smoke.json'), 'utf8'));
const python = path.resolve(ROOT, '../oracle-py/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
function invoke(provider, input = sample, service = false) {
  const py = provider === 'korean-saju';
  const result = spawnSync(py ? python : process.execPath,
    py ? ['-I', '-X', 'utf8', path.resolve(ROOT, '../oracle-py/runner.py')] : [path.join(ROOT, service ? 'service-runner.mjs' : 'cli.mjs'), provider],
    { input: JSON.stringify(input), encoding: 'utf8', timeout: 30000, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, TZ: 'UTC' } });
  assert.ifError(result.error);
  assert.equal(result.stderr, '', result.stderr);
  return { code: result.status, data: JSON.parse(result.stdout) };
}
function scratch(t) {
  const cache = path.join(ROOT, '.cache'); fs.mkdirSync(cache, { recursive: true });
  const dir = fs.mkdtempSync(path.join(cache, 'contract-test-'));
  t.after(() => {
    const target = fs.realpathSync(dir), parent = fs.realpathSync(cache) + path.sep;
    assert.ok(target.startsWith(parent)); fs.rmSync(target, { recursive: true });
  });
  return dir;
}

test('installed dependency metadata is isolated and allowed', () => {
  const rows = verifyLicenses(); assert.ok(rows.length >= 11);
  assert.ok(rows.every(row => row.license === 'MIT'));
});

for (const provider of ['manseryeok', 'lunar-javascript', 'iztro', 'grahan', 'korean-saju']) {
  test(`${provider}: deterministic JSON startup, not an accuracy comparison`, () => {
    const first = invoke(provider), second = invoke(provider);
    assert.equal(first.code, 0); assert.equal(first.data.status, 'ok'); assert.deepEqual(first, second);
    assert.equal(first.data.input.time, sample.time);
    if (provider === 'iztro') assert.equal(first.data.facts.ziwei.palaces.length, 12);
    else if (provider === 'grahan') {
      assert.equal(first.data.policy.role, 'auxiliary-only');
      assert.ok(first.data.facts.vedic.moon.longitude >= 0 && first.data.facts.vedic.moon.longitude < 360);
    } else {
      assert.ok(Object.values(first.data.facts.pillars).every(pillar => typeof pillar === 'string' && pillar.length === 2));
      assert.match(first.data.facts.calendar.solar, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(typeof first.data.facts.calendar.lunar.leapMonth, 'boolean');
    }
  });
  test(`${provider}: unknown time is explicit`, () => {
    const result = invoke(provider, { ...sample, timeUnknown: true, time: null });
    assert.equal(result.code, 0); assert.ok(['partial', 'unsupported'].includes(result.data.status));
    assert.ok(!result.data.facts.pillars);
  });
}

test('invalid input and unsupported options fail without silent defaulting', () => {
  for (const provider of ['manseryeok', 'lunar-javascript', 'iztro', 'grahan', 'korean-saju']) {
    assert.equal(invoke(provider, { ...sample, time: '24:00' }).code, 1);
    assert.equal(invoke(provider, { ...sample, options: { unreviewedOption: true } }).code, 1);
    assert.equal(invoke(provider, { ...sample, date: '1990-02-30' }).code, 1);
  }
});

test('provider policies expose supported switches', () => {
  assert.equal(invoke('manseryeok', { ...sample, options: { dayBoundary: 'splitJasi', solarCorrection: 'apparent' } }).data.policy.solarCorrection, 'apparent');
  assert.equal(invoke('lunar-javascript', { ...sample, options: { sect: 1, yunSect: 2 } }).data.policy.yunSect, 2);
  assert.equal(invoke('iztro', { ...sample, options: { algorithm: 'zhongzhou', dayDivide: 'current', yearDivide: 'exact', fixLeap: false } }).data.policy.algorithm, 'zhongzhou');
  assert.equal(invoke('grahan', { ...sample, options: { node: 'true' } }).data.policy.node, 'true');
  assert.equal(invoke('korean-saju', { ...sample, options: { yajaSiSeparated: false } }).data.policy.yajaSiSeparated, false);
});

test('lunar input routes through each provider independently', () => {
  for (const provider of ['manseryeok', 'lunar-javascript', 'iztro', 'korean-saju']) {
    const result = invoke(provider, { ...sample, calendar: 'lunar', date: '1990-01-01' });
    assert.equal(result.code, 0); assert.equal(result.data.status, 'ok');
  }
  assert.equal(invoke('grahan', { ...sample, calendar: 'lunar' }).data.status, 'unsupported');
});

test('UTC conversion refuses gaps and ambiguous times unless offset disambiguates', () => {
  const local = (date, time, offset) => validateInput({ ...sample, date, time, place: { timezone: 'America/New_York', ...(offset == null ? {} : { utcOffsetMinutes: offset }) } });
  assert.throws(() => utcInstant(local('2024-03-10', '02:30')), /NONEXISTENT/);
  assert.throws(() => utcInstant(local('2024-11-03', '01:30')), /AMBIGUOUS/);
  assert.equal(utcInstant(local('2024-11-03', '01:30', -240)).date.toISOString(), '2024-11-03T05:30:00.000Z');
  assert.equal(utcInstant(local('2024-11-03', '01:30', -300)).date.toISOString(), '2024-11-03T06:30:00.000Z');
});

test('Swiss-connected service domains never build or import', () => {
  for (const domain of ['vedic', 'nakshatra', 'sukuyo', 'astrology', 'western']) {
    const result = invoke(domain, sample, true);
    assert.equal(result.code, 0); assert.equal(result.data.status, 'blocked');
    assert.equal(result.data.version, 'not-loaded');
    assert.deepEqual(result.data.facts, {});
  }
});

for (const domain of ['saju', 'ziwei']) test(`service:${domain}: reviewed public adapter only`, () => {
  const result = invoke(domain, sample, true);
  assert.equal(result.code, 0); assert.equal(result.data.status, 'ok');
  assert.equal(result.data.policy.kasiPrefetch, false);
  assert.ok(Object.keys(result.data.policy.sourceFiles).every(file => !/swiss|sweph|node_modules/.test(file)));
  if (domain === 'saju') assert.equal(Object.keys(result.data.facts.pillars).length, 4);
  else assert.equal(result.data.facts.ziwei.palaces.length, 12);
});

test('changed service graph and prohibited imports fail closed', async t => {
  assert.throws(() => verifyServiceSources('saju', {}), /SERVICE_SOURCE_CHANGED/);
  const repo = scratch(t), entry = path.join(repo, 'app/saju/animal-destiny/lib/sajuAdapter.ts');
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  for (const name of ['sweph-wasm', 'node:fs', 'https://example.invalid/module.js']) {
    fs.writeFileSync(entry, `import x from '${name}'; export const computeNatalFromInput=()=>x;`);
    await assert.rejects(buildAdapter('saju', repo), /SERVICE_IMPORT_BLOCKED/);
  }
});

test('service runtime cannot fetch even when adapter catches the error', async () => {
  await assert.rejects(evaluateBundle('module.exports.run = () => { try { fetch("https://example.invalid"); } catch {} return {}; };', {}, sample.referenceDate), /SERVICE_IO_BLOCKED/);
  await assert.rejects(evaluateBundle('module.exports.run = () => require("node:fs");', {}, sample.referenceDate), /require is not defined/);
});

test('forbidden dependency metadata is rejected before package execution', t => {
  const root = scratch(t);
  for (const name of ['package.json', 'package-lock.json', 'source-pins.json']) fs.copyFileSync(path.join(ROOT, name), path.join(root, name));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  lock.packages = { 'node_modules/sweph-wasm': { version: '2.6.9', license: 'AGPL-3.0-or-later' } };
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify(lock));
  assert.throws(() => verifyLicenses(root), /LICENSE_GATE/);
});
