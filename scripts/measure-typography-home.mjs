import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
let base=process.argv[2]||'http://127.0.0.1:4180';const before=process.argv[3]||'fbc3a41df78d54b6570859aca792e98aa39a080f';
assert.equal(new URL(base).hostname,'127.0.0.1');assert.match(before,/^[a-f0-9]{40}$/);
let servedVariant='after';const cache=new Map(),rows=[];const publicRoot=resolve('public');
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const filename='public'+pathname;const target=resolve(publicRoot,'.'+pathname);if(!target.startsWith(publicRoot+'/')&&!target.startsWith(publicRoot+'\\')){res.writeHead(403);res.end();return;}let content;
if(servedVariant==='before'&&/\.(?:css|js|mjs|html)$/.test(pathname)){if(!cache.has(filename)){try{cache.set(filename,execFileSync('git',['show',before+':'+filename],{maxBuffer:20*1024*1024,stdio:['ignore','pipe','ignore']}));}catch{cache.set(filename,null);}}content=cache.get(filename);}if(!content)content=await readFile(target);const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}[extname(target)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try {
  for(const variant of Array.from({length:Number(process.argv[4]||5)},()=>['before','after']).flat()) {
    servedVariant=variant;console.log('[measure]',variant,rows.length+1);const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      localStorage.setItem('cd:first-visit:v1:ggulggul:guest',JSON.stringify({status:'dismissed',step:0}));
      sessionStorage.setItem('cd_signature_consult_session_closed_v1','1');
      window.__typePerformance={cls:0,lcp:0};
      new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__typePerformance.cls+=e.value;})).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{const e=list.getEntries().at(-1);window.__typePerformance.lcp=e.startTime;window.__typePerformance.lcpElement={tag:e.element?.tagName,id:e.element?.id,text:e.element?.textContent?.slice(0,100),src:e.element?.currentSrc};}).observe({type:'largest-contentful-paint',buffered:true});
    });
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base)return route.abort();
      if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,user:null,authenticated:false,items:[],products:[],profiles:[]}});
      return route.continue();
    });
    const page=await context.newPage(),cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:95000});
    await page.goto(base+'/static/index.html',{waitUntil:'commit',timeout:30000});
    await page.waitForTimeout(30000);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    rows.push(await page.evaluate(({variant,before})=>({variant,before,viewport:390,collectionWindowMs:30000,latencyMs:150,downloadBytesPerSecond:200000,coldCache:true,externalRequests:'blocked for both variants; CSS/JS/HTML and binaries use the same local HTTP server and network emulation',...window.__typePerformance,fontBytes:performance.getEntriesByType('resource').filter(e=>/\.(woff2?|ttf)(?:\?|$)/.test(e.name)).reduce((sum,e)=>sum+e.transferSize,0)}),{variant,before}));
    await context.close();
  }
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
await mkdir('build-cache/typography-home',{recursive:true});
await writeFile('build-cache/typography-home/performance.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows));
