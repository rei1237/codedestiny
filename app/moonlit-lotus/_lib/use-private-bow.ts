"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {advance,newSession,type Session} from '../model-review/bow-session';
import {claimSession,readSession,saveSession} from './private-store';
import {resumeSaved,type StoredSession} from './session-policy';
import {kstTodayYmd} from '@/app/diary/_lib/kst-date';
export function usePrivateBow(scope:string){
 const [session,setSession]=useState<Session>(()=>newSession(''));
 const [ready,setReady]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const current=useRef(session),row=useRef<StoredSession>(),owner=useRef(''),generation=useRef(0),queue=useRef(Promise.resolve()),memory=useRef(false);
 const publish=useCallback((s:Session)=>{current.current=s;setSession(s);},[]);
 const persist=useCallback((s:Session,release=false,resetDay?:string)=>{
  const token=generation.current;
  queue.current=queue.current.then(async()=>{
   if(token!==generation.current||memory.current||!row.current)return;
   const saved=await saveSession(row.current,s,release,resetDay);
   if(token!==generation.current)return;
   if(saved)row.current=saved;
   else{row.current=undefined;publish({...current.current,status:current.current.status==='running'?'paused':current.current.status});setNotice('다른 탭에서 이어지고 있어요. 이 탭은 잠시 멈췄어요.');}
  }).catch(()=>{if(token===generation.current){publish({...current.current,status:'paused'});setNotice('기록을 저장하지 못해 잠시 멈췄어요. 저장 공간을 확인하고 다시 이어 주세요.');}});
  return queue.current;
 },[publish]);
 useEffect(()=>{
  const token=++generation.current;owner.current=crypto.randomUUID();row.current=undefined;memory.current=false;setReady(false);setNotice('');publish(newSession(''));
  readSession(scope).then(saved=>{if(token!==generation.current)return;if(saved)publish(resumeSaved(saved));setReady(true);}).catch(()=>{if(token!==generation.current)return;memory.current=true;setNotice('이 브라우저에서는 기록 저장이 어려워요. 현재 탭에서만 이용하며 새로고침하면 기록이 사라져요.');setReady(true);});
  return ()=>{
   generation.current++;
   const own=owner.current,final=current.current;
   // Next navigation need not dispatch pagehide. Flush only our still-owned session.
   void queue.current.then(async()=>{
    const latest=await readSession(scope);
    if(latest?.owner===own&&latest.session.sessionId===final.sessionId&&latest.session.completed<=final.completed){
     await saveSession(latest,{...final,status:final.status==='running'?'paused':final.status},true);
    }
   }).catch(()=>{/* Last successfully committed count remains authoritative. */});
  };
 },[scope,publish]);
 const pause=useCallback(()=>{
  const s=current.current;if(s.status!=='running')return;
  const next={...s,status:'paused' as const};publish(next);void persist(next,true);
 },[persist,publish]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)pause();};const leave=()=>pause();
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);};
 },[pause]);
 useEffect(()=>{
  if(session.status!=='running')return;
  let timer:ReturnType<typeof setTimeout>,previous=performance.now(),savedAt=performance.now();
  const tick=()=>{
   if(document.hidden){pause();return;}
   const now=performance.now(),old=current.current,next=advance(old,now-previous);previous=now;
   publish(next);
   if(next.completed!==old.completed||now-savedAt>=2500){savedAt=now;void persist(next,next.status==='complete');}
   if(next.status==='running')timer=setTimeout(tick,50);
  };
  timer=setTimeout(tick,50);return()=>clearTimeout(timer);
 },[session.status,pause,persist,publish]);
 const start=useCallback(async(resetTarget?:number)=>{
  if(!ready||busy)return;setBusy(true);const token=generation.current;
  try{
   await queue.current;
   let next=current.current;
   if(!next.sessionId)next=newSession(crypto.randomUUID(),next.target);
   if(resetTarget===undefined&&(next.status==='complete'||next.status==='stopped'))return;
   if(!memory.current){
    const claimed=await claimSession(scope,owner.current,next,kstTodayYmd());
    if(token!==generation.current)return;
    if(!claimed){setNotice('다른 탭에서 이 공간을 이용 중이에요. 그 탭에서 잠시 멈춘 뒤 이어 주세요.');return;}
    // Same tab pause preserves its exact position; another owner/reload restarts unfinished cycle.
    if(claimed.revision!==(row.current?.revision||-1)+1||claimed.session.sessionId!==next.sessionId||claimed.session.completed>next.completed)next=resumeSaved(claimed);
    row.current=claimed;
   }
   if(resetTarget!==undefined)next=newSession(crypto.randomUUID(),resetTarget);
   else if(next.status==='complete'||next.status==='stopped'){publish(next);await persist(next,true);return;}
   next={...next,status:resetTarget===undefined?'running':'ready'};
   publish(next);setNotice(memory.current?'현재 탭에서만 진행하고 있어요. 기록은 저장되지 않아요.':'');
   await persist(next,resetTarget!==undefined,resetTarget!==undefined?kstTodayYmd():undefined);
  }catch{if(token===generation.current)setNotice('기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');}
  finally{if(token===generation.current)setBusy(false);}
 },[scope,ready,busy,persist,publish]);
 const stop=useCallback(async()=>{
  const token=generation.current;await queue.current;
  if(!memory.current){
   try{const claimed=await claimSession(scope,owner.current,current.current,kstTodayYmd());if(token!==generation.current)return;
    if(!claimed){setNotice('다른 탭에서 진행 중인 기록은 이 탭에서 중단할 수 없어요.');return;}
    row.current=claimed;publish(resumeSaved(claimed));
   }catch{setNotice('기록을 저장하지 못했어요. 다시 시도해 주세요.');return;}
  }
  const next={...current.current,status:'stopped' as const,elapsed:0};publish(next);void persist(next,true);
 },[scope,persist,publish]);
 const speed=useCallback((value:number)=>{if(![.75,1,1.25].includes(value))return;const s=current.current;publish({...s,pendingSpeed:value,speed:s.elapsed===0?value:s.speed});},[publish]);
 return{session,ready,busy,notice,start:()=>start(),reset:(target:number)=>start(target),pause,stop,speed};
}
