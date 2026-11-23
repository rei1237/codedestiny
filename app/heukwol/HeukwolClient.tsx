'use client';
import MasterRoomScene from '@/app/components/expert-consulting/MasterRoomScene';
import FateWarningEpisode from './FateWarningEpisode';
import Image from 'next/image';
import {useCallback,useEffect,useRef,useState} from 'react';
import ProfileForm from '@/app/yeongnyangi/_components/ProfileForm';
import SavedBirthProfilePicker from '@/app/components/SavedBirthProfilePicker';
import {authFetch} from '@/app/_lib/auth-client';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {runPaidAccessGate} from '@/app/_lib/billing-client';
import checkoutEntry from '@/js/core/checkout-entry.js';
import HeukwolResult from './HeukwolResult';
import type {HeukwolState} from './types';
import styles from './heukwol.module.css';

const FEATURE='heukwol-warning-consultation';
type Input={profileId:string;year:number;question:string;requestId:string};
type Pricing={cost:number;amountKRW:number;displayPrice:string};
type ApiError=Error&{code?:string;status?:number};
// 생성이 종결 실패로 닫히면 서버가 결제·이용권을 자동 환불한다. 진행 단계마다 안내를 나눈다.
const REFUND_NOTICE={
 refunded:'상담서를 완성하지 못해 결제·이용권을 자동으로 되돌렸어요. 처리 내역은 보관함에서 확인할 수 있어요.',
 pending:'상담서를 완성하지 못해 결제·이용권 자동 환불을 진행하고 있어요. 처리 상태는 보관함에서 확인할 수 있어요.',
 manual_review:'상담서를 완성하지 못했고 자동 환불을 마무리하지 못했어요. 운영자가 결제·이용권 복원을 확인하고 있어요.',
} as const;
// 2026-11-19 R6 다시 시도 우선: 일시 장애로 멈춘 상담은 서버가 환불하지 않고 보류한다(retry.available).
// 고객이 무료 다시 시도 또는 환불 요청을 고른다. 기한(일수·날짜)은 화면에서 약속하지 않는다.
const RETRY_NOTICE='상담서 작성이 중간에 멈췄어요. 완성된 장은 그대로 두고 남은 장만 다시 써 드려요. 추가 결제·차감은 없어요.';
async function api(path:string,body?:unknown){
 const response=await authFetch(`/api/heukwol/${path}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message||'상담 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'),{code:String(data.code||''),status:response.status});return data;
}
export default function HeukwolClient(){
 const [year,setYear]=useState(()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date())));
 const firstYear=useRef(year),[profileId,setProfileId]=useState(''),[question,setQuestion]=useState(''),[pricing,setPricing]=useState<Pricing|null>(null);
 const [state,setState]=useState<HeukwolState|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[showForm,setShowForm]=useState(false);
 const [priceFailed,setPriceFailed]=useState(false);
 const priceLabel=pricing?.displayPrice || (priceFailed ? '가격 조회 실패' : '가격 확인 중');
 const [adding,setAdding]=useState(false);
 // 결제가 확인된 뒤 첫 장이 저장되기 전까지 보이는 생성 화면. 질문 입력 폼으로 돌아가지 않게 한다.
 const [paid,setPaid]=useState(false);
 const operation=useRef(0),mounted=useRef(true),pending=useRef<Input|null>(null),owner=useRef(''),flight=useRef(false),authEpoch=useRef(0);
 // latest: 화면에 보인 마지막 상태. looping/following: 이어쓰기 루프와 그 직전 상태 조회가 하나만 돌게 하는 가드.
 const latest=useRef<HeukwolState|null>(null),looping=useRef(0),following=useRef(false);
 const delivery=useRef<{requestId:string;account:string;epoch:number;promise:Promise<boolean>}|null>(null);
 const capture=()=>{const account=readDestinyProfileAccountId(),epoch=authEpoch.current;return ()=>mounted.current&&epoch===authEpoch.current&&account===readDestinyProfileAccountId();};
 const validOwner=useCallback(()=>mounted.current && owner.current===readDestinyProfileAccountId(),[]);
 const receive=useCallback(async(initial:HeukwolState)=>{
  const ticket=++operation.current;let current=initial,misses=0;
  const isCurrent=()=>validOwner() && ticket===operation.current;
  looping.current=ticket;
  try{
   while(isCurrent()){
    latest.current=current;setState(current);setShowForm(true);
    if(current.id){const url=new URL(location.href);url.searchParams.set('result',current.id);history.replaceState(history.state,'',url);}
    if(current.status!=='generating')break;
    if(document.visibilityState==='hidden'||!navigator.onLine){setMessage('완성된 장은 저장했어요. 화면으로 돌아오면 이어서 작성해요.');break;}
    await new Promise(resolve=>setTimeout(resolve,1200*(misses+1)));if(!isCurrent())return;
    try{current=await api('continue',{id:current.id});if(misses)setMessage('');misses=0;}
    catch(e){
     const {code,status}=e as ApiError;
     // 종결 실패는 서버가 닫은 상태(다시 시도 보류 또는 환불)를 다시 읽어 그 안내로 바꾼다.
     if(code==='HEUKWOL_DELIVERY_FAILED'){const id=current.id;current=await api(`result?id=${encodeURIComponent(id)}`).catch(()=>({...current,status:'failed' as const}));continue;}
     // 일시 장애(5xx·네트워크·진행 상태 경합)는 생성 화면을 유지한 채 몇 번 더 이어 간다. 서버 복구 cron 도 같은 상담을 이어 쓴다.
     if(status&&status<500&&code!=='EXECUTION_CHANGED'||++misses>3)throw e;
     setMessage('연결을 다시 확인하고 있어요. 완성된 장은 보관돼 있어요.');
    }
   }
  }finally{if(looping.current===ticket)looping.current=0;}
 },[validOwner]);
 // 승인된 주문 복구는 PG 창 응답을 기다리는 start()와 독립적으로 시작한다.
 // 복구 폴링·수동 재개·뒤늦은 PG 콜백은 같은 요청의 실행 하나를 공유한다.
 const deliver=useCallback((input:Input)=>{
  const account=readDestinyProfileAccountId(),epoch=authEpoch.current,existing=delivery.current;
  setShowForm(true);setPaid(true);setMessage('상담을 준비하고 있어요. 완성된 장은 차례로 저장해요.');
  if(existing?.requestId===input.requestId&&existing.account===account&&existing.epoch===epoch)return existing.promise;
  const current=()=>mounted.current&&epoch===authEpoch.current&&account===readDestinyProfileAccountId();
  const promise=(async()=>{
   const started=await api('start',input);if(!current())return false;
   await receive(started);return current();
  })().catch(error=>{
   if(delivery.current?.promise===promise)delivery.current=null;
   // 입력을 고쳐야 하는 거절(4xx)만 폼으로 돌린다. 일시 장애는 생성 화면에서 같은 요청으로 다시 시도한다.
   const status=(error as ApiError).status;if(current()&&status&&status<500)setPaid(false);
   throw error;
  });
  delivery.current={requestId:input.requestId,account,epoch,promise};return promise;
 },[receive]);
 // 탭 복귀·재방문·이어서 작성하기: 서버의 현재 상태를 읽고 생성 중이면 같은 루프로 이어 쓴다. 이미 돌고 있으면 새로 시작하지 않는다.
 const follow=useCallback(async(id:string)=>{
  if(following.current||looping.current)return;following.current=true;const current=capture();setBusy(true);setMessage('');
  try{const data=await api(`result?id=${encodeURIComponent(id)}`);if(current())await receive(data);}
  catch(e){if(current())setMessage((e as Error).message);}
  finally{following.current=false;if(current()&&!flight.current)setBusy(false);}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[receive]);
 const loadPrice=useCallback(async()=>{
  setPriceFailed(false);
  try { const data=await api('pricing'); if(!data.pricing?.displayPrice)throw Error('Missing price'); if(mounted.current)setPricing(data.pricing); }
  catch { if(mounted.current)setPriceFailed(true); }
 },[]);
 useEffect(()=>{
  mounted.current=true;owner.current=readDestinyProfileAccountId();
  void loadPrice();
  // 새로고침·뒤로 가기·결제 리다이렉트 뒤 재방문: 완성본은 그대로 보여 주고, 생성 중이면 자동으로 이어 쓴다.
  const id=new URL(location.href).searchParams.get('result');
  if(id){setShowForm(true);void follow(id);}
  const changed=()=>{if(owner.current!==readDestinyProfileAccountId()){operation.current++;authEpoch.current++;owner.current=readDestinyProfileAccountId();pending.current=null;delivery.current=null;flight.current=false;latest.current=null;looping.current=0;following.current=false;setState(null);setPaid(false);setProfileId('');setQuestion('');setBusy(false);setMessage('계정이 변경되었어요. 프로필을 다시 선택해 주세요.');}};
  window.addEventListener('storage',changed);window.addEventListener('focus',changed);window.addEventListener('cd:auth-changed',changed);
  return()=>{mounted.current=false;operation.current++;authEpoch.current++;window.removeEventListener('storage',changed);window.removeEventListener('focus',changed);window.removeEventListener('cd:auth-changed',changed);};
 },[follow,loadPrice]);
 useEffect(()=>{
  // 숨은 탭·오프라인에서 멈춘 생성을 복귀·온라인·bfcache 복원 때 이어 쓴다(네오 결과 화면과 같은 이벤트).
  const wake=(event:Event)=>{
   if(event.type==='pageshow'&&!(event as PageTransitionEvent).persisted)return;
   const shown=latest.current;
   if(document.visibilityState==='hidden'||!navigator.onLine||flight.current||shown?.status!=='generating'||!shown.id)return;
   void follow(shown.id);
  };
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);window.addEventListener('pageshow',wake);
  return()=>{document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);window.removeEventListener('pageshow',wake);};
 },[follow]);
 useEffect(()=>{
  const handler=async(descriptor:{args?:Record<string,unknown>})=>{
   const raw=descriptor.args?.payload;if(typeof raw!=='string')return false;
   let input:Input;try{input=JSON.parse(raw) as Input;}catch{return false;}
   if(!input?.requestId||flight.current&&pending.current?.requestId!==input.requestId)return false;
   return runPaid(input);
  };
  checkoutEntry.registerPaidResumeHandler('heukwol',handler);
  return()=>{checkoutEntry.unregisterPaidResumeHandler('heukwol',handler);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[deliver]);
 // 결제가 확인된 요청을 시작한다. 결제 복귀와 생성 화면의 다시 시도하기가 같이 쓰며, 결제창은 다시 열지 않는다.
 async function runPaid(input:Input){
  flight.current=true;owner.current=readDestinyProfileAccountId();const current=capture();pending.current=input;setBusy(true);
  try{return await deliver(input);}catch(e){if(current())setMessage((e as Error).message);return false;}finally{if(current()){flight.current=false;setBusy(false);}}
 }
 async function start(){
  if(flight.current)return;flight.current=true;owner.current=readDestinyProfileAccountId();const current=capture();setBusy(true);setMessage('');
  try{
   const same=pending.current?.profileId===profileId && pending.current?.year===year && pending.current?.question===question;
   const input:Input=same?pending.current!:{profileId,year,question,requestId:`heukwol-${crypto.randomUUID()}`};pending.current=input;
   const prepared=await api('prepare',input);if(!current())return;
   if(prepared.id){await receive(prepared);return;}
   const price=prepared.pricing as Pricing;setPricing(price);
   const gate=await runPaidAccessGate({featureKey:FEATURE,profileId,reason:'흑월의 경고',requestId:input.requestId,cost:price.cost,amountKRW:price.amountKRW,
    resume:{kind:'heukwol',action:'start',args:{payload:JSON.stringify(input)}}});
   if(!current()||pending.current?.requestId!==input.requestId)return;if(!gate.ok)throw new Error(gate.error?.message||'결제가 완료되지 않았어요.');
   await deliver(input);
  }catch(e){if(current())setMessage((e as Error).message);}finally{if(current()){flight.current=false;setBusy(false);}}
 }
 async function resume(){if(!state||flight.current)return;await follow(state.id);}
 // 무료 다시 시도: 상담 id 만 보낸다. 서버가 같은 상담을 다시 열면 같은 이어쓰기 루프로 남은 장을 받는다. 결제창·차감 없음.
 async function retryFree(){
  if(!state?.id||flight.current)return;const id=state.id;flight.current=true;const current=capture();setBusy(true);setMessage('');
  try{const data=await api('retry',{id});if(current())await receive(data);}
  catch(e){if(current()){setMessage((e as Error).message);const data=await api(`result?id=${encodeURIComponent(id)}`).catch(()=>null);if(data&&current()){latest.current=data;setState(data);}}}
  finally{if(current()){flight.current=false;setBusy(false);}}
 }
 // 다시 시도 대신 환불 요청: 상담 id 만 보낸다. 서버가 기존 환불 경로로 1회 정산하고 환불 진행 상태를 돌려준다.
 async function refundInstead(){
  if(!state?.id||flight.current)return;const id=state.id;flight.current=true;const current=capture();setBusy(true);setMessage('');
  try{const data=await api('refund-request',{id});if(current()){latest.current=data;setState(data);}}
  catch(e){if(current())setMessage((e as Error).message||'환불 요청을 전하지 못했어요. 잠시 뒤 다시 눌러 주세요.');}
  finally{if(current()){flight.current=false;setBusy(false);}}
 }
 return <main className={styles.page} lang="ko" data-cd-no-trans>
  <link rel="stylesheet" href="/styles/service-intro-fonts.css"/>
  <nav className={styles.nav}><a href="/ggulggul/">꿀꿀 운세 홈</a><button onClick={()=>{setShowForm(true);document.getElementById('heukwol-profile')?.scrollIntoView();}}>이야기 건너뛰기</button></nav>
  {priceFailed && !pricing && <p role="status">가격을 확인하지 못했어요. <button type="button" onClick={loadPrice}>가격 다시 확인하기</button></p>}
  {state?.report?<HeukwolResult report={state.report} isCurrent={validOwner}/>:<>
  {!showForm && <><header className={styles.cover}><p className={styles.eyebrow}>연이와 네오가 함께 읽는 다른 선택</p><h1>흑월의 경고</h1><p className={styles.subtitle}>사주와 자미두수로 살펴보는 월별 흐름과 대비</p><p>어디로 가야 할지 막막할 때,<br/>흑월이 짚은 주의 흐름을 살펴보세요.<br/>연이와 네오가 다음 방향을 정리하도록 도와드립니다.</p><a className={styles.primary} href="#heukwol-story">이야기 읽기</a><p>단건 {priceLabel} · 약 5만 자 · PDF</p><small>도입 이야기의 예시 · 개인 운세 결과가 아닙니다</small></header>
  <FateWarningEpisode />
  <section className={styles.invitation}><h2>아직 쓰이지 않은<br/>당신의 다음 장</h2><p>타고난 성향과 반복되는 선택부터 살펴봐요.<br/>연애·재물·인간관계·안전·건강의 점검과<br/>선택한 해의 열두 달 대응을 27장에 담아요.</p><a className={styles.primary} href="#heukwol-profile">저장한 프로필 선택하기</a><p>단건 {priceLabel} · 약 5만 자 · 월별 리포트와 PDF</p></section></>}
  <section id="heukwol-profile" className={styles.form}>
   {showForm&&<h1>흑월의 경고</h1>}
   {state?<>{state.status==='generating'&&<MasterRoomScene master="heukwol"/>}<h2>{state.status==='completed'?'상담을 완성했어요':state.status==='failed'?(state.retry?.available?'상담서 작성이 잠시 멈췄어요':'상담서를 완성하지 못했어요'):'당신의 대응 상담서를 쓰고 있어요'}</h2>{state.status==='failed'?(state.retry?.available?<><p role="alert">{RETRY_NOTICE}</p><p>{state.completedChapters} / {state.totalChapters}장 보관</p><button className={styles.primary} onClick={retryFree} disabled={busy}>{busy?'처리 중':'다시 시도 · 추가 결제·차감 없음'}</button><button type="button" className={styles.secondary} onClick={refundInstead} disabled={busy}>다시 시도 대신 환불 요청</button></>:<p role="alert">{REFUND_NOTICE[state.refundStatus||'pending']}</p>):<><p role="status">{state.completedChapters} / {state.totalChapters}장 저장</p><progress max={state.totalChapters} value={state.completedChapters}/></>}{state.status==='generating'&&<button className={styles.primary} onClick={resume} disabled={busy}>{busy?'작성 중':'이어서 작성하기'}</button>}<a href="/records/">보관함에서 확인하기</a></>:paid?<><Image className={styles.writingScene} src="/images/consultation-webtoons/heukwol/portraits/moon-library.webp" alt="흑월 상담의 결과를 정리하는 달빛 서재" width={900} height={1600} sizes="(max-width: 600px) 90vw, 420px"/><h2>결제를 확인했어요. 상담서를 쓰기 시작했어요</h2><progress/>{!busy&&<button className={styles.primary} onClick={()=>{if(pending.current&&!flight.current)void runPaid(pending.current);}}>다시 시도하기</button>}<a href="/records/">보관함에서 확인하기</a></>:<><header className={styles.formHeading}><svg aria-hidden="true" viewBox="0 0 48 48" width="40" height="40" fill="none"><path d="M33 8a18 18 0 1 0 7 28A19 19 0 0 1 33 8Z" stroke="currentColor" strokeWidth="1.2"/><path d="m35 17 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" stroke="currentColor" strokeWidth="1.2"/></svg><h2>당신의 흐름을 함께 살펴봐요</h2><p>사주와 자미두수의 월별 비교를 위해<br/>출생 시각이 기록된 프로필을 골라 주세요.</p></header><div className={styles.profileEntry}><SavedBirthProfilePicker locale="ko" disabled={busy} onClear={()=>setProfileId('')} onSelect={(_seed,profile)=>setProfileId(String(profile.profileId||profile.id||''))}/><button type="button" className={styles.secondary} disabled={busy} aria-expanded={adding} aria-controls="heukwol-new-profile" onClick={()=>setAdding(!adding)}>{adding?'입력 닫기':'새 프로필 만들기'}</button>{adding&&<div id="heukwol-new-profile" className={styles.newProfile}><ProfileForm locale="ko" surface="paper" onSaved={profile=>{setProfileId(String(profile.profileId||profile.id||''));setAdding(false);}}/></div>}</div>
   <label className={styles.yearField}>살펴볼 연도<select value={year} disabled={busy} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i} value={firstYear.current+i}>{firstYear.current+i}년</option>)}</select></label>
   <label className={styles.questionField}>어떤 일을 겪었고, 무엇이 걱정되나요?<textarea value={question} onChange={e=>setQuestion(e.target.value)} disabled={busy} aria-describedby="heukwol-question-help" minLength={12} maxLength={3000} placeholder="실제로 겪은 일과 앞으로 걱정되는 일을 나눠 적어 주세요."/></label>
   <p className={styles.inputHint} id="heukwol-question-help">12~3,000자 · 현재 {question.trim().length}자</p><p className={styles.methodNote}>사주 절입 구간과 자미두수 음력 구간의 근거를 구분해요. 주의 지표는 실제 사고나 손실의 발생 확률이 아니에요.</p>
   <button className={styles.primary} disabled={busy||!pricing||!profileId||question.trim().length<12} onClick={start}>{busy?'상담 준비 중':`이용 조건 확인하기 · ${priceLabel}`}</button><p className={styles.inputHint}>선택한 프로필·연도·질문으로 상담 한 편을 만들어요. 완성본은 추가 생성 없이 다시 읽고 PDF로 저장할 수 있어요.</p></>}
   <p role="status">{message}</p>
  </section></>}
 </main>;
}
