import './guard.cjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fork, spawnSync } from 'node:child_process';
import { mockDevSettings } from '../../../scripts/lib/mock-dev-settings.mjs';
import { services, mockResponse } from './service-results-fixtures.mjs';

const output = '.tmp/result-integration-evidence';
const runName = process.env.AUDIT_SERVICES ? 'recheck-' + process.env.AUDIT_SERVICES.replaceAll(',', '-') : 'all';
fs.mkdirSync(output, { recursive: true });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const originals = services.map(service => hash(service.payload));
const requests = [], blocked = [], errors = [], unknown = [], results = [], inventories = {}, consoleErrors = [], httpFailures = [];
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const payload = req.method === 'GET' ? mockResponse(url) : null;
  requests.push({ method: req.method, path: req.url, responseHash: payload ? hash(payload) : null });
  if (!payload) unknown.push({ method: req.method, path: req.url });
  res.writeHead(payload ? 200 : 501, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload || { ok: false, reason: 'MOCK_ROUTE_NOT_IMPLEMENTED' }));
});
await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PATHEXT|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const { env } = mockDevSettings(process.cwd(), { ...inherited, MOCK_DEV_API_PORT: String(api.address().port), MOCK_DEV_PORT: '12002' });
env.NODE_OPTIONS += ` --require="${path.resolve('tools/oracle/next-delivery/guard.cjs').replaceAll('\\', '/')}"`;
const frameworkEnv = fs.readFileSync('next-env.d.ts');
const child = fork('tools/oracle/next-delivery/server.mjs', [], { env, execArgv: [], windowsHide: true, silent: true });
let serverLog = '', browser;
child.stdout.on('data', data => { serverLog += data; });
child.stderr.on('data', data => { serverLog += data; });
child.on('message', value => { if (value.type === 'inventory') inventories[value.compiler] = value.files; });
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Next startup timeout')), 120000);
    child.on('message', value => { if (value.type === 'ready') { clearTimeout(timer); resolve(value.origin); } });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Next exited ${code}`)); });
  });
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  for (const service of services.filter(item => !process.env.AUDIT_SERVICES || process.env.AUDIT_SERVICES.split(',').includes(item.key))) {
    console.log(`Checking actual Next route: ${service.key}`);
    const context = await browser.newContext({ viewport: { width: 960, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'mock-owner', _id: 'mock-owner', nickname: '합성 검증' }));
      document.cookie = 'fortune_auth_role=user; path=/';
      // Synthetic returning visitor who already declined optional analytics.
      document.cookie = 'cd_cookie_consent=essential; path=/; SameSite=Lax';
      localStorage.setItem('cd_cookie_consent', 'essential');
      window.__audit = { gateCalls: 0 };
      window._cdOpenPaidServiceGate = () => { window.__audit.gateCalls++; throw new Error('Completed result must not open payment'); };
    });
    if (service.ritualId) await context.addInitScript(id => localStorage.setItem(`cd:yn:tarot-ritual:v1:${id}`, JSON.stringify({ stage: 'reading', selected: [], revealed: 0, completed: true })), service.ritualId);
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || /swiss|sweph|swisseph|jyotish|\/js\/destiny-profile\.js/i.test(url.pathname)) {
        blocked.push({ service: service.key, url: url.origin + url.pathname }); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push({ service: service.key, message: error.message }));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ service: service.key, message: message.text() }); });
    page.on('response', response => { if (response.status() >= 400) httpFailures.push({ service: service.key, status: response.status(), path: new URL(response.url()).pathname }); });
    try {
      const response = await page.goto(origin + service.route, { waitUntil: 'domcontentloaded', timeout: 180000 });
      assert.equal(response.status(), 200);
      assert.ok((await response.text()).includes('self.__next_f.push'));
      const cookieChoice = page.getByRole('button', { name: '필수만 사용', exact: true });
      if (await cookieChoice.isVisible()) await cookieChoice.click();
      const conclusion = page.getByText(service.conclusion, { exact: false }).filter({ visible: true }).first();
      await expect(conclusion).toBeVisible({ timeout: 60000 });
      if (await cookieChoice.isVisible()) await cookieChoice.click();
      if (service.key === 'love-secret') {
        const share = page.locator('[data-premium-share="letter"]');
        assert.ok(await conclusion.evaluate((el, panel) => Boolean(el.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING), await share.elementHandle()), 'Share and review tools follow the purchased reading');
      }
      const referenceSelector = 'details[data-result-reference], details[data-reading-evidence], details.kdo-evidence';
      const references = page.locator(referenceSelector);
      const count = await references.count();
      assert.ok(count > 0, 'Reference content must actually be exercised');
      const disclosureLabels = [];
      for (let index = 0; index < count; index++) {
        const reference = references.nth(index);
        await expect(reference).not.toHaveAttribute('open', '');
        // A nested closed disclosure is tested after opening its parent.
        const summary = reference.locator(':scope > summary');
        if (!await summary.isVisible()) continue;
        assert.ok(await conclusion.evaluate((el, ref) => Boolean(el.compareDocumentPosition(ref) & Node.DOCUMENT_POSITION_FOLLOWING), await reference.elementHandle()), 'Interpretation must precede references');
        const savedText = await reference.textContent();
        const content = reference.locator(':scope > :not(summary)').first();
        await expect(content).toBeHidden();
        disclosureLabels.push(await summary.innerText());
        await summary.focus(); await page.keyboard.press('Enter');
        await expect(reference).toHaveAttribute('open', '');
        await expect(content).toBeVisible();
        assert.equal(await reference.textContent(), savedText, 'Opening must preserve original');
        await page.keyboard.press('Enter');
        await expect(reference).not.toHaveAttribute('open', '');
      }
      for (const width of [960, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}`);
        await conclusion.scrollIntoViewIfNeeded();
        await conclusion.evaluate(async el => {
          el.scrollIntoView({ block: 'start', behavior: 'instant' });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        await page.screenshot({ path: `${output}/${service.key}-${width}.png` });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(conclusion).toBeVisible({ timeout: 30000 });
      assert.ok(await references.evaluateAll(elements => elements.every(el => !el.open)));
      assert.equal(await page.evaluate(() => window.__audit.gateCalls), 0);
      const reads = requests.filter(request => request.responseHash === hash(service.payload));
      assert.ok(reads.length >= 2, 'Initial view and reload must both use the saved response');
      results.push({ service: service.key, passed: true, references: count, disclosureLabels, savedHash: hash(service.payload), storedReads: reads.length });
    } catch (error) {
      results.push({ service: service.key, passed: false, error: error.message.split('Call log:')[0], text: await page.locator('body').innerText().catch(() => '') });
      await page.screenshot({ path: `${output}/${service.key}-failure.png`, fullPage: true }).catch(() => {});
    }
    console.log(JSON.stringify(results.at(-1)).slice(0, 650));
    await context.close();
  }
  assert.deepEqual(services.map(service => hash(service.payload)), originals, 'Stored responses changed');
  const modules = [...new Set(Object.values(inventories).flat())];
  for (const result of results) assert.ok(modules.includes(services.find(service => service.key === result.service).module), `Actual client not compiled: ${result.service}`);
  assert.ok(modules.every(file => !/swiss(?!-franc)|sweph|swisseph|jyotish/i.test(file)));
  assert.ok(blocked.every(item => item.url.startsWith('https://assets.code-destiny.com/') && /\.(woff2?|ttf)$/.test(item.url)), 'Unexpected remote or blocked engine request');
  fs.writeFileSync(`${output}/${runName}-report.json`, JSON.stringify({ browser: await browser.version(), productionFlags: 'OFF', results, errors, unknown, requests, blocked, consoleErrors, httpFailures, storedPayloadsUnchanged: true, compiledModules: modules.length }, null, 2));
  assert.equal(results.filter(result => !result.passed).length, 0, 'Service page failures');
  assert.deepEqual(errors, []);
  assert.deepEqual(unknown, []);
  assert.ok(requests.every(request => request.method === 'GET'));
} finally {
  if (browser) await browser.close();
  if (child.connected) child.send('stop');
  if (child.exitCode === null) await new Promise(resolve => {
    const timer = setTimeout(() => { if (child.exitCode === null) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); resolve(); }, 10000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
  api.closeAllConnections(); await new Promise(resolve => api.close(resolve));
  fs.writeFileSync(`${output}/${runName}-server.json`, JSON.stringify({ log: serverLog }, null, 2));
  fs.writeFileSync(`${output}/${runName}-modules.json`, JSON.stringify(inventories, null, 2));
  const actualEnv = fs.readFileSync('next-env.d.ts');
  if (!actualEnv.equals(frameworkEnv)) {
    const normalize = value => value.toString().replaceAll('\r\n', '\n');
    assert.equal(normalize(actualEnv), normalize(frameworkEnv).replace('./.next/types/routes.d.ts', './.tmp/engine-audit-next/.next/types/routes.d.ts'));
    fs.writeFileSync('next-env.d.ts', frameworkEnv);
  }
}
