"use client";
import styles from './fortune-tools.module.css';
import {useEffect,useState} from 'react';
import {withContinuation} from '@/lib/fortune/prompt-continuation';
export default function FreePromptContinuation({prompt}:{prompt:string}){
 const [copied,setCopied]=useState(false),[error,setError]=useState('');
 const text=withContinuation(prompt);
 useEffect(()=>{setCopied(false);setError('');},[prompt]);
 return <section className={styles.control} aria-label="외부 AI에서 이어서 상담"><h4>이어서 상담하기</h4><p>프롬프트를 복사하고 원하는 AI를 열어 붙여넣어 줘. 답변을 받은 뒤 같은 대화에 후속 질문을 적으면 돼. 정보와 대화가 자동 전송되지는 않아. 외부 AI의 이용 조건은 해당 서비스에서 확인해 줘.</p>
 <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setError('');}catch{setError('자동 복사를 하지 못했어요. 아래 프롬프트를 직접 선택해 복사해 주세요.');}}}>{copied?'복사했어요':'상담 프롬프트 복사하기'}</button>
 <nav aria-label="외부 AI 선택"><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT 열기</a>{' · '}<a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">Gemini 열기</a></nav>
 <p role="status">{copied?'복사한 내용을 새 대화에 붙여넣어 주세요.':''}</p>{error&&<p role="alert">{error}</p>}
 <details open={error?true:undefined}><summary>상담 프롬프트 확인</summary><pre tabIndex={0}>{text}</pre></details></section>;
}
