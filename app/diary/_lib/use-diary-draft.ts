"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readRecoveredDraft, rememberDraft, forgetDraft } from "./draft-recovery";
const DIARY_DRAFT_DELAY_MS = 600;
// Failed local writes survive navigation within the app; successful writes remove the recovery copy.
export interface DiaryDraft {
  value: string;
  onChange: (next:string)=>void;
  flush: ()=>boolean;
  status: "idle" | "pending" | "saved" | "error";
}
export function useDiaryDraft(stored:string, commit:(next:string)=>boolean | void, draftKey?:string):DiaryDraft {
  const [value,setValue]=useState(()=>(draftKey ? readRecoveredDraft(draftKey) : undefined) ?? stored);
  const [status,setStatus]=useState<DiaryDraft["status"]>("idle");
  const valueRef=useRef(value);
  valueRef.current=value;
  const committedRef=useRef(stored);
  const commitRef=useRef(commit);
  commitRef.current=commit;
  const pendingRef=useRef<((next:string)=>boolean | void)|null>(null);
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const flush=useCallback(()=>{
    if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
    if(valueRef.current===committedRef.current)return true;
    const pending=pendingRef.current||commitRef.current;
    let ok=false;
    try{ok=pending(valueRef.current)!==false;}catch{ok=false;}
    if(!ok){
      if(draftKey)rememberDraft(draftKey,valueRef.current);
      pendingRef.current=pending;
      setStatus("error");
      return false;
    }
    committedRef.current=valueRef.current;
    pendingRef.current=null;
    if(draftKey)forgetDraft(draftKey);
    setStatus("saved");
    return true;
  },[draftKey]);
  const flushRef=useRef(flush);
  flushRef.current=flush;
  useEffect(()=>{
    if(stored===committedRef.current)return;
    if(!flushRef.current())return;
    committedRef.current=stored;
    valueRef.current=stored;
    setValue(stored);
  },[stored]);
  const onChange=useCallback((next:string)=>{
    setValue(next);valueRef.current=next;pendingRef.current=commitRef.current;
    setStatus("pending");
    if(draftKey)rememberDraft(draftKey,next);
    if(timerRef.current)clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>{timerRef.current=null;flushRef.current();},DIARY_DRAFT_DELAY_MS);
  },[draftKey]);
  useEffect(()=>{
    const flushPending=()=>{flushRef.current();};
    window.addEventListener("pagehide",flushPending);
    window.addEventListener("cd:diary-flush",flushPending);
    return()=>{window.removeEventListener("pagehide",flushPending);window.removeEventListener("cd:diary-flush",flushPending);flushPending();};
  },[]);
  return {value,onChange,flush,status};
}
