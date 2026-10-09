// Run from the repository root: node scripts/qa/verify-yeongnyangi-intake.mjs
// Actual React components + mocked Next navigation and loopback API. No LLM/payment/DB calls.
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),Module=require('node:module');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yn-intake-'));
let browser;
let server;
try {




await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Consultation from './app/yeongnyangi/_components/Consultation';import styles from './app/yeongnyangi/yeongnyangi.module.css';import './app/yeongnyangi/night-tokens.css';createRoot(document.getElementById('root')).render(<main className={styles.page} data-yn-night><Consultation/></main>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,outfile:path.join(temp,"fixture.js"),platform:'browser',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"development"'},plugins:[{name:'next-fixtures',setup(b){b.onResolve({filter:/^next\/(navigation|image|link)$/},args=>({path:args.path,namespace:'mock-next'}));b.onLoad({filter:/.*/,namespace:'mock-next'},args=>({loader:'tsx',resolveDir:process.cwd(),contents:args.path.endsWith('navigation')?"export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:()=>{},replace:()=>{},refresh:()=>{}});":"import React from 'react';export default function Component(p){return React.createElement('"+(args.path.endsWith('image')?'img':'a')+"',p)}"}));}}]});
server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 let file=pathname==='/fixture.js'?path.join(temp,"fixture.js"):pathname==='/fixture.css'?path.join(temp,"fixture.css"):pathname.startsWith('/assets/')?'public'+pathname:null;
 if(file&&fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'application/octet-stream');res.end(fs.readFileSync(path.resolve(file)));return;}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0"><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;








const b=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const m=new Module(path.resolve('mock-products.cjs'));m._compile(b.outputFiles[0].text,m.id);
const products=m.exports.products.map(p=>({...p,available:true}));

browser=await chromium.launch({headless:true});
const errors=[],requests=[],profileWrites=[];let guest=false,failProfile=true;
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await context.addInitScript(()=>localStorage.setItem('fortune_auth_user',JSON.stringify({_id:'intake-mock',id:'intake-mock',name:'테스트'})));
const profile={id:'mock-profile',profileId:'mock-profile',name:'테스트 손님',gender:'F',birthDate:'1994-05-16',birth:{year:1994,month:5,day:16,hour:10,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',tz:'Asia/Seoul',lat:37.56,lng:126.97}};
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname!=='localhost'&&u.hostname!=='127.0.0.1')return route.abort();
 if(u.pathname==='/login/')return route.fulfill({contentType:'text/html',body:'<p>Mock login</p>'});
 if(u.pathname.startsWith('/api/')){
  let data={ok:true},status=200;
  if(u.pathname.endsWith('/products'))data={products};
  else if(u.pathname.endsWith('/profiles')){
   if(route.request().method()==='POST'){const body=route.request().postDataJSON();profileWrites.push(body);if(failProfile){failProfile=false;status=503;data={ok:false,message:'테스트 프로필 저장 오류'};}else data={ok:true,profile:{...body.profile,birthDate:'1994-05-16'}};}
   else if(guest){status=401;data={ok:false};}
   else data={ok:true,profiles:[profile,{...profile,id:'mock-partner',profileId:'mock-partner',name:'상대 프로필'}],currentId:profile.profileId};
  }
  else if(u.pathname.endsWith('/saju/jong-check'))data={check:null};
  else if(u.pathname==='/api/yeongnyangi/requests'){requests.push(route.request().postDataJSON());status=503;data={ok:false,message:'테스트 오류: 입력을 유지하고 다시 시도해 주세요.'};}
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 }
 return route.continue();
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/yeongnyangi/fortune/',{waitUntil:'domcontentloaded',timeout:180000});
const chat=page.getByRole('region',{name:'영냥이와 상담 준비'});
await chat.waitFor({timeout:180000});

await page.setViewportSize({width:390,height:844});

await chat.getByRole('textbox').fill('부탁을 거절할 때 어떻게 말하면 좋을까?');
await chat.getByRole('textbox').dispatchEvent('keydown',{key:'Enter',ctrlKey:true,isComposing:true,keyCode:229});
assert.equal(await chat.getByRole('textbox').inputValue(),'부탁을 거절할 때 어떻게 말하면 좋을까?');
// Messenger composer: count stays hidden until 80% of the limit; Shift+Enter breaks lines, Enter sends.
assert.equal(await chat.getByText('/1,000').count(),0);
await chat.getByRole('textbox').fill('가'.repeat(820));
await chat.getByText('820/1,000',{exact:true}).waitFor();
await chat.getByRole('textbox').fill('부탁을 거절할 때 어떻게 말하면 좋을까?');
await chat.getByRole('textbox').press('Shift+Enter');
assert.equal(await chat.getByRole('textbox').inputValue(),'부탁을 거절할 때 어떻게 말하면 좋을까?\n');
await chat.getByRole('textbox').fill('부탁을 거절할 때 어떻게 말하면 좋을까?');

await chat.getByRole('textbox').press('Enter');
const next=()=>chat.getByRole('button',{name:'선택 확인하고 계속하기',exact:true}).click();

await next();await next();await next();
await chat.getByRole('button',{name:'앞에서 말한 내용으로 충분해',exact:true}).click();
await chat.getByRole('button',{name:'답장 보내기',exact:true}).click();
await chat.getByRole('button',{name:'기간은 정하지 않을게',exact:true}).click();
await next();
await chat.getByRole('button',{name:'범위·가격 확인하고 계속하기',exact:true}).click();
await next();await next();
await chat.getByRole('heading',{name:'상담 내용 확인'}).waitFor();
await page.reload({waitUntil:'domcontentloaded'});
await chat.getByRole('heading',{name:'상담 내용 확인'}).waitFor({timeout:30000});


const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,chat:document.querySelector('section[aria-label="영냥이와 상담 준비"]').getBoundingClientRect().toJSON()}));
assert.ok(bounds.scroll<=bounds.width+1,JSON.stringify(bounds));
const checkout=chat.getByRole('button',{name:/결제.*계속|결제.*진행|결제.*이동|결제.*확인/}).last();

