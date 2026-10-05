"use client";
import styles from './fortune-tools.module.css';
import {useEffect,useState} from 'react';
import {withContinuation} from '@/lib/fortune/prompt-continuation';
import {continuationCopy} from '@/lib/fortune/continuation-copy';
import type {RuntimeLocale} from '@/lib/i18n/locale-normalize';
export default function FreePromptContinuation({prompt,locale='ko'}:{prompt:string;locale?:RuntimeLocale}){
 const [copied,setCopied]=useState(false),[error,setError]=useState('');
 const text=withContinuation(prompt,locale),copy=continuationCopy(locale);
 useEffect(()=>{setCopied(false);setError('');},[prompt]);
 return <section className={styles.control} lang={locale} aria-label={copy.title}><h4>{copy.title}</h4><p>{copy.description}</p>
 <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setError('');}catch{setError(copy.error);}}}>{copied?copy.copied:copy.copy}</button>
 <nav aria-label={copy.navigation}><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">{copy.open} ChatGPT</a>{' · '}<a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">{copy.open} Gemini</a></nav>
 <p role="status">{copied?copy.copied:''}</p>{error&&<p role="alert">{error}</p>}
 <details open={error?true:undefined}><summary>{copy.view}</summary><pre tabIndex={0}>{text}</pre></details></section>;
}
