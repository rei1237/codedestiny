import ImagePrompts,{type ImagePrompt} from './SajuImagePrompts';
import {lazy,Suspense,useEffect,useRef,useState,type FormEvent} from 'react';
import {TOSS_PUBLIC_SECTIONS,isTossPublicSection} from '../../../lib/fortune/toss-public-sections.mjs';
import {bindVillainResult} from 'virtual:section-villain-bindings';
import {mountRpgQuest} from './rpg-progress';
import {BirthFields,birthPayload,emptyBirth,type BirthInput} from './BirthFields';
import {renderNatalReport,natalImage,type NatalParts} from './natal-report';
import {Button} from './Button';
import {api} from './platform';
import WebPurchaseHistory from './WebPurchaseHistory';
import TossSessionScope from './TossSessionScope';

import {loadTravelHistory,saveTravelHistory,type TravelHistory} from './travel-history';
const IslandReading=lazy(()=>import('./IslandReading'));
const SecretHouseReading=lazy(()=>import('./SecretHouseReading'));
type SectionKey=keyof typeof TOSS_PUBLIC_SECTIONS;
type Energy={recent?:string[];renderedAt?:string;transform?:string;roulette?:string[]};
type Report={imagePrompts?:ImagePrompt[];rpg?:{stem:string;element:string};ok:boolean;featureKey:string;accessSource:string;html:string;css?:string;parts?:NatalParts;decadeHtml?:string;energy?:Energy};
type RequestBody=ReturnType<typeof sectionInput>;
const cardAreas:Record<string,[string,string]>={
  rpt_quantumCard:['quantumCard','quantumSection'],rpt_energyCoordCard:['energyCoordCard','energyCoordSection'],
  rpt_villainCard:['villainCard','villainResult'],rpt_healthReportCard:['healthReportCard','healthReportSection'],
  rpt_specialCharmCard:['specialCharmCard','specialCharmBody'],rpt_skillTreeCard:['skillTreeCard','skillTreeBody'],
};
const path='/canonical/saju/section';

function sectionInput(featureKey:SectionKey,input:BirthInput,mode:string,recent:string[],name:string){
  const {location:c,date}=birthPayload(input);
  return {featureKey,gender:input.gender,mode,...(['saju_natal_reading','rpt_skillTreeCard'].includes(featureKey)?{name}:{}),...(featureKey==='rpt_energyCoordCard'?{energy:{recent}}:{}),birth:{date:input.date,calType:date.calType,timeKnown:!input.unknown,hour:date.hour,minute:date.minute},
    place:{name:c.label,longitude:c.lng,latitude:c.lat,timezone:c.tz,baseTzOffset:9}};
}


function checked(response:Report,key:string){
  const hasContent=key==='saju_natal_reading'?Object.values(response.parts||{}).some(Boolean):!!response.html?.trim();
  if(!response.ok||response.featureKey!==key||response.accessSource!=='public'||!hasContent)throw Error('Section unavailable');
  return response;
}
function safeFragment(doc:Document,html:string){
  const template=doc.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('script,iframe,frame,object,embed,meta,base,link,form').forEach(el=>el.remove());
  for(const img of template.content.querySelectorAll('img')){
    const local=natalImage(img.getAttribute('src')||'');if(local)img.dataset.localImage=local;else img.remove();
  }
  for(const el of template.content.querySelectorAll('*'))for(const attr of Array.from(el.attributes)){
    if(/^on/i.test(attr.name)||['href','xlink:href','src','srcset','action','formaction','target','srcdoc'].includes(attr.name))el.removeAttribute(attr.name);
  }
  for(const img of template.content.querySelectorAll('img')){
    img.src=img.dataset.localImage!;img.removeAttribute('data-local-image');
  }
  return template.content;
}
const frameDocument='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';style-src \'unsafe-inline\';img-src \'self\';form-action \'none\';base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#161827;color:#f6f2ef;font:15px/1.65 system-ui,sans-serif;overflow-wrap:anywhere}main{padding:12px;width:100%;overflow-x:auto}summary,button,input{cursor:pointer}details{margin-block:8px}svg{max-width:100%}h2,h3{line-height:1.4}button{max-width:100%}img{max-width:100%;height:auto}.natal-chapter{border-top:1px solid #635772;padding:10px 0}.natal-chapter>summary{font-weight:700;color:#f5deba}.natal-chapter section{margin-block:12px}.saju-ten-button{display:grid;gap:6px;width:100%;text-align:left;padding:12px;margin:8px 0;border-radius:10px;border:1px solid #595067;background:#27263a;color:#f6f2ef}dialog{max-width:92%;max-height:80%;overflow:auto;border:1px solid #635772;border-radius:14px;background:#262437;color:#faf5ef}dialog::backdrop{background:#12111acc}</style></head><body><main></main></body></html>';

