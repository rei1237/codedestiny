const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../../app/_lib/auth-session-copy.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { SESSION_EXPIRED_MESSAGE, normalizeSessionLocale } = exportsObject;

test('session copy covers every supported locale and regional aliases', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
    assert.equal(normalizeSessionLocale(locale), locale);
    assert.ok(SESSION_EXPIRED_MESSAGE[locale].length > 10);
  }
  for (const [input, expected] of [[' EN_us ', 'en'], ['zh_Hant', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-SG', 'zh-CN'], ['pt', 'ko'], ['', 'ko']]) {
    assert.equal(normalizeSessionLocale(input), expected);
  }
  assert.equal(SESSION_EXPIRED_MESSAGE.ko, '다른 기기 로그인 또는 세션 만료로 로그아웃되었습니다. 다시 로그인해 주세요.');
});
