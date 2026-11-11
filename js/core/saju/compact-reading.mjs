// Presentation only: retain the original reading order and the open natal chart.
// Legacy compact-reader fragments still lead to the original content.
export function mountCompactReading(document) {
  const win=document.defaultView, result=document.getElementById('resultPage');
  if(!result || result.dataset.classicReading) return;
  result.dataset.classicReading='true';
  const natal=document.getElementById('sajuCard'), profile=result.querySelector(':scope > .top-hero');
  if(natal&&profile)natal.insertAdjacentElement('afterend',profile);
  const aliases={sajuCompactOverview:'sajuCard','sajuCompact-nature':'sajuCard','sajuCompact-flow':'daewunCard','sajuCompact-more':'reportDashboardCard'};
  const profileLabels={ko:'프로필 변경',en:'Change profile',ja:'プロフィール変更','zh-cn':'更换档案','zh-tw':'切換檔案',vi:'Đổi hồ sơ',hi:'प्रोफ़ाइल बदलें',es:'Cambiar perfil',fr:'Changer de profil',de:'Profil wechseln',nl:'Profiel wijzigen',ms:'Tukar profil'};
  const profileLabel=()=>{const lang=document.documentElement.lang.toLowerCase();return profileLabels[lang==='zh'?'zh-cn':lang]||profileLabels.en;};
  const change=document.createElement('button');
  change.type='button';change.className='saju-reading-profile-change';change.textContent=profileLabel();
  change.addEventListener('click',()=>win.dpOpenList?.());
  function attachProfileControl(){
    const header=document.getElementById('sajuReadingHeader');
    if(header&&!header.contains(change))header.append(change);
  }
  function targetFor(hash){let id;try{id=decodeURIComponent(hash.slice(1));}catch{return null;}return document.getElementById(aliases[id]||id);}
  function reveal(target){if(target?.tagName==='DETAILS')target.open=true;for(let n=target?.parentElement;n&&n!==result;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;}
  function fragment(){const target=targetFor(win.location.hash);if(target&&result.contains(target)){reveal(target);if(Object.hasOwn(aliases,win.location.hash.slice(1)))target.scrollIntoView?.({block:'start',behavior:'instant'});}}
  function click(event){
    const a=event.target.closest('a[href^="#"]');
    const target=a&&targetFor(a.hash);
    if(!target||!result.contains(target)||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button)return;
    event.preventDefault();event.stopPropagation();reveal(target);
    win.history.replaceState(null,'',a.hash);target.scrollIntoView?.({block:'start',behavior:'instant'});
  }
  function localeReady(){change.textContent=profileLabel();}
  const observer=new win.MutationObserver(attachProfileControl);
  observer.observe(result,{childList:true,subtree:true});
  result.addEventListener('click',click,true);
  win.addEventListener('hashchange',fragment);win.addEventListener('cd:locale-ready',localeReady);
  attachProfileControl();fragment();
  return ()=>{observer.disconnect();result.removeEventListener('click',click,true);win.removeEventListener('hashchange',fragment);win.removeEventListener('cd:locale-ready',localeReady);change.remove();delete result.dataset.classicReading;};
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountCompactReading(document),{once:true});else mountCompactReading(document);}
