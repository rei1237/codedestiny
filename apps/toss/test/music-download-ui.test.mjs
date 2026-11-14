import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFixture} from './chart-fixture.mjs';
const track={title:'테스트 달빛',artist:'Yeoni',audioSourceKey:'yeonisong/test.mp3',featureKey:'music-track-test'},id='a'.repeat(64);
test('mock purchase, remount and file save reuse one owned intent; a new session clears result',async()=>{
 let paid=false,purchases=0,saves=0,prepares=0;
 globalThis.__musicUI={products:async()=>[{sku:'mock-music',featureKey:track.featureKey,approvedPriceKRW:1,displayAmount:'1원',available:true}],async api(path){if(path.endsWith('/prepare')){prepares++;return {id,sku:'mock-music',amountKRW:1,paid};}return {state:paid?'COMPLETED':'PENDING',track};},purchase(_p,_id,done){purchases++;paid=true;queueMicrotask(done);return ()=>{};},save:async()=>{saves++;}};
 const {dom,React,createRoot,Component}=await chartFixture('MusicDownload.tsx','/music',[{name:'music-offline',setup(b){
 b.onResolve({filter:/^\.\/(platform|music-download-file)$/},args=>({path:args.path,namespace:'music'}));
 b.onLoad({filter:/.*/,namespace:'music'},({path})=>({contents:path.endsWith('music-download-file')?'export const saveMusicDownload=(...a)=>globalThis.__musicUI.save(...a);':`export const hasTossSession=()=>true,api=(...a)=>globalThis.__musicUI.api(...a),nativeSaleProducts=()=>globalThis.__musicUI.products(),paymentRequiresReview=()=>false,purchase=(...a)=>globalThis.__musicUI.purchase(...a),getTossSessionRevision=()=>window.testSessionEpoch||0,onTossSessionRevisionChanged=fn=>{window.addEventListener('session',fn);return()=>window.removeEventListener('session',fn)};`}));
 }}]);
 const root=createRoot(document.getElementById('chart')),button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
 try{
 await React.act(async()=>root.render(React.createElement(Component,{track})));
 await React.act(async()=>button('단건 결제로 다운로드 열기').click());
 assert.ok(button('MP3 파일 저장하기'));assert.equal(purchases,1);assert.equal(prepares,1);
 await React.act(async()=>root.render(React.createElement(Component,{intentId:id,key:'reopen'})));
 await React.act(async()=>button('MP3 파일 저장하기').click());assert.equal(saves,1);assert.equal(purchases,1);assert.equal(prepares,1);
 globalThis.__musicUI.api=async()=>{throw Error('RESULT_NOT_FOUND');};
 await React.act(async()=>{window.testSessionEpoch=1;window.dispatchEvent(new window.Event('session'));});
 assert.equal(button('MP3 파일 저장하기'),undefined);assert.match(document.querySelector('[role=alert]').textContent,/다시 결제하지/);
 }finally{await React.act(()=>root.unmount());dom.window.close();delete globalThis.__musicUI;}
});
