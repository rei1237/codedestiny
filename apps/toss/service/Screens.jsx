import React,{lazy,Suspense,useEffect,useState} from 'react';
import {LazyMotion,domAnimation} from 'framer-motion';
import {SafeArea,graniteEvent} from '@apps-in-toss/web-framework';
import {ToastProvider} from '@/app/components/Toast';
import {clearClientAuthState} from '@/app/_lib/auth-client';
import {refreshAuth} from '@/app/_lib/auth-store';
import {SERVICE_AVAILABLE} from '../src/release';
import {canonicalResponse,restoreSession,login,isToss} from '../src/platform';
import {createServiceFetch} from './transport.mjs';
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
const SavedTea=lazy(()=>import('@/app/fortune-tea-house/SavedTeaReading'));
const Neo=lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomPage'));
const NeoResult=lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomResultPage'));
const NeoBooks=lazy(()=>import('@/src/features/neo-war-room/NeoStrategyBooksPage'));
const Records=lazy(()=>import('@/app/records/RecordsClient'));
const releaseAvailability={title:'출시 준비 중',message:'상품 등록과 검수가 완료되면 토스에서 상담 결과를 생성하고 보관할 수 있어요.',action:{href:'/neo-operation-room/',label:'전략실 둘러보기'}};
let installed=false;
function install(){if(installed)return;installed=true;window.fetch=createServiceFetch({nativeFetch:window.fetch.bind(window),send:canonicalResponse,origin:location.origin});}
function PreparedCheckout(){
 const [row,setRow]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();const id=new URLSearchParams(location.search).get('requestId');
  if(!/^[a-f0-9]{64}$/.test(id||'')){setError('상담 입력 화면에서 다시 시작해 주세요.');return;}
  void canonicalResponse('/canonical/yeongnyangi/requests/'+id,new Request(location.origin,{signal:controller.signal})).then(async response=>{const data=await response.json();if(!response.ok||!data.fortune)throw new Error();setRow(data.fortune);}).catch(()=>{if(!controller.signal.aborted)setError('상담을 불러오지 못했어요. 다시 열어 주세요.');});return()=>controller.abort();
 },[]);
 return error?<p role="alert">{error}</p>:row?<Checkout draft={{product:row.product,question:row.consultation?.question,chapters:row.manifest.length,ready:row.state==='CREATED'||row.paid,onPrepare:async()=>row}}/>:<p role="status">상담을 확인하고 있어요.</p>;
}
export default function ServiceScreens(){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!isToss())return;
  const area=({bottom})=>document.documentElement.style.setProperty('--toss-service-bottom',`${bottom}px`);
  area(SafeArea.get());
  const offArea=SafeArea.subscribe({onEvent:area});
  const offBack=graniteEvent.addEventListener('backEvent',{onEvent:()=>{
   const previous=document.referrer&&new URL(document.referrer);
   if(previous?.origin===location.origin&&history.length>1)history.back();else location.assign('/');
  }});
  const offHome=graniteEvent.addEventListener('homeEvent',{onEvent:()=>location.assign('/')});
  return()=>{offArea();offBack();offHome();document.documentElement.style.removeProperty('--toss-service-bottom');};
 },[]);
 useEffect(()=>{install();let live=true;clearClientAuthState();void restoreSession().then(authenticated=>authenticated?refreshAuth({force:true}):undefined).catch(()=>{}).finally(()=>{if(live)setReady(true);});return()=>{live=false;};},[]);
 const tea=location.pathname.startsWith('/fortune-tea-house');
 if(location.pathname.startsWith('/neo-operation-room')){
  const Screen=location.pathname.includes('/result')?NeoResult:location.pathname.includes('/strategy-books')?NeoBooks:Neo;
  return <LazyMotion features={domAnimation}><ToastProvider/>{ready?<Suspense fallback={<p role="status">전략실을 열고 있어요.</p>}>{Screen===NeoResult?<NeoResult availability={SERVICE_AVAILABLE?undefined:releaseAvailability}/>:<Screen/>}</Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 }
 if(location.pathname.startsWith('/records'))return <LazyMotion features={domAnimation}><ToastProvider/>{ready?<Suspense fallback={<p role="status">기록을 불러오고 있어요.</p>}><Records showWebReception={false}/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(tea)return <LazyMotion features={domAnimation}><ToastProvider/>{ready?<Suspense fallback={<p role="status">찻집을 열고 있어요.</p>}>{new URLSearchParams(location.search).get('resultId')?<SavedTea resultId={new URLSearchParams(location.search).get('resultId')}/>:<Tea/>}</Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</LazyMotion>;
 if(location.pathname.startsWith('/login'))return <YeongnyangiLayout><section className={styles.consultation}><header className={styles.spiritIntro}><img src="/assets/yeongnyangi/original/login.webp" width={440} height={557} alt=""/><div><h1>토스로 상담 시작하기</h1><p>같은 토스 계정으로 저장한 상담을 다시 읽을 수 있어요.</p><button className={styles.primaryAction} disabled={busy} onClick={async()=>{setBusy(true);try{await login();const next=new URLSearchParams(location.search).get('next')||'/yeongnyangi/fortune/';location.replace((/^\/(yeongnyangi|fortune-tea-house|neo-operation-room|records|checkout)(\/|\?|$)/.test(next))?next:'/yeongnyangi/fortune/');}catch{setError('로그인을 완료하지 못했어요. 출시 상태와 연결을 확인한 뒤 다시 시도해 주세요.');setBusy(false);}}}>{busy?'로그인 중':'토스로 로그인하기'}</button>{error&&<p role="alert">{error}</p>}</div></header></section></YeongnyangiLayout>;
 const Screen=location.pathname.startsWith('/checkout')?PreparedCheckout:location.pathname.includes('/result')?Result:location.pathname.includes('/library')?Library:Consultation;
 return <LazyMotion features={domAnimation}><ToastProvider/><YeongnyangiLayout>{ready?<Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}><Screen/></Suspense>:<p role="status">로그인 상태를 확인하고 있어요.</p>}</YeongnyangiLayout></LazyMotion>;
}
