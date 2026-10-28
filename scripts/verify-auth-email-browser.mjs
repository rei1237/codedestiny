// Browser forms, synthetic accounts only. Every API request is intercepted.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:13240';
assert.equal(new URL(base).hostname, '127.0.0.1');
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const scenario of ['existing', 'signup', 'wrong-password', 'oauth-only', 'csrf', 'server-error', 'network', 'expired', 'kakao-cancel', 'naver-cancel']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const requests = [];
    let authenticated = false;
    const user = { id: '64f0a1b2c3d4e5f678901234', email: 'mock@example.com', name: '모의 사용자', role: 'user' };
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        requests.push(url.pathname);
        if (/\/auth\/(login|register)$/.test(url.pathname)) {
          if (scenario === 'network') return route.abort('failed');
          if (['wrong-password', 'oauth-only'].includes(scenario)) return route.fulfill({ status: 401, json: { ok: false, code: 'invalid_credentials', message: 'Invalid credentials.' } });
          if (scenario === 'csrf') return route.fulfill({ status: 403, json: { ok: false, code: 'csrf_invalid', message: 'CSRF validation failed.' } });
          if (scenario === 'server-error') return route.fulfill({ status: 503, json: { ok: false, code: 'AUTH_UNAVAILABLE', message: 'mock database exception' } });
          const body = route.request().postDataJSON();
          assert.equal(body.email.trim().toLowerCase(), 'mock@example.com');
          assert.equal(body.password, ' Quiet!Harbor42 ');
          authenticated = true;
          return route.fulfill({ json: { ok: true, user, nextPath: '/records/' } });
        }
        if (scenario === 'expired' && !authenticated && ['/api/auth/me','/api/auth/refresh'].includes(url.pathname)) return route.fulfill({ status: 401, json: { ok: false, code: 'unauthorized' } });
        return route.fulfill({ json: url.pathname === '/api/auth/me' ? { ok: true, user: authenticated ? user : null } : { ok: true, csrfToken: 'mock-csrf', items: [] } });
      }
      return url.origin === base ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    await page.goto(base + (scenario === 'signup' ? '/signup/' : '/login/') + '?next=%2Frecords%2F' + (scenario.endsWith('-cancel') ? '&social_error=access_denied&provider=' + scenario.split('-')[0] : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (scenario.endsWith('-cancel')) {
      await page.locator('#auth-error').waitFor();
      assert(await page.locator('form button[type=submit]').isEnabled(), 'OAuth cancellation keeps email login available');
    }
    await page.locator('#auth-email').fill('Mock@Example.com');
    await page.locator('#auth-password').fill(' Quiet!Harbor42 ');
    if (scenario === 'signup') {
      await page.locator('#auth-phone').fill('01000000000');
      await page.locator('#auth-birth-year').fill('1990');
    }
    await page.locator('form button[type=submit]').click();
    if (['existing', 'signup', 'expired', 'kakao-cancel', 'naver-cancel'].includes(scenario)) await page.waitForURL('**/records/', { timeout: 60000 });
    else await page.locator('#auth-error').waitFor();
    const error = await page.locator('#auth-error').count() ? await page.locator('#auth-error').textContent() : '';
    results.push({ scenario, error, submitted: requests.some(p => /\/auth\/(login|register)$/.test(p)) });
    if (scenario === 'server-error') assert(!/database|exception/.test(error), 'server internals must not reach UI');
    if (['wrong-password','oauth-only','csrf','server-error','network'].includes(scenario)) assert(error, 'failure must be visible');
    if (scenario === 'network') assert.ok(!/이메일|비밀번호/.test(error), 'network failure must not be presented as incorrect credentials: ' + error);
    await context.close();
  }
} finally { await browser.close(); console.log(JSON.stringify(results, null, 2)); }
