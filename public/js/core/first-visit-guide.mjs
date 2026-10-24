import {firstVisitScope,readFirstVisit,writeFirstVisit,firstVisitEvent,firstVisitHome,firstVisitOverlayBusy,firstVisitLogin,resumeFirstVisitLogin} from '../first-visit-state.mjs';

const service = 'ggulggul';
const home = document.getElementById('cdHomeFunnel');
const korean = () => !document.documentElement.lang || document.documentElement.lang.toLowerCase().startsWith('ko');
if (home && korean()) installGuide();
function installGuide() {
  let scope = firstVisitScope(), profileScope = scope, resultReady = false, opener = null, previewing = false;
  const root = document.createElement('section');
  root.className = 'cd-first'; root.setAttribute('aria-label','처음 이용 안내');
  root.innerHTML = '<div class="cd-first__bar"><span>연이와 처음 보는 나의 사주</span><button type="button" data-first-replay>이용 방법 다시 보기</button></div><div data-first-progress hidden tabindex="-1"><ol aria-label="첫 운세 순서"><li data-first-step="1">1. 프로필</li><li data-first-step="2">2. 무료 사주</li><li data-first-step="3">3. 더 깊게 보기</li></ol><h2 data-first-title></h2><p data-first-description></p><button class="cd-first__primary" type="button" data-first-continue>무료 사주 시작하기</button><button type="button" data-first-skip>안내 그만 보기</button></div>';
  const scenes=[
    {label:'프로필',title:'당신의 이야기를 들려주세요.',speech:'반가워요, 연이예요. 생년월일과 양력·음력부터 차근차근 확인해요. 이미 만든 프로필이 있다면 골라주세요. 태어난 시간을 몰라도 화면의 안내에 따라 시작할 수 있어요.'},
    {label:'무료 사주',title:'나의 사주를 함께 펼쳐봐요.',speech:'먼저 일주에서 나의 기질을 읽고, 오행과 십성으로 천천히 넘어가 보세요. 어려운 말을 모두 외울 필요는 없어요. 나와 닮은 모습 하나부터 찾아볼까요?'},
    {label:'더 깊게',title:'궁금한 마음이 남으면 그때 골라요.',speech:'무료 사주를 읽은 뒤, 지금의 고민을 더 자세히 살펴보고 싶을 때 상담을 골라주세요. 구성과 가격을 먼저 확인할 수 있어요. 이미 받은 결과는 보관함에서 다시 펼쳐보세요.'}
  ];
  const art=(step=0)=>'<span class="cd-first__art" aria-hidden="true"><img src="/images/first-visit/yeoni-tutorial-v2.webp" width="1440" height="480" alt="" style="left:-'+step*100+'%"></span>';
  const story=document.createElement('div');story.className='cd-first__story';
  story.innerHTML='<nav class="cd-first__scene-nav" aria-label="그림으로 보는 이용 순서">'+scenes.map((scene,index)=>'<button type="button" data-first-scene="'+index+'"><span>'+(index+1)+'</span>'+scene.label+'</button>').join('')+'</nav><div class="cd-first__scene">'+art()+'<div class="cd-first__speech" aria-live="polite"><span class="cd-first__speaker">연이가 안내해 드릴게요</span><h2></h2><p></p><button type="button" data-first-next></button></div></div>';
  root.querySelector('[data-first-progress]').before(story);
  let sceneIndex=0,lastProgressStep=0;
  function showScene(index){
    sceneIndex=index;
    story.querySelector('img').style.left='-'+index*100+'%';
    story.querySelector('h2').textContent=scenes[index].title;
    story.querySelector('p').textContent=scenes[index].speech;
    story.querySelector('[data-first-next]').textContent=index===2?'처음부터 살펴보기 →':'다음 이야기 →';
    story.querySelectorAll('[data-first-scene]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.firstScene)===index)));
  }
  story.querySelectorAll('[data-first-scene]').forEach(button=>button.addEventListener('click',()=>{previewing=true;showScene(Number(button.dataset.firstScene));sync();}));
  story.querySelector('[data-first-next]').addEventListener('click',()=>{previewing=true;showScene((sceneIndex+1)%scenes.length);sync();});
  showScene(0);
  const howTo=document.createElement('details');howTo.className='cd-first__howto';
  howTo.innerHTML='<summary>처음이라면, 연이와 이렇게 시작해 보세요</summary><div><h3>먼저, 나를 위한 프로필을 준비해요.</h3><p>안녕하세요, 연이예요. 사주는 태어난 때를 바탕으로 나의 기질과 흐름을 살펴보는 이야기예요. 이름과 생년월일, 양력·음력을 차근차근 확인해 주세요. 태어난 시간을 모르면 억지로 맞추지 말고 출생 시간 아래의 모름 안내를 이용해도 괜찮아요.</p><p>이미 만든 프로필이 있다면 다시 입력하지 않고 골라서 사용할 수 있어요. 프로필 작성과 관리는 무료예요. 비회원으로 입력한 정보와 계정에 저장한 정보는 보관 방식이 다르니, 저장할 때 화면의 안내도 함께 살펴주세요.</p><h3>무료 사주에서 나의 결을 먼저 읽어보세요.</h3><p>명식은 태어난 때를 여덟 글자로 펼친 지도이고, 일주는 그중 나의 기질을 살펴보는 중심이에요. 먼저 명식과 일주를 읽은 뒤 오행과 십성으로 천천히 넘어가 보세요. 오행은 힘의 균형을, 십성은 행동과 관계의 경향을 이해하는 단서가 돼요.</p><p>낯선 말이 많아도 모두 외울 필요는 없어요. ‘이런 모습은 나와 닮았네’ 싶은 대목 하나와, 힘을 조금 덜 줘도 될 대목 하나만 찾아보세요.</p><h3>조금 더 궁금한 마음이 생기면 그때 골라요.</h3><p>무료 결과를 읽다가 현재의 고민이나 앞으로의 흐름을 더 자세히 살펴보고 싶다면, 아래의 심층 상담 구성을 확인해 보세요. 무엇을 받는지와 가격을 먼저 읽고 필요한 상담만 선택하시면 돼요. 무료 사주를 읽는 것만으로 결제되지는 않아요.</p><p>이용권·월정석·단건 결제는 선택한 서비스의 기존 조건을 따라요. 이미 받은 결과가 있다면 새로 결제하기 전에 보관함부터 열어보세요.</p><h3>마지막에는 오늘의 작은 실천 하나를 남겨요.</h3><p>운세는 정해진 결말보다 나를 이해하는 실마리로 읽어주세요. 마음에 남은 문장을 떠올리며 ‘오늘은 답하기 전에 한 번 더 듣기’처럼 작은 행동 하나를 골라보세요. 따뜻한 차 한 잔처럼, 내 속도를 돌아보는 시간이 되었으면 해요.</p></div>';
  root.append(howTo);
  const anchor = home.querySelector('.cdh-free');
  if (anchor) anchor.before(root); else home.append(root);
  const dialog = document.createElement('dialog');
  dialog.className = 'cd-first cd-first__welcome';
  dialog.setAttribute('aria-labelledby','cdFirstTitle');dialog.setAttribute('aria-describedby','cdFirstDescription');
  dialog.innerHTML = '<button type="button" class="cd-first__close" aria-label="첫 이용 안내 닫기" data-first-close><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><img src="/images/yeoni/welcome/yeoni-welcome-v1-320.webp" width="144" height="144" alt=""><h2 id="cdFirstTitle">나를 알아가는 첫걸음,<br>무료 사주부터 시작해요.</h2><p id="cdFirstDescription">반가워요, 연이예요. 프로필부터 차근차근 준비하고 나의 사주를 함께 펼쳐봐요.<br>더 깊은 해석은 읽어본 뒤 천천히 고르셔도 괜찮아요.</p><button class="cd-first__primary" type="button" data-first-start>무료 사주 시작하기</button><button type="button" data-first-close>나중에 할게요</button>';
  document.body.append(dialog);
  dialog.querySelector('img').outerHTML=art();
  const progress = root.querySelector('[data-first-progress]');
  const formHint = document.createElement('p');
  formHint.className = 'cd-first__form-hint';formHint.hidden = true;
  formHint.textContent = '연이가 옆에서 안내해 드릴게요. 생년월일과 양력·음력을 먼저 확인해 주세요. 태어난 시간을 모르면 출생 시간 아래의 모름 안내를 이용하면 돼요. 프로필을 준비하면 무료 사주로 이어갈게요.';
  document.getElementById('destinyCardForm')?.prepend(formHint);
  function profileReady(){
    const p = window.__cdCurrentDestinyProfile;
    return Boolean(profileScope === scope && p && p.birth && p.syncStatus !== 'pending');
  }
  function close(){dialog.close();opener?.focus({preventScroll:true});}
  function dismiss(){writeFirstVisit(service,'dismissed',0,scope);firstVisitEvent(service,'skip');close();sync();}
  function show(){
    if(dialog.open || !korean())return;
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
    const nextScope = firstVisitScope();
    if(nextScope!==scope){scope=nextScope;profileScope='';resultReady=false;dialog.close();}
    resumeFirstVisitLogin(service);
    const state = readFirstVisit(service,scope);
    if(state.status==='active'&&state.step!==lastProgressStep){lastProgressStep=state.step;showScene(Math.min(2,Math.max(0,state.step-1)));}
    root.hidden = !korean();
    const blockInstall = korean() && (previewing || ['new','offered','active'].includes(state.status));
    if(root.hasAttribute('data-pwa-block')!==blockInstall){
      root.toggleAttribute('data-pwa-block',blockInstall);
      window.dispatchEvent(new Event('cd:critical-operation-state'));
    }
    document.querySelectorAll('#cdFirstResultHelp,.cd-first__offers').forEach(el=>{el.hidden=!korean();});
    if(!korean()){dialog.close();formHint.hidden=true;return;}
    progress.hidden = state.status !== 'active';
    formHint.hidden = state.status !== 'active';
    const ready = profileReady();
    if(state.status==='active'&&ready&&state.step===1){
      writeFirstVisit(service,'active',2,scope);firstVisitEvent(service,'step',2);
    }
    root.querySelector('[data-first-title]').textContent = ready?'프로필이 준비됐네요. 연이와 사주를 펼쳐볼까요?':'연이와 나의 프로필부터 준비해요';
    root.querySelector('[data-first-description]').textContent = ready?'입력하신 정보로 무료 사주를 살펴볼 수 있어요. 먼저 나의 기질부터 천천히 읽어보세요.':'기존 프로필이 있다면 골라주세요. 처음이라면 출생 정보를 하나씩 적어봐요. 모르는 정보는 화면의 안내에 따라 남겨두셔도 괜찮아요.';
    root.querySelector('[data-first-continue]').textContent = ready?'이 프로필로 무료 사주 보기':'프로필 설정하고 이어가기';
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
  if(!korean() || document.getElementById('cdFirstResultHelp'))return;
  const result = document.getElementById('resultPage'), intro = result?.querySelector('.saju-result-guide');
  if(!result||!intro)return;
  const help=document.createElement('aside');help.id='cdFirstResultHelp';help.className='cd-first cd-first__reading';
  help.innerHTML='<h3>연이와 함께, 나의 사주를 읽어봐요</h3><p>명식은 태어난 때를 펼친 지도예요. 먼저 일주에서 나의 기질을 읽고, 오행의 균형과 십성의 관계로 천천히 넘어가 보세요. 닮은 모습과 다른 모습을 함께 살펴보면 좋아요. 한 가지 특징으로 나를 단정하지 않아도 괜찮아요.</p><a href="#sajuCard">명식부터 읽기</a>';
  intro.after(help);
  const offers=document.createElement('aside');offers.className='cd-first cd-first__offers';offers.setAttribute('aria-label','무료 사주 다음 읽을거리');
  offers.innerHTML='<h3>조금 더 깊게 알아보고 싶다면</h3><p>여기까지 읽고 마음에 남은 질문이 있으신가요? 무료 사주는 그대로 두고, 지금 필요한 이야기만 조금 더 깊게 살펴보셔도 좋아요.</p><ul></ul><a class="cd-first__records" href="/records/">이미 받은 결과 다시 보기</a><p>기존 결과는 보관함에서 확인해 주세요. 새 상담은 구성과 결제 조건을 확인한 뒤 선택할 수 있어요.</p>';
  [
    {key:'fortune-tea-house-saju-consultation',title:'마음에 남은 고민 하나, 연이와 이야기해요',description:'무료 사주를 읽은 뒤 궁금한 점부터 시작해 보세요. 현재의 고민을 사주와 함께 살펴보고, 실천할 방향을 정리해요.',href:'/fortune-tea-house/'}
  ].forEach(offer=>{
    const item=document.createElement('li'),heading=document.createElement('h4'),description=document.createElement('p'),price=document.createElement('span'),link=document.createElement('a');
    heading.textContent=offer.title;description.textContent=offer.description;price.textContent='상세에서 가격 확인';link.href=offer.href;link.textContent='상담 구성 알아보기';
    item.append(heading,description,price,link);offers.querySelector('ul').append(item);
    const updateAccess=()=>{
      const owned=window.CodeDestinyAccessStore?.isUnlocked(offer.key);
      link.textContent=owned?'받은 결과 다시 보기':'상담 구성 알아보기';
      link.href=owned?'/records/':offer.href;
      price.hidden=Boolean(owned);
    };
    updateAccess();
    const unsubscribe=window.CodeDestinyAccessStore?.subscribe(updateAccess);
    if(unsubscribe)window.addEventListener('pagehide',unsubscribe,{once:true});
    window.CodeDestinyFeaturePricingStore?.getOrLoad(offer.key).then(value=>{if(value?.amountKRW>0)price.textContent=value.displayPrice;}).catch(()=>{});
  });
  result.append(offers);
}

