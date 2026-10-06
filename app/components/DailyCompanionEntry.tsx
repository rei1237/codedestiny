"use client";
import {useEffect,useState} from 'react';
import {isMobileAppRuntime} from '@/app/_lib/auth-client';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {companionCopy} from '@/app/lock-screen-fortune/companion-copy';
export default function DailyCompanionEntry(){
  const [available,setAvailable]=useState(false);
  const [locale,setLocale]=useState('ko');
  useEffect(()=>{const sync=()=>{setAvailable(isMobileAppRuntime());setLocale(getCurrentLoadingLocale());};sync();window.addEventListener('cd:locale-ready',sync);return()=>window.removeEventListener('cd:locale-ready',sync);},[]);
  if(!available)return null;
  const copy=companionCopy(locale);
  return <a href="/lock-screen-fortune/" style={{display:'flex',alignItems:'center',gap:12,maxWidth:560,margin:'12px auto',padding:'12px 18px',minHeight:64,border:'1px solid #8b789e',borderRadius:16,background:'#211a32',color:'#fff6e5',textDecoration:'none'}}>
    <img src="/assets/yeongnyangi/original/hero-480.webp" width={44} height={44} alt="" style={{objectFit:'contain'}}/>
    <span style={{flex:1}}><strong style={{display:'block',fontSize:14}}>{copy.settings}</strong><span style={{fontSize:12,color:'#dacbea'}}>{copy.quote} · {copy.daily} · {copy.affirmation}</span></span><span aria-hidden="true">›</span>
  </a>;
}
