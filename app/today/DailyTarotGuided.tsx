"use client";

// /today/ 연이 오늘의 세 장 — 공통 스텝 플로우 판(3c-A1, 2026-11-20 승인). 롤백은 lib/guided-flow/flags.mjs.
// 랜딩 → 셔플(대기 1.2s) → 세 장 고르기 → 펼치기(500ms 뒤 350ms 간격, 800ms 뒤집기) → 잇는 중(풀이 엔진 대기) → 결과.
// 🔴 원본(DailyTarot.tsx)과 같은 것: 저장 키 cd:yeoni:daily-three:v1 와 형식, 덱·뽑기·펼치기 라이브러리(daily-three.mjs),
// 풀이 엔진 입력, daily_tarot_* 이벤트, 결과 아래 공유 카드·다음 질문. 고른 카드는 펼치기 전까지 다시 눌러 취소할 수 있다.
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {fortuneTeaHouseAssets} from '@/src/features/fortune-tea-house/data/assets';
import {GuidedFlowShell,GuidedLanding} from '@/app/components/guided-flow/GuidedFlowShell';
import {type GuidedStep,useGuidedFlow} from '@/app/components/guided-flow/useGuidedFlow';
import {useGuidedT} from '@/app/components/guided-flow/useGuidedT';
import tarot from '@/app/components/guided-flow/guided-tarot.module.css';
import {historyStateFor,readHistoryState,snapshotKey,stepFromSearch,urlWithStep} from '@/lib/guided-flow/step-controller.mjs';
import {FreeQuestionNext} from '../components/QuestionJourney';
import {trackEvent} from '@/lib/analytics';
import {DAILY_MEANINGS,DAILY_POSITIONS,DAILY_TAROT_KEY,kstDay,newDailyReading,restoreDailyReading,pickDailyCard,revealDailyCard,sharedDailyCards} from '@/lib/tarot/daily-three.mjs';
import PublicInsightCard from '@/components/fortune/PublicInsightCard';
import type {DailyTarotCard} from './DailyTarot';

interface Reading {version:number;date:string;deck:number[];picks:number[];revealed:number}
interface MasterReading {
 verdict:string;
 positions:{label:string;text:string}[];
 energy:{label:string;head:string;body:string}[];
 between:string;
 synthesis:{flow:string;caution:string;action:string};
 close:string;
}
interface MasterInput {cards:{code:string;reversed:boolean}[];category:string;surface:string;positions:string[];positionTexts:string[]}

const FLOW_ID='yeoni-daily-three';
const STEPS:GuidedStep[]=[
 // 셔플은 URL 에 남기지 않는다(뒤로가기가 셔플을 다시 틀지 않게). 새로고침하면 저장된 덱으로 고르기부터.
 {id:'shuffle',kind:'wait',history:'none',transient:true,restoreTo:'pick'},
 // /today/ 허브는 popstate 마다 열람 권한을 초기화한다(useReadingIdentityReset). 단계마다 history 를 쌓으면
 // 브라우저 뒤로가 패널 전체를 닫으므로 이 흐름은 ?step= 만 교체한다. 앱 안 '이전'은 제자리 교체, 브라우저 뒤로는 원본처럼 페이지 이탈.
 {id:'pick',kind:'input',history:'replace'},
 {id:'reveal',kind:'input',history:'replace'},
 {id:'reading',kind:'wait',history:'none',transient:true,restoreTo:'result',awaitWork:true},
 {id:'result',kind:'result',history:'replace'},
];
const AUTO_MS=450,FIRST_FLIP_MS=500,FLIP_GAP_MS=350,FLIP_MS=800;

const emit=(name:string,params:Record<string,unknown>={})=>trackEvent(name,{service:'yeoni_daily',...params});

function answersOf(reading:Reading|null):Record<string,string>{
 if(!reading)return {};
 return {...(reading.picks.length===3?{pick:'3'}:{}),...(reading.revealed===3?{reveal:'3'}:{})};
}
function stepFor(reading:Reading){
 return reading.revealed===3?'result':reading.picks.length===3?'reveal':'pick';
}

// 찻집 축소본 → 찻집 원본 → 공개 덱 순서로 넘어간다(원본과 같다).
function CardImage({card,alt}:{card:DailyTarotCard;alt:string}){
 const sources=[card.thumb,card.image,card.fallback].filter(Boolean);
 const [index,setIndex]=useState(0);
 // eslint-disable-next-line @next/next/no-img-element
 return <img src={sources[index]} alt={alt} width={480} height={720} decoding="async" onError={()=>setIndex(current=>current<sources.length-1?current+1:current)}/>;
}

