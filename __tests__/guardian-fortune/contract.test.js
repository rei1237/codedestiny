const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadGuardianFortuneContract() {
  const previousTsLoader = Module._extensions['.ts'];
  Module._extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText.replace(/require\((['"])(\.\.?\/[^'"]+)\1\)/g, 'require($1$2.ts$1)');
    module._compile(transpiled, filename);
  };
  try {
    return require('../../src/features/guardian-fortune/index.ts');
  } finally {
    if (previousTsLoader) Module._extensions['.ts'] = previousTsLoader;
    else delete Module._extensions['.ts'];
  }
}

const contract = loadGuardianFortuneContract();

test('Guardian Fortune exposes both modes and six topics with WebP assets', () => {
  assert.deepEqual(Object.keys(contract.GUARDIAN_FORTUNE_MODES).sort(), ['neo', 'yeoni']);
  assert.deepEqual(Object.keys(contract.GUARDIAN_FORTUNE_TOPICS).sort(), [
    'daily', 'decision', 'love', 'mind', 'money_work', 'relationship',
  ]);
  for (const mode of Object.values(contract.GUARDIAN_FORTUNE_MODES)) {
    assert.match(mode.image, /\.webp$/i);
    assert.doesNotMatch(mode.image, /\.png$/i);
    assert.ok(mode.imageAlt);
    assert.ok(mode.loadingMessages.length >= 2);
  }
});

test('input schema accepts optional birth time and rejects invalid or sensitive input', () => {
  const valid = contract.validateGuardianFortuneInput({
    birthDate: '1990-01-02',
    calendarType: 'solar',
    mode: 'yeoni',
    topic: 'daily',
    targetDate: '2026-08-02',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.gender, 'unknown');
  assert.equal(valid.value.birthTime, undefined);
  assert.equal(valid.value.locale, 'ko-KR');

  const invalid = contract.validateGuardianFortuneInput({
    birthDate: '2026-99-99',
    calendarType: 'solar',
    mode: 'yeoni',
    topic: 'daily',
    locale: 'ko-KR',
    targetDate: '2026-08-02',
    concern: '연락처는 010-1234-5678 입니다.',
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => issue.code === 'sensitive_text'));
});

test('result, context, and snapshot validators keep private fields out', () => {
  const result = contract.GUARDIAN_FORTUNE_MOCK_RESULTS.yeoniDaily;
  assert.equal(contract.validateGuardianFortuneResult(result).ok, true);
  assert.equal(contract.validateGuardianFortuneResult(contract.GUARDIAN_FORTUNE_MOCK_RESULTS.shortResult).ok, true);

  const snapshot = {
    shareId: 'opaque-test-share-id',
    mode: 'yeoni',
    topic: 'daily',
    ...result,
    createdAt: '2026-08-02T00:00:00.000Z',
    locale: 'ko-KR',
  };
  assert.equal(contract.validateSharedGuardianFortuneSnapshot(snapshot).ok, true);
  assert.equal(contract.validateSharedGuardianFortuneSnapshot({ ...snapshot, birthDate: '1990-01-02' }).ok, false);
  assert.throws(() => contract.assertGuardianFortuneContextSafe({
    version: 'guardian-fortune.v1',
    birthDate: '1990-01-02',
  }), /FORBIDDEN_FIELD/);
});

test('mock usage covers guest, daily free, paid credit, and blocked states', () => {
  const usage = contract.GUARDIAN_FORTUNE_MOCK_USAGE;
  assert.equal(usage.guestAvailable.guestFreeRemaining, 1);
  assert.equal(usage.guestUsed.nextAction, 'login');
  assert.equal(usage.authDaily3.dailyFreeRemaining, 3);
  assert.equal(usage.authDaily2.dailyFreeRemaining, 2);
  assert.equal(usage.authDaily1.dailyFreeRemaining, 1);
});

test('real LLM requires the explicit production feature flags', () => {
  assert.equal(contract.isGuardianFortuneRealLlmEnabled({}), false);
  assert.doesNotThrow(() => contract.assertGuardianFortuneRealLlmDisabled({}));
  assert.equal(contract.isGuardianFortuneRealLlmEnabled({
    ENABLE_GUARDIAN_FORTUNE_REAL_LLM: 'true',
    ALLOW_REAL_GUARDIAN_FORTUNE_LLM: 'true',
    ENABLE_GUARDIAN_FORTUNE_API: 'true',
    APP_ENV: 'production',
    GUARDIAN_FORTUNE_LLM_PROVIDER: 'gemini',
  }, 'stage-user'), true);
  assert.throws(() => contract.assertGuardianFortuneRealLlmAllowed({ ENABLE_GUARDIAN_FORTUNE_REAL_LLM: 'true' }, 'stage-user'), /REAL_LLM_BLOCKED/);
});
