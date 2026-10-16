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
const shims = {
  'next/link': 'import React from "react"; export default function Link({children,...p}){return React.createElement("a",p,children)}',
  '@/app/_lib/auth-store': 'export const useAuthStore=()=>({isAuthenticated:true});',
  '@/app/_lib/auth-client': 'export const authFetch=(path,options)=>fetch(path,options);',
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
    if(path===NEO_EMAIL_PORTRAIT){res.setHeader('content-type','image/webp');res.end(await readFile(resolve(root,'public',path.slice(1))));return;}
    if(path==='/home-preview/'){
      res.setHeader('content-type','text/html');
      res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:20px;background:#f6eff5}.cdh{max-width:1000px;margin:auto}*{box-sizing:border-box}</style><style>'+await readFile(resolve(root,'styles/home-funnel.css'),'utf8')+'</style><div class="cdh">'+renderNeoEmailHomeEntry()+'</div></html>');return;
    }
    if(path==='/__neo_mock__/status'){res.setHeader('content-type','application/json');res.end('{"mock":true}');return;}
    if(path.startsWith('/__neo_mock__/pay/')){
      const order=await mock.pay(path.split('/').at(-1));res.setHeader('content-type','application/json');res.end(JSON.stringify({order}));return;
    }
    if(path.startsWith('/api/')){
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const response=await handleNeoConsultations(new Request(origin+req.url,{method:req.method,...(req.method!=='GET'?{body:Buffer.concat(chunks).toString()}: {})}),
        {service:mock.service,userId:'mock-browser-owner',admin:path.startsWith('/api/admin/')?{id:'mock-neo-admin'}:undefined});
      res.statusCode=response.status;res.setHeader('content-type','application/json');res.end(await response.text());return;
    }
    if(path==='/app.js'||path==='/app.css'){res.setHeader('content-type',path.endsWith('css')?'text/css':'text/javascript');res.end(await readFile(resolve(out,path.slice(1))));return;}
    res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><style>body{margin:0}button,input,textarea,select{font-family:inherit}</style><div id="root"></div><script src="/app.js"></script></html>');
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
    await expect(page.locator('img[src="'+NEO_EMAIL_PORTRAIT+'"]')).toBeVisible();
    assert.equal(await page.locator('img[src="'+NEO_EMAIL_PORTRAIT+'"]').evaluate(img=>img.naturalWidth),600);
    await page.getByLabel('질문 1',{exact:true}).fill('직장을 옮기기 전에 고려할 점은 무엇인가요?');
    await page.getByRole('button',{name:'질문 추가하기',exact:false}).click();
    await page.getByLabel('질문 2',{exact:true}).fill('관계에서 반복되는 패턴을 어떻게 바꾸면 좋을까요?');
    assert.ok(await page.getByText('20,000원',{exact:true}).isVisible());
    await page.getByRole('button',{name:'질문 2 삭제'}).click();
    assert.equal(await page.locator('textarea[id^="neo-q-"]').count(),1);
    await page.getByRole('button',{name:'질문 추가하기',exact:false}).click();
    await page.getByLabel('질문 2',{exact:true}).fill('관계에서 반복되는 패턴을 어떻게 바꾸면 좋을까요?');
    await page.getByRole('button',{name:'다음',exact:true}).click();
    await page.getByLabel('회신 이메일').fill('browser@example.invalid');
    await page.getByLabel('상담과 회신을 위한').check();
    await page.getByRole('button',{name:'이전',exact:true}).click();
    assert.match(await page.getByLabel('질문 1',{exact:true}).inputValue(),/직장/);
    await page.getByRole('button',{name:'다음',exact:true}).click();
    assert.equal(await page.getByLabel('회신 이메일').inputValue(),'browser@example.invalid');
    await page.getByRole('button',{name:'다음',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const path=resolve(out,'customer-'+width+'.png');await page.screenshot({path,fullPage:true});captures.push(path);
    if(width===390) {
      await page.getByRole('button',{name:'모의 결제로 상담 신청하기'}).click();
      await page.getByRole('heading',{name:'접수 완료',exact:true}).waitFor();
    }
  }
  await page.goto(base+'/admin/neo-consultations/');
  await page.getByRole('button',{name:/직장을 옮기기/}).click();
  await page.getByLabel('질문 1 답변',{exact:true}).fill('이직의 조건을 나눠 살펴보세요.\n보상과 업무 환경을 각각 확인하고 선택 기준을 정하세요.');
  await page.getByRole('button',{name:'답변 저장하기',exact:true}).nth(0).click();
  await page.getByRole('button',{name:'직접 검수 완료',exact:true}).nth(0).click();
  assert.equal(await page.getByRole('button',{name:'검수한 답변 발송 예약',exact:true}).isEnabled(),false);
  await page.getByLabel('질문 2 답변',{exact:true}).fill('상대에게 맞추기 전에 내가 지킬 경계를 정하세요.');
  await page.getByRole('button',{name:'답변 저장하기',exact:true}).nth(1).click();
  await page.getByRole('button',{name:'직접 검수 완료',exact:true}).nth(1).click();
  await page.getByRole('button',{name:'검수한 답변 발송 예약',exact:true}).click();
  await expect(page.getByRole('button',{name:'예약 메일 전달하기',exact:true})).toHaveCount(2);
  await page.getByRole('button',{name:'예약 메일 전달하기',exact:true}).last().click();
  await page.getByRole('heading',{name:'답변 발송 완료',exact:true}).waitFor();
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const path=resolve(out,'admin-'+width+'.png');await page.screenshot({path,fullPage:true});captures.push(path);
  }
  await page.goto(base+'/neo-consultation/');
  await page.getByRole('button',{name:'구매 기록 확인하기'}).click();
  await page.getByRole('button',{name:/직장을 옮기기.*답변 발송 완료/}).click();
  await page.getByRole('heading',{name:'네오 검수 완료 · 나의 답변'}).waitFor();
  await page.goto(base+'/home-preview/');
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    await page.locator('img').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const path=resolve(out,'home-'+width+'.png');await page.screenshot({path,fullPage:true});captures.push(path);
  }
  await page.getByRole('link',{name:'질문 작성 화면 보기'}).click();
  await page.getByRole('heading',{name:/네오에게.*물어봐/}).waitFor();
  assert.equal(mock.paymentRows.size,1);assert.equal(mock.mails.length,1);
  assert.deepEqual(errors,[]);
  await writeFile(resolve(out,'result.json'),JSON.stringify({passed:true,captures,externalRequestsAllowed:false,paymentCount:mock.paymentRows.size,mailCount:mock.mails.length},null,2));
  console.log(JSON.stringify({passed:true,captures,paymentCount:mock.paymentRows.size,mailCount:mock.mails.length},null,2));
} finally { await browser.close(); await new Promise(resolveClose=>server.close(resolveClose)); }
