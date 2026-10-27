// Full authored home surfaces with local-only mocked transport. Optional --baseline
// reads the committed source; --serve keeps the server for the shell regression suite.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {CONSULTATION_METHOD_FAQS} from '../../lib/brand/consultation-methods.mjs';
const root=process.cwd(),baseline=process.argv.includes('--baseline');
const output=path.resolve(process.env.MOBILE_CLARITY_OUTPUT||'build-cache/mobile-clarity');
const temp=path.resolve('build-cache/mobile-clarity-fixture'+(baseline?'-before':''));
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(temp,{recursive:true});
const require=createRequire(import.meta.url),cache=new Map();
function source(file){
 const relative=path.relative(root,file).replaceAll('\\','/');
 if(!baseline||relative.startsWith('node_modules/'))return fs.readFileSync(file);
 if(!cache.has(relative)){
  try{cache.set(relative,execFileSync('git',['show','HEAD:'+relative],{cwd:root,maxBuffer:20*1024*1024,stdio:['ignore','pipe','ignore']}));}
  catch{cache.set(relative,fs.readFileSync(file));}
 }
 return cache.get(relative);
}
const nextMock={name:'next-local',setup(b){
 b.onResolve({filter:/^next\/(navigation|image|link)$/},args=>({path:args.path,namespace:'local-next'}));
 b.onLoad({filter:/.*/,namespace:'local-next'},args=>({loader:'tsx',resolveDir:root,contents:args.path.endsWith('navigation')?"export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>location.assign(url),replace:url=>history.replaceState({},'',url),refresh:()=>{}});":`import React from 'react';export default function Component({priority,fill,unoptimized,loader,blurDataURL,placeholder,...p}){return React.createElement('${args.path.endsWith('image')?'img':'a'}',p);}`}));
 if(baseline)b.onLoad({filter:/\.(tsx?|jsx?|mjs|css)$/},args=>{
  if(!args.path.startsWith(root+path.sep)||args.path.includes('node_modules'))return;
  let contents=source(args.path).toString('utf8');
  const ext=path.extname(args.path);return {contents,loader:ext==='.css'?'css':ext==='.tsx'?'tsx':ext==='.ts'?'ts':'jsx',resolveDir:path.dirname(args.path)};
 });
}};
await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Root from './app/page';import Home from './app/yeongnyangi/_components/Home';import Guide from './app/yeongnyangi/_components/YeongnyangiGuide';import './styles/theme-tokens.css';import './styles/yehwa-motifs.css';import './app/yeongnyangi/night-tokens.css';createRoot(document.getElementById('root')).render(location.pathname==='/yeongnyangi/'?<Home guide={<Guide/>}/>:<Root/>);`,resolveDir:root,loader:'tsx'},bundle:true,platform:'browser',jsx:'automatic',loader:{'.js':'jsx'},define:{'process.env':'{}','process.env.NODE_ENV':'"development"'},external:['/assets/*','/images/*','/icons/*','/fonts/*'],outfile:path.join(temp,'app.js'),plugins:[nextMock]});
const css=await postcss([tailwindcss({...require('../../tailwind.config.js'),content:['./app/**/*.{js,jsx,ts,tsx}','./lib/marketing/consultation-discovery.mjs']})]).process('@tailwind base;@tailwind components;@tailwind utilities;\n'+fs.readFileSync(path.join(temp,'app.css'),'utf8'),{from:undefined});
fs.writeFileSync(path.join(temp,'app.css'),css.css);
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({ok:false,authenticated:false,user:null,code:'UNAUTHENTICATED',mock:true}));return;}
 if(['/','/yeongnyangi/'].includes(url.pathname)){res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0;font-family:system-ui"><div id="root"></div><script src="/fixture.js"></script></body></html>');return;}
 let relative=decodeURIComponent(url.pathname).replace(/^\//,'');
 if(relative==='static/index.html'||relative==='ggulggul/')relative='index.html';
 const resized=relative.match(/^cdn-cgi\/image\/[^/]+\/(.+)$/);if(resized)relative=resized[1];
 let file=relative==='fixture.js'?path.join(temp,'app.js'):relative==='fixture.css'?path.join(temp,'app.css'):path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.resolve(root,'public',relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
 res.setHeader('content-type',types[ext]||'application/octet-stream');res.end(file.startsWith(temp)?fs.readFileSync(file):source(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
if(process.argv.includes('--serve')){console.log('HOME_UI_ORIGIN='+origin);}
else{
 let browser;const report=[];
 try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await context.routeWebSocket('**',socket=>socket.close());
 for(const [name,url] of [['root','/'],['ggulggul','/static/index.html'],['yeongnyangi','/yeongnyangi/']])for(const width of (process.argv.includes('--zoom-only')?[390]:[360,390,430,1280])){
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await page.setViewportSize({width,height:844});await page.goto(origin+url,{waitUntil:'networkidle'});
  await page.locator(name==='ggulggul'?'#cdSignatureConsult':name==='root'?'.consultation-discovery':'#questions').waitFor();
  if(errors.length)throw Error(name+': '+errors.join('; '));
  await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
  const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
  assert.ok(geometry.scrollWidth<=width+1,name+' overflow '+JSON.stringify(geometry));
  await page.screenshot({path:path.join(output,name+'-'+width+'-viewport.png')});
  // Off-screen content-visibility sections intentionally skip painting. Render
  // them only for the full-page evidence; restore normal behavior afterwards.
  const captureStyle=await page.addStyleTag({content:'*{content-visibility:visible!important}'});
  await page.screenshot({path:path.join(output,name+'-'+width+'.png'),fullPage:true});
  await captureStyle.evaluate(el=>el.remove());
  let accessibility=[];
  if(!baseline&&name!=='ggulggul'){
   // Choose text on opaque reading surfaces; illustration-backed hero text
   // remains a separate visual review rather than a misleading flat-color test.
   const textSelectors=name==='root'?['.consultation-discovery__lead','.consultation-discovery__copy > span','.consultation-discovery__copy b']:['#home-question-help','#home-question-count'];
   accessibility=await page.evaluate(selectors=>{
    const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number);
    const luminance=c=>rgb(c).slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    return selectors.map(selector=>{const el=document.querySelector(selector);let bg='rgb(255,255,255)';for(let node=el;node;node=node.parentElement){const color=getComputedStyle(node).backgroundColor,parts=rgb(color);if(parts.length===3||parts[3]===1){bg=color;break;}}const a=luminance(getComputedStyle(el).color),b=luminance(bg);return {selector,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
   },textSelectors);
   assert.ok(accessibility.every(item=>item.contrast>=4.5),name+' body contrast '+JSON.stringify(accessibility));
   const targets=await page.locator(name==='root'?'.consultation-discovery__feature a,.consultation-discovery summary':'#questions button:visible,#questions summary').evaluateAll(els=>els.map(el=>({text:el.textContent.slice(0,24),height:el.getBoundingClientRect().height})));
   assert.ok(targets.every(item=>item.height>=44),name+' touch targets '+JSON.stringify(targets));
  }
  if(name==='root'){
   if(!baseline)assert.equal(await page.locator('.consultation-discovery__masters').count(),0,'Master discovery moved into fusion');
   await page.locator('.consultation-discovery').screenshot({path:path.join(output,'discovery-'+width+'.png')});
   if(!baseline){
    assert.equal(await page.locator('.consultation-discovery__feature').count(),3);
    assert.equal(await page.locator('.consultation-discovery__other:visible').count(),0);
    const ratios=await page.locator('.consultation-discovery__scene img').evaluateAll(imgs=>imgs.map(img=>Math.abs(img.width/img.height-img.naturalWidth/img.naturalHeight)));
    assert.ok(ratios.every(value=>value<.02),'Uncropped discovery art');
    await page.locator('.consultation-discovery__more summary').click();assert.equal(await page.locator('.consultation-discovery__other:visible').count(),4);
   }
  }
  if(name==='ggulggul')await page.locator('#cdhFusionSignature').screenshot({path:path.join(output,'fusion-'+width+'.png')});
  if(name==='ggulggul'&&!baseline){
   const masters=page.locator('.cdh-fusion-sig__masters a');
   assert.deepEqual(await masters.evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['/neo-operation-room/','/fortune-tea-house/','/sukuyo-compatibility-ai/','/vedic-ai/','/ziwei-ai/']);
   assert.ok((await masters.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return r.height>=44&&r.width>=44}))).every(Boolean),'Fusion master touch targets');
   assert.equal(await page.locator('.cdh-fusion-sig__chip').count(),14,'Original fusion composition preserved');
   assert.equal(await page.locator('.cdh-fusion-sig__hint').count(),0,'No added visible navigation hint');
   await masters.first().focus();await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'/fortune-tea-house/');
   await page.locator('#cdhFusionSignature').screenshot({path:path.join(output,'fusion-focus-'+width+'.png')});
   const neo=page.locator('.cdh-neo-letter');
   assert.equal(await neo.locator('img').count(),1,'One illustration without a duplicate inset');
   assert.equal(await neo.locator('a').getAttribute('href'),'/neo-consultation/');
   const neoDetails=neo.locator('details');
   assert.equal(await neoDetails.getAttribute('open'),null);
   await neo.screenshot({path:path.join(output,'neo-entry-'+width+'.png')});
   await neoDetails.locator('summary').focus();await page.keyboard.press('Enter');
   assert.equal(await neoDetails.evaluate(el=>el.open),true,'Neo options open by keyboard');
   if(width===390)await neo.screenshot({path:path.join(output,'neo-entry-open-390.png')});
   await neoDetails.locator('summary').click();
   const categories=page.locator('#cdConcernPick [data-cd-concern]');
   assert.equal(await categories.count(),8);
   for(const category of await categories.all()){
    await category.click();const panelId=await category.getAttribute('aria-controls');
    assert.equal(await category.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#'+panelId).isVisible(),true);
    assert.equal(await page.locator('[data-cd-concern-panel]:visible').count(),1);
   }
   await page.locator('[data-cd-concern="money"]').click();
   await page.locator('#cdhOtherFortunes').screenshot({path:path.join(output,'other-fortunes-'+width+'.png')});
   if(width===390||width===1280){
    await page.evaluate(()=>{document.documentElement.classList.add('neo-mode');document.body.classList.add('neo-mode');});
    await neo.screenshot({path:path.join(output,'neo-entry-dark-'+width+'.png')});
    await page.locator('#cdhOtherFortunes').screenshot({path:path.join(output,'other-fortunes-dark-'+width+'.png')});
    await page.evaluate(()=>{document.documentElement.classList.remove('neo-mode');document.body.classList.remove('neo-mode');});
   }
   assert.equal(await page.locator('#cdSigGrid .cd-sig-card').count(),10);
   await page.locator('[data-sig-next]').click();assert.ok(await page.locator('#cdSigViewport').evaluate(node=>node.scrollLeft)>0);
   await page.locator('.cdh-honey__details summary').click();assert.equal(await page.locator('[data-cd-honey-attend]').isVisible(),true);
  }
  if(name==='yeongnyangi')await page.locator('#questions').screenshot({path:path.join(output,'question-entry-'+width+'.png')});
  if(!baseline){
   const guide=page.locator('.consultation-methods');
   await guide.screenshot({path:path.join(output,name+'-methods-'+width+'.png')});
   const summary=guide.locator('summary');
   await summary.focus();await page.keyboard.press('Enter');
   assert.equal(await guide.locator('details').getAttribute('open'),'');
   assert.equal(await guide.locator('dl > div').count(),3);
   assert.deepEqual(await guide.locator('dl a').evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['/yeongnyangi/','/ggulggul/','/neo-consultation/']);
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'/yeongnyangi/');
   const dimensions=await guide.locator('a,summary').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
   assert.ok(dimensions.every(h=>h>=44),'Method guide touch targets');
   const contrast=await guide.evaluate(el=>{
    const s=getComputedStyle(el),rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0),bg=lum(s.backgroundColor);
    return [...el.querySelectorAll('p,a,summary,dt')].map(node=>{const fg=lum(getComputedStyle(node).color);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)});
   });
   assert.ok(contrast.every(value=>value>=4.5),'Method guide contrast '+JSON.stringify(contrast));
   await guide.screenshot({path:path.join(output,name+'-methods-open-'+width+'.png')});
   if(name==='root'){
    const faqs=await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.flatMap(el=>{const data=JSON.parse(el.textContent);return (Array.isArray(data)?data:[data]).filter(item=>item['@type']==='FAQPage').flatMap(item=>item.mainEntity)}));
    for(const item of CONSULTATION_METHOD_FAQS) assert.ok(faqs.some(q=>q.name===item.question&&q.acceptedAnswer.text===item.answer),'Shared FAQ structured data: '+item.question);
   }
  }
  if(!baseline&&width===390){
   // Double fixed-pixel text too, using values captured before the root-font change.
   // This is text-resize emulation, not physical-device browser zoom.
   await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.consultation-discovery,.consultation-discovery *,.consultation-methods,.consultation-methods *,#cdhFusionSignature,#cdhFusionSignature *,.cdh-neo-letter,.cdh-neo-letter *,#cdhOtherFortunes,#cdhOtherFortunes *,#questions,#questions *')];
    window.__textResize=nodes.map(el=>{const s=getComputedStyle(el);return {el,size:parseFloat(s.fontSize),line:parseFloat(s.lineHeight)}});
   });
   await page.addStyleTag({content:'html{font-size:200%!important}'});
   await page.evaluate(()=>{for(const {el,size,line} of window.__textResize){el.style.setProperty('font-size',size*2+'px','important');if(Number.isFinite(line))el.style.setProperty('line-height',line*2+'px','important');}delete window.__textResize;});
   if(name==='ggulggul')await page.locator('#cdhFusionSignature').screenshot({path:path.join(output,'fusion-text-200.png')});
   if(name==='ggulggul')for(const [label,selector] of [['neo-entry','.cdh-neo-letter'],['other-fortunes','#cdhOtherFortunes']])await page.locator(selector).screenshot({path:path.join(output,label+'-text-200.png')});
   await page.locator('.consultation-methods').screenshot({path:path.join(output,name+'-methods-text-200.png')});
   await page.screenshot({path:path.join(output,name+'-text-200.png')});
   const overflow=await page.evaluate(()=>({ok:document.documentElement.scrollWidth<=innerWidth+1,items:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)}).slice(0,15).map(el=>({tag:el.tagName,class:el.className,text:el.textContent.slice(0,60),width:el.getBoundingClientRect().width}))}));
   assert.ok(overflow.ok,name+' at 200% text '+JSON.stringify(overflow.items));
  }
  report.push({name,...geometry,accessibility,errors});await page.close();
 }
 fs.writeFileSync(path.join(output,process.argv.includes('--zoom-only')?'home-zoom-report.json':'home-report.json'),JSON.stringify({baseline,mode:'Real page components with loopback transport; not a Next production build',report},null,2));
 console.log(JSON.stringify({result:'PASS',captures:report.length,output}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
