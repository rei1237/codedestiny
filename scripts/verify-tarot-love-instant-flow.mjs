// Actual static client and continuation runner with all network/payment mocked.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), "utf8");

// ── 0. 루트/public 사본 동기화 ──
for (const pair of [
  ["js/tarot-love-experience.js", "public/js/tarot-love-experience.js"],
  ["styles/tarot-love-mystic.css", "public/styles/tarot-love-mystic.css"],
]) {
  assert.equal(read(pair[0]), read(pair[1]), `${pair[0]}: 루트와 public/ 사본이 다릅니다 — npm run sync:public 실행 필요`);
}

// ── jsdom 하네스 ──
const html = `<!doctype html><body>
  <div id="tarotLoveOverlay">
    <div class="tarot-love-panel">
      <section id="tarotLoveIntroStage" class="tarot-love-stage is-active"></section>
      <section id="tarotLoveDrawStage" class="tarot-love-stage">
        <div id="tarotLoveSpreadGuide"></div>
        <div id="tarotLoveCardGrid"></div>
        <button id="tarotLoveFinalBtn" disabled></button>
      </section>
      <section id="tarotLoveResultStage" class="tarot-love-stage">
        <div id="tarotLoveReadingContent"></div>
        <div id="tarotLoveResultCardsStrip"></div>
      </section>
      <p id="tarotLoveSubtitle"></p>
    </div>
  </div>
</body>`;


