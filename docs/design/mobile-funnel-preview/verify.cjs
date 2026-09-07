// Run from the isolated worktree. This server exposes only preview dependencies.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const deps = createRequire('D:/Development/code-destiny/package.json');
const { chromium } = deps('playwright');
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname);
  const allowed = file.startsWith(__dirname + path.sep) || [
    'styles/yehwa-motifs.css', 'js/core/service-registry.js',
    'lib/payment/pass-pricing.js', 'worker/lib/profile-limits.js'
  ].some(name => file === path.resolve(root, name));
  const ext = path.extname(file);
  if (!allowed || !['.html', '.js', '.css', '.webp'].includes(ext) || !fs.existsSync(file)) {
    res.writeHead(404); res.end(); return;
  }
  res.setHeader('Content-Type', { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webp':'image/webp' }[ext]);
  fs.createReadStream(file).pipe(res);
});
server.listen(4178, '127.0.0.1', async () => {
  console.log('Preview: http://127.0.0.1:4178/docs/design/mobile-funnel-preview/index.html');
  if (process.argv.includes('--serve')) return;
  let browser;
  try {
    browser = await chromium.launch({ headless:true });
    const results = [];
    for (const [width, height] of [[360,640], [390,844], [430,932], [1280,900]]) {
      const page = await browser.newPage({ viewport:{width,height}, reducedMotion:'reduce' });
      const errors = [], blocked = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') { blocked.push(url.origin); return route.abort(); }
        return route.continue();
      });
      await page.goto('http://127.0.0.1:4178/docs/design/mobile-funnel-preview/index.html');
      await page.waitForSelector('#featured-list article');
      const geometry = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('.hero-actions > *')].map(node => {
          const rect = node.getBoundingClientRect();
          return { text:node.textContent.trim(), bottom:rect.bottom, height:rect.height, width:rect.width };
        });
        return { overflow:document.documentElement.scrollWidth > innerWidth, navTop:document.querySelector('.bottom-nav').getBoundingClientRect().top, buttons };
      });
      await page.screenshot({path:path.join(__dirname,`home-${width}.png`),fullPage:true});
      await page.getByRole('button',{name:'무료로 내 운세 보기'}).click();
      if (!(await page.locator('dialog').isVisible())) throw new Error('Demo entry failed');
      await page.keyboard.press('Escape');
      await page.locator('a[href="#services"]').first().click();
      await page.locator('#service-search').fill('나크샤트라');
      await page.locator('#price').selectOption('free');
      const resultCount = await page.locator('#search-results article').count();
      if (!resultCount) throw new Error('Registry search failed');
      await page.locator('#service-search').fill('없는서비스xyz');
      if (!(await page.getByText('일치하는 서비스가 없어요. 검색어나 필터를 바꿔보세요.').isVisible())) throw new Error('Empty state failed');
      await page.evaluate(() => location.hash = 'policy/refund');
      await page.waitForSelector('#policy:not([hidden])');
      await page.screenshot({path:path.join(__dirname,`policy-${width}.png`),fullPage:true});
      const policyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      for (const key of ['terms','privacy','contact','about','faq']) {
        await page.evaluate(key => location.hash = `policy/${key}`, key);
        await page.waitForFunction(key => document.querySelector(`.policy-tabs a[href="#policy/${key}"]`)?.hasAttribute('aria-current'), key);
      }
      results.push({ width, height, ...geometry, policyOverflow, searchResults:resultCount, errors, blocked });
      if (geometry.overflow || policyOverflow || errors.length || blocked.length || geometry.buttons.some(button => button.bottom > geometry.navTop || button.height < 44)) throw new Error(JSON.stringify(results.at(-1)));
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname,'verification.json'), JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
