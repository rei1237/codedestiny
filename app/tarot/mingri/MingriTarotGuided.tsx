"use client";

// /tarot/mingri/ 명리학 타로 무료 세 장 — 공통 스텝 플로우 판(5단계 ①, 2026-11-21 승인). 롤백은 lib/guided-flow/flags.mjs.
// 랜딩 → 고민 분야 → 셔플(대기) → 78장 중 세 장 고르기 → 펼치기(500ms 뒤 350ms 간격, 800ms 뒤집기) → 잇는 중(엔진 대기) → 결과.
// 🔴 셸 무료 세 장 의식(js/saju-engine-tarot-sukuyo-quantum.js)과 같은 것: 78장 덱, 카드마다 뽑을 때 0.5 확률 역행, 자리·분야,
// 풀이 엔진 입력(buildMasterReading surface 'modal' + sipsinNote), 결과 섹션 순서, 엔진 실패 시 자리별 카드만.
// 다른 것: 셸 세션의 일간(G_PILLARS)이 없어 십성은 카드 태그·수트 대체만 쓴다. 저장·서버 호출·과금 LLM 은 원본처럼 없다.
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {fortuneTeaHouseAssets} from '@/src/features/fortune-tea-house/data/assets';
import {GuidedChoiceList,GuidedFlowShell,GuidedLanding} from '@/app/components/guided-flow/GuidedFlowShell';
import {type GuidedStep,useGuidedFlow} from '@/app/components/guided-flow/useGuidedFlow';
import {useGuidedT} from '@/app/components/guided-flow/useGuidedT';
import tarot from '@/app/components/guided-flow/guided-tarot.module.css';
import fan from '@/app/today/daily-tarot-fan.module.css';
import {historyStateFor,snapshotKey,urlWithStep} from '@/lib/guided-flow/step-controller.mjs';
import {MINGRI_CATEGORIES,MINGRI_DECK,MINGRI_POSITIONS,drawMingriOrientation,mingriCardImages,mingriTenGod,shuffleMingriDeck} from '@/lib/tarot/mingri-free-three.mjs';
import styles from './mingri-tarot.module.css';
import YeoniSay from "@/components/fortune/YeoniSay";

interface Pick {slot:number;reversed:boolean}
interface MasterReading {
 categoryLabel:string;
 verdict:string;
 positions:{label:string;name:string;reversed:boolean;dirLabel:string;text:string}[];
 energy:{label:string;head:string;body:string}[];
 between:string;
 synthesis:{flow:string;caution:string;action:string};
 close:string;
}
type Engine={
 buildMasterReading:(input:{cards:{code:string;reversed:boolean}[];category:string;surface:string;positions:string[]})=>MasterReading;
 sipsinNote:(rows:{name:string;tenGod:string}[])=>string;
};
type Outcome={reading:MasterReading;sipsin:string}|null;

const FLOW_ID='mingri-free-three';
// 셸 모달의 기존 실행 주소(FeatureLandingPage ACTION_MAP 과 같다). 한 장 리딩·결제 후 리딩은 셸에 그대로 있다.
export const MINGRI_SHELL_HREF='/index.html?action=openTarotModal';
const STEPS:GuidedStep[]=[
 {id:'topic',kind:'choice'},
 // 셔플·잇는 중은 URL 에 남기지 않는다. 뽑은 카드는 저장하지 않으므로 새로고침하면 랜딩부터(셸도 저장하지 않는다).
 {id:'shuffle',kind:'wait',history:'none',transient:true,restoreTo:'pick'},
 {id:'pick',kind:'input'},
 {id:'reveal',kind:'input'},
 {id:'reading',kind:'wait',history:'none',transient:true,restoreTo:'result',awaitWork:true},
 {id:'result',kind:'result'},
];
const AUTO_MS=450,FIRST_FLIP_MS=500,FLIP_GAP_MS=350,FLIP_MS=800;
const loadEngine=()=>import('@/js/core/tarot/master-reading.mjs') as unknown as Promise<Engine>;

function CardImage({code,reversed,alt}:{code:string;reversed?:boolean;alt:string}){
 const sources=useMemo(()=>mingriCardImages(code),[code]);
 const [index,setIndex]=useState(0);
 // eslint-disable-next-line @next/next/no-img-element
 return <img src={sources[index]} alt={alt} width={480} height={720} decoding="async" className={reversed?styles.reversed:undefined} onError={()=>setIndex(current=>current<sources.length-1?current+1:current)}/>;
}

