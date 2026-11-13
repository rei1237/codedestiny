import {useEffect,useRef,useState,type FormEvent} from 'react';
import {TOSS_PUBLIC_SECTIONS,isTossPublicSection} from '../../../lib/fortune/toss-public-sections.mjs';
import {bindVillainResult} from 'virtual:section-villain-bindings';
import {BirthFields,birthPayload,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

type TravelHistory={recent:string[];winners:string[]};
type SectionKey=keyof typeof TOSS_PUBLIC_SECTIONS;
type Energy={recent?:string[];renderedAt?:string;transform?:string;roulette?:string[]};
type Report={ok:boolean;featureKey:string;accessSource:string;html:string;css?:string;decadeHtml?:string;energy?:Energy};
type RequestBody=ReturnType<typeof sectionInput>;
const cardAreas:Record<string,[string,string]>={
  rpt_quantumCard:['quantumCard','quantumSection'],rpt_energyCoordCard:['energyCoordCard','energyCoordSection'],
  rpt_villainCard:['villainCard','villainResult'],rpt_healthReportCard:['healthReportCard','healthReportSection'],
  rpt_specialCharmCard:['specialCharmCard','specialCharmBody'],rpt_skillTreeCard:['skillTreeCard','skillTreeBody'],
};
const path='/canonical/saju/section';

function sectionInput(featureKey:SectionKey,input:BirthInput,mode:string,recent:string[]){
  const {location:c,date}=birthPayload(input);
  return {featureKey,gender:input.gender,mode,...(featureKey==='rpt_energyCoordCard'?{energy:{recent}}:{}),birth:{date:input.date,calType:date.calType,timeKnown:!input.unknown,hour:date.hour,minute:date.minute},
    place:{name:c.label,longitude:c.lng,latitude:c.lat,timezone:c.tz,baseTzOffset:9}};
}
function checked(response:Report,key:string){
  if(!response.ok||response.featureKey!==key||response.accessSource!=='public'||!response.html?.trim())throw Error('Section unavailable');
  return response;
}
function safeFragment(doc:Document,html:string){
  const template=doc.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('script,iframe,frame,object,embed,meta,base,link,form').forEach(el=>el.remove());
  for(const el of template.content.querySelectorAll('*'))for(const attr of Array.from(el.attributes)){
    if(/^on/i.test(attr.name)||['href','xlink:href','src','srcset','action','formaction','target','srcdoc'].includes(attr.name))el.removeAttribute(attr.name);
  }
  return template.content;
}
const frameDocument='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';style-src \'unsafe-inline\';form-action \'none\';base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#161827;color:#f6f2ef;font:15px/1.65 system-ui,sans-serif;overflow-wrap:anywhere}main{padding:12px;width:100%;overflow-x:auto}summary,button,input{cursor:pointer}details{margin-block:8px}svg{max-width:100%}h2,h3{line-height:1.4}button{max-width:100%}</style></head><body><main></main></body></html>';

function SectionBody({report,input,travel}:{report:Report;input:RequestBody;travel:TravelHistory}){
  const frame=useRef<HTMLIFrameElement>(null),[ready,setReady]=useState(false),[issue,setIssue]=useState('');
  useEffect(()=>{
    const doc=frame.current?.contentDocument,host=doc?.querySelector('main');
    if(!ready||!doc||!host)return;
    let active=true,spinning=false,spin=0;
    const style=doc.createElement('style');style.textContent=report.css||'';doc.head.append(style);
    const area=doc.createElement('div'),ids=cardAreas[input.featureKey];
    if(ids){host.id=ids[0];area.id=ids[1];}
    area.append(safeFragment(doc,report.html));host.replaceChildren(area);
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
        travel.winners=response.energy?.roulette||[];spin++;
      }catch{if(active)setIssue('여행지를 뽑지 못했어요. 다시 선택해 주세요.');}
      finally{if(active){spinning=false;buttons.forEach(b=>b.disabled=false);}}
    }
    host.addEventListener('click',roulette);
    return ()=>{active=false;host.removeEventListener('click',roulette);style.remove();};
  },[ready,report,input,travel]);
  return <><iframe title={TOSS_PUBLIC_SECTIONS[input.featureKey]} ref={frame} sandbox="allow-same-origin" srcDoc={frameDocument}
    onLoad={()=>setReady(true)} style={{width:'100%',height:'min(72svh, 800px)',display:'block',border:0,borderRadius:16}}/>{issue&&<p role="alert">{issue}</p>}</>;
}
function Reading({kind}:{kind:'saju'|'ziwei'}){
  const keys=(Object.keys(TOSS_PUBLIC_SECTIONS) as SectionKey[]).filter(k=>isTossPublicSection(k)&&k.startsWith(kind==='saju'?'rpt_':'ziwei_'));
  const [key,setKey]=useState(keys[0]),[birth,setBirth]=useState(emptyBirth),[mode,setMode]=useState('pig');
  const [result,setResult]=useState<{report:Report;input:RequestBody;travel:TravelHistory}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const travelByBirth=useRef(new Map<string,TravelHistory>());
  const epoch=useRef(0),title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{
    if(!result&&!busy)return;
    if(result)title.current?.focus();
    const back=(e:Event)=>{if(!e.defaultPrevented){e.preventDefault();epoch.current++;setBusy(false);setResult(null);setError('');}};
    window.addEventListener('code-destiny:toss-back',back);return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result,busy]);
  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;
    const id=++epoch.current;
    setBusy(true);setError('');
    try{
      const birthKey=JSON.stringify(birth);
      const travel=travelByBirth.current.get(birthKey)||{recent:[],winners:[]};
      const input=sectionInput(key,birth,mode,travel.recent);
      const report=checked(await api<Report>(path,input),key);
      if(epoch.current===id){
        if(report.energy?.recent){travel.recent=report.energy.recent;travelByBirth.current.set(birthKey,travel);}
        setResult({report,input,travel});
      }
    }catch{if(epoch.current===id)setError('풀이를 불러오지 못했어요. 입력과 연결 상태를 확인한 뒤 다시 시도해 주세요.');}
    finally{if(epoch.current===id)setBusy(false);}
  }
  if(result)return <section><h1 tabIndex={-1} ref={title}>{TOSS_PUBLIC_SECTIONS[result.input.featureKey]}</h1>
    {birth.unknown&&<p>출생 시각을 몰라 정오를 기준으로 계산했어요.</p>}
    <SectionBody {...result}/><Button variant="weak" display="block" onClick={()=>setResult(null)}>다른 풀이 보기</Button></section>;
  return <section><h1>{kind==='saju'?'사주 리포트':'자미두수 상세 풀이'}</h1>
    <form className="form" onSubmit={submit}><label>풀이 선택<select value={key} onChange={e=>setKey(e.target.value as SectionKey)} disabled={busy}>
    {keys.map(k=><option key={k} value={k}>{TOSS_PUBLIC_SECTIONS[k]}</option>)}</select></label>
    <BirthFields title="풀이할 출생정보" value={birth} onChange={setBirth} disabled={busy}/>
    {key==='rpt_quantumCard'&&<label>해석 관점<select value={mode} disabled={busy} onChange={e=>setMode(e.target.value)}><option value="pig">연이</option><option value="neo">네오</option></select></label>}
    {error&&<p role="alert">{error}</p>}<Button type="submit" display="block" disabled={busy} loading={busy}>선택한 풀이 보기</Button></form></section>;
}
export default function PublicSectionReading({kind}:{kind:'saju'|'ziwei'}){return <TossSessionScope><Reading kind={kind}/></TossSessionScope>;}
