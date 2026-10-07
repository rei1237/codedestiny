const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.createSourceFile('auth.js', fs.readFileSync(path.resolve(__dirname, '../../worker/routes/auth.js'), 'utf8'), ts.ScriptTarget.Latest, true);
const names = ['buildAppOAuthHandoffResponse', 'exchangeCodeForAccessToken', 'fetchOAuthProvider'];
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
    const location = { replace: value => navigations.push(value) };
    Object.defineProperty(location, 'href', { set: value => navigations.push(value) });
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
      location,
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

test('Google invalid_grant is not retried with the same single-use authorization code', async () => {
  const requests = [], sleeps = [];
  const context = vm.createContext({ URLSearchParams, AbortController, setTimeout, clearTimeout,
    OAUTH_PROVIDER_FETCH_TIMEOUT_MS: 8000, OAUTH_PROVIDER_FETCH_RETRIES: 1,
    buildProviderConfig: () => ({ clientId: 'mock-id', clientSecret: 'mock-secret', redirectUri: 'https://fallback.test/callback', tokenEndpoint: 'https://example.test/token' }),
    normalizeAbsoluteUrl: value => value,
    sleep: async ms => sleeps.push(ms),
    fetch: async (_url, options) => {
      requests.push(new URLSearchParams(options.body));
      return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) };
    },
  });
  vm.runInContext(functions.get('fetchOAuthProvider') + '\n' + functions.get('exchangeCodeForAccessToken'), context);
  await assert.rejects(context.exchangeCodeForAccessToken('google', 'mock-code', {}, {}, '', 'https://start.test/callback'), error => error.oauthProviderFailure.code === 'invalid_grant');
  assert.equal(requests.length, 1);
  assert.equal(sleeps.length, 0);
  assert.equal(requests[0].get('redirect_uri'), 'https://start.test/callback');
});

const bridgeSource = ts.createSourceFile('app-native-bridge.js', fs.readFileSync(path.resolve(__dirname, '../../scripts/app-native-bridge.js'), 'utf8'), ts.ScriptTarget.Latest, true);
const bridgeNames = ['completeMobileOAuth', 'storeAuthSession', 'describeSocialError', 'installAppUrlListener'];
const bridgeFunctions = new Map();
(function collect(node) {
  if (ts.isFunctionDeclaration(node) && bridgeNames.includes(node.name?.text)) bridgeFunctions.set(node.name.text, node.getText(bridgeSource));
  ts.forEachChild(node, collect);
})(bridgeSource);
assert.equal(bridgeFunctions.size, bridgeNames.length);

function bridgeHarness(result) {
  const storage = new Map([['fortune_auth_token', 'existing-session']]);
  const effects = { requests: [], events: [], toasts: [], cancelled: [], timers: [], moves: [], closes: 0, hidden: 0 };
  let listener;
  const context = vm.createContext({ URL, Date,
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: {
      location: { pathname: '/login/', replace: target => effects.moves.push(target) },
      setTimeout: fn => effects.timers.push(fn),
      dispatchEvent: event => effects.events.push(event),
    },
    appPlugin: () => ({ addListener: (name, callback) => { assert.equal(name, 'appUrlOpen'); listener = callback; } }),
    browserPlugin: () => ({ close: async () => { effects.closes++; } }),
    postJson: async (...args) => { effects.requests.push(args); return result; },
    trace: () => {}, showAuthProgress: () => {}, hideAuthProgress: () => { effects.hidden++; },
    notifyAuthCancelled: reason => effects.cancelled.push(reason), toast: message => effects.toasts.push(message),
    openAuthStartedAt: 1,
  });
  vm.runInContext([...bridgeFunctions.values()].join('\n'), context);
  context.installAppUrlListener();
  return { storage, effects, async open(url) { listener({ url }); await new Promise(setImmediate); } };
}

test('successful app return persists the session before closing Chrome and opening the requested records', async () => {
  const harness = bridgeHarness({ ok: true, payload: { accessToken: 'mock-access', refreshToken: 'mock-refresh', user: { id: 'mock-user' } } });
  await harness.open('com.codedestiny.app://auth?social_grant=mock-grant&next=%2Frecords%2F');
  const { storage, effects } = harness;
  assert.equal(effects.requests.length, 1);
  assert.equal(effects.requests[0][0], '/api/auth/oauth/complete');
  assert.equal(effects.requests[0][1].socialGrant, 'mock-grant');
  assert.equal(storage.get('fortune_auth_token'), 'mock-access');
  assert.equal(storage.get('fortune_auth_refresh_token'), 'mock-refresh');
  assert.equal(JSON.parse(storage.get('fortune_auth_user')).id, 'mock-user');
  assert.equal(effects.events.length, 1);
  assert.equal(effects.events[0].type, 'cd:auth-changed');
  assert.equal(effects.closes, 1);
  effects.timers.forEach(fn => fn());
  assert.deepEqual(effects.moves, ['/records/']);
  assert.deepEqual(effects.toasts, []);
});

test('Google failure return closes Chrome, removes progress and preserves an existing session without exchanging a missing grant', async () => {
  const { open, effects, storage } = bridgeHarness();
  await open('com.codedestiny.app://auth?social_error=google_token_exchange_failed');
  assert.equal(effects.requests.length, 0);
  assert.equal(effects.closes, 1);
  assert.equal(effects.hidden, 1);
  assert.deepEqual(effects.cancelled, ['social_error']);
  assert.match(effects.toasts[0], /Google 로그인 연결을 완료하지 못했어요/);
  assert.equal(storage.get('fortune_auth_token'), 'existing-session');
  assert.equal(storage.size, 1);
  assert.equal(effects.events.length, 0);
  assert.equal(effects.timers.length, 0);
});
