"use client";
import Image from "next/image";
import {useState,useEffect,useCallback} from 'react';
import {authFetch,hasMobileAppRefreshToken,logoutWithServer} from '@/app/_lib/auth-client';
import {hasClientAuthHint} from '@/app/_lib/user-session-cache';
import {loginHref,signupHref} from './service-links';
import {useTPick} from '@/lib/i18n/useT';
import {useReadingLanguage} from '../_lib/use-reading-language';
import {accountLocaleCopy} from '../_lib/account-locale-copy';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import {chromeCopy} from '../_lib/chrome-copy';

/** The original account control uses CODE DESTINY's existing session and logout. */
export default function SessionControls({compact=false,onChoose}:{compact?:boolean;onChoose?:(mode:'login'|'signup')=>void}){
 const {siteLocale}=useReadingLanguage(),copy=accountLocaleCopy[siteLocale],input=consultationInputCopy(siteLocale),chrome=chromeCopy(siteLocale);
 const [status,setStatus]=useState(0),[name,setName]=useState(''),[open,setOpen]=useState(false),[error,setError]=useState('');
 const tr=useTPick(undefined,'ko');
 const returnTo=typeof window==='undefined'?'/yeongnyangi/':window.location.pathname+window.location.search+window.location.hash;
 const loginText=tr('auth.login',siteLocale==='ko'?'로그인':input.loginContinue);
 const signupText=tr('auth.signup',siteLocale==='ko'?'회원가입':'Sign up');
 const refresh=useCallback(async()=>{
  // 로그인 흔적이 전혀 없는 손님은 401 뒤 갱신(2회)·로그아웃 방송까지 가지 않고 바로 손님으로 본다.
  try{const response=await authFetch('/api/auth/me',{},{retryOn401:hasClientAuthHint()||hasMobileAppRefreshToken()});const data=await response.json();
   if(response.status===401||data.authenticated===false){setStatus(401);return;}
   if(!response.ok||!data.user)throw new Error('session unavailable');
   setName(data.user.name||data.user.displayName||'');setStatus(200);
  }catch{setStatus(503);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function logout(){try{await logoutWithServer();window.location.assign('/yeongnyangi/');}catch{setError(copy.logoutFailed);}}
 return <div className={'session-controls '+(compact?'session-compact':'')} data-session-status={status}>
  {status===0?<span role="status">{copy.checking}</span>:status===200?<><button className="session-account" type="button" aria-label={name?`${name}${siteLocale==='ko'?'님':''} · ${copy.signedIn}`:copy.signedIn} title={compact&&name?`${name}${siteLocale==='ko'?'님':''} · ${copy.signedIn}`:undefined} aria-expanded={open} onClick={()=>setOpen(!open)}><Image src="/assets/yeongnyangi/original/hero-480.webp" alt="" width="32" height="32"/>{!compact&&name?`${name}${siteLocale==='ko'?'님':''} · `:''}{copy.signedIn}</button>{open&&<nav className="session-menu" aria-label={copy.account}><a href={siteLocale==='ko'?'/yeongnyangi/library/':`/yeongnyangi/library/?lang=${siteLocale}`}>{siteLocale==='ko'?'나의 보관함':chrome.library}</a><a href="/">CODE DESTINY</a><button type="button" onClick={logout}>{copy.logout}</button></nav>}</>:status===401?<span className="session-entry">
   {onChoose?<><button type="button" onClick={()=>onChoose('login')}>{loginText}</button><button type="button" onClick={()=>onChoose('signup')}>{signupText}</button></>:<>
    <a href={loginHref(returnTo)}>{loginText}</a>{compact&&<a href={signupHref(returnTo)}>{signupText}</a>}
   </>}
  </span>:<><span role="status">{siteLocale==='ko'?'확인하지 못했어요':input.consultationError}</span><button type="button" onClick={()=>void refresh()}>{siteLocale==='ko'?'다시 확인':input.retry}</button></>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