export default function MingriTarotGuided(){
 const [ready,setReady]=useState(false);
 const initialized=useRef(false);
 // 뽑은 카드는 저장하지 않으므로 새로고침·외부 진입은 언제나 랜딩에서 시작한다(치유 타로와 같다).
 useEffect(()=>{
  if(initialized.current)return;initialized.current=true;
  try{window.sessionStorage.removeItem(snapshotKey(FLOW_ID));}catch{/* 세션 저장 불가 */}
  window.history.replaceState(historyStateFor(FLOW_ID,null,0),'',urlWithStep(window.location.href,null));
  setReady(true);
 },[]);
 return ready?<MingriFlow/>:<div className={styles.reserve} aria-hidden="true"/>;
}

function MingriFlow(){
 const t=useGuidedT();
 const flow=useGuidedFlow({steps:STEPS,featureId:'mingri_tarot',surface:'tarot_mingri',flowId:FLOW_ID});
 const {controller,state,step}=flow;
 const reduced=state.reducedMotion;
 const topic=state.answers.topic;
 const category=typeof topic==='string'&&topic ? topic : 'daily';
 const categoryLabel=t(`mingriTarot.topics.${category}`);
 const [deck,setDeck]=useState<number[]>([]);
 const [picks,setPicks]=useState<Pick[]>([]);
 const [revealed,setRevealed]=useState(0);
 const [outcome,setOutcome]=useState<Outcome>(null);
 const [failed,setFailed]=useState(false);
 const [shareNote,setShareNote]=useState('');

 const shuffle=useCallback(()=>{
  loadEngine().catch(()=>{});
  setDeck(shuffleMingriDeck());picksRef.current=[];revealedRef.current=0;setPicks([]);setRevealed(0);setOutcome(null);setFailed(false);setShareNote('');
 },[]);

 const begin=useCallback(()=>{flow.start();},[flow]);
 // 분야를 고르고 넘어가면 덱을 새로 섞는다(셸: 분야 칩 → 섞기).
 const stepId=step?.id;
 const lastStep=useRef<string|undefined>(undefined);
 useEffect(()=>{
  const previous=lastStep.current;lastStep.current=stepId;
  if(stepId==='shuffle'&&previous==='topic')shuffle();
 },[stepId,shuffle]);

 const codes=useMemo(()=>picks.map(pick=>MINGRI_DECK[deck[pick.slot]]?.code??''),[picks,deck]);
 const codesKey=codes.join(',')+'|'+picks.map(pick=>pick.reversed?1:0).join('');

 // 세 장이 다 열리면 풀이 엔진을 불러온다(셸 _runFreeTarotMasterReading 과 같은 입력).
 useEffect(()=>{
  if(revealed!==3||codes.length!==3)return;
  let cancelled=false;
  setOutcome(null);setFailed(false);
  loadEngine().then(engine=>{
   if(cancelled)return;
   const reading=engine.buildMasterReading({cards:codes.map((code,i)=>({code,reversed:picks[i].reversed})),category,surface:'modal',positions:MINGRI_POSITIONS});
   const sipsin=engine.sipsinNote(reading.positions.map((row,i)=>({name:row.name,tenGod:mingriTenGod(codes[i])})));
   setOutcome({reading,sipsin});
  }).catch(error=>{
   if(cancelled)return;
   console.warn('[tarot] 풀이 엔진을 불러오지 못했어요',error);
   setFailed(true);
  });
  return()=>{cancelled=true;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[revealed,codesKey,category]);

 useEffect(()=>{
  if(stepId==='reading'&&(outcome||failed))controller.workDone();
 },[stepId,outcome,failed,controller]);

 // 덱·카드 없이 뒤 단계에 있으면(뒤로/앞으로 등) 랜딩으로 돌린다.
 useEffect(()=>{
  if((stepId==='pick'&&deck.length!==78)||((stepId==='reveal'||stepId==='result')&&picks.length!==3))controller.goTo(null);
 },[stepId,deck.length,picks.length,controller]);

 // 컨트롤러 상태는 setState 갱신 함수 밖에서 바꾼다(렌더 중 다른 컴포넌트 갱신 경고 방지).
 const picksRef=useRef<Pick[]>([]);picksRef.current=picks;
 const revealedRef=useRef(0);revealedRef.current=revealed;
 const toggle=useCallback((slot:number)=>{
  if(revealedRef.current>0)return;
  const current=picksRef.current;
  const exists=current.some(pick=>pick.slot===slot);
  const next=exists?current.filter(pick=>pick.slot!==slot):current.length>=3?current:[...current,{slot,reversed:drawMingriOrientation()}];
  picksRef.current=next;setPicks(next);
  controller.setAnswer(next.length===3?'3':'');
 },[controller]);

 const revealOne=useCallback(()=>{
  const next=Math.min(3,revealedRef.current+1);
  revealedRef.current=next;setRevealed(next);
  if(next===3)controller.setAnswer('3');
 },[controller]);

 const again=useCallback(()=>{
  setDeck([]);picksRef.current=[];revealedRef.current=0;setPicks([]);setRevealed(0);setOutcome(null);setFailed(false);setShareNote('');
  controller.goTo('topic');
 },[controller]);

 const share=useCallback(async()=>{
  const cards=picks.map((pick,i)=>{
   const row=outcome?.reading.positions[i];
   const card=MINGRI_DECK[deck[pick.slot]];
   return `${MINGRI_POSITIONS[i]} ${row?row.name:card?.name??''} ${pick.reversed?t('mingriTarot.reversed'):t('mingriTarot.upright')}`;
  }).join(' · ');
  const text=[t('mingriTarot.shareText',{cards}),outcome?.reading.verdict??''].filter(Boolean).join('\n');
  const url=new URL('/tarot/mingri/',window.location.origin).toString();
  try{
   if(navigator.share){await navigator.share({title:categoryLabel,text,url});return;}
   await navigator.clipboard.writeText(`${text}\n${url}`);
   setShareNote(t('mingriTarot.shareCopied'));
  }catch(error){
   if((error as {name?:string})?.name==='AbortError')return;
   setShareNote(t('mingriTarot.shareFailed'));
  }
 },[picks,outcome,deck,t,categoryLabel]);

 const labels=useMemo(()=>({
  back:t('back'),next:t('next'),skip:t('skip'),
  progress:(current:number,total:number)=>t('progress',{current,total}),
  slowLine:t('slowLine'),
 }),[t]);
 const titles={
  topic:t('mingriTarot.topicTitle'),shuffle:t('mingriTarot.shuffleTitle'),pick:t('mingriTarot.pickTitle'),
  reveal:t('mingriTarot.revealTitle'),reading:t('mingriTarot.readingTitle'),result:t('mingriTarot.resultTitle'),
 };
 const theme={'--gf-card-back':`url(${fortuneTeaHouseAssets.premium.tarotCardBack})`} as CSSProperties;

 const landing=<>
  <GuidedLanding
   titleAs="h2"
   eyebrow={t('mingriTarot.eyebrow')}
   title={t('mingriTarot.title')}
   subtitle={t('mingriTarot.subtitle')}
   ctaLabel={t('mingriTarot.cta')}
   onStart={begin}
   freeHint={t('mingriTarot.freeHint')}
   aboutTitle={t('mingriTarot.aboutTitle')}
   aboutBody={t('mingriTarot.aboutBody')}
   guideTitle={t('mingriTarot.guideTitle')}
   guideSteps={[1,2,3].map(n=>({title:t(`mingriTarot.guide${n}Title`),body:t(`mingriTarot.guide${n}Body`)}))}
  />
  <p className={styles.shellLink}><a href={MINGRI_SHELL_HREF}>{t('mingriTarot.oneCardLink')}</a></p>
 </>;

 return <div style={theme}>
  <GuidedFlowShell
   className={tarot.embedded}
   flow={flow}
   labels={labels}
   titles={titles}
   landing={landing}
   renderStep={current=>{
    if(current.id==='topic')return <GuidedChoiceList flow={flow} label={t('mingriTarot.topicGroup')} options={MINGRI_CATEGORIES.map((value:string)=>({value,label:t(`mingriTarot.topics.${value}`)}))}/>;
    if(current.id==='shuffle')return <div className={tarot.deck} aria-hidden="true"><span className={tarot.deckCard}/><span className={tarot.deckCard}/><span className={tarot.deckCard}/></div>;
    if(current.id==='pick'&&deck.length===78)return <PickStep deck={deck} picks={picks} locked={revealed>0} onToggle={toggle} reduced={reduced} next={()=>controller.next('auto')} t={t}/>;
    if(current.id==='reveal'&&picks.length===3)return <RevealStep codes={codes} picks={picks} revealed={revealed} reduced={reduced} revealOne={revealOne} next={()=>controller.next('auto')} clearAnswer={()=>controller.setAnswer('')} t={t}/>;
    if(current.id==='reading')return <div className={tarot.spread} style={{'--gt-count':3} as CSSProperties} aria-hidden="true">{codes.map((code,i)=><span key={code} className={tarot.slot}><span className={tarot.flip} data-open="true"><span className={tarot.flipInner}><span className={tarot.flipBack}/><span className={tarot.flipFace}><CardImage code={code} reversed={picks[i]?.reversed} alt=""/></span></span></span></span>)}</div>;
    if(current.id==='result'&&picks.length===3)return <ResultStep codes={codes} picks={picks} outcome={outcome} failed={failed} categoryLabel={categoryLabel} share={()=>void share()} again={again} shareNote={shareNote} t={t}/>;
    return null;
   }}
  />
 </div>;
}

type T=ReturnType<typeof useGuidedT>;

function PickStep({deck,picks,locked,onToggle,reduced,next,t}:{deck:number[];picks:Pick[];locked:boolean;onToggle:(slot:number)=>void;reduced:boolean;next:()=>void;t:T}){
 const count=picks.length;
 const auto=useRef<number|null>(null);
 // 세 번째 카드를 고르면 450ms 뒤 펼치기로. 그 사이 취소하면 멈춘다. reduced-motion 은 '다음'으로만.
 useEffect(()=>{
  if(auto.current!==null){window.clearTimeout(auto.current);auto.current=null;}
  if(count!==3||reduced||locked)return;
  auto.current=window.setTimeout(()=>{auto.current=null;next();},AUTO_MS);
  return()=>{if(auto.current!==null){window.clearTimeout(auto.current);auto.current=null;}};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[count,reduced,locked]);
 // 78장은 22장 부채와 같은 굽기·등장 시간이 되도록 칸 거리를 줄인다(셸도 78장을 가로로 민다).
 const scale=21/(deck.length-1);
 return <>
  <p className={tarot.pickMeta}><span className={tarot.pickCount}>{t('mingriTarot.pickCount',{count})}</span>{locked?null:<span>{t('mingriTarot.pickHint')}</span>}</p>
  <ul className={fan.tray} aria-hidden="true">
   {MINGRI_POSITIONS.map((position:string,index:number)=><li key={position} className={fan.traySlot} data-filled={index<count}>
    {index<count?<span className={fan.trayThumb}/>:null}
    <span>{position}</span>
   </li>)}
  </ul>
  <div className={fan.wrap}>
   <div className={fan.stage}>
    <div className={fan.fan} role="group" aria-label={t('mingriTarot.pickGroup')}>
     {deck.map((_:number,slot:number)=>{
      const order=picks.findIndex(pick=>pick.slot===slot),taken=order>=0;
      return <button key={slot} type="button" className={fan.card} style={{'--i':slot*scale,'--k':(slot-(deck.length-1)/2)*scale} as CSSProperties} aria-pressed={taken} disabled={locked||(!taken&&count>=3)} aria-label={t('mingriTarot.pickCard',{n:slot+1})} onClick={()=>onToggle(slot)}>
       {taken?<span className={fan.order} aria-hidden="true">{order+1}</span>:null}
      </button>;
     })}
    </div>
   </div>
  </div>
 </>;
}

function RevealStep({codes,picks,revealed,reduced,revealOne,next,clearAnswer,t}:{codes:string[];picks:Pick[];revealed:number;reduced:boolean;revealOne:()=>void;next:()=>void;clearAnswer:()=>void;t:T}){
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
  if(revealed>=3)return;
  clearAnswer();
  if(reduced){revealAll(false);return clear;}
  const remaining=3-revealed;
  for(let i=0;i<remaining;i+=1)timers.current.push(window.setTimeout(revealOne,FIRST_FLIP_MS+i*FLIP_GAP_MS));
  timers.current.push(window.setTimeout(next,FIRST_FLIP_MS+(remaining-1)*FLIP_GAP_MS+FLIP_MS+AUTO_MS));
  return clear;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return <>
  <div className={tarot.spread} style={{'--gt-count':3} as CSSProperties}>
   {MINGRI_POSITIONS.map((position:string,index:number)=>{
    const code=codes[index],open=index<revealed,card=MINGRI_DECK.find(item=>item.code===code);
    const name=card?`${card.name} ${picks[index].reversed?t('mingriTarot.reversed'):t('mingriTarot.upright')}`:'';
    return <figure key={position} className={tarot.slot}>
     <figcaption className={tarot.slotLabel}>{position}</figcaption>
     <button type="button" className={tarot.flip} data-open={open} aria-label={open?`${position}: ${name}`:t('mingriTarot.revealEmpty',{position})} onClick={()=>{if(revealed<3)revealAll(!reduced);}}>
      <span className={tarot.flipInner}>
       <span className={tarot.flipBack}/>
       <span className={tarot.flipFace}>{code?<CardImage code={code} reversed={picks[index].reversed} alt=""/>:null}</span>
      </span>
     </button>
     <strong className={tarot.slotName}>{open?name:''}</strong>
    </figure>;
   })}
  </div>
  {revealed<3?<p className={tarot.hint}>{t('mingriTarot.revealHint')}</p>:null}
 </>;
}

function ResultStep({codes,picks,outcome,failed,categoryLabel,share,again,shareNote,t}:{codes:string[];picks:Pick[];outcome:Outcome;failed:boolean;categoryLabel:string;share:()=>void;again:()=>void;shareNote:string;t:T}){
 const reading=outcome?.reading;
 const rows=reading?reading.positions.map(row=>({label:row.label,title:`${row.name}${row.dirLabel?' '+row.dirLabel:''}`,text:row.text}))
  :codes.map((code,i)=>{
   const card=MINGRI_DECK.find(item=>item.code===code);
   return {label:MINGRI_POSITIONS[i],title:`${card?.name??''} ${picks[i].reversed?t('mingriTarot.reversed'):t('mingriTarot.upright')}`,text:''};
  });
 return <div className={tarot.result}>
  {reading?<div className={tarot.verdict}><small>{t('mingriTarot.verdictLabel',{category:categoryLabel})}</small><p>{reading.verdict}</p></div>
   :failed?<div className={tarot.verdict}><small>{t('mingriTarot.fallbackLabel')}</small><p>{t('mingriTarot.fallbackBody')}</p></div>:null}
  <section className={tarot.section}>
   <h3 className={tarot.sectionTitle}>{t('mingriTarot.positionsTitle')}</h3>
   <YeoniSay domain="mingriTarot" sectionKey="positions" />
   <ol className={tarot.positions}>{rows.map((row,i)=><li key={codes[i]} className={tarot.position}><CardImage code={codes[i]} reversed={picks[i].reversed} alt=""/><p className={tarot.body}><span className={tarot.positionLabel}>{row.label}</span><span className={tarot.positionName}>{row.title}</span>{row.text}</p></li>)}</ol>
  </section>
  {reading&&outcome?<>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('mingriTarot.energyTitle')}</h3><YeoniSay domain="mingriTarot" sectionKey="energy" /><dl className={tarot.energy}>{reading.energy.map(row=><div key={row.label}><dt>{row.label}</dt><dd><b>{row.head}</b>{row.body}</dd></div>)}</dl></section>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('mingriTarot.betweenTitle')}</h3><p className={tarot.body}>{reading.between}</p></section>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('mingriTarot.sipsinTitle')}</h3><YeoniSay domain="mingriTarot" sectionKey="sipsin" /><p className={tarot.body}>{outcome.sipsin}</p></section>
   <section className={tarot.section}><h3 className={tarot.sectionTitle}>{t('mingriTarot.synthesisTitle',{category:categoryLabel})}</h3><YeoniSay domain="mingriTarot" sectionKey="synthesis" /><div className={tarot.synth}>
    <div><h4>{t('mingriTarot.flowLabel')}</h4><p className={tarot.body}>{reading.synthesis.flow}</p></div>
    <div><h4>{t('mingriTarot.cautionLabel')}</h4><p className={tarot.body}>{reading.synthesis.caution}</p></div>
    <div className={tarot.action}><h4>{t('mingriTarot.actionLabel')}</h4><p className={tarot.body}>{reading.synthesis.action}</p></div>
   </div></section>
   <div className={tarot.close}><p>“{reading.close}”</p><small>{t('mingriTarot.signature')}</small></div>
  </>:null}
  <div className={tarot.paid}>
   <b>{t('mingriTarot.paidTitle')}</b>
   <p>{t('mingriTarot.paidBody')}</p>
   <a className={tarot.paidLink} href="/fortune-tea-house/">{t('mingriTarot.paidLink')}</a>
  </div>
  <div className={tarot.actions}>
   <button type="button" className={tarot.actionButton} onClick={share}>{t('mingriTarot.share')}</button>
   <button type="button" className={tarot.actionButton} onClick={again}>{t('mingriTarot.again')}</button>
  </div>
  {shareNote?<p className={tarot.note} role="status">{shareNote}</p>:null}
  <p className={styles.shellLink}><a href={MINGRI_SHELL_HREF}>{t('mingriTarot.oneCardLink')}</a></p>
 </div>;
}
