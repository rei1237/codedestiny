const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Stage 12 keeps every Guardian Fortune flag explicit and safe by default', () => {
  const home = read('js/guardian-fortune-home.js');
  const index = read('index.html');
  const constants = read('src/features/guardian-fortune/constants.ts');
  const policy = read('src/features/guardian-fortune/policy.ts');
  const purchase = read('worker/lib/guardian-fortune-purchase.js');

  for (const flag of [
    'ENABLE_GUARDIAN_FORTUNE_UI',
    'ENABLE_MAIN_GUARDIAN_FORTUNE',
    'ENABLE_GUARDIAN_FORTUNE_MOCK_FLOW',
    'ENABLE_GUARDIAN_FORTUNE_API',
    'ENABLE_GUARDIAN_FORTUNE_SHARE',
    'ENABLE_GUARDIAN_FORTUNE_CREDITS',
    'ALLOW_REAL_GUARDIAN_FORTUNE_LLM',
  ]) {
    assert.match(`${home}\n${index}\n${constants}\n${policy}\n${purchase}`, new RegExp(flag));
  }
  assert.match(constants, /enableUi:\s*false/);
  assert.match(constants, /enableMockFlow:\s*false/);
  assert.match(constants, /enableApi:\s*false/);
  assert.match(constants, /enableShare:\s*false/);
  assert.match(policy, /env\.ALLOW_REAL_GUARDIAN_FORTUNE_LLM\s*===\s*["']true["']/);
  assert.match(purchase, /value === true \|\| String\(value \|\| ["']?["']?\)\.trim\(\)\.toLowerCase\(\) === ["']true["']/);
});

test('Stage 12 keeps API precedence, local mock fallback, and the Yeon-only chat default', () => {
  const home = read('js/guardian-fortune-home.js');
  assert.match(home, /if \(apiFlag\) return ['"]api['"];\s*if \(mockFlag \|\| local\) return ['"]mock['"]/);
  assert.match(home, /guardianTopic/);
  assert.match(home, /mock\.topics\[queryTopic\]/);
  assert.match(home, /state\.mode = ['"]yeoni['"]/);
  assert.doesNotMatch(home, /guardianMode/);
  assert.match(home, /if \(state\.status === ['"]loading['"]\) return/);
});

test('Stage 12 mock generation path has no real provider, network, or raw-body logging', () => {
  const files = [
    'worker/lib/guardian-fortune-context.js',
    'worker/lib/guardian-fortune-generate.js',
    'worker/lib/guardian-fortune-mock.js',
    'worker/lib/guardian-fortune-prompt.js',
    'worker/lib/guardian-fortune-result.js',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /gemini\.js|llm-client|fetch\s*\(/, file);
    assert.doesNotMatch(source, /console\.(log|error)\s*\(/, file);
  }
  assert.doesNotMatch(read('js/guardian-fortune-home.js'), /console\.(log|error)\s*\(/);
  assert.doesNotMatch(read('js/guardian-fortune-api.js'), /console\.(log|error)\s*\(/);
});

test('Stage 12 share page remains text-only, private-safe, and noindex', () => {
  const client = read('app/fortune/share/GuardianFortuneShareClient.tsx');
  const page = read('app/fortune/share/page.tsx');
  assert.doesNotMatch(client, /dangerouslySetInnerHTML|birthDate|birthTime|guestId|userId|rawPrompt|rawContext/);
  assert.match(client, /isInternalPath/);
  assert.match(client, /guardianMode/);
  assert.match(client, /guardianTopic/);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.doesNotMatch(page, /birthDate|birthTime|concern|userId|guestId/);
});

test('Stage 12 mobile and accessibility contracts stay present', () => {
  const home = read('js/guardian-fortune-home.js');
  const css = read('styles/guardian-fortune.css');
  const index = read('index.html');
  assert.match(home, /aria-pressed/);
  assert.match(home, /aria-busy/);
  assert.match(index, /aria-live=["']polite["']/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /max-width:\s*380px/);
});
