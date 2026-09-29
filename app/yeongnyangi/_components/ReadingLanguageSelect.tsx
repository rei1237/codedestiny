'use client';
import {readingLocales,readingLanguageNames,readingLocale,type ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {askPhase5Copy} from '../_lib/ask-phase5-copy';
import {consultationLocaleCopy} from '../_lib/consultation-locale-copy';
import styles from '../yeongnyangi.module.css';

export default function ReadingLanguageSelect({locale,siteLocale,onChange,disabled=false,fallback=false}:{locale:ReadingLocale;siteLocale:ReadingLocale;onChange:(locale:ReadingLocale)=>void;disabled?:boolean;fallback?:boolean}){
 const copy=consultationLocaleCopy(siteLocale);
 return <div lang={siteLocale}>
  <label className={styles.field} htmlFor="reading-language">{askPhase5Copy(siteLocale).input.language}
   <select id="reading-language" value={locale} disabled={disabled} aria-describedby="reading-language-hint" onChange={event=>onChange(readingLocale(event.target.value))}>
    {readingLocales.map(value=><option key={value} value={value} lang={value}>{readingLanguageNames[value]}</option>)}
   </select>
  </label>
  <p id="reading-language-hint">{copy.languageHint}</p>
  {fallback&&<p role="status">{copy.fallback}</p>}
 </div>;
}
