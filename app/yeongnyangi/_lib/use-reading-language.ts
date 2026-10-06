'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {readingLocale,type ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

export function resolveReadingLanguage(value:unknown):{locale:ReadingLocale;fallback:boolean} {
  try { return {locale:readingLocale(value),fallback:false}; }
  catch { return {locale:'en',fallback:true}; }
}
function localeFromPathname(pathname:string):ReadingLocale|null {
  const segment=String(pathname||'').split('/').filter(Boolean)[0]||'';
  const normalized=segment.toLowerCase();
  if(normalized==='zh')return 'zh-CN';
  if(normalized==='zh-tw')return 'zh-TW';
  try{return normalized?readingLocale(normalized):null;}catch{return null;}
}
// The result override is local to this consultation. It never writes cd_lang.
export function useReadingLanguage(){
  const pathLocale=localeFromPathname(usePathname()||'');
  const [siteLocale,setSiteLocale]=useState<ReadingLocale>(pathLocale||'ko');
  const [locale,setValue]=useState<ReadingLocale>(pathLocale||'ko');
  const [fallback,setFallback]=useState(false);
  const overridden=useRef(false);
  useEffect(()=>{
    const sync=()=>{
      const query=new URLSearchParams(window.location.search).get('lang');
      const appLanguage=(window as typeof window & {__cdAppLanguage?:string}).__cdAppLanguage;
      const selection=resolveReadingLanguage(appLanguage||query||pathLocale||getCurrentLoadingLocale());
      setSiteLocale(selection.locale);setFallback(selection.fallback);
      if(!overridden.current)setValue(selection.locale);
    };
    sync();
    window.addEventListener('cd:locale-ready',sync);window.addEventListener('languagechange',sync);
    return()=>{window.removeEventListener('cd:locale-ready',sync);window.removeEventListener('languagechange',sync);};
  },[pathLocale]);
  function setLocale(value:ReadingLocale){overridden.current=true;setValue(value);setFallback(false);}
  return {locale,setLocale,siteLocale,fallback};
}
export function browserReadingContext(priceLocale:ReadingLocale){
  const language=typeof navigator==='undefined'?'':navigator.language;
  const region=language.match(/(?:^|-)([A-Z]{2})(?:-|$)/)?.[1]||null;
  return {priceLocale,userCountryOrRegion:region};
}
export function readingPrice(amount:number,locale:ReadingLocale){
  return new Intl.NumberFormat(locale,{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(amount);
}
