"use client";
// 삼배 진행. 메모리 세션만 쓰고 sessions 저장소(108배 진행 세션)는 절대 건드리지 않는다.
// 세 번째 주기가 끝나면 records 에 bow 기록을 한 번만 남긴다.
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '../model-review/bow-session';
import {writeRecord} from '../_lib/private-store';
import {kstTodayYmd} from '@/app/diary/_lib/kst-date';
import {createRitualBow,ritualBowSpeed,stepRitualBow,tapRitualBow} from './ritual-bow';
export type BowSave='idle'|'saved'|'failed';
export function useRitualBow(scope:string,speed:number){
 const [session,setSession]=useState<Session>(()=>createRitualBow('pending',speed));
 const [save,setSave]=useState<BowSave>('idle');
 const current=useRef(session),written=useRef(false);
 const publish=useCallback((next:Session)=>{current.current=next;setSession(next);},[]);
 useEffect(()=>{publish(createRitualBow(crypto.randomUUID(),current.current.pendingSpeed));written.current=false;setSave('idle');},[scope,publish]);
 useEffect(()=>{publish(ritualBowSpeed(current.current,speed));},[speed,publish]);
 useEffect(()=>{
  if(session.status!=='running')return;
  let timer:ReturnType<typeof setTimeout>,previous=performance.now();
  const tick=()=>{
   const now=performance.now(),delta=now-previous;previous=now;
   // 숨김 탭에서는 시간을 흘려보내지 않는다(advance 도 250ms 넘는 간격은 버린다).
   if(!document.hidden)publish(stepRitualBow(current.current,delta));
   if(current.current.status==='running')timer=setTimeout(tick,50);
  };
  timer=setTimeout(tick,50);return()=>clearTimeout(timer);
 },[session.status,publish]);
 useEffect(()=>{
  if(session.status!=='complete'||written.current)return;
  written.current=true;
  const now=Date.now();
  writeRecord({id:scope+'|bow|'+session.sessionId,scope,kind:'bow',day:kstTodayYmd(),createdAt:now,updatedAt:now,text:'',completed:session.completed,target:session.target})
   .then(ok=>setSave(ok?'saved':'failed'),()=>setSave('failed'));
 },[session.status,session.sessionId,session.completed,session.target,scope]);
 const tap=useCallback(()=>publish(tapRitualBow(current.current)),[publish]);
 return {session,tap,save};
}
