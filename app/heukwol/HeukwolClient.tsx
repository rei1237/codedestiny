'use client';
import StoryLeaf from '../consultations/StoryLeaf';
import {Fragment} from 'react';
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
const scenes=["하나는 검붉은 폐허로, 나머지 둘은 따뜻한 마을과 밝은 자연으로 이어지는 갈림길. 나레이션: 눈앞에 놓인 세 갈래 길. 모든 선택이 같은 미래로 이어지지는 않는다.","붉은 장식의 흑월이 차갑게 내려다본다. 흑월: 또 같은 선택을 하러 왔구나.","흑월이 깨진 약속과 부담의 환영을 펼친다. 흑월: 조급함으로 맺은 약속. 놓지 못한 관계. 이번에도 대가는 네 몫이겠지.","흑월의 그림자가 방문자의 길을 막는다. 흑월: 네가 계속 그렇게 걷는다면… 끝은 이미 보이는걸.","인간형 연이가 방문자와 그림자 사이에 들어선다. 연이: 아직 일어나지 않은 일이에요. 저 말이 당신의 결말이 되게 두지 않을 거예요.","연이가 실제 경험과 걱정의 환영을 나눈다. 연이: 이미 겪은 일과 두려워하는 일을 나눠봐요. 어디서 마음이 급해졌는지부터 함께 찾을게요.","흑월이 비웃으며 더 큰 그림자를 펼친다. 흑월: 위로 몇 마디로 흐름이 달라질 것 같아?","인간형 네오가 지도 위의 갈림길을 짚는다. 네오: 위로로 끝낼 생각은 없어. 네가 보여준 결말에 닿는 조건부터 끊는다.","네오가 반복되는 부담으로 이어지는 연결을 끊는다. 네오: 확정되지 않은 약속은 미뤄. 확인할 건 먼저 확인하고. 같은 선택을 바꾸면 다음 수가 생긴다.","연이가 방문자의 손을 잡고 네오가 새 길을 밝힌다. 연이 · 네오: 당신을 탓하기 위한 이야기가 아니에요.\n무엇을 피하고, 언제 움직일지 정하기 위한 거지.","흑월이 어둠 속으로 물러나 마지막 시선을 보낸다. 흑월: 좋아. 이번에는 어디까지 달라지는지 지켜보겠어. 나레이션: 경고는 남았다. 하지만 길은 하나가 아니었다.","인간형 연이와 네오가 프로필 카드를 펼치고 상담 자리로 안내한다. 연이 · 네오: 이제 당신의 흐름을 함께 살펴봐요.\n주의할 지점과 대응할 방법. 네 상황에 맞춰 정리하자."];
async function api(path:string,body?:unknown){
 const response=await authFetch(`/api/heukwol/${path}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 const data=await response.json();if(!response.ok)throw new Error(data.message||'상담 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');return data;
}
export default function HeukwolClient(){
 const [year,setYear]=useState(()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date())));
 const firstYear=useRef(year),[profileId,setProfileId]=useState(''),[question,setQuestion]=useState(''),[pricing,setPricing]=useState<Pricing|null>(null);
 const [state,setState]=useState<HeukwolState|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[showForm,setShowForm]=useState(false);
 const [adding,setAdding]=useState(false);
 const operation=useRef(0),mounted=useRef(true),pending=useRef<Input|null>(null),owner=useRef(''),flight=useRef(false),authEpoch=useRef(0);
 const capture=()=>{const account=readDestinyProfileAccountId(),epoch=authEpoch.current;return ()=>mounted.current&&epoch===authEpoch.current&&account===readDestinyProfileAccountId();};
 const validOwner=useCallback(()=>mounted.current && owner.current===readDestinyProfileAccountId(),[]);
 const receive=useCallback(async(initial:HeukwolState)=>{
  const ticket=++operation.current;let current=initial;
  const isCurrent=()=>validOwner() && ticket===operation.current;
  while(isCurrent()){
   setState(current);setShowForm(true);
   if(current.id){const url=new URL(location.href);url.searchParams.set('result',current.id);history.replaceState(history.state,'',url);}
   if(current.status!=='generating')break;
   if(document.visibilityState==='hidden'||!navigator.onLine){setMessage('완성된 장은 저장했어요. 화면으로 돌아와 이어서 작성할 수 있어요.');break;}
   await new Promise(resolve=>setTimeout(resolve,1200));if(!isCurrent())return;
   current=await api('continue',{id:current.id});
  }
 },[validOwner]);
 useEffect(()=>{
  mounted.current=true;owner.current=readDestinyProfileAccountId();
  api('pricing').then(data=>{if(mounted.current)setPricing(data.pricing);}).catch(()=>setMessage('가격을 확인하지 못했어요. 새로고침 후 다시 확인해 주세요.'));
  const current=capture();const id=new URL(location.href).searchParams.get('result');
  if(id){setShowForm(true);setBusy(true);api(`result?id=${encodeURIComponent(id)}`).then(data=>{if(current())setState(data);}).catch(e=>{if(current())setMessage(e.message);}).finally(()=>{if(current())setBusy(false);});}
  const changed=()=>{if(owner.current!==readDestinyProfileAccountId()){operation.current++;authEpoch.current++;owner.current=readDestinyProfileAccountId();pending.current=null;flight.current=false;setState(null);setProfileId('');setQuestion('');setBusy(false);setMessage('계정이 변경되었어요. 프로필을 다시 선택해 주세요.');}};
  window.addEventListener('storage',changed);window.addEventListener('focus',changed);window.addEventListener('cd:auth-changed',changed);
  return()=>{mounted.current=false;operation.current++;authEpoch.current++;window.removeEventListener('storage',changed);window.removeEventListener('focus',changed);window.removeEventListener('cd:auth-changed',changed);};
 },[validOwner]);
 useEffect(()=>{
  const handler=async(descriptor:{args?:Record<string,unknown>})=>{
   const raw=descriptor.args?.payload;if(typeof raw!=='string')return false;
   if(flight.current)return false;flight.current=true;owner.current=readDestinyProfileAccountId();const current=capture();setBusy(true);
   try{const input=JSON.parse(raw) as Input;pending.current=input;const started=await api('start',input);if(!current())return false;await receive(started);return true;}catch(e){if(current())setMessage((e as Error).message);return false;}finally{if(current()){flight.current=false;setBusy(false);}}
  };
  checkoutEntry.registerPaidResumeHandler('heukwol',handler);
  return()=>{checkoutEntry.unregisterPaidResumeHandler('heukwol',handler);};
 },[receive,validOwner]);
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
   if(!current())return;if(!gate.ok)throw new Error(gate.error?.message||'결제가 완료되지 않았어요.');
   const started=await api('start',input);if(current())await receive(started);
  }catch(e){if(current())setMessage((e as Error).message);}finally{if(current()){flight.current=false;setBusy(false);}}
 }
 async function resume(){if(!state||flight.current)return;flight.current=true;const current=capture();setBusy(true);setMessage('');try{const data=await api(`result?id=${encodeURIComponent(state.id)}`);if(current())await receive(data);}catch(e){if(current())setMessage((e as Error).message);}finally{if(current()){flight.current=false;setBusy(false);}}}
 return <main className={styles.page} lang="ko" data-cd-no-trans>
  <link rel="stylesheet" href="/styles/service-intro-fonts.css"/>
  <nav className={styles.nav}><a href="/">꿀꿀 운세</a><button onClick={()=>{setShowForm(true);document.getElementById('heukwol-profile')?.scrollIntoView();}}>이야기 건너뛰기</button></nav>
  {state?.report?<HeukwolResult report={state.report} isCurrent={validOwner}/>:<>
  {!showForm && <><header className={styles.cover}><p className={styles.eyebrow}>연이와 네오가 함께 읽는 다른 선택</p><h1>흑월의 경고</h1><p className={styles.subtitle}>불운의 매듭을 푸는 법</p><p>그녀가 보여준 미래.<br/>우리는 다른 길을 찾기로 했다.</p><a className={styles.primary} href="#heukwol-story">이야기 읽기</a><p>단건 {pricing?.displayPrice||'가격 확인 중'} · 약 5만 자 · PDF</p><small>도입 이야기의 예시 · 개인 운세 결과가 아닙니다</small></header>
  <section id="heukwol-story" aria-label="흑월과 연이, 네오의 이야기"><StoryLeaf label="서장 · 달이 가려지기 전" title="도장이 찍히지 않은 약속" lines={["봉투 안에는 같은 청구서가 두 장 들어 있었다. 금액도 날짜도 같았다. 흑월은 촛불에 비춰 보지도 않고 둘 중 하나를 집었다. “이쪽이 더 비싸게 치일 텐데.”","연이가 종이를 뒤집었다. 작은 글씨로 ‘오늘 안에’라고 쓰여 있었다. “돈이 아니라 서두르게 만든 말이었군요.” 네오는 기한과 서명란 사이에 선을 그었다. “확인도 안 했는데 약속부터 하게 만드는 수야.”","촛불이 꺼졌다. 문밖에서 흑월이 웃었다. “알아보고도 같은 길을 고르는지, 어디 한번 볼까?”"]}/>{scenes.map((alt,i)=><Fragment key={alt}>{i===4&&<StoryLeaf label="중장 · 연이의 질문" title="아직 쓰지 않은 대답" lines={["그림자 속 방문자가 쥐고 있던 것은 빚 문서가 아니라 빈 종이였다. 연이는 종이를 펴 주었다. “이미 한 약속을 적어 봐요. 두려워서 하려던 약속은 그 아래에요.”","아래쪽 줄만 빽빽했다. 흑월의 웃음이 처음으로 끊겼다."]}/>} {i===8&&<StoryLeaf label="전환 · 네오의 한 수" title="비워 둔 서명란" lines={["네오는 지도의 가장 어두운 길 위에 아까 그 청구서를 놓았다. “결말을 없애려 애쓰지 마. 저기로 들어가는 조건 하나만 빼.”","방문자는 서명 대신 확인할 날짜를 적었다. 금이 간 것은 약속이 아니라, 흑월이 준비해 둔 미래였다."]}/>}<Image unoptimized className={styles.panel} key={alt} src={`/images/consultation-webtoons/heukwol/hw12-${String(i+1).padStart(2,'0')}.webp`} width={1122} height={1402} alt={alt} loading={i===0?'eager':'lazy'}/></Fragment>)}</section>
  <section className={styles.invitation}><h2>아직 쓰이지 않은<br/>당신의 다음 장</h2><p>타고난 성향과 반복되는 선택부터 살펴봐요.<br/>연애·재물·인간관계·안전·건강의 점검과<br/>선택한 해의 열두 달 대응을 27장에 담아요.</p><a className={styles.primary} href="#heukwol-profile">저장한 프로필 선택하기</a><p>단건 {pricing?.displayPrice||'가격 확인 중'} · 약 5만 자 · 월별 리포트와 PDF</p></section></>}
  <section id="heukwol-profile" className={styles.form}>
   {showForm&&<h1>흑월의 경고</h1>}
   {state?<>{state.status==='generating'&&<Image className={styles.writingScene} src="/images/consultation-webtoons/heukwol/hw12-12.webp" alt="연이와 네오가 흑월의 경고에 맞서 대응책을 준비하는 장면" width={1122} height={1402} sizes="(max-width: 600px) 90vw, 420px"/>}<h2>{state.status==='completed'?'상담을 완성했어요':state.status==='failed'?'상담 처리 상태를 확인해 주세요':'당신의 대응 상담서를 쓰고 있어요'}</h2><p role="status">{state.completedChapters} / {state.totalChapters}장 저장</p><progress max={state.totalChapters} value={state.completedChapters}/>{state.status==='generating'&&<button className={styles.primary} onClick={resume} disabled={busy}>{busy?'작성 중':'이어서 작성하기'}</button>}<a href="/records/">보관함에서 확인하기</a></>:<><h2>당신의 흐름을 함께 살펴봐요</h2><p>사주와 자미두수의 월별 비교를 위해 출생 시각이 기록된 프로필을 골라 주세요.</p><SavedBirthProfilePicker locale="ko" disabled={busy} onSelect={(_seed,profile)=>setProfileId(String(profile.profileId||profile.id||''))}/><button type="button" className={styles.secondary} disabled={busy} onClick={()=>setAdding(!adding)}>{adding?'입력 닫기':'새 프로필 만들기'}</button>{adding&&<ProfileForm locale="ko" surface="paper" onSaved={profile=>{setProfileId(String(profile.profileId||profile.id||''));setAdding(false);}}/>}
   <label>살펴볼 연도<select value={year} disabled={busy} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i} value={firstYear.current+i}>{firstYear.current+i}년</option>)}</select></label>
   <label>어떤 일을 겪었고, 무엇이 걱정되나요?<textarea value={question} onChange={e=>setQuestion(e.target.value)} disabled={busy} aria-describedby="heukwol-question-help" minLength={12} maxLength={3000} placeholder="실제로 겪은 일과 앞으로 걱정되는 일을 나눠 적어 주세요."/></label>
   <p id="heukwol-question-help">12~3,000자 · 현재 {question.trim().length}자</p><p>사주 절입 구간과 자미두수 음력 구간의 근거를 구분해요. 주의 지표는 실제 사고나 손실의 발생 확률이 아니에요.</p>
   <button className={styles.primary} disabled={busy||!pricing||!profileId||question.trim().length<12} onClick={start}>{busy?'상담 준비 중':`이용 조건 확인하기 · ${pricing?.displayPrice||'가격 확인 중'}`}</button><p>선택한 프로필·연도·질문으로 상담 한 편을 만들어요. 완성본은 추가 생성 없이 다시 읽고 PDF로 저장할 수 있어요.</p></>}
   <p role="status">{message}</p>
  </section></>}
 </main>;
}
