import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import {LazyMotion,domAnimation} from 'framer-motion';
import {SafeArea,Screen as TossScreen,graniteEvent} from '@apps-in-toss/web-framework';
import {ToastProvider} from '@/app/components/Toast';
import {clearClientAuthState} from '@/app/_lib/auth-client';
import {refreshAuth,handleSessionInvalidated} from '@/app/_lib/auth-store';
import {SERVICE_AVAILABLE} from '../src/release';
import {canonicalResponse,restoreSession,recoverAfterAuthentication,onSessionInvalidated,login,isToss} from '../src/platform';
import {createServiceFetch} from './transport.mjs';
import {dispatchServiceBack} from './native-back.mjs';
import {FPTI_RESULT_PREFIX,fptiStoredEnvelope} from './fpti-session.mjs';

import {captureLetterDraft,restoreLetterDraft} from './letter-draft-bootstrap.mjs';
import {captureTeaDraft,restoreTeaDraft} from './tea-draft-bootstrap.mjs';
import {captureSukuyoDraft,restoreSukuyoDraft} from './sukuyo-draft-bootstrap.mjs';
import {recallPendingAuthDrafts,rememberPendingAuthDrafts,clearPendingAuthDrafts} from './draft-quarantine.mjs';
import PreparedCheckout from './PreparedCheckout';
import YeongnyangiLayout from '@/app/yeongnyangi/layout';
import styles from '@/app/yeongnyangi/yeongnyangi.module.css';
import '@/styles/globals.css';
import '@/styles/theme-tokens.css';
import '@/styles/moonlit-birth-form.css';
import '@/styles/feature-marketing-detail.css';
import '@/app/yeongnyangi/night-tokens.css';

