"use client";
import { useEffect, useState } from "react";
import { getAuthState } from "@/app/_lib/auth-store";
import { useLocale } from "@/lib/i18n/useT";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import TeaCalculationPolicy from "./TeaCalculationPolicy";
import styles from "../styles/tea-result-companion.module.css";
const KO={title:"연이와 나눈 이야기",core:"내 질문과 핵심 답변",basis:"해석 근거",action:"행동 조언",letter:"연이의 편지",restore:"읽던 위치로 이동",method:{tarot:"타로",saju:"사주",sajuCompatibility:"사주 궁합",sukuyo:"숙요점"}};
export default function TeaResultCompanion({result}:{result:FortuneTeaHouseConsultResponse}){
 const copy=useTeaHouseCopy("resultCompanion",KO);
 const locale=useLocale();
 const [position,setPosition]=useState(0);
 const mode=result.consultationMode||"tarot";

 useEffect(()=>{
  const user=getAuthState().user;const owner=user?.id||user?._id||user?.userId;
  if(!owner||!result.resultId)return;
  const key="cd_tea_read:"+owner+":"+result.resultId;
  try{setPosition(Number(sessionStorage.getItem(key))||0);}catch{/* optional */}
  let timer:ReturnType<typeof setTimeout>|undefined;
  const save=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{sessionStorage.setItem(key,String(window.scrollY));}catch{/* optional */}},300);};
  window.addEventListener("scroll",save,{passive:true});
  return()=>{clearTimeout(timer);window.removeEventListener("scroll",save);};
 },[result.resultId]);
 return <section className={styles.letter}>
  <div className={styles.letterhead}><span>{copy.title}</span><img src="/images/fortune-tea-house/renewal/prop-envelope.webp" width="46" height="40" alt=""/></div>
  <h2>{copy.core}</h2><p className={styles.question}>{result.questionSummary}</p>
  <div className={styles.conversation}>
   <img className={styles.yeoni} src="/images/fortune-tea-house/renewal/pig-empathy.webp" width="120" height="128" alt=""/>
   <div className={styles.speech}><p>{result.saju?.oneLineAdvice||result.yeoniReading?.intro||result.closingLine}</p></div>
  </div>
  {position>100&&<button type="button" onClick={()=>window.scrollTo({top:position,behavior:"instant"})}>{copy.restore}</button>}
  <p className={styles.date}>{copy.method[mode]}{result.createdAt ? " · " + new Date(result.createdAt).toLocaleDateString(locale) : ""}</p>
  <TeaCalculationPolicy mode={mode}/>
  <nav aria-label={copy.title}><a href="#teaResultTitle">{copy.basis}</a>{" · "}<a href="#actionPrescriptionTitle">{copy.action}</a>{" · "}<a href="#closingResultTitle">{copy.letter}</a></nav>

 </section>;
}