if(await checkout.count()){await checkout.click();await chat.getByRole('alert').filter({hasText:'테스트 오류'}).waitFor();}
assert.equal(requests.length,1);
assert.equal(requests[0].question,'부탁을 거절할 때 어떻게 말하면 좋을까?');
assert.equal(requests[0].questionDecision.confirmed,true);
assert.equal(requests[0].productId,'saju_mackerel');
assert.equal(requests[0].profileId,'mock-profile');
assert.equal(requests[0].consultationKind,'ask');
assert.ok(requests[0].consultationAttemptId);
console.log(JSON.stringify({result:'PASS',bounds,errors,requestKeys:Object.keys(requests[0])},null,2));
// Every request below is intercepted above; no paid operation or generation can escape.
const seed=async ({patch={},domain='saju',fish='mackerel',question='내 마음을 어떻게 표현할까?',step='review',tarotPlan})=>{
 await page.evaluate(({patch,domain,fish,question,step,tarotPlan})=>{
  sessionStorage.setItem('yeongnyangi:consultation-login-draft',JSON.stringify({path:'/yeongnyangi/fortune/',locale:'ko',productId:domain+'_'+fish,consultationKind:domain==='tarot'?'spread':patch.target==='pair'?'compatibility':'ask',profileId:'mock-profile',partnerId:patch.target==='pair'?'mock-partner':'',question,questionDecision:{version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'현재 상황',options:'',constraints:'',period:'',confirmed:true,...patch},voiceStyle:'banmal',chatStep:step,tarotPlan,savedAt:Date.now()}));
 },{patch,domain,fish,question,step,tarotPlan});
 await page.reload({waitUntil:'domcontentloaded'});await chat.waitFor({timeout:90000});
};
await seed({patch:{category:'career',options:'이직 준비',constraints:'주말에 준비',period:'올해'},fish:'salmon'});
await chat.getByRole('heading',{name:'상담 내용 확인'}).waitFor();
await chat.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
await chat.getByRole('alert').filter({hasText:'테스트 오류'}).waitFor();
assert.equal(requests.at(-1).productId,'saju_salmon');
await seed({domain:'tarot',step:'tarot'});
await next();
// Optional spread-specific context appears only when the selected spread needs it.
for(let i=0;i<5&&!(await chat.getByRole('heading',{name:'상담 내용 확인'}).count());i++)await next();
await chat.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
await chat.getByRole('alert').filter({hasText:'테스트 오류'}).waitFor();
assert.equal(requests.at(-1).productId,'tarot_mackerel');assert.ok(requests.at(-1).tarotSpreadId);
await seed({patch:{horizon:'transition',period:'현재와 다음 대운'},fish:'tuna',domain:'tarot'});
await chat.getByRole('button',{name:'범위·가격 확인하고 계속하기',exact:true}).waitFor();
assert.equal(await chat.getByRole('button',{name:'범위·가격 확인하고 계속하기',exact:true}).isDisabled(),true);
await seed({patch:{category:'career',options:'',constraints:'',period:''},fish:'salmon'});
await chat.getByRole('textbox').waitFor();
assert.equal(await chat.getByRole('button',{name:'답장 보내기',exact:true}).isDisabled(),true);
await chat.getByRole('textbox').fill('두 회사 비교');
// Filling a restored missing field must not skip its explicit send action.
assert.equal(await chat.getByRole('textbox').inputValue(),'두 회사 비교');
await chat.getByRole('button',{name:'답장 보내기',exact:true}).click();
assert.equal(await chat.getByRole('textbox').inputValue(),'');
await page.setViewportSize({width:390,height:520});
await chat.getByRole('textbox').focus();

