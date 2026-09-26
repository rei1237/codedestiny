'use client';
import {useState} from 'react';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {journeyCopy} from '../_lib/journey-copy';
import {resultPath} from '../_lib/api';
import styles from '../yeongnyangi.module.css';

export function OrderReference({id,locale}:{id:string;locale?:ReadingLocale}){
 const [notice,setNotice]=useState('');const copy=journeyCopy(locale);
 return <details className={styles.orderTools} lang={locale||'ko'}><summary>{copy.order}</summary>
  <p className={styles.orderId}>{copy.order}: <span>{id}</span></p>
  <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(id);setNotice(copy.copied);}catch{setNotice(copy.copyFailed);}}}>{copy.copy}</button>
  {notice&&<p role="status">{notice}</p>}
 </details>;
}
export function OrderLookup({locale}:{locale?:ReadingLocale}){
 const [id,setId]=useState(''),[error,setError]=useState('');const copy=journeyCopy(locale);
 return <details className={styles.manifestPreview} lang={locale||'ko'}><summary>{copy.lookup}</summary>
  <form onSubmit={event=>{event.preventDefault();const value=id.trim();if(!/^[a-f0-9]{64}$/.test(value)){setError(copy.invalid);return;}window.location.assign(resultPath(value,locale));}}>
   <label htmlFor="reading-order-id">{copy.order}</label><input id="reading-order-id" value={id} onChange={event=>{setId(event.target.value);setError('');}} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="reading-order-hint" required/>
   <p id="reading-order-hint">{copy.hint}</p><button type="submit">{copy.open}</button>{error&&<p role="alert">{error}</p>}
  </form>
 </details>;
}
