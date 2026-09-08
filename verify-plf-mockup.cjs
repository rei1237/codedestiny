const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = __dirname;
const outDir = path.join(root, 'docs/design/past-life-webtoon/implementation');
fs.mkdirSync(outDir, { recursive: true });

const seed = {
  primaryAnimal: '개', emoji: '🐶',
  extractedFeatures: {
    faceRatio: 0.8, chinLength: 0.4,
    samjung: { upper: 0.31, middle: 0.29, lower: 0.4 },
    noseWidthRatio: 0.76, mouthRatio: 1.05, eyeDistRatio: 0.9,
    eyeRatio: 2.7, eyeSlant: 0, lipThickness: 0.02,
    browSlant: -1, browArch: 1.2, browEyeGap: 1.5,
  },
};

const harness = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<button id="originButton" type="button">전생 관상 열기</button>
<script src="/AnalysisEngine.js"></script><script src="/PastLifeFaceUI.js"></script>
</body></html>`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
};
const server = http.createServer((req, res) => {
  if (req.url === '/__plf_harness') {
    res.writeHead(200, { 'content-type': mime['.html'] });
    res.end(harness);
    return;
  }
  const clean = decodeURIComponent(String(req.url || '/').split('?')[0]).replace(/^\/+/, '');
  const file = path.resolve(root, clean);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function listen() {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

async function openResult(browser, base, width, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  if (options.noIntersectionObserver) {
    await page.addInitScript(() => Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true }));
  }
  await page.addInitScript(() => {
    window.__plfCls = 0;
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) window.__plfCls += entry.value;
    })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(base + '/__plf_harness');
  await page.evaluate((value) => {
    document.getElementById('originButton').focus();
    window.openPastLifeFaceApp({ seed: value });
  }, seed);
  await page.locator('.plf-story__figure img').first().evaluate((img) => img.decode());
  return page;
}

(async () => {
  const port = await listen();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const viewports = [];

  for (const width of [360, 390, 430, 1440]) {
    const page = await openResult(browser, base, width);
    const initialImages = await page.locator('.plf-story__figure img[src]').count();
    assert.equal(initialImages, 1, `${width}px: 첫 화면에서는 첫 그림만 요청해야 함`);
    await page.screenshot({ path: path.join(outDir, `webtoon-${width}-top.png`) });

    for (const figure of await page.locator('.plf-story__figure').all()) {
      await figure.scrollIntoViewIfNeeded();
      await figure.locator('img').waitFor({ state: 'attached' });
      await page.waitForFunction((node) => Boolean(node.getAttribute('src')), await figure.locator('img').elementHandle());
      await figure.locator('img').evaluate((img) => img.decode());
    }
    await page.locator('.plf-sharecard').scrollIntoViewIfNeeded();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      episodes: document.querySelectorAll('[data-plf-episode]').length,
      figures: document.querySelectorAll('[data-plf-figure]').length,
      detailScenes: document.querySelectorAll('[data-plf-scene]').length,
      coreChars: [...document.querySelectorAll('.plf-story__intro,.plf-story__episode,.plf-story__record,.plf-story__clues,.plf-story__present')]
        .map((node) => node.innerText).join(' ').replace(/\s+/g, ' ').trim().length,
      cls: window.__plfCls,
      visibleButtons: [...document.querySelectorAll('#pastlife-face-app button')]
        .filter((node) => node.getClientRects().length)
        .map((node) => ({ label: node.textContent.trim(), height: node.getBoundingClientRect().height })),
      imageWidths: [...document.querySelectorAll('.plf-story__figure img')].map((img) => img.naturalWidth),
    }));
    assert.ok(metrics.scrollWidth <= width, `${width}px: 가로 넘침 없음`);
    assert.equal(metrics.episodes, 3);
    assert.equal(metrics.figures, 3);
    assert.equal(metrics.detailScenes, 9);
    assert.ok(metrics.coreChars >= 900 && metrics.coreChars <= 1800, `${width}px: 핵심 분량 ${metrics.coreChars}`);
    assert.ok(metrics.visibleButtons.every((button) => button.height >= 44), `${width}px: 버튼 44px 이상`);
    assert.ok(metrics.imageWidths.every((naturalWidth) => naturalWidth > 0), `${width}px: 모든 그림 로드 ${JSON.stringify(metrics.imageWidths)}`);
    assert.ok(metrics.cls < 0.01, `${width}px: CLS ${metrics.cls}`);
    await page.screenshot({ path: path.join(outDir, `webtoon-${width}-full.png`), fullPage: true });
    viewports.push({ ...metrics, initialImages });
    await page.close();
  }

  const brokenPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  let storyImageRequests = 0;
  await brokenPage.route('**/fuctionassets/**', (route) => {
    storyImageRequests += 1;
    if (storyImageRequests === 2) return route.abort();
    return route.continue();
  });
  await brokenPage.goto(base + '/__plf_harness');
  await brokenPage.evaluate((value) => window.openPastLifeFaceApp({ seed: value }), seed);
  await brokenPage.locator('[data-plf-figure="1"]').scrollIntoViewIfNeeded();
  await brokenPage.waitForFunction(() => document.querySelector('[data-plf-figure="1"]').classList.contains('is-broken'));
  assert.match(await brokenPage.locator('[data-plf-figure="1"]').innerText(), /그림을 불러오지 못했지만 이야기는 계속됩니다/);
  await brokenPage.close();

  const fallbackPage = await openResult(browser, base, 390, { noIntersectionObserver: true, reducedMotion: true });
  assert.equal(await fallbackPage.locator('.plf-story__figure img[src]').count(), 3, 'IO가 없으면 세 그림을 즉시 로드해야 함');
  await fallbackPage.locator('#plfCloseBtn').click();
  assert.equal(await fallbackPage.evaluate(() => document.activeElement && document.activeElement.id), 'originButton', '닫은 뒤 진입 버튼으로 초점 복원');
  await fallbackPage.close();

  const result = {
    note: '로컬 정적 서버 + mock 분석 시드. 실카메라, 실제 카카오 공유, 운영 LCP, 실결제는 포함하지 않음.',
    viewports,
    fallbacks: { image404: 'pass', noIntersectionObserver: 'pass', reducedMotion: 'pass', focusReturn: 'pass' },
  };
  fs.writeFileSync(path.join(outDir, 'browser-metrics.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  server.close();
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