function SectionBody({report,input,travel,onLogin}:{report:Report;input:RequestBody;travel:TravelHistory;onLogin:()=>void}){
  const frame=useRef<HTMLIFrameElement>(null),[ready,setReady]=useState(false),[issue,setIssue]=useState('');
  useEffect(()=>{
    const doc=frame.current?.contentDocument,host=doc?.querySelector('main');
    if(!ready||!doc||!host)return;
    let active=true,spinning=false,spin=0;
    const style=doc.createElement('style');style.textContent=report.css||'';doc.head.append(style);
    const area=doc.createElement('div'),ids=cardAreas[input.featureKey];
    if(ids){host.id=ids[0];area.id=ids[1];}
    area.append(report.parts?renderNatalReport(doc,report.parts,safeFragment):safeFragment(doc,report.html));host.replaceChildren(area);
    let closeRpg:(()=>void)|undefined;
    if(input.featureKey==='rpt_skillTreeCard'&&report.rpg){
      const target=doc.createElement('section');area.append(target);
      closeRpg=mountRpgQuest(target,{...report.rpg,name:input.name||''},onLogin);
    }
    if(report.decadeHtml){
      const extra=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent='대한 상세표';
      extra.append(summary,safeFragment(doc,report.decadeHtml));host.append(extra);
    }
    if(input.featureKey==='rpt_villainCard')bindVillainResult(host);
    async function roulette(event:Event){
      const target=(event.target as HTMLElement)?.closest('button[data-energy-roulette-mode],button[data-energy-roulette-reroll]');
      const mode=target?.getAttribute('data-energy-roulette-mode')||target?.getAttribute('data-energy-roulette-reroll');
      if(!mode||spinning||input.featureKey!=='rpt_energyCoordCard')return;
      spinning=true;setIssue('');
      const buttons=Array.from(host!.querySelectorAll<HTMLButtonElement>('button'));
      buttons.forEach(b=>b.disabled=true);
      try{
        const response=checked(await api<Report>(path,{...input,energy:{recent:input.energy?.recent,renderedAt:report.energy?.renderedAt,roulette:{mode,spin:spin+1,recent:travel.winners}}}),input.featureKey);
        if(!active)return;
        const output=doc!.getElementById('energyRouletteResult'),wheel=doc!.getElementById('energyRouletteWheel');
        if(!output)throw Error('Roulette unavailable');
        output.replaceChildren(safeFragment(doc!,response.html));
        if(wheel&&response.energy?.transform)wheel.style.transform=response.energy.transform;
        travel.winners=response.energy?.roulette||[];saveTravelHistory(travel);spin++;
      }catch{if(active)setIssue('여행지를 뽑지 못했어요. 다시 선택해 주세요.');}
      finally{if(active){spinning=false;buttons.forEach(b=>b.disabled=false);}}
    }
    host.addEventListener('click',roulette);
    return ()=>{active=false;closeRpg?.();host.removeEventListener('click',roulette);style.remove();};
  },[ready,report,input,travel,onLogin]);
  return <><iframe title={TOSS_PUBLIC_SECTIONS[input.featureKey]} ref={frame} sandbox="allow-same-origin" srcDoc={frameDocument}
    onLoad={()=>setReady(true)} style={{width:'100%',height:'min(72svh, 800px)',display:'block',border:0,borderRadius:16}}/>{issue&&<p role="alert">{issue}</p>}</>;
}
function Reading({kind,onLogin}:{kind:'saju'|'ziwei';onLogin:()=>void}){
  const keys=(Object.keys(TOSS_PUBLIC_SECTIONS) as SectionKey[]).filter(k=>isTossPublicSection(k)&&(kind==='saju'?!k.startsWith('ziwei_'):k.startsWith('ziwei_')));
  const [key,setKey]=useState(keys.includes('saju_natal_reading')?'saju_natal_reading':keys[0]),[birth,setBirth]=useState(emptyBirth),[mode,setMode]=useState('pig'),[name,setName]=useState('');
  const [result,setResult]=useState<{report:Report;input:RequestBody;travel:TravelHistory}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [island,setIsland]=useState(kind==='ziwei'&&new URLSearchParams(location.search).get('reading')==='island');
  const [house,setHouse]=useState(kind==='saju'&&new URLSearchParams(location.search).get('reading')==='house');
  const epoch=useRef(0),title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{
    if(!result&&!busy)return;
    if(result)title.current?.focus();
    const back=(e:Event)=>{
      if(e.defaultPrevented)return;
      e.preventDefault();
      const detail=title.current?.parentElement?.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]');
      if(detail){(detail as HTMLDialogElement).close();return;}
      epoch.current++;setBusy(false);setResult(null);setError('');
    };
    window.addEventListener('code-destiny:toss-back',back);return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result,busy]);
  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;
    if(key==='rpt_secretHouseEntryCard'){setHouse(true);return;}
    const id=++epoch.current;
    setBusy(true);setError('');
    try{
      const travel=key==='rpt_energyCoordCard'?await loadTravelHistory(JSON.stringify(birth)):{recent:[],winners:[]};
      if(epoch.current!==id)return;
      const input=sectionInput(key,birth,mode,travel.recent,name);
      const report=checked(await api<Report>(path,input),key);
      if(epoch.current===id){
        if(report.energy?.recent){travel.recent=report.energy.recent;saveTravelHistory(travel);}
        setResult({report,input,travel});
      }
    }catch{if(epoch.current===id)setError('풀이를 불러오지 못했어요. 입력과 연결 상태를 확인한 뒤 다시 시도해 주세요.');}
    finally{if(epoch.current===id)setBusy(false);}
  }
  if(island)return <Suspense fallback={<p>섬을 열고 있어요.</p>}><IslandReading onBack={()=>setIsland(false)}/></Suspense>;
  if(house)return <Suspense fallback={<p>합숙소를 열고 있어요.</p>}><SecretHouseReading onBack={()=>setHouse(false)}/></Suspense>;
  if(result)return <section><h1 tabIndex={-1} ref={title}>{TOSS_PUBLIC_SECTIONS[result.input.featureKey]}</h1>
    {birth.unknown&&<p>출생 시각을 몰라 정오를 기준으로 계산했어요.</p>}
    <SectionBody {...result} onLogin={onLogin}/>{result.report.imagePrompts&&<ImagePrompts items={result.report.imagePrompts}/>}<Button variant="weak" display="block" onClick={()=>setResult(null)}>다른 풀이 보기</Button></section>;
  return <section><h1>{kind==='saju'?'사주 리포트':'자미두수 상세 풀이'}</h1>
    {kind==='saju'&&<Button display="block" onClick={()=>location.assign('/saju/love-simulation/')}>러브 코드 · 사주 연애 시뮬레이션</Button>}
    {kind==='saju'&&<Button display="block" onClick={()=>location.assign('/saju/compatibility/')}>두 사람의 사주 궁합</Button>}
    {kind==='saju'&&<Button display="block" onClick={()=>location.assign('/saju-guardian/')}>사주 가디언</Button>}
    {kind==='saju'&&<Button display="block" onClick={()=>location.assign('/saju/sibyl/')}>시빌라 연간 대비 리포트</Button>}
    {kind==='ziwei'&&<><Button display="block" onClick={()=>setIsland(true)}>운명의 섬 탐험하기</Button><WebPurchaseHistory kind="island"/></>}
    <form className="form" onSubmit={submit}><label>풀이 선택<select value={key} onChange={e=>setKey(e.target.value as SectionKey)} disabled={busy}>
    {keys.map(k=><option key={k} value={k}>{TOSS_PUBLIC_SECTIONS[k]}</option>)}</select></label>
    {key!=='rpt_secretHouseEntryCard'&&<BirthFields title="풀이할 출생정보" value={birth} onChange={setBirth} disabled={busy}/>}
    {['saju_natal_reading','rpt_skillTreeCard'].includes(key)&&<label>풀이에서 부를 이름 (선택)<input maxLength={40} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>}
    {['rpt_quantumCard','saju_natal_reading'].includes(key)&&<label>해석 관점<select value={mode} disabled={busy} onChange={e=>setMode(e.target.value)}><option value="pig">연이</option><option value="neo">영냥이</option></select></label>}
    {error&&<p role="alert">{error}</p>}<Button type="submit" display="block" disabled={busy} loading={busy}>선택한 풀이 보기</Button></form></section>;
}
export default function PublicSectionReading({kind,onLogin}:{kind:'saju'|'ziwei';onLogin:()=>void}){return <TossSessionScope><Reading kind={kind} onLogin={onLogin}/></TossSessionScope>;}
