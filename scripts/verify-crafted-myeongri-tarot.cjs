// 2026-11-05: 세 장 풀이가 무료가 되어 판매 안내 오퍼를 걷었다. 예전 오퍼 검증 대신 오퍼와 결제 버튼이 다시 나오지 않는지 본다.
// 사용: 공개 정적 파일을 http://127.0.0.1:14330 으로 띄운 뒤 실행한다. API는 전부 mock, 외부 요청은 차단한다.
const assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{
  const key='tarot-myeongri-three-card',origin='http://127.0.0.1:14330';
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:390,height:900},locale:'ko-KR',reducedMotion:'reduce'});
    let posts=0;
    await page.routeWebSocket('**',s=>s.close());
    await page.route('**/*',r=>{
      const u=new URL(r.request().url());
      if(u.origin!==origin)return r.abort();
      if(r.request().method()==='POST'&&!u.pathname.startsWith('/__nextjs'))posts++;
      if(u.pathname.startsWith('/api/'))return r.fulfill({json:{ok:true,authenticated:false,profiles:[],unlocks:[],data:{}}});
      return r.continue();
    });
    await page.goto(origin+'/ggulggul/?lang=ko');
    await page.waitForFunction(()=>typeof window.openTarotModal==='function');
    await page.evaluate(()=>window.openTarotModal());
    await page.waitForFunction(()=>{const s=document.getElementById('tarotRitualStage');return s&&!s.hidden;});
    const state=await page.evaluate(k=>{
      const offer=document.querySelector('[data-crafted-static-offer="'+k+'"]');
      const finalBtn=document.getElementById('tarotFinalBtn');
      const mode=document.querySelector('[data-action="setTarotMode"][data-action-args="three"]');
      return{offerHidden:!!offer&&offer.hidden,offerMounted:!!(offer&&offer.querySelector('.saju-crafted-offer')),finalVisible:!!finalBtn&&finalBtn.offsetParent!==null,finalText:finalBtn?finalBtn.textContent:'',mode:mode?mode.textContent:''};
    },key);
    assert.equal(state.offerHidden,true);
    assert.equal(state.offerMounted,false);
    assert.equal(state.finalVisible,false);
    assert.doesNotMatch(state.finalText,/5,000/);
    assert.match(state.mode,/무료/);
    assert.equal(posts,0);
    console.log('myeongri-tarot-three retired',state,{posts});
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
