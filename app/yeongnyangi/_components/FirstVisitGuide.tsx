'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {ArrowRight,X} from 'lucide-react';
import ProfilePicker from './ProfilePicker';
import {useProfiles} from '../_lib/use-profiles';
import {useFirstVisit} from '../_lib/use-first-visit';
import {loginForCurrentPage} from '../_lib/api';
import {firstVisitEvent,firstVisitHome,firstVisitOverlayBusy,firstVisitLogin,writeFirstVisit,readFirstVisit,readYeongnyangiGuideHidden,hideYeongnyangiGuide,clearYeongnyangiGuideHidden,type FirstVisitState} from '@/js/first-visit-state.mjs';
import styles from './first-visit.module.css';
const scenes=[
 {label:'프로필',title:'먼저, 너를 알려줘.',speech:'사주를 보려면 태어난 때가 필요해. 프로필을 골라주면 네 이야기를 읽을 준비를 할게. 타로처럼 출생 정보를 쓰지 않는 상담은 질문부터 골라도 돼.'},
 {label:'고민',title:'마음에 남은 고민을 들려줘.',speech:'추천 질문에서 골라도 좋고, 네 말로 적어도 좋아. 지금 어떤 상황인지, 무엇이 가장 궁금한지 하나씩 알려줘. 내가 함께 정리해 줄게.'},
 {label:'상담 선택',title:'처음에는 가볍게, 한 가지 고민부터.',speech:'처음이라면 현재 고민 하나를 살펴보는 고등어 상담부터 알아봐. 질문에 필요한 내용과 가격을 먼저 보여줄게. 더 긴 시기나 여러 고민을 깊게 보고 싶을 때 다음 상담을 골라도 늦지 않아.'}
];
function GuideArt({step=0}:{step?:number}){
 return <span className={styles.art} aria-hidden="true"><Image src="/images/first-visit/yeongnyangi-tutorial-v1.webp" alt="" width={1440} height={480} style={{left:`-${step*100}%`}}/></span>;
}
export default function FirstVisitGuide(){
 const {state,scope}=useFirstVisit();
 const profiles=useProfiles();
 const [scene,setScene]=useState(0);
 const [hidden,setHidden]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),panel=useRef<HTMLElement>(null),replay=useRef<HTMLButtonElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null);
 const beforeOffer=useRef<FirstVisitState>({status:'new',step:0});
 const selected=profiles.profiles.find(p=>String(p.profileId||p.id)===profiles.profileId);
 function close(){dialog.current?.close();returnFocus.current?.focus({preventScroll:true});}
 function dismiss(){hideYeongnyangiGuide(365);setHidden(true);writeFirstVisit('yeongnyangi','dismissed');firstVisitEvent('yeongnyangi','skip');close();}
 function hideToday(){const previous=beforeOffer.current;hideYeongnyangiGuide();setHidden(true);writeFirstVisit('yeongnyangi',previous.status==='offered'?'new':previous.status,previous.step);firstVisitEvent('yeongnyangi','skip');close();}
 function show(){
  const el=dialog.current;if(!el||el.open)return;
  returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:replay.current;
  beforeOffer.current=readFirstVisit('yeongnyangi');
  writeFirstVisit('yeongnyangi','offered');
  el.showModal();firstVisitEvent('yeongnyangi','view');
 }
 useEffect(()=>{
  const previouslyClosed=state?.status==='dismissed'||(scope!=='guest'&&readFirstVisit('yeongnyangi','guest').status==='dismissed');
  if(previouslyClosed&&!readYeongnyangiGuideHidden())hideYeongnyangiGuide(365);
  setHidden(readYeongnyangiGuideHidden()||state?.status==='dismissed');
 },[state?.status,scope]);
 useEffect(()=>{
  if(!state||state.status!=='new'||profiles.loading||profiles.error||!firstVisitHome(window.location,'yeongnyangi'))return;
  let cancelled=false;
  const offer=()=>{if(!cancelled&&!readYeongnyangiGuideHidden()&&readFirstVisit('yeongnyangi').status==='new'&&!firstVisitOverlayBusy(document))show();};
  const observer=new MutationObserver(offer);
  const timer=setTimeout(()=>{offer();observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class','hidden','aria-hidden']});},1400);
  return()=>{cancelled=true;clearTimeout(timer);observer.disconnect();};
 // show uses current DOM refs; state changes dispose the pending offer.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[state?.status,scope,profiles.loading,profiles.error]);
 useEffect(()=>{dialog.current?.close();},[scope]);
 useEffect(()=>{if(state?.status==='active')setScene(Math.min(2,Math.max(0,state.step-1)));},[state?.status,state?.step]);
 useEffect(()=>{
  if(state?.status==='active'&&state.step===1&&!profiles.loading&&!profiles.error&&!profiles.guest&&selected){
   writeFirstVisit('yeongnyangi','active',2);firstVisitEvent('yeongnyangi','step',2);
  }
 },[state,profiles.loading,profiles.error,profiles.guest,selected]);
 function start(){
  clearYeongnyangiGuideHidden();setHidden(false);
  writeFirstVisit('yeongnyangi','active',1);firstVisitEvent('yeongnyangi','start',1);
  requestAnimationFrame(()=>{dialog.current?.querySelector<HTMLElement>('input,select,a')?.focus();});
 }
 const active=state?.status==='active'&&!hidden;
 return <section className={styles.guide} aria-label="처음 이용 안내" ref={panel} tabIndex={-1}>
  <div className={styles.bar}><button ref={replay} type="button" onClick={show} aria-label="영냥이 이용 안내 열기">이용 방법</button></div>
  <dialog ref={dialog} className={styles.welcome} aria-labelledby="yn-first-title" aria-describedby="yn-first-description" onCancel={event=>{event.preventDefault();dismiss();}}>
   <button className={styles.close} type="button" aria-label="첫 이용 안내 닫기" onClick={dismiss}><X size={20}/></button>
   <h2 id="yn-first-title">영냥이가 알려줄게</h2>
   <p id="yn-first-description">어떤 이야기를 받을지, 가격은 얼마인지 먼저 보여줄게. 천천히 골라도 괜찮아.</p>
  <div className={styles.story}>
   <nav className={styles.sceneNav} aria-label="그림으로 보는 이용 순서">{scenes.map((item,index)=><button type="button" key={item.label} aria-pressed={scene===index} onClick={()=>setScene(index)}><span>{index+1}</span>{item.label}</button>)}</nav>
   <div className={styles.scene}>
    <GuideArt step={scene}/>
    <div className={styles.speech} aria-live="polite"><span className={styles.speaker}>영냥이가 알려줄게</span><h3>{scenes[scene].title}</h3><p>{scenes[scene].speech}</p><button type="button" className={styles.nextScene} onClick={()=>setScene((scene+1)%scenes.length)}>{scene===2?'처음부터 살펴보기':'다음 이야기'} <ArrowRight size={16}/></button></div>
   </div>
  </div>

  {active&&<div className={styles.body}>
   <ol className={styles.steps} aria-label="상담 준비 순서"><li aria-current={state.step===1?'step':undefined}>1. 프로필</li><li aria-current={state.step>=2?'step':undefined}>2. 고민</li><li>3. 구성·가격</li></ol>
   <h2>{selected?'좋아, 프로필이 준비됐어. 어떤 고민이 있어?':'먼저, 누구의 이야기를 살펴볼까?'}</h2>
   <p>저장된 프로필이 있으면 골라줘. 없으면 하나 만들어보자. 출생 정보가 필요 없는 타로는 바로 질문을 골라도 괜찮아.</p>
   <ProfilePicker state={profiles} locale="ko" showPolicyNote={false} onLogin={()=>{firstVisitLogin('yeongnyangi');loginForCurrentPage();}}/>
   <p className={styles.note}>프로필을 만들고 관리하는 건 무료야. 상담 이용 조건은 다음 단계에서 함께 확인하자.</p>
   <a className={styles.primary} href="#questions" onClick={()=>{writeFirstVisit('yeongnyangi','active',2);firstVisitEvent('yeongnyangi','step',2);close();}}>고민 고르기 <ArrowRight size={18}/></a>
   <p className={styles.note}>고민을 고르면 어떤 상담을 받을지, 가격은 얼마인지 먼저 보여줄게. 지금 결제되는 건 아니니 차분히 살펴봐.</p>
   <a href="/yeongnyangi/room/#daily">출석 운세 이용 방법 보기</a>
   <p className={styles.note}>출석 운세에는 모아둔 멸치가 필요해. 이용 방법부터 보고 골라줘.</p>
   <button className={styles.textButton} type="button" onClick={dismiss}>안내 그만 보기</button>
  </div>}

   {!active&&<button className={styles.primary} type="button" onClick={start}>상담 준비하기 <ArrowRight size={18}/></button>}
   <button className={styles.textButton} type="button" onClick={dismiss}>나중에 할게요</button>
   <button className={styles.textButton} type="button" onClick={hideToday}>하루 동안 보지 않기</button>
  </dialog>
 </section>;
}
