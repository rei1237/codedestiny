// Component-level mock proof. All browser requests are intercepted; no external AI calls.
import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {reportGuideCopy,reportDomains} from '../js/core/fortune-report-content.mjs';
const output=resolve(process.argv[2]||'build-cache/fortune-report-guide');await mkdir(output,{recursive:true});
const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Summary from './app/yeongnyangi/_components/SummaryReport';import Paid from './components/fortune/PaidResultImageGuide';const root=createRoot(document.getElementById('root'));window.renderReport=row=>root.render(<Summary key={row.id} row={row}/>);window.renderPaid=props=>root.render(<Paid {...props}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'browser',format:'iife',jsx:'automatic',outfile:'report.js',write:false,define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY':'""'},plugins:[{name:'mock-owned-api',setup(b){b.onLoad({filter:/yeongnyangi[\\/]_lib[\\/]api\.ts$/},()=>({contents:`export async function fortuneApi(path,body){window.reportCalls.push({path,body});return {url:'http://127.0.0.1/mock-public',token:body.token};}`}));}}]});
const js=result.outputFiles.find(file=>file.path.endsWith('.js')).text,css=result.outputFiles.find(file=>file.path.endsWith('.css')).text;
const locales=['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'];
const browser=await chromium.launch({headless:true});let checks=0;const errors=[],external=[];
try{
 for(const width of [360,390,430,1280]){
  const context=await browser.newContext({viewport:{width,height:920}}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'){external.push(url.href);return route.abort();}if(url.pathname.startsWith('/assets/'))return route.fulfill({body:await readFile(resolve('public','.'+url.pathname)),contentType:url.pathname.endsWith('.png')?'image/png':'image/webp'});return route.fulfill({body:'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#100d1e"><main id="root"></main></body></html>',contentType:'text/html'});});
  await page.goto('http://127.0.0.1/mock-guide');await page.addStyleTag({content:css});await page.evaluate(()=>{window.reportCalls=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.copiedReport=value;}},configurable:true});});await page.addScriptTag({content:js});
  for(const locale of locales)for(const domain of reportDomains){
   const copy=reportGuideCopy(locale,domain),row={id:`${width}-${locale}-${domain}`,paid:true,state:'COMPLETED',locale,createdAt:'2026-09-30',product:{domain,systems:[domain]},manifest:[{id:'a',theme:'self',title:'Saved mock'}],chapters:[{summary:locale==='ko'?'모의 상담 예시입니다. 익숙한 선택이 편안하더라도, 이번에는 내가 원하는 속도를 먼저 확인해 보세요. 답을 서두르기보다 작은 질문 하나를 건네는 방법이 있습니다.':copy.guide,advice:copy.source}],charts:[{domain,title:'Saved mock chart',source:'mock only',groups:[{id:'a',label:domain==='saju'?'일주':domain,items:[{label:domain==='saju'?'천간·지지':'Saved value',value:domain==='saju'?'戊辰':'Saved example 27.5'}],chapterIds:['a']}]}]};
   await page.evaluate(row=>window.renderReport(row),row);const report=page.locator('[data-external-image-guide]');await report.locator('h2').filter({hasText:copy.title}).waitFor();await report.getByText(copy.guide,{exact:true}).first().waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${locale} ${domain}`);
   await report.locator('summary').click();const textarea=report.locator('textarea');await textarea.fill((await textarea.inputValue())+'\nOwner-reviewed edit');await report.getByRole('button',{name:copy.copy,exact:true}).click();assert.match(await page.evaluate(()=>window.copiedReport),/Owner-reviewed edit/);
   assert.equal(await report.locator('canvas').count(),0);assert.equal(await report.getByRole('button',{name:/PNG|이미지 저장/}).count(),0);
   if(width===390&&locale==='ko'||width===1280&&locale==='ko'&&domain==='saju'||width===390&&['de','hi'].includes(locale)&&domain==='saju')await report.screenshot({path:resolve(output,`${domain}-${locale}-${width}.png`)});
   checks++;
  }
  const privateRow={id:'a'.repeat(64),paid:true,state:'COMPLETED',locale:'ko',createdAt:'2026-09-30',product:{domain:'saju',systems:['saju']},manifest:[{id:'a',theme:'self',title:'Mock'}],chapters:[{summary:'PRIVATE_OWNER_PASSAGE'}],charts:[{domain:'saju',title:'Mock',source:'mock only',limitations:['MOCK_SAVED_LIMITATION'],groups:[{id:'hour',label:'시주',items:[{label:'천간·지지',value:'PRIVATE_HOUR'}],chapterIds:['a']},{id:'day',label:'일주',items:[{label:'천간·지지',value:'戊辰'}],chapterIds:['a']}]}]};
  await page.evaluate(row=>window.renderReport(row),privateRow);const owned=page.locator('#my-fortune-summary');await owned.getByText('PRIVATE_OWNER_PASSAGE',{exact:true}).waitFor();assert.match(await owned.locator('textarea').inputValue(),/MOCK_SAVED_LIMITATION/);await owned.getByRole('button',{name:/공유하기/}).click();const consent=owned.getByRole('checkbox');await consent.waitFor();const create=owned.getByRole('button',{name:'공개 링크 만들기',exact:true});assert.equal(await create.isDisabled(),true);const preview=owned.locator('ul');assert.ok(!(await preview.innerText()).includes('PRIVATE'));await consent.check();await create.click();await owned.getByRole('button',{name:'공유 해제',exact:true}).click();await consent.waitFor();assert.equal(await consent.isChecked(),false);assert.equal(await page.evaluate(()=>window.reportCalls.length),2);
  const paid={domain:'vedic',status:'completed',content:'Mock saved reading. A second saved sentence.',basis:{groups:[{key:'a',title:'Lagna',items:[{label:'Sign',value:'Aries'}]}],stages:[]}};
  for(const status of ['generating','partial','delivery_pending','refunded']){await page.evaluate(props=>window.renderPaid(props),{...paid,status});await page.waitForFunction(()=>!document.querySelector('[data-external-image-guide]'));}
  await page.evaluate(props=>window.renderPaid(props),paid);await page.locator('[data-brand="ggulggul"]').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===390)await page.locator('[data-brand="ggulggul"]').screenshot({path:resolve(output,'ggulggul-react-390.png')});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();}
const summary={checks,locales:12,domains:6,widths:4,externalRequests:external.length,errors,scope:'mock components; not real purchases',output};await writeFile(resolve(output,'checks.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
