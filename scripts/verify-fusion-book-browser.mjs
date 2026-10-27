import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const output='build-cache/fusion-book';await mkdir(output,{recursive:true});
const compiled=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/consultation-budget';export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node'});
const require=createRequire(import.meta.url),Module=require('node:module'),mod=new Module('fixture.cjs');mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(compiled.outputFiles[0].text,'fixture.cjs');
const m=mod.exports,product=m.products.find(p=>p.id==='fusion_all');
const draft=m.fusionPremiumManifest(product,'work');
const manifest=m.allocateConsultationBudget([...draft,{...draft[0],id:'omakase-prevention-v1',key:'prevention',title:'주의할 조건과 대응',part:'실천과 점검',layoutRole:undefined}],product.fishId);
const paragraph='오행과 실제 계산 근거는 선택의 조건을 살피는 자료입니다. 현재 맡은 일의 책임 범위를 먼저 확인하고, 새 역할에서 무엇을 배우고 싶은지 구체적으로 기록해 보세요. 더 나은 조건이 확인되기 전에는 생활 기반을 유지하면서 준비하는 편을 권합니다. 이는 사건의 확정 예측이 아니라 현실에서 비교할 기준입니다. ';
const row={id:'fusion-book-mock',locale:'ko',profileId:'mock',productId:product.id,product,manifest,paid:true,state:'COMPLETED',createdAt:'2026-10-14T00:00:00Z',consultation:{question:'PRIVATE_QUESTION_SENTINEL',asOf:'2026-10-14',questions:[{id:'Q1',text:'이직을 지금 준비해도 될까요?',chapterId:manifest[0].id}]},
 chapters:manifest.map((c,i)=>({chapterId:c.id,summary:i===0?'지금은 퇴사보다 이직 준비를 먼저 권해요. 조건을 확인한 뒤 이동 여부를 정하세요.':`${c.title}의 핵심 선택 조건을 살펴봅니다.`,analysis:['DUPLICATE_ANALYSIS_SENTINEL'],blocks:c.sections.map((s,j)=>({id:s.id,title:s.title,paragraphs:[`고유본문 ${i+1}-${j+1}. `+paragraph.repeat(5)],sources:['saju.fiveElements']})),example:'예를 들어, 두 역할의 책임과 필요한 시간을 나란히 적어 비교해 볼 수 있어요.',advice:'다음 점검 때 업무 범위와 생활 리듬이 실제로 달라졌는지 기록하세요.',persona:'서두르기보다 네 기준부터 챙겨 봐.',highlights:['먼저 조건을 확인하고 결정하기'],sources:['saju.fiveElements'],topics:['career'],...(i===0?{questionAnswers:[{questionId:'Q1',answer:'지금은 퇴사보다 이직 준비를 먼저 권해요.',reason:'계산 근거에서 읽히는 책임과 변화의 부담을 함께 고려했어요.',timing:'이 예시는 이직 날짜를 예측하지 않아요.',action:'원하는 역할과 감당할 조건을 적어 채용 조건과 비교하세요.',review:'책임·보상·생활 시간이 확인되면 이동 판단을 다시 점검하세요.'}]}:{})})),charts:[{domain:'saju',title:'사주 계산 근거',source:'저장된 계산',limitations:['합성 검증 자료이며 실제 상담이 아닙니다.'],groups:[{id:'saju-0',label:'오행 분포',chapterIds:[],items:[{label:'목',value:'2'},{label:'화',value:'1'},{label:'토',value:'2'},{label:'금',value:'1'},{label:'수',value:'2'}]}]}]};
