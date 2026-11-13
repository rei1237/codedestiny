import assert from 'node:assert/strict';
import test from 'node:test';
import {chartFixture} from './chart-fixture.mjs';
import {reviewServices,reviewYeongnyangiHref,resolveReviewEntry,requiresOwnedReceipt,ownsReviewReceipt} from '../src/review-scope.mjs';

test('the first home offers only seven services and internal support links',async()=>{
  const {dom,React,createRoot,Component}=await chartFixture('ReviewHome.tsx','/');
  const root=createRoot(document.getElementById('chart'));
  try {
    const opened=[];
    await React.act(()=>root.render(React.createElement(Component,{onInternalOpen:href=>opened.push(href)})));
    const links=[...document.querySelectorAll('a')].map(link=>link.getAttribute('href'));
    assert.deepEqual(reviewServices.map(row=>row.id),['today-hub','saju','manse','animal-destiny','famous-saju','fortune-chat','yeongnyangi']);
    assert.deepEqual(links,['/settings',...reviewServices.map(row=>row.href),'/library','/recovery','/support']);
    assert.equal(new Set(reviewServices.map(row=>row.href)).size,7);
    for(const href of links){
      const url=new URL(href,'https://mock.test');
      assert.deepEqual(resolveReviewEntry(url.pathname,url.search,false),{receipt:false});
    }
    const activate=(href,modifiers={})=>{
      let intercepted;
      document.addEventListener('click',event=>{intercepted=event.defaultPrevented;event.preventDefault();},{once:true});
      const link=[...document.links].find(anchor=>anchor.getAttribute('href')===href);
      assert.ok(link);
      link.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,...modifiers}));
      return intercepted;
    };
    assert.equal(activate('/daily',{ctrlKey:true}),false);
    assert.equal(activate(reviewYeongnyangiHref),false);
    assert.equal(activate('/daily',{detail:0}),true);
    assert.deepEqual(opened,['/daily']);
  } finally {await React.act(()=>root.unmount());dom.window.close();}
});

test('web aliases and both service shells obey review scope before rendering',()=>{
  for(const path of ['/saju/career-style','/music','/nakshatra/codex/2','/codedestiny-novel.html','/catalog','/birth','/purchase','/psychotest/','/fpti/result/','/neo-operation-room/','/fortune-tea-house/']){
    assert.deepEqual(resolveReviewEntry(path,'',true),{redirect:'/'},path);
  }
  for(const action of ['cdHomeAstroEntry','cdHomeVedicEntry'])
    assert.deepEqual(resolveReviewEntry('/index.html','?action='+action,false),{redirect:'/'});
  assert.deepEqual(resolveReviewEntry('/index.html','?action=cdOneStepFreeSajuEntry',false),{receipt:false});
  for(const query of ['','?domain=tarot','?product=vedic_tuna','?fish=tuna','?mode=spirit','?domain=saju&flow=question&product=tarot_tuna']){
    assert.deepEqual(resolveReviewEntry('/yeongnyangi/fortune/',query,true),{redirect:reviewYeongnyangiHref});
  }
  assert.deepEqual(resolveReviewEntry('/fortune-tea-house/','?counsel=letter&session=other',true),{redirect:'/'});
  assert.deepEqual(resolveReviewEntry('/fortune-tea-house/','?counsel=letter&orderId=saved',true),{receipt:false});
  assert.deepEqual(resolveReviewEntry('/fortune-tea-house/','?counsel=letter&resultId=other',true),{receipt:true});
  for(const path of ['/checkout','/login','/result','/records','/yeongnyangi/result/','/yeongnyangi/library','/privacy-policy','/refund-policy','/contact','/withdraw']){
    assert.deepEqual(resolveReviewEntry(path,'',true),{receipt:false},path);
  }
});

test('excluded services may reopen only the exact order-backed URL in the signed-in library',async()=>{
  const href='/life-book-ai/result/?attemptId=saved';
  const row={href,status:'PURCHASED',state:'completed'};
  assert.deepEqual(resolveReviewEntry('/life-book-ai/result/','?attemptId=saved',true),{receipt:true});
  assert.ok(await ownsReviewReceipt(href,async cursor=>cursor?{purchases:[row]}:{purchases:[],nextCursor:'next'}));
  for(const change of [{href:href+'&product=new'},{href:'/life-book-ai/'},{status:'REFUNDED'},{status:'UNKNOWN'},{state:'ACCESS_REVIEW'},{state:'READ_FAILED'}])
    assert.equal(await ownsReviewReceipt(href,async()=>({purchases:[{...row,...change}]})),false);
  assert.equal(await ownsReviewReceipt(href,async()=>({purchases:[],nextCursor:'repeat'})),false);
});

test('switching accounts unmounts a verified record before checking the next account',async()=>{
  const href='/life-book-ai/result/?attemptId=saved';
  const {dom,React,createRoot,Component}=await chartFixture('ReviewReceipt.tsx',href,[{
    name:'review-session',
    setup(builder){
      builder.onResolve({filter:/^\.\/platform$/},()=>({path:'session',namespace:'scope-session'}));
      builder.onLoad({filter:/.*/,namespace:'scope-session'},()=>({contents:`
        export const restoreSession=async()=>true,getTossSessionRevision=()=>window.epoch;
        export const onTossSessionRevisionChanged=fn=>{window.addEventListener('session',fn);return ()=>window.removeEventListener('session',fn);};
        export const api=()=>window.read();
      `}));
    },
  }]);
  const root=createRoot(document.getElementById('chart'));
  window.epoch=1;
  window.read=async()=>({purchases:[{href,state:'completed',status:'PURCHASED'}]});
  let ended=0,resolve;
  function Record(){React.useEffect(()=>()=>{ended++;},[]);return React.createElement('p',null,'소유자 기록');}
  try{
    await React.act(async()=>{root.render(React.createElement(Component,{href},React.createElement(Record)));});
    assert.match(document.body.textContent,/소유자 기록/);
    window.read=()=>new Promise(done=>{resolve=done;});
    await React.act(()=>{window.epoch++;window.dispatchEvent(new window.Event('session'));});
    assert.equal(ended,1);
    assert.doesNotMatch(document.body.textContent,/소유자 기록/);
    await React.act(async()=>{resolve({purchases:[]});});
    assert.doesNotMatch(document.body.textContent,/소유자 기록/);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});

test('service discovery and order verification are independent at the miniapp entry',()=>{
  for(const path of ['/','/neo-operation-room/','/life-book-ai/','/yeongnyangi/fortune/'])assert.equal(requiresOwnedReceipt(path,'?domain=vedic&flow=question'),false);
  for(const [path,query] of [['/life-book-ai/result/','?attemptId=x'],['/tarot-library','?orderId=x'],['/neo-operation-room/','?resultId=x']])assert.equal(requiresOwnedReceipt(path,query),true);
});
