"use client";
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import styles from '../yeongnyangi.module.css';
import {useReadingLanguage} from '../_lib/use-reading-language';
import {chromeCopy} from '../_lib/chrome-copy';
import {CONSULTATION_DRAFT_KEY} from '@/lib/fortune/question-entry';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {offerPrologue} from '../_original/prologue-visit';
const StoryPanel=dynamic(()=>import('../_original/StoryPanel'),{ssr:false});
function ConsultationLoading(){const {siteLocale}=useReadingLanguage();return <p role="status" className={styles.loading}>{chromeCopy(siteLocale).loading}</p>;}
// This form, like the full consultation, is selected only after resolving the
// browser's route, language and private draft. Keep that client-only boundary explicit.
const QuestionEntry=dynamic(()=>import('./QuestionEntry'),{ssr:false,loading:ConsultationLoading});
const Consultation=dynamic(()=>import('./Consultation'),{ssr:false,loading:ConsultationLoading});
const QuestionSkyConsultation=dynamic(()=>import('./QuestionSkyConsultation'),{ssr:false,loading:()=> <p className={styles.loading}>질문의 결을 살피는 중</p>});
const Result=dynamic(()=>import('./Result'),{ssr:false,loading:ConsultationLoading});
const Library=dynamic(()=>import('./Library'),{ssr:false,loading:ConsultationLoading});
export default function Experience({view}:{view:'fortune'|'result'|'library'}){
 const [mode,setMode]=useState<string|null>(null);
 const {siteLocale}=useReadingLanguage();
 const [storyOpen,setStoryOpen]=useState(false);
 const [quickEntry,setQuickEntry]=useState(false),[question,setQuestion]=useState(''),[submitted,setSubmitted]=useState(false);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  setMode(params.get('mode')||'');
  // Explicit products, language variants and saved/resume drafts keep their existing flow.
  try{setQuickEntry(!window.location.hash&&[...params.keys()].every(key=>key==='lang'||key==='flow'&&params.get(key)==='question')&&!sessionStorage.getItem(CONSULTATION_DRAFT_KEY));}catch{/* Existing flow handles unavailable storage. */}
  let account=readDestinyProfileAccountId();
  const changed=()=>{const next=readDestinyProfileAccountId();if(next)setStoryOpen(false);if(account&&next!==account){setQuestion('');setSubmitted(false);setQuickEntry(false);}account=next;};
  window.addEventListener('cd:auth-changed',changed);
  return()=>window.removeEventListener('cd:auth-changed',changed);
 },[]);

 useEffect(()=>{
  if(view==='fortune' && quickEntry && siteLocale==='ko' && offerPrologue())setStoryOpen(true);
 },[view,quickEntry,siteLocale]);
 const changeQuestion=(value:string)=>{
  setQuestion(value);
  try{sessionStorage.setItem(CONSULTATION_DRAFT_KEY,JSON.stringify({accountId:readDestinyProfileAccountId(),path:window.location.pathname+window.location.search,locale:'ko',question:value,chatStep:'question',savedAt:Date.now()}));}catch{/* Input remains usable without draft storage. */}
 };
 const content=view==='fortune'?(mode===null?<ConsultationLoading/>:['spirit','prashna','horary'].includes(mode)?<QuestionSkyConsultation key={mode} mode={mode==='horary'?'horary-v1':'prashna-v1'}/>:quickEntry&&siteLocale==='ko'&&!submitted?<QuestionEntry question={question} onQuestion={changeQuestion} onOpen={()=>setSubmitted(true)}/>:<Consultation initialQuestion={quickEntry&&submitted?question:undefined}/>):view==='result'?<Result/>:<Library/>;
 return <div className={styles.experience}>{content}{storyOpen&&view==='fortune'&&siteLocale==='ko'&&<StoryPanel onClose={()=>{
  setStoryOpen(false);document.getElementById('yn-question')?.focus({preventScroll:true});
 }}/>}</div>;
}
