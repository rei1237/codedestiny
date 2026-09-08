// Isolated static-build smoke check: external requests blocked, APIs mocked.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep, join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const base = resolve('dist');
const mime = { '.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2' };
const server = createServer((req,res)=>{
  const path = resolve(base, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
  if (!(path === base || path.startsWith(base + sep))) { res.writeHead(403).end(); return; }
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path,'index.html') : path;
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});
const artifactDir=join(tmpdir(),'code-destiny-seo-20260908');
mkdirSync(artifactDir,{recursive:true});
const results=[];
try {
  for(const width of [360,390,430,1440]) {
    const context=await browser.newContext({viewport:{width,height:900}});
    await context.route('**/*',route=>{
      const url = new URL(route.request().url());
      if(url.origin!==origin) return route.abort();
      if(url.pathname.startsWith('/api/')) return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"data":null}'});
      return route.continue();
    });
    const page=await context.newPage();
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(2000);
    const hero = page.locator('#cdhTitle');
    await hero.waitFor({state:'visible'});
    const layout=await hero.evaluate(el=>({text:el.textContent,width:el.getBoundingClientRect().width,scroll:el.scrollWidth,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}));
    assert.ok(layout.scroll<=layout.width+2,JSON.stringify(layout));
    assert.ok(layout.documentWidth<=width+2,JSON.stringify(layout));
    await page.screenshot({path:join(artifactDir,`home-${width}.png`)});
    const entry=page.locator('.cdh-hero [data-cdh-free]');
    await entry.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const formVisible=await page.locator('#destinyCardForm').isVisible();
    results.push({width,...layout,keyboardEntryFormVisible:formVisible});
    assert.equal(formVisible,true,'primary entry must reveal the birth form');
    await context.close();
  }
  const context=await browser.newContext({javaScriptEnabled:false});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();
  for(const path of ['/','/en/','/ja/','/zh/','/zh-tw/','/sukuyo/','/insights/fusion/','/insights/sukuyo-compatibility-guide/','/kkul-kkul-unse/']) {
    const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
    const meta=await page.evaluate(()=>({title:document.title,language:document.documentElement.lang,canonical:document.querySelector('link[rel="canonical"]')?.href,description:document.querySelector('meta[name="description"]')?.content,robots:document.querySelector('meta[name="robots"]')?.content,h1:[...document.querySelectorAll('h1')].filter(e=>!e.closest('[hidden]')).map(e=>e.textContent),schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent))}));
    assert.equal(response.status(),200);
    assert.ok(meta.canonical?.startsWith('https://code-destiny.com/'));
    assert.ok(meta.description);
    if(['/en/','/ja/','/zh/','/zh-tw/'].includes(path)) assert.ok(!/[가-힣]/.test(meta.h1.join(' ')),path);
    const schemaTypes=meta.schemas.flatMap(item=>item['@graph'] || [item]).map(item=>item['@type']);
    const { schemas, ...summary }=meta;
    results.push({path,status:response.status(),...summary,schemaTypes});
  }
  await context.close();
  writeFileSync('docs/seo/BROWSER_VALIDATION.json',JSON.stringify({mode:'local static build; external requests blocked and API mocked; no field CWV or edge status inference',screenshots:artifactDir,results},null,2)+'\n');
  console.log(JSON.stringify({passed:true,screenshots:artifactDir,cases:results.length}));
} finally {await browser.close(); await new Promise(r=>server.close(r));}
