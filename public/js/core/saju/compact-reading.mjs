// Presentation only: move existing nodes without cloning paid content or actions.
export function mountCompactReading(document) {
  const win=document.defaultView, result=document.getElementById('resultPage');
  if(!result || result.dataset.compactReading) return;
  result.dataset.compactReading='true';
  let ko=document.documentElement.lang.startsWith('ko');
  const groups=[['nature',ko?'명식·기질':'Chart and character',['sajuCard','destinyAnatomyCard','iljuCard','tenshinCard','johuCard','ukbuCard']],['flow',ko?'운의 흐름':'Current cycles',['dailyFortuneCard','terms24Card','daewunCard','currentSeasonCard','dailyMonthlyCard']],['more',ko?'더 살펴보기':'Explore more',['destinySection','hormone-vibe-section','summaryCard','compatCard','similarCelebCard','sajuFourCutCard','dopamineCard','reportDashboardCard','quantumCard','villainCard','skillTreeCard','energyCoordCard','healthReportCard','lottoCard','egyptCard','tTestCard','letterBox']]];
  const overview=document.createElement('section');overview.id='sajuCompactOverview';overview.className='saju-compact-overview';
  const owner=document.createElement('div'), brief=document.createElement('p'), chart=document.createElement('dl');
  const change=document.createElement('button');change.type='button';change.textContent=ko?'프로필 변경':'Change profile';change.addEventListener('click',()=>win.dpOpenList?.());
  overview.append(owner,change,brief,chart);
  const nav=document.createElement('nav');nav.className='saju-compact-nav';nav.setAttribute('aria-label',ko?'사주 풀이 목차':'Reading contents');
  for(const [id,label] of [['sajuCompactOverview',ko?'개요':'Overview'],...groups.map(([id,label])=>['sajuCompact-'+id,label])]){const a=document.createElement('a');a.href='#'+id;a.textContent=label;nav.append(a);}
  const sections=new Map();
  for(const [id,label] of groups){const section=document.createElement('details');section.dataset.readingGroup='true';section.id='sajuCompact-'+id;section.className='saju-compact-group';const h=document.createElement('summary');h.textContent=label;section.append(h);sections.set(id,section);}
  const fallback={dailyFortuneCard:ko?'오늘의 흐름':'Today',tenshinCard:ko?'십성 풀이':'Ten Gods',johuCard:ko?'계절의 균형':'Seasonal balance',ukbuCard:ko?'강약과 보완':'Support and balance',terms24Card:ko?'절기의 흐름':'Solar terms',iljuCard:ko?'나의 일주':'Day pillar',destinySection:ko?'생활 속 작은 실천':'Daily practice'};
  const title=node=>node.querySelector('h2,h3,.card-title,.sec-title')?.textContent.trim()||fallback[node.id]||(ko?'상세 풀이':'Read more');
  const ui={ko:['개요','명식·기질','운의 흐름','더 살펴보기','프로필 변경','내 프로필','년주','월주','일주','시주','나를 읽는 기준'],en:['Overview','Chart and character','Current cycles','Explore more','Change profile','My profile','Year','Month','Day','Hour','Day pillar'],ja:['概要','命式・気質','運の流れ','もっと見る','プロフィール変更','マイプロフィール','年柱','月柱','日柱','時柱','日柱'], 'zh-cn':['概览','命盘与性格','运势流向','查看更多','更换档案','我的档案','年柱','月柱','日柱','时柱','日柱'],'zh-tw':['概覽','命盤與性格','運勢走向','查看更多','切換檔案','我的檔案','年柱','月柱','日柱','時柱','日柱'],vi:['Tổng quan','Lá số và tính cách','Vận trình','Khám phá thêm','Đổi hồ sơ','Hồ sơ của tôi','Năm','Tháng','Ngày','Giờ','Trụ ngày'],hi:['सारांश','कुंडली और स्वभाव','वर्तमान प्रवाह','और देखें','प्रोफ़ाइल बदलें','मेरी प्रोफ़ाइल','वर्ष','माह','दिन','समय','दिन का स्तंभ'],es:['Resumen','Carta y carácter','Ciclos actuales','Ver más','Cambiar perfil','Mi perfil','Año','Mes','Día','Hora','Pilar del día'],fr:['Aperçu','Thème et caractère','Cycles actuels','En savoir plus','Changer de profil','Mon profil','Année','Mois','Jour','Heure','Pilier du jour'],de:['Überblick','Horoskop und Charakter','Aktuelle Zyklen','Mehr entdecken','Profil wechseln','Mein Profil','Jahr','Monat','Tag','Stunde','Tagessäule'],nl:['Overzicht','Horoscoop en karakter','Huidige cycli','Meer bekijken','Profiel wijzigen','Mijn profiel','Jaar','Maand','Dag','Uur','Dagpijler'],ms:['Ringkasan','Carta dan perwatakan','Aliran semasa','Lihat lagi','Tukar profil','Profil saya','Tahun','Bulan','Hari','Jam','Tiang hari']};
  function labels(){const lang=document.documentElement.lang.toLowerCase();return ui[lang==='zh'?'zh-cn':lang]||ui.en;}
  function localeReady(){ko=document.documentElement.lang.startsWith('ko');const l=labels();change.textContent=l[4];[...nav.children].forEach((n,i)=>{if(n.textContent!==l[i])n.textContent=l[i];});[...sections.values()].forEach((n,i)=>{if(n.firstElementChild.textContent!==l[i+1])n.firstElementChild.textContent=l[i+1];});schedule();}
  let key='',queued=false,processedHash=null;
  function reveal(target){if(target?.tagName==='DETAILS')target.open=true;for(let n=target?.parentElement;n&&n!==result;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;}
  function fragment(){processedHash=win.location.hash;let id;try{id=decodeURIComponent(win.location.hash.slice(1));}catch{return;}const target=document.getElementById(id);if(target&&result.contains(target))reveal(target);}
  function refresh(){
    queued=false;const p=win.G_PILLARS;if(!p)return;
    const header=document.getElementById('sajuReadingHeader');if(!overview.isConnected){(header||result.firstElementChild)?.after(overview);overview.after(nav);for(const section of sections.values())result.append(section);}
    const profile=win.__cdCurrentDestinyProfile||win.__cdActiveBirthProfile||{};
    const next=JSON.stringify([profile.id||profile.profileId,p,win.__cdBirthTimeUnknown===true]);
    if(next!==key){key=next;processedHash=null;result.querySelectorAll('details[data-reading-fold],details[data-reading-group]').forEach(n=>n.open=false);}
    const name=profile.name||labels()[5];if(owner.textContent!==name)owner.textContent=name;
    const text=labels()[10]+' · '+(p.d?.g||'—')+' '+(p.d?.j||'—');if(brief.textContent!==text)brief.textContent=text;
    const signature=JSON.stringify([p,win.__cdBirthTimeUnknown===true,document.documentElement.lang]);if(chart.dataset.chart!==signature){chart.dataset.chart=signature;chart.replaceChildren();for(const [id,label] of [['y',ko?'년주':'Year'],['m',ko?'월주':'Month'],['d',ko?'일주':'Day'],['h',ko?'시주':'Hour']]){const box=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=labels()[6+['y','m','d','h'].indexOf(id)];dd.textContent=id==='h'&&win.__cdBirthTimeUnknown?'—':(p[id]?.g||'—')+' '+(p[id]?.j||'—');box.append(dt,dd);chart.append(box);}}
    for(const [id,,ids] of groups)for(const cardId of ids){const node=document.getElementById(cardId);if(!node||!result.contains(node))continue;let fold=node.parentElement;if(!fold.matches('details[data-reading-fold]')){fold=document.createElement('details');fold.dataset.readingFold=cardId;const summary=document.createElement('summary');summary.textContent=title(node);node.before(fold);fold.append(summary,node);sections.get(id).append(fold);}const hidden=node.hidden||node.style.display==='none';if(fold.hidden!==hidden)fold.hidden=hidden;const label=title(node);if(label&&fold.firstElementChild.textContent!==label)fold.firstElementChild.textContent=label;}
    for(const node of result.querySelectorAll(':scope > .fg-group,:scope > .cd-result-fusion,:scope > #sibylSystemSection,:scope > .career-style-entry,:scope > .pf-showcase,:scope > .mystic-tabs-wrapper,:scope > #cdFirstResultHelp,:scope > .cd-first__offers')){const fold=document.createElement('details');fold.dataset.readingFold='extra';const summary=document.createElement('summary');summary.textContent=node.querySelector('h2,h3')?.textContent.trim()||(ko?'더 깊이 살펴보기':'Explore further');node.before(fold);fold.append(summary,node);sections.get('more').append(fold);}
    if(processedHash!==win.location.hash)fragment();
  }
  function schedule(){if(!queued){queued=true;win.requestAnimationFrame(refresh);}}
  const observer=new win.MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('#sajuCompactOverview')))schedule();});
  observer.observe(result,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden']});
  result.addEventListener('click',event=>{const a=event.target.closest('a[href^="#"]');const target=a&&document.getElementById(a.hash.slice(1));if(!target||!result.contains(target)||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button)return;event.preventDefault();event.stopPropagation();reveal(target);win.history.replaceState(null,'',a.hash);processedHash=a.hash;target.scrollIntoView?.({block:'start',behavior:'instant'});},true);
  result.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS'&&event.target.open)win.dispatchEvent(new win.Event('resize'));},true);
  win.addEventListener('cd:locale-ready',localeReady);localeReady();win.addEventListener('hashchange',fragment);win.addEventListener('cd:saju-summary-ready',schedule);schedule();
  return ()=>{observer.disconnect();win.removeEventListener('cd:locale-ready',localeReady);win.removeEventListener('hashchange',fragment);win.removeEventListener('cd:saju-summary-ready',schedule);};
}

if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountCompactReading(document),{once:true});else mountCompactReading(document);}
