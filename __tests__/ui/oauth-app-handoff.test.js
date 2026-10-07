const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.createSourceFile('auth.js', fs.readFileSync(path.resolve(__dirname, '../../worker/routes/auth.js'), 'utf8'), ts.ScriptTarget.Latest, true);
const names = ['buildAppOAuthHandoffResponse', 'exchangeCodeForAccessToken'];
const functions = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) functions.set(node.name.text, node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(functions.size, names.length);

test('success and failure handoffs launch once and retain a manual return link without claiming login succeeded', async () => {
  const context = vm.createContext({ URL, Response });
  vm.runInContext(functions.get('buildAppOAuthHandoffResponse'), context);
  for (const query of ['social_grant=mock-grant&next=%2Frecords%2F', 'social_error=google_token_exchange_failed']) {
    const response = context.buildAppOAuthHandoffResponse('com.codedestiny.app://auth?' + query);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    const html = await response.text();
    assert.doesNotMatch(html, /로그인이 완료되었습니다/);
    const navigations = [], timers = [], attrs = {};
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
      location: { replace: value => navigations.push(value) },
      document: { getElementById: () => ({ setAttribute: (key, value) => { attrs[key] = value; } }) },
      setTimeout: fn => timers.push(fn),
    });
    timers.forEach(fn => fn());
    assert.equal(navigations.length, 1);
    assert.equal(attrs.href, navigations[0]);
    assert.match(attrs.href, /package=com\.codedestiny\.app;end$/);
    assert.ok(attrs.href.includes(query));
  }
});

test('token exchange diagnostics retain only an allowlisted provider error and HTTP status', async () => {
  for (const providerError of ['invalid_client', 'invalid_grant', 'secret-in-untrusted-response']) {
    const context = vm.createContext({ URLSearchParams,
      buildProviderConfig: () => ({ clientId: 'mock-id', clientSecret: 'mock-secret', redirectUri: 'https://example.test/callback', tokenEndpoint: 'https://example.test/token' }),
      normalizeAbsoluteUrl: () => '',
      fetchOAuthProvider: async () => ({ ok: false, status: 400, json: async () => ({ error: providerError, error_description: 'private-description', code: 'private-code', access_token: 'private-token' }) }),
    });
    vm.runInContext(functions.get('exchangeCodeForAccessToken'), context);
    await assert.rejects(context.exchangeCodeForAccessToken('google', 'mock-code', {}, {}, ''), error => {
      assert.equal(error.message, 'google_token_exchange_failed');
      assert.equal(error.oauthProviderFailure.status, 400);
      assert.equal(error.oauthProviderFailure.code, providerError.startsWith('invalid_') ? providerError : 'unclassified');
      assert.doesNotMatch(JSON.stringify(error), /private-|mock-secret|secret-in-untrusted/);
      return true;
    });
  }
});