type Boot={reading:Reading|null;shared:number[]|null;storageOk:boolean};

export default function DailyTarotGuided({cards}:{cards:DailyTarotCard[]}){
 const t=useGuidedT();
 const [boot,setBoot]=useState<Boot|null>(null);
 const initialized=useRef(false);
 // 저장된 오늘의 카드로 시작 단계를 정하고 URL·세션 스냅숏을 맞춘 뒤에 흐름을 띄운다(흐름 훅은 마운트 때 한 번 복원한다).
 useEffect(()=>{
  if(initialized.current)return;initialized.current=true;
  const date=kstDay();
  const params=new URLSearchParams(window.location.search);
  const incoming=sharedDailyCards(params.get('daily_cards'));
  if(incoming)emit('daily_tarot_share_receive');
  let saved:Reading|null=null,storageOk=true;
  try{
   saved=restoreDailyReading(localStorage.getItem(DAILY_TAROT_KEY));
   if(saved){
    if(saved.date===date)emit('daily_tarot_reopen',{complete:saved.revealed===3});
    else if(saved.date<date)emit('daily_tarot_return',{days_since:Math.round((Date.parse(date)-Date.parse(saved.date))/86400000)});
   }
  }catch{storageOk=false;}
  const todays=saved&&saved.date===date?saved:null;
  const own=readHistoryState(window.history.state,FLOW_ID);
  const urlStep=stepFromSearch(window.location.search);
  const step=todays?(urlStep||stepFor(todays)):null;
  try{
   if(step)window.sessionStorage.setItem(snapshotKey(FLOW_ID),JSON.stringify({version:1,stepId:step,answers:answersOf(todays)}));
   else window.sessionStorage.removeItem(snapshotKey(FLOW_ID));
  }catch{/* 세션 저장 불가: URL 단계만으로 복원 */}
  window.history.replaceState(historyStateFor(FLOW_ID,step,own?own.position:0),'',urlWithStep(window.location.href,step));
  setBoot({reading:saved,shared:incoming,storageOk});
 },[]);
 return <section id="daily-tarot" aria-label={t('dailyTarot.title')}>
  {boot?<DailyFlow cards={cards} boot={boot}/>:null}
 </section>;
}

