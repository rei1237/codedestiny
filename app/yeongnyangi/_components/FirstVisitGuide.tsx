'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {ArrowRight,X} from 'lucide-react';
import ProfilePicker from './ProfilePicker';
import {useProfiles} from '../_lib/use-profiles';
import {useFirstVisit} from '../_lib/use-first-visit';
import {loginForCurrentPage} from '../_lib/api';
import {firstVisitEvent,firstVisitHome,firstVisitOverlayBusy,firstVisitLogin,writeFirstVisit,readFirstVisit} from '@/js/first-visit-state.mjs';
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
 const dialog=useRef<HTMLDialogElement>(null),panel=useRef<HTMLElement>(null),replay=useRef<HTMLButtonElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null);
 const selected=profiles.profiles.find(p=>String(p.profileId||p.id)===profiles.profileId);
 function close(){dialog.current?.close();returnFocus.current?.focus({preventScroll:true});}
 function dismiss(){writeFirstVisit('yeongnyangi','dismissed');firstVisitEvent('yeongnyangi','skip');close();}
 function show(){
  const el=dialog.current;if(!el||el.open)return;
  returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:replay.current;
  writeFirstVisit('yeongnyangi','offered');
  el.showModal();firstVisitEvent('yeongnyangi','view');
 }
 useEffect(()=>{
  if(!state||state.status!=='new'||profiles.loading||profiles.error||!firstVisitHome(window.location,'yeongnyangi'))return;
  let cancelled=false;
  const offer=()=>{if(!cancelled&&readFirstVisit('yeongnyangi').status==='new'&&!firstVisitOverlayBusy(document))show();};
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
  close();writeFirstVisit('yeongnyangi','active',1);firstVisitEvent('yeongnyangi','start',1);
  requestAnimationFrame(()=>{panel.current?.focus();panel.current?.scrollIntoView({block:'center'});});
 }
 const active=state?.status==='active';
 return <section className={styles.guide} aria-label="처음 이용 안내" ref={panel} tabIndex={-1}>
  <div className={styles.bar}><span>처음이야?</span><button ref={replay} type="button" onClick={show}>이용 방법 보기</button></div>
  <details className={styles.howTo}>
   <summary>어떻게 이용하면 좋을까? 내가 알려줄게.</summary>
   <div>
    <h3>먼저, 누구의 이야기인지 알려줘.</h3>
    <p>사주처럼 태어난 때를 살펴보는 상담은 프로필이 필요해. 이름과 생년월일, 양력·음력을 확인해 줘. 시간은 모르면 모른다고 해도 괜찮아. 다만 시간을 꼭 알아야 하는 상담은 준비 화면에서 따로 알려줄게.</p>
    <p>이미 만든 프로필이 있으면 다시 적지 말고 골라줘. 출생 정보를 쓰지 않는 타로라면 질문부터 시작해도 돼.</p>
    <h3>질문은 하나씩, 상황은 조금 구체적으로.</h3>
    <p>막연해도 괜찮아. 추천 질문에서 가까운 고민을 골라도 되고, 네 말로 직접 적어도 돼. 지금 어떤 상황인지, 무엇을 결정하거나 이해하고 싶은지 함께 알려주면 좋아.</p>
    <blockquote>“이직해도 될까?”보다 “지금 회사에서 역할이 줄어 고민이야. 당분간 경험을 쌓을지, 이직을 준비할지 판단할 기준이 궁금해.”처럼 적어봐.</blockquote>
    <h3>깊이를 고르기 전에, 무엇을 받는지 봐.</h3>
    <p>질문을 고르면 상담 방식과 살펴볼 범위, 결과 구성과 가격을 확인할 수 있어. 생선 이름만 보고 고르지 말고 네 고민에 필요한 내용인지 읽어봐. 준비 화면을 보는 것만으로 결제되지는 않아.</p>
    <p>가볍게 둘러보고 싶다면 영냥이의 방에 있는 출석 운세도 있어. 출석으로 모은 멸치가 필요하니 그곳의 이용 조건부터 확인해 줘.</p>
    <h3>답만 읽지 말고, 근거와 다음 행동도 챙겨.</h3>
    <p>먼저 요약을 읽고, 왜 그렇게 해석했는지 살펴봐. 마지막에는 오늘 해볼 행동 하나를 골라보자. 운세가 네 결정을 대신하는 건 아니야. 네 상황을 정리하는 단서로 써줘.</p>
    <p>이미 받은 상담은 ‘내 상담’에서 다시 읽을 수 있어. 새 상담을 시작하기 전에 전에 받은 이야기부터 펼쳐봐도 좋아.</p>
   </div>
  </details>
  {active&&<div className={styles.body}>
   <ol className={styles.steps} aria-label="상담 준비 순서"><li aria-current={state.step===1?'step':undefined}>1. 프로필</li><li aria-current={state.step>=2?'step':undefined}>2. 고민</li><li>3. 구성·가격</li></ol>
   <h2>{selected?'좋아, 프로필이 준비됐어. 어떤 고민이 있어?':'먼저, 누구의 이야기를 살펴볼까?'}</h2>
   <p>저장된 프로필이 있으면 골라줘. 없으면 하나 만들어보자. 출생 정보가 필요 없는 타로는 바로 질문을 골라도 괜찮아.</p>
   <ProfilePicker state={profiles} locale="ko" showPolicyNote={false} onLogin={()=>{firstVisitLogin('yeongnyangi');loginForCurrentPage();}}/>
   <p className={styles.note}>프로필을 만들고 관리하는 건 무료야. 상담 이용 조건은 다음 단계에서 함께 확인하자.</p>
   <a className={styles.primary} href="#questions" onClick={()=>{writeFirstVisit('yeongnyangi','active',2);firstVisitEvent('yeongnyangi','step',2);}}>고민 고르기 <ArrowRight size={18}/></a>
   <p className={styles.note}>고민을 고르면 어떤 상담을 받을지, 가격은 얼마인지 먼저 보여줄게. 지금 결제되는 건 아니니 차분히 살펴봐.</p>
   <a href="/yeongnyangi/room/#daily">출석 운세 이용 방법 보기</a>
   <p className={styles.note}>출석 운세에는 모아둔 멸치가 필요해. 이용 방법부터 보고 골라줘.</p>
   <button className={styles.textButton} type="button" onClick={dismiss}>안내 그만 보기</button>
  </div>}
  <dialog ref={dialog} className={styles.welcome} aria-labelledby="yn-first-title" aria-describedby="yn-first-description" onCancel={event=>{event.preventDefault();dismiss();}}>
   <button className={styles.close} type="button" aria-label="첫 이용 안내 닫기" onClick={dismiss}><X size={20}/></button>
   <h2 id="yn-first-title">처음 왔어?<br/>내가 하나씩 알려줄게.</h2>
   <p id="yn-first-description">어떤 이야기를 받을지, 가격은 얼마인지 먼저 보여줄게. 천천히 골라도 괜찮아.</p>
   <div className={styles.story}>
    <nav className={styles.sceneNav} aria-label="그림으로 보는 이용 순서">{scenes.map((item,index)=><button type="button" key={item.label} aria-pressed={scene===index} onClick={()=>setScene(index)}><span>{index+1}</span>{item.label}</button>)}</nav>
    <div className={styles.scene}>
     <GuideArt step={scene}/>
     <div className={styles.speech} aria-live="polite"><span className={styles.speaker}>영냥이가 알려줄게</span><h3>{scenes[scene].title}</h3><p>{scenes[scene].speech}</p><button type="button" className={styles.nextScene} onClick={()=>setScene((scene+1)%scenes.length)}>{scene===2?'처음부터 살펴보기':'다음 이야기'} <ArrowRight size={16}/></button></div>
    </div>
   </div>
   <button className={styles.primary} type="button" onClick={start}>상담 준비하기 <ArrowRight size={18}/></button>
   <button className={styles.textButton} type="button" onClick={dismiss}>나중에 할게요</button>
  </dialog>
 </section>;
}

