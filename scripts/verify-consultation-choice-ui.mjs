// Browser verification of the real UI sources; all services are mocked and external traffic is blocked.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
require('./lib/mock-network-guard.cjs');
const root = process.cwd(), publicRoot = path.resolve('public');
const output = path.resolve(process.argv[2] || 'build-cache/consultation-choice-ui');
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import HelpDesk from './app/components/HelpDesk.jsx'; import Kakao from './app/components/KakaoChannelInvite.tsx'; createRoot(document.getElementById('root')).render(window.__fixture.surface === 'help' ? <HelpDesk/> : <Kakao source="preferences" settings={window.__fixture.settings}/>);`, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, outfile: 'fixture.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'mock-services', setup(builder) {
  builder.onResolve({ filter: /^(next\/link|.*\/_lib\/auth-store|.*\/_lib\/auth-client|@\/lib\/analytics)$/ }, args => ({ path: args.path, namespace: 'mock' }));
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'next/link' ? `import React from 'react'; export default function Link(props){return React.createElement('a',props);}` : args.path.endsWith('auth-store') ? `export function useAuthStore(){return {user:window.__fixture.auth?{id:'fixture-user'}:null,isAuthenticated:window.__fixture.auth};}` : args.path.endsWith('auth-client') ? 'export const authFetch=(url,init)=>fetch(url,init);' : 'export function trackEvent(){}', loader: 'js', resolveDir: root }));
  builder.onResolve({ filter: /^@\// }, args => ({ path: path.resolve(root,args.path.slice(2)) }));
} }] });
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const server = createServer(async (req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
  res.setHeader('Content-Security-Policy',"default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; frame-src 'none'");
  if (url.pathname === '/__fixture.js') { res.setHeader('Content-Type','text/javascript'); return res.end(js); }
  if (url.pathname === '/__fixture.css') { res.setHeader('Content-Type','text/css'); return res.end(css); }
  if (url.pathname === '/__fixture/') {
    const config = {surface:url.searchParams.get('surface'),auth:url.searchParams.get('auth') === '1',settings:url.searchParams.get('settings') === '1'};
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end(`<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles/theme-tokens.css"><link rel="stylesheet" href="/__fixture.css"><style>*{box-sizing:border-box}body{margin:0;padding:16px;background:var(--cd-bg,#fffaf7);font-family:'Malgun Gothic',sans-serif}#root{max-width:1100px;margin:auto}</style></head><body><div id="root"></div><script>window.__fixture=${JSON.stringify(config)}</script><script src="/__fixture.js"></script></body></html>`);
  }
  try {
    const relative = decodeURIComponent(url.pathname).replace(/^\//,'');
    const file = path.resolve(publicRoot,relative);
    assert(file.startsWith(publicRoot+path.sep));
    const bytes=await readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;

// Sample the actual composited pixels behind text, including art and translucent surfaces.
async function textContrast(page, region) {
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:"instant"});});
 const text = await region.evaluate(root=>{
  const nodes=[]; const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode, el=node.parentElement, cs=getComputedStyle(el);
   const fold=el.closest('details:not([open])');if(fold&&!fold.querySelector('summary')?.contains(el))continue;
   if(!node.textContent.trim()||el.closest('svg,[aria-hidden="true"],caption')||cs.visibility==='hidden'||cs.display==='none')continue;
   const range=document.createRange();range.selectNodeContents(node);
   for(const r of range.getClientRects())if(r.width>3&&r.height>3&&el.getBoundingClientRect().width>3)nodes.push({text:node.textContent.trim(),color:cs.color,size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight),x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height});
  }
  return nodes;
 });
 const style=await page.addStyleTag({content:'[data-contrast-sample], [data-contrast-sample] *{color:transparent!important;text-shadow:none!important}'});
 await region.evaluate(el=>el.dataset.contrastSample='');
 const bounds=await region.evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.floor(r.x+scrollX),y:Math.floor(r.y+scrollY),width:Math.ceil(r.width),height:Math.ceil(r.height)};});
 const shot=await region.screenshot({scale:'css',style:'[data-ui-overlay]{visibility:hidden!important}'});
 await region.evaluate(el=>delete el.dataset.contrastSample);await style.evaluate(el=>el.remove());
 const {data,info}=await sharp(shot).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const lum=rgb=>rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
 let minimum=100;
 for(const item of text){
  const rgba=item.color.match(/[\d.]+/g).map(Number), alpha=rgba[3]??1;
  let ratio=100,worst;
  for(const fx of [.15,.35,.5,.65,.85])for(const fy of [.25,.5,.75]){
   const x=Math.min(info.width-1,Math.max(0,Math.round(item.x-bounds.x+item.w*fx))),y=Math.min(info.height-1,Math.max(0,Math.round(item.y-bounds.y+item.h*fy)));
   const offset=(y*info.width+x)*info.channels,bg=[data[offset],data[offset+1],data[offset+2]],fg=bg.map((c,i)=>rgba[i]*alpha+c*(1-alpha));
   const a=lum(fg),b=lum(bg);const sample=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(sample<ratio){ratio=sample;worst={x,y,bg,fg};}
  }
  const required=item.size>=24||(item.size>=18.66&&item.weight>=700)?3:4.5;
  if(ratio<required){await writeFile(path.join(output,'contrast-failure.png'),shot);console.log('[contrast diagnostic]',JSON.stringify({item,worst,url:page.url(),viewport:page.viewportSize()}));}
  assert(ratio>=required,'text contrast '+ratio.toFixed(2)+' < '+required+': '+item.text);
  minimum=Math.min(minimum,ratio);
 }
 return Number(minimum.toFixed(2));
}

