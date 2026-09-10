import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.startsWith('/api/')) { res.writeHead(200, {'content-type':'application/json'}); res.end('{"ok":true,"unlocks":[],"profiles":[]}'); return; }
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});
try {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => sessionStorage.setItem('privacyAgreed', 'true'));
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss());
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', message => { if (message.type() === 'error' && /Summary|renderSummary/.test(message.text())) console.log(message.text()); });
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]').click();
  await page.locator('#nameInput').fill('회귀검증');
  await page.locator('#birthDate').fill('1990-05-15');
  await page.locator('#run-btn').click();
  await page.waitForFunction(() => window.__cdLastSummaryArgs, {timeout:30000});
  assert.equal(await page.locator('#summaryArea').textContent(), '');
  await page.evaluate(() => {
    // Simulate a restored profile with current engine data but no transient calculate arguments.
    delete window.__cdLastSummaryArgs;
    window.unlockedFeatureMap.section_summary = true;
  });
  await page.locator('#summaryGate button').click();
  await page.locator('#summaryArea .saju-summary-report').waitFor({state:'visible'});
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    await page.locator('#summaryArea').scrollIntoViewIfNeeded();
    const metrics = await page.locator('#summaryArea').evaluate(el => ({length:el.textContent.length,height:el.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth+1,hidden:el.closest('.cd-section-gate__body').getAttribute('aria-hidden')}));
    assert.ok(metrics.length>10000 && metrics.height>500);
    assert.equal(metrics.hidden,'false');
    assert.equal(metrics.overflow,false);
    console.log(`PASS restored summary ${width}px: ${metrics.length} characters`);
  }
} finally { await browser.close(); server.close(); }
