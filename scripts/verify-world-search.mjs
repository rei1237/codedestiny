import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { listBillingFeatures } from '../worker/lib/billing-feature-registry.js';

// Serve the generated, unmodified shell and its real scripts. All APIs and external requests are mocked.
const root = process.cwd(), output = path.join(root, 'build-cache/world-search');
await mkdir(output, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, 'public', '.' + pathname);
    if (!file.startsWith(path.join(root, 'public') + path.sep)) throw new Error('outside public');
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [360,390,768,1440]) for (const theme of ['yeoni','neo']) {
    const context = await browser.newContext({viewport:{width,height:960}, isMobile:width<500, hasTouch:width<500, serviceWorkers:'block', reducedMotion:'reduce'});
    const page = await context.newPage();
    const paid = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        if (/(?:generate|prepare|purchase|payment|checkout|confirm)/i.test(url.pathname)) paid.push(url.pathname);
        const headers = {'Access-Control-Allow-Origin':base,'Access-Control-Allow-Credentials':'true'};
        if (url.pathname==='/api/billing/features') return route.fulfill({json:{ok:true,...listBillingFeatures()},headers});
        if (/\/auth\/(me|refresh)$/.test(url.pathname)) return route.fulfill({status:401,json:{ok:false,authenticated:false},headers});
        return route.fulfill({status:503,json:{ok:false,reason:'QA_UNMOCKED_API'},headers});
      }
      if (url.origin !== base) return route.fulfill({status:403,body:'QA_EXTERNAL_NETWORK_BLOCKED'});
      return route.continue();
    });
    try {
      await page.goto(base+'/ggulggul/', {waitUntil:'load'});
      await page.waitForFunction(()=>typeof window.cdOpenAllFortunes==='function' && window.CodeDestinyAllFortunes);
      if (theme==='neo') {
        const toggle=page.locator('.tsp-option[data-theme="neo"]');
        if (await toggle.count()) await toggle.first().click();
        else await page.evaluate(()=>{document.documentElement.classList.add('neo-mode');document.body.classList.add('neo-mode');});
      }
      // Use the existing, real entry control; no synthesized finder DOM or forced visibility.
      const entry=width<500 ? page.locator('#cdMobileBottomNav [data-nav-key="fortunes"]') : page.locator('.cdh-all-cta__btn');
      await entry.click();
      const finder=page.locator('#cdAllFortunesRoot'), input=page.locator('#cdAllFortunesSearch');
      await expect(input).toBeVisible();
      await expect(finder.locator('[data-region]')).toHaveCount(8);
      await expect(finder.locator('[data-region="all"]')).toHaveAttribute('aria-pressed','true');
      await finder.locator('[data-region="tea"] img').evaluate(image=>image.decode());
      assert.equal(await finder.evaluate(node=>node.firstElementChild.matches('[role="search"]')),true);
      const checkOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow');
      await checkOverflow();
      const stem=`${width}-${theme}`;
      await page.screenshot({path:`${output}/${stem}-explore.png`});
      await finder.locator('[data-region="sky"]').click();
      await expect(finder.locator('[data-cd-region-intro]')).toContainText('윤달');
      await finder.locator('[data-cd-region-intro] img').evaluate(image=>image.decode());
      await finder.locator('[data-cd-region-intro]').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${output}/${stem}-region.png`});
      await input.fill('연애비책');
      await expect(finder.locator('.fortune-gateway__rec')).toHaveCount(1);
      await expect(finder.locator('[data-cd-explore]')).toBeHidden();
      const card=finder.locator('.fortune-gateway__rec');
      await expect(card.locator('[data-pvw-title]')).toHaveText('연애 비책');
      await expect(card.locator('.cd-af__masters')).toHaveText('연이 · 서한비');
      await card.locator('img').evaluate(image=>image.decode());
      assert.equal(await card.getAttribute('data-coin-cost'),null);
      await page.screenshot({path:`${output}/${stem}-results.png`});
      await card.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('#tilePvwOverlay')).toBeVisible();
      await page.screenshot({path:`${output}/${stem}-detail.png`});
      await page.locator('#tilePvwClose').click();
      await expect(page.locator('#tilePvwOverlay')).toBeHidden();
      // Desktop's existing sheet dispatcher closes the list on entry. Reopening must retain the query.
      if (!(await input.isVisible())) await entry.click();
      await expect(input).toHaveValue('연애비책');
      await finder.locator('[data-cd-finder-reset]').click();
      const smallTargets=await finder.locator('button:visible,input:visible,a.cd-af__signature:visible').evaluateAll(nodes=>nodes.filter(node=>{
        const box=node.getBoundingClientRect();return box.width<44||box.height<44;
      }).map(node=>({text:node.textContent,box:node.getBoundingClientRect().toJSON()})));
      assert.deepEqual(smallTargets,[],'touch targets must be at least 44px');
      const columns=await finder.locator('.fortune-gateway__recs-grid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(columns,width<760?1:width<1200?2:3);
      await page.evaluate(()=>window.cdApplyNativeTranslations('en'));
      await expect(finder.locator('#cdAllFortunesExploreTitle')).toHaveText('Follow your curiosity');
      await page.evaluate(()=>window.cdApplyNativeTranslations('ko'));
      await expect(finder.locator('#cdAllFortunesExploreTitle')).toHaveText('마음이 닿는 공간으로');
      await finder.locator('[data-region="tea"] img').evaluate(image=>{
        image.dispatchEvent(new Event('error'));image.dispatchEvent(new Event('error'));
      });
      await expect(finder.locator('[data-region="tea"] img')).toBeHidden();
      await finder.locator('[data-region="tea"]').click();
      await expect(finder.locator('[data-cd-region-intro]')).toContainText('연이의 운명 찻집');
      const archiveImage=finder.locator('[data-region="archive"] img');
      await archiveImage.evaluate(image=>image.dispatchEvent(new Event('error')));
      await expect(archiveImage).toHaveAttribute('src','/images/home/finder-moon.svg');
      await archiveImage.evaluate(image=>image.decode());
      await archiveImage.evaluate(image=>image.dispatchEvent(new Event('error')));
      await expect(archiveImage).toBeHidden();
      await finder.locator('[data-region="archive"]').click();
      await expect(finder.locator('[data-cd-region-intro]')).toContainText('발견의 기록실');
      await finder.locator('[data-cd-finder-reset]').click();
      await finder.locator('[data-region="book"]').focus(); await page.keyboard.press('Enter');
      await expect(finder.locator('[data-region="book"]')).toHaveAttribute('aria-pressed','true');
      await finder.locator('[data-cd-finder-reset]').click();
      // Long-title fixture changes only the existing text node; layout and behavior remain real.
      const name=finder.locator('[data-pvw-title]').first();
      await name.evaluate(node=>{node.dataset.testOriginal=node.textContent;node.textContent='아주 긴 한글 제목으로 나의 삶과 인연의 흐름을 천천히 살펴보는 운세 상담';});
      await name.scrollIntoViewIfNeeded(); await checkOverflow();
      await name.evaluate(node=>{node.textContent=node.dataset.testOriginal;delete node.dataset.testOriginal;});
      const sticky=await input.evaluate(node=>{
        const box=node.closest('#cdMobileFortuneOverview')||node.closest('.cd-sheet__body');
        return {top:node.getBoundingClientRect().top,scrollTop:box.scrollTop,containerTop:box.getBoundingClientRect().top};
      });
      assert.ok(sticky.scrollTop>0 && sticky.top>=sticky.containerTop-2 && sticky.top<sticky.containerTop+30,JSON.stringify(sticky));
      await input.fill('사주');
      await expect(finder.locator('[data-action="cdOneStepFreeSajuEntry"]')).toBeVisible();
      await finder.locator('[data-action="cdOneStepFreeSajuEntry"]').click();
      await expect(page.locator('#tilePvwOverlay')).toBeHidden();
      assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('cdh-input-open')),true,'free action did not open input');
      assert.deepEqual(paid,[],'discovery must not initiate paid work');
      results.push({width,theme,passed:true,errors});
      console.log(`PASS ${stem}: explore, region, search, detail, keyboard, sticky, free entry, no paid request`);
    } catch(error) {
      await page.screenshot({path:`${output}/${width}-${theme}-failure.png`});
      console.log(JSON.stringify({width,theme,url:page.url(),errors,visible:await page.locator('#cdAllFortunesRoot').isVisible()}));
      throw error;
    } finally { await context.close(); }
  }
} finally {
  await browser.close(); await new Promise(resolve=>server.close(resolve));
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2)+'\n');
}
