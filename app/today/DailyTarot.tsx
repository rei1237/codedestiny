"use client";

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Sunrise} from 'lucide-react';
import Image from 'next/image';
import {fortuneTeaHouseAssets} from '@/src/features/fortune-tea-house/data/assets';

import {FreeQuestionNext} from '../components/QuestionJourney';
import {trackEvent} from '@/lib/analytics';
import {DAILY_MEANINGS,DAILY_POSITIONS,DAILY_TAROT_KEY,kstDay,newDailyReading,restoreDailyReading,pickDailyCard,revealDailyCard,sharedDailyCards} from '@/lib/tarot/daily-three.mjs';
import styles from './daily-tarot.module.css';
import PublicInsightCard from '@/components/fortune/PublicInsightCard';

export interface DailyTarotCard {id:number;name:string;code:string;thumb:string;image:string;fallback:string}
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
interface Mote {x:number;y:number;vx:number;vy:number;s:number;life:number;max:number}

const GATHER_MS=1000,TURN_MS=1300,SETTLE_MS=900,PLACED_MS=800,WEAVE_MS=1500,SCROLL_MS=500;
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;

// 찻집 축소본 → 찻집 원본 → 공개 덱 순서로 넘어간다. R2가 막혀도 카드 그림은 나온다.
function CardImage({card,alt}:{card:DailyTarotCard;alt:string}){
 const sources=[card.thumb,card.image,card.fallback].filter(Boolean);
 const [index,setIndex]=useState(0);
 // eslint-disable-next-line @next/next/no-img-element
 return <img src={sources[index]} alt={alt} width={480} height={720} decoding="async" onError={()=>setIndex(current=>current<sources.length-1?current+1:current)}/>;
}

