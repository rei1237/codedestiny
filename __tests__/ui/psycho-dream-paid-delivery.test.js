const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('index.html','utf8');
const scripts = ['js/core/paid-narrative-reader.js','js/psycho-dream-analyzer-freuds-study.js'].map(file=>fs.readFileSync(file,'utf8'));
const pause = () => new Promise(resolve=>setTimeout(resolve,20));
function setup(fetcher,records={}){
 const dom = new JSDOM(source,{url:'https://mock.test/',runScripts:'outside-only',pretendToBeVisual:true}),win=dom.window;let resume;const gates=[];
 win.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'owner-a'}));for(const[key,value]of Object.entries(records))win.localStorage.setItem(key,value);
 win.fetch=fetcher;win.AbortController=AbortController;win.requestAnimationFrame=()=>0;win.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const timer=win.setTimeout.bind(win);win.setTimeout=(fn,ms)=>timer(fn,ms>=22000?ms:1);win.HTMLElement.prototype.scrollIntoView=function(){};
 win.__cdCheckoutEntry={registerPaidResumeHandler:(_kind,fn)=>{resume=fn;}};
 win._cdCoinGatePerUse=async(cost,_reason,onPaid,_cancel,options)=>{gates.push({cost,options});onPaid();return {ok:true};};
 scripts.forEach(script=>win.eval(script));win.openPsychoDreamModal();return {dom,win,gates,resume:(...args)=>resume(...args)};
}
const reply=(status,payload)=>({status,json:async()=>payload});
const data={ok:true,resultId:'paid-narrative:dream-preview',requestId:'original-dream',dreamText:'친구와 햇살 아래에서 즐겁게 산책하는 꿈을 꾸었습니다.',record:{markdown:'## Chapter 1. 꿈의 장면과 핵심 상징\n\n저장된 꿈의 해석\n\n## Chapter 5. 현실 조언과 치유의 방향\n\n마지막 본문'},chapters:[{title:'Chapter 1. 꿈의 장면과 핵심 상징',body:'저장된 꿈의 해석'}],saved:true,status:'completed'};
test('one payment starts the original dream, storage retry preserves it, and result is shown immediately then reopened',async()=>{
 const posts=[];let completed=false;
 const env=setup(async(url,options)=>{
  assert.match(url,/\/api\/dream\/(psycho-analysis|psycho-result)/);
  if(options.method==='GET')return completed?reply(200,data):reply(404,{});
  const body=JSON.parse(options.body);posts.push(body);data.requestId=posts[0].requestId;
  if(posts.length===1)return reply(503,{ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE'});
  if(posts.length===2)return reply(202,{...data,status:'partial',saved:false,resumeBody:{resumeResultId:data.resultId},completedParts:['chapter-1-a'],totalParts:10});
  completed=true;return reply(200,data);
 });
 await pause();env.win.document.getElementById('psychoDreamInput').value=data.dreamText;
 assert.equal(await env.win.psychoDreamStartAnalysis(),true);assert.equal(env.gates.length,1);assert.equal(env.gates[0].cost,30);
 assert.deepEqual(posts[0],posts[1]);assert.equal(posts[0].dreamText,data.dreamText);assert.deepEqual(posts[2],{resumeResultId:data.resultId});
 assert.equal(env.gates[0].options.requestId,posts[0].requestId);assert.equal(env.gates[0].options.resume.args.dreamText,data.dreamText);
 assert.match(env.win.document.getElementById('psychoDreamResultMarkdown').textContent,/마지막 본문/);
 env.win.document.querySelector('#psychoPaidContents button').click();
 const key='cd:psycho-dream:v2:owner-a',saved=env.win.localStorage.getItem(key);env.dom.window.close();
 const again=setup(async(_url,options)=>{assert.equal(options.method,'GET');return reply(200,data);},{[key]:saved});await pause();
 assert.match(again.win.document.getElementById('psychoDreamResultMarkdown').textContent,/마지막 본문/);assert.match(again.win.document.getElementById('psychoPaidContents').textContent,/읽던 장/);assert.equal(again.gates.length,0);again.dom.window.close();
});
test('a paid redirect preserves dream input and account changes reject its late response',async()=>{
 let release,started=false;const waiting=new Promise(resolve=>{release=resolve;});
 const env=setup(async(_url,options)=>{if(options.method==='GET')return reply(404,{});started=true;assert.equal(JSON.parse(options.body).dreamText,data.dreamText);await waiting;return reply(200,data);});
 await pause();const result=env.resume({args:{dreamText:data.dreamText,requestId:'paid-redirect-request'}});
 for(let i=0;i<30&&!started;i++)await pause();
 env.win.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'owner-b'}));env.win.dispatchEvent(new env.win.Event('cd:auth-changed'));release();
 assert.equal(await result,false);await pause();assert.equal(env.gates.length,0);assert.doesNotMatch(env.win.document.getElementById('psychoDreamResultMarkdown').textContent,/마지막 본문/);assert.equal(env.win.localStorage.getItem('cd:psycho-dream:v2:owner-b'),null);env.dom.window.close();
});