const sendBox=await chat.getByRole('button',{name:'답장 보내기',exact:true}).boundingBox();
assert.ok(sendBox.y+sendBox.height<=520,JSON.stringify(sendBox));
await page.setViewportSize({width:390,height:844});
await seed({patch:{target:'pair',relationshipType:'family'},fish:'flounder'});
await chat.getByRole('heading',{name:'상담 내용 확인'}).waitFor();
await chat.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
await chat.getByRole('alert').filter({hasText:'테스트 오류'}).waitFor();
assert.equal(requests.at(-1).partnerProfileId,'mock-partner');assert.equal(requests.at(-1).productId,'saju_flounder');
await seed({patch:{horizon:'transition',period:'현재와 다음 대운'},fish:'tuna'});
await chat.getByRole('heading',{name:'상담 내용 확인'}).waitFor();
await chat.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
await chat.getByRole('alert').filter({hasText:'테스트 오류'}).waitFor();
assert.equal(requests.at(-1).productId,'saju_tuna');
await seed({step:'profile'});
await page.setViewportSize({width:1000,height:760});
await chat.getByRole('button',{name:'새 프로필 만들기',exact:true}).click();
// Profile input lives in the bottom composer: one send button, no default continue button.
const sends=chat.getByRole('button',{name:/^(답장 보내기|프로필 저장하기|선택 확인하고 계속하기)$/});
await chat.locator('[name=name]').waitFor();await chat.getByRole('button',{name:'선택 확인하고 계속하기',exact:true}).waitFor({state:'detached'});
assert.equal(await sends.count(),1);
const transcriptAtBottom=()=>page.evaluate(()=>{const el=[...document.querySelectorAll('section[aria-label="영냥이와 상담 준비"] div')].find(d=>d.firstElementChild?.tagName==='P'&&d.firstElementChild.textContent.startsWith('상담 준비 대화예요'));return {gap:el.scrollHeight-el.scrollTop-el.clientHeight,overflow:el.scrollHeight>el.clientHeight};});
assert.ok(await chat.locator('[name=name]').evaluate(el=>el===document.activeElement),'desktop focuses the name field');
await chat.locator('[name=name]').fill('새 손님');
await chat.locator('[name=name]').press('Enter');
await chat.getByRole('button',{name:'남성',exact:true}).waitFor();
assert.equal(await sends.count(),1);
await page.waitForTimeout(50);
{const at=await transcriptAtBottom();assert.ok(at.overflow&&at.gap<2,JSON.stringify(at));}
await chat.getByRole('button',{name:'답장 보내기',exact:true}).click();
await chat.locator('p',{hasText:/^여성$/}).waitFor();
await chat.locator('[name=date]').fill('1994-05-16');
await chat.getByRole('button',{name:'답장 보내기',exact:true}).click();
await chat.locator('[name=time]').fill('10:30');
await chat.getByRole('button',{name:'답장 보내기',exact:true}).click();
await page.waitForTimeout(50);
{const at=await transcriptAtBottom();assert.ok(at.gap<2,JSON.stringify(at));}
await chat.getByRole('button',{name:'프로필 저장하기',exact:true}).click();
await chat.getByRole('alert').filter({hasText:'테스트 프로필 저장 오류'}).waitFor();
assert.equal(await chat.locator('[name=name]').inputValue(),'새 손님');
await chat.getByRole('button',{name:'프로필 저장하기',exact:true}).click();
await chat.getByRole('button',{name:/새 손님/}).waitFor();
assert.equal(profileWrites.length,2);assert.equal(profileWrites[0].profile.profileId,profileWrites[1].profile.profileId);
assert.deepEqual({gender:profileWrites[1].profile.gender,birth:profileWrites[1].profile.birth},{gender:'F',birth:{year:1994,month:5,day:16,hour:10,minute:30,timeUnknown:false,calType:'solar'}});
assert.equal(await chat.getByRole('button',{name:'선택 확인하고 계속하기',exact:true}).count(),1);
await page.setViewportSize({width:1440,height:1000});
guest=true;
await seed({step:'profile'});
await chat.getByRole('button',{name:'로그인하고 프로필 보기',exact:true}).click();
await page.waitForURL('**/login/**');
const loginDraft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('yeongnyangi:consultation-login-draft')));
assert.equal(loginDraft.questionDecision.confirmed,true);assert.equal(loginDraft.chatStep,'profile');
guest=false;await page.goto(base+'/yeongnyangi/fortune/',{waitUntil:'domcontentloaded'});
await chat.getByRole('button',{name:'선택 확인하고 계속하기',exact:true}).waitFor();
assert.ok(await chat.getByRole('button',{name:/테스트 손님/}).count());
console.log('Additional PASS: pair, transition, profile save error + retry, guest login + resume.');
console.log('Additional PASS: career, tarot, unsupported transition, restored missing input, small viewport. Requests:',requests.length);


} finally {
 await browser?.close();
 if(server?.listening)await new Promise(resolve=>server.close(resolve));
 if(path.dirname(path.resolve(temp))===path.resolve(os.tmpdir())&&path.basename(temp).startsWith('yn-intake-'))fs.rmSync(temp,{recursive:true,force:true});
}
