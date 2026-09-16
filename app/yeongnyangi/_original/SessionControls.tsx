"use client";
import Image from "next/image";
import {useState,useEffect,useCallback} from 'react';
import {authFetch,logoutWithServer} from '@/app/_lib/auth-client';
import {loginHref} from './service-links';

/** The original account control uses CODE DESTINY's existing session and logout. */
export default function SessionControls({compact=false,onLogin}:{compact?:boolean;onLogin?:()=>void}){
 const [status,setStatus]=useState(0),[name,setName]=useState(''),[open,setOpen]=useState(false),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  try{const response=await authFetch('/api/auth/me');const data=await response.json();
   if(response.status===401||data.authenticated===false){setStatus(401);return;}
   if(!response.ok||!data.user)throw new Error('session unavailable');
   setName(data.user.name||data.user.displayName||'');setStatus(200);
  }catch{setStatus(503);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function logout(){try{await logoutWithServer();window.location.assign('/yeongnyangi/');}catch{setError('로그아웃하지 못했어요. 다시 시도해 주세요.');}}
 return <div className={'session-controls '+(compact?'session-compact':'')} data-session-status={status}>
  {status===0?<span role="status">로그인 확인 중</span>:status===200?<><button className="session-account" type="button" aria-label={name?name+'님 · 로그인됨':'로그인됨'} title={compact&&name?name+'님 · 로그인됨':undefined} aria-expanded={open} onClick={()=>setOpen(!open)}><Image src="/assets/yeongnyangi/original/hero-480.webp" alt="" width="32" height="32"/>{!compact&&name?name+'님 · ':''}로그인됨</button>{open&&<nav className="session-menu" aria-label="내 계정"><a href="/yeongnyangi/library/">나의 보관함</a><a href="/">CODE DESTINY</a><button type="button" onClick={logout}>로그아웃</button></nav>}</>:status===401?<button type="button" onClick={()=>onLogin?onLogin():window.location.assign(loginHref(window.location.pathname+window.location.search))}>로그인</button>:<><span role="status">확인하지 못했어요</span><button type="button" onClick={()=>void refresh()}>다시 확인</button></>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