const metrics=[];
try {
 for (const channel of ['chrome','msedge']) {
  const browser=await chromium.launch({channel,headless:true,args:['--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
  try {
   for (const [width,dpr] of [[360,1],[390,1],[430,1],[768,1],[1280,1],[1440,1],[1280,1.25]]) {
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr,serviceWorkers:'block',reducedMotion:'reduce'});
    let relationship='unknown', granted=false, failSave=false;
    const writes=[];
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base) return route.abort();
      if(url.pathname==='/api/honey/catalog')return route.fulfill({json:{ok:true,products:[]}});
      if(url.pathname==='/api/honey/attendance')return route.fulfill({status:401,json:{ok:false,code:'UNAUTHENTICATED'}});
      if(url.pathname.startsWith('/api/')) {
        if(route.request().method()==='POST') { writes.push({path:url.pathname,body:route.request().postDataJSON()}); if(failSave)return route.fulfill({status:503,json:{ok:false}}); granted=route.request().postDataJSON()?.granted === true; }
        return route.fulfill({json:{ok:true,authenticated:false,user:null,preference:{consent:{granted}},relationship,data:{},items:[]}});
      }
      return route.continue();
    });
    const page=await context.newPage();
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/static/index.html',{waitUntil:'domcontentloaded'});
    const choice=page.locator('#cdhYeongnyangiSlot');
    await choice.scrollIntoViewIfNeeded();
    // Isolated component captures omit unrelated sticky navigation; viewport captures keep it.
    await page.evaluate(()=>{const root=document.getElementById('cdhYeongnyangiSlot');for(const el of document.querySelectorAll('body *')){if(!root.contains(el)&&!el.contains(root)&&/^(fixed|sticky)$/.test(getComputedStyle(el).position))el.dataset.uiOverlay='';}});
    await choice.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    assert.equal(await choice.locator('.cdh-choice-card').count(),2);
    assert.equal(await choice.locator('.cdh-choice-card--yeongnyangi a').getAttribute('href'),'/yeongnyangi/');
    assert.equal(await choice.locator('.cdh-choice-card--neo a').getAttribute('href'),'/neo-consultation/');
    assert.match(await choice.innerText(),/AI 작성 · 사람 검수 · 이메일 전달/);
    assert.equal(await choice.locator('tbody tr').count(),3);
    assert.deepEqual(errors,[],'no shell runtime errors');
    const contrast={};
    if(channel==='chrome'&&(width===360||width===1440))contrast.choice=await textContrast(page,choice);
    const cards=await choice.locator('.cdh-choice-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
    if(width>1100) { assert(Math.abs(cards[0].height-cards[1].height)<2); assert(Math.abs(cards[0].y-cards[1].y)<2); }
    for(const cta of await choice.locator('.cdh-choice-card__cta').all()) { await cta.focus(); assert(await cta.evaluate(el=>document.activeElement===el&&el.getBoundingClientRect().height>=44)); }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'shell overflow '+width);
    const imageRules=await choice.locator('img').evaluateAll(images=>images.every(img=>img.loading==='lazy'&&img.hasAttribute('width')&&img.hasAttribute('height')&&img.naturalWidth>0));
    assert(imageRules,'responsive lazy images decode');
    const label=`${channel}-${width}-${dpr}`;
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"});});
    await choice.screenshot({path:path.join(output,label+'-choice.png'),style:'[data-ui-overlay]{visibility:hidden!important}'});
    await choice.locator('summary').click();
    assert.match(await choice.innerText(),/단건 결제/);
    await choice.locator('summary').click();
    for(const surface of ['help','kakao']) {
      await page.goto(base+`/__fixture/?surface=${surface}&auth=1&settings=1`,{waitUntil:'networkidle'});
      const region=page.locator(surface==='help'?'section':'aside');
      await region.waitFor();
      await region.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,surface+' overflow '+width);
      for(const action of await region.locator('a,button,summary').all()) {assert((await action.boundingBox()).height>=44,'touch height '+surface); await action.focus(); assert(await action.evaluate(el=>document.activeElement===el));}
      if(surface==='help') assert.deepEqual(await region.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))),['/about/','/faq/','/records/','/contact/']);
      else {
        const checkbox=region.locator('input[type=checkbox]');
        await checkbox.check(); await region.getByRole('button',{name:'선택 저장하기'}).click();
        await region.getByRole('status').filter({hasText:'저장했어요'}).waitFor();
        assert.equal(writes.at(-1).body.granted,true);
        await region.getByRole('button',{name:'수신 동의 철회'}).click();
        await region.getByRole('status').filter({hasText:'철회했어요'}).waitFor();
        assert.equal(writes.at(-1).body.granted,false);
        failSave=true; await region.getByRole('button',{name:'선택 저장하기'}).click();
        await region.getByRole('status').filter({hasText:'저장하지 못했어요'}).waitFor(); failSave=false;
      }
      if(channel==='chrome'&&(width===360||width===1440))contrast[surface]=await textContrast(page,region);
      await region.screenshot({path:path.join(output,label+'-'+surface+'.png')});
      await page.emulateMedia({colorScheme:'dark'});
      await page.evaluate(()=>document.documentElement.dataset.cdTheme='neo');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(channel==='chrome'&&(width===360||width===1440))contrast[surface+'Neo']=await textContrast(page,region);
      await region.screenshot({path:path.join(output,label+'-'+surface+'-neo.png')});
    }
    metrics.push({channel,width,dpr,cards,contrast,shellErrors:errors,overflow:0,links:true,images:true,keyboard:true,mockConsent:true});
    await context.close();
   }
  } finally {await browser.close();}
 }
 await writeFile(path.join(output,'metrics.json'),JSON.stringify(metrics,null,2));
 console.log('[consultation choice UI] PASS',metrics.length,'Chrome/Edge viewport cases; shell + real HelpDesk/Kakao components; mock-only');
} finally {await new Promise(resolve=>server.close(resolve));}
