"use client";
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {hatHouses,hatImage,type HatResult} from '@/lib/yeongnyangi/hat-houses';
import {hatHouseDialogue,hatPrologue} from '@/lib/yeongnyangi/hat-prologue';
import styles from './hat-prologue.module.css';

export default function HatPrologue({result,error,onFinish,onRetry}:{result:HatResult|null;error:string;onFinish:()=>void;onRetry:()=>void}){
 const [step,setStep]=useState(0),[shown,setShown]=useState(0),[skip,setSkip]=useState(false),[reduce,setReduce]=useState(false);
 const dialogue=useRef<HTMLButtonElement>(null);
 const house=result?hatHouses.find(h=>h.id===result.houseId):undefined;
 const beats=[...hatPrologue,...(house?[
  {scene:'배정',speaker:'모자',text:hatHouseDialogue[house.id]},
  {scene:'배정',speaker:'모자',text:`네 자리는… ${house.name}!`},
  {scene:'배정',speaker:'영냥이',text:'찾았네. 들어가 봐. 네 이야기는 이제 시작이야.'},
 ]:[])];
 const beat=beats[step],waiting=skip||!beat,reveal=Boolean(house&&step>=hatPrologue.length+1);
 const text=waiting?'여섯 개의 지도를 펼쳐 보고 있어요. 배정이 준비되면 이야기가 이어져요.':beat.text;
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
 return <section className={styles.story} aria-label="모자의 배정 이야기" data-reveal={reveal}>
  <div className={styles.visual}>
   <Image key={reveal?house?.id:'invitation'} src={hatImage(reveal&&house?house.id:'invitation')} width={1200} height={800} sizes="(max-width: 700px) 100vw, 900px" alt={reveal&&house?`${house.name}의 문이 밝아졌어요.`:'여섯 기숙사의 문 앞에서 기다리는 영냥이'}/>
   <div className={styles.scene}>{error?'잠시 멈춘 배정':waiting?'지도를 살피는 중':beat.scene}</div>
   <div className={styles.doors} aria-label="여섯 기숙사의 문">{hatHouses.map(h=><span key={h.id} data-lit={reveal&&house?.id===h.id}>{h.name}</span>)}</div>
   {reveal&&<div className={styles.sparkles} aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{left:`${10+i*10}%`,animationDelay:`${i*35}ms`}}/>)}</div>}
   <svg className={styles.hat} viewBox="0 0 160 120" aria-hidden="true"><path d="M40 91 69 14Q83 42 115 47L105 91Z"/><ellipse cx="80" cy="94" rx="64" ry="17"/><path className={styles.moon} d="M79 49a14 14 0 1 0 15 20A15 15 0 0 1 79 49Z"/></svg>
  </div>
  <div className={styles.dialogueWrap}>
   <button ref={dialogue} type="button" className={styles.dialogue} onClick={advance} aria-disabled={waiting||Boolean(error)} aria-label={error?'배정을 마치지 못했어요':waiting?'배정 결과를 기다리는 중':`${beat.speaker}: ${text}. ${complete?'다음 대사':'대사 전체 보기'}`}>
    <span className={styles.speaker}>{error?'영냥이':waiting?'모자':beat.speaker}</span>
    <span className={styles.body} aria-hidden="true">{error?'모자가 지도를 끝까지 읽지 못했어. 잠깐 쉬었다가 다시 펼쳐 보자.':waiting?text:complete?text:text.slice(0,shown)}</span>
    <span className={styles.next} aria-hidden="true">{error?'아래에서 다시 시도해 주세요':waiting?'잠시 기다려 주세요':!complete?'누르면 문장 완성':step===hatPrologue.length+2?'내 기숙사 보기':'다음 대사'}<ArrowRight size={15}/></span>
   </button>
   <p className={styles.srOnly} role="status" aria-atomic="true">{error?'배정을 마치지 못했어요. 다시 시도해 주세요.':waiting?'배정 결과를 기다리고 있어요.':`${beat.speaker}: ${text}`}</p>
   <div className={styles.controls}><span>{waiting?'결과가 준비되면 이어져요':`${beat.scene} · 모자의 배정 이야기`}</span>{error?<button type="button" onClick={onRetry}>배정 다시 시도하기</button>:<button type="button" disabled={skip} onClick={()=>setSkip(true)}>{skip?'결과 기다리는 중':'이야기 건너뛰기'}</button>}</div>
  </div>
 </section>;
}