function DailyFlow({cards,boot}:{cards:DailyTarotCard[];boot:Boot}){
 const t=useGuidedT();
 const flow=useGuidedFlow({steps:STEPS,featureId:'daily_tarot',surface:'today',flowId:FLOW_ID});
 const {controller,state,step}=flow;
 const reduced=state.reducedMotion;
 const [reading,setReading]=useState<Reading|null>(boot.reading);
 const readingRef=useRef<Reading|null>(boot.reading);
 const [storageOk,setStorageOk]=useState(boot.storageOk);
 const [shared,setShared]=useState(boot.shared);
 const [master,setMaster]=useState<MasterReading|null>(null),[masterFailed,setMasterFailed]=useState(false);
 const today=kstDay();
 const todays=reading&&reading.date===today?reading:null;

 const save=useCallback((next:Reading)=>{
  readingRef.current=next;setReading(next);
  try{localStorage.setItem(DAILY_TAROT_KEY,JSON.stringify(next));}catch{setStorageOk(false);}
 },[]);

 const selected=useMemo(()=>reading?reading.picks.map(slot=>reading.deck[slot]):[],[reading]);
 const revealed=reading?.revealed??0;
 const selectedKey=selected.join(',');

 // 세 장이 열리면 풀이 엔진을 불러온다(원본과 같은 입력). 문구 데이터가 커서 이 시점에만 받는다.
 useEffect(()=>{
  if(revealed!==3||!selectedKey)return;
  let cancelled=false;
  setMaster(null);setMasterFailed(false);
  const ids=selectedKey.split(',').map(Number);
  import('@/js/core/tarot/master-reading.mjs').then(module=>{
   if(cancelled)return;
   const build=module.buildMasterReading as unknown as (input:MasterInput)=>MasterReading;
   setMaster(build({
    cards:ids.map(id=>({code:cards[id].code,reversed:false})),
    category:'daily',surface:'today',positions:DAILY_POSITIONS,
    positionTexts:ids.map((id,index)=>DAILY_MEANINGS[id][index]),
   }));
  }).catch(()=>{if(!cancelled)setMasterFailed(true);});
  return()=>{cancelled=true;};
 },[revealed,selectedKey,cards]);

 const stepId=step?.id;
 useEffect(()=>{
  if(stepId==='reading'&&(master||masterFailed))controller.workDone();
 },[stepId,master,masterFailed,controller]);

 const begin=useCallback(()=>{
  const date=kstDay();
  const current=readingRef.current;
  if(current&&current.date===date){controller.goTo(stepFor(current));return;}
  save(newDailyReading(date));setShared(null);setMaster(null);setMasterFailed(false);
  emit('daily_tarot_start');
  flow.start();
 },[controller,flow,save]);

 // 원본 DailyTarot 의 '어제 카드 마저 보기'와 같다: 지난 날짜 그대로 고르기·펼치기·결과를 이어 연다.
 const resume=useCallback(()=>{
  const current=readingRef.current;
  if(!current)return;
  controller.restore({stepId:stepFor(current),answers:answersOf(current)});
 },[controller]);

 const toggle=useCallback((slot:number)=>{
  const current=readingRef.current;
  if(!current||current.revealed>0)return;
  const next=current.picks.includes(slot)?{...current,picks:current.picks.filter(item=>item!==slot)}:pickDailyCard(current,slot);
  if(next===current)return;
  save(next);
  controller.setAnswer(next.picks.length===3?'3':'');
 },[controller,save]);

 const revealOne=useCallback(()=>{
  const current=readingRef.current;
  if(!current||current.picks.length<3||current.revealed>=3)return;
  const next=revealDailyCard(current);
  save(next);
  if(next.revealed===3){emit('daily_tarot_complete');controller.setAnswer('3');}
 },[controller,save]);

 const labels=useMemo(()=>({
  back:t('back'),next:t('next'),skip:t('skip'),
  progress:(current:number,total:number)=>t('progress',{current,total}),
  slowLine:t('slowLine'),
 }),[t]);
 const titles={
  shuffle:t('dailyTarot.shuffleTitle'),pick:t('dailyTarot.pickTitle'),reveal:t('dailyTarot.revealTitle'),
  reading:t('dailyTarot.readingTitle'),result:t('dailyTarot.resultTitle'),
 };
 const theme={'--gf-card-back':`url(${fortuneTeaHouseAssets.premium.tarotCardBack})`} as CSSProperties;

 const landing=<>
  {shared?<div className={tarot.shared}>
   <h3>{t('dailyTarot.sharedTitle')}</h3>
   <p>{t('dailyTarot.sharedBody')}</p>
   <ol>{shared.map((id,index)=><li key={id}><strong>{DAILY_POSITIONS[index]} · {cards[id].name}</strong><p>{DAILY_MEANINGS[id][index]}</p></li>)}</ol>
  </div>:null}
  {reading&&!todays?<div className={tarot.newDay}>
   <p className={tarot.note} role="status">{t('dailyTarot.newDayBody')}</p>
   <button type="button" className="cd-btn cd-btn--secondary" onClick={resume}>{t('dailyTarot.resumeYesterday')}</button>
  </div>:null}
  <GuidedLanding
   titleAs="h2"
   eyebrow={t('dailyTarot.eyebrow')}
   title={t('dailyTarot.title')}
   subtitle={t('dailyTarot.subtitle')}
   ctaLabel={todays?t('dailyTarot.ctaContinue'):t('dailyTarot.cta')}
   onStart={begin}
   freeHint={t('dailyTarot.freeHint')}
   aboutTitle={t('dailyTarot.aboutTitle')}
   aboutBody={t('dailyTarot.aboutBody')}
   guideTitle={t('dailyTarot.guideTitle')}
   guideSteps={[1,2,3].map(n=>({title:t(`dailyTarot.guide${n}Title`),body:t(`dailyTarot.guide${n}Body`)}))}
  />
 </>;

 return <div style={theme}>
  <GuidedFlowShell
   className={tarot.embedded}
   flow={flow}
   labels={labels}
   titles={titles}
   landing={landing}
   renderStep={current=>{
    if(current.id==='shuffle')return <div className={tarot.deck} aria-hidden="true"><span className={tarot.deckCard}/><span className={tarot.deckCard}/><span className={tarot.deckCard}/></div>;
    if(current.id==='pick'&&reading)return <PickStep reading={reading} onToggle={toggle} reduced={reduced} next={()=>controller.next('auto')} t={t}/>;
    if(current.id==='reveal'&&reading)return <RevealStep reading={reading} cards={cards} selected={selected} reduced={reduced} revealOne={revealOne} next={()=>controller.next('auto')} clearAnswer={()=>controller.setAnswer('')} t={t}/>;
    if(current.id==='reading')return <div className={tarot.spread} style={{'--gt-count':3} as CSSProperties} aria-hidden="true">{selected.map(id=><span key={id} className={tarot.slot}><span className={tarot.flip} data-open="true"><span className={tarot.flipInner}><span className={tarot.flipBack}/><span className={tarot.flipFace}><CardImage card={cards[id]} alt=""/></span></span></span></span>)}</div>;
    if(current.id==='result'&&reading)return <ResultStep reading={reading} cards={cards} selected={selected} master={master} masterFailed={masterFailed} t={t}/>;
    return null;
   }}
  />
  {!storageOk?<p role="status" className={tarot.note}>{t('dailyTarot.storageNote')}</p>:null}
 </div>;
}

