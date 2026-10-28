"use client";
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {hatHouses,type HatResult} from '@/lib/yeongnyangi/hat-houses';
import {hatHouseDialogue,hatPrologue} from '@/lib/yeongnyangi/hat-prologue';
import HatHouseEmblem from './HatHouseEmblem';
import styles from './hat-prologue.module.css';

export default function HatPrologue({result,error,onFinish,onRetry}:{result:HatResult|null;error:string;onFinish:()=>void;onRetry:()=>void}){
 const [step,setStep]=useState(0),[shown,setShown]=useState(0),[skip,setSkip]=useState(false),[reduce,setReduce]=useState(false);
 const dialogue=useRef<HTMLButtonElement>(null);
 const house=result?hatHouses.find(h=>h.id===result.houseId):undefined;
 const beats=[...hatPrologue,...(house?[
  {scene:'배정',speaker:'모자',text:hatHouseDialogue[house.id]},
  {scene:'배정',speaker:'모자',text:`네 자리는… ${house.name}!`},
  {scene:'배정',speaker:'모자',text:'문을 열어 두마. 이곳에서 어떤 이야기를 쓸지는 네 몫이다. 아, 나갈 때 모자는 두고 가거라. 아직 은퇴할 생각은 없으니.'},
 ]:[])];
 const beat=beats[step],waiting=skip||!beat,reveal=Boolean(house&&step>=hatPrologue.length+1);
 const text=waiting?'여섯 지도를 한 장씩 살피고 있단다. 성급한 배정은 내 취향이 아니지. 잠시만 기다려 주겠느냐?':beat.text;
 const complete=reduce||shown>=text.length;
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduce(media.matches);
  update();media.addEventListener('change',update);dialogue.current?.focus({preventScroll:true});
  return()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  setShown(0);
  if(reduce||waiting||error)return;
  let count=0;
  const timer=window.setInterval(()=>{count++;setShown(value=>Math.max(value,count));if(count>=text.length)window.clearInterval(timer);},28);
  return()=>window.clearInterval(timer);
 },[text,reduce,waiting,error]);
 useEffect(()=>{if(skip&&house&&!error)onFinish();},[skip,house,error,onFinish]);
 function advance(){
  if(waiting||error)return;
  if(!complete){setShown(text.length);return;}
  if(step===hatPrologue.length+2){onFinish();return;}
  setShown(0);setStep(value=>value+1);
 }
 return <section className={styles.story} aria-label="모자의 배정 이야기" data-reveal={reveal} data-speaking={!complete&&!waiting&&!error}>
  <div className={styles.visual}>
   <svg className={styles.astrolabe} viewBox="0 0 500 400" aria-hidden="true"><ellipse cx="250" cy="220" rx="188" ry="166"/><ellipse cx="250" cy="220" rx="174" ry="152" strokeDasharray="1 9"/><path d="M250 38v27m0 310v-20M45 220h28m354 0h28M105 98l22 20m246 207 22 20M105 345l22-20m246-207 22-20"/><path d="m250 14 8 14-8 14-8-14Z"/></svg>
   <div key={step} className={styles.hatActor}><Image src="/assets/yeongnyangi/hat/spirit-hat-v2.png" width={1280} height={1280} sizes="(max-width: 600px) 80vw, 420px" alt="금빛 달 자수가 놓인 남색 벨벳 모자. 천의 주름 사이 눈과 입이 장난스럽게 미소 짓고 있어요."/></div>
   <div className={styles.whisper} aria-hidden="true"><i/><i/><i/><i/><i/></div>
   <p className={styles.scene}>{error?'잠시 숨을 고르는 모자':reveal?'달빛 아래, 네 자리를 부르다':waiting?'오래된 달의 기억을 펼치는 중':'모자의 목소리에 귀를 기울여 봐요'}</p>
   {reveal&&<div className={styles.sparkles} aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{left:`${10+i*10}%`,animationDelay:`${i*35}ms`}}/>)}</div>}
  </div>
  <div className={styles.doors} aria-label="여섯 기숙사의 문">{hatHouses.map(h=><div className={styles.door} key={h.id} data-lit={reveal&&house?.id===h.id}><HatHouseEmblem id={h.id}/><strong data-house-name>{h.name}</strong></div>)}</div>
  <div className={styles.dialogueWrap}>
   <button ref={dialogue} type="button" className={styles.dialogue} onClick={advance} aria-disabled={waiting||Boolean(error)} aria-label={error?'배정을 마치지 못했어요':waiting?'배정 결과를 기다리는 중':`${beat.speaker}: ${text}. ${complete?'다음 대사':'대사 전체 보기'}`}>
    <span className={styles.speaker}>영냥이의 모자<span>{reveal?'기숙사를 선포하며':'달의 기억을 품은 안내자'}</span></span>
    <span className={styles.body} aria-hidden="true">{error?'이런, 지도 한 장이 말을 듣지 않는군. 잠깐 쉬었다가 다시 펼쳐 보자꾸나.':waiting?text:complete?text:text.slice(0,shown)}</span>
    <span className={styles.next} aria-hidden="true">{error?'아래에서 다시 시도해 주세요':waiting?'잠시 기다려 주세요':!complete?'누르면 문장 완성':step===hatPrologue.length+2?'내 기숙사 보기':'다음 대사'}<ArrowRight size={15}/></span>
   </button>
   <p className={styles.srOnly} role="status" aria-atomic="true">{error?'배정을 마치지 못했어요. 다시 시도해 주세요.':waiting?'배정 결과를 기다리고 있어요.':`${beat.speaker}: ${text}`}</p>
   <div className={styles.controls}><span>{waiting?'결과가 준비되면 이어져요':`${beat.scene} · 모자의 배정 이야기`}</span>{error?<button type="button" onClick={onRetry}>배정 다시 시도하기</button>:<button type="button" disabled={skip} onClick={()=>setSkip(true)}>{skip?'결과 기다리는 중':'이야기 건너뛰기'}</button>}</div>
  </div>
 </section>;
}
