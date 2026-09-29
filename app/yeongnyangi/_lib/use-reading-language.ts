'use client';
import {useEffect,useRef,useState} from 'react';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {readingLocale,type ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

export function resolveReadingLanguage(value:unknown):{locale:ReadingLocale;fallback:boolean} {
  try { return {locale:readingLocale(value),fallback:false}; }
  catch { return {locale:'en',fallback:true}; }
}
// The result override is local to this consultation. It never writes cd_lang.
export function useReadingLanguage(){
  const [siteLocale,setSiteLocale]=useState<ReadingLocale>('ko');
  const [locale,setValue]=useState<ReadingLocale>('ko');
  const [fallback,setFallback]=useState(false);
  const overridden=useRef(false);
  useEffect(()=>{
    const sync=()=>{
      const query=new URLSearchParams(window.location.search).get('lang');
      const selection=resolveReadingLanguage(query||getCurrentLoadingLocale());
      setSiteLocale(selection.locale);setFallback(selection.fallback);
      if(!overridden.current)setValue(selection.locale);
    };
    sync();
    window.addEventListener('cd:locale-ready',sync);window.addEventListener('languagechange',sync);
    return()=>{window.removeEventListener('cd:locale-ready',sync);window.removeEventListener('languagechange',sync);};
  },[]);
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