const dom = new JSDOM(html, { url: 'https://mock.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const win=dom.window,doc=win.document,fetchCalls=[],gates=[],alerts=[];
win.AbortController=globalThis.AbortController;
const timeout=win.setTimeout.bind(win);win.setTimeout=(fn,ms,...args)=>timeout(fn,ms<=5000?1:ms,...args);
win.localStorage.setItem('fortune_auth_token','verify-token');win.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'owner-a'}));
win.alert=message=>alerts.push(message);let auto=[],stored=null;
win.fetch=(url,init={})=>{
 url=String(url);if(!url.startsWith('/api/'))throw Error('External fetch forbidden: '+url);
 const call={url,body:init.body?JSON.parse(init.body):null,settled:false};fetchCalls.push(call);
 const promise=new Promise((resolve,reject)=>{call.resolveWith=(data,status=200)=>{call.settled=true;resolve({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});};call.rejectWith=reject;});
 if(url.includes('/auth/me'))call.resolveWith({ok:true,user:JSON.parse(win.localStorage.getItem('fortune_auth_user'))});
 else if(url.includes('/love-result'))call.resolveWith(stored||{ok:false},stored?(stored.saved?200:202):404);
 else if(url.includes('/billing/refund'))call.resolveWith({ok:true});
 else if(url.includes('/love-reading')&&auto.length){const [status,data]=auto.shift();call.resolveWith(data,status);}
 else if(!url.includes('/love-reading')&&!url.includes('/draw'))throw Error('Unexpected request: '+url);
 return promise;
};
win._cdCoinGatePerUse=(cost,reason,onOk,_cancel,options)=>{gates.push(options);onOk('0123456789abcdef01234567',{});};
win.eval(read('js/core/paid-narrative-reader.js'));win.eval(read('js/tarot-love-experience.js'));
doc.getElementById('tarotLoveOverlay').classList.add('is-open');
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setTimeout(resolve,1));};
const calls=end=>fetchCalls.filter(call=>call.url.includes(end));
const pending=end=>calls(end).filter(call=>!call.settled);
const cards=marker=>Array.from({length:6},(_,i)=>({cardId:'M'+String(i).padStart(2,'0'),nameKr:marker+i,position:'position_'+(i+1),orientation:'upright'}));
const draw=doc.getElementById('tarotLoveDrawStage'),grid=doc.getElementById('tarotLoveCardGrid'),content=doc.getElementById('tarotLoveReadingContent');
const partial={ok:true,status:'partial',saved:false,retryable:true,resultId:'saved-love-result',resumeBody:{resumeResultId:'saved-love-result'},completedParts:['first'],totalParts:21,deliverySections:[{key:'first',title:'카드 근거',body:'먼저 저장된 해석입니다.'}]};
const complete={...partial,status:'completed',saved:true,reading:{overallVibe:'완료'},deliverySections:[...partial.deliverySections,{key:'last',title:'마지막 조언',body:'끝까지 전달한 해석입니다.'}]};
win.startTarotLoveReading();assert.equal(draw.classList.contains('is-active'),true);assert.equal(grid.querySelectorAll('.tarot-love-slot').length,6);
calls('/draw')[0].resolveWith({ok:true,cards:cards('서버')});await flush();assert.match(grid.textContent,/서버0/);
for(let i=0;i<6;i++)win.flipTarotLoveCard(i);assert.equal(calls('/love-reading').length,0,'No paid LLM before gate');
win.showTarotLoveFinalReading();await flush();assert.equal(calls('/love-reading').length,1);
const original=calls('/love-reading')[0].body;assert.equal(original.requestId,gates[0].requestId);assert.equal(gates[0].resume.args.requestId,original.requestId);
calls('/love-reading')[0].resolveWith(partial,202);await flush();assert.match(content.textContent,/먼저 저장된/);assert.deepEqual(pending('/love-reading')[0].body,{resumeResultId:'saved-love-result'});
pending('/love-reading')[0].resolveWith(complete);await flush();assert.match(content.textContent,/끝까지 전달/);assert.equal(calls('/billing/refund').length,0);
// Storage failures preserve the paid attempt and keep manual retry outside the gate.
win.resetTarotLoveFlow();win.startTarotLoveReading();for(let i=0;i<6;i++)win.flipTarotLoveCard(i);
auto=Array.from({length:4},()=>[503,{ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE'}]);win.showTarotLoveFinalReading();await flush();
assert.ok(content.querySelector('[data-love-continue]'));assert.equal(gates.length,2);assert.equal(calls('/billing/refund').length,0);
const failedOriginal=calls('/love-reading').at(-1).body;auto=[[200,complete]];content.querySelector('[data-love-continue]').click();await flush();assert.equal(gates.length,2);assert.deepEqual(calls('/love-reading').at(-1).body,failedOriginal);
// Reopening retrieves the saved result without a new LLM request or payment.
stored={...complete,resumeInputs:failedOriginal};const before=calls('/love-reading').length;win.closeTarotLoveModal();win.openTarotLoveModal();await flush();assert.match(content.textContent,/끝까지 전달/);assert.equal(calls('/love-reading').length,before);assert.equal(gates.length,2);
// A confirmed exhausted generation with its original charge keeps the existing refund path.
stored=null;win.resetTarotLoveFlow();win.startTarotLoveReading();for(let i=0;i<6;i++)win.flipTarotLoveCard(i);auto=[[202,{...partial,retryable:false}]];win.showTarotLoveFinalReading();await flush();assert.equal(calls('/billing/refund').length,1);assert.equal(calls('/billing/refund')[0].body.sourceTransactionId,'0123456789abcdef01234567');
// An account change discards a late generated result.
win.resetTarotLoveFlow();win.startTarotLoveReading();for(let i=0;i<6;i++)win.flipTarotLoveCard(i);win.showTarotLoveFinalReading();await flush();const staleReading=pending('/love-reading')[0];win.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'owner-b'}));win.dispatchEvent(new win.Event('cd:auth-changed'));await flush();staleReading.resolveWith(complete);await flush();assert.doesNotMatch(content.textContent,/끝까지 전달/);
// Late draw responses cannot revive a reset session.
win.startTarotLoveReading();const staleDraw=pending('/draw').at(-1);win.resetTarotLoveFlow();staleDraw.resolveWith({ok:true,cards:cards('낡은카드')});await flush();assert.doesNotMatch(grid.textContent,/낡은카드/);assert.equal(draw.classList.contains('is-active'),false);
win.close();console.log('verify-tarot-love-instant-flow: OK (instant draw, paid identity, partial delivery, storage retry, reopening, terminal refund and account isolation)');
