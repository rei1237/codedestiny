import {firstVisitScope,readFirstVisit,writeFirstVisit,firstVisitEvent,firstVisitHome,firstVisitOverlayBusy,firstVisitLogin,resumeFirstVisitLogin} from '../first-visit-state.mjs';

import {getFirstVisitCopy,hasFirstVisitCopy} from '../first-visit-copy.mjs';

const guideText = key => getFirstVisitCopy(document.documentElement.lang)[key];
const supported = () => hasFirstVisitCopy(document.documentElement.lang);
function refreshGuideCopy() {
  document.querySelectorAll('[data-first-copy]').forEach(el=>{el.textContent=guideText(el.dataset.firstCopy);});
  document.querySelectorAll('[data-first-aria]').forEach(el=>{el.setAttribute('aria-label',guideText(el.dataset.firstAria));});
}
const service = 'ggulggul';
const home = document.getElementById('cdHomeFunnel');
if (home) installGuide();
function installGuide() {
  let scope = firstVisitScope(), profileScope = scope, resultReady = false, opener = null, previewing = false;
  const root = document.createElement('section');
  root.className = 'cd-first'; root.dataset.firstAria='guideLabel'; root.setAttribute('aria-label',guideText('guideLabel'));
  root.innerHTML = `<div class="cd-first__bar"><span data-first-copy="barTitle">${guideText('barTitle')}</span><button type="button" data-first-replay data-first-copy="replay">${guideText('replay')}</button></div><div data-first-progress hidden tabindex="-1"><ol data-first-aria="stepsLabel" aria-label="${guideText('stepsLabel')}"><li data-first-step="1" data-first-copy="stepProfile">${guideText('stepProfile')}</li><li data-first-step="2" data-first-copy="stepReading">${guideText('stepReading')}</li><li data-first-step="3" data-first-copy="stepDeeper">${guideText('stepDeeper')}</li></ol><h2 data-first-title></h2><p data-first-description></p><button class="cd-first__primary" type="button" data-first-continue data-first-copy="start">${guideText('start')}</button><button type="button" data-first-skip data-first-copy="skip">${guideText('skip')}</button></div>`;
  const scenes=()=>[
    {label:guideText('sceneProfileLabel'),title:guideText('sceneProfileTitle'),speech:guideText('sceneProfileBody')},
    {label:guideText('sceneReadingLabel'),title:guideText('sceneReadingTitle'),speech:guideText('sceneReadingBody')},
    {label:guideText('sceneDeeperLabel'),title:guideText('sceneDeeperTitle'),speech:guideText('sceneDeeperBody')}
  ];
  const art=(step=0)=>'<span class="cd-first__art" aria-hidden="true"><img src="/images/first-visit/yeoni-tutorial-v2.webp" width="1440" height="480" alt="" style="left:-'+step*100+'%"></span>';
  const story=document.createElement('div');story.className='cd-first__story';
  story.innerHTML=`<nav class="cd-first__scene-nav" data-first-aria="scenesLabel" aria-label="${guideText('scenesLabel')}">`+scenes().map((scene,index)=>'<button type="button" data-first-scene="'+index+'"><span>'+(index+1)+'</span>'+'<span data-first-copy="'+['sceneProfileLabel','sceneReadingLabel','sceneDeeperLabel'][index]+'">'+scene.label+'</span></button>').join('')+'</nav><div class="cd-first__scene">'+art()+`<div class="cd-first__speech" aria-live="polite"><span class="cd-first__speaker" data-first-copy="speaker">${guideText('speaker')}</span><h2></h2><p></p><button type="button" data-first-next></button></div></div>`;
  root.querySelector('[data-first-progress]').before(story);
  let sceneIndex=0,lastProgressStep=0;
  function showScene(index){
    sceneIndex=index;
    story.querySelector('img').style.left='-'+index*100+'%';
    story.querySelector('h2').textContent=scenes()[index].title;
    story.querySelector('p').textContent=scenes()[index].speech;
    story.querySelector('[data-first-next]').textContent=index===2?guideText('restartScenes'):guideText('nextScene');
    story.querySelectorAll('[data-first-scene]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.firstScene)===index)));
  }
  story.querySelectorAll('[data-first-scene]').forEach(button=>button.addEventListener('click',()=>{previewing=true;showScene(Number(button.dataset.firstScene));sync();}));
  story.querySelector('[data-first-next]').addEventListener('click',()=>{previewing=true;showScene((sceneIndex+1)%scenes().length);sync();});
  showScene(0);
  const howTo=document.createElement('details');howTo.className='cd-first__howto';
  howTo.innerHTML=`<summary data-first-copy="howToTitle">${guideText('howToTitle')}</summary><div><h3 data-first-copy="profileTitle">${guideText('profileTitle')}</h3><p data-first-copy="profileBody">${guideText('profileBody')}</p><p data-first-copy="profileSaved">${guideText('profileSaved')}</p><h3 data-first-copy="readingTitle">${guideText('readingTitle')}</h3><p data-first-copy="readingBody">${guideText('readingBody')}</p><p data-first-copy="readingPace">${guideText('readingPace')}</p><h3 data-first-copy="deeperTitle">${guideText('deeperTitle')}</h3><p data-first-copy="deeperBody">${guideText('deeperBody')}</p><p data-first-copy="paymentNote">${guideText('paymentNote')}</p><h3 data-first-copy="actionTitle">${guideText('actionTitle')}</h3><p data-first-copy="actionBody">${guideText('actionBody')}</p></div>`;
  root.append(howTo);
  const anchor = home.querySelector('.cdh-free');
  if (anchor) anchor.before(root); else home.append(root);
  const dialog = document.createElement('dialog');
  dialog.className = 'cd-first cd-first__welcome';
  dialog.setAttribute('aria-labelledby','cdFirstTitle');dialog.setAttribute('aria-describedby','cdFirstDescription');
  dialog.innerHTML = `<button type="button" class="cd-first__close" data-first-aria="close" aria-label="${guideText('close')}" data-first-close><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><img src="/images/yeoni/welcome/yeoni-welcome-v1-320.webp" width="144" height="144" alt=""><h2 id="cdFirstTitle"><span data-first-copy="welcomeTitle">${guideText('welcomeTitle')}</span><br><span data-first-copy="welcomeReading">${guideText('welcomeReading')}</span></h2><p id="cdFirstDescription"><span data-first-copy="welcomeBody">${guideText('welcomeBody')}</span><br><span data-first-copy="welcomeLater">${guideText('welcomeLater')}</span></p><button class="cd-first__primary" type="button" data-first-start data-first-copy="start">${guideText('start')}</button><button type="button" data-first-close data-first-copy="later">${guideText('later')}</button>`;
  document.body.append(dialog);
  dialog.querySelector('img').outerHTML=art();
  const progress = root.querySelector('[data-first-progress]');
  const formHint = document.createElement('p');
  formHint.className = 'cd-first__form-hint';formHint.dataset.firstCopy='formHint';formHint.hidden = true;
  formHint.textContent = guideText('formHint');
  document.getElementById('destinyCardForm')?.prepend(formHint);
  function profileReady(){
    const p = window.__cdCurrentDestinyProfile;
    return Boolean(profileScope === scope && p && p.birth && p.syncStatus !== 'pending');
  }
  function close(){dialog.close();opener?.focus({preventScroll:true});}
  function dismiss(){writeFirstVisit(service,'dismissed',0,scope);firstVisitEvent(service,'skip');close();sync();}
  function show(){
    if(dialog.open || !supported())return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : root.querySelector('button');
    writeFirstVisit(service,'offered',0,scope);dialog.showModal();firstVisitEvent(service,'view');
  }
  function begin(){
    close();writeFirstVisit(service,'active',profileReady()?2:1,scope);firstVisitEvent(service,'start',1);sync();
    if(typeof window.cdOneStepFreeSajuEntry === 'function')window.cdOneStepFreeSajuEntry();
    else {progress.focus();progress.scrollIntoView({block:'center'});}
  }
  root.querySelector('[data-first-replay]').addEventListener('click',show);
  root.querySelector('[data-first-skip]').addEventListener('click',dismiss);
  root.querySelector('[data-first-continue]').addEventListener('click',begin);
  dialog.querySelector('[data-first-start]').addEventListener('click',begin);
  dialog.querySelectorAll('[data-first-close]').forEach(button=>button.addEventListener('click',dismiss));
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  function sync(){
    if(resultReady && supported())installResultHelp();
    refreshGuideCopy();showScene(sceneIndex);
    const nextScope = firstVisitScope();
    if(nextScope!==scope){scope=nextScope;profileScope='';resultReady=false;dialog.close();}
    resumeFirstVisitLogin(service);
    const state = readFirstVisit(service,scope);
    if(state.status==='active'&&state.step!==lastProgressStep){lastProgressStep=state.step;showScene(Math.min(2,Math.max(0,state.step-1)));}
    root.hidden = !supported();
    const blockInstall = supported() && (previewing || ['new','offered','active'].includes(state.status));
    if(root.hasAttribute('data-pwa-block')!==blockInstall){
      root.toggleAttribute('data-pwa-block',blockInstall);
      window.dispatchEvent(new Event('cd:critical-operation-state'));
    }
    document.querySelectorAll('#cdFirstResultHelp,.cd-first__offers').forEach(el=>{el.hidden=!supported();});
    if(!supported()){dialog.close();formHint.hidden=true;return;}
    progress.hidden = state.status !== 'active';
    formHint.hidden = state.status !== 'active';
    const ready = profileReady();
    if(state.status==='active'&&ready&&state.step===1){
      writeFirstVisit(service,'active',2,scope);firstVisitEvent(service,'step',2);
    }
    root.querySelector('[data-first-title]').textContent = ready?guideText('readyTitle'):guideText('prepareTitle');
    root.querySelector('[data-first-description]').textContent = ready?guideText('readyBody'):guideText('prepareBody');
    root.querySelector('[data-first-continue]').textContent = ready?guideText('openWithProfile'):guideText('prepareAction');
    root.querySelectorAll('[data-first-step]').forEach(el=>{if(Number(el.dataset.firstStep)===(ready?2:1))el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    if(resultReady && state.status==='active' && document.getElementById('resultPage')?.getClientRects().length){
      writeFirstVisit(service,'complete',3,scope);firstVisitEvent(service,'complete',3);
      progress.hidden=true;formHint.hidden=true;
    }
  }
  document.addEventListener('cd:profile-card-published',()=>{sync();profileScope=scope;sync();});
  window.addEventListener('cd:destiny-profile-server-ready',sync);
  window.addEventListener('cd:auth-changed',sync);
  window.addEventListener('storage',sync);
  window.addEventListener('languagechange',sync);
  window.addEventListener('cd:locale-ready',sync);
  window.addEventListener('cd:first-visit-change',sync);
  // Remember only the explicit guest login intent, never a profile payload.
  document.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('a[href*="/login"],[data-cd-account-open]'))firstVisitLogin(service);});
  window.addEventListener('cd:saju-summary-ready',()=>{
    resultReady=true;installResultHelp();requestAnimationFrame(sync);
  });
  const observer = new MutationObserver(()=>{
    sync();
    if(firstVisitHome(location,service)&&readFirstVisit(service,scope).status==='new'&&!firstVisitOverlayBusy(document)&&home.getClientRects().length)show();
  });
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  // Consent and existing dialogs take priority. Recheck when they close, not on a polling timer.
  setTimeout(()=>{
    sync();
    if(firstVisitHome(location,service)&&readFirstVisit(service,scope).status==='new'&&!firstVisitOverlayBusy(document)&&home.getClientRects().length)show();
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    observer.observe(home,{attributes:true,attributeFilter:['hidden','style']});
    document.querySelectorAll('dialog,#cdCookieConsent,#resultPage').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['open','class','hidden','style','aria-hidden']}));
  },1500);
  sync();
}
function installResultHelp(){
  if(!supported() || document.getElementById('cdFirstResultHelp'))return;
  const result = document.getElementById('resultPage'), intro = result?.querySelector('.saju-result-guide');
  if(!result||!intro)return;
  const help=document.createElement('aside');help.id='cdFirstResultHelp';help.className='cd-first cd-first__reading';
  help.innerHTML=`<h3 data-first-copy="resultTitle">${guideText('resultTitle')}</h3><p data-first-copy="resultBody">${guideText('resultBody')}</p><a href="#sajuCard" data-first-copy="readChart">${guideText('readChart')}</a>`;
  intro.after(help);
  const offers=document.createElement('aside');offers.className='cd-first cd-first__offers';offers.dataset.firstAria='offersLabel';offers.setAttribute('aria-label',guideText('offersLabel'));
  offers.innerHTML=`<h3 data-first-copy="offersTitle">${guideText('offersTitle')}</h3><p data-first-copy="offersBody">${guideText('offersBody')}</p><ul></ul><a class="cd-first__records" href="/records/" data-first-copy="records">${guideText('records')}</a><p data-first-copy="recordsNote">${guideText('recordsNote')}</p>`;
  [
    {key:'fortune-tea-house-saju-consultation',title:guideText('offerTitle'),description:guideText('offerBody'),href:'/fortune-tea-house/'}
  ].forEach(offer=>{
    const item=document.createElement('li'),heading=document.createElement('h4'),description=document.createElement('p'),price=document.createElement('span'),link=document.createElement('a');
    heading.dataset.firstCopy='offerTitle';description.dataset.firstCopy='offerBody';price.dataset.firstCopy='priceHint';heading.textContent=offer.title;description.textContent=offer.description;price.textContent=guideText('priceHint');link.href=offer.href;link.textContent=guideText('offerAction');
    item.append(heading,description,price,link);offers.querySelector('ul').append(item);
    const updateAccess=()=>{
      const owned=window.CodeDestinyAccessStore?.isUnlocked(offer.key);
      link.dataset.firstCopy=owned?'ownedAction':'offerAction';
      link.textContent=owned?guideText('ownedAction'):guideText('offerAction');
      link.href=owned?'/records/':offer.href;
      price.hidden=Boolean(owned);
    };
    updateAccess();
    const unsubscribe=window.CodeDestinyAccessStore?.subscribe(updateAccess);
    if(unsubscribe)window.addEventListener('pagehide',unsubscribe,{once:true});
    window.CodeDestinyFeaturePricingStore?.getOrLoad(offer.key).then(value=>{if(value?.amountKRW>0){delete price.dataset.firstCopy;price.textContent=value.displayPrice;}}).catch(()=>{});
  });
  result.append(offers);
}

