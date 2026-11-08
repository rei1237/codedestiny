import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://127.0.0.1:4180', before=process.argv[3]||'4ee6c81148d5ccc19afbd0143232aa81d4ad0bcb';
assert.equal(new URL(base).hostname,'127.0.0.1');assert.match(before,/^[a-f0-9]{40}$/);
const browser=await chromium.launch({headless:true}),rows=[],cache=new Map();
try {
  for(const variant of ['before','after']) {
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      localStorage.setItem('cd:first-visit:v1:ggulggul:guest',JSON.stringify({status:'dismissed',step:0}));
      sessionStorage.setItem('cd_signature_consult_session_closed_v1','1');
      window.__typePerformance={cls:0,lcp:0};
      new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__typePerformance.cls+=e.value;})).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>window.__typePerformance.lcp=list.getEntries().at(-1).startTime).observe({type:'largest-contentful-paint',buffered:true});
    });
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base)return route.abort();
      if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,user:null,authenticated:false,items:[],products:[],profiles:[]}});
      if(variant==='before' && /\.(?:css|js|mjs|html)$/.test(url.pathname)) {
        const filename='public'+decodeURIComponent(url.pathname);
        if(!cache.has(filename)) {
          try{cache.set(filename,execFileSync('git',['show',before+':'+filename],{maxBuffer:20*1024*1024,stdio:['ignore','pipe','ignore']}));}catch{cache.set(filename,null);}
        }
        const content=cache.get(filename);
        if(content)return route.fulfill({body:content,contentType:filename.endsWith('.css')?'text/css':filename.endsWith('.html')?'text/html':'text/javascript'});
      }
      return route.continue();
    });
    const page=await context.newPage(),cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:95000});
    await page.goto(base+'/static/index.html',{waitUntil:'load',timeout:120000});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    rows.push(await page.evaluate(({variant,before})=>({variant,before,viewport:390,latencyMs:150,downloadBytesPerSecond:200000,coldCache:true,externalRequests:'blocked for both variants; baseline remote fonts therefore use fallback',...window.__typePerformance,fontBytes:performance.getEntriesByType('resource').filter(e=>/\.(woff2?|ttf)(?:\?|$)/.test(e.name)).reduce((sum,e)=>sum+e.transferSize,0)}),{variant,before}));
    await context.close();
  }
} finally {await browser.close();}
await mkdir('build-cache/typography-home',{recursive:true});
await writeFile('build-cache/typography-home/performance.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows));
