import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createNeoMock } from './lib/neo-consultation-mock.mjs';
import { handleNeoConsultations } from '../worker/routes/neo-consultations.js';
import { renderNeoEmailHomeEntry } from '../lib/brand/neo-email-home-entry.mjs';
import { NEO_EMAIL_PORTRAIT } from '../lib/neo-consultation/contract.js';

const root = process.cwd(), out = resolve(root,'build-cache/neo-consultation-ui');
await mkdir(out,{recursive:true});
const mock = createNeoMock();
let createRequests = 0;
const tokens = await readFile(resolve(root,'styles/theme-tokens.css'),'utf8');
const shims = {
  'next/image': 'import React from "react"; export default function Image({priority,...p}){return React.createElement("img",p)}',
  'next/link': 'import React from "react"; export default function Link({children,...p}){return React.createElement("a",p,children)}',
  '@/app/_lib/auth-store': 'export const useAuthStore=()=>({isAuthenticated:true});',
  '@/app/_lib/auth-client': 'export const authFetch=(path,options)=>fetch(path,options);',
  './checkout': 'export const openNeoCheckout=()=>{throw new Error("REAL_CHECKOUT_BLOCKED_IN_MOCK")};',
  '@/lib/site-policy-config': 'export const SUPPORT_EMAIL="operator@example.invalid";export const SUPPORT_MAILTO="mailto:operator@example.invalid";',
  '../_lib/admin-api': 'export async function adminFetch(path,options){const r=await fetch(path,options);const b=await r.json();if(!r.ok)throw new Error(b.message);return b}',
};
await build({
  stdin:{ contents:'import React from "react";import{createRoot}from"react-dom/client";import Customer from "./app/neo-consultation/NeoConsultationClient";import Admin from "./app/admin/neo-consultations/page";createRoot(document.getElementById("root")).render(location.pathname.startsWith("/admin")?<Admin/>:<Customer/>);', resolveDir:root, loader:'tsx'},
  bundle:true, outfile:resolve(out,'app.js'), jsx:'automatic', define:{'process.env.NODE_ENV':'"development"'},
  plugins:[{name:'mock-boundaries',setup(builder){
    builder.onResolve({filter:/.*/},args => {
      if(Object.hasOwn(shims,args.path))return {path:args.path,namespace:'neo-mock'};
      return undefined;
    });
    builder.onLoad({filter:/.*/,namespace:'neo-mock'},args=>({contents:shims[args.path],loader:'js',resolveDir:root}));
  }}],
});
const server = createServer(async(req,res)=>{
  try {
    const origin='http://127.0.0.1:'+server.address().port;
    const path=new URL(req.url,origin).pathname;
    if(/^\/images\/neo-consultation\/moonlit-letter-(640|1280)\.webp$/.test(path) || path===NEO_EMAIL_PORTRAIT || /^\/images\/service-introductions\/neo-consultation(?:-640)?\.webp$/.test(path)){res.setHeader('content-type','image/webp');res.end(await readFile(resolve(root,'public',path.slice(1))));return;}
    if(path==='/home-preview/'){
      res.setHeader('content-type','text/html');
      res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:20px;background:#f6eff5}.cdh{max-width:1000px;margin:auto}*{box-sizing:border-box}</style><style>'+tokens+await readFile(resolve(root,'styles/home-funnel.css'),'utf8')+'</style><div class="cdh">'+renderNeoEmailHomeEntry()+'</div></html>');return;
    }
    if(path==='/__neo_mock__/status'){res.setHeader('content-type','application/json');res.end('{"mock":true}');return;}
    if(path.startsWith('/__neo_mock__/pay/')){
      const order=await mock.pay(path.split('/').at(-1));res.setHeader('content-type','application/json');res.end(JSON.stringify({order}));return;
    }
    if(path.startsWith('/api/')){
      if(path==='/api/neo-consultations' && req.method==='POST') createRequests++;
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const response=await handleNeoConsultations(new Request(origin+req.url,{method:req.method,...(req.method!=='GET'?{body:Buffer.concat(chunks).toString()}: {})}),
        {service:mock.service,userId:'mock-browser-owner',admin:path.startsWith('/api/admin/')?{id:'mock-neo-admin'}:undefined});
      res.statusCode=response.status;res.setHeader('content-type','application/json');res.end(await response.text());return;
    }
    if(path==='/app.js'||path==='/app.css'){res.setHeader('content-type',path.endsWith('css')?'text/css':'text/javascript');res.end(await readFile(resolve(out,path.slice(1))));return;}
    res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><style>'+tokens+'body{margin:0}button,input,textarea,select{font-family:inherit}</style><div id="root"></div><script src="/app.js"></script></html>');
  }catch(error){res.statusCode=500;res.end(JSON.stringify({message:error.message}));}
});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const errors=[], captures=[];
try {
  const context=await browser.newContext();
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/neo-consultation/');
    await page.getByText('MOCK 미리보기',{exact:false}).waitFor();
    const background = page.locator('header picture img');
    await background.evaluate(img=>img.decode());
    assert.ok((await background.evaluate(img=>img.currentSrc)).endsWith('neo-consultation'+(width<=760?'-640':'')+'.webp'));
    const contrast = await page.evaluate(() => {
      const luminance = color => {
        const values = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      };
      const ratio = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const form = getComputedStyle(document.querySelector('#neo-form'));
      const input = getComputedStyle(document.querySelector('#neo-q-0'));
      const hint = getComputedStyle(document.querySelector('#neo-q-hint-0'));
      const button = getComputedStyle(document.querySelector('#neo-form button:last-child'));
      return [ratio(luminance(form.color),luminance(form.backgroundColor)),ratio(luminance(input.color),luminance(input.backgroundColor)),ratio(luminance(hint.color),luminance(form.backgroundColor)),ratio(luminance(button.color),luminance(button.backgroundColor))];
    });
    assert.ok(contrast.every(value => value >= 4.5), 'form and primary button text contrast must be at least 4.5:1');
    await expect(page.getByRole('img',{name:'네오가 사주와 자미두수 자료를 살피며 상담 편지를 검토하는 장면'})).toBeVisible();
    assert.equal(await page.getByRole('img',{name:'네오가 사주와 자미두수 자료를 살피며 상담 편지를 검토하는 장면'}).evaluate(img=>img.naturalWidth),640);
    await expect(page.getByRole('img',{name:'달빛이 드는 서재의 편지와 은빛 만년필'})).toBeVisible();
    await expect(page.getByRole('link',{name:/operator@example.invalid/})).toHaveAttribute('href','mailto:operator@example.invalid');
    assert.equal(await page.getByText('BLUE MOON',{exact:true}).count(),0);
    await page.locator('details').filter({hasText:'지나온 시기도'}).locator('summary').click();
    await page.locator('#neo-good-period').fill('2022년 봄, 일을 시작했어요.');
    await page.locator('#neo-difficult-period').fill('서른 살 무렵, 이직이 힘들었어요.');
    await page.getByLabel('질문 1',{exact:true}).fill('직장을 옮기기 전에 고려할 점은 무엇인가요?');
    await page.getByRole('button',{name:'질문 추가하기',exact:false}).click();
    await page.getByLabel('질문 2',{exact:true}).fill('관계에서 반복되는 패턴을 어떻게 바꾸면 좋을까요?');
    await page.getByRole('group',{name:'질문 2 풀이 구성'}).getByRole('checkbox',{name:/자미두수 추가/}).check();
    await page.getByRole('group',{name:'질문 2 풀이 구성'}).getByRole('checkbox',{name:/원국·자미두수 명반 해석 추가/}).check();
    assert.ok(await page.getByText('50,000원',{exact:true}).isVisible());
    if(width===360){const capture=resolve(out,'options-360.png');await page.locator('#neo-form').screenshot({path:capture});captures.push(capture);}
    await page.getByRole('button',{name:'질문 2 삭제'}).click();
    assert.equal(await page.locator('textarea[id^="neo-q-"]').count(),1);
    await page.getByRole('button',{name:'질문 추가하기',exact:false}).click();
    await page.getByLabel('질문 2',{exact:true}).fill('관계에서 반복되는 패턴을 어떻게 바꾸면 좋을까요?');
    await page.getByRole('group',{name:'질문 2 풀이 구성'}).getByRole('checkbox',{name:/자미두수 추가/}).check();
    await page.getByRole('group',{name:'질문 2 풀이 구성'}).getByRole('checkbox',{name:/원국·자미두수 명반 해석 추가/}).check();
    await page.getByRole('button',{name:'다음',exact:true}).click();
    await page.getByLabel('회신 이메일').fill('browser@example.invalid');
    await page.getByRole('button',{name:'다음',exact:true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByLabel('생년월일',{exact:true}).fill('19900420');
    await page.getByLabel('출생시간',{exact:true}).fill('12:30');
    if(width===360){const capture=resolve(out,'birth-360.png');await page.locator('#neo-form').screenshot({path:capture});captures.push(capture);}
    await page.getByLabel('상담과 회신을 위한').check();
    await page.getByRole('button',{name:'이전',exact:true}).click();
    assert.match(await page.getByLabel('질문 1',{exact:true}).inputValue(),/직장/);
    await page.getByRole('button',{name:'다음',exact:true}).click();
    assert.equal(await page.getByLabel('회신 이메일').inputValue(),'browser@example.invalid');
    await page.getByRole('button',{name:'다음',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const path=resolve(out,'customer-'+width+'.png');await page.screenshot({path,fullPage:true});captures.push(path);
    if(width===390) {
      let attempts=0;
      await page.route('**/__neo_mock__/pay/*',async route=>{
        attempts++;
        if(attempts===1) return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({message:'결제를 취소했어요. 같은 주문에서 다시 확인해 주세요.'})});
        if(attempts===2) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'결제를 확인하지 못했어요. 같은 주문에서 다시 확인해 주세요.'})});
        await route.fetch();
        return route.abort(); // 서버 확정 후 모바일 연결이 끊어진 경우
      });
      await page.getByRole('button',{name:'모의 결제로 상담 신청하기'}).evaluate(button=>{button.click();button.click();});
      await expect(page.getByRole('alert')).toContainText('취소');
      const resumeUrl=page.url();
      assert.match(resumeUrl,/order=mock-neo-/);assert.ok(!resumeUrl.includes('browser'));
      assert.equal(createRequests,1);assert.equal(mock.paymentRows.size,1);
      await Promise.all([
        page.waitForResponse(response => response.request().method()==='GET' && response.url().includes('/api/neo-consultations/mock-neo-')),
        page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('payment','success');history.replaceState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));}),
      ]);
      await expect(page.getByRole('heading',{name:'결제 대기',exact:true})).toBeVisible();
      await page.evaluate(url=>history.replaceState(null,'',url),resumeUrl);
      await page.getByRole('button',{name:'같은 주문 이어서 확인하기'}).click();
      await expect(page.getByRole('alert')).toContainText('확인하지 못했어요');
      await page.getByRole('button',{name:'같은 주문 이어서 확인하기'}).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await page.unroute('**/__neo_mock__/pay/*');
      await page.reload();
      await page.getByRole('heading',{name:'접수 완료',exact:true}).waitFor();
      assert.equal(page.url(),resumeUrl);assert.equal(createRequests,1);assert.equal(mock.paymentRows.size,1);
      await page.evaluate(()=>{history.pushState(null,'',location.href+'&returned=1');history.back();});
      await page.getByRole('heading',{name:'접수 완료',exact:true}).waitFor();
      assert.equal(attempts,3);
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
      await page.getByRole('heading',{name:'접수 완료',exact:true}).waitFor();
    }
  }
  await page.goto(base+'/admin/neo-consultations/');
  await page.getByRole('button',{name:/직장을 옮기기/}).click();
  await expect(page.getByLabel('질문 1 답변',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'답변 저장하기',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'이메일 발송 완료 기록하기'})).toBeDisabled();
  await page.getByRole('button',{name:'예약 메일 전달하기',exact:true}).click();
  await expect(page.getByRole('button',{name:'예약 메일 전달하기',exact:true})).toHaveCount(0);
  assert.match(mock.mails[0].message.text,/1990-04-20/);
  assert.match(mock.mails[0].message.text,/2022년 봄/);
  assert.match(mock.mails[0].message.text,/서른 살 무렵/);
  assert.match(mock.mails[0].message.text,/사주 \+ 자미두수 · 사주 원국·자미두수 명반 해석/);
  await page.getByRole('checkbox',{name:/모든 질문과 선택한/}).check();
  await page.getByRole('button',{name:'이메일 발송 완료 기록하기'}).click();
  await page.getByRole('heading',{name:'답변 발송 완료',exact:true}).waitFor();
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const path=resolve(out,'admin-'+width+'.png');await page.screenshot({path,fullPage:true});captures.push(path);
  }
  await page.goto(base+'/neo-consultation/');
  await page.getByRole('button',{name:'구매 기록 확인하기'}).click();
  await page.getByRole('button',{name:/직장을 옮기기.*답변 발송 완료/}).click();
  await expect(page.getByText(/주문번호/)).toHaveCount(0);
  await expect(page.getByText('답변 이메일 발송이 기록됐어요.',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'네오 검수 완료 · 나의 답변'})).toHaveCount(0);
  await page.goto(base+'/home-preview/');
  for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});
    const entry = page.locator('.cdh-neo-letter');
    await expect(entry.locator('img')).toHaveCount(1);
    await entry.locator('.cdh-neo-letter__art img').waitFor();
    // Resizing <picture> can replace an in-flight image and reject decode().
    // Wait for the selected source and loaded pixels; broken assets still fail.
    await expect(page.locator('picture img')).toHaveJSProperty('currentSrc',base+'/images/service-introductions/neo-consultation'+(width<=640?'-640':'')+'.webp');
    await expect.poll(()=>page.evaluate(()=>[...document.images].every(img=>img.complete && img.naturalWidth>0))).toBe(true);
    await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode()));});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const path=resolve(out,'home-'+width+'.png');await page.screenshot({path,fullPage:true});captures.push(path);
    const details = entry.locator('details');
    await expect(details).toHaveJSProperty('open',false);
    await details.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveJSProperty('open',true);
    await expect(details).toContainText('자미두수 추가');
    await page.keyboard.press('Enter');
    await expect(details).toHaveJSProperty('open',false);
  }
  await page.getByRole('link',{name:'질문 작성하기'}).click();
  await page.getByRole('heading',{name:/네오에게.*물어봐/}).waitFor();
  await page.setViewportSize({width:390,height:380});
  await page.getByLabel('질문 1',{exact:true}).fill('작은 화면에서도 질문이 보존되나요?');
  await page.getByLabel('질문 1',{exact:true}).focus();
  await page.setViewportSize({width:844,height:390});
  await expect(page.getByLabel('질문 1',{exact:true})).toHaveValue('작은 화면에서도 질문이 보존되나요?');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'다음',exact:true}).focus();
  assert.ok(await page.getByRole('button',{name:'다음',exact:true}).evaluate(el=>el===document.activeElement && parseFloat(getComputedStyle(el).minHeight)>=48));
  assert.equal(mock.paymentRows.size,1);assert.equal(mock.mails.length,1);
  assert.deepEqual(errors,[]);
  await writeFile(resolve(out,'result.json'),JSON.stringify({passed:true,captures,externalRequestsAllowed:false,paymentCount:mock.paymentRows.size,mailCount:mock.mails.length},null,2));
  console.log(JSON.stringify({passed:true,captures,paymentCount:mock.paymentRows.size,mailCount:mock.mails.length},null,2));
} finally { await browser.close(); await new Promise(resolveClose=>server.close(resolveClose)); }