await writeFile(output+'/fixture.json',JSON.stringify(row));
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import ReadingBook from './app/yeongnyangi/_components/ReadingBook';import Extras,{FusionBookIntroduction} from './app/yeongnyangi/_components/FusionBookExtras';import './app/yeongnyangi/night-tokens.css';export {exportYeongnyangiReportPdf} from './lib/pdf/export-yeongnyangi-report-pdf';const root=createRoot(document.getElementById('root'));export function mount(row){root.render(<main data-yn-night><FusionBookIntroduction row={row}/><ReadingBook row={row}/><Extras row={row}/></main>);}`,resolveDir:process.cwd(),loader:'tsx'},plugins:[{name:"unoptimized-next-image",setup(b){b.onResolve({filter:/^next\/image$/},()=>({path:"image",namespace:"mock-image"}));b.onLoad({filter:/.*/,namespace:"mock-image"},()=>({contents:"import {createElement} from \"react\";export default function Image({priority,fill,quality,loader,placeholder,blurDataURL,unoptimized,...props}){return createElement(\"img\",props)}",loader:"js",resolveDir:process.cwd()}));}}],bundle:true,write:false,outfile:'fixture.js',format:'iife',globalName:'bookTest',platform:'browser',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"development"','process.env.NEXT_PUBLIC_ASSETS_BASE_URL':'"https://assets.code-destiny.com"'}});
const fonts={};for(const name of ['Mulmaru.ttf','Paperlogy-5Medium.ttf']){
 try{fonts[name]=await readFile(output+'/'+name);}catch{const response=await fetch('https://assets.code-destiny.com/'+name);assert(response.ok);fonts[name]=Buffer.from(await response.arrayBuffer());await writeFile(output+'/'+name,fonts[name]);}
}
const browser=await chromium.launch({headless:true});
try{
 for(const width of [360,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,serviceWorkers:'block'});
  let failFonts=width===390;const errors=[];let apiRequests=0;
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))apiRequests++;
   if(url.pathname.startsWith('/assets/yeongnyangi/'))return route.fulfill({body:await readFile('public'+url.pathname),contentType:'image/webp'});
   const font=fonts[url.pathname.slice(1)];if(font)return failFonts?route.fulfill({status:503,body:''}):route.fulfill({body:font,contentType:'font/ttf',headers:{'access-control-allow-origin':'*'}});
   if(url.href==='http://127.0.0.1/book-test')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><body><div id="root"></div></body></html>'});
   return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1/book-test');
  for(const file of bundle.outputFiles)if(file.path.endsWith('.css'))await page.addStyleTag({content:file.text});
  await page.addStyleTag({content:'*{box-sizing:border-box}body{margin:0;background:#101b2c;font-family:"Malgun Gothic",sans-serif}main{padding:24px;max-width:1200px;margin:auto}'});
  await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});assert.deepEqual(errors,[]);await page.evaluate(row=>window.bookTest.mount(row),row);
  await page.getByText('질문의 답부터, 나를 이해하는 한 권까지').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${output}/reader-${width}.png`});
  await page.locator('#fusion-book-export>summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#fusion-book-export').evaluate(el=>el.open),true);await page.locator('#fusion-book-export').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/export-${width}.png`});
  const button=page.getByRole('button',{name:'전체 리포트 PDF 저장하기'});
  if(width===390){await button.click();await page.getByRole('button',{name:'PDF 다시 저장하기'}).waitFor({timeout:20000});failFonts=false;
   // A failed font promise must be retryable in the same document.
   const download=page.waitForEvent('download',{timeout:120000});await page.getByRole('button',{name:'PDF 다시 저장하기'}).click();await (await download).saveAs(output+'/omakase.pdf');
  }
  if(width===1440){await page.evaluate(row=>window.bookTest.mount({...row,state:'GENERATING',chapters:row.chapters.slice(0,2)}),row);await page.waitForFunction(()=>document.querySelector('#fusion-book-export button')?.disabled===true);}
  if(width===430){
   await page.getByRole('checkbox').check();
   const target='chapter-'+row.manifest[2].id;await page.locator('#'+target).scrollIntoViewIfNeeded();
   await page.waitForFunction(({id,target})=>localStorage.getItem('yeongnyangi:reading-position:'+id)===target,{id:row.id,target});
   // Return to the same saved purchase after mounting another record.
   await page.evaluate(row=>window.bookTest.mount({...row,id:'other-mock'}),row);await page.waitForTimeout(30);
   await page.evaluate(row=>window.bookTest.mount(row),row);
   await page.waitForFunction(target=>Array.from(document.querySelectorAll('aside>a')).some(a=>a.getAttribute('href')==='#'+target),target);
   assert.equal(await page.getByRole('checkbox',{includeHidden:true}).isChecked(),false);
  }
  assert.equal(apiRequests,0);assert.deepEqual(errors,[]);await context.close();console.log(`PASS reader/export ${width}px`);
 }
}finally{await browser.close();}