export default function DailyTarot({cards}:{cards:DailyTarotCard[]}) {
 const [reading,setReading]=useState<Reading|null>(null);
 const [today,setToday]=useState(''),[ready,setReady]=useState(false),[storageOk,setStorageOk]=useState(true);
 const [shared,setShared]=useState<number[]|null>(null),[notice,setNotice]=useState('');
 const [settling,setSettling]=useState(false),[gathering,setGathering]=useState<number|null>(null),[turning,setTurning]=useState<number|null>(null);
 const [placed,setPlaced]=useState(''),[weaving,setWeaving]=useState(false),[arriving,setArriving]=useState(-1);
 const [played,setPlayed]=useState(false),[resultShown,setResultShown]=useState(false);
 const [master,setMaster]=useState<MasterReading|null>(null),[masterFailed,setMasterFailed]=useState(false);
 const initialized=useRef(false),interacted=useRef(false),timers=useRef<number[]>([]);
 const stage=useRef<HTMLDivElement>(null),fan=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),result=useRef<HTMLDivElement>(null);
 const slotButtons=useRef<(HTMLButtonElement|null)[]>([]);
 const motes=useRef<Mote[]>([]),motesFrame=useRef(0);
 const emit=(name:string,params:Record<string,unknown>={})=>trackEvent(name,{service:'yeoni_daily',...params});
 useEffect(()=>{
  if(initialized.current)return;initialized.current=true;
  const date=kstDay();setToday(date);
  const params=new URLSearchParams(window.location.search);
  const incoming=sharedDailyCards(params.get('daily_cards'));
  setShared(incoming);
  if(incoming)emit('daily_tarot_share_receive');
  try{
   const saved=restoreDailyReading(localStorage.getItem(DAILY_TAROT_KEY));
   if(saved){
    setReading(saved);
    if(saved.date===date)emit('daily_tarot_reopen',{complete:saved.revealed===3});
    else if(saved.date<date)emit('daily_tarot_return',{days_since:Math.round((Date.parse(date)-Date.parse(saved.date))/86400000)});
   }
  }catch{setStorageOk(false);}
  setReady(true);
 },[]);
 useEffect(()=>{
  const update=()=>setToday(kstDay());
  const timer=window.setInterval(update,60000);
  window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 useEffect(()=>()=>{timers.current.forEach(window.clearTimeout);window.cancelAnimationFrame(motesFrame.current);},[]);

 const selected=reading?.picks.map(slot=>reading.deck[slot])||[];
 const picks=reading?.picks.length??0,revealed=reading?.revealed??0;
 const busy=settling||gathering!==null||turning!==null||Boolean(placed)||weaving;
 const armed=picks===3&&!busy&&revealed<3?revealed:-1;
 const showResult=revealed===3&&(!played||resultShown);
 const fanOpen=Boolean(reading)&&picks<3;
 const selectedKey=selected.join(',');

 // 부채꼴: 가운데 카드가 가장 높고, 양옆으로 갈수록 기울며 내려간다.
 useEffect(()=>{
  const box=fan.current;
  if(!fanOpen||!box)return;
  let frame=0;
  const layout=()=>{
   frame=0;
   const center=box.scrollLeft+box.clientWidth/2,width=box.clientWidth;
   for(const button of Array.from(box.children) as HTMLElement[]){
    const distance=(button.offsetLeft+button.offsetWidth/2-center)/width;
    if(Math.abs(distance)>1.2){button.style.transform='';continue;}
    const lift=button.dataset.taken==='true'?-30:0;
    button.style.transform=`translateY(${distance*distance*64+lift}px) rotate(${distance*26}deg)`;
   }
  };
  const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(layout);};
  layout();
  box.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{box.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);if(frame)window.cancelAnimationFrame(frame);};
 },[fanOpen,picks]);
 useEffect(()=>{
  const box=fan.current;
  if(fanOpen&&box)box.scrollTo({left:(box.scrollWidth-box.clientWidth)/2,behavior:'auto'});
 },[fanOpen]);

 // 세 장이 열리면 풀이 엔진을 불러온다. 문구 데이터가 커서 이 시점에만 받는다.
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

 // 키보드로 고른 사람이 다음 카드를 바로 누를 수 있게 포커스를 넘긴다.
 useEffect(()=>{
  if(armed>=0&&interacted.current)slotButtons.current[armed]?.focus({preventScroll:true});
 },[armed]);

 function after(ms:number,run:()=>void){
  timers.current.push(window.setTimeout(run,reducedMotion()?0:ms));
 }
 function resetRitual(){
  timers.current.forEach(window.clearTimeout);timers.current=[];
  setSettling(false);setGathering(null);setTurning(null);setPlaced('');setWeaving(false);setArriving(-1);
  setPlayed(false);setResultShown(false);setMaster(null);setMasterFailed(false);
 }
 function sparkle(target:Element|null|undefined,count:number){
  const layer=canvas.current;
  if(!layer||!target||reducedMotion())return;
  const context=layer.getContext('2d');
  if(!context)return;
  const box=layer.getBoundingClientRect(),from=target.getBoundingClientRect();
  for(let i=0;i<count;i+=1)motes.current.push({
   x:from.left-box.left+Math.random()*from.width,y:from.top-box.top+Math.random()*from.height,
   vx:(Math.random()-.5)*.25,vy:-(.2+Math.random()*.6),s:.6+Math.random()*1.9,life:0,max:80+Math.random()*110,
  });
  if(motesFrame.current)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const draw=()=>{
   const rect=layer.getBoundingClientRect();
   if(layer.width!==Math.round(rect.width*dpr)||layer.height!==Math.round(rect.height*dpr)){
    layer.width=Math.round(rect.width*dpr);layer.height=Math.round(rect.height*dpr);
   }
   context.setTransform(dpr,0,0,dpr,0,0);
   context.clearRect(0,0,rect.width,rect.height);
   motes.current=motes.current.filter(mote=>mote.life<mote.max);
   for(const mote of motes.current){
    mote.life+=1;mote.x+=mote.vx;mote.y+=mote.vy;
    const alpha=Math.sin(Math.PI*mote.life/mote.max);
    context.fillStyle=`rgba(217,164,65,${alpha*.14})`;
    context.beginPath();context.arc(mote.x,mote.y,mote.s*3.6,0,Math.PI*2);context.fill();
    context.fillStyle=`rgba(217,164,65,${alpha*.85})`;
    context.beginPath();context.arc(mote.x,mote.y,mote.s,0,Math.PI*2);context.fill();
   }
   motesFrame.current=motes.current.length?window.requestAnimationFrame(draw):0;
  };
  motesFrame.current=window.requestAnimationFrame(draw);
 }
 function save(next:Reading){
  setReading(next);
  try{localStorage.setItem(DAILY_TAROT_KEY,JSON.stringify(next));}catch{setStorageOk(false);}
 }
 function start(){
  resetRitual();interacted.current=true;
  const date=kstDay();setToday(date);save(newDailyReading(date));setShared(null);setNotice('');
  emit('daily_tarot_start');
  window.requestAnimationFrame(()=>stage.current?.focus());
 }
 function pick(slot:number,button:HTMLElement){
  if(!reading)return;
  const next=pickDailyCard(reading,slot);
  if(next===reading)return;
  interacted.current=true;
  sparkle(button,14);
  setArriving(next.picks.length-1);
  save(next);
  if(next.picks.length===3){
   setSettling(true);
   window.requestAnimationFrame(()=>stage.current?.focus({preventScroll:true}));
   after(SETTLE_MS,()=>setSettling(false));
  }
 }
 function reveal(index:number){
  if(!reading||index!==armed)return;
  interacted.current=true;
  setPlayed(true);setArriving(-1);setGathering(index);
  after(GATHER_MS,()=>{
   const next=revealDailyCard(reading);
   setGathering(null);setTurning(index);save(next);
   sparkle(slotButtons.current[index],46);
   if(next.revealed===3)emit('daily_tarot_complete');
   after(TURN_MS,()=>{
    setTurning(null);
    setPlaced(`${cards[reading.deck[reading.picks[index]]].name}, ${DAILY_POSITIONS[index]}의 자리에 놓였어요.`);
    after(PLACED_MS,()=>{
     setPlaced('');
     if(next.revealed<3)return;
     setWeaving(true);
     after(WEAVE_MS,()=>{
      setWeaving(false);setResultShown(true);
      after(SCROLL_MS,()=>{
       if(reducedMotion())result.current?.focus({preventScroll:true});
       else{result.current?.scrollIntoView({behavior:'smooth',block:'start'});result.current?.focus({preventScroll:true});}
      });
     });
    });
   });
  });
 }

 const message=()=>{
  if(picks<3)return ['마음이 머무는 카드, 세 장을 골라요.','두 번째 카드를 골라 주세요.','마지막 한 장을 골라 주세요.'][picks];
  if(settling)return '세 장이 모두 놓였어요.';
  if(gathering!==null||turning!==null)return '빛이 모이고 있어요…';
  if(placed)return placed;
  if(weaving)return '세 장의 이야기를 잇고 있어요…';
  if(revealed===3)return '세 장을 모두 읽었어요.';
  return DAILY_POSITIONS[revealed]+' 자리의 카드를 눌러 주세요.';
 };
 const stageTheme={'--back':`url(${fortuneTeaHouseAssets.premium.tarotCardBack})`} as CSSProperties;
 const rows=master?.positions??selected.map((id,index)=>({label:DAILY_POSITIONS[index],text:DAILY_MEANINGS[id][index]}));
 const riseIndex=(i:number)=>({'--i':i} as CSSProperties);

 return <section id="daily-tarot" className={styles.experience} aria-labelledby="daily-tarot-title">
  <header className={styles.welcome}>
   <div className={styles.welcomeCopy}><h2 id="daily-tarot-title">오늘을 여는<br/><em>세 장의 마음</em></h2>
    <p>차가 우러나는 동안, 내 마음에도 잠깐 귀 기울여요.</p>
    <p className={styles.note}>연이와 함께 · 운명 찻집 카드 · 하루 한 번</p>
    {!reading&&<button className={styles.primary} disabled={!ready} onClick={start}>오늘의 세 장 펼치기 <ArrowRight size={18}/></button>}
   </div>
   <Image className={styles.heroArt} src="/images/today/yeoni-daily-tea.webp" width={1200} height={800} sizes="(max-width:600px) 100vw, 360px" alt="햇살이 드는 찻집에서 차와 세 장의 타로를 준비한 꽃돼지 연이" loading="lazy"/>
  </header>
  <div className={styles.tableIntro}><ol className={styles.positions} aria-label="세 장이 들려줄 이야기">{DAILY_POSITIONS.map((position,index)=><li key={position}><span>{index+1}</span>{position}</li>)}</ol><p className={styles.explanation}>운명의 찻집 카드로 마음과 흐름, 작은 실천을 읽어요. 사주·숙요·베다·수비학의 계산과는 별개인 타로의 상징 해석입니다.</p></div>
  {shared&&<div className={styles.shared}>
   <h3>친구가 나눈 세 장</h3>
   <p>개인정보나 질문 없이 카드의 상징만 나누었어요.</p>
   <ol>{shared.map((id,index)=><li key={id}><strong>{DAILY_POSITIONS[index]} · {cards[id].name}</strong><p>{DAILY_MEANINGS[id][index]}</p></li>)}</ol>
  </div>}
  {reading&&<>
   <div className={styles.dateRow}><span>{reading.date}의 카드</span><span>{revealed===3?'세 장을 모두 읽었어요':picks+' / 3장 선택'}</span></div>
   {reading.date!==today&&<div className={styles.newDay}><Sunrise size={22}/><p>새로운 하루가 왔어요. 지난 카드를 마저 읽거나 오늘의 세 장을 새로 시작해 보세요.</p><button onClick={start}>오늘 카드 새로 펼치기</button></div>}
   <div ref={stage} tabIndex={-1} className={styles.stage+(picks===3&&!settling?' '+styles.ready:'')} style={stageTheme}>
    <canvas ref={canvas} aria-hidden="true"/>
    <p className={styles.msg} role="status">{message()}</p>
    <div className={styles.slots}>{DAILY_POSITIONS.map((label:string,index:number)=>{
     const id=selected[index],filled=id!==undefined,isRevealed=filled&&index<revealed,settled=isRevealed&&turning!==index;
     const flip=[styles.flip,index===armed&&styles.next,gathering===index&&styles.gather,isRevealed&&styles.turn,turning===index&&styles.turnNow,arriving===index&&styles.arrive].filter(Boolean).join(' ');
     return <div key={label} className={[styles.slot,filled&&styles.filled,settled&&styles.revealed].filter(Boolean).join(' ')}>
      <span className={styles.slotLabel}>{label}</span>
      <button type="button" ref={node=>{slotButtons.current[index]=node;}} className={flip} disabled={index!==armed} onClick={()=>reveal(index)} aria-label={isRevealed?label+': '+cards[id].name:filled?label+' 자리의 카드 펼치기':label+' 자리, 아직 비어 있어요'}>
       <span className={styles.empty}/>
       <span className={styles.bloom}/>
       <span className={styles.after}/>
       <span className={styles.inner}>
        <span className={styles.sideBack}/>
        <span className={styles.sideFace}>{filled&&<CardImage card={cards[id]} alt=""/>}</span>
       </span>
       <span className={styles.ring}/>
      </button>
      <strong className={styles.slotName}>{isRevealed?cards[id].name:''}</strong>
     </div>;
    })}</div>
    {fanOpen&&<div className={styles.fanBox}>
     <div ref={fan} className={styles.fan} role="group" aria-label="오늘의 카드 22장 중 세 장 선택">
      {reading.deck.map((_:number,slot:number)=>{
       const taken=reading.picks.includes(slot);
       return <button key={slot} type="button" data-taken={taken} className={taken?styles.taken:undefined} disabled={taken} tabIndex={taken?-1:undefined} aria-label={slot+1+'번째 카드 고르기'} onClick={event=>pick(slot,event.currentTarget)}/>;
      })}
     </div>
     <p className={styles.fanHint}>옆으로 밀어 보고, 마음이 머무는 카드를 눌러 주세요</p>
    </div>}
   </div>
   {showResult&&<div ref={result} tabIndex={-1} className={styles.result+(played?' '+styles.play:'')}>
    {master&&<div className={styles.verdict} style={riseIndex(0)}><small>오늘 · 세 장을 모두 읽은 결론</small><p>{master.verdict}</p></div>}
    <div style={riseIndex(1)}>
     <h3>자리별 읽기</h3>
     <div className={styles.pos}>{selected.map((id,index)=><div key={id}><CardImage card={cards[id]} alt=""/><p><b>{DAILY_POSITIONS[index]}</b><em>{cards[id].name}</em>{rows[index].text}</p></div>)}</div>
    </div>
    {master&&<>
     <div style={riseIndex(2)}><h3>덱의 기운</h3><dl className={styles.energy}>{master.energy.map(row=><div key={row.label}><dt>{row.label}</dt><dd><b>{row.head}</b>{row.body}</dd></div>)}</dl></div>
     <div style={riseIndex(3)}><h3>카드 사이의 이야기</h3><p>{master.between}</p></div>
     <div style={riseIndex(4)}><h3>오늘 종합</h3><div className={styles.synth}>
      <div><h4>흐름</h4><p>{master.synthesis.flow}</p></div>
      <div><h4>살펴볼 점</h4><p>{master.synthesis.caution}</p></div>
      <div className={styles.act}><h4>오늘 해 볼 한 가지</h4><p>{master.synthesis.action}</p></div>
     </div></div>
     <div className={styles.close} style={riseIndex(5)}><p>{master.close}</p><small>꽃돼지 연이</small></div>
    </>}
    {masterFailed&&<div className={styles.close} style={riseIndex(2)}>
     <p>“세 장의 답을 전부 해내려 하지 않아도 돼요. 오늘 마음에 남은 한 가지면 충분해요.”</p><small>꽃돼지 연이</small>
     <p className={styles.note} role="status">종합 풀이를 불러오지 못했어요. 페이지를 새로 열면 다시 읽을 수 있어요.</p>
    </div>}
    <div className={styles.cta} style={riseIndex(6)}>
     <b>내 질문으로 더 깊이 듣고 싶다면</b>
     <p>여기까지는 카드의 구조를 읽은 무료 풀이예요. 찻집에서 질문을 적고 세 장을 새로 뽑으면, 연이가 내 상황에 맞춰 길게 풀어 드려요. 추가 질문 1회가 포함돼요.</p>
     <a href="/fortune-tea-house/">연이의 찻집 상담 · 5,000원</a>
    </div>
   </div>}
   {showResult&&<footer className={styles.ending}>
    <PublicInsightCard brand="daily" source="daily" day={reading.date} choices={selected.map((id,index)=>({id:String(id),label:DAILY_POSITIONS[index]+' · '+cards[id].name,text:DAILY_MEANINGS[id][index]}))}/>
    <p className={styles.note}>오늘은 이 카드를 다시 읽을 수 있어요. 내일은 새로운 세 장이 기다려요.</p>
    <FreeQuestionNext category="tarot" source="daily_tarot_result"/>
   </footer>}
  </>}
  {!storageOk&&<p role="status" className={styles.note}>이 브라우저에서 저장할 수 없어 이번 방문 동안만 결과를 볼 수 있어요.</p>}
  {notice&&<p role="status" className={styles.note}>{notice}</p>}
 </section>;
}
