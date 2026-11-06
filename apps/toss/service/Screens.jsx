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
import Checkout from './Checkout';
import YeongnyangiLayout from '@/app/yeongnyangi/layout';
import styles from '@/app/yeongnyangi/yeongnyangi.module.css';
import '@/styles/globals.css';
import '@/styles/theme-tokens.css';
import '@/styles/moonlit-birth-form.css';
import '@/styles/feature-marketing-detail.css';
import '@/app/yeongnyangi/night-tokens.css';

const Consultation=lazy(()=>import('@/app/yeongnyangi/_components/Consultation'));
const Result=lazy(()=>import('@/app/yeongnyangi/_components/Result'));
const Library=lazy(()=>import('@/app/yeongnyangi/_components/Library'));
const Tea=lazy(()=>import('@/src/features/fortune-tea-house/FortuneTeaHousePage'));
const LetterRoom=lazy(()=>import('./TossLetterRoom'));
const SavedTea=lazy(()=>import('@/app/fortune-tea-house/SavedTeaReading'));
const Neo=lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomPage'));
const NeoResult=lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomResultPage'));
const NeoBooks=lazy(()=>import('@/src/features/neo-war-room/NeoStrategyBooksPage'));
const LoveSecret=lazy(()=>import('./LoveSecret'));
const LoveSecretResult=lazy(()=>import('@/app/love-secret-ai/result/LoveSecretAiResultClient'));
const LifeBook=lazy(()=>import('./LifeBook'));
const LifeBookResult=lazy(()=>import('@/app/life-book-ai/result/LifeBookAiResultClient'));
const Fusion=lazy(()=>import('./Fusion'));
const Vedic=lazy(()=>import('@/app/vedic-ai/VedicAiClient'));
const Ziwei=lazy(()=>import('@/app/ziwei-ai/ZiweiAiClient'));
const NewYear=lazy(()=>import('@/app/new-year-ai-consultation/NewYearAiClient'));
const Karma=lazy(()=>import('./TossKarma'));
const Astrology=lazy(()=>import('@/app/astrology-ai/AstrologyAiClient'));
const AstrologyResult=lazy(()=>import('@/app/astrology-ai/result/AstrologyAiResultClient'));
const AstrologyProfile=lazy(()=>import('./TossAstrologyProfilePicker'));
const AstrologyPrice=lazy(()=>import('./TossAstrologyPrice'));
const Records=lazy(()=>import('@/app/records/RecordsClient'));
const Maya=lazy(()=>import('@/src/components/maya/MayaCalendarView'));
const MayaPrompt=lazy(()=>import('./TossMayaPrompt'));
function VedicProfile(props){return <AstrologyProfile {...props} calendarMode="lunar"/>;}
function VedicPrice(){return <AstrologyPrice featureKey="vedic-ai-consultation"/>;}
function ZiweiProfile(props){return <AstrologyProfile {...props} calendarMode="native-lunar"/>;}
function ZiweiPrice(){return <AstrologyPrice featureKey="ziwei-ai-consultation"/>;}
function NewYearProfile(props){return <AstrologyProfile {...props} calendarMode="lunar"/>;}
function NewYearPrice(){return <AstrologyPrice featureKey="new-year-ai-consultation"/>;}
const releaseAvailability={title:'출시 준비 중',message:'상품 등록과 검수가 완료되면 토스에서 상담 결과를 생성하고 보관할 수 있어요.',action:{href:'/neo-operation-room/',label:'전략실 둘러보기'}};
let installed=false;
function install(){if(installed)return;installed=true;window.fetch=createServiceFetch({nativeFetch:window.fetch.bind(window),send:canonicalResponse,origin:location.origin});}
function PreparedCheckout(){
 const [row,setRow]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();const id=new URLSearchParams(location.search).get('requestId');
  if(!/^[a-f0-9]{64}$/.test(id||'')){setError('상담 입력 화면에서 다시 시작해 주세요.');return;}
  void canonicalResponse('/canonical/yeongnyangi/requests/'+id,new Request(location.origin,{signal:controller.signal})).then(async response=>{
   if(!response.ok)throw Object.assign(new Error('REQUEST_FAILED'),{status:response.status});const data=await response.json();if(!data.fortune)throw new Error();
   if(controller.signal.aborted)return;
   if(data.fortune.paid===true){location.replace('/yeongnyangi/result/?id='+encodeURIComponent(id));return;}
   setRow(data.fortune);
  }).catch(error=>{if(!controller.signal.aborted)setError((error?.status===403||error?.code==='ACCESS_DENIED')?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':(error?.status===401||['SESSION_EXPIRED','LOGIN_REQUIRED'].includes(error?.code))?'기록과 구매를 확인하려면 토스 로그인이 필요해요.':'상담을 불러오지 못했어요. 다시 열어 주세요.');});return()=>controller.abort();
 },[]);
 return error?<p role="alert">{error}</p>:row?<Checkout draft={{product:row.product,question:row.consultation?.question,chapters:row.manifest.length,ready:row.state==='CREATED'||row.paid,onPrepare:async()=>row}}/>:<p role="status">상담을 확인하고 있어요.</p>;
}
function ConsultationRedirect({href}){
 const routed=useRef(false);
 useEffect(()=>{if(routed.current)return;routed.current=true;location.replace(href);},[href]);
 return <p role="status">상담을 열고 있어요.</p>;
}
export default function ServiceScreens(){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[recoveryMessage,setRecoveryMessage]=useState(''),[recoveryEpoch,setRecoveryEpoch]=useState(0);
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
 useEffect(()=>{install();let live=true;const offSession=onSessionInvalidated(()=>handleSessionInvalidated({redirect:false}));clearClientAuthState();const showError=error=>{if(!live||error?.code==='SESSION_CHANGED')return;if(error?.status===401)clearClientAuthState();if(SERVICE_AVAILABLE)setRecoveryMessage((error?.status===403||error?.code==='ACCESS_DENIED')?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(error?.code)?'현재 토스 앱에서는 구매 복구를 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.':'구매 내역을 확인하지 못했어요. 추가 결제 전에 로그인과 연결 상태를 확인해 주세요.');};void restoreSession().then(async authenticated=>{if(!authenticated)return;await refreshAuth({force:true});if(live)setReady(true);try{const notice=await recoverAfterAuthentication(true);if(live&&notice)setRecoveryMessage(notice);}catch(error){showError(error);}finally{if(live)setRecoveryEpoch(value=>value+1);}}).catch(showError).finally(()=>{if(live)setReady(true);});return()=>{live=false;offSession();};},[]);
 const recoveryBanner=recoveryMessage?<div role="status"><p>{recoveryMessage}</p><a href="/recovery">구매 내역 복구하기</a></div>:null;
 if(location.pathname==='/maya'||location.pathname==='/maya/')return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">마야 달력을 열고 있어요.</p>}><Maya paymentSurface="toss" TossPrompt={MayaPrompt}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/karma-destiny-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">운명의 업 상담을 열고 있어요.</p>}><Karma result={location.pathname.includes('/result')}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/new-year-ai-consultation'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">신년운세 상담을 열고 있어요.</p>}><NewYear paymentSurface="toss" ProfilePicker={NewYearProfile} TossPrice={NewYearPrice}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/ziwei-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">자미두수 상담을 열고 있어요.</p>}><Ziwei paymentSurface="toss" ProfilePicker={ZiweiProfile} TossPrice={ZiweiPrice}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/vedic-ai'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">베다 상담을 열고 있어요.</p>}><Vedic paymentSurface="toss" ProfilePicker={VedicProfile} TossPrice={VedicPrice}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/astrology-ai')){const Screen=location.pathname.includes('/result')?AstrologyResult:Astrology;return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">점성술 상담을 열고 있어요.</p>}><Screen paymentSurface="toss" {...(Screen===Astrology?{ProfilePicker:AstrologyProfile,TossPrice:AstrologyPrice}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/life-book-ai')){const Screen=location.pathname.includes('/result')?LifeBookResult:LifeBook;return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">인생의 책을 열고 있어요.</p>}><Screen {...(Screen===LifeBookResult?{paymentSurface:'toss'}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/love-secret-ai')){const Screen=location.pathname.includes('/result')?LoveSecretResult:LoveSecret;return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">연애 비책을 열고 있어요.</p>}><Screen {...(Screen===LoveSecretResult?{paymentSurface:'toss'}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/fusion-fortune'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">초융합 운세를 열고 있어요.</p>}><Fusion/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 const tea=location.pathname.startsWith('/fortune-tea-house');
 if(location.pathname.startsWith('/neo-operation-room')){
  const Screen=location.pathname.includes('/result')?NeoResult:location.pathname.includes('/strategy-books')?NeoBooks:Neo;
  return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">전략실을 열고 있어요.</p>}>{Screen===NeoResult?<NeoResult paymentSurface="toss" availability={SERVICE_AVAILABLE?undefined:releaseAvailability}/>:<Screen/>}</Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 }
 if(location.pathname.startsWith('/records'))return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">기록을 불러오고 있어요.</p>}><Records showWebReception={false} refreshKey={recoveryEpoch} paymentSurface="toss"/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(tea){const params=new URLSearchParams(location.search),resultId=params.get('resultId'),consultation=params.get('consultation');const savedConsultation=/^[a-f0-9]{64}$/.test(consultation||'');const letter=params.get('counsel')==='letter'&&!params.get('session');return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}{ready?<Suspense fallback={<p role="status">찻집을 열고 있어요.</p>}>{resultId?<SavedTea resultId={resultId} paymentSurface="toss"/>:letter?(consultation&&!savedConsultation?<p role="alert">상담 주소를 확인하지 못했어요. 기록 보관함에서 다시 열어 주세요.</p>:<LetterRoom initialId={savedConsultation?consultation:''} initialOrderId={params.get('orderId')||''}/>):savedConsultation?<ConsultationRedirect href={'/result?id='+encodeURIComponent(consultation)}/>:<Tea paymentSurface="toss"/>}</Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;}
 if(location.pathname.startsWith('/login'))return <YeongnyangiLayout><section className={styles.consultation}>{recoveryBanner}<header className={styles.spiritIntro}><img src="/assets/yeongnyangi/original/login.webp" width={440} height={557} alt=""/><div><h1>토스로 상담 시작하기</h1><p>같은 토스 계정으로 저장한 상담을 다시 읽을 수 있어요.</p><button className={styles.primaryAction} disabled={busy} onClick={async()=>{setBusy(true);try{await login();const next=new URLSearchParams(location.search).get('next')||'/yeongnyangi/fortune/';location.replace((/^\/(yeongnyangi|fortune-tea-house|neo-operation-room|fusion-fortune|life-book-ai|love-secret-ai|astrology-ai|vedic-ai|ziwei-ai|new-year-ai-consultation|karma-destiny-ai|maya|tarot-library|records|checkout)(\/|\?|$)/.test(next))?next:'/yeongnyangi/fortune/');}catch{setError('로그인을 완료하지 못했어요. 출시 상태와 연결을 확인한 뒤 다시 시도해 주세요.');setBusy(false);}}}>{busy?'로그인 중':'토스로 로그인하기'}</button>{error&&<p role="alert">{error}</p>}</div></header></section></YeongnyangiLayout>;
 const Screen=location.pathname.startsWith('/checkout')?PreparedCheckout:location.pathname.includes('/result')?Result:location.pathname.includes('/library')?Library:Consultation;
 return <LazyMotion features={domAnimation}><ToastProvider/>{recoveryBanner}<YeongnyangiLayout>{ready?<Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}><Screen {...(Screen===Result||Screen===Library?{paymentSurface:"toss"}:{})}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</YeongnyangiLayout></LazyMotion>;
}