type T=ReturnType<typeof useGuidedT>;

function PickStep({reading,onToggle,reduced,next,t}:{reading:Reading;onToggle:(slot:number)=>void;reduced:boolean;next:()=>void;t:T}){
 const count=reading.picks.length,locked=reading.revealed>0;
 const auto=useRef<number|null>(null);
 // 세 번째 카드를 고르면 450ms 뒤 펼치기로(명세 D1). 그 사이 취소하면 멈춘다. reduced-motion 은 '다음'으로만.
 useEffect(()=>{
  if(auto.current!==null){window.clearTimeout(auto.current);auto.current=null;}
  if(count!==3||reduced||locked)return;
  auto.current=window.setTimeout(()=>{auto.current=null;next();},AUTO_MS);
  return()=>{if(auto.current!==null){window.clearTimeout(auto.current);auto.current=null;}};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[count,reduced,locked]);
 return <>
  <p className={tarot.pickMeta}><span className={tarot.pickCount}>{t('dailyTarot.pickCount',{count})}</span>{locked?null:<span>{t('dailyTarot.pickHint')}</span>}</p>
  <div className={tarot.pickGrid} role="group" aria-label={t('dailyTarot.pickGroup')}>
   {reading.deck.map((_:number,slot:number)=>{
    const order=reading.picks.indexOf(slot),taken=order>=0;
    return <button key={slot} type="button" className={tarot.pickCard} aria-pressed={taken} disabled={locked||(!taken&&count>=3)} aria-label={t('dailyTarot.pickCard',{n:slot+1})} onClick={()=>onToggle(slot)}>
     {taken?<span className={tarot.pickOrder} aria-hidden="true">{order+1}</span>:null}
    </button>;
   })}
  </div>
 </>;
}

function RevealStep({reading,cards,selected,reduced,revealOne,next,clearAnswer,t}:{reading:Reading;cards:DailyTarotCard[];selected:number[];reduced:boolean;revealOne:()=>void;next:()=>void;clearAnswer:()=>void;t:T}){
 const timers=useRef<number[]>([]);
 const clear=()=>{timers.current.forEach(window.clearTimeout);timers.current=[];};
 const revealAll=useCallback((withAuto:boolean)=>{
  clear();
  for(let i=0;i<3;i+=1)revealOne();
  if(withAuto)timers.current.push(window.setTimeout(next,FLIP_MS+AUTO_MS));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[revealOne,next]);
 // 들어오면 남은 카드를 차례로 뒤집는다(첫 장 500ms, 350ms 간격, 800ms 뒤집기). 다 열리면 잠깐 보여 준 뒤 넘어간다.
 useEffect(()=>{
  const already=reading.revealed;
  if(already>=3)return;
  clearAnswer();
  if(reduced){revealAll(false);return clear;}
  const remaining=3-already;
  for(let i=0;i<remaining;i+=1)timers.current.push(window.setTimeout(revealOne,FIRST_FLIP_MS+i*FLIP_GAP_MS));
  timers.current.push(window.setTimeout(next,FIRST_FLIP_MS+(remaining-1)*FLIP_GAP_MS+FLIP_MS+AUTO_MS));
  return clear;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return <>
  <div className={tarot.spread} style={{'--gt-count':3} as CSSProperties}>
   {DAILY_POSITIONS.map((position:string,index:number)=>{
    const id=selected[index],open=index<reading.revealed;
    return <figure key={position} className={tarot.slot}>
     <figcaption className={tarot.slotLabel}>{position}</figcaption>
     <button type="button" className={tarot.flip} data-open={open} aria-label={open&&id!==undefined?`${position}: ${cards[id].name}`:t('dailyTarot.revealEmpty',{position})} onClick={()=>{if(reading.revealed<3)revealAll(!reduced);}}>
      <span className={tarot.flipInner}>
       <span className={tarot.flipBack}/>
       <span className={tarot.flipFace}>{id!==undefined?<CardImage card={cards[id]} alt=""/>:null}</span>
      </span>
     </button>
     <strong className={tarot.slotName}>{open&&id!==undefined?cards[id].name:''}</strong>
    </figure>;
   })}
  </div>
  {reading.revealed<3?<p className={tarot.hint}>{t('dailyTarot.revealHint')}</p>:null}
 </>;
}

function ResultStep({reading,cards,selected,master,masterFailed,t}:{reading:Reading;cards:DailyTarotCard[];selected:number[];master:MasterReading|null;masterFailed:boolean;t:T}){
 const rows=master?.positions??selected.map((id,index)=>({label:DAILY_POSITIONS[index],text:DAILY_MEANINGS[id][index]}));
 return <div className={tarot.result}>
  <p className={tarot.dateLabel}>{t('dailyTarot.dateLabel',{date:reading.date})}</p>
  {master?<div className={tarot.verdict}><small>{t('dailyTarot.verdictLabel')}</small><p>{master.verdict}</p></div>:null}
  <section className={tarot.section}>
   <h3 className={tarot.sectionTitle}>{t('dailyTarot.positionsTitle')}</h3>
   <ol className={tarot.positions}>{selected.map((id,index)=><li key={id} className={tarot.position}><CardImage card={cards[id]} alt=""/><p className={tarot.body}><span className={tarot.positionLabel}>{DAILY_POSITIONS[index]}</span><span className={tarot.positionName}>{cards[id].name}</span>{rows[index]?.text}</p></li>)}</ol>
  </section>
  {master?<>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('dailyTarot.energyTitle')}</h3><dl className={tarot.energy}>{master.energy.map(row=><div key={row.label}><dt>{row.label}</dt><dd><b>{row.head}</b>{row.body}</dd></div>)}</dl></section>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('dailyTarot.betweenTitle')}</h3><p className={tarot.body}>{master.between}</p></section>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('dailyTarot.synthesisTitle')}</h3><div className={tarot.synth}>
    <div><h4>{t('dailyTarot.flowLabel')}</h4><p className={tarot.body}>{master.synthesis.flow}</p></div>
    <div><h4>{t('dailyTarot.cautionLabel')}</h4><p className={tarot.body}>{master.synthesis.caution}</p></div>
    <div className={tarot.action}><h4>{t('dailyTarot.actionLabel')}</h4><p className={tarot.body}>{master.synthesis.action}</p></div>
   </div></section>
   <div className={tarot.close}><p>{master.close}</p><small>{t('dailyTarot.signature')}</small></div>
  </>:null}
  {masterFailed?<div className={tarot.close}>
   <p>{t('dailyTarot.fallbackQuote')}</p><small>{t('dailyTarot.signature')}</small>
   <p className={tarot.note} role="status">{t('dailyTarot.fallbackNote')}</p>
  </div>:null}
  <div className={tarot.paid}>
   <b>{t('dailyTarot.paidTitle')}</b>
   <p>{t('dailyTarot.paidBody')}</p>
   <a className={tarot.paidLink} href="/fortune-tea-house/">{t('dailyTarot.paidLink')}</a>
  </div>
  <PublicInsightCard brand="daily" source="daily" day={reading.date} choices={selected.map((id,index)=>({id:String(id),label:DAILY_POSITIONS[index]+' · '+cards[id].name,text:DAILY_MEANINGS[id][index]}))}/>
  <p className={tarot.note}>{t('dailyTarot.endingNote')}</p>
  <FreeQuestionNext category="tarot" source="daily_tarot_result"/>
 </div>;
}
