"use client";
import {OrderLookup} from './OrderRecovery';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import {readingLanguageNames,readingLocales,readingLocale,type ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {readingArtwork} from './ReadingIdentity';
import {useCallback,useEffect,useRef,useState} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,type FortuneSummary,type FortunePage} from '../_lib/api';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import styles from '../yeongnyangi.module.css';
const ART={login:['/assets/yeongnyangi/original/login.webp',440,557],signup:['/assets/yeongnyangi/original/signup.webp',440,445],hero:['/assets/yeongnyangi/hero.webp',480,480]} as const;
export default function Library(){
 const [locale,setLocale]=useState<ReadingLocale>('ko');
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('lang')||getCurrentLoadingLocale();if(readingLocales.includes(value as ReadingLocale))setLocale(readingLocale(value));},[]);
 const copy=readingCopy(locale),stateCopy=resultStateCopy(locale);
 const [cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const [rows,setRows]=useState<FortuneSummary[]|null>(null),[error,setError]=useState(''),[needsLogin,setNeedsLogin]=useState(false);
 const [recovering,setRecovering]=useState(''),[recoverError,setRecoverError]=useState<{id:string;message:string}|null>(null);
 const active=useRef<AbortController|null>(null),revision=useRef(0),retryAt=useRef(0);
 const load=useCallback(async(next:string|null=null)=>{
  if(next&&active.current)return;
  active.current?.abort();const controller=new AbortController();active.current=controller;
  const version=++revision.current,scope=readDestinyProfileAccountId();
  const current=()=>version===revision.current&&!controller.signal.aborted&&scope===readDestinyProfileAccountId();
  setLoading(true);setError('');setNeedsLogin(false);
  try{
   const path=`requests${next?`?cursor=${encodeURIComponent(next)}`:''}`;
   let data:FortunePage;
   try{data=await fortuneApi<FortunePage>(path,undefined,{signal:controller.signal});}
   catch(reason){
    if(!(reason instanceof FortuneApiError)||!reason.retryable||reason.retryAfterSeconds>0||reason.code==='REQUEST_TIMEOUT'||!current())throw reason;
    data=await fortuneApi<FortunePage>(path,undefined,{signal:controller.signal});
   }
   if(!current())return;
   setRows(previous=>next?[...new Map([...(previous||[]),...data.fortunes].map(row=>[row.id,row])).values()]:data.fortunes);
   setCursor(data.nextCursor);
  }catch(reason){
   if(!current())return;
   if(reason instanceof FortuneApiError&&reason.status===401)setNeedsLogin(true);
   retryAt.current=Date.now()+(reason instanceof FortuneApiError?reason.retryAfterSeconds*1000:0);
   setError(reason instanceof FortuneApiError&&reason.code==='REQUEST_TIMEOUT'?'응답이 늦어지고 있어요. 잠시 후 다시 불러와 주세요.':reason instanceof Error?reason.message:'상담 기록을 불러오지 못했어요. 다시 시도해 주세요.');
  }finally{if(version===revision.current){active.current=null;setLoading(false);}}
 },[]);
 useEffect(()=>{
  // auth-client 는 refresh 가 실패한 뒤에야 logout 을 발행한다. 여기서 다시 조회하면 401→refresh→logout 이 끝없이 돈다.
  const reset=(event?:Event)=>{
   revision.current++;active.current?.abort();active.current=null;setRows(null);setCursor(null);retryAt.current=0;
   const detail=event instanceof CustomEvent?(event.detail as Record<string,unknown>|null):null;
   if(String(detail?.event||'').toLowerCase()==='logout'){setLoading(false);setError('');setNeedsLogin(true);return;}
   void load();
  };
  const storage=(event:StorageEvent)=>{if(event.key===null||['fortune_auth_user','fortune_auth_token','cdToken'].includes(event.key))reset();};
  void load();window.addEventListener('cd:auth-changed',reset);window.addEventListener('storage',storage);
  return()=>{revision.current++;active.current?.abort();window.removeEventListener('cd:auth-changed',reset);window.removeEventListener('storage',storage);};
 },[load]);
 function retry(){if(Date.now()<retryAt.current){setError('잠시 후 다시 불러와 주세요.');return;}void load(rows?cursor:null);}
 // The same server retry as the result page; the result page then shows the chapters as they are saved.
 async function recover(row:FortuneSummary){
  if(recovering)return;setRecovering(row.id);setRecoverError(null);
  try{await fortuneApi(`requests/${row.id}/generate`,{});window.location.assign(`${resultPath(row.id,row.locale)}&source=library`);}
  catch(reason){
   if(reason instanceof FortuneApiError&&reason.status===401){loginForCurrentPage();return;}
   setRecoverError({id:row.id,message:locale!=='ko'||!(reason instanceof Error)?stateCopy.generateFailed:reason.message});setRecovering('');void load();
  }
 }
 const scene=needsLogin?'login':rows?.length||error?'hero':'signup',[art,artWidth,artHeight]=ART[scene];
 return <section className={styles.consultation}><header className={styles.spiritIntro}><img className={scene==='signup'?styles.libraryFade:undefined} src={art} width={artWidth} height={artHeight} alt=""/><div className={styles.libraryIntro}><p className={styles.eyebrow}>CODE DESTINY 계정에 보관된 이야기</p><h1>{copy.library}</h1>
  {needsLogin?<div role="alert"><p>{copy.loginHint}</p><button onClick={loginForCurrentPage}>{copy.login}</button></div>:rows===null&&loading?<p role="status">{copy.loading}</p>:rows?.length===0&&<p>{copy.empty}</p>}</div></header>
  <OrderLookup locale={locale}/>
  <div className={styles.library}>{rows?.map(row=><div key={row.id} className={styles.libraryItem}><a href={`${resultPath(row.id,row.locale)}&source=library`}><img src={readingArtwork(row.product)} width={120} height={80} loading="lazy" alt=""/><div><h2>{row.kindLabel||row.product.name} · {row.product.fishName}</h2><p>{new Date(row.createdAt).toLocaleDateString(locale)} · {row.state==='REFUNDED'?copy.refunded:row.state==='COMPLETED'?copy.view:row.paid?row.recovering?copy.recoveringItems(row.completedChapters||0,row.totalChapters||row.product.chapterCount):copy.continue:copy.checkout}</p><p>{copy.language}: {readingLanguageNames[row.locale || 'ko']}</p></div></a>
   {row.canRetry&&<button className={styles.retryButton} disabled={Boolean(recovering)} onClick={()=>void recover(row)}>{recovering===row.id?stateCopy.recovering:copy.recovery}</button>}
   {recoverError?.id===row.id&&<p role="alert">{recoverError.message}</p>}</div>)}</div>
  {cursor&&!error&&<button disabled={loading} onClick={()=>void load(cursor)}>{loading?'불러오는 중':'이전 상담 더 보기'}</button>}
  {error&&!needsLogin&&<div role="alert"><p>{error}</p><button disabled={loading} onClick={retry}>{loading?'불러오는 중':'다시 불러오기'}</button></div>}
  <a href="/yeongnyangi/fortune/">새 상담 고르기</a>
 </section>;
}
