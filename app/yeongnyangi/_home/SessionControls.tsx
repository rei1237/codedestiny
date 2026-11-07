"use client";
import Image from "next/image";
import {useState,useEffect,useCallback} from 'react';
import {authFetch,logoutWithServer} from '@/app/_lib/auth-client';
import {loginHref} from './service-links';
import {useReadingLanguage} from '../_lib/use-reading-language';
import {accountLocaleCopy} from '../_lib/account-locale-copy';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import {chromeCopy} from '../_lib/chrome-copy';

/** The original account control uses CODE DESTINY's existing session and logout. */
export default function SessionControls({compact=false,onLogin}:{compact?:boolean;onLogin?:()=>void}){
 const {siteLocale}=useReadingLanguage(),copy=accountLocaleCopy[siteLocale],input=consultationInputCopy(siteLocale),chrome=chromeCopy(siteLocale);
 const [status,setStatus]=useState(0),[name,setName]=useState(''),[open,setOpen]=useState(false),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  try{const response=await authFetch('/api/auth/me');const data=await response.json();
   if(response.status===401||data.authenticated===false){setStatus(401);return;}
   if(!response.ok||!data.user)throw new Error('session unavailable');
   setName(data.user.name||data.user.displayName||'');setStatus(200);
  }catch{setStatus(503);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function logout(){try{await logoutWithServer();window.location.assign('/yeongnyangi/');}catch{setError(copy.logoutFailed);}}
 return <div className={'session-controls '+(compact?'session-compact':'')} data-session-status={status}>
  {status===0?<span role="status">{copy.checking}</span>:status===200?<><button className="session-account" type="button" aria-label={name?`${name}${siteLocale==='ko'?'님':''} · ${copy.signedIn}`:copy.signedIn} title={compact&&name?`${name}${siteLocale==='ko'?'님':''} · ${copy.signedIn}`:undefined} aria-expanded={open} onClick={()=>setOpen(!open)}><Image src="/assets/yeongnyangi/original/hero-480.webp" alt="" width="32" height="32"/>{!compact&&name?`${name}${siteLocale==='ko'?'님':''} · `:''}{copy.signedIn}</button>{open&&<nav className="session-menu" aria-label={copy.account}><a href={siteLocale==='ko'?'/yeongnyangi/library/':`/yeongnyangi/library/?lang=${siteLocale}`}>{siteLocale==='ko'?'나의 보관함':chrome.library}</a><a href="/">CODE DESTINY</a><button type="button" onClick={logout}>{copy.logout}</button></nav>}</>:status===401?<button type="button" onClick={()=>onLogin?onLogin():window.location.assign(loginHref(window.location.pathname+window.location.search))}>{siteLocale==='ko'?'로그인':input.loginContinue}</button>:<><span role="status">{siteLocale==='ko'?'확인하지 못했어요':input.consultationError}</span><button type="button" onClick={()=>void refresh()}>{siteLocale==='ko'?'다시 확인':input.retry}</button></>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
