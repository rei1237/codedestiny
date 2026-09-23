"use client";
import {readingArtwork} from './ReadingIdentity';
import {useCallback,useEffect,useRef,useState} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,type FortuneSummary,type FortunePage} from '../_lib/api';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import styles from '../yeongnyangi.module.css';
export default function Library(){
 const [cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const [rows,setRows]=useState<FortuneSummary[]|null>(null),[error,setError]=useState(''),[needsLogin,setNeedsLogin]=useState(false);
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
   setError(reason instanceof Error?reason.message:'상담 기록을 불러오지 못했어요. 다시 시도해 주세요.');
  }finally{if(version===revision.current){active.current=null;setLoading(false);}}
 },[]);
 useEffect(()=>{
  const reset=()=>{revision.current++;active.current?.abort();active.current=null;setRows(null);setCursor(null);retryAt.current=0;void load();};
  const storage=(event:StorageEvent)=>{if(event.key===null||['fortune_auth_user','fortune_auth_token','cdToken'].includes(event.key))reset();};
  void load();window.addEventListener('cd:auth-changed',reset);window.addEventListener('storage',storage);
  return()=>{revision.current++;active.current?.abort();window.removeEventListener('cd:auth-changed',reset);window.removeEventListener('storage',storage);};
 },[load]);
 function retry(){if(Date.now()<retryAt.current){setError('잠시 후 다시 불러와 주세요.');return;}void load(rows?cursor:null);}
 return <section className={styles.consultation}><p className={styles.eyebrow}>CODE DESTINY 계정에 보관된 이야기</p><h1>내 상담 기록</h1>
  {rows===null&&loading&&<p role="status">기록을 불러오고 있어요.</p>}{rows?.length===0&&<p>아직 상담 기록이 없어요. 영냥이에게 첫 이야기를 들려줘.</p>}
  <div className={styles.library}>{rows?.map(row=><a key={row.id} href={`${resultPath(row.id)}&source=library`}><img src={readingArtwork(row.product)} width={120} height={80} loading="lazy" alt=""/><div><h2>{row.kindLabel||row.product.name} · {row.product.fishName}</h2><p>{new Date(row.createdAt).toLocaleDateString('ko-KR')} · {row.state==='REFUNDED'?'환불된 상담':row.state==='COMPLETED'?'결과 보기':row.paid?'상담 이어가기':'결제 확인하기'}</p></div></a>)}</div>
  {cursor&&!error&&<button disabled={loading} onClick={()=>void load(cursor)}>{loading?'불러오는 중':'이전 상담 더 보기'}</button>}
  {error&&<div role="alert"><p>{error}</p>{needsLogin?<button onClick={loginForCurrentPage}>로그인하고 기록 보기</button>:<button disabled={loading} onClick={retry}>{loading?'불러오는 중':'다시 불러오기'}</button>}</div>}
  <a href="/yeongnyangi/fortune/">새 상담 고르기</a>
 </section>;
}
