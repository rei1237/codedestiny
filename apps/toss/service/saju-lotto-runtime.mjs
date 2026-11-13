// Bind the reviewed free web ritual to the Toss profile's local archive.
export function lottoRuntime(quantum,declarations,between){
  const draw=declarations(quantum,['renderLottoNumbers','renderLottoRitualReport','lottoStoreReport','analyzeFortuneGZ']);
  const share=between(quantum,'window.shareLottoRitualText=function(){','  if(navigator.share)')+' bridge.share(text); };';
  return `
  function mountLotto(context){
    const {gender,termClock,civilYear,storageKey}=context;
    if(!['M','F'].includes(gender)||!termClock||!civilYear)throw Error('Lotto birth input incomplete');
    const G_PILLARS=p,G_NATAL=natal,G_POWER=power,G_JONG=detectJong(p),GENDER=gender;
    const CURRENT_AGE=new Date(Date.now()+9*3600000).getUTCFullYear()-civilYear+1;
    const syncReportHeightFromNode=()=>{}; // The miniapp scrolls its document, without the web accordion.
    const localStorage={
      getItem:key=>storageKey&&key.startsWith('CODE_DESTINY_LOTTO_RITUAL_REPORTS_V1::')?globalThis.localStorage.getItem(storageKey):null,
      setItem:(_,value)=>{if(!storageKey)throw Error('ARCHIVE_SCOPE_REQUIRED');globalThis.localStorage.setItem(storageKey,value);}
    };
    const bazi=attachKasiDaewunBridge({},termClock,civilYear);
    if(!bazi.getYun(gender==='M'?1:0)?.getDaYun()?.length)throw Error('Lotto daeun unavailable');
    window.G_JONG=G_JONG;window.CdSajuBundleOffer={isLottoOpen:()=>true};
    ${draw}
    ${share}
    function renderRitual(state){
      renderLottoRitualReport(state);
      const area=document.getElementById('lottoRitualReportArea');
      const [saveReport,saveCard,share]=area.querySelectorAll('.lr-actions button');
      for(const button of [saveReport,saveCard,share])button.removeAttribute('onclick');
      saveReport.onclick=()=>{
        const status=document.getElementById('lottoRitualSaveStatus');
        try{lottoStoreReport(state);status.textContent='이번 주 리포트를 저장했어요.';refreshArchive();}
        catch{status.textContent='이번 주 리포트를 저장하지 못했어요. 다시 시도해 주세요.';}
      };
      saveCard.onclick=()=>bridge.save(document.getElementById('lottoRitualShareCard'),'saju-weekly-ritual');
      share.onclick=()=>window.shareLottoRitualText();
    }
    function refreshArchive(){
      const archive=document.getElementById('lottoSaved');
      archive.replaceChildren();
      for(const entry of lottoLoadSavedReports().slice().reverse()){
        if(!entry?.report?.ritualCard||!Array.isArray(entry.freeGames)||!Array.isArray(entry.report.numberInsights))continue;
        const button=document.createElement('button');button.type='button';button.textContent=entry.weekKey+' 저장한 리포트 열기';
        button.onclick=()=>{
          const state={weekKey:entry.weekKey,report:entry.report,games:entry.freeGames,firstGameNums:entry.report.shareCard.luckyNumbers,generatedAt:entry.generatedAt};
          const results=document.getElementById('lottoResultArea');
          results.classList.add('show');
          document.getElementById('lottoDrawBtn').hidden=true;
          const games=results.querySelector('.lc-games');
          games.replaceChildren();
          for(const game of entry.freeGames){
            const article=document.createElement('article'),title=document.createElement('strong'),numbers=document.createElement('p');
            article.className='lc-game';title.textContent='GAME '+game.index+' · '+game.tag;
            numbers.textContent=game.nums.join(' · ');article.append(title,numbers);games.append(article);
          }
          for(const selector of ['.lc-wave-box','.lc-reason','.lc-ritual-cta'])results.querySelector(selector).hidden=true;
          renderRitual(state);document.getElementById('lottoRitualReportArea').scrollIntoView({block:'start'});
        };
        archive.appendChild(button);
      }
    }
    renderLottoNumbers(natal,bazi);
    const card=document.getElementById('lottoCard');
    card.addEventListener('click',e=>{
      if(e.target.closest('[data-action="openLottoRitualReport"]'))renderRitual(window.__cdLottoRitualState);
    });
    refreshArchive();
  }`;
}
