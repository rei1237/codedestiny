// Compiled routes only; local fixture API, blocked external DNS, no live services.
// node --require ./scripts/lib/mock-network-guard.cjs scripts/measure-consultation-web-perf.mjs --label=before --out=.tmp/web-perf
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const root = process.cwd(), compiled = resolve(root, 'out');
await stat(resolve(compiled, 'index.html')); // Never silently measure source/dev/old dist instead.
const label = option('label', 'baseline'), out = resolve(option('out', '.tmp/web-perf'));
const routes = option('routes', '/snu/,/astrology-ai/,/vedic-ai/,/ziwei-ai/,/nakshatra/ai/,/karma-destiny-ai/,/love-secret-ai/,/new-year-ai-consultation/,/life-book-ai/,/fusion-fortune/,/fortune-tea-house/,/neo-operation-room/,/master-love-codex/,/sukuyo-compatibility-ai/,/naming-ai/,/,/ggulggul/,/yeongnyangi/,/yeongnyangi/fortune/,/yeongnyangi/result/,/yeongnyangi/library/').split(',');
const runs = Number(option('runs', '3'));
if (!Number.isInteger(runs) || runs < 1 || runs > 5) throw new Error('runs must be 1..5');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.vtt': 'text/vtt' };
const api = path => path.includes('/auth/me') || path.includes('/auth/refresh')
  ? [401, { ok: false, authenticated: false }]
  : path.includes('/profiles') ? [200, { ok: true, profiles: [] }]
  : path.includes('/activation-rewards') ? [401, { ok: false, code: 'UNAUTHORIZED' }]
  : path.includes('/honey/') ? [200, { ok: true, balance: 0, products: [], otherUses: [] }]
  : [503, { ok: false, code: 'MOCK_ROUTE_NOT_IMPLEMENTED' }];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) {
      const [code, body] = api(path);
      res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body)); return;
    }
    const leaf = path === '/ggulggul/' ? 'index.html' : decodeURIComponent(path.replace(/^\//, '')) + (path.endsWith('/') ? 'index.html' : '');
    let bytes;
    for (const directory of path === '/ggulggul/' ? [root] : [compiled, resolve(root, 'public')]) {
      const file = resolve(directory, leaf);
      if (!file.startsWith(directory + sep)) throw new Error('Invalid path');
      try { bytes = await readFile(file); break; } catch { /* Next candidate, same local workspace. */ }
    }
    if (!bytes) { res.writeHead(404); res.end(); return; }
    const extension = extname(leaf), compressed = /\.(html|js|mjs|css|json|svg)$/.test(leaf) && /gzip/.test(req.headers['accept-encoding'] || '');
    res.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=86400', ...(compressed ? { 'Content-Encoding': 'gzip' } : {}) });
    res.end(compressed ? gzipSync(bytes) : bytes);
  } catch { res.writeHead(500); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] });
const results = [];
try {
  await mkdir(out, { recursive: true });
  for (const route of routes) {
    for (let run = 0; run < runs; run++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      await context.addInitScript(() => {
        sessionStorage.setItem('privacyAgreed', 'true');
        window.__webPerf = { lcp: 0, cls: 0, longTasks: 0, lcpHistory: [], shifts: [] };
        for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask']) {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (type === 'largest-contentful-paint') {
                window.__webPerf.lcp = entry.startTime;
                const element = entry.element;
                window.__webPerf.lcpHistory.push({ time: entry.startTime, url: entry.url, tag: element?.tagName, id: element?.id, className: element?.className, parentClassName: element?.parentElement?.className, text: element?.textContent?.trim().slice(0,120), size: entry.size });
              }
              if (type === 'layout-shift' && !entry.hadRecentInput) {
                window.__webPerf.cls += entry.value;
                window.__webPerf.shifts.push({ time: entry.startTime, value: entry.value, sources: (entry.sources || []).map(source => ({ tag: source.node?.tagName, id: source.node?.id, className: source.node?.className, previousRect: source.previousRect.toJSON(), currentRect: source.currentRect.toJSON() })) });
              }
              if (type === 'longtask') window.__webPerf.longTasks += Math.max(0, entry.duration - 50);
            }
          }).observe({ type, buffered: true });
        }
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
      for (const cache of ['cold', 'warm']) {
        let transfer = 0;
        const requests = [], failures = [], errors = [];
        const finished = event => { transfer += event.encodedDataLength; };
        const request = req => requests.push(req.url());
        const failure = req => { if (req.url().startsWith(origin)) failures.push(req.url().replace(origin, '')); };
        const error = err => errors.push(err.message);
        cdp.on('Network.loadingFinished', finished); page.on('request', request); page.on('requestfailed', failure); page.on('pageerror', error);
        const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 120000 });
        if (response.status() !== 200) throw new Error(`${route}: HTTP ${response.status()}`);
        await page.waitForTimeout(2000);
        const metrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource');
          const pendingVisibleImages=[...document.images].filter(img=>{const box=img.getBoundingClientRect();return !img.complete&&box.width>0&&box.height>0&&box.top<innerHeight&&box.bottom>0;}).map(img=>img.currentSrc||img.src);
          return { ...window.__webPerf, pendingVisibleImages, dom: document.querySelectorAll('*').length, overflow: document.documentElement.scrollWidth > innerWidth + 1, scripts: resources.filter(e => e.initiatorType === 'script').reduce((sum, e) => sum + e.encodedBodySize, 0), resources: resources.map(e => ({ url: e.name.replace(location.origin, ''), type: e.initiatorType, start: e.startTime, end: e.responseEnd, duration: e.duration, bytes: e.encodedBodySize })).sort((a, b) => b.bytes - a.bytes).slice(0, 40) };
        });
        const input = page.locator('input:not([type=hidden]):visible, textarea:visible').first();
        let interactionMs = null;
        if (await input.count()) {
          await input.scrollIntoViewIfNeeded();
          interactionMs = await input.evaluate(el => new Promise(done => {
            const start = performance.now(); el.focus(); el.value = '검증'; el.dispatchEvent(new Event('input', { bubbles: true }));
            requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - start)));
          }));
        }
        results.push({ route, run, cache, ...metrics, transfer, requests: requests.length, apiRequests: requests.filter(url => url.includes('/api/')).length, interactionMs, failures, errors });
        cdp.off('Network.loadingFinished', finished); page.off('request', request); page.off('requestfailed', failure); page.off('pageerror', error);
        await writeFile(resolve(out, `${label}.json`), JSON.stringify({ label, conditions: '390x844; CPU4; Slow4G; compiled export; guest fixture; three cold/warm runs; scripted input is not field INP', results }, null, 2));
      }
      await context.close();
    }
    const median = key => { const values = results.filter(row => row.route === route && row.cache === 'cold').map(row => row[key]).sort((a, b) => a - b); return Math.round(values[Math.floor(values.length / 2)] * 100) / 100; };
    console.log(JSON.stringify({ route, lcp: median('lcp'), cls: median('cls'), blockingMs: median('longTasks'), bytes: median('transfer') }));
  }
} finally {
  await browser.close(); await new Promise(done => server.close(done));
}