const QuestionSky=lazy(()=>import('@/app/yeongnyangi/_components/QuestionSkyConsultation'));
const Consultation=lazy(()=>import('@/app/yeongnyangi/_components/Consultation'));
const Result=lazy(()=>import('@/app/yeongnyangi/_components/Result'));
const Library=lazy(()=>import('@/app/yeongnyangi/_components/Library'));
const Tea=lazy(()=>import('@/src/features/fortune-tea-house/FortuneTeaHousePage'));
const TeaPrice=lazy(()=>import('./TossTeaPrice'));
const LetterRoom=lazy(()=>import('./TossLetterRoom'));
const SavedTea=lazy(()=>import('@/app/fortune-tea-house/SavedTeaReading'));
const Neo=lazy(()=>import('./TossNeoGate'));
const Fpti=lazy(()=>import('./TossFpti'));
const NeoResult=lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomResultPage'));
const NeoBooks=lazy(()=>import('@/src/features/neo-war-room/NeoStrategyBooksPage'));
const LoveSecret=lazy(()=>import('./LoveSecret'));
const Relationship=lazy(()=>import('./TossRelationship'));
const PetSaju=lazy(()=>import('./TossPetSaju'));
const LoveSecretResult=lazy(()=>import('@/app/love-secret-ai/result/LoveSecretAiResultClient'));
const LifeBook=lazy(()=>import('./LifeBook'));
const LifeBookResult=lazy(()=>import('@/app/life-book-ai/result/LifeBookAiResultClient'));
const Fusion=lazy(()=>import('./Fusion'));
const Vedic=lazy(()=>import('@/app/vedic-ai/VedicAiClient'));
const Ziwei=lazy(()=>import('@/app/ziwei-ai/ZiweiAiClient'));
const NewYear=lazy(()=>import('@/app/new-year-ai-consultation/NewYearAiClient'));
const Dream=lazy(()=>import('./TossDream'));
const Heukwol=lazy(()=>import('./TossHeukwol'));
const Karma=lazy(()=>import('./TossKarma'));
const Astrology=lazy(()=>import('@/app/astrology-ai/AstrologyAiClient'));
const AstrologyResult=lazy(()=>import('@/app/astrology-ai/result/AstrologyAiResultClient'));
const AstrologyProfile=lazy(()=>import('./TossAstrologyProfilePicker'));
const AstrologyPrice=lazy(()=>import('./TossAstrologyPrice'));
const Sukuyo=lazy(()=>import('./TossSukuyoGate'));
const Records=lazy(()=>import('@/app/records/RecordsClient'));
const TossMeetingPlace=lazy(()=>import('./TossMeetingPlace'));
const TossCareerStyle=lazy(()=>import('./TossCareerStyle'));
const Maya=lazy(()=>import('@/src/components/maya/MayaCalendarView'));
const SavedMayaPrompt=lazy(()=>import('./TossMayaPrompt'));
const MayaPrompt=lazy(()=>import('@/src/components/maya/MayaPromptGeneratorCard'));
const Omikuji=lazy(()=>import('./TossOmikujiGate'));
const Psychotest=lazy(()=>import('./TossPsychotest'));
function VedicProfile(props){return <AstrologyProfile {...props} calendarMode="lunar"/>;}
function VedicPrice(){return <AstrologyPrice featureKey="vedic-ai-consultation"/>;}
function ZiweiProfile(props){return <AstrologyProfile {...props} calendarMode="native-lunar"/>;}
function ZiweiPrice(){return <AstrologyPrice featureKey="ziwei-ai-consultation"/>;}
function NewYearProfile(props){return <AstrologyProfile {...props} calendarMode="lunar"/>;}
function NewYearPrice(){return <AstrologyPrice featureKey="new-year-ai-consultation"/>;}
const releaseAvailability={title:'출시 준비 중',message:'상품 등록과 검수가 완료되면 토스에서 상담 결과를 생성하고 보관할 수 있어요.',action:{href:'/neo-operation-room/',label:'전략실 둘러보기'}};
let installed=false;
function install(){if(installed)return;installed=true;window.fetch=createServiceFetch({nativeFetch:window.fetch.bind(window),send:canonicalResponse,origin:location.origin});}
function loginFailure(error){const issue=error&&typeof error==='object'?error:{},status=issue.status===401||issue.status===403?issue.status:issue.code==='ACCESS_DENIED'?403:['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(issue.code)?401:0;if(status===403)return '토스 로그인 권한을 확인할 수 없어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.';if(status===401)return '토스 로그인 상태가 만료됐어요. 다시 로그인해 주세요.';if(issue.code==='SESSION_CHANGED')return '로그인 상태가 바뀌었어요. 다시 확인해 주세요.';if(issue.code==='SESSION_CHECK_FAILED')return '로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.';if(issue.code==='TOSS_RELEASE_PENDING')return '앱이 아직 출시 준비 중이에요. 잠시 후 다시 시도해 주세요.';if(issue.code==='UNSUPPORTED_APP_VERSION')return typeof issue.message==='string'&&issue.message.trim()&&issue.message!==issue.code?issue.message:'토스 앱을 업데이트한 뒤 다시 시도해 주세요.';return '로그인을 완료하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.';}
function ConsultationRedirect({href}){
 const routed=useRef(false);
 useEffect(()=>{if(routed.current)return;routed.current=true;location.replace(href);},[href]);
 return <p role="status">상담을 열고 있어요.</p>;
}

function destination(location){
  const url=new URL(location.href);
  const next=/^\/login\/?$/.test(url.pathname)?new URL(url.searchParams.get('next')||'/',url.origin):url;
  return next.origin===url.origin && /^\/yeongnyangi\/fortune\/?$/.test(next.pathname)?next.pathname+next.search:null;
}

function captureConsultationDraft(storage,location,now=Date.now()){
  try{
    const raw=storage?.getItem('yeongnyangi:consultation-login-draft');
    if(!raw||raw.length>24000)return null;
    const draft=JSON.parse(raw),age=now-draft.savedAt;
    if(draft.path!==destination(location)||!draft.path||!Number.isFinite(age)||age<0||age>=3600000||typeof draft.question!=='string'||draft.question.length>1000)return null;
    return draft;
  }catch{return null;}
}

function restoreConsultationDraft(storage,draft,location,user){
  try{
    if(!draft||draft.path!==destination(location))return;
    const owner=String(user?.id||user?.userId||user?._id||user?.uid||'').trim().toLowerCase();
    if(draft.accountId && owner!==draft.accountId)return;
    if(!storage.getItem('yeongnyangi:consultation-login-draft'))storage.setItem('yeongnyangi:consultation-login-draft',JSON.stringify({...draft,accountId:owner}));
  }catch{/* Optional input draft. Paid results are stored by the server. */}
}

// The shared auth reset clears sessionStorage even during ordinary shell entry.
// Preserve only validated owner-scoped local results; they are never shown until the
// matching account has been restored. Unlink deletion remains a release gate.
export function preserveOmikujiSession(storage,clear){
 const rows=[];const prefix='toss:omikuji-session:v1:';
 try{for(let index=0;index<storage.length;index++){try{const key=storage.key(index);if(!key)continue;const raw=storage.getItem(key);if(key.startsWith(FPTI_RESULT_PREFIX)){if(fptiStoredEnvelope(key,raw))rows.push([key,raw]);continue;}if(!key.startsWith(prefix)||!raw||raw.length>5000)continue;const saved=JSON.parse(raw);if(typeof saved.scope!=='string'||!saved.scope.startsWith('user:')||saved.scope.length<=5||key!==prefix+encodeURIComponent(saved.scope)||typeof saved.input?.question!=='string'||saved.input.question.length>220||saved.screen!=='result')continue;rows.push([key,raw]);}catch{/* A malformed record must not discard other owners' results. */}}}catch{/* Storage is optional. */}
 clear();
 try{for(const [key,raw] of rows)if(storage.getItem(key)===null)storage.setItem(key,raw);}catch{/* The screen reports unavailable storage when saving. */}
}
/** @param {{reviewOnly?:boolean, verifiedReceipt?:boolean, inputNotice?:(body:object)=>string}} props */
export default function ServiceScreens({reviewOnly=false,verifiedReceipt=false,inputNotice}={}){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loginPending,setLoginPending]=useState(false),[,setNavigationRevision]=useState(0),[recoveryMessage,setRecoveryMessage]=useState(''),[recoveryEpoch,setRecoveryEpoch]=useState(0);
 const consultationDraft=useRef(null),bootstrapDraft=useRef(null),bootstrapTeaDraft=useRef(null),bootstrapSukuyoDraft=useRef(null);
 const loginLock=useRef(false),loginEpoch=useRef(0),loginAlive=useRef(false);
 useEffect(()=>{loginAlive.current=true;const leave=()=>{loginEpoch.current++;setNavigationRevision(value=>value+1);if(loginLock.current)setBusy(false);};window.addEventListener('popstate',leave);return()=>{loginAlive.current=false;loginEpoch.current++;window.removeEventListener('popstate',leave);};},[]);
 useEffect(()=>{
  if(!isToss())return;
  const area=({bottom})=>document.documentElement.style.setProperty('--toss-service-bottom',`${bottom}px`);
  area(SafeArea.get());
  const offArea=SafeArea.subscribe({onEvent:area});
  const offBack=graniteEvent.addEventListener('backEvent',{onEvent:()=>{
   if(dispatchServiceBack())return;
   const previous=document.referrer&&new URL(document.referrer);
   if(previous?.origin===location.origin&&history.length>1)history.back();else void TossScreen.close();
  }});
  const offHome=graniteEvent.addEventListener('homeEvent',{onEvent:()=>location.assign('/')});
  return()=>{offArea();offBack();offHome();document.documentElement.style.removeProperty('--toss-service-bottom');};
 },[]);
 useEffect(()=>{
  install();let live=true,storage;try{storage=window.sessionStorage;}catch{/* Storage is optional. */}
  const drafts=()=>({letter:bootstrapDraft.current,tea:bootstrapTeaDraft.current,sukuyo:bootstrapSukuyoDraft.current});
  const capture=()=>{consultationDraft.current=captureConsultationDraft(storage,location)||consultationDraft.current;const pending=recallPendingAuthDrafts(storage,location);bootstrapDraft.current=captureLetterDraft(storage,location)||bootstrapDraft.current||pending.letter;bootstrapTeaDraft.current=captureTeaDraft(storage,location)||bootstrapTeaDraft.current||pending.tea;bootstrapSukuyoDraft.current=captureSukuyoDraft(storage)||bootstrapSukuyoDraft.current||pending.sukuyo;};
  const restore=user=>{restoreConsultationDraft(storage,consultationDraft.current,location,user);restoreLetterDraft(storage,bootstrapDraft.current,{location,user});restoreTeaDraft(storage,bootstrapTeaDraft.current,{location,user});restoreSukuyoDraft(storage,bootstrapSukuyoDraft.current,{user});};
  capture();
  let invalidationRevision=0;const invalidate=()=>{invalidationRevision++;capture();preserveOmikujiSession(storage,()=>handleSessionInvalidated({redirect:false}));rememberPendingAuthDrafts(storage,drafts());};const offSession=onSessionInvalidated(invalidate);window.addEventListener('code-destiny:toss-auth-denied',invalidate);
  preserveOmikujiSession(storage,clearClientAuthState);rememberPendingAuthDrafts(storage,drafts());restore();
  const showError=error=>{if(!live||error?.code==='SESSION_CHANGED')return;const status=error?.status===401||error?.status===403?error.status:error?.code==='ACCESS_DENIED'?403:['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(error?.code)?401:0,update=error?.code==='UNSUPPORTED_APP_VERSION'&&typeof error.message==='string'&&error.message.trim()&&error.message!==error.code?error.message:'';if(status===401){capture();preserveOmikujiSession(storage,clearClientAuthState);rememberPendingAuthDrafts(storage,drafts());}if(SERVICE_AVAILABLE)setRecoveryMessage(status===403?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':status===401?'기록과 구매를 확인하려면 토스 로그인이 필요해요.':error?.code==='SESSION_CHECK_FAILED'?'로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.':update||(['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(error?.code)?'현재 토스 앱에서는 구매 복구를 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.':'구매 내역을 확인하지 못했어요. 추가 결제 전에 로그인과 연결 상태를 확인해 주세요.'));};
  const restoreRevision=invalidationRevision;void (verifiedReceipt?Promise.resolve(true):restoreSession()).then(async authenticated=>{if(!authenticated){if(live&&isToss()&&invalidationRevision===restoreRevision)invalidate();return;}const user=await refreshAuth({force:true});if(!user||!(user.id||user.userId||user._id||user.uid))throw Object.assign(new Error('SESSION_CHECK_FAILED'),{code:'SESSION_CHECK_FAILED'});if(live){restore(user);clearPendingAuthDrafts(storage,drafts(),user);bootstrapDraft.current=null;bootstrapTeaDraft.current=null;bootstrapSukuyoDraft.current=null;setReady(true);}try{const notice=await recoverAfterAuthentication(true);if(live&&notice)setRecoveryMessage(notice);}catch(error){showError(error);}finally{if(live)setRecoveryEpoch(value=>value+1);}}).catch(error=>{if(live&&isToss()&&invalidationRevision===restoreRevision)invalidate();showError(error);}).finally(()=>{if(live){restore();setReady(true);}});
  return()=>{live=false;offSession();window.removeEventListener('code-destiny:toss-auth-denied',invalidate);};
 },[]);
 const recoveryBanner=recoveryMessage?<div role="status"><p>{recoveryMessage}</p><a href="/recovery">구매 내역 복구하기</a></div>:null;
 if(/^\/(?:saju-fpti|fpti)(?:\/result)?\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">사주 FPTI를 준비하고 있어요.</p>}><Fpti/></Suspense>:<p role="status">상담실을 준비하고 있어요.</p>}</LazyMotion>;
 if(/^\/psychotest(?:\/[a-z0-9-]+)?\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">심리테스트를 열고 있어요.</p>}><Psychotest/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname==='/omikuji'||location.pathname==='/omikuji/')return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">오미쿠지를 열고 있어요.</p>}><Omikuji/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(/^\/saju\/destiny-meeting-place\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}>{recoveryBanner}{ready&&<Suspense fallback={<p role="status">인연의 장소를 열고 있어요.</p>}><TossMeetingPlace/></Suspense>}</LazyMotion>;
 if(/^\/saju\/career-style\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready&&<Suspense fallback={<p role="status">일 스타일 리포트를 열고 있어요.</p>}><TossCareerStyle/></Suspense>}</LazyMotion>;
 if(location.pathname==='/maya'||location.pathname==='/maya/')return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">마야 달력을 열고 있어요.</p>}><Maya paymentSurface="toss" TossPrompt={verifiedReceipt?SavedMayaPrompt:MayaPrompt}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(/^\/dream\/psycho\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}>{recoveryBanner}{ready&&<Suspense fallback={<p role="status">꿈 상담실을 열고 있어요.</p>}><Dream/></Suspense>}</LazyMotion>;
 if(location.pathname.startsWith('/heukwol'))return <LazyMotion features={domAnimation}>{recoveryBanner}{ready?<Suspense fallback={<p role="status">흑월의 상담실을 열고 있어요.</p>}><Heukwol/></Suspense>:<p role="status">계정을 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/karma-destiny-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">운명의 업 상담을 열고 있어요.</p>}><Karma result={location.pathname.includes('/result')}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/new-year-ai-consultation'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">신년운세 상담을 열고 있어요.</p>}><NewYear paymentSurface="toss" ProfilePicker={NewYearProfile} TossPrice={NewYearPrice}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/ziwei-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">자미두수 상담을 열고 있어요.</p>}><Ziwei paymentSurface="toss" ProfilePicker={ZiweiProfile} TossPrice={ZiweiPrice}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/vedic-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">베다 상담을 열고 있어요.</p>}><Vedic paymentSurface="toss" ProfilePicker={VedicProfile} TossPrice={VedicPrice}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/sukuyo-compatibility-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">숙요점 상담을 열고 있어요.</p>}><Sukuyo/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/astrology-ai')){const Screen=location.pathname.includes('/result')?AstrologyResult:Astrology;return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">점성술 상담을 열고 있어요.</p>}><Screen paymentSurface="toss" {...(Screen===Astrology?{ProfilePicker:AstrologyProfile,TossPrice:AstrologyPrice}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/life-book-ai')){const Screen=location.pathname.includes('/result')?LifeBookResult:LifeBook;return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">인생의 책을 열고 있어요.</p>}><Screen {...(Screen===LifeBookResult?{paymentSurface:'toss'}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/love-secret-ai')){const Screen=location.pathname.includes('/result')?LoveSecretResult:LoveSecret;return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">연애 비책을 열고 있어요.</p>}><Screen {...(Screen===LoveSecretResult?{paymentSurface:'toss'}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(/^\/relationship-boundary-test\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">관계 리포트를 열고 있어요.</p>}><Relationship key={location.pathname+location.search}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(/^\/pet-saju\/?$/.test(location.pathname))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">반려동물 사주를 열고 있어요.</p>}><PetSaju/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/fusion-fortune'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">초융합 운세를 열고 있어요.</p>}><Fusion/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 const tea=location.pathname.startsWith('/fortune-tea-house');
 if(location.pathname.startsWith('/neo-operation-room')){
  const Screen=location.pathname.includes('/result')?NeoResult:location.pathname.includes('/strategy-books')?NeoBooks:Neo;
  return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">전략실을 열고 있어요.</p>}>{Screen===NeoResult?<NeoResult paymentSurface="toss" availability={SERVICE_AVAILABLE?undefined:releaseAvailability}/>:Screen===NeoBooks?<NeoBooks paymentSurface="toss"/>:<Screen/>}</Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 }
 if(location.pathname.startsWith('/records'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">기록을 불러오고 있어요.</p>}><Records showWebReception={false} refreshKey={recoveryEpoch} paymentSurface="toss"/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(tea){const params=new URLSearchParams(location.search),resultId=params.get('resultId'),consultation=params.get('consultation');const savedConsultation=/^[a-f0-9]{64}$/.test(consultation||'');const letter=params.get('counsel')==='letter'&&!params.get('session');return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">찻집을 열고 있어요.</p>}>{resultId?<SavedTea resultId={resultId} paymentSurface="toss"/>:letter?(consultation&&!savedConsultation?<p role="alert">상담 주소를 확인하지 못했어요. 기록 보관함에서 다시 열어 주세요.</p>:<LetterRoom key={params.get('persona')==='neo'?'neo':'yeoni'} persona={params.get('persona')==='neo'?'neo':'yeoni'} inputNotice={inputNotice} reviewOnly={reviewOnly} initialId={savedConsultation?consultation:''} initialOrderId={params.get('orderId')||''}/>):savedConsultation?<ConsultationRedirect href={'/result?id='+encodeURIComponent(consultation)}/>:<Tea paymentSurface="toss" TossPrice={TeaPrice}/>}</Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/login'))return <YeongnyangiLayout><section className={styles.consultation}>{recoveryBanner}<header className={styles.spiritIntro}><img src="/assets/yeongnyangi/original/login.webp" width={440} height={557} alt=""/><div><h1>토스로 상담 시작하기</h1><p>같은 토스 계정으로 저장한 상담을 다시 읽을 수 있어요.</p><button className={styles.primaryAction} disabled={busy||loginPending} onClick={async()=>{if(loginLock.current)return;loginLock.current=true;setLoginPending(true);const epoch=loginEpoch.current,start=location.pathname+location.search,current=()=>loginAlive.current&&epoch===loginEpoch.current&&start===location.pathname+location.search;setError('');setBusy(true);try{await login();if(!current())return;const user=await refreshAuth({force:true});if(!current())return;if(!user||!(user.id||user.userId||user._id||user.uid))throw Object.assign(new Error('SESSION_CHECK_FAILED'),{code:'SESSION_CHECK_FAILED'});let storage;try{storage=window.sessionStorage;}catch{}restoreConsultationDraft(storage,consultationDraft.current,location,user);restoreLetterDraft(storage,bootstrapDraft.current,{location,user});restoreTeaDraft(storage,bootstrapTeaDraft.current,{location,user});restoreSukuyoDraft(storage,bootstrapSukuyoDraft.current,{user});clearPendingAuthDrafts(storage,{letter:bootstrapDraft.current,tea:bootstrapTeaDraft.current,sukuyo:bootstrapSukuyoDraft.current},user);const next=new URLSearchParams(location.search).get('next')||'/yeongnyangi/fortune/';location.replace((/^\/(yeongnyangi|dream\/psycho|heukwol|fortune-tea-house|neo-operation-room|fusion-fortune|life-book-ai|love-secret-ai|relationship-boundary-test|pet-saju|astrology-ai|vedic-ai|ziwei-ai|new-year-ai-consultation|karma-destiny-ai|sukuyo-compatibility-ai|maya|tarot-library|saju\/(?:career-style|destiny-meeting-place)|saju-fpti|fpti|records|checkout)(\/|\?|$)/.test(next))?next:'/yeongnyangi/fortune/');}catch(error){if(current()){setError(loginFailure(error));setBusy(false);}}finally{loginLock.current=false;if(loginAlive.current)setLoginPending(false);}}}>{busy||loginPending?'로그인 중':'토스로 로그인하기'}</button>{error&&<p role="alert">{error}</p>}</div></header></section></YeongnyangiLayout>;
 const mode=new URLSearchParams(location.search).get('mode');
 if(location.pathname.startsWith('/yeongnyangi/fortune')&&['horary','prashna','spirit'].includes(mode))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}<YeongnyangiLayout>{ready&&<Suspense fallback={<p role="status">질문 점성술을 열고 있어요.</p>}><QuestionSky mode={mode==='horary'?'horary-v1':'prashna-v1'} paymentSurface="toss"/></Suspense>}</YeongnyangiLayout></LazyMotion>;
 const Screen=location.pathname.startsWith('/checkout')?PreparedCheckout:location.pathname.includes('/result')?Result:location.pathname.includes('/library')?Library:Consultation;
 return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}<YeongnyangiLayout>{ready?<Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}><Screen {...(Screen===Result||Screen===Library?{paymentSurface:"toss"}:Screen===Consultation?{sajuOnly:reviewOnly,inputNotice,paymentSurface:"toss"}:Screen===PreparedCheckout?{reviewOnly:true}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</YeongnyangiLayout></LazyMotion>;
}
