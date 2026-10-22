/* Shared by the static shell and Next routes. No private payloads are persisted. */
(function () {
  'use strict';
  if (window.__cdPwaLifecycle) return;
  var policy = { delay: 8000, closeDays: 14, declineDays: 30, checkGap: 300000 };
  var promptEvent = null, registration = null, interacted = false, dirty = false;
  var started = Date.now(), checked = 0, checking = false, baseline = 'moon-library-1', pending = null;
  var banner = null, dialog = null, applying = false, reloadDone = false, lockUntil = 0;
  var installed = false, safetyProvider = null, lastFocus = null;
  var versionRequest = 0;
  function read(store, key) { try { return store.getItem(key) || ''; } catch (_) { return ''; } }
  function write(store, key, value) { try { store.setItem(key, String(value)); } catch (_) {} }
  function track(name) { if (typeof window.gtag === 'function') window.gtag('event', name, { event_category: 'pwa' }); }
  function native() {
    return !!(window.__cdAppContext && window.__cdAppContext.isApp())
      || window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app'
      || document.documentElement.dataset.runtimeTarget === 'mobile-app'
      || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
      || !!(window.__cdAppPaymentGuard && window.__cdAppPaymentGuard.installed);
  }
  function standalone() { return installed || navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }
  function safe() {
    if (native() || dirty || navigator.onLine === false) return false;
    if (window.__CD_PAYMENT_PROCESSING__ || window.__CD_VERSION_GUARD_BLOCK__ || document.body?.dataset.cdVersionGuardBusy === '1') return false;
    if (/checkout|payment|callback|auth|login|records|library|result|consult|fortune-chat/.test(location.pathname)) return false;
    if (/[?&](paymentId|orderId|code|state|imp_uid|merchant_uid)=/i.test(location.search)) return false;
    if (safetyProvider) { try { if (!safetyProvider()) return false; } catch (_) { return false; } }
    // Only public reading surfaces can approve automatic UI or worker activation.
    // Older/unknown clients do not answer the worker handshake, so activation fails closed.
    if (!/^\/(?:insights(?:\/|$)|ggulggul\/?$|$)/.test(location.pathname)) return false;
    if (location.pathname.indexOf('/insights') !== 0 && typeof window.isCriticalOperationInProgress !== 'function') return false;
    if (typeof window.isCriticalOperationInProgress === 'function' && window.isCriticalOperationInProgress()) return false;
    return !Array.from(document.querySelectorAll('[aria-modal="true"],dialog[open],[data-pwa-block]')).some(function (el) { return el !== dialog && el.getClientRects().length; });
  }
  function hideBanner() { if (banner) banner.remove(); banner = null; }
  function deferInstall(days) { write(localStorage,'cd.pwa.snooze',Date.now()+days*86400000); hideBanner(); }
  function button(text, action) { var b=document.createElement('button'); b.type='button'; b.textContent=text; b.onclick=action; return b; }
  function closeDialog() { if (!dialog) return; dialog.close(); dialog.remove(); dialog=null; if(lastFocus && lastFocus.isConnected) lastFocus.focus(); }
  function openDialog(title) {
    if (dialog) return null;
    hideBanner(); lastFocus=document.activeElement;
    dialog=document.createElement('dialog'); dialog.className='cd-moon-letter'; dialog.setAttribute('aria-labelledby','cdMoonTitle');
    var art=document.createElement('div'); art.className='cd-moon-letter__art';
    var img=document.createElement('img'); img.src='/icons/moonlight-garden-v1-192.png'; img.width=192; img.height=192; img.alt=''; art.appendChild(img);
    var label=document.createElement('p'); label.textContent='꿀꿀운세의 편지'; art.appendChild(label); dialog.appendChild(art);
    var h=document.createElement('h2'); h.id='cdMoonTitle'; h.textContent=title; dialog.appendChild(h);
    dialog.addEventListener('cancel',function(e){e.preventDefault(); if(pending) deferUpdate(); else closeDialog();});
    document.body.appendChild(dialog); dialog.showModal(); return dialog;
  }
  function guidance() {
    var d=openDialog('꿀꿀운세를 홈 화면에'); if(!d)return;
    var p=document.createElement('p');
    var inApp=/KAKAOTALK|Instagram|FBAN|FBAV/i.test(navigator.userAgent);
    p.textContent=inApp ? '현재 앱의 메뉴에서 외부 브라우저로 열어 주세요. 공유 메뉴에 ‘홈 화면에 추가’가 있다면 그 메뉴를 사용할 수 있어요.' : '브라우저의 공유 또는 메뉴에서 ‘홈 화면에 추가’나 ‘앱 설치’를 찾아 주세요. 메뉴가 없다면 이 기능을 지원하는 브라우저에서 열어 주세요.';
    d.appendChild(p);
    var feedback=document.createElement('p'); feedback.setAttribute('role','status');d.appendChild(feedback);
    d.appendChild(button('주소 복사',function(){ navigator.clipboard?.writeText(location.origin+location.pathname).then(function(){feedback.textContent='주소를 복사했어요.';}).catch(function(){feedback.textContent=location.origin+location.pathname;}); }));
    d.appendChild(button('이미 추가했어요',function(){deferInstall(policy.declineDays);closeDialog();}));
    d.appendChild(button('나중에',function(){deferInstall(policy.closeDays);closeDialog();}));
  }
  function install() {
    track('pwa_install_click');
    if (!promptEvent) { guidance(); return; }
    var event=promptEvent; promptEvent=null; hideBanner();
    // prompt must run synchronously in this user gesture, and an event is consumed once.
    try {
      var outcome=event.prompt();
      Promise.resolve(outcome).then(function(){return event.userChoice;}).then(function(choice){
        if(choice?.outcome==='dismissed'){deferInstall(policy.declineDays);track('pwa_install_declined');}
        else track('pwa_install_accepted');
      }).catch(function(){track('pwa_install_failed');guidance();});
    } catch (_) { track('pwa_install_failed');guidance(); }
  }
  function maybeInstall() {
    if (banner || dialog || pending || !interacted || Date.now()-started<policy.delay || native() || standalone() || !safe()) return;
    if (read(sessionStorage,'cd.pwa.shown') || Number(read(localStorage,'cd.pwa.snooze'))>Date.now()) return;
    if (!promptEvent && !/iPhone|iPad|iPod|KAKAOTALK|Instagram|FBAN|FBAV/i.test(navigator.userAgent)) return;
    banner=document.createElement('aside'); banner.className='cd-moon-install';banner.setAttribute('aria-label','앱 설치 안내');
    var img=document.createElement('img');img.src='/icons/moonlight-garden-v1-192.png';img.width=48;img.height=48;img.alt='';banner.appendChild(img);
    var text=document.createElement('div');var title=document.createElement('strong');title.textContent='꿀꿀운세를 홈 화면에';text.appendChild(title);var desc=document.createElement('p');desc.textContent='아이콘을 눌러 바로 운세를 볼 수 있어요';text.appendChild(desc);banner.appendChild(text);
    banner.appendChild(button(promptEvent?'설치':'추가 방법',install));var close=button('닫기',function(){deferInstall(policy.closeDays);});close.setAttribute('aria-label','설치 안내 닫기');banner.appendChild(close);
    document.body.appendChild(banner);write(sessionStorage,'cd.pwa.shown','1');track('pwa_install_impression');
  }
  function deferUpdate() { if(pending)write(sessionStorage,'cd.pwa.deferred',pending.version);track('pwa_update_deferred');closeDialog(); }
  function presentUpdate() {
    if (!pending || dialog || !interacted || !safe() || read(sessionStorage,'cd.pwa.deferred')===pending.version) return;
    var d=openDialog('새로운 이야기가 도착했어요');if(!d)return;
    var list=document.createElement('ul');pending.notes.slice(0,3).forEach(function(note){var li=document.createElement('li');li.textContent=note;list.appendChild(li);});d.appendChild(list);
    var status=document.createElement('p');status.setAttribute('role','status');d.appendChild(status);
    d.appendChild(button('새 버전으로 만나기',function(){apply(status);}));d.appendChild(button('지금은 계속 볼게요',deferUpdate));
    var detail=document.createElement('details');var summary=document.createElement('summary');summary.textContent='버전 정보';detail.appendChild(summary);detail.appendChild(document.createTextNode(pending.version));d.appendChild(detail);track('pwa_update_ready');
  }
  async function apply(status) {
    if(applying)return;
    if(!safe()){status.textContent='진행 중인 입력이나 작업을 마친 뒤 다시 시도해 주세요.';return;}
    applying=true;
    try {
      // Validate a real HTML document before navigating; offline/error preserves the current screen.
      var probe=await fetch(location.pathname,{cache:'no-store',credentials:'same-origin'});
      if(!probe.ok || !String(probe.headers.get('content-type')).includes('text/html') || !safe())throw new Error('unsafe');
      if(registration?.waiting){
        var previousController=navigator.serviceWorker.controller;
        var transitionResolve, transitionReject;
        var transition=new Promise(function(resolve,reject){transitionResolve=resolve;transitionReject=reject;});
        transition.catch(function(){});
        function changed(){if(navigator.serviceWorker.controller!==previousController){navigator.serviceWorker.removeEventListener('controllerchange',changed);transitionResolve();}}
        navigator.serviceWorker.addEventListener('controllerchange',changed);
        var transitionTimer=setTimeout(function(){navigator.serviceWorker.removeEventListener('controllerchange',changed);transitionReject(new Error('transition'));},7000);
        var channel=new MessageChannel();
        await new Promise(function(resolve,reject){var timer=setTimeout(function(){reject(new Error('timeout'));},6000);channel.port1.onmessage=function(e){clearTimeout(timer);channel.port1.close();if(e.data?.safe)resolve();else reject(new Error('busy-tab'));};registration.waiting.postMessage({type:'CD_ACTIVATE_SAFE'},[channel.port2]);});
        await transition;clearTimeout(transitionTimer);
      }
      if(!safe() || reloadDone)throw new Error('unsafe');
      reloadDone=true;write(sessionStorage,'cd.pwa.reading',JSON.stringify({path:location.pathname,y:scrollY}));track('pwa_update_applied');location.reload();
    } catch (_) { applying=false;status.textContent='다른 탭의 작업 또는 연결 상태를 확인해 주세요. 화면을 유지했어요. 다시 시도할 수 있어요.';track('pwa_update_failed'); }
  }
  async function check() {
    if(checking || Date.now()-checked<policy.checkGap || !safe())return;
    checked=Date.now();checking=true;
    try {
      var r=await fetch('/version.json',{cache:'no-store'});
      if(!r.ok || !String(r.headers.get('content-type')).includes('json'))return;
      var v=await r.json();if(!/^[a-f0-9]{40}$/i.test(v.commit || ''))return;
      // Explicit release id separates app updates from routine editorial deployments.
      if(!baseline){baseline=v.appRelease?.id || v.commit;return;}
      if(v.appRelease?.id && v.appRelease.id!==baseline && Array.isArray(v.appRelease.notes)){
        pending={version:v.appRelease.id,notes:v.appRelease.notes.filter(function(x){return typeof x==='string';})};presentUpdate();
      }
      if(registration)await registration.update();
    } catch (_) { /* Failed version reads never become update signals. */ }
    finally {checking=false;}
  }
  window.__cdPwaLifecycle={install:install,check:check,isSafe:safe,setSafetyProvider:function(fn){safetyProvider=fn;},policy:policy};
  window.dispatchEvent(new Event('cd:pwa-ready'));
  ['click','submit','pointerdown','keydown'].forEach(function(type){document.addEventListener(type,function(e){if(Date.now()<lockUntil && !e.target.closest('.cd-moon-letter')){e.preventDefault();e.stopImmediatePropagation();}},true);});
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();if(native()||standalone())return;promptEvent=e;maybeInstall();});
  window.addEventListener('appinstalled',function(){installed=true;promptEvent=null;hideBanner();track('pwa_install_completed');});
  document.addEventListener('input',function(e){if(e.target.closest('[data-archive-search], [data-famous-saju-list], .moon-library, .ins-wrap'))return;dirty=true;hideBanner();},true);
  document.addEventListener('pointerdown',function(e){if(Date.now()<lockUntil && !e.target.closest('.cd-moon-letter')){e.preventDefault();return;}interacted=true;presentUpdate();setTimeout(maybeInstall,Math.max(0,policy.delay-(Date.now()-started)));},true);
  document.addEventListener('keydown',function(e){if(Date.now()<lockUntil && !e.target.closest('.cd-moon-letter'))e.preventDefault();interacted=true;setTimeout(maybeInstall,Math.max(0,policy.delay-(Date.now()-started)));},true);
  document.addEventListener('click',function(e){if(e.target.closest('[data-cd-app-install],[data-pwa-install]')){e.preventDefault();install();}});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){check();presentUpdate();maybeInstall();}});
  window.addEventListener('cd:critical-operation-state',function(){if(!safe()){hideBanner();closeDialog();}else {presentUpdate();maybeInstall();}});
  // 모바일은 share.js 가 기능 탭·45초 뒤에야 실린다. 실린 순간 다시 판단해야 다음 탭까지 안내가 밀리지 않는다.
  window.addEventListener('cd:share-ready',function(){presentUpdate();maybeInstall();});
  if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',function(e){
    if(e.data?.type!=='CD_CHECK_SAFE' || !e.ports[0])return;
    var ready=safe();if(ready)lockUntil=Date.now()+7000;e.ports[0].postMessage({safe:ready});
  });
  function boot(){
    if(native() || standalone()){document.querySelectorAll('[data-pwa-install]').forEach(function(el){el.hidden=true;});if(native())return;}
    var link=document.createElement('link');link.rel='stylesheet';link.href='/styles/pwa-lifecycle.css?v=moon-library-1';document.head.appendChild(link);
    var manual=document.getElementById('cdAppInstall');if(manual && !standalone())manual.hidden=false;
    check();
    if('serviceWorker' in navigator && window.isSecureContext){navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'}).then(function(reg){registration=reg;function waiting(){if(reg.waiting && navigator.serviceWorker.controller){var request=++versionRequest, channel=new MessageChannel();channel.port1.onmessage=function(e){channel.port1.close();if(request!==versionRequest || !reg.waiting || typeof e.data?.version!=='string')return;if(!pending || pending.version!==e.data.version)pending={version:e.data.version,notes:['새 웹앱 파일을 사용할 준비가 되었어요.']};presentUpdate();};reg.waiting.postMessage({type:'CD_VERSION'},[channel.port2]);}}waiting();reg.addEventListener('updatefound',function(){reg.installing?.addEventListener('statechange',waiting);});}).catch(function(){});}
    try{var saved=JSON.parse(read(sessionStorage,'cd.pwa.reading') || 'null');if(saved?.path===location.pathname){requestAnimationFrame(function(){scrollTo(0,saved.y);});sessionStorage.removeItem('cd.pwa.reading');}}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
